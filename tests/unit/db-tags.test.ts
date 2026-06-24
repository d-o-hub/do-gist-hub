import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/app.config', () => ({
  APP: { dbName: 'test-db' },
}));

vi.mock('idb', () => ({
  openDB: vi.fn(),
}));

import type { IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import type { GistDBSchema } from '../../src/services/db';
import {
  assignTag,
  clearAllData,
  closeDB,
  createTag,
  deleteTag,
  exportData,
  getAllTags,
  getDB,
  getTag,
  getTagsForGist,
  importData,
  isDBReady,
  removeTag,
  updateTag,
} from '../../src/services/db';

function makeMockDB(): IDBPDatabase<GistDBSchema> {
  const tags = new Map<string, unknown>();
  const gists = new Map<string, unknown>();
  const pendingWrites = new Map<number, unknown>();
  const metadata = new Map<string, unknown>();
  const logs = new Map<number, unknown>();
  const etags = new Map<string, unknown>();

  const makeStore = (
    store: Map<string | number, unknown>,
    keyFn?: (v: unknown) => string | number
  ) => ({
    get: vi.fn(async (key: unknown) => store.get(key as string | number)),
    put: vi.fn(async (val: unknown) => {
      const k = keyFn ? keyFn(val) : (val as { id: string }).id;
      store.set(k, val);
    }),
    delete: vi.fn(async (key: unknown) => store.delete(key as string | number)),
    getAll: vi.fn(async () => [...store.values()]),
    clear: vi.fn(async () => store.clear()),
    add: vi.fn(async (val: unknown) => {
      const k = keyFn ? keyFn(val) : (val as { id: string }).id;
      store.set(k, val);
      return k;
    }),
    createIndex: vi.fn(),
  });

  const tagStore = makeStore(tags, (v: unknown) => (v as { id: string }).id);
  const gistStore = makeStore(gists);
  const pendingStore = makeStore(pendingWrites, (v: unknown) => (v as { id: number }).id);
  const metadataStore = makeStore(metadata);
  const logStore = makeStore(logs, (v: unknown) => (v as { id: number }).id);
  const etagStore = makeStore(etags);

  const stores: Record<string, unknown> = {
    gists: gistStore,
    pendingWrites: pendingStore,
    metadata: metadataStore,
    logs: logStore,
    etags: etagStore,
    tags: tagStore,
  };

  const tx = {
    objectStore: vi.fn((name: string) => stores[name]),
    done: Promise.resolve(),
  };

  const db = {
    transaction: vi.fn(() => tx),
    put: vi.fn(async (_store: string, val: unknown) => {
      const store = stores[_store] as ReturnType<typeof makeStore>;
      await store.put(val);
    }),
    get: vi.fn(async (_store: string, key: unknown) => {
      const store = stores[_store] as ReturnType<typeof makeStore>;
      return await store.get(key);
    }),
    getAll: vi.fn(async (_store: string) => {
      const store = stores[_store] as ReturnType<typeof makeStore>;
      return await store.getAll();
    }),
    delete: vi.fn(async (_store: string, key: unknown) => {
      const store = stores[_store] as ReturnType<typeof makeStore>;
      await store.delete(key);
    }),
    close: vi.fn(async () => {}),
    createObjectStore: vi.fn(() => tagStore),
    objectStoreNames: { contains: vi.fn() },
    version: 4,
  };

  return db as unknown as IDBPDatabase<GistDBSchema>;
}

describe('db tag and lifecycle operations', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = makeMockDB();
    vi.mocked(openDB).mockResolvedValue(db);
    const { initIndexedDB } = await import('../../src/services/db');
    await initIndexedDB();
  });

  it('creates a tag', async () => {
    const tag = await createTag('bug', '#ff0000');
    expect(tag.name).toBe('bug');
    expect(tag.color).toBe('#ff0000');
    expect(tag.gistIds).toEqual([]);
    expect(typeof tag.id).toBe('string');
  });

  it('gets all tags (only newly created ones)', async () => {
    const tag1 = await createTag('x', '#111');
    const allTags = await getAllTags();
    const found = allTags.find((t) => t.id === tag1.id);
    expect(found?.name).toBe('x');
  });

  it('gets a tag by id', async () => {
    const tag = await createTag('findme', '#abc');
    const found = await getTag(tag.id);
    expect(found?.name).toBe('findme');
  });

  it('returns undefined for missing tag', async () => {
    const result = await getTag('nonexistent');
    expect(result).toBeUndefined();
  });

  it('updates tag name and color', async () => {
    const tag = await createTag('old', '#000');
    await updateTag(tag.id, { name: 'new', color: '#fff' });
    const updated = await getTag(tag.id);
    expect(updated?.name).toBe('new');
    expect(updated?.color).toBe('#fff');
  });

  it('throws for nonexistent tag update', async () => {
    await expect(updateTag('nope', { name: 'x' })).rejects.toThrow('Tag nope not found');
  });

  it('deletes a tag', async () => {
    const tag = await createTag('temp', '#aaa');
    await deleteTag(tag.id);
    const result = await getTag(tag.id);
    expect(result).toBeUndefined();
  });

  it('assigns tag to gist', async () => {
    const tag = await createTag('t', '#aaa');
    await assignTag('g1', tag.id);
    const updated = await getTag(tag.id);
    expect(updated?.gistIds).toContain('g1');
  });

  it('does not duplicate assignment', async () => {
    const tag = await createTag('t', '#aaa');
    await assignTag('g1', tag.id);
    await assignTag('g1', tag.id);
    const updated = await getTag(tag.id);
    const g1Count = updated?.gistIds.filter((id: string) => id === 'g1').length ?? 0;
    expect(g1Count).toBe(1);
  });

  it('throws for nonexistent tag assign', async () => {
    await expect(assignTag('g1', 'nope')).rejects.toThrow('Tag nope not found');
  });

  it('removes tag from gist', async () => {
    const tag = await createTag('t', '#aaa');
    await assignTag('g1', tag.id);
    await removeTag('g1', tag.id);
    const updated = await getTag(tag.id);
    expect(updated?.gistIds).not.toContain('g1');
  });

  it('throws for nonexistent tag remove', async () => {
    await expect(removeTag('g1', 'nope')).rejects.toThrow('Tag nope not found');
  });

  it('gets tags for a gist', async () => {
    const t1 = await createTag('a', '#111');
    const t2 = await createTag('b', '#222');
    await assignTag('gist-1', t1.id);
    await assignTag('gist-1', t2.id);
    const tags = await getTagsForGist('gist-1');
    expect(tags.length).toBe(2);
  });

  it('returns empty when no tags match gist', async () => {
    const tags = await getTagsForGist('no-gist');
    expect(tags).toEqual([]);
  });

  it('isDBReady returns true after init', () => {
    expect(isDBReady()).toBe(true);
  });

  it('getDB returns the instance', () => {
    expect(getDB()).toBeDefined();
  });

  it('clearAllData clears all stores', async () => {
    await clearAllData();
    expect(getDB().transaction).toBeDefined();
  });

  it('exports data as JSON string', async () => {
    const result = await exportData();
    const data = JSON.parse(result);
    expect(data.version).toBe('3.0.0');
    expect(data.exportedAt).toBeDefined();
  });

  it('imports data from JSON string', async () => {
    const data = {
      gists: [{ id: 'imported-1' }],
      pendingWrites: [],
      metadata: [],
      logs: [],
    };
    await importData(JSON.stringify(data));
    expect(getDB().transaction).toBeDefined();
  });

  it('makes getDB throw after closing', async () => {
    await closeDB();
    expect(() => getDB()).toThrow('Database not initialized');
  });
});
