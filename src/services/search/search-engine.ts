/**
 * Full-Text Search Engine
 * Implements in-memory inverted index with TF-IDF scoring
 */

import type { GistRecord } from '../db';
import type { SearchFilters } from '../db';

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  gist: GistRecord;
  score: number;
  matches: SearchMatch[];
}

export interface SearchMatch {
  field: 'description' | 'filename' | 'content';
  filename?: string;
  snippet: string;
  lineNumber?: number;
}

interface InvertedIndex {
  [token: string]: Set<string>; // token -> gist IDs
}

interface DocumentFrequency {
  [token: string]: number; // token -> number of documents containing it
}

interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
}

/**
 * Simple LRU Cache for search results
 */
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 50, ttlMs = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (!value) return undefined;

    // Check TTL for cache entries
    if (this.isCacheEntry(value)) {
      if (Date.now() - value.timestamp > this.ttl) {
        this.cache.delete(key);
        return undefined;
      }
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  private isCacheEntry(value: V): value is V & CacheEntry {
    return typeof value === 'object' && value !== null && 'timestamp' in value;
  }
}

/**
 * Search Engine with full-text indexing
 */
export class SearchEngine {
  private contentIndex: InvertedIndex = {};
  private documentFrequency: DocumentFrequency = {};
  private gistMap = new Map<string, GistRecord>();
  private totalDocuments = 0;
  private searchCache: LRUCache<string, CacheEntry>;
  private indexed = false;

  constructor() {
    this.searchCache = new LRUCache<string, CacheEntry>(50, 5 * 60 * 1000);
  }

  /**
   * Build inverted index from gists
   */
  async indexGists(gists: GistRecord[]): Promise<void> {
    const startTime = performance.now();

    // Clear existing index
    this.contentIndex = {};
    this.documentFrequency = {};
    this.gistMap.clear();
    this.searchCache.clear();

    this.totalDocuments = gists.length;

    for (const gist of gists) {
      this.gistMap.set(gist.id, gist);
      this.indexGist(gist);
    }

    this.indexed = true;

    const duration = performance.now() - startTime;
    if (duration > 500) {
      console.warn(
        `[SearchEngine] Slow indexing: ${duration.toFixed(2)}ms for ${gists.length} gists`
      );
    }
  }

  /**
   * Index a single gist
   */
  private indexGist(gist: GistRecord): void {
    const tokens = new Set<string>();

    // Index description
    if (gist.description) {
      this.tokenize(gist.description).forEach((token) => tokens.add(token));
    }

    // Index filenames and content
    for (const file of Object.values(gist.files)) {
      // Index filename
      this.tokenize(file.filename).forEach((token) => tokens.add(token));

      // Index content (limit to first 10KB to prevent memory issues)
      if (file.content) {
        const contentToIndex = file.content.slice(0, 10240);
        this.tokenize(contentToIndex).forEach((token) => tokens.add(token));
      }
    }

    // Add to inverted index
    tokens.forEach((token) => {
      if (!this.contentIndex[token]) {
        this.contentIndex[token] = new Set();
        this.documentFrequency[token] = 0;
      }
      this.contentIndex[token].add(gist.id);
      this.documentFrequency[token]++;
    });
  }

