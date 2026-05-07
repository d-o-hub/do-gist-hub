# Implementation Plan: Bulk Operations Feature

**Status**: Ready for Implementation  
**Priority**: High  
**Estimated Effort**: 3-4 days  
**Dependencies**: None (standalone feature)

## Overview

Add multi-select and bulk operations to d.o. Gist Hub, enabling users to perform actions on multiple gists simultaneously. This feature must maintain offline-first principles, optimistic UI patterns, and graceful error handling consistent with existing architecture.

## Goals

1. Enable selection of multiple gists via checkboxes and keyboard shortcuts
2. Implement bulk delete, star/unstar, export, and tag operations
3. Handle partial failures gracefully with detailed feedback
4. Provide undo functionality for destructive operations
5. Maintain offline-first sync queue integration
6. Ensure accessibility and mobile-friendly UX

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Bulk Operations Layer                   │
├─────────────────────────────────────────────────────────────┤
│  Selection State  │  Bulk Actions  │  Undo Stack  │  UI     │
│  (SelectionStore) │  (BulkService) │  (History)   │ (Toolbar)│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Existing Architecture                     │
├─────────────────────────────────────────────────────────────┤
│  GistStore  │  SyncQueue  │  IndexedDB  │  GitHub API       │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Selection Infrastructure (Day 1)

#### 1.1 Create Selection Store

**File**: `src/stores/selection-store.ts`

```typescript
interface SelectionState {
  selectedIds: Set<string>;
  selectionMode: boolean;
  lastSelectedId: string | null;
}

class SelectionStore {
  private state: SelectionState = {
    selectedIds: new Set(),
    selectionMode: false,
    lastSelectedId: null,
  };
  private listeners: Array<(state: SelectionState) => void> = [];
  
  toggleSelection(id: string): void {
    if (this.state.selectedIds.has(id)) {
      this.state.selectedIds.delete(id);
    } else {
      this.state.selectedIds.add(id);
    }
    this.state.lastSelectedId = id;
    this.notifyListeners();
  }
  
  selectAll(ids: string[]): void {
    this.state.selectedIds = new Set(ids);
    this.state.selectionMode = true;
    this.notifyListeners();
  }
  
  clearSelection(): void {
    this.state.selectedIds.clear();
    this.state.selectionMode = false;
    this.state.lastSelectedId = null;
    this.notifyListeners();
  }
  
  selectRange(fromId: string, toId: string, allIds: string[]): void {
    const fromIndex = allIds.indexOf(fromId);
    const toIndex = allIds.indexOf(toId);
    
    if (fromIndex === -1 || toIndex === -1) return;
    
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    
    for (let i = start; i <= end; i++) {
      this.state.selectedIds.add(allIds[i]);
    }
    
    this.state.selectionMode = true;
    this.notifyListeners();
  }
  
  toggleSelectionMode(): void {
    this.state.selectionMode = !this.state.selectionMode;
    if (!this.state.selectionMode) {
      this.clearSelection();
    }
    this.notifyListeners();
  }
  
  getSelectedIds(): string[] {
    return Array.from(this.state.selectedIds);
  }
  
  getSelectedCount(): number {
    return this.state.selectedIds.size;
  }
  
  isSelected(id: string): boolean {
    return this.state.selectedIds.has(id);
  }
  
  isSelectionMode(): boolean {
    return this.state.selectionMode;
  }
  
  getLastSelectedId(): string | null {
    return this.state.lastSelectedId;
  }
  
  subscribe(listener: (state: SelectionState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.state));
  }
}

const selectionStore = new SelectionStore();
export default selectionStore;
```

**Testing**:
- Unit tests for all selection operations
- Edge cases: empty selection, single item, all items
- Range selection with various start/end positions

#### 1.2 Update Gist Card Component

**File**: `src/components/gist-card.ts`

Add to existing code:

