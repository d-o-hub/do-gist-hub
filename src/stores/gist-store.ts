/**
 * Gist Store
 * Manages local and remote gist state, including sync and optimistic updates.
 */

import {
  GistRecord,
  getAllGists as dbListGists,
  saveGist as dbSaveGist,
  deleteGist as dbDeleteGist,
} from '../services/db';
import { GitHubGist, GistFile } from '../types/api';
// skipcq: JS-C1003
import * as GitHub from '../services/github/client';
import { listStarredGists } from '../services/github/client';
import networkMonitor from '../services/network/offline-monitor';
import syncQueue from '../services/sync/queue';
import { detectConflict, resolveConflict } from '../services/sync/conflict-detector';
import { AppError } from '../services/github/error-handler';
import { safeError } from '../services/security/logger';

export type GistListener = (gists: GistRecord[]) => void;

class GistStore {
  private gists: GistRecord[] = [];
  private listeners: GistListener[] = [];
  public isLoading = false;
  public error: string | null = null;
  public lastError: AppError | null = null;

  /**
   * Subscribe to gist changes
   */
  subscribe(listener: GistListener): () => void {
    this.listeners.push(listener);
    listener(this.gists);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Get all gists
   */
  getGists(): GistRecord[] {
    return this.gists;
  }

  /**
   * Get a specific gist by ID
   */
  getGist(id: string): GistRecord | undefined {
    return this.gists.find((g) => g.id === id);
  }

  getLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Initialize store from local DB
   */
  async init(): Promise<void> {
    this.isLoading = true;
    this.notifyListeners();
    try {
      this.gists = await dbListGists();
      this.sortGists();
    } catch (err) {
      safeError('[GistStore] Failed to initialize from DB:', err);
    } finally {
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  /**
   * Load gists from GitHub
   */
  async loadGists(refresh = false): Promise<void> {
    if (this.isLoading && !refresh) return;

    this.isLoading = true;
    this.error = null;
    this.lastError = null;
    this.notifyListeners();

    try {
      if (!networkMonitor.isOnline()) {
        throw new Error('Network is offline');
      }

      const [ownGists, starredGists] = await Promise.all([GitHub.listGists(), listStarredGists()]);

      const starredIds = new Set(starredGists.map((g) => g.id));

      if (refresh) {
        this.gists = [];
      }

      for (const gist of ownGists) {
        const isStarred = starredIds.has(gist.id);
        const existing = this.getGist(gist.id);

        let record: GistRecord;
        if (existing) {
          const conflict = detectConflict(existing, gist);
          if (conflict) {
            record = resolveConflict(conflict, 'remote-wins');
          } else {
            record = GistStore.githubGistToRecord(gist, isStarred);
          }
        } else {
          record = GistStore.githubGistToRecord(gist, isStarred);
        }

        await dbSaveGist(record);
        this.mergeGistRecord(record, isStarred, true);
      }

      for (const gist of starredGists) {
        const existing = this.getGist(gist.id);
        if (!existing) {
          const record = GistStore.githubGistToRecord(gist, true);
          await dbSaveGist(record);
          this.mergeGistRecord(record, true, true);
        }
      }

      this.sortGists();
      this.notifyListeners();
    } catch (err) {
      safeError('[GistStore] Failed to load gists:', err);
      this.error = err instanceof Error ? err.message : 'Failed to load gists';
      this.lastError = err as AppError;
      this.notifyListeners();
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Refresh gists from server
   */
  async refreshGists(): Promise<void> {
    await this.loadGists(true);
  }

  /**
   * Create a new gist
   */
  async createGist(
    description: string,
    public_: boolean,
    files: Record<string, string>
  ): Promise<GistRecord | null> {
    this.isLoading = true;
    this.notifyListeners();

    try {
      const payload = {
        description,
        public: public_,
        files: Object.fromEntries(
          Object.entries(files).map(([filename, content]) => [filename, { content }])
        ),
      };

      if (networkMonitor.isOnline()) {
        const gist = await GitHub.createGist(payload);
        const record = GistStore.githubGistToRecord(gist);
        await dbSaveGist(record);

        this.gists.unshift(record);
        this.notifyListeners();
        return record;
      } else {
        await syncQueue.queueOperation('pending', 'create', payload);

        const tempId = `temp_${Date.now()}`;
        const filesRecord: Record<string, GistFile> = Object.fromEntries(
          Object.entries(files).map(([filename, content]) => [filename, { filename, content }])
        );
        const optimisticRecord: GistRecord = {
          id: tempId,
          description,
          files: filesRecord,
          htmlUrl: '',
          gitPullUrl: '',
          gitPushUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          starred: false,
          public: public_,
          syncStatus: 'pending',
        };

        this.gists.unshift(optimisticRecord);
        this.notifyListeners();
        return optimisticRecord;
      }
    } catch (err) {
      safeError('[GistStore] Failed to create gist:', err);
      this.error = err instanceof Error ? err.message : 'Failed to create gist';
      this.lastError = err as AppError;
      this.notifyListeners();
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Update an existing gist
   */
  async updateGist(
    id: string,
    updates: { description?: string; public?: boolean; files?: Record<string, string> }
  ): Promise<boolean> {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.public !== undefined) payload.public = updates.public;
      if (updates.files !== undefined) {
        payload.files = Object.fromEntries(
          Object.entries(updates.files).map(([filename, content]) => [filename, { content }])
        );
      }

      if (networkMonitor.isOnline()) {
        const gist = await GitHub.updateGist(id, payload);
        const record = GistStore.githubGistToRecord(gist);
        await dbSaveGist(record);

        const index = this.gists.findIndex((g) => g.id === id);
        if (index !== -1) {
          this.gists[index] = record;
          this.notifyListeners();
        }
        return true;
      } else {
        await syncQueue.queueOperation(id, 'update', payload);

        const index = this.gists.findIndex((g) => g.id === id);
        const existingGist = this.gists[index];
        if (index !== -1 && existingGist) {
          const updatedGist: GistRecord = {
            ...existingGist,
            ...(updates.description !== undefined && { description: updates.description }),
            ...(updates.public !== undefined && { public: updates.public }),
            syncStatus: 'pending',
            updatedAt: new Date().toISOString(),
          };
          this.gists[index] = updatedGist;
          this.notifyListeners();
        }
        return true;
      }
    } catch (err) {
      safeError('[GistStore] Failed to update gist:', err);
      this.error = err instanceof Error ? err.message : 'Failed to update gist';
      this.lastError = err as AppError;
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Delete a gist
   */
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
    } catch (err) {
      safeError('[GistStore] Failed to delete gist:', err);
      this.error = err instanceof Error ? err.message : 'Failed to delete gist';
      this.lastError = err as AppError;
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Star/unstar a gist
   */
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
    } catch (err) {
      safeError('[GistStore] Failed to toggle star:', err);
      this.error = err instanceof Error ? err.message : 'Failed to toggle star';
      this.lastError = err as AppError;
      this.notifyListeners();
      return false;
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
    const lowerQuery = query.toLowerCase();
    return this.gists.filter((gist) => {
      const descriptionMatch = gist.description?.toLowerCase().includes(lowerQuery);
      const fileMatch = Object.values(gist.files).some(
        (file) =>
          file.filename.toLowerCase().includes(lowerQuery) ||
          file.content?.toLowerCase().includes(lowerQuery)
      );
      return descriptionMatch || fileMatch;
    });
  }

  /**
   * Convert GitHub API gist to local record
   */
  private static githubGistToRecord(gist: GitHubGist, starred = false): GistRecord {
    return {
      id: gist.id,
      description: gist.description,
      files: Object.fromEntries(
        Object.entries(gist.files).map(([key, file]) => [
          key,
          {
            filename: file.filename,
            type: file.type,
            language: file.language,
            rawUrl: file.raw_url,
            size: file.size,
            truncated: file.truncated,
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
      syncStatus: 'synced',
      lastSyncedAt: new Date().toISOString(),
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.gists));
  }

  /**
   * Sort gists by updated_at (descending)
   * ⚡ Bolt: Use numeric timestamp comparison to avoid object creation in sort loop
   */
  private sortGists(): void {
    this.gists.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  /**
   * Merge a gist record into the local list.
   * Updates existing or adds new, maintains sort order.
   * ⚡ Bolt: Added skipSort parameter for bulk operations
   */
  private mergeGistRecord(record: GistRecord, starred: boolean, skipSort = false): void {
    const finalRecord = starred ? { ...record, starred } : record;
    const existingIndex = this.gists.findIndex((g) => g.id === record.id);

    if (existingIndex >= 0) {
      const existingGist = this.gists[existingIndex];
      finalRecord.starred = (existingGist?.starred ?? false) || starred;
      this.gists[existingIndex] = finalRecord;
    } else {
      this.gists.push(finalRecord);
    }

    if (!skipSort) {
      this.sortGists();
    }
  }
}

const gistStore = new GistStore();
export default gistStore;
