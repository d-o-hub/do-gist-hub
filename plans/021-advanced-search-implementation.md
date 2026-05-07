# ADR-021: Advanced Search Implementation Plan

**Status**: Proposed  
**Date**: 2026-04-30  
**Context**: Sub-task for v1 feature completion - Advanced Search with offline-first full-text search

## Executive Summary

Implement comprehensive search functionality for d.o. Gist Hub with full-text content search, advanced filters, sort options, and search history. Must maintain offline-first architecture and perform efficiently with 100+ gists.

## Current State Analysis

### Existing Implementation (`src/stores/gist-store.ts`)

```typescript
searchGists(query: string): GistRecord[] {
  if (!query.trim()) return this.gists;
  const q = query.toLowerCase();
  return this.gists.filter(
    (g) =>
      g.description?.toLowerCase().includes(q) ||
      Object.values(g.files).some((f) => f.filename.toLowerCase().includes(q))
  );
}
```

**Limitations**:
- Only searches descriptions and filenames
- No file content search
- No filters (language, date, public/secret)
- No sort options
- No search history
- Case-insensitive substring match only

### IndexedDB Schema (`src/services/db.ts`)

**Existing Indexes**:
- `gists.by-updated-at` (string)
- `gists.by-starred` (boolean)
- `gists.by-sync-status` (string)

**Missing Indexes** (needed for performance):
- File content search index
- Language/file type index
- Date range index
- Public/secret index

## Implementation Plan

### Phase 1: Database Schema Enhancement (2-3 hours)

#### 1.1 Add New IndexedDB Indexes

**File**: `src/services/db.ts`

**Changes**:
```typescript
// Increment DB_VERSION to 3
const DB_VERSION = 3;

// Add to GistDBSchema interface
export interface GistDBSchema extends DBSchema {
  gists: {
    key: string;
    value: GistRecord;
    indexes: {
      'by-updated-at': string;
      'by-starred': boolean;
      'by-sync-status': string;
      'by-created-at': string;        // NEW: for date range filters
      'by-public': boolean;            // NEW: for public/secret filter
      'by-language': string;           // NEW: for language filter (multi-entry)
    };
  };
  searchHistory: {                     // NEW: search history store
    key: number;
    value: SearchHistoryEntry;
    indexes: {
      'by-timestamp': number;
      'by-query': string;
    };
  };
  savedSearches: {                     // NEW: saved searches store
    key: string;
    value: SavedSearch;
    indexes: {
      'by-created-at': number;
    };
  };
}

// Add new types
export interface SearchHistoryEntry {
  id?: number;
  query: string;
  filters: SearchFilters;
  timestamp: number;
  resultCount: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  createdAt: number;
  lastUsedAt: number;
}

export interface SearchFilters {
  languages?: string[];
  fileTypes?: string[];
  dateRange?: { start: string; end: string };
  isPublic?: boolean;
  isStarred?: boolean;
  sortBy?: 'updated' | 'created' | 'stars' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}
```

**Migration Logic**:
```typescript
if (oldVersion < 3) {
  // Add new indexes to gists store
  const gistStore = tx.objectStore('gists');
  gistStore.createIndex('by-created-at', 'createdAt');
  gistStore.createIndex('by-public', 'public');
  
  // Multi-entry index for languages (extracts from all files)
  gistStore.createIndex('by-language', 'files', {
    multiEntry: true,
    // Custom key path to extract languages from all files
  });

  // Create search history store
  const historyStore = db.createObjectStore('searchHistory', {
    keyPath: 'id',
    autoIncrement: true,
  });
  historyStore.createIndex('by-timestamp', 'timestamp');
  historyStore.createIndex('by-query', 'query');

  // Create saved searches store
  const savedStore = db.createObjectStore('savedSearches', {
    keyPath: 'id',
  });
  savedStore.createIndex('by-created-at', 'createdAt');
}
```

**New DB Functions**:
```typescript
// Search history
export async function addSearchHistory(entry: Omit<SearchHistoryEntry, 'id'>): Promise<void>;
export async function getSearchHistory(limit?: number): Promise<SearchHistoryEntry[]>;
export async function clearSearchHistory(): Promise<void>;

// Saved searches
export async function saveSavedSearch(search: SavedSearch): Promise<void>;
export async function getSavedSearches(): Promise<SavedSearch[]>;
export async function deleteSavedSearch(id: string): Promise<void>;
export async function updateSavedSearchUsage(id: string): Promise<void>;
```