```typescript
export function renderCard(gist: GistRecord, options?: {
  selectionMode?: boolean;
  isSelected?: boolean;
}): string {
  const { selectionMode = false, isSelected = false } = options || {};
  
  const fileCount = Object.keys(gist.files).length;
  const firstFile = Object.values(gist.files)[0];
  const language = firstFile?.language || 'TEXT';
  const description = gist.description || 'UNTITLED GIST';
  const content = firstFile?.content || '';
  const snippet = content.slice(0, 120);

  return `
    <article class="glass-card gist-card ${isSelected ? 'selected' : ''}" 
             data-gist-id="${sanitizeHtml(gist.id)}" 
             data-testid="gist-item" 
             tabindex="0" 
             role="button"
             aria-label="Open gist: ${sanitizeHtml(description)}">
      ${selectionMode ? `
        <div class="gist-card-checkbox">
          <input type="checkbox" 
                 class="selection-checkbox" 
                 data-id="${sanitizeHtml(gist.id)}"
                 ${isSelected ? 'checked' : ''}
                 aria-label="Select gist"
                 tabindex="0">
        </div>
      ` : ''}
      <div class="gist-card-header">
        <div class="gist-card-meta">
          <span class="micro-label">${sanitizeHtml(language.toUpperCase())}</span>
          <h2 class="gist-card-title">${sanitizeHtml(description)}</h2>
        </div>
        <div class="gist-card-stat">
          <span class="stat-number">${fileCount}</span>
          <span class="micro-label">FILES</span>
        </div>
      </div>
      <div class="gist-card-preview">
        <pre class="gist-preview-code"><code>${sanitizeHtml(snippet)}</code></pre>
      </div>
      <footer class="gist-card-actions">
        <div class="action-group">
          <button class="gist-action-btn star-btn" data-id="${sanitizeHtml(gist.id)}"
                  aria-label="${gist.starred ? 'Unstar' : 'Star'} gist"
                  aria-pressed="${gist.starred}">
            ${gist.starred ? '★' : '☆'}
            <span class="micro-label">${gist.starred ? 'STARRED' : 'STAR'}</span>
          </button>
          <button class="gist-action-btn delete-btn" data-id="${sanitizeHtml(gist.id)}" 
                  aria-label="Delete gist">
            <span class="micro-label">DELETE</span>
          </button>
        </div>
        <time class="micro-label" datetime="${gist.updatedAt}">
          ${formatRelativeTime(gist.updatedAt)}
        </time>
      </footer>
    </article>
  `;
}
```

**CSS Updates** (`src/styles/components/gist-card.css`):

```css
.gist-card {
  position: relative;
  transition: var(--transition-base);
}

.gist-card.selected {
  border-color: var(--color-primary);
  background: var(--color-surface-selected, rgba(var(--color-primary-rgb), 0.1));
  box-shadow: 0 0 0 2px var(--color-primary);
}

.gist-card-checkbox {
  position: absolute;
  top: var(--spacing-3);
  left: var(--spacing-3);
  z-index: 2;
}

.selection-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

/* Prevent card click when checkbox is clicked */
.gist-card.selection-mode {
  cursor: default;
}

@media (max-width: 768px) {
  .gist-card-checkbox {
    top: var(--spacing-2);
    left: var(--spacing-2);
  }
  
  .selection-checkbox {
    width: 24px;
    height: 24px;
  }
}
```

#### 1.3 Update Home Route

**File**: `src/routes/home.ts`

Add imports and modify render function:

```typescript
import selectionStore from '../stores/selection-store';

let selectionUnsubscribe: (() => void) | undefined;

export function render(container: HTMLElement, params?: Record<string, string>): void {
  storeUnsubscribe?.();
  selectionUnsubscribe?.();

  // ... existing setup ...

  selectionUnsubscribe = selectionStore.subscribe(() => {
    if (document.contains(container)) {
      updateList();
    }
  });

  bindSelectionEvents();
  bindKeyboardShortcuts();
}

function renderGistList(): string {
  // ... existing loading and filtering logic ...
  
  const selectionMode = selectionStore.isSelectionMode();
  
  return gists.map((g) => renderCard(g, {
    selectionMode,
    isSelected: selectionStore.isSelected(g.id),
  })).join('');
}

function bindSelectionEvents(): void {
  container.addEventListener('change', (e) => {
    const checkbox = (e.target as HTMLElement).closest('.selection-checkbox') as HTMLInputElement;
    if (checkbox) {
      e.stopPropagation();
      const id = checkbox.dataset.id;
      if (id) {
        if ((e as any).shiftKey) {
          const lastId = selectionStore.getLastSelectedId();
          if (lastId) {
            const allIds = gistStore.getGists().map(g => g.id);
            selectionStore.selectRange(lastId, id, allIds);
          } else {
            selectionStore.toggleSelection(id);
          }
        } else {
          selectionStore.toggleSelection(id);
        }
      }
    }
  });
  
  // Prevent card navigation when in selection mode
  container.addEventListener('click', (e) => {
    if (selectionStore.isSelectionMode()) {
      const card = (e.target as HTMLElement).closest('.gist-card');
      if (card && !(e.target as HTMLElement).closest('.gist-card-actions')) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });
}

function bindKeyboardShortcuts(): void {
  const handler = (e: KeyboardEvent) => {
    if (!selectionStore.isSelectionMode()) return;
    
    // Ctrl+A / Cmd+A: Select all
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      const allIds = gistStore.getGists().map(g => g.id);
      selectionStore.selectAll(allIds);
    }
    
    // Escape: Clear selection
    if (e.key === 'Escape') {
      selectionStore.clearSelection();
    }
  };
  
  container.addEventListener('keydown', handler);
}
```

