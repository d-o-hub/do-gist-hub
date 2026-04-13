/**
 * Gist Store
 * Centralized state management for gists
 */

import type { GistRecord, GistFile } from '../services/db';
import type { GitHubGist } from '../types/api';
import { getAllGists, saveGist as dbSaveGist, deleteGist as dbDeleteGist } from '../services/db';
import * as GitHub from '../services/github';
import syncQueue from '../services/sync/queue';
import networkMonitor from '../services/network/offline-monitor';

type GistListener = (gists: GistRecord[]) => void;

class GistStore {
  private gists: GistRecord[] = [];
  private listeners: Set<GistListener> = new Set();
  private isLoading = false;
  private error: string | null = null;

  /**
   * Initialize the store
   */
  async init(): Promise<void> {
    await this.loadGists();
    
    // Listen for network changes to refresh when back online
    networkMonitor.subscribe((status) => {
      if (status === 'online') {
        this.refreshGists();
      }
    });
  }

  /**
   * Subscribe to store changes
   */
  subscribe(listener: GistListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.gists);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current gists
   */
  getGists(): GistRecord[] {
    return this.gists;
  }

  /**
   * Get a single gist by ID
   */
  getGist(id: string): GistRecord | undefined {
    return this.gists.find(g => g.id === id);
  }

  /**
   * Check if loading
   */
  getIsLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Get current error
   */
  getError(): string | null {
    return this.error;
  }

  /**
   * Load gists from local cache or API
   */
  async loadGists(refresh = false): Promise<void> {
    this.isLoading = true;
    this.error = null;
    this.notifyListeners();

    try {
      if (!refresh && this.gists.length > 0) {
        // Return cached gists
        return;
      }

      // First, load from IndexedDB (offline-first)
      const cachedGists = await getAllGists();
      
      if (cachedGists.length > 0) {
        this.gists = cachedGists.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        this.notifyListeners();
      }

      // Then, if online, fetch fresh data from GitHub
      if (networkMonitor.isOnline()) {
        const [userGists, starredGists] = await Promise.all([
          GitHub.listGists({ perPage: 100 }),
          GitHub.listStarredGists({ perPage: 100 }),
        ]);

        // Merge and deduplicate
        const starredIds = new Set(starredGists.map(g => g.id));

        const mergedGists = [...userGists, ...starredGists.filter(g => !starredIds.has(g.id))]
          .map(gist => this.githubGistToRecord(gist, starredIds.has(gist.id)));

        // Save to cache
        for (const gist of mergedGists) {
          await dbSaveGist(gist);
        }

        this.gists = mergedGists.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        this.notifyListeners();
      }
    } catch (err) {
      console.error('[GistStore] Failed to load gists:', err);
      this.error = err instanceof Error ? err.message : 'Failed to load gists';
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
          Object.entries(files).map(([filename, content]) => [
            filename,
            { filename, content }
          ])
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
      console.error('[GistStore] Failed to create gist:', err);
      this.error = err instanceof Error ? err.message : 'Failed to create gist';
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
            Object.entries(updates.files).map(([filename, content]) => [
              filename,
              { content }
            ])
          ),
        }),
      };

      if (networkMonitor.isOnline()) {
        const gist = await GitHub.updateGist(id, payload);
        const record = this.githubGistToRecord(gist);
        await dbSaveGist(record);
        
        // Update in local list
        const index = this.gists.findIndex(g => g.id === id);
        if (index !== -1) {
          this.gists[index] = record;
          this.notifyListeners();
        }
        return true;
      } else {
        // Queue for later sync
        await syncQueue.queueOperation(id, 'update', payload);
        
        // Optimistic update
        const index = this.gists.findIndex(g => g.id === id);
        if (index !== -1) {
          const updatedGist: GistRecord = {
            ...this.gists[index],
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
      console.error('[GistStore] Failed to update gist:', err);
      this.error = err instanceof Error ? err.message : 'Failed to update gist';
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
        this.gists = this.gists.filter(g => g.id !== id);
        this.notifyListeners();
        return true;
      } else {
        // Queue for later sync
        await syncQueue.queueOperation(id, 'delete', {});
        
        // Optimistic delete
        this.gists = this.gists.filter(g => g.id !== id);
        this.notifyListeners();
        return true;
      }
    } catch (err) {
      console.error('[GistStore] Failed to delete gist:', err);
      this.error = err instanceof Error ? err.message : 'Failed to delete gist';
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Star/unstar a gist
   */
  async toggleStar(id: string): Promise<boolean> {
    const gist = this.gists.find(g => g.id === id);
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
        await syncQueue.queueOperation(
          id,
          shouldStar ? 'star' : 'unstar',
          {}
        );
        
        // Optimistic update
        gist.starred = shouldStar;
        gist.syncStatus = 'pending';
        this.notifyListeners();
        return true;
      }
    } catch (err) {
      console.error('[GistStore] Failed to toggle star:', err);
      this.error = err instanceof Error ? err.message : 'Failed to toggle star';
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
        return this.gists.filter(g => g.starred);
      case 'mine':
        return this.gists.filter(g => !g.starred);
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
    return this.gists.filter(gist => {
      const descriptionMatch = gist.description?.toLowerCase().includes(lowerQuery);
      const fileMatch = Object.values(gist.files).some(file =>
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
          }
        ])
      ),
      htmlUrl: gist.html_url,
      gitPullUrl: gist.git_pull_url,
      gitPushUrl: gist.git_push_url,
      createdAt: gist.created_at,
      updatedAt: gist.updated_at,
      starred,
      public: gist.public,
      owner: gist.owner ? {
        login: gist.owner.login,
        id: gist.owner.id,
        avatarUrl: gist.owner.avatar_url,
        htmlUrl: gist.owner.html_url,
      } : undefined,
      syncStatus: 'synced',
      lastSyncedAt: new Date().toISOString(),
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.gists));
  }
}

// Singleton instance
const gistStore = new GistStore();

export default gistStore;