**Coordination Point**: Database migration must complete before any search features are used. Add migration status check in app initialization.

---

### Phase 2: Full-Text Search Engine (4-5 hours)

#### 2.1 Create Search Service

**File**: `src/services/search/search-engine.ts` (NEW)

**Purpose**: Centralized search logic with full-text indexing

**Key Features**:
- In-memory inverted index for file content
- Tokenization and stemming (basic)
- Relevance scoring (TF-IDF lite)
- Debounced search execution
- Search result caching

**Implementation**:
```typescript
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

class SearchEngine {
  private contentIndex: Map<string, InvertedIndex> = new Map();
  private searchCache: LRUCache<string, SearchResult[]>;
  
  // Build inverted index from gist content
  async indexGists(gists: GistRecord[]): Promise<void>;
  
  // Perform full-text search with filters
  async search(options: SearchOptions): Promise<SearchResult[]>;
  
  // Tokenize and normalize text
  private tokenize(text: string): string[];
  
  // Calculate relevance score
  private calculateScore(gist: GistRecord, tokens: string[]): number;
  
  // Extract search snippets
  private extractSnippets(content: string, tokens: string[]): string[];
  
  // Apply filters
  private applyFilters(gists: GistRecord[], filters: SearchFilters): GistRecord[];
  
  // Sort results
  private sortResults(results: SearchResult[], sortBy: string, order: string): SearchResult[];
}
```

**Performance Optimizations**:
1. **Lazy Indexing**: Index content only when first searched
2. **Incremental Updates**: Update index when gists change
3. **LRU Cache**: Cache last 50 search results (5-minute TTL)
4. **Web Worker**: Move heavy indexing to background thread (v2)
5. **Debouncing**: 300ms delay for live search

**Memory Budget**:
- Index: ~2MB for 100 gists (20KB avg per gist)
- Cache: ~500KB (50 results × 10KB avg)
- Total: ~2.5MB (acceptable for v1)

---

### Phase 3: Enhanced Gist Store (2-3 hours)

#### 3.1 Extend GistStore with Advanced Search

**File**: `src/stores/gist-store.ts`

**Changes**:
```typescript
import { SearchEngine, SearchOptions, SearchResult } from '../services/search/search-engine';
import { addSearchHistory, getSearchHistory, getSavedSearches } from '../services/db';

class GistStore {
  private searchEngine: SearchEngine;
  private lastSearchResults: SearchResult[] = [];
  
  async init(): Promise<void> {
    // ... existing init code ...
    
    // Initialize search engine
    this.searchEngine = new SearchEngine();
    await this.searchEngine.indexGists(this.gists);
  }
  
  // Replace existing searchGists method
  async advancedSearch(options: SearchOptions): Promise<SearchResult[]> {
    const results = await this.searchEngine.search(options);
    this.lastSearchResults = results;
    
    // Save to search history (debounced)
    if (options.query.trim()) {
      await addSearchHistory({
        query: options.query,
        filters: options.filters || {},
        timestamp: Date.now(),
        resultCount: results.length,
      });
    }
    
    return results;
  }
  
  // Get search suggestions from history
  async getSearchSuggestions(prefix: string): Promise<string[]> {
    const history = await getSearchHistory(20);
    return history
      .filter(h => h.query.toLowerCase().startsWith(prefix.toLowerCase()))
      .map(h => h.query)
      .slice(0, 5);
  }
  
  // Get saved searches
  async getSavedSearches(): Promise<SavedSearch[]> {
    return await getSavedSearches();
  }
  
  // Update index when gists change
  private async updateSearchIndex(): Promise<void> {
    await this.searchEngine.indexGists(this.gists);
  }
  
  // Call updateSearchIndex in: loadGists, createGist, updateGist, deleteGist
}
```

**Backward Compatibility**:
- Keep `searchGists()` as wrapper to `advancedSearch()` for existing code
- Deprecate in v2

---

### Phase 4: Search UI Component (5-6 hours)

#### 4.1 Create Advanced Search Component

**File**: `src/components/ui/advanced-search.ts` (NEW)

**Features**:
- Search input with autocomplete
- Filter panel (collapsible)
- Sort dropdown
- Search history dropdown
- Saved searches management
- Result count indicator
- Clear filters button

