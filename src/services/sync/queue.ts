import { safeLog, safeError } from '../security/logger';
/**
 * Sync Queue Service
 * Manages offline write operations and syncs them when online
 */

import type { PendingWrite } from '../../types';
import type { CreateGistRequest, UpdateGistRequest } from '../../types/api';
import {
  getPendingWrites,
  queueWrite as dbQueueWrite,
  removePendingWrite,
  updatePendingWriteError,
  saveGist,
  deleteGist as dbDeleteGist,
} from '../db';
import * as GitHub from '../github';
import networkMonitor from '../network/offline-monitor';

/**
 * Sync operation types
 */
export type SyncAction = 'create' | 'update' | 'delete' | 'star' | 'unstar' | 'fork';

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  error?: string;
  shouldRetry: boolean;
}

/**
 * Maximum retry attempts before giving up
 */
const MAX_RETRIES = 3;

/**
 * Retry delay in milliseconds (exponential backoff base)
 */
const RETRY_DELAY_MS = 1000;

class SyncQueue {
  private isSyncing = false;
  private unsubscribeNetwork?: () => void;

  /**
   * Initialize sync queue
   */
  init(): void {
    // Listen for network status changes
    this.unsubscribeNetwork = networkMonitor.subscribe((status) => {
      if (status === 'online') {
        safeLog('[SyncQueue] Network online, checking pending operations');
        void this.processQueue();
      }
    });

    // Also listen for custom online event
    window.addEventListener('app:online', () => {
      void this.processQueue();
    });

    safeLog('[SyncQueue] Initialized');
  }

  /**
   * Queue a write operation
   */
  async queueOperation(gistId: string, action: SyncAction, payload: unknown): Promise<number> {
    const write: Omit<PendingWrite, 'id' | 'createdAt' | 'retryCount'> = {
      gistId,
      action,
      payload,
      lastAttemptAt: undefined,
      error: undefined,
    };

    const id = await dbQueueWrite(write);
    safeLog(`[SyncQueue] Queued ${action} for gist ${gistId}, queue ID: ${id}`);

    // If online, try to sync immediately
    if (networkMonitor.isOnline()) {
      void this.processQueue();
    }

    return id;
  }

