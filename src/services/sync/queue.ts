/**
 * Sync Queue Service
 * Manages offline write operations and syncs them when online
 */

import type { PendingWrite } from '../../types';
import type { CreateGistRequest, GitHubGist, UpdateGistRequest } from '../../types/api';
import {
  deleteGist as dbDeleteGist,
  queueWrite as dbQueueWrite,
  type GistRecord,
  getGist,
  getPendingWrites,
  removePendingWrite,
  saveGist,
  updatePendingWriteError,
} from '../db';
import {
  createGist,
  deleteGist,
  forkGist,
  getGist as githubGetGist,
  starGist,
  unstarGist,
  updateGist,
} from '../github';
import { isSafeToRequest } from '../github/rate-limiter';
import networkMonitor from '../network/offline-monitor';
import { safeError, safeLog } from '../security/logger';
import { detectConflict, storeConflict } from './conflict-detector';

export type SyncAction = 'create' | 'update' | 'delete' | 'star' | 'unstar' | 'fork';

export interface SyncResult {
  success: boolean;
  error?: string;
  shouldRetry: boolean;
}

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 1000;
const RETRY_MAX_DELAY_MS = 30000;

export class SyncQueue {
  private isSyncing = false;
  private unsubscribeNetwork?: () => void;

  init(): void {
    this.unsubscribeNetwork = networkMonitor.subscribe((status) => {
      if (status === 'online') {
        safeLog('[SyncQueue] Network online, checking pending operations');
        void this.processQueue();
      }
    });
    window.addEventListener('app:online', () => {
      void this.processQueue();
    });
    safeLog('[SyncQueue] Initialized');
  }

  async queueOperation(
    gistId: string,
    action: SyncAction,
    payload: unknown,
    expectedRemoteVersion?: string
  ): Promise<number> {
    const write: Omit<PendingWrite, 'id' | 'createdAt' | 'retryCount'> = {
      gistId,
      action,
      payload,
      lastAttemptAt: undefined,
      error: undefined,
      expectedRemoteVersion,
    };
    const id = await dbQueueWrite(write);
    safeLog(`[SyncQueue] Queued ${action} for gist ${gistId}, queue ID: ${id}`);
    if (networkMonitor.isOnline()) {
      void this.processQueue();
    }
    return id;
  }

  async processQueue(): Promise<void> {
    if (this.isSyncing || !networkMonitor.isOnline()) return;
    this.isSyncing = true;
    try {
      const pendingWrites = await getPendingWrites();
      if (pendingWrites.length === 0) return;
      safeLog(`[SyncQueue] Processing ${pendingWrites.length} pending operations`);
      const sortedWrites = pendingWrites.sort((a, b) => a.createdAt - b.createdAt);
      for (const write of sortedWrites) {
        if (!write.id) continue;

        if (!isSafeToRequest()) {
          safeLog('[SyncQueue] Rate limit low, pausing queue processing');
          break;
        }

        const result = await this.executeWrite(write);
        if (result.success) {
          await removePendingWrite(write.id);
          safeLog(`[SyncQueue] Successfully synced operation ${write.id}`);
        } else {
          if (result.shouldRetry && write.retryCount < MAX_RETRIES) {
            await updatePendingWriteError(write.id, result.error || 'Unknown error');
          } else {
            await updatePendingWriteError(write.id, result.error || 'Max retries reached');
          }
        }
        // Exponential backoff with jitter between operations
        const backoffMs = SyncQueue.calculateBackoff(write.retryCount ?? 0);
        await SyncQueue.delay(backoffMs);
      }
    } catch (error) {
      safeError('[SyncQueue] Error processing queue:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async executeWrite(write: PendingWrite): Promise<SyncResult> {
    try {
      // Pre-write conflict check: verify remote gist hasn't changed since queue time
      if (write.expectedRemoteVersion && write.action !== 'create') {
        try {
          const remote = await githubGetGist(write.gistId);
          if (remote?.updated_at !== write.expectedRemoteVersion) {
            const local = await getGist(write.gistId);
            if (local && remote) {
              const conflict = detectConflict(local, remote as unknown as GitHubGist) || {
                gistId: local.id,
                localVersion: local,
                remoteVersion: remote,
                detectedAt: new Date().toISOString(),
                conflictingFields: ['updated_at'],
              };
              await storeConflict(conflict);
            }
            return {
              success: false,
              error: `Conflict: gist ${write.gistId} was modified remotely since operation was queued`,
              shouldRetry: false,
            };
          }
        } catch (error) {
          safeError(`[SyncQueue] Pre-write conflict check failed for ${write.gistId}:`, error);
          // Proceed with operation — best-effort conflict detection
        }
      }

      const handlers: Record<string, () => Promise<SyncResult>> = {
        create: () => SyncQueue.syncCreate(write.gistId, write.payload),
        update: () => SyncQueue.syncUpdate(write.gistId, write.payload),
        delete: () => SyncQueue.syncDelete(write.gistId),
        star: () => SyncQueue.syncStar(write.gistId),
        unstar: () => SyncQueue.syncUnstar(write.gistId),
        fork: () => SyncQueue.syncFork(write.gistId),
      };
      const handler = handlers[write.action];
      if (handler) return await handler();
      return { success: false, error: `Unknown action: ${write.action}`, shouldRetry: false };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldRetry: SyncQueue.isRetryableError(error),
      };
    }
  }

  private static async syncCreate(_gistId: string, payload: unknown): Promise<SyncResult> {
    const gist = await createGist(payload as CreateGistRequest);
    await saveGist(SyncQueue.githubGistToRecord(gist));
    return { success: true, shouldRetry: false };
  }

  private static async syncUpdate(gistId: string, payload: unknown): Promise<SyncResult> {
    const gist = await updateGist(gistId, payload as UpdateGistRequest);
    await saveGist(SyncQueue.githubGistToRecord(gist));
    return { success: true, shouldRetry: false };
  }

  private static async syncDelete(gistId: string): Promise<SyncResult> {
    await deleteGist(gistId);
    await dbDeleteGist(gistId);
    return { success: true, shouldRetry: false };
  }

  private static async syncStar(gistId: string): Promise<SyncResult> {
    await starGist(gistId);
    return { success: true, shouldRetry: false };
  }

  private static async syncUnstar(gistId: string): Promise<SyncResult> {
    await unstarGist(gistId);
    return { success: true, shouldRetry: false };
  }

  private static async syncFork(gistId: string): Promise<SyncResult> {
    const gist = await forkGist(gistId);
    await saveGist(SyncQueue.githubGistToRecord(gist));
    return { success: true, shouldRetry: false };
  }

  private static githubGistToRecord(gist: GitHubGist): GistRecord {
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
            content: file.content,
          },
        ])
      ),
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
    };
  }

  private static isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
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
   * Calculate exponential backoff delay with jitter.
   * Respects server Retry-After headers when available.
   */
  private static calculateBackoff(attempt: number, retryAfterMs?: number): number {
    if (retryAfterMs && retryAfterMs > 0) {
      return retryAfterMs;
    }
    const base = RETRY_BACKOFF_MS;
    const max = RETRY_MAX_DELAY_MS;
    const exponential = base * 2 ** attempt;
    const jitter = Math.random() * base;
    return Math.min(exponential + jitter, max);
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getQueueLength(): Promise<number> {
    const writes = await getPendingWrites();
    return writes.length;
  }

  destroy(): void {
    if (this.unsubscribeNetwork) this.unsubscribeNetwork();
    safeLog('[SyncQueue] Destroyed');
  }
}

const syncQueue = new SyncQueue();
export default syncQueue;
