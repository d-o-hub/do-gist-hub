/**
 * Sync Queue Service
 * Manages offline write operations and syncs them when online
 */

import type { PendingWrite } from '../../types';
import type { CreateGistRequest, UpdateGistRequest, GitHubGist } from '../../types/api';
import {
  getPendingWrites,
  queueWrite as dbQueueWrite,
  removePendingWrite,
  updatePendingWriteError,
  saveGist,
  deleteGist as dbDeleteGist,
  GistRecord,
} from '../db';
import * as GitHub from '../github';
import networkMonitor from '../network/offline-monitor';
import { safeLog, safeError } from '../security/logger';

export type SyncAction = 'create' | 'update' | 'delete' | 'star' | 'unstar' | 'fork';

export interface SyncResult {
  success: boolean;
  error?: string;
  shouldRetry: boolean;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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
        await SyncQueue.delay(RETRY_DELAY_MS);
      }
    } catch (error) {
      safeError('[SyncQueue] Error processing queue:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async executeWrite(write: PendingWrite): Promise<SyncResult> {
    try {
      const handlers: Record<string, () => Promise<SyncResult>> = {
        create: () => this.syncCreate(write.gistId, write.payload),
        update: () => this.syncUpdate(write.gistId, write.payload),
        delete: () => this.syncDelete(write.gistId),
        star: () => this.syncStar(write.gistId),
        unstar: () => this.syncUnstar(write.gistId),
        fork: () => this.syncFork(write.gistId),
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

  private async syncCreate(_gistId: string, payload: unknown): Promise<SyncResult> {
    const gist = await GitHub.createGist(payload as CreateGistRequest);
    await saveGist(this.githubGistToRecord(gist));
    return { success: true, shouldRetry: false };
  }

  private async syncUpdate(gistId: string, payload: unknown): Promise<SyncResult> {
    const gist = await GitHub.updateGist(gistId, payload as UpdateGistRequest);
    await saveGist(this.githubGistToRecord(gist));
    return { success: true, shouldRetry: false };
  }

  private async syncDelete(gistId: string): Promise<SyncResult> {
    await GitHub.deleteGist(gistId);
    await dbDeleteGist(gistId);
    return { success: true, shouldRetry: false };
  }

  private async syncStar(gistId: string): Promise<SyncResult> {
    await GitHub.starGist(gistId);
    return { success: true, shouldRetry: false };
  }

  private async syncUnstar(gistId: string): Promise<SyncResult> {
    await GitHub.unstarGist(gistId);
    return { success: true, shouldRetry: false };
  }

  private async syncFork(gistId: string): Promise<SyncResult> {
    const gist = await GitHub.forkGist(gistId);
    await saveGist(this.githubGistToRecord(gist));
    return { success: true, shouldRetry: false };
  }

  private githubGistToRecord(gist: GitHubGist): GistRecord {
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

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static async getQueueLength(): Promise<number> {
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