  /**
   * Tokenize and normalize text
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ') // Remove special chars except hyphens
      .split(/\s+/)
      .filter((token) => token.length > 2) // Min 3 chars
      .filter((token) => !this.isStopWord(token));
  }

  /**
   * Check if token is a stop word
   */
  private isStopWord(token: string): boolean {
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'are',
      'but',
      'not',
      'you',
      'all',
      'can',
      'her',
      'was',
      'one',
      'our',
      'out',
      'day',
      'get',
      'has',
      'him',
      'his',
      'how',
      'man',
      'new',
      'now',
      'old',
      'see',
      'two',
      'way',
      'who',
      'boy',
      'did',
      'its',
      'let',
      'put',
      'say',
      'she',
      'too',
      'use',
    ]);
    return stopWords.has(token);
  }

  /**
   * Perform full-text search
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    if (!this.indexed) {
      throw new Error('[SearchEngine] Index not built. Call indexGists() first.');
    }

    const { query, filters, limit = 100, offset = 0 } = options;

    // Check cache
    const cacheKey = JSON.stringify({ query, filters, limit, offset });
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return cached.results;
    }

    const startTime = performance.now();

    // Empty query returns all gists (with filters applied)
    if (!query.trim()) {
      const allGists = Array.from(this.gistMap.values());
      const filtered = this.applyFilters(allGists, filters);
      const sorted = this.sortResults(
        filtered.map((gist) => ({ gist, score: 0, matches: [] })),
        filters?.sortBy || 'updated',
        filters?.sortOrder || 'desc'
      );
      const paginated = sorted.slice(offset, offset + limit);

      this.searchCache.set(cacheKey, {
        results: paginated,
        timestamp: Date.now(),
      });

      return paginated;
    }

    // Tokenize query
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return [];
    }

    // Find matching gists using inverted index
    const matchingGistIds = new Set<string>();
    for (const token of queryTokens) {
      const gistIds = this.contentIndex[token];
      if (gistIds) {
        gistIds.forEach((id) => matchingGistIds.add(id));
      }
    }

    // Calculate scores and extract matches
    const results: SearchResult[] = [];
    for (const gistId of matchingGistIds) {
      const gist = this.gistMap.get(gistId);
      if (!gist) continue;

      const score = this.calculateScore(gist, queryTokens);
      const matches = this.extractMatches(gist, queryTokens);

      results.push({ gist, score, matches });
    }

    // Apply filters
    const filtered = results.filter((r) => this.applyFilters([r.gist], filters).length > 0);

    // Sort by relevance or other criteria
    const sorted = this.sortResults(
      filtered,
      filters?.sortBy || 'relevance',
      filters?.sortOrder || 'desc'
    );

    // Paginate
    const paginated = sorted.slice(offset, offset + limit);

    // Cache results
    this.searchCache.set(cacheKey, {
      results: paginated,
      timestamp: Date.now(),
    });

    const duration = performance.now() - startTime;

    // Log search metrics
    this.logSearchMetrics({
      query,
      queryTime: duration,
      resultCount: paginated.length,
      totalMatches: filtered.length,
      cacheHit: false,
      indexSize: this.getStats().indexSize,
    });

    return paginated;
  }

  /**
   * Calculate TF-IDF score for a gist
   */
  private calculateScore(gist: GistRecord, queryTokens: string[]): number {
    let score = 0;

    for (const token of queryTokens) {
      // Term frequency in document
      const tf = this.getTermFrequency(gist, token);

      // Inverse document frequency
      const df = this.documentFrequency[token] || 1;
      const idf = Math.log(this.totalDocuments / df);

      score += tf * idf;
    }

    // Boost for matches in description (more important than content)
    if (gist.description) {
      const descTokens = this.tokenize(gist.description);
      const descMatches = queryTokens.filter((qt) => descTokens.includes(qt)).length;
      score += descMatches * 2;
    }

    // Boost for matches in filename
    for (const file of Object.values(gist.files)) {
      const filenameTokens = this.tokenize(file.filename);
      const filenameMatches = queryTokens.filter((qt) => filenameTokens.includes(qt)).length;
      score += filenameMatches * 1.5;
    }

    return score;
  }

  /**
   * Get term frequency for a token in a gist
   */
  private getTermFrequency(gist: GistRecord, token: string): number {
    let count = 0;

    // Count in description
    if (gist.description) {
      const tokens = this.tokenize(gist.description);
      count += tokens.filter((t) => t === token).length;
    }

    // Count in files
    for (const file of Object.values(gist.files)) {
      const filenameTokens = this.tokenize(file.filename);
      count += filenameTokens.filter((t) => t === token).length;

      if (file.content) {
        const contentTokens = this.tokenize(file.content.slice(0, 10240));
        count += contentTokens.filter((t) => t === token).length;
      }
    }

    return count;
  }

  /**
   * Extract search matches with snippets
   */
  private extractMatches(gist: GistRecord, queryTokens: string[]): SearchMatch[] {
    const matches: SearchMatch[] = [];

    // Check description
    if (gist.description) {
      const snippet = this.extractSnippet(gist.description, queryTokens);
      if (snippet) {
        matches.push({
          field: 'description',
          snippet,
        });
      }
    }

    // Check files
    for (const file of Object.values(gist.files)) {
      // Check filename
      const filenameSnippet = this.extractSnippet(file.filename, queryTokens);
      if (filenameSnippet) {
        matches.push({
          field: 'filename',
          filename: file.filename,
          snippet: filenameSnippet,
        });
      }

      // Check content
      if (file.content) {
        const contentSnippet = this.extractSnippet(file.content, queryTokens, 150);
        if (contentSnippet) {
          matches.push({
            field: 'content',
            filename: file.filename,
            snippet: contentSnippet,
          });
        }
      }
    }

    return matches.slice(0, 5); // Limit to 5 matches per gist
  }

  /**
   * Extract snippet around matching tokens
   */
  private extractSnippet(text: string, queryTokens: string[], maxLength = 100): string | null {
    const lowerText = text.toLowerCase();
    const tokens = this.tokenize(text);

    // Find first matching token position
    let matchIndex = -1;
    for (const queryToken of queryTokens) {
      matchIndex = lowerText.indexOf(queryToken);
      if (matchIndex !== -1) break;
    }

    if (matchIndex === -1) return null;

    // Extract snippet around match
    const start = Math.max(0, matchIndex - 50);
    const end = Math.min(text.length, matchIndex + maxLength);
    let snippet = text.slice(start, end);

    // Add ellipsis
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    return snippet.trim();
  }

  /**
   * Apply filters to gists
   */
  private applyFilters(gists: GistRecord[], filters?: SearchFilters): GistRecord[] {
    if (!filters) return gists;

    let filtered = gists;

    // Language filter
    if (filters.languages && filters.languages.length > 0) {
      filtered = filtered.filter((gist) => {
        const gistLanguages = Object.values(gist.files)
          .map((f) => f.language?.toLowerCase())
          .filter(Boolean);
        return filters.languages!.some((lang) => gistLanguages.includes(lang.toLowerCase()));
      });
    }

    // File type filter
    if (filters.fileTypes && filters.fileTypes.length > 0) {
      filtered = filtered.filter((gist) => {
        const gistExtensions = Object.values(gist.files)
          .map((f) => {
            const parts = f.filename.split('.');
            return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
          })
          .filter(Boolean);
        return filters.fileTypes!.some((ext) => gistExtensions.includes(ext));
      });
    }

    // Date range filter
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter((gist) => {
        const created = new Date(gist.createdAt).getTime();
        const startTime = start ? new Date(start).getTime() : 0;
        const endTime = end ? new Date(end).getTime() : Date.now();
        return created >= startTime && created <= endTime;
      });
    }

    // Public/secret filter
    if (filters.isPublic !== undefined) {
      filtered = filtered.filter((gist) => gist.public === filters.isPublic);
    }

    // Starred filter
    if (filters.isStarred) {
      filtered = filtered.filter((gist) => gist.starred);
    }

    return filtered;
  }

  /**
   * Sort search results
   */
  private sortResults(results: SearchResult[], sortBy: string, order: string): SearchResult[] {
    const sorted = [...results];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = b.score - a.score;
          break;
        case 'updated':
          comparison = new Date(b.gist.updatedAt).getTime() - new Date(a.gist.updatedAt).getTime();
          break;
        case 'created':
          comparison = new Date(b.gist.createdAt).getTime() - new Date(a.gist.createdAt).getTime();
          break;
        case 'stars':
          comparison = (b.gist.starred ? 1 : 0) - (a.gist.starred ? 1 : 0);
          break;
        default:
          comparison = 0;
      }

      return order === 'asc' ? -comparison : comparison;
    });

    return sorted;
  }

  /**
   * Update index when a gist changes
   */
  async updateGist(gist: GistRecord): Promise<void> {
    // Remove old index entries
    for (const token in this.contentIndex) {
      this.contentIndex[token].delete(gist.id);
      if (this.contentIndex[token].size === 0) {
        delete this.contentIndex[token];
        delete this.documentFrequency[token];
      }
    }

    // Re-index gist
    this.gistMap.set(gist.id, gist);
    this.indexGist(gist);

    // Clear cache
    this.searchCache.clear();
  }

  /**
   * Remove gist from index
   */
  async removeGist(gistId: string): Promise<void> {
    // Remove from inverted index
    for (const token in this.contentIndex) {
      this.contentIndex[token].delete(gistId);
      if (this.contentIndex[token].size === 0) {
        delete this.contentIndex[token];
        delete this.documentFrequency[token];
      }
    }

    this.gistMap.delete(gistId);
    this.totalDocuments--;

    // Clear cache
    this.searchCache.clear();
  }

  /**
   * Get index statistics
   */
  getStats(): {
    totalDocuments: number;
    totalTokens: number;
    indexSize: number;
    cacheSize: number;
  } {
    return {
      totalDocuments: this.totalDocuments,
      totalTokens: Object.keys(this.contentIndex).length,
      indexSize: JSON.stringify(this.contentIndex).length,
      cacheSize: this.searchCache['cache'].size,
    };
  }

  /**
   * Log search performance metrics
   */
  private logSearchMetrics(metrics: {
    query: string;
    queryTime: number;
    resultCount: number;
    totalMatches: number;
    cacheHit: boolean;
    indexSize: number;
  }): void {
    // Warn on slow queries
    if (metrics.queryTime > 100) {
      console.warn(
        `[SearchEngine] Slow query: ${metrics.queryTime.toFixed(2)}ms for "${metrics.query}"`,
        {
          resultCount: metrics.resultCount,
          totalMatches: metrics.totalMatches,
          cacheHit: metrics.cacheHit,
        }
      );
    }

    // Warn on large index size (>5MB)
    const indexSizeMB = metrics.indexSize / 1024 / 1024;
    if (indexSizeMB > 5) {
      console.warn(`[SearchEngine] Large index size: ${indexSizeMB.toFixed(2)}MB`);
    }

    // Log metrics for monitoring (can be sent to analytics in production)
    if (process.env.NODE_ENV === 'development') {
      console.debug('[SearchEngine] Metrics', {
        query: metrics.query,
        queryTime: `${metrics.queryTime.toFixed(2)}ms`,
        resultCount: metrics.resultCount,
        totalMatches: metrics.totalMatches,
        cacheHit: metrics.cacheHit,
        indexSize: `${indexSizeMB.toFixed(2)}MB`,
      });
    }
  }
}
