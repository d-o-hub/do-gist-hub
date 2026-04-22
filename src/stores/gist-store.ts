import {
  GistRecord,
  getAllGists as dbGetAllGists,
  saveGist as dbSaveGist,
  deleteGist as dbDeleteGist,
} from '../services/db';
import { safeError } from '../services/security/logger';
import * as GitHub from '../services/github/client';
import networkMonitor from '../services/network/offline-monitor';
import syncQueue from '../services/sync/queue';
import {
  detectConflict,
  resolveConflict,
  storeConflict,
  getConflicts,
  clearConflict,
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
      const [ownGists, starredGists] = await Promise.all([
        GitHub.listGists(),
        GitHub.listStarredGists(),
      ]);
      const starredIds = new Set(starredGists.map((g) => g.id));
      for (const gist of ownGists) await this.processIncomingGist(gist, starredIds.has(gist.id));
      for (const gist of starredGists)
        if (!ownGists.find((g) => g.id === gist.id)) await this.processIncomingGist(gist, true);
      this.sortGists();
    } catch {
      safeError('[GistStore] Load failed');
    } finally {
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  private async processIncomingGist(gist: GitHubGist, isStarred: boolean): Promise<void> {
    const existing = this.gists.find((g) => g.id === gist.id);
    let record: GistRecord;
    if (existing) {
      const conflict = detectConflict(existing, gist);
      if (conflict) {
        await storeConflict(conflict);
        record = resolveConflict(conflict, 'manual');
      } else {
        record = this.githubGistToRecord(gist, isStarred);
      }
    } else {
      record = this.githubGistToRecord(gist, isStarred);
    }
    await dbSaveGist(record);
    this.mergeGistRecord(record, isStarred, true);
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
    const payload = {
      description,
      public: public_,
      files: Object.fromEntries(Object.entries(files).map(([n, c]) => [n, { content: c }])),
    };
    try {
      if (networkMonitor.isOnline()) {
        const gist = await GitHub.createGist(payload);
        const record = this.githubGistToRecord(gist);
        await dbSaveGist(record);
        this.gists.unshift(record);
        this.notifyListeners();
        return record;
      } else {
        await syncQueue.queueOperation('pending', 'create', payload);
        return null;
      }
    } catch {
      return null;
    }
  }

  async updateGist(
    id: string,
    updates: { description?: string; public?: boolean; files?: Record<string, string> }
  ): Promise<boolean> {
    try {
      const payload: UpdateGistRequest = {
        description: updates.description,
        public: updates.public,
        files: updates.files
          ? Object.fromEntries(Object.entries(updates.files).map(([n, c]) => [n, { content: c }]))
          : undefined,
      };
      if (networkMonitor.isOnline()) {
        const gist = await GitHub.updateGist(id, payload);
        const record = this.githubGistToRecord(gist);
        await dbSaveGist(record);
        const idx = this.gists.findIndex((g) => g.id === id);
        if (idx !== -1) this.gists[idx] = record;
        this.notifyListeners();
        return true;
      } else {
        await syncQueue.queueOperation(id, 'update', payload);
        return true;
      }
    } catch {
      return false;
    }
  }

  async deleteGist(id: string): Promise<boolean> {
    try {
      if (networkMonitor.isOnline()) {
        await GitHub.deleteGist(id);
        await dbDeleteGist(id);
        this.gists = this.gists.filter((g) => g.id !== id);
        this.notifyListeners();
        return true;
      } else {
        await syncQueue.queueOperation(id, 'delete', {});
        this.gists = this.gists.filter((g) => g.id !== id);
        this.notifyListeners();
        return true;
      }
    } catch {
      return false;
    }
  }

  async toggleStar(id: string): Promise<boolean> {
    const gist = this.gists.find((g) => g.id === id);
    if (!gist) return false;
    try {
      const shouldStar = !gist.starred;
      if (networkMonitor.isOnline()) {
        if (shouldStar) await GitHub.starGist(id);
        else await GitHub.unstarGist(id);
        gist.starred = shouldStar;
        await dbSaveGist(gist);
      } else {
        await syncQueue.queueOperation(id, shouldStar ? 'star' : 'unstar', {});
        gist.starred = shouldStar;
        gist.syncStatus = 'pending';
      }
      this.notifyListeners();
      return true;
    } catch {
      return false;
    }
  }

  private githubGistToRecord(gist: GitHubGist, starred = false): GistRecord {
    return {
      id: gist.id,
      description: gist.description,
      files: Object.fromEntries(
        Object.entries(gist.files).map(([k, f]) => [k, { ...f, content: f.content }])
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
  private sortGists(): void {
    this.gists.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }
  private mergeGistRecord(record: GistRecord, starred: boolean, skipSort = false): void {
    const idx = this.gists.findIndex((g) => g.id === record.id);
    if (idx >= 0) this.gists[idx] = { ...record, starred: record.starred || starred };
    else this.gists.push({ ...record, starred });
    if (!skipSort) this.sortGists();
  }
}

const gistStore = new GistStore();
export default gistStore;
