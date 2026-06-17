/**
 * Sync Queue Service
 * Manages offline write operations and syncs them when online
 */

import type { PendingWrite } from '../../types';
import type { CreateGistRequest, GitHubGist, UpdateGistRequest } from '../../types/api';
import { githubGistToRecord } from '../../utils/gist-mapper';
import {
  deleteGist as dbDeleteGist,
  queueWrite as dbQueueWrite,
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
import { getRetryAfterMs, isSafeToRequest } from '../github/rate-limiter';
import networkMonitor from '../network/offline-monitor';
import { capabilities } from '../pwa/capabilities';
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
  private abortController = new AbortController();

  init(): void {
    this.unsubscribeNetwork = networkMonitor.subscribe((status) => {
      if (status === 'online') {
        safeLog('[SyncQueue] Network online, checking pending operations');
        void this.processQueue();
      }
    });
    window.addEventListener(
      'app:online',
      () => {
        void this.processQueue();
      },
      { signal: this.abortController.signal }
    );
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
    this.updateBadge().catch(() => {});
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
          this.updateBadge().catch(() => {});
        } else {
          if (result.shouldRetry && write.retryCount < MAX_RETRIES) {
            await updatePendingWriteError(write.id, result.error || 'Unknown error');
          } else {
            await updatePendingWriteError(write.id, result.error || 'Max retries reached');
          }
        }
        // Exponential backoff with jitter between operations, respecting server Retry-After
        const retryAfterMs = getRetryAfterMs();
        const backoffMs = calculateBackoff(write.retryCount ?? 0, retryAfterMs || undefined);
        await delay(backoffMs);
      }
    } catch (error) {
      safeError('[SyncQueue] Error processing queue:', error);
    } finally {
      this.isSyncing = false;
      this.updateBadge().catch(() => {});
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
        create: () => syncCreate(write.gistId, write.payload),
        update: () => syncUpdate(write.gistId, write.payload),
        delete: () => syncDelete(write.gistId),
        star: () => syncStar(write.gistId),
        unstar: () => syncUnstar(write.gistId),
        fork: () => syncFork(write.gistId),
      };
      const handler = handlers[write.action];
      if (handler) return await handler();
      return { success: false, error: `Unknown action: ${write.action}`, shouldRetry: false };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldRetry: isRetryableError(error),
      };
    }
  }

  async getQueueLength(): Promise<number> {
    const writes = await getPendingWrites();
    return writes.length;
  }

  private async updateBadge(): Promise<void> {
    const count = await this.getQueueLength();
    await capabilities.setSyncBadge(count);
  }

  destroy(): void {
    this.abortController.abort();
    if (this.unsubscribeNetwork) this.unsubscribeNetwork();
    safeLog('[SyncQueue] Destroyed');
  }
}

async function syncCreate(_gistId: string, payload: unknown): Promise<SyncResult> {
  const gist = await createGist(payload as CreateGistRequest);
  await saveGist(githubGistToRecord(gist));
  return { success: true, shouldRetry: false };
}

async function syncUpdate(gistId: string, payload: unknown): Promise<SyncResult> {
  const gist = await updateGist(gistId, payload as UpdateGistRequest);
  await saveGist(githubGistToRecord(gist));
  return { success: true, shouldRetry: false };
}

async function syncDelete(gistId: string): Promise<SyncResult> {
  await deleteGist(gistId);
  await dbDeleteGist(gistId);
  return { success: true, shouldRetry: false };
}

async function syncStar(gistId: string): Promise<SyncResult> {
  await starGist(gistId);
  return { success: true, shouldRetry: false };
}

async function syncUnstar(gistId: string): Promise<SyncResult> {
  await unstarGist(gistId);
  return { success: true, shouldRetry: false };
}

async function syncFork(gistId: string): Promise<SyncResult> {
  const gist = await forkGist(gistId);
  await saveGist(githubGistToRecord(gist));
  return { success: true, shouldRetry: false };
}

export function isRetryableError(error: unknown): boolean {
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
export function calculateBackoff(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs && retryAfterMs > 0) {
    return retryAfterMs;
  }
  const base = RETRY_BACKOFF_MS;
  const max = RETRY_MAX_DELAY_MS;
  const exponential = base * 2 ** attempt;
  const jitter = Math.random() * base;
  return Math.min(exponential + jitter, max);
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const syncQueue = new SyncQueue();
export default syncQueue;
