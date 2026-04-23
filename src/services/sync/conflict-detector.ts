/**
 * Sync Conflict Detection and Resolution
 * Detects when local and remote gist versions diverge.
 * Provides resolution strategies (local-wins, remote-wins, manual).
 */

import { GistRecord, getDB } from '../db';
import type { GitHubGist } from '../../types/api';

/**
 * Conflict information for a single gist.
 */
export interface GistConflict {
  gistId: string;
  localVersion: GistRecord;
  remoteVersion: GitHubGist;
  detectedAt: string;
  /** Which fields differ */
  conflictingFields: string[];
}

/**
 * Resolution strategy.
 */
export type ResolutionStrategy = 'local-wins' | 'remote-wins' | 'manual';

/**
 * Detect conflicts between local and remote gist.
 * Returns conflict object if differences found, null otherwise.
 */
export function detectConflict(local: GistRecord, remote: GitHubGist): GistConflict | null {
  const conflictingFields: string[] = [];

  // Compare timestamps - if remote is newer than local's last sync, potential conflict
  if (remote.updated_at > local.updatedAt) {
    // Check if content actually differs
    if (hasContentChanged(local, remote)) {
      conflictingFields.push('content');
    }
  }

  // Compare description
  if (local.description !== remote.description) {
    conflictingFields.push('description');
  }

  // Compare public flag
  if (local.public !== remote.public) {
    conflictingFields.push('public');
  }

  // Compare starred status (from remote checkIfStarred)
  // Note: starred is local-only, GitHub doesn't expose it in the gist API directly

  if (conflictingFields.length === 0) {
    return null;
  }

  return {
    gistId: local.id,
    localVersion: local,
    remoteVersion: remote,
    detectedAt: new Date().toISOString(),
    conflictingFields,
  };
}

/**
 * Check if gist content has actually changed (files added/removed/modified).
 */
function hasContentChanged(local: GistRecord, remote: GitHubGist): boolean {
  const localFiles = Object.keys(local.files);
  const remoteFiles = Object.keys(remote.files);

  // File count changed
  if (localFiles.length !== remoteFiles.length) {
    return true;
  }

  // File names changed
  if (!localFiles.every((f) => remoteFiles.includes(f))) {
    return true;
  }

  // File content changed (check sizes as proxy)
  for (const filename of localFiles) {
    const localFile = local.files[filename];
    const remoteFile = remote.files[filename];

    if (localFile?.size !== remoteFile?.size) {
      return true;
    }
  }

  return false;
}

/**
 * Resolve a conflict using the specified strategy.
 * Returns the resolved gist record.
 */
export function resolveConflict(conflict: GistConflict, strategy: ResolutionStrategy): GistRecord {
  switch (strategy) {
    case 'local-wins':
      // Keep local version, update sync status
      return {
        ...conflict.localVersion,
        syncStatus: 'pending', // Will sync to remote
      };

    case 'remote-wins':
      // Accept remote version
      return githubGistToResolvedRecord(conflict.remoteVersion, conflict.localVersion.starred);

    case 'manual':
      // Mark as conflict for manual resolution
      return {
        ...conflict.localVersion,
        syncStatus: 'conflict',
      };

    default:
      throw new Error(`Unknown resolution strategy: ${strategy}`);
  }
}

/**
 * Convert remote gist to a resolved local record.
 */
function githubGistToResolvedRecord(remote: GitHubGist, starred: boolean): GistRecord {
  return {
    id: remote.id,
    description: remote.description,
    files: Object.fromEntries(
      Object.entries(remote.files).map(([key, file]) => [
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
    htmlUrl: remote.html_url,
    gitPullUrl: remote.git_pull_url,
    gitPushUrl: remote.git_push_url,
    createdAt: remote.created_at,
    updatedAt: remote.updated_at,
    starred,
    public: remote.public,
    owner: remote.owner
      ? {
          login: remote.owner.login,
          id: remote.owner.id,
          avatarUrl: remote.owner.avatar_url,
          htmlUrl: remote.owner.html_url,
        }
      : undefined,
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * Store conflict in IndexedDB for later retrieval.
 */
export async function storeConflict(conflict: GistConflict): Promise<void> {
  await storeConflicts([conflict]);
}

/**
 * Store multiple conflicts in IndexedDB in a single operation.
 * Prevents race conditions during parallel processing.
 */
export async function storeConflicts(newConflicts: GistConflict[]): Promise<void> {
  if (newConflicts.length === 0) return;

  const db = getDB();
  const tx = db.transaction('metadata', 'readwrite');
  const store = tx.objectStore('metadata');

  // Use a transaction-safe read-modify-write pattern
  const record = await store.get('sync-conflicts');
  const conflicts = (record?.value as GistConflict[]) || [];
  const conflictMap = new Map(conflicts.map((c) => [c.gistId, c]));

  for (const conflict of newConflicts) {
    conflictMap.set(conflict.gistId, conflict);
  }

  await store.put({
    key: 'sync-conflicts',
    value: Array.from(conflictMap.values()),
    updatedAt: Date.now(),
  });

  await tx.done;
}

/**
 * Get all stored conflicts.
 */
export async function getConflicts(): Promise<GistConflict[]> {
  const { getMetadata } = await import('../db');
  return (await getMetadata<GistConflict[]>('sync-conflicts')) || [];
}

/**
 * Clear a resolved conflict.
 */
export async function clearConflict(gistId: string): Promise<void> {
  const { getMetadata, setMetadata } = await import('../db');
  const conflicts = (await getMetadata<GistConflict[]>('sync-conflicts')) || [];
  const filtered = conflicts.filter((c) => c.gistId !== gistId);
  await setMetadata('sync-conflicts', filtered);
}

/**
 * Clear all conflicts (e.g., on logout).
 */
export async function clearAllConflicts(): Promise<void> {
  const { setMetadata } = await import('../db');
  await setMetadata('sync-conflicts', []);
}
