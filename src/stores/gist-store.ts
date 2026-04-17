/**
 * Gist Store
 * Central state management for gists
 */

import {
  GistRecord,
  getAllGists as dbGetAllGists,
  saveGist as dbSaveGist,
  deleteGist as dbDeleteGist,
  GistFile,
} from '../services/db';
import * as GitHub from '../services/github/client';
import { safeError } from '../services/security/logger';
import { listStarredGists } from '../services/github/client';
import networkMonitor from '../services/network/offline-monitor';
import syncQueue from '../services/sync/queue';
import { detectConflict, resolveConflict, storeConflict } from '../services/sync/conflict-detector';
import { GitHubGist } from '../types/api';
import { AppError } from '../services/github/error-handler';

export type GistStoreListener = (gists: GistRecord[]) => void;

class GistStore {
  private gists: GistRecord[] = [];
  private listeners: GistStoreListener[] = [];
  private isLoading = false;
  private error: string | null = null;
  private lastError: AppError | null = null;

  /**
   * Initialize store - load from IndexedDB and sync from GitHub if online
   */
  async init(): Promise<void> {
    this.isLoading = true;
    this.notifyListeners();

    try {
      // Load from local database first (immediate offline availability)
      this.gists = await dbGetAllGists();
      this.gists.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      this.notifyListeners();

      // Sync from GitHub if online
      if (networkMonitor.isOnline()) {
        await this.loadGists();
      }
    } catch (err) {
      safeError('[GistStore] Initialization failed:', err);
      this.error = 'Failed to initialize gist store';
      this.lastError = err as AppError;
    } finally {
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  /**
   * Subscribe to store changes
   */
  subscribe(listener: GistStoreListener): () => void {
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
   * Get a single gist by ID
   */
  getGist(id: string): GistRecord | undefined {
    return this.gists.find((g) => g.id === id);
  }

  /**
   * Get loading state
   */
  getLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Get error state
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * Get last AppError object
   */
  getLastAppError(): AppError | null {
    return this.lastError;
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
      if (networkMonitor.isOnline()) {
        // Fetch both own gists and starred gists
        const [ownGists, starredGists] = await Promise.all([
          GitHub.listGists(),
          listStarredGists(),
        ]);

        const starredIds = new Set(starredGists.map((g) => g.id));
        const allFetchedGists = [...ownGists, ...starredGists];

        // Deduplicate
        const uniqueGists = Array.from(new Map(allFetchedGists.map((g) => [g.id, g])).values());

        for (const gist of uniqueGists) {
          const existing = this.gists.find((g) => g.id === gist.id);
          if (existing) {
            const conflict = detectConflict(existing, gist);
            if (conflict) {
              await storeConflict(conflict);
              // Auto-resolve with remote-wins for now
              const resolved = resolveConflict(conflict, 'remote-wins');
              await dbSaveGist(resolved);
              this.mergeGistRecord(resolved, starredIds.has(gist.id));
            } else {
              const record = this.githubGistToRecord(gist, starredIds.has(gist.id));
              await dbSaveGist(record);
              this.mergeGistRecord(record, starredIds.has(gist.id));
            }
          } else {
            const record = this.githubGistToRecord(gist, starredIds.has(gist.id));
            await dbSaveGist(record);
            this.mergeGistRecord(record, starredIds.has(gist.id));
          }
        }

        this.notifyListeners();
      }
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
        // Create on GitHub
        const gist = await GitHub.createGist(payload);
        const record = this.githubGistToRecord(gist);
        await dbSaveGist(record);

        // Add to local list
        this.gists.unshift(record);
        this.notifyListeners();
        return record;
      } else {
        // Queue for later sync
        await syncQueue.queueOperation('pending', 'create', payload);

        // Create optimistic record
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
      const payload = {
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.public !== undefined && { public: updates.public }),
        ...(updates.files !== undefined && {
          files: Object.fromEntries(
            Object.entries(updates.files).map(([filename, content]) => [filename, { content }])
          ),
        }),
      };

      if (networkMonitor.isOnline()) {
        const gist = await GitHub.updateGist(id, payload);
        const record = this.githubGistToRecord(gist);
        await dbSaveGist(record);

        // Update in local list
        const index = this.gists.findIndex((g) => g.id === id);
        if (index !== -1) {
          this.gists[index] = record;
          this.notifyListeners();
        }
        return true;
      } else {
        // Queue for later sync
        await syncQueue.queueOperation(id, 'update', payload);

        // Optimistic update
        const index = this.gists.findIndex((g) => g.id === id);
        const existingGist = this.gists[index];
        if (index !== -1 && existingGist) {
          const updatedGist: GistRecord = {
            ...existingGist,
            ...(updates.description !== undefined && { description: updates.description }),
            ...(updates.public !== undefined && { public: updates.public }),
            syncStatus: 'pending' as const,
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

        // Remove from local list
        this.gists = this.gists.filter((g) => g.id !== id);
        this.notifyListeners();
        return true;
      } else {
        // Queue for later sync
        await syncQueue.queueOperation(id, 'delete', {});

        // Optimistic delete
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
        if (shouldStar) {
          await GitHub.starGist(id);
        } else {
          await GitHub.unstarGist(id);
        }

        // Update local record
        gist.starred = shouldStar;
        await dbSaveGist(gist);
        this.notifyListeners();
        return true;
      } else {
        // Queue for later sync
        await syncQueue.queueOperation(id, shouldStar ? 'star' : 'unstar', {});

        // Optimistic update
        gist.starred = shouldStar;
        gist.syncStatus = 'pending';
        this.notifyListeners();
        return true;
      }
    } catch (err) {
      safeError('[GistStore] Failed to toggle star:', err);
      this.error = err instanceof Error ? err.message : 'Failed to toggle star';
      this.lastError = err as AppError;
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Filter gists
   */
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

  /**
   * Search gists
   */
  searchGists(query: string): GistRecord[] {
    if (!query.trim()) {
      return this.gists;
    }

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
  private githubGistToRecord(gist: GitHubGist, starred = false): GistRecord {
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

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.gists));
  }

  /**
   * Merge a gist record into the local list.
   * Updates existing or adds new, maintains sort order.
   */
  private mergeGistRecord(record: GistRecord, starred: boolean): void {
    const finalRecord = starred ? { ...record, starred } : record;
    const existingIndex = this.gists.findIndex((g) => g.id === record.id);

    if (existingIndex >= 0) {
      // Preserve local starred status if not from starred list
      const existingGist = this.gists[existingIndex];
      finalRecord.starred = (existingGist?.starred ?? false) || starred;
      this.gists[existingIndex] = finalRecord;
    } else {
      this.gists.push(finalRecord);
    }

    // Re-sort by updated_at
    this.gists.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

// Singleton instance
const gistStore = new GistStore();

export default gistStore;