**Component Structure**:
```typescript
export class AdvancedSearch extends HTMLElement {
  private searchInput: HTMLInputElement;
  private filterPanel: HTMLElement;
  private resultsContainer: HTMLElement;
  private searchHistory: SearchHistoryEntry[];
  private savedSearches: SavedSearch[];
  
  // Render search bar with autocomplete
  private renderSearchBar(): string;
  
  // Render filter panel
  private renderFilters(): string;
  
  // Render search history dropdown
  private renderHistory(): string;
  
  // Render saved searches
  private renderSavedSearches(): string;
  
  // Handle search input (debounced)
  private handleSearch(query: string): void;
  
  // Handle filter changes
  private handleFilterChange(filter: string, value: unknown): void;
  
  // Handle sort change
  private handleSortChange(sortBy: string, order: string): void;
  
  // Save current search
  private saveSearch(name: string): void;
  
  // Load saved search
  private loadSavedSearch(id: string): void;
  
  // Clear all filters
  private clearFilters(): void;
}
```

**Filter UI Elements**:
1. **Language Filter**: Multi-select dropdown (extracted from gist files)
2. **File Type Filter**: Multi-select dropdown (.js, .ts, .md, .py, etc.)
3. **Date Range Filter**: Date picker (start/end)
4. **Public/Secret Toggle**: Radio buttons
5. **Starred Only**: Checkbox
6. **Sort By**: Dropdown (Updated, Created, Stars, Relevance)
7. **Sort Order**: Toggle (Asc/Desc)

**Responsive Design**:
- Mobile: Filters in bottom sheet
- Desktop: Filters in sidebar panel
- Use design tokens from `public/design-tokens.css`

#### 4.2 Integrate into Home Route

**File**: `src/routes/home.ts`

**Changes**:
```typescript
import { AdvancedSearch } from '../components/ui/advanced-search';

// Replace basic search input with AdvancedSearch component
const searchComponent = new AdvancedSearch();
searchComponent.addEventListener('search', (e: CustomEvent) => {
  const { results } = e.detail;
  renderSearchResults(results);
});
```

---

### Phase 5: Search Result Display (2-3 hours)

#### 5.1 Enhanced Gist Card with Search Highlights

**File**: `src/components/gist-card.ts`

**Changes**:
```typescript
export interface GistCardProps {
  gist: GistRecord;
  searchMatch?: SearchMatch[];  // NEW: highlight search matches
}

// Add method to highlight search terms
private highlightMatches(text: string, matches: SearchMatch[]): string {
  // Wrap matched terms in <mark> tags
  // Escape HTML to prevent XSS
  // Return safe HTML string
}

// Update render to show snippets
private renderSearchSnippets(): string {
  if (!this.searchMatch?.length) return '';
  
  return this.searchMatch
    .map(match => `
      <div class="search-snippet">
        <span class="snippet-field">${match.field}</span>
        <code>${this.highlightMatches(match.snippet, [match])}</code>
      </div>
    `)
    .join('');
}
```

**CSS** (add to `src/styles/components/gist-card.css`):
```css
.search-snippet {
  margin-top: var(--spacing-2);
  padding: var(--spacing-2);
  background: var(--color-surface-secondary);
  border-radius: var(--radius-sm);
}

.search-snippet mark {
  background: var(--color-accent-yellow);
  color: var(--color-text-primary);
  padding: 0 var(--spacing-1);
}
```

---

### Phase 6: Performance Optimization (2-3 hours)

#### 6.1 Implement Virtual Scrolling for Results

**File**: `src/components/ui/virtual-list.ts` (NEW)

**Purpose**: Render only visible search results (critical for 100+ gists)

**Implementation**:
```typescript
export class VirtualList extends HTMLElement {
  private items: SearchResult[] = [];
  private itemHeight = 120; // px
  private visibleCount = 10;
  private scrollTop = 0;
  
  setItems(items: SearchResult[]): void {
    this.items = items;
    this.render();
  }
  
  private render(): void {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = startIndex + this.visibleCount;
    const visibleItems = this.items.slice(startIndex, endIndex);
    
    // Render only visible items
    // Add spacers for scrollbar accuracy
  }
  
  private handleScroll(): void {
    this.scrollTop = this.scrollTop;
    this.render();
  }
}
```

