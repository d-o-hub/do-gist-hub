import { GistRecord, getAllGists, getDB } from './db';
import { safeError } from './security/logger';

/**
 * Export Data Format
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
  skipped: number;
  conflicts: number;
  errors: string[];
}

/**
 * Export all gists to a JSON Blob
 */
export async function exportAllGists(): Promise<Blob> {
  const gists = await getAllGists();
  return createExportBlob(gists);
}

/**
 * Export specific gists to a JSON Blob
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
    version: '1.0.0', // Format version
    exportedAt: new Date().toISOString(),
    gists,
    metadata: {
      total: gists.length,
      starred: gists.filter((g) => g.starred).length,
    },
  };

  const json = JSON.stringify(data, null, 2);
  return new Blob([json], { type: 'application/json' });
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

    for (const importedGist of data.gists) {
      try {
        const existingGist = await db.get('gists', importedGist.id);

        if (!existingGist) {
          // New gist
          await db.put('gists', importedGist);
          result.imported++;
        } else {
          // Existing gist - check for updates/conflicts
          const hasChanges = JSON.stringify(existingGist) !== JSON.stringify(importedGist);

          if (!hasChanges) {
            result.skipped++;
            continue;
          }

          // Simple conflict detection: if local has pending changes, mark as conflict
          if (existingGist.syncStatus === 'pending' || existingGist.syncStatus === 'conflict') {
            await db.put('gists', {
              ...importedGist,
              syncStatus: 'conflict',
            });
            result.conflicts++;
          } else {
            // Local is clean, safe to update from import
            await db.put('gists', importedGist);
            result.updated++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Failed to import gist ${importedGist.id}: ${msg}`);
        safeError(`Import error for gist ${importedGist.id}`, err);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Failed to parse import file: ${msg}`);
    safeError('Import failed', err);
  }

  return result;
}