### Phase 2: Bulk Action Toolbar (Day 1-2)

#### 2.1 Create Bulk Toolbar Component

**File**: `src/components/bulk-toolbar.ts`

```typescript
import { sanitizeHtml } from '../services/security/dom';

export interface BulkToolbarOptions {
  selectedCount: number;
}

export function renderBulkToolbar(options: BulkToolbarOptions): string {
  const { selectedCount } = options;
  
  return `
    <div class="bulk-toolbar" role="toolbar" aria-label="Bulk actions">
      <div class="bulk-toolbar-info">
        <span class="selected-count">${selectedCount} selected</span>
        <button class="btn-text" data-action="clear-selection" aria-label="Clear selection">
          Clear
        </button>
      </div>
      
      <div class="bulk-toolbar-actions">
        <button class="btn-icon" data-action="bulk-star" 
                aria-label="Star selected gists" title="Star">
          <span aria-hidden="true">☆</span>
          <span class="sr-only">Star</span>
        </button>
        <button class="btn-icon" data-action="bulk-unstar"
                aria-label="Unstar selected gists" title="Unstar">
          <span aria-hidden="true">★</span>
          <span class="sr-only">Unstar</span>
        </button>
        <button class="btn-icon" data-action="bulk-export"
                aria-label="Export selected gists" title="Export">
          <span aria-hidden="true">⬇</span>
          <span class="sr-only">Export</span>
        </button>
        <button class="btn-icon" data-action="bulk-tag"
                aria-label="Tag selected gists" title="Tag">
          <span aria-hidden="true">🏷</span>
          <span class="sr-only">Tag</span>
        </button>
        <button class="btn-icon btn-danger" data-action="bulk-delete"
                aria-label="Delete selected gists" title="Delete">
          <span aria-hidden="true">🗑</span>
          <span class="sr-only">Delete</span>
        </button>
      </div>
    </div>
  `;
}

export function bindBulkToolbarEvents(
  container: HTMLElement,
  handlers: {
    onDelete: () => void;
    onStar: () => void;
    onUnstar: () => void;
    onExport: () => void;
    onTag: () => void;
    onClearSelection: () => void;
  }
): void {
  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLElement;
    
    if (!button) return;
    
    const action = button.dataset.action;
    
    switch (action) {
      case 'bulk-delete':
        handlers.onDelete();
        break;
      case 'bulk-star':
        handlers.onStar();
        break;
      case 'bulk-unstar':
        handlers.onUnstar();
        break;
      case 'bulk-export':
        handlers.onExport();
        break;
      case 'bulk-tag':
        handlers.onTag();
        break;
      case 'clear-selection':
        handlers.onClearSelection();
        break;
    }
  });
}
```

**CSS** (`src/styles/components/bulk-toolbar.css`):

```css
.bulk-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-surface-elevated);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(10px);
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.bulk-toolbar-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.selected-count {
  font-weight: 600;
  color: var(--color-primary);
  font-size: var(--font-size-base);
}

.bulk-toolbar-actions {
  display: flex;
  gap: var(--spacing-2);
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: var(--transition-base);
}

.btn-icon:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.btn-icon:active {
  transform: scale(0.95);
}

.btn-icon.btn-danger:hover {
  background: var(--color-error);
  border-color: var(--color-error);
  color: white;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

@media (max-width: 768px) {
  .bulk-toolbar {
    flex-direction: column;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
  }
  
  .bulk-toolbar-info {
    width: 100%;
    justify-content: space-between;
  }
  
  .bulk-toolbar-actions {
    width: 100%;
    justify-content: space-around;
  }
  
  .btn-icon {
    flex: 1;
    max-width: 60px;
  }
}
```