#### 6.2 Add Search Performance Metrics

**File**: `src/services/search/search-engine.ts`

**Add**:
```typescript
export interface SearchMetrics {
  queryTime: number;      // ms
  indexSize: number;      // bytes
  resultCount: number;
  cacheHit: boolean;
}

// Log metrics for performance monitoring
private logMetrics(metrics: SearchMetrics): void {
  if (metrics.queryTime > 100) {
    safeWarn('[Search] Slow query', { metrics });
  }
}
```

---

### Phase 7: Testing (4-5 hours)

#### 7.1 Unit Tests

**File**: `tests/unit/search-engine.spec.ts` (NEW)

**Test Cases**:
```typescript
describe('SearchEngine', () => {
  describe('tokenization', () => {
    it('should tokenize text correctly');
    it('should handle special characters');
    it('should normalize case');
  });
  
  describe('indexing', () => {
    it('should build inverted index');
    it('should update index incrementally');
    it('should handle large gists (>100)');
  });
  
  describe('search', () => {
    it('should find exact matches');
    it('should find partial matches');
    it('should search file content');
    it('should rank by relevance');
    it('should apply language filter');
    it('should apply date range filter');
    it('should apply public/secret filter');
    it('should sort by date');
    it('should sort by stars');
    it('should handle empty query');
    it('should handle no results');
  });
  
  describe('performance', () => {
    it('should search 100 gists in <100ms');
    it('should use cache for repeated queries');
    it('should limit memory usage');
  });
});
```

#### 7.2 Integration Tests

**File**: `tests/browser/advanced-search.spec.ts` (NEW)

**Test Cases**:
```typescript
test.describe('Advanced Search', () => {
  test('should search by description', async ({ page }) => {
    // Type in search box
    // Verify results
  });
  
  test('should search by file content', async ({ page }) => {
    // Search for code snippet
    // Verify file content matches
  });
  
  test('should filter by language', async ({ page }) => {
    // Select JavaScript filter
    // Verify only JS gists shown
  });
  
  test('should filter by date range', async ({ page }) => {
    // Set date range
    // Verify gists within range
  });
  
  test('should save search', async ({ page }) => {
    // Perform search
    // Click "Save Search"
    // Verify saved in list
  });
  
  test('should load saved search', async ({ page }) => {
    // Click saved search
    // Verify filters applied
  });
  
  test('should show search history', async ({ page }) => {
    // Perform multiple searches
    // Open history dropdown
    // Verify recent searches
  });
  
  test('should work offline', async ({ page, context }) => {
    // Load gists
    // Go offline
    // Perform search
    // Verify results
  });
});
```

#### 7.3 Performance Tests

**File**: `tests/unit/search-performance.spec.ts` (NEW)

**Benchmarks**:
```typescript
describe('Search Performance', () => {
  it('should index 100 gists in <500ms', async () => {
    const gists = generateMockGists(100);
    const start = performance.now();
    await searchEngine.indexGists(gists);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });
  
  it('should search 100 gists in <100ms', async () => {
    const start = performance.now();
    await searchEngine.search({ query: 'test' });
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
  
  it('should use <5MB memory for 100 gists', async () => {
    const before = performance.memory.usedJSHeapSize;
    await searchEngine.indexGists(generateMockGists(100));
    const after = performance.memory.usedJSHeapSize;
    const used = (after - before) / 1024 / 1024;
    expect(used).toBeLessThan(5);
  });
});
```

---

## Coordination with Gist Comments Implementation

### Shared Dependencies

1. **IndexedDB Schema**: Both features add new stores
   - **Solution**: Increment `DB_VERSION` to 3 for search, 4 for comments
   - **Coordination**: Merge migrations in single PR or sequence PRs

2. **Gist Detail Route**: Both modify `src/routes/gist-detail.ts`
   - **Solution**: Search adds filter UI, Comments adds comment section
   - **Coordination**: Work on separate branches, merge search first

3. **Performance Budget**: Both add memory/CPU overhead
   - **Solution**: Combined budget: Search (2.5MB) + Comments (1.5MB) = 4MB total
   - **Coordination**: Test together before release

### Parallel Work Strategy

**Week 1**:
- Search: Phase 1-2 (DB schema + search engine)
- Comments: Phase 1 (DB schema + API client)

