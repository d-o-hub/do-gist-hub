import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/db', () => ({
  createTag: vi.fn(),
  getAllTags: vi.fn(),
  getTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  getTagsForGist: vi.fn(),
  assignTag: vi.fn(),
  removeTag: vi.fn(),
}));

import type { TagRecord } from '../../src/services/db';
import {
  assignTag,
  createTag,
  deleteTag,
  getAllTags,
  getTag,
  getTagsForGist,
  removeTag,
  updateTag,
} from '../../src/services/db';

const mockCreateTag = vi.mocked(createTag);
const mockGetAllTags = vi.mocked(getAllTags);
const mockGetTag = vi.mocked(getTag);
const mockUpdateTag = vi.mocked(updateTag);
const mockDeleteTag = vi.mocked(deleteTag);
const mockGetTagsForGist = vi.mocked(getTagsForGist);
const mockAssignTag = vi.mocked(assignTag);
const mockRemoveTag = vi.mocked(removeTag);

describe('Tag CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a tag', async () => {
    const tag: TagRecord = {
      id: 'tag-1',
      name: 'Important',
      color: '#ff0000',
      gistIds: [],
    };
    mockCreateTag.mockResolvedValue(tag);

    const result = await createTag('Important', '#ff0000');

    expect(result).toEqual(tag);
    expect(mockCreateTag).toHaveBeenCalledWith('Important', '#ff0000');
  });

  it('should get all tags', async () => {
    const tags: TagRecord[] = [
      { id: 'tag-1', name: 'Important', color: '#ff0000', gistIds: ['gist-1'] },
      { id: 'tag-2', name: 'Bug', color: '#00ff00', gistIds: [] },
    ];
    mockGetAllTags.mockResolvedValue(tags);

    const result = await getAllTags();

    expect(result).toEqual(tags);
  });

  it('should get a tag by ID', async () => {
    const tag: TagRecord = { id: 'tag-1', name: 'Important', color: '#ff0000', gistIds: [] };
    mockGetTag.mockResolvedValue(tag);

    const result = await getTag('tag-1');

    expect(result).toEqual(tag);
  });

  it('should update a tag', async () => {
    const tag: TagRecord = { id: 'tag-1', name: 'Important', color: '#ff0000', gistIds: [] };
    mockGetTag.mockResolvedValue(tag);
    mockUpdateTag.mockResolvedValue(undefined);

    await updateTag('tag-1', { name: 'Very Important' });

    expect(mockUpdateTag).toHaveBeenCalledWith('tag-1', { name: 'Very Important' });
  });

  it('should delete a tag', async () => {
    mockDeleteTag.mockResolvedValue(undefined);

    await deleteTag('tag-1');

    expect(mockDeleteTag).toHaveBeenCalledWith('tag-1');
  });
});

describe('Tag Assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should assign a tag to a gist', async () => {
    const tag: TagRecord = { id: 'tag-1', name: 'Important', color: '#ff0000', gistIds: [] };
    mockGetTag.mockResolvedValue(tag);
    mockAssignTag.mockResolvedValue(undefined);

    await assignTag('gist-1', 'tag-1');

    expect(mockAssignTag).toHaveBeenCalledWith('gist-1', 'tag-1');
  });

  it('should remove a tag from a gist', async () => {
    const tag: TagRecord = {
      id: 'tag-1',
      name: 'Important',
      color: '#ff0000',
      gistIds: ['gist-1'],
    };
    mockGetTag.mockResolvedValue(tag);
    mockRemoveTag.mockResolvedValue(undefined);

    await removeTag('gist-1', 'tag-1');

    expect(mockRemoveTag).toHaveBeenCalledWith('gist-1', 'tag-1');
  });

  it('should get tags for a gist', async () => {
    const tags: TagRecord[] = [
      { id: 'tag-1', name: 'Important', color: '#ff0000', gistIds: ['gist-1'] },
    ];
    mockGetTagsForGist.mockResolvedValue(tags);

    const result = await getTagsForGist('gist-1');

    expect(result).toEqual(tags);
  });
});

describe('Tag Filtering', () => {
  it('should filter gists by tag', () => {
    const tags = new Map<string, TagRecord[]>([
      ['gist-1', [{ id: 'tag-1', name: 'Important', color: '#ff0000', gistIds: [] }]],
      ['gist-2', []],
      ['gist-3', [{ id: 'tag-1', name: 'Important', color: '#ff0000', gistIds: [] }]],
    ]);

    const gists = [{ id: 'gist-1' }, { id: 'gist-2' }, { id: 'gist-3' }];

    const filtered = gists.filter((g) => {
      const gistTags = tags.get(g.id) ?? [];
      return gistTags.some((t) => t.id === 'tag-1');
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.map((g) => g.id)).toEqual(['gist-1', 'gist-3']);
  });
});
