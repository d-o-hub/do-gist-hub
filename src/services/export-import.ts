import type { GitHubGist } from '../types/api';
import { type GistRecord, getAllGists, getDB, getGist, saveGists } from './db';
import { safeError } from './security/logger';
import { detectConflict, storeConflict } from './sync/conflict-detector';

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
 * Import gists from a JSON file
 */
async function processImportedGist(
  importedGist: GistRecord,
  result: ImportResult,
  gistsToSave: GistRecord[]
): Promise<void> {
  const db = getDB();
  if (!db) throw new Error('Database not initialized');

  const existing = await getGist(importedGist.id);

  if (!existing) {
    gistsToSave.push(importedGist);
    result.imported++;
    return;
  }

  const hasChanges = JSON.stringify(existing) !== JSON.stringify(importedGist);
  if (!hasChanges) {
    result.skipped++;
    return;
  }

  const importedAsGitHubGist = recordToGitHubGist(importedGist);
  const conflict = detectConflict(existing, importedAsGitHubGist);

  if (conflict) {
    await storeConflict(conflict);
    await db.put('gists', { ...existing, syncStatus: 'conflict' });
    result.conflicts++;
  } else if (new Date(importedGist.updatedAt) > new Date(existing.updatedAt)) {
    gistsToSave.push(importedGist);
    result.updated++;
  } else {
    result.skipped++;
  }
}

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

    const gistsToSave: GistRecord[] = [];

    for (const importedGist of data.gists) {
      try {
        await processImportedGist(importedGist, result, gistsToSave);
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

const encoder = new TextEncoder();

function uint16LE(n: number): Uint8Array {
  const buf = new Uint8Array(2);
  buf[0] = n & 0xff;
  buf[1] = (n >> 8) & 0xff;
  return buf;
}

function uint32LE(n: number): Uint8Array {
  const buf = new Uint8Array(4);
  buf[0] = n & 0xff;
  buf[1] = (n >> 8) & 0xff;
  buf[2] = (n >> 16) & 0xff;
  buf[3] = (n >> 24) & 0xff;
  return buf;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] ?? 0;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  content: string;
}

export function createZipBlob(entries: ZipEntry[]): Blob {
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const contentBytes = encoder.encode(entry.content);
    const crc = crc32(contentBytes);
    const now = new Date();
    const dosTime = (now.getSeconds() >> 1) | (now.getMinutes() << 5) | (now.getHours() << 11);
    const dosDate = now.getDate() | ((now.getMonth() + 1) << 5) | ((now.getFullYear() - 1980) << 9);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    localHeader.set(uint32LE(0x04034b50), 0);
    localHeader.set(uint16LE(20), 4);
    localHeader.set(uint16LE(0), 6);
    localHeader.set(uint16LE(0), 8);
    localHeader.set(uint16LE(dosTime), 10);
    localHeader.set(uint16LE(dosDate), 12);
    localHeader.set(uint32LE(crc), 14);
    localHeader.set(uint32LE(contentBytes.length), 18);
    localHeader.set(uint32LE(contentBytes.length), 22);
    localHeader.set(uint16LE(nameBytes.length), 26);
    localHeader.set(uint16LE(0), 28);
    localHeader.set(nameBytes, 30);

    parts.push(localHeader);
    parts.push(contentBytes);

    const centralEntry = new Uint8Array(46 + nameBytes.length);
    centralEntry.set(uint32LE(0x02014b50), 0);
    centralEntry.set(uint16LE(20), 4);
    centralEntry.set(uint16LE(20), 6);
    centralEntry.set(uint16LE(0), 8);
    centralEntry.set(uint16LE(0), 10);
    centralEntry.set(uint16LE(dosTime), 12);
    centralEntry.set(uint16LE(dosDate), 14);
    centralEntry.set(uint32LE(crc), 16);
    centralEntry.set(uint32LE(contentBytes.length), 20);
    centralEntry.set(uint32LE(contentBytes.length), 24);
    centralEntry.set(uint16LE(nameBytes.length), 28);
    centralEntry.set(uint16LE(0), 30);
    centralEntry.set(uint16LE(0), 32);
    centralEntry.set(uint16LE(0), 34);
    centralEntry.set(uint16LE(0), 36);
    centralEntry.set(uint32LE(0), 38);
    centralEntry.set(uint32LE(offset), 42);
    centralEntry.set(nameBytes, 46);
    centralDir.push(centralEntry);

    offset += localHeader.length + contentBytes.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const cd of centralDir) {
    parts.push(cd);
    centralDirSize += cd.length;
  }

  const endRecord = new Uint8Array(22);
  endRecord.set(uint32LE(0x06054b50), 0);
  endRecord.set(uint16LE(0), 4);
  endRecord.set(uint16LE(0), 6);
  endRecord.set(uint16LE(entries.length), 8);
  endRecord.set(uint16LE(entries.length), 10);
  endRecord.set(uint32LE(centralDirSize), 12);
  endRecord.set(uint32LE(centralDirOffset), 16);
  endRecord.set(uint16LE(0), 20);
  parts.push(endRecord);

  const totalSize = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }

  return new Blob([result], { type: 'application/zip' });
}

export function exportGistAsJson(gist: GistRecord): Blob {
  const files: Record<string, { filename: string; content: string; language?: string }> = {};
  for (const key in gist.files) {
    if (Object.hasOwn(gist.files, key)) {
      const f = gist.files[key];
      if (!f) continue;
      files[key] = { filename: f.filename, content: f.content ?? '', language: f.language };
    }
  }
  const data = {
    id: gist.id,
    description: gist.description,
    public: gist.public,
    createdAt: gist.createdAt,
    updatedAt: gist.updatedAt,
    files,
  };
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

export function exportGistAsZip(gist: GistRecord): Blob {
  const entries: ZipEntry[] = [];
  for (const key in gist.files) {
    if (Object.hasOwn(gist.files, key)) {
      const f = gist.files[key];
      if (!f) continue;
      entries.push({ name: f.filename, content: f.content ?? '' });
    }
  }
  return createZipBlob(entries);
}
