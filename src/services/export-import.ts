import { GistRecord, getAllGists, saveGist, getGist } from './db';
import { detectConflict, storeConflict } from './sync/conflict-detector';
import { GitHubGist } from '../types/api';
import { safeError } from './security/logger';

/**
 * Gist Export Data Format
 */
export interface ExportData {
  version: string;
  exportedAt: string;
  gists: GistRecord[];
  metadata: {
    total: number;
    starred: number;
  };
}

/**
 * Import Result Summary
 */
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
  return createExportBlob(gists);
}

/**
 * Export specific gists by their IDs as a JSON Blob
 */
export async function exportSelectedGists(ids: string[]): Promise<Blob> {
  const allGists = await getAllGists();
  const selectedGists = allGists.filter((g) => ids.includes(g.id));
  return createExportBlob(selectedGists);
}

/**
 * Helper to create the export Blob
 */
function createExportBlob(gists: GistRecord[]): Blob {
  const data: ExportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    gists,
    metadata: {
      total: gists.length,
      starred: gists.filter((g) => g.starred).length,
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
    const data = JSON.parse(text) as ExportData;

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
          // Check for differences
          const hasChanges = JSON.stringify(existing) !== JSON.stringify(importedGist);
          if (!hasChanges) continue;

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
            if (importedGist.updatedAt > existing.updatedAt) {
              await saveGist(importedGist);
              result.updated++;
            }
          }
        }
      } catch (err) {
        result.errors++;
        safeError(`Failed to import gist ${importedGist.id}`, err);
      }
    }
  } catch (err) {
    safeError('Import failed', err);
    throw err;
  }

  return result;
}

/**
 * Helper to convert GistRecord back to a GitHubGist structure for conflict detection
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
