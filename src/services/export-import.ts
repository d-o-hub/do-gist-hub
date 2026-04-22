import { GistRecord, getAllGists, saveGist, getGist } from './db';
import { detectConflict, storeConflict } from './sync/conflict-detector';
import { GitHubGist } from '../types/api';
import { safeError } from './security/logger';

export interface ExportData {
  version: string;
  exportedAt: string;
  gists: GistRecord[];
  metadata: {
    total: number;
    starred: number;
  };
}

export interface ImportResult {
  imported: number;
  updated: number;
  conflicts: number;
  errors: number;
}

/**
 * Export all gists from the local database as a JSON Blob
 */
export async function exportAllGists(): Promise<Blob> {
  const gists = await getAllGists();
  const starred = gists.filter((g) => g.starred).length;

  const data: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    gists,
    metadata: {
      total: gists.length,
      starred,
    },
  };

  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

/**
 * Export specific gists by their IDs as a JSON Blob
 */
export async function exportSelectedGists(ids: string[]): Promise<Blob> {
  const allGists = await getAllGists();
  const gists = allGists.filter((g) => ids.includes(g.id));
  const starred = gists.filter((g) => g.starred).length;

  const data: ExportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    gists,
    metadata: {
      total: gists.length,
      starred,
    },
  };

  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

/**
 * Import gists from a JSON file
 */
export async function importGists(file: File): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    updated: 0,
    conflicts: 0,
    errors: 0,
  };

  try {
    const text = await file.text();
    const data: ExportData = JSON.parse(text);

    if (!data.gists || !Array.isArray(data.gists)) {
      throw new Error('Invalid export file format');
    }

    for (const importedGist of data.gists) {
      try {
        const existing = await getGist(importedGist.id);

        if (!existing) {
          await saveGist(importedGist);
          result.imported++;
        } else {
          // Check for conflicts
          // We need to convert GistRecord to GitHubGist for detectConflict
          const importedAsGitHubGist = recordToGitHubGist(importedGist);
          const conflict = detectConflict(existing, importedAsGitHubGist);

          if (conflict) {
            await storeConflict(conflict);
            await saveGist({
              ...existing,
              syncStatus: 'conflict',
            });
            result.conflicts++;
          } else {
            // No conflict, but maybe it's an update (newer timestamp)
            if (importedGist.updatedAt > existing.updatedAt) {
              await saveGist(importedGist);
              result.updated++;
            }
          }
        }
      } catch (err) {
        safeError(`Failed to import gist ${importedGist.id}`, err);
        result.errors++;
      }
    }
  } catch (err) {
    safeError('Import failed', err);
    throw err;
  }

  return result;
}

/**
 * Helper to convert GistRecord back to a GitHubGist-like structure for conflict detection
 */
function recordToGitHubGist(record: GistRecord): GitHubGist {
  return {
    id: record.id,
    description: record.description || '',
    public: record.public,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
    html_url: record.htmlUrl,
    git_pull_url: record.gitPullUrl,
    git_push_url: record.gitPushUrl,
    files: Object.fromEntries(
      Object.entries(record.files).map(([name, file]) => [
        name,
        {
          filename: file.filename,
          type: file.type || '',
          language: file.language || '',
          raw_url: file.rawUrl || '',
          size: file.size || 0,
          truncated: file.truncated || false,
          content: file.content,
        },
      ])
    ),
    owner: record.owner
      ? {
          login: record.owner.login,
          id: record.owner.id,
          avatar_url: record.owner.avatarUrl,
          html_url: record.owner.htmlUrl,
        }
      : undefined,
  } as GitHubGist;
}