#### 2.2 Integrate Toolbar into Home Route

Update `src/routes/home.ts`:

```typescript
import { renderBulkToolbar, bindBulkToolbarEvents } from '../components/bulk-toolbar';

function getHomeHtml(filter: Filter, sort: Sort, query: string): string {
  const selectedCount = selectionStore.getSelectedCount();
  const showToolbar = selectedCount > 0;
  const selectionMode = selectionStore.isSelectionMode();
  
  return `
    <div class="route-home">
      ${showToolbar ? renderBulkToolbar({ selectedCount }) : ''}
      
      <div class="search-container">
        <input type="text" id="gist-search" class="search-input" 
               placeholder="Search gists..." value="${sanitizeHtml(query)}">
      </div>
      
      <div class="filter-header">
        <div class="filter-buttons filter-chips">
          <button class="chip ${filter === 'all' ? 'active' : ''}" data-filter="all">All</button>
          <button class="chip ${filter === 'mine' ? 'active' : ''}" data-filter="mine">Mine</button>
          <button class="chip ${filter === 'starred' ? 'active' : ''}" data-filter="starred">Starred</button>
        </div>
        
        <div class="filter-actions">
          <button class="btn-text" data-action="toggle-selection-mode">
            ${selectionMode ? 'Cancel' : 'Select'}
          </button>
          <select id="sort-select" class="form-input">
            <option value="updated-desc" ${sort === 'updated-desc' ? 'selected' : ''}>Recent</option>
            <option value="created-desc" ${sort === 'created-desc' ? 'selected' : ''}>Newest</option>
            <option value="updated-asc" ${sort === 'updated-asc' ? 'selected' : ''}>Oldest</option>
          </select>
        </div>
      </div>
      
      <div id="gist-list" class="gist-list">
        ${renderGistList()}
      </div>
    </div>
  `;
}

function bindEvents(): void {
  // ... existing event bindings ...
  
  // Toggle selection mode
  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-action="toggle-selection-mode"]')) {
      selectionStore.toggleSelectionMode();
    }
  });
  
  // Bind bulk toolbar events
  if (selectionStore.getSelectedCount() > 0) {
    bindBulkToolbarEvents(container, {
      onDelete: () => void handleBulkDelete(),
      onStar: () => void handleBulkStar(),
      onUnstar: () => void handleBulkUnstar(),
      onExport: () => void handleBulkExport(),
      onTag: () => void handleBulkTag(),
      onClearSelection: () => selectionStore.clearSelection(),
    });
  }
}
```

### Phase 3: Bulk Operations Service (Day 2)

#### 3.1 Create Bulk Operations Service

**File**: `src/services/bulk-operations.ts`

