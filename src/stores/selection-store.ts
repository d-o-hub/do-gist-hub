/**
 * Selection Store - Manages multi-select state for bulk operations
 *
 * Features:
 * - Multi-select with checkboxes
 * - Range selection (Shift+Click)
 * - Select all (Ctrl+A)
 * - Clear selection (Escape)
 * - Reactive state updates
 */

export interface SelectionState {
  selectedIds: Set<string>;
  selectionMode: boolean;
  lastSelectedId: string | null;
}

type SelectionListener = (state: SelectionState) => void;

class SelectionStore {
  private state: SelectionState = {
    selectedIds: new Set(),
    selectionMode: false,
    lastSelectedId: null,
  };

  private listeners: SelectionListener[] = [];

  /**
   * Toggle selection for a single gist
   */
  toggleSelection(id: string): void {
    if (this.state.selectedIds.has(id)) {
      this.state.selectedIds.delete(id);
    } else {
      this.state.selectedIds.add(id);
    }
    this.state.lastSelectedId = id;
    this.notifyListeners();
  }

  /**
   * Select all gists
   */
  selectAll(ids: string[]): void {
    this.state.selectedIds = new Set(ids);
    this.state.selectionMode = true;
    this.notifyListeners();
  }

  /**
   * Clear all selections
   */
  clearSelection(): void {
    this.state.selectedIds.clear();
    this.state.selectionMode = false;
    this.state.lastSelectedId = null;
    this.notifyListeners();
  }

  /**
   * Select a range of gists (Shift+Click)
   */
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

  /**
   * Toggle selection mode on/off
   */
  toggleSelectionMode(): void {
    this.state.selectionMode = !this.state.selectionMode;
    if (!this.state.selectionMode) {
      this.clearSelection();
    }
    this.notifyListeners();
  }

  /**
   * Get array of selected IDs
   */
  getSelectedIds(): string[] {
    return Array.from(this.state.selectedIds);
  }

  /**
   * Get count of selected items
   */
  getSelectedCount(): number {
    return this.state.selectedIds.size;
  }

  /**
   * Check if a gist is selected
   */
  isSelected(id: string): boolean {
    return this.state.selectedIds.has(id);
  }

  /**
   * Check if selection mode is active
   */
  isSelectionMode(): boolean {
    return this.state.selectionMode;
  }

  /**
   * Get last selected ID (for range selection)
   */
  getLastSelectedId(): string | null {
    return this.state.lastSelectedId;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: SelectionListener): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach((l) => l(this.state));
  }
}

// Singleton instance
const selectionStore = new SelectionStore();
export default selectionStore;