  /**
   * Process all pending writes in the queue
   */
  async processQueue(): Promise<void> {
    if (this.isSyncing) {
      safeLog('[SyncQueue] Already syncing, skipping');
      return;
    }

    if (!networkMonitor.isOnline()) {
      safeLog('[SyncQueue] Offline, cannot process queue');
      return;
    }

    this.isSyncing = true;

    try {
      const pendingWrites = await getPendingWrites();

      if (pendingWrites.length === 0) {
        safeLog('[SyncQueue] No pending operations');
        return;
      }

      safeLog(`[SyncQueue] Processing ${pendingWrites.length} pending operations`);

      // Sort by creation time (oldest first)
      const sortedWrites = pendingWrites.sort((a, b) => a.createdAt - b.createdAt);

      for (const write of sortedWrites) {
        if (!write.id) continue;

        const result = await this.executeWrite(write);

        if (result.success) {
          await removePendingWrite(write.id);
          safeLog(`[SyncQueue] Successfully synced operation ${write.id}`);
        } else {
          if (result.shouldRetry && write.retryCount < MAX_RETRIES) {
            await updatePendingWriteError(write.id, result.error || 'Unknown error');
            safeLog(
              `[SyncQueue] Will retry operation ${write.id} (attempt ${write.retryCount + 1}/${MAX_RETRIES})`
            );
          } else {
            // Max retries reached or non-retryable error
            await updatePendingWriteError(write.id, result.error || 'Max retries reached');
            safeError(`[SyncQueue] Failed operation ${write.id} after ${write.retryCount} retries`);
          }
        }

        // Small delay between operations to avoid rate limiting
        await this.delay(RETRY_DELAY_MS);
      }

      safeLog('[SyncQueue] Queue processing complete');
    } catch (error) {
      safeError('[SyncQueue] Error processing queue:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Execute a single write operation
   */
  private async executeWrite(write: PendingWrite): Promise<SyncResult> {
    try {
      switch (write.action) {
        case 'create':
          return await this.syncCreate(write.gistId, write.payload);

        case 'update':
          return await this.syncUpdate(write.gistId, write.payload);

        case 'delete':
          return await this.syncDelete(write.gistId);

        case 'star':
          return await this.syncStar(write.gistId);

        case 'unstar':
          return await this.syncUnstar(write.gistId);

        case 'fork':
          return await this.syncFork(write.gistId);

        default:
          return {
            success: false,
            error: `Unknown action: ${write.action}`,
            shouldRetry: false,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldRetry: this.isRetryableError(error),
      };
    }
  }

  /**
   * Sync create operation
   */
  private async syncCreate(_gistId: string, payload: unknown): Promise<SyncResult> {
    const gist = await GitHub.createGist(payload as CreateGistRequest);

    // Update local cache with server response
    await saveGist({
      id: gist.id,
      description: gist.description,
      files: gist.files,
      htmlUrl: gist.html_url,
      gitPullUrl: gist.git_pull_url,
      gitPushUrl: gist.git_push_url,
      createdAt: gist.created_at,
      updatedAt: gist.updated_at,
      starred: false,
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
    });

    return { success: true, shouldRetry: false };
  }

  /**
   * Sync update operation
   */
  private async syncUpdate(gistId: string, payload: unknown): Promise<SyncResult> {
    const gist = await GitHub.updateGist(gistId, payload as UpdateGistRequest);

    // Update local cache
    await saveGist({
      id: gist.id,
      description: gist.description,
      files: gist.files,
      htmlUrl: gist.html_url,
      gitPullUrl: gist.git_pull_url,
      gitPushUrl: gist.git_push_url,
      createdAt: gist.created_at,
      updatedAt: gist.updated_at,
      starred: false,
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
    });

    return { success: true, shouldRetry: false };
  }

  /**
   * Sync delete operation
   */
  private async syncDelete(gistId: string): Promise<SyncResult> {
    await GitHub.deleteGist(gistId);
    await dbDeleteGist(gistId);
    return { success: true, shouldRetry: false };
  }

  /**
   * Sync star operation
   */
  private async syncStar(gistId: string): Promise<SyncResult> {
    await GitHub.starGist(gistId);
    return { success: true, shouldRetry: false };
  }

  /**
   * Sync unstar operation
   */
  private async syncUnstar(gistId: string): Promise<SyncResult> {
    await GitHub.unstarGist(gistId);
    return { success: true, shouldRetry: false };
  }

  /**
   * Sync fork operation
   */
  private async syncFork(gistId: string): Promise<SyncResult> {
    const gist = await GitHub.forkGist(gistId);

    // Save forked gist to local cache
    await saveGist({
      id: gist.id,
      description: gist.description,
      files: gist.files,
      htmlUrl: gist.html_url,
      gitPullUrl: gist.git_pull_url,
      gitPushUrl: gist.git_push_url,
      createdAt: gist.created_at,
      updatedAt: gist.updated_at,
      starred: false,
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
    });

    return { success: true, shouldRetry: false };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      // Network errors and rate limits are retryable
      return (
        message.includes('network') ||
        message.includes('fetch') ||
        message.includes('rate limit') ||
        message.includes('timeout')
      );
    }
    return false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get queue length
   */
  async getQueueLength(): Promise<number> {
    const writes = await getPendingWrites();
    return writes.length;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.unsubscribeNetwork) {
      this.unsubscribeNetwork();
    }
    safeLog('[SyncQueue] Destroyed');
  }
}

// Singleton instance
const syncQueue = new SyncQueue();

export default syncQueue;