```typescript
import { GistRecord } from './db';
import gistStore from '../stores/gist-store';
import { exportSelectedGists } from './export-import';
import { toast } from '../components/ui/toast';
import { safeError } from './security/logger';

export interface BulkOperationResult {
  success: string[];
  failed: Array<{ id: string; error: string }>;
  total: number;
}

export interface UndoOperation {
  type: 'delete' | 'star' | 'unstar' | 'tag';
  gists: GistRecord[];
  timestamp: number;
}

class BulkOperationsService {
  private undoStack: UndoOperation[] = [];
  private readonly MAX_UNDO_STACK = 10;
  private readonly RATE_LIMIT_DELAY = 100; // ms between operations
  
  /**
   * Delete multiple gists with rollback support
   */
  async bulkDelete(ids: string[]): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: [],
      failed: [],
      total: ids.length,
    };
    
    // Store gists for undo
    const gistsToDelete = ids
      .map(id => gistStore.getGist(id))
      .filter((g): g is GistRecord => g !== undefined);
    
    this.pushUndo({
      type: 'delete',
      gists: gistsToDelete,
      timestamp: Date.now(),
    });
    
    // Process deletions sequentially to avoid rate limits
    for (const id of ids) {
      try {
        const success = await gistStore.deleteGist(id);
        if (success) {
          result.success.push(id);
        } else {
          result.failed.push({ id, error: 'Delete operation failed' });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.failed.push({ id, error: message });
        safeError(`[BulkOps] Delete failed for ${id}`, err);
      }
      
      // Small delay to avoid rate limiting
      if (result.success.length + result.failed.length < ids.length) {
        await this.delay(this.RATE_LIMIT_DELAY);
      }
    }
    
    return result;
  }
  
  /**
   * Star multiple gists
   */
  async bulkStar(ids: string[]): Promise<BulkOperationResult> {
    return this.bulkToggleStar(ids, true);
  }
  
  /**
   * Unstar multiple gists
   */
  async bulkUnstar(ids: string[]): Promise<BulkOperationResult> {
    return this.bulkToggleStar(ids, false);
  }
  
  private async bulkToggleStar(
    ids: string[], 
    shouldStar: boolean
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: [],
      failed: [],
      total: ids.length,
    };
    
    // Store original state for undo
    const gistsToModify = ids
      .map(id => gistStore.getGist(id))
      .filter((g): g is GistRecord => g !== undefined);
    
    this.pushUndo({
      type: shouldStar ? 'star' : 'unstar',
      gists: gistsToModify,
      timestamp: Date.now(),
    });
    
    for (const id of ids) {
      try {
        const gist = gistStore.getGist(id);
        if (!gist) {
          result.failed.push({ id, error: 'Gist not found' });
          continue;
        }
        
        // Only toggle if needed
        if (gist.starred === shouldStar) {
          result.success.push(id);
          continue;
        }
        
        const success = await gistStore.toggleStar(id);
        if (success) {
          result.success.push(id);
        } else {
          result.failed.push({ id, error: 'Star operation failed' });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.failed.push({ id, error: message });
        safeError(`[BulkOps] Star failed for ${id}`, err);
      }
      
      if (result.success.length + result.failed.length < ids.length) {
        await this.delay(this.RATE_LIMIT_DELAY);
      }
    }
    
    return result;
  }
  
  /**
   * Export multiple gists to JSON
   */
  async bulkExport(ids: string[]): Promise<void> {
    try {
      const blob = await exportSelectedGists(ids);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gists-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${ids.length} gist${ids.length > 1 ? 's' : ''}`);
    } catch (err) {
      toast.error('Export failed');
      safeError('[BulkOps] Export failed', err);
      throw err;
    }
  }
  
  /**
   * Add tags to multiple gists (local-only, stored in IndexedDB)
   */
  async bulkTag(ids: string[], tags: string[]): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: [],
      failed: [],
      total: ids.length,
    };
    
    // Note: Tag functionality requires extending GistRecord schema
    // This is a placeholder for the tag implementation
    
    for (const id of ids) {
      try {
        // TODO: Implement tag storage in IndexedDB
        // await tagService.addTags(id, tags);
        result.success.push(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.failed.push({ id, error: message });
        safeError(`[BulkOps] Tag failed for ${id}`, err);
      }
    }
    
    return result;
  }
  
  /**
   * Undo last bulk operation
   */
  async undo(): Promise<boolean> {
    const operation = this.undoStack.pop();
    if (!operation) return false;
    
    try {
      switch (operation.type) {
        case 'delete':
          // Restore deleted gists - requires re-sync from GitHub
          toast.info('Undo delete: Re-sync from GitHub to restore gists');
          break;
          
        case 'star':
        case 'unstar':
          // Toggle star state back
          for (const gist of operation.gists) {
            await gistStore.toggleStar(gist.id);
            await this.delay(this.RATE_LIMIT_DELAY);
          }
          toast.success('Undo successful');
          break;
          
        case 'tag':
          // Remove tags
          // TODO: Implement tag removal
          toast.success('Undo successful');
          break;
      }
      
      return true;
    } catch (err) {
      toast.error('Undo failed');
      safeError('[BulkOps] Undo failed', err);
      return false;
    }
  }
  
  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  /**
   * Get last operation for display
   */
  getLastOperation(): UndoOperation | null {
    return this.undoStack[this.undoStack.length - 1] || null;
  }
  
  /**
   * Clear undo stack
   */
  clearUndoStack(): void {
    this.undoStack = [];
  }
  
  private pushUndo(operation: UndoOperation): void {
    this.undoStack.push(operation);
    if (this.undoStack.length > this.MAX_UNDO_STACK) {
      this.undoStack.shift();
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const bulkOperations = new BulkOperationsService();
```

#### 3.2 Implement Bulk Action Handlers

Add to `src/routes/home.ts`:

```typescript
import { bulkOperations } from '../services/bulk-operations';
import { showConfirmDialog } from '../utils/dialog';

async function handleBulkDelete(): Promise<void> {
  const selectedIds = selectionStore