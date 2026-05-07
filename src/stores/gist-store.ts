import {
  GistRecord,
  getAllGists as dbGetAllGists,
  saveGist as dbSaveGist,
  deleteGist as dbDeleteGist,
  saveGists,
} from '../services/db';
import { safeError } from '../services/security/logger';
import * as GitHub from '../services/github/client';
import networkMonitor from '../services/network/offline-monitor';
import syncQueue from '../services/sync/queue';
import {
  detectConflict,
  resolveConflict,
  storeConflicts,
  getConflicts,
  clearConflict,
  GistConflict,
} from '../services/sync/conflict-detector';
import { GitHubGist, UpdateGistRequest } from '../types/api';
import { AppError } from '../services/github/error-handler';

export type GistStoreListener = (gists: GistRecord[]) => void;

class GistStore {
  private gists: GistRecord[] = [];
  private listeners: GistStoreListener[] = [];
  private isLoading = false;
  private error: string | null = null;
  private lastError: AppError | null = null;

  async init(): Promise<void> {
    this.isLoading = true;
    this.notifyListeners();
    try {
      this.gists = await dbGetAllGists();
      this.sortGists();
      this.notifyListeners();
      if (networkMonitor.isOnline()) await this.loadGists();
    } catch {
      safeError('[GistStore] Init failed');
    } finally {
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  subscribe(listener: GistStoreListener): () => void {
    this.listeners.push(listener);
    listener(this.gists);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getGists(): GistRecord[] {
    return this.gists;
  }

  async reloadFromDb(): Promise<void> {
    this.gists = await dbGetAllGists();
    this.sortGists();
    this.notifyListeners();
  }

  getGist(id: string): GistRecord | undefined {
    return this.gists.find((g) => g.id === id);
  }
  getLoading(): boolean {
    return this.isLoading;
  }
  getError(): string | null {
    return this.error;
  }
  getLastAppError(): AppError | null {
    return this.lastError;
  }

  async loadGists(refresh = false): Promise<void> {
    if (this.isLoading && !refresh) return;
    this.isLoading = true;
    this.error = null;
    this.notifyListeners();
    try {
      if (!networkMonitor.isOnline()) return;
      const [ownResult, starredResult] = await Promise.all([
        GitHub.listGists(),
        GitHub.listStarredGists(),
      ]);
      const ownGists = ownResult.data;
      const starredGists = starredResult.data;

      const starredIds = new Set(starredGists.map((g) => g.id));
      const ownIds = new Set(ownGists.map((g) => g.id));

      const processedRecords: GistRecord[] = [];
      const newConflicts: GistConflict[] = [];
      const gistMap = new Map(this.gists.map((g) => [g.id, g]));

      // BOLT: Optimize by processing all gists in parallel and batching DB writes
      const processGist = (gist: GitHubGist, isStarred: boolean): void => {
        const existing = gistMap.get(gist.id);
        let record: GistRecord;

        if (existing) {
          const conflict = detectConflict(existing, gist);
          if (conflict) {
            newConflicts.push(conflict);
            record = resolveConflict(conflict, 'manual');
          } else {
            record = GistStore.githubGistToRecord(gist, isStarred, existing);
          }
        } else {
          record = GistStore.githubGistToRecord(gist, isStarred);
        }

        processedRecords.push(record);
      };

      for (const gist of ownGists) {
        processGist(gist, starredIds.has(gist.id));
      }
      for (const gist of starredGists) {
        if (!ownIds.has(gist.id)) {
          processGist(gist, true);
        }
      }

      // Parallel processing complete

      // BOLT: Batch store conflicts to prevent race conditions
      if (newConflicts.length > 0) {
        await storeConflicts(newConflicts);
      }

      // BOLT: Use new batch save method
      await saveGists(processedRecords);

      // BOLT: Only update in-memory state after successful DB write
      // Use Map for O(1) lookups during merge to achieve O(N + M) complexity
      const currentGistMap = new Map(this.gists.map((g) => [g.id, g]));
      for (const record of processedRecords) {
        currentGistMap.set(record.id, record);
      }
      this.gists = Array.from(currentGistMap.values());

      this.sortGists();
    } catch (err) {
      safeError('[GistStore] Load failed', err);
    } finally {
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  filterGists(filter: 'all' | 'mine' | 'starred'): GistRecord[] {
    switch (filter) {
      case 'starred':
        return this.gists.filter((g) => g.starred);
      case 'mine':
        return this.gists.filter((g) => !g.starred);
      default:
        return this.gists;
    }
  }

  searchGists(query: string): GistRecord[] {
    if (!query.trim()) return this.gists;
    const q = query.toLowerCase();
    return this.gists.filter(
      (g) =>
        g.description?.toLowerCase().includes(q) ||
        Object.values(g.files).some((f) => f.filename.toLowerCase().includes(q))
    );
  }

  async createGist(
    description: string,
    public_: boolean,
    files: Record<string, string>
  ): Promise<GistRecord | null> {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const tempRecord: GistRecord = {
      id: tempId,
      description,
      files: Object.fromEntries(
        Object.entries(files).map(([n, c]) => [n, { filename: n, content: c }])
      ),
      htmlUrl: '',
      gitPullUrl: '',
      gitPushUrl: '',
      createdAt: now,
      updatedAt: now,
      starred: false,
      public: public_,
      syncStatus: 'pending',
    };

    const payload = {
      description,
      public: public_,
      files: Object.fromEntries(Object.entries(files).map(([n, c]) => [n, { content: c }])),
    };

    try {
      if (networkMonitor.isOnline()) {
        // Optimistic: add temp record immediately
        this.gists.unshift(tempRecord);
        this.notifyListeners();

        const gist = await GitHub.createGist(payload);
        const record = GistStore.githubGistToRecord(gist);
        await dbSaveGist(record);

        // Replace temp with real record
        const idx = this.gists.findIndex((g) => g.id === tempId);
        if (idx !== -1) {
          this.gists[idx] = record;
        } else {
          this.gists.unshift(record);
        }
        this.sortGists();
        this.notifyListeners();
        return record;
      } else {
        await syncQueue.queueOperation('pending', 'create', payload);
        return null;
      }
    } catch (err) {
      // Rollback: remove temp record
      this.gists = this.gists.filter((g) => g.id !== tempId);
      this.notifyListeners();
      safeError('[GistStore] Create failed', err);
      return null;
    }
  }

  async updateGist(
    id: string,
    updates: { description?: string; public?: boolean; files?: Record<string, string> }
  ): Promise<boolean> {
    const originalGist = this.gists.find((g) => g.id === id);
    const originalRecord = originalGist ? structuredClone(originalGist) : null;

    try {
      const payload: UpdateGistRequest = {
        description: updates.description,
        public: updates.public,
        files: updates.files
          ? Object.fromEntries(Object.entries(updates.files).map(([n, c]) => [n, { content: c }]))
          : undefined,
      };

      if (networkMonitor.isOnline()) {
        // Optimistic: update local state immediately
        if (originalGist) {
          if (updates.description !== undefined) originalGist.description = updates.description;
          if (updates.public !== undefined) originalGist.public = updates.public;
          if (updates.files) {
            for (const [name, content] of Object.entries(updates.files)) {
              if (originalGist.files[name]) {
                originalGist.files[name].content = content;
              } else {
                originalGist.files[name] = { filename: name, content };
              }
            }
          }
          originalGist.updatedAt = new Date().toISOString();
          originalGist.syncStatus = 'pending';
          this.sortGists();
          this.notifyListeners();
        }

        const gist = await GitHub.updateGist(id, payload);
        const record = GistStore.githubGistToRecord(gist);
        await dbSaveGist(record);
        const idx = this.gists.findIndex((g) => g.id === id);
        if (idx !== -1) this.gists[idx] = record;
        this.notifyListeners();
        return true;
      } else {
        await syncQueue.queueOperation(id, 'update', payload);
        return true;
      }
    } catch (err) {
      // Rollback: restore original state
      if (originalRecord) {
        const idx = this.gists.findIndex((g) => g.id === id);
        if (idx !== -1) {
          this.gists[idx] = originalRecord;
        } else {
          this.gists.push(originalRecord);
        }
        this.sortGists();
        this.notifyListeners();
      }
      safeError('[GistStore] Update failed', err);
      return false;
    }
  }

  async deleteGist(id: string): Promise<boolean> {
    const originalGist = this.gists.find((g) => g.id === id);

    try {
      if (networkMonitor.isOnline()) {
        // Optimistic: remove from local state immediately
        this.gists = this.gists.filter((g) => g.id !== id);
        this.notifyListeners();

        await GitHub.deleteGist(id);
        await dbDeleteGist(id);
        return true;
      } else {
        await syncQueue.queueOperation(id, 'delete', {});
        this.gists = this.gists.filter((g) => g.id !== id);
        this.notifyListeners();
        return true;
      }
    } catch (err) {
      // Rollback: restore original gist
      if (originalGist) {
        this.gists.push(originalGist);
        this.sortGists();
        this.notifyListeners();
      }
      safeError('[GistStore] Delete failed', err);
      return false;
    }
  }

  async hydrateGist(id: string): Promise<GistRecord | null> {
    if (!networkMonitor.isOnline()) return this.getGist(id) || null;

    try {
      const gist = await GitHub.getGist(id);
      const existing = this.getGist(id);
      const record = GistStore.githubGistToRecord(gist, existing?.starred);
      await dbSaveGist(record);

      const idx = this.gists.findIndex((g) => g.id === id);
      if (idx !== -1) {
        this.gists[idx] = record;
      } else {
        this.gists.push(record);
        this.sortGists();
      }

      this.notifyListeners();
      return record;
    } catch (err) {
      safeError('[GistStore] Hydration failed', err);
      return this.getGist(id) || null;
    }
  }

  async toggleStar(id: string): Promise<boolean> {
    const gist = this.gists.find((g) => g.id === id);
    if (!gist) return false;

    const originalStarred = gist.starred;
    const shouldStar = !originalStarred;

    try {
      // Optimistic: update local state immediately
      gist.starred = shouldStar;
      gist.syncStatus = networkMonitor.isOnline() ? 'synced' : 'pending';
      this.notifyListeners();

      if (networkMonitor.isOnline()) {
        if (shouldStar) await GitHub.starGist(id);
        else await GitHub.unstarGist(id);
        await dbSaveGist(gist);
      } else {
        await syncQueue.queueOperation(id, shouldStar ? 'star' : 'unstar', {});
      }

      return true;
    } catch (err) {
      // Rollback: restore original star state
      gist.starred = originalStarred;
      gist.syncStatus = 'synced';
      this.notifyListeners();
      safeError('[GistStore] Toggle star failed', err);
      return false;
    }
  }

  private static githubGistToRecord(
    gist: GitHubGist,
    starred = false,
    existingRecord?: GistRecord
  ): GistRecord {
    return {
      id: gist.id,
      description: gist.description,
      files: Object.fromEntries(
        Object.entries(gist.files).map(([k, f]) => [
          k,
          {
            ...f,
            content: f.content ?? existingRecord?.files[k]?.content,
            rawUrl: f.raw_url,
          },
        ])
      ),
      htmlUrl: gist.html_url,
      gitPullUrl: gist.git_pull_url,
      gitPushUrl: gist.git_push_url,
      createdAt: gist.created_at,
      updatedAt: gist.updated_at,
      starred,
      public: gist.public,
      owner: gist.owner
        ? {
            login: gist.owner.login,
            id: gist.owner.id,
            avatarUrl: gist.owner.avatar_url,
            htmlUrl: gist.owner.html_url,
          }
        : undefined,
      syncStatus: 'synced',
      lastSyncedAt: new Date().toISOString(),
    };
  }

  async resolveGistConflict(gistId: string, strategy: 'local-wins' | 'remote-wins'): Promise<void> {
    const conflicts = await getConflicts();
    const conflict = conflicts.find((c) => c.gistId === gistId);
    if (!conflict) return;

    const resolvedRecord = resolveConflict(conflict, strategy);
    await dbSaveGist(resolvedRecord);
    await clearConflict(gistId);

    const idx = this.gists.findIndex((g) => g.id === gistId);
    if (idx !== -1) {
      this.gists[idx] = resolvedRecord;
    } else {
      this.gists.push(resolvedRecord);
    }

    this.sortGists();
    this.notifyListeners();

    if (strategy === 'local-wins' && networkMonitor.isOnline()) {
      void syncQueue.processQueue();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l(this.gists));
  }

  // BOLT: Persistent cache for parsed timestamps to maximize sorting efficiency
  private static timestampCache = new Map<string, number>();

  /**
   * Sort gists by updatedAt descending.
   * BOLT: Optimize by pre-parsing timestamps to avoid O(N log N) Date.parse calls.
   */
  private sortGists(): void {
    const getTimestamp = (dateStr: string): number => {
      let ts = GistStore.timestampCache.get(dateStr);
      if (ts === undefined) {
        ts = Date.parse(dateStr);
        GistStore.timestampCache.set(dateStr, ts);
      }
      return ts;
    };

    this.gists.sort((a, b) => {
      const tsB = getTimestamp(b.updatedAt);
      const tsA = getTimestamp(a.updatedAt);
      return tsB - tsA;
    });
  }
}

const gistStore = new GistStore();
export default gistStore;
