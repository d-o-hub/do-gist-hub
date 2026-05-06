import { GistRecord, getAllGists, getGist, getDB, saveGists } from './db';
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

/**
 * Import Result Summary
 */
export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  conflicts: number;
  errors: string[];
}

/**
 * Helper to create the export Blob
 */
function createExportBlob(gists: GistRecord[]): Blob {
  const data: ExportData = {
    version: '3.0.0',
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
 * Import gists from a JSON file
 */
export async function importGists(file: File): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    conflicts: 0,
    errors: [],
  };

  try {
    const text = await file.text();
    const data = JSON.parse(text) as ExportData;

    if (!data.gists || !Array.isArray(data.gists)) {
      throw new Error('Invalid export file format: missing gists array');
    }

    const db = getDB();
    if (!db) throw new Error('Database not initialized');

    const gistsToSave: GistRecord[] = [];

    for (const importedGist of data.gists) {
      try {
        const existing = await getGist(importedGist.id);

        if (!existing) {
          // New gist
          gistsToSave.push(importedGist);
          result.imported++;
        } else {
          // Existing gist - check for updates/conflicts
          const hasChanges = JSON.stringify(existing) !== JSON.stringify(importedGist);

          if (!hasChanges) {
            result.skipped++;
            continue;
          }

          // Check for conflicts
          const importedAsGitHubGist = recordToGitHubGist(importedGist);
          const conflict = detectConflict(existing, importedAsGitHubGist);

          if (conflict) {
            await storeConflict(conflict);
            await db.put('gists', {
              ...existing,
              syncStatus: 'conflict',
            });
            result.conflicts++;
          } else {
            // Local is clean, check for newer timestamp
            if (new Date(importedGist.updatedAt) > new Date(existing.updatedAt)) {
              gistsToSave.push(importedGist);
              result.updated++;
            } else {
              result.skipped++;
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Failed to import gist ${importedGist.id}: ${msg}`);
        safeError(`Import error for gist ${importedGist.id}`, err);
      }
    }

    if (gistsToSave.length > 0) {
      await saveGists(gistsToSave);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Failed to parse import file: ${msg}`);
    safeError('Import failed', err);
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