**Week 2**:
- Search: Phase 3-4 (Store + UI)
- Comments: Phase 2-3 (Store + UI)

**Week 3**:
- Search: Phase 5-6 (Results + optimization)
- Comments: Phase 4-5 (Thread UI + optimization)

**Week 4**:
- Both: Testing + integration
- Merge: Search → main, then Comments → main

### Conflict Resolution

**If DB_VERSION conflicts**:
1. Rebase Comments branch on Search branch
2. Increment DB_VERSION to 4
3. Add both migrations in sequence

**If gist-detail.ts conflicts**:
1. Search adds filter bar at top
2. Comments adds comment section at bottom
3. Minimal overlap, easy merge

---

## File Changes Summary

### New Files (8)
1. `src/services/search/search-engine.ts` - Core search logic
2. `src/services/search/tokenizer.ts` - Text tokenization
3. `src/services/search/scorer.ts` - Relevance scoring
4. `src/components/ui/advanced-search.ts` - Search UI component
5. `src/components/ui/virtual-list.ts` - Virtual scrolling
6. `tests/unit/search-engine.spec.ts` - Unit tests
7. `tests/browser/advanced-search.spec.ts` - E2E tests
8. `tests/unit/search-performance.spec.ts` - Performance tests

### Modified Files (5)
1. `src/services/db.ts` - Add search stores and indexes
2. `src/stores/gist-store.ts` - Add advanced search methods
3. `src/routes/home.ts` - Integrate search component
4. `src/components/gist-card.ts` - Add search highlights
5. `src/styles/components/gist-card.css` - Search snippet styles

### Total Effort
- **Development**: 21-27 hours
- **Testing**: 4-5 hours
- **Documentation**: 2 hours
- **Total**: 27-34 hours (~1 week for 1 developer)

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Index build time | <500ms for 100 gists | `performance.now()` |
| Search query time | <100ms | `performance.now()` |
| Memory usage | <5MB for 100 gists | `performance.memory` |
| UI responsiveness | <16ms per frame | Chrome DevTools |
| Cache hit rate | >80% for repeated queries | Custom metric |

---

## Risks & Mitigations

### Risk 1: Large File Content Indexing
**Impact**: High memory usage, slow indexing
**Mitigation**: 
- Limit indexed content to first 10KB per file
- Skip binary files
- Use Web Worker for indexing (v2)

### Risk 2: Complex Filter Combinations
**Impact**: Slow query performance
**Mitigation**:
- Pre-filter by indexed fields first
- Apply content search last
- Limit results to 100 per query

### Risk 3: Search History Growth
**Impact**: IndexedDB bloat
**Mitigation**:
- Limit history to 100 entries
- Auto-delete entries >30 days old
- Add "Clear History" button

### Risk 4: Mobile Performance
**Impact**: Slow on low-end devices
**Mitigation**:
- Reduce index size on mobile
- Disable real-time search on mobile
- Use simpler tokenization

---

## Success Criteria

- [ ] Full-text search works in file content
- [ ] All filters functional (language, date, public/secret)
- [ ] Sort options work correctly
- [ ] Search history persists across sessions
- [ ] Saved searches can be created/loaded/deleted
- [ ] Search completes in <100ms for 100 gists
- [ ] Memory usage <5MB
- [ ] Works offline
- [ ] All tests pass (unit + E2E)
- [ ] No regressions in existing search
- [ ] Responsive on mobile and desktop
- [ ] Accessible (keyboard navigation, screen readers)

---

## Future Enhancements (v2)

1. **Web Worker Indexing**: Move heavy indexing to background thread
2. **Fuzzy Search**: Tolerate typos (Levenshtein distance)
3. **Regex Search**: Advanced pattern matching
4. **Search Analytics**: Track popular queries
5. **Smart Suggestions**: ML-based query suggestions
6. **Export Results**: Download search results as JSON/CSV
7. **Shared Searches**: Share saved searches via URL
8. **Search Shortcuts**: Keyboard shortcuts for filters

---

## References

- Current search: `src/stores/gist-store.ts:L88-L96`
- IndexedDB schema: `src/services/db.ts:L20-L50`
- Design tokens: `public/design-tokens.css`
- Testing strategy: `plans/011-testing-strategy.md`
- Performance budgets: `plans/010-performance-strategy.md`
