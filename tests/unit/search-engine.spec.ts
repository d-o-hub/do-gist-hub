/**
 * Search Engine Unit Tests
 * Tests tokenization, indexing, search, and performance
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine } from '../../src/services/search/search-engine';
import type { GistRecord } from '../../src/services/db';

describe('SearchEngine', () => {
  let searchEngine: SearchEngine;
  let mockGists: GistRecord[];

  beforeEach(() => {
    searchEngine = new SearchEngine();
    mockGists = [
      {
        id: 'gist1',
        description: 'TypeScript utility functions',
        files: {
          'utils.ts': {
            filename: 'utils.ts',
            language: 'TypeScript',
            content: 'export function debounce(fn: Function, delay: number) { return fn; }',
          },
        },
        htmlUrl: 'https://gist.github.com/user/gist1',
        gitPullUrl: 'https://gist.github.com/user/gist1.git',
        gitPushUrl: 'https://gist.github.com/user/gist1.git',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-15T00:00:00Z',
        starred: false,
        public: true,
        syncStatus: 'synced',
      },
      {
        id: 'gist2',
        description: 'React hooks examples',
        files: {
          'useDebounce.ts': {
            filename: 'useDebounce.ts',
            language: 'TypeScript',
            content: 'import { useState, useEffect } from "react"; export function useDebounce() {}',
          },
        },
        htmlUrl: 'https://gist.github.com/user/gist2',
        gitPullUrl: 'https://gist.github.com/user/gist2.git',
        gitPushUrl: 'https://gist.github.com/user/gist2.git',
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-15T00:00:00Z',
        starred: true,
        public: false,
        syncStatus: 'synced',
      },
      {
        id: 'gist3',
        description: 'Python data processing',
        files: {
          'process.py': {
            filename: 'process.py',
            language: 'Python',
            content: 'def process_data(data): return data',
          },
        },
        htmlUrl: 'https://gist.github.com/user/gist3',
        gitPullUrl: 'https://gist.github.com/user/gist3.git',
        gitPushUrl: 'https://gist.github.com/user/gist3.git',
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-15T00:00:00Z',
        starred: false,
        public: true,
        syncStatus: 'synced',
      },
    ];
  });

  describe('indexing', () => {
    it('should build inverted index from gists', async () => {
      await searchEngine.indexGists(mockGists);
      const stats = searchEngine.getStats();
      
      expect(stats.totalDocuments).toBe(3);
      expect(stats.totalTokens).toBeGreaterThan(0);
    });

    it('should handle empty gist list', async () => {
      await searchEngine.indexGists([]);
      const stats = searchEngine.getStats();
      
      expect(stats.totalDocuments).toBe(0);
      expect(stats.totalTokens).toBe(0);
    });

    it('should update index incrementally', async () => {
      await searchEngine.indexGists(mockGists);
      
      const updatedGist = { ...mockGists[0], description: 'Updated description' };
      await searchEngine.updateGist(updatedGist);
      
      const results = await searchEngine.search({ query: 'Updated' });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].gist.id).toBe('gist1');
    });

    it('should remove gist from index', async () => {
      await searchEngine.indexGists(mockGists);
      await searchEngine.removeGist('gist1');
      
      const stats = searchEngine.getStats();
      expect(stats.totalDocuments).toBe(2);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await searchEngine.indexGists(mockGists);
    });

    it('should find exact matches in description', async () => {
      const results = await searchEngine.search({ query: 'TypeScript' });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].gist.description).toContain('TypeScript');
    });

    it('should find matches in file content', async () => {
      const results = await searchEngine.search({ query: 'debounce' });
      
      expect(results.length).toBe(2); // Both gist1 and gist2 have debounce
    });

    it('should find matches in filename', async () => {
      const results = await searchEngine.search({ query: 'useDebounce' });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].gist.id).toBe('gist2');
    });

    it('should handle empty query', async () => {
      const results = await searchEngine.search({ query: '' });
      
      expect(results.length).toBe(3); // Returns all gists
    });

    it('should handle no results', async () => {
      const results = await searchEngine.search({ query: 'nonexistent' });
      
      expect(results.length).toBe(0);
    });

    it('should rank by relevance', async () => {
      const results = await searchEngine.search({ query: 'TypeScript' });
      
      expect(results[0].score).toBeGreaterThan(0);
      // First result should have highest score
      if (results.length > 1) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      }
    });

    it('should extract search snippets', async () => {
      const results = await searchEngine.search({ query: 'debounce' });
      
      expect(results[0].matches.length).toBeGreaterThan(0);
      expect(results[0].matches[0].snippet).toContain('debounce');
    });
  });

  describe('filters', () => {
    beforeEach(async () => {
      await searchEngine.indexGists(mockGists);
    });

    it('should filter by language', async () => {
      const results = await searchEngine.search({
        query: '',
        filters: { languages: ['Python'] },
      });
      
      expect(results.length).toBe(1);
      expect(results[0].gist.id).toBe('gist3');
    });

    it('should filter by file type', async () => {
      const results = await searchEngine.search({
        query: '',
        filters: { fileTypes: ['.py'] },
      });
      
      expect(results.length).toBe(1);
      expect(results[0].gist.id).toBe('gist3');
    });

    it('should filter by date range', async () => {
      const results = await searchEngine.search({
        query: '',
        filters: {
          dateRange: {
            start: '2026-02-01',
            end: '2026-02-28',
          },
        },
      });
      
      expect(results.length).toBe(1);
      expect(results[0].gist.id).toBe('gist2');
    });

    it('should filter by public/secret', async () => {
      const results = await searchEngine.search({
        query: '',
        filters: { isPublic: false },
      });
      
      expect(results.length).toBe(1);
      expect(results[0].gist.id).toBe('gist2');
    });

    it('should filter by starred', async () => {
      const results = await searchEngine.search({
        query: '',
        filters: { isStarred: true },
      });
      
      expect(results.length).toBe(1);
      expect(results[0].gist.id).toBe('gist2');
    });

    it('should combine multiple filters', async () => {
      const results = await searchEngine.search({
        query: 'TypeScript',
        filters: {
          languages: ['TypeScript'],
          isPublic: true,
        },
      });
      
      expect(results.length).toBe(1);
      expect(results[0].gist.id).toBe('gist1');
    });
  });

  describe('sorting', () => {
    beforeEach(async () => {
      await searchEngine.indexGists(mockGists);
    });

    it('should sort by relevance (default)', async () => {
      const results = await searchEngine.search({
        query: 'TypeScript',
        filters: { sortBy: 'relevance' },
      });
      
      if (results.length > 1) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      }
    });

    it('should sort by updated date', async () => {
      const results = await searchEngine.search({
        query: '',
        filters: { sortBy: 'updated', sortOrder: 'desc' },
      });
      
      expect(results[0].gist.id).toBe('gist3'); // Most recent
    });

    it('should sort by created date', async () => {
      const results = await searchEngine.search({
        query: '',
        filters: { sortBy: 'created', sortOrder: 'asc' },
      });
      
      expect(results[0].gist.id).toBe('gist1'); // Oldest
    });

    it('should sort by stars', async () => {
      const results = await searchEngine.search({
        query: '',
        filters: { sortBy: 'stars', sortOrder: 'desc' },
      });
      
      expect(results[0].gist.starred).toBe(true);
    });
  });

  describe('performance', () => {
    it('should index 100 gists in <500ms', async () => {
      const largeGistSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockGists[0],
        id: `gist${i}`,
        description: `Test gist ${i}`,
      }));

      const start = performance.now();
      await searchEngine.indexGists(largeGistSet);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
    });

    it('should search 100 gists in <100ms', async () => {
      const largeGistSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockGists[0],
        id: `gist${i}`,
        description: `Test gist ${i}`,
      }));

      await searchEngine.indexGists(largeGistSet);

      const start = performance.now();
      await searchEngine.search({ query: 'test' });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should use cache for repeated queries', async () => {
      await searchEngine.indexGists(mockGists);

      // First search (not cached)
      const start1 = performance.now();
      await searchEngine.search({ query: 'TypeScript' });
      const duration1 = performance.now() - start1;

      // Second search (cached)
      const start2 = performance.now();
      await searchEngine.search({ query: 'TypeScript' });
      const duration2 = performance.now() - start2;

      // Cached search should be faster
      expect(duration2).toBeLessThan(duration1);
    });

    it('should limit memory usage', async () => {
      const largeGistSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockGists[0],
        id: `gist${i}`,
        description: `Test gist ${i} with some content`,
        files: {
          'file.ts': {
            filename: 'file.ts',
            language: 'TypeScript',
            content: 'x'.repeat(1000), // 1KB per file
          },
        },
      }));

      await searchEngine.indexGists(largeGistSet);
      const stats = searchEngine.getStats();
      const indexSizeMB = stats.indexSize / 1024 / 1024;

      expect(indexSizeMB).toBeLessThan(5); // <5MB budget
    });
  });

  describe('pagination', () => {
    beforeEach(async () => {
      const manyGists = Array.from({ length: 50 }, (_, i) => ({
        ...mockGists[0],
        id: `gist${i}`,
        description: `Test gist ${i}`,
      }));
      await searchEngine.indexGists(manyGists);
    });

    it('should paginate results', async () => {
      const page1 = await searchEngine.search({
        query: 'test',
        limit: 10,
        offset: 0,
      });
      const page2 = await searchEngine.search({
        query: 'test',
        limit: 10,
        offset: 10,
      });

      expect(page1.length).toBe(10);
      expect(page2.length).toBe(10);
      expect(page1[0].gist.id).not.toBe(page2[0].gist.id);
    });
  });
});
