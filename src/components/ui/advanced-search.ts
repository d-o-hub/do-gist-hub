/**
 * Advanced Search Component
 * Full-text search with filters, autocomplete, and saved searches
 */

import gistStore from '../../stores/gist-store';
import type { SearchFilters, SavedSearch } from '../../services/db';
import type { SearchResult } from '../../services/search/search-engine';

export class AdvancedSearch extends HTMLElement {
  private searchInput!: HTMLInputElement;
  private filterPanel!: HTMLElement;
  private historyDropdown!: HTMLElement;
  private resultsContainer!: HTMLElement;
  private searchHistory: string[] = [];
  private savedSearches: SavedSearch[] = [];
  private currentFilters: SearchFilters = {};
  private debounceTimer: number | null = null;
  private isFilterPanelOpen = false;

  connectedCallback(): void {
    this.render();
    this.attachEventListeners();
    void this.loadSearchHistory();
    void this.loadSavedSearches();
  }

  disconnectedCallback(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  private render(): void {
    this.innerHTML = `
      <div class="advanced-search">
        ${this.renderSearchBar()}
        ${this.renderFilterPanel()}
        ${this.renderHistoryDropdown()}
      </div>
    `;

    // Cache DOM references
    this.searchInput = this.querySelector('.search-input') as HTMLInputElement;
    this.filterPanel = this.querySelector('.filter-panel') as HTMLElement;
    this.historyDropdown = this.querySelector('.history-dropdown') as HTMLElement;
    this.resultsContainer = this.querySelector('.results-container') as HTMLElement;
  }

  private renderSearchBar(): string {
    return `
      <div class="search-bar">
        <div class="search-input-wrapper">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM18 18l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input
            type="text"
            class="search-input"
            placeholder="Search gists..."
            autocomplete="off"
            aria-label="Search gists"
          />
          <button class="clear-search-btn" aria-label="Clear search" style="display: none;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <button class="filter-toggle-btn" aria-label="Toggle filters" aria-expanded="false">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 6h14M6 10h8M8 14h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span class="filter-count" style="display: none;">0</span>
        </button>
      </div>
    `;
  }

  private renderFilterPanel(): string {
    const languages = this.getAvailableLanguages();
    const fileTypes = this.getAvailableFileTypes();

    return `
      <div class="filter-panel" hidden>
        <div class="filter-header">
          <h3>Filters</h3>
          <button class="clear-filters-btn">Clear All</button>
        </div>

        <div class="filter-section">
          <label class="filter-label">Language</label>
          <select class="filter-select" data-filter="language" multiple size="5">
            ${languages.map((lang) => `<option value="${lang}">${lang}</option>`).join('')}
          </select>
        </div>

        <div class="filter-section">
          <label class="filter-label">File Type</label>
          <select class="filter-select" data-filter="fileType" multiple size="5">
            ${fileTypes.map((type) => `<option value="${type}">${type}</option>`).join('')}
          </select>
        </div>

        <div class="filter-section">
          <label class="filter-label">Date Range</label>
          <div class="date-range-inputs">
            <input type="date" class="date-input" data-filter="dateStart" aria-label="Start date" />
            <span>to</span>
            <input type="date" class="date-input" data-filter="dateEnd" aria-label="End date" />
          </div>
        </div>

        <div class="filter-section">
          <label class="filter-label">Visibility</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="visibility" value="all" checked />
              <span>All</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="visibility" value="public" />
              <span>Public</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="visibility" value="secret" />
              <span>Secret</span>
            </label>
          </div>
        </div>

        <div class="filter-section">
          <label class="checkbox-label">
            <input type="checkbox" data-filter="starred" />
            <span>Starred only</span>
          </label>
        </div>

        <div class="filter-section">
          <label class="filter-label">Sort By</label>
          <select class="filter-select" data-filter="sortBy">
            <option value="relevance">Relevance</option>
            <option value="updated">Last Updated</option>
            <option value="created">Created Date</option>
            <option value="stars">Stars</option>
          </select>
        </div>

        <div class="filter-section">
          <label class="filter-label">Sort Order</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="sortOrder" value="desc" checked />
              <span>Descending</span>
            </label>
            <label class="radio-label">
              <input type="radio" name="sortOrder" value="asc" />
              <span>Ascending</span>
            </label>
          </div>
        </div>

        <div class="filter-actions">
          <button class="save-search-btn">Save Search</button>
        </div>
      </div>
    `;
  }

  private renderHistoryDropdown(): string {
    return `
      <div class="history-dropdown" hidden>
        <div class="history-section">
          <h4>Recent Searches</h4>
          <ul class="history-list">
            ${this.searchHistory.length > 0 ? this.searchHistory.map((query) => `<li class="history-item" data-query="${this.escapeHtml(query)}">${this.escapeHtml(query)}</li>`).join('') : '<li class="history-empty">No recent searches</li>'}
          </ul>
        </div>
        ${
          this.savedSearches.length > 0
            ? `
        <div class="saved-section">
          <h4>Saved Searches</h4>
          <ul class="saved-list">
            ${this.savedSearches.map((search) => `<li class="saved-item" data-id="${search.id}"><span>${this.escapeHtml(search.name)}</span><button class="delete-saved-btn" data-id="${search.id}" aria-label="Delete saved search">×</button></li>`).join('')}
          </ul>
        </div>
        `
            : ''
        }
      </div>
    `;
  }

  private attachEventListeners(): void {
    // Search input
    this.searchInput.addEventListener('input', () => this.handleSearchInput());
    this.searchInput.addEventListener('focus', () => this.showHistoryDropdown());
    this.searchInput.addEventListener('blur', () => {
      // Delay to allow click on history items
      setTimeout(() => this.hideHistoryDropdown(), 200);
    });

    // Clear search button
    const clearBtn = this.querySelector('.clear-search-btn') as HTMLButtonElement;
    clearBtn.addEventListener('click', () => this.clearSearch());

    // Filter toggle
    const filterToggle = this.querySelector('.filter-toggle-btn') as HTMLButtonElement;
    filterToggle.addEventListener('click', () => this.toggleFilterPanel());

    // Clear filters
    const clearFiltersBtn = this.querySelector('.clear-filters-btn') as HTMLButtonElement;
    clearFiltersBtn.addEventListener('click', () => this.clearFilters());

    // Filter inputs
    this.filterPanel.addEventListener('change', (e) => this.handleFilterChange(e));

    // Save search
    const saveSearchBtn = this.querySelector('.save-search-btn') as HTMLButtonElement;
    saveSearchBtn.addEventListener('click', () => this.saveCurrentSearch());

    // History items
    this.historyDropdown.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('history-item')) {
        const query = target.dataset.query;
        if (query) {
          this.searchInput.value = query;
          this.performSearch();
        }
      }
    });

    // Saved search items
    this.historyDropdown.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('saved-item')) {
        const id = target.dataset.id;
        if (id) void this.loadSavedSearch(id);
      }
      if (target.classList.contains('delete-saved-btn')) {
        e.stopPropagation();
        const id = target.dataset.id;
        if (id) void this.deleteSavedSearch(id);
      }
    });
  }

  private handleSearchInput(): void {
    const query = this.searchInput.value;

    // Show/hide clear button
    const clearBtn = this.querySelector('.clear-search-btn') as HTMLButtonElement;
    clearBtn.style.display = query ? 'block' : 'none';

    // Debounce search
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.performSearch();
    }, 300);
  }

  private async performSearch(): Promise<void> {
    const query = this.searchInput.value.trim();

    try {
      const results = await gistStore.advancedSearch({
        query,
        filters: this.currentFilters,
      });

      this.dispatchSearchEvent(results);
    } catch (err) {
      console.error('[AdvancedSearch] Search failed', err);
    }
  }

  private handleFilterChange(e: Event): void {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const filterType = target.dataset.filter;

    if (!filterType) {
      // Handle radio groups
      if (target.name === 'visibility') {
        const value = (target as HTMLInputElement).value;
        if (value === 'all') {
          delete this.currentFilters.isPublic;
        } else {
          this.currentFilters.isPublic = value === 'public';
        }
      } else if (target.name === 'sortOrder') {
        this.currentFilters.sortOrder = (target as HTMLInputElement).value as 'asc' | 'desc';
      }
    } else {
      // Handle specific filters
      switch (filterType) {
        case 'language':
          this.currentFilters.languages = Array.from(
            (target as HTMLSelectElement).selectedOptions
          ).map((opt) => opt.value);
          break;
        case 'fileType':
          this.currentFilters.fileTypes = Array.from(
            (target as HTMLSelectElement).selectedOptions
          ).map((opt) => opt.value);
          break;
        case 'dateStart':
          if (!this.currentFilters.dateRange)
            this.currentFilters.dateRange = { start: '', end: '' };
          this.currentFilters.dateRange.start = (target as HTMLInputElement).value;
          break;
        case 'dateEnd':
          if (!this.currentFilters.dateRange)
            this.currentFilters.dateRange = { start: '', end: '' };
          this.currentFilters.dateRange.end = (target as HTMLInputElement).value;
          break;
        case 'starred':
          this.currentFilters.isStarred = (target as HTMLInputElement).checked;
          break;
        case 'sortBy':
          this.currentFilters.sortBy = (target as HTMLSelectElement).value as
            | 'updated'
            | 'created'
            | 'stars'
            | 'relevance';
          break;
      }
    }

    this.updateFilterCount();
    this.performSearch();
  }

  private clearSearch(): void {
    this.searchInput.value = '';
    const clearBtn = this.querySelector('.clear-search-btn') as HTMLButtonElement;
    clearBtn.style.display = 'none';
    this.performSearch();
  }

  private clearFilters(): void {
    this.currentFilters = {};

    // Reset all filter inputs
    this.filterPanel.querySelectorAll('select').forEach((select) => {
      select.selectedIndex = -1;
    });
    this.filterPanel.querySelectorAll('input[type="date"]').forEach((input) => {
      (input as HTMLInputElement).value = '';
    });
    this.filterPanel.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      (input as HTMLInputElement).checked = false;
    });
    this.filterPanel.querySelectorAll('input[type="radio"][value="all"]').forEach((input) => {
      (input as HTMLInputElement).checked = true;
    });
    this.filterPanel.querySelectorAll('input[type="radio"][value="desc"]').forEach((input) => {
      (input as HTMLInputElement).checked = true;
    });

    this.updateFilterCount();
    this.performSearch();
  }

  private toggleFilterPanel(): void {
    this.isFilterPanelOpen = !this.isFilterPanelOpen;
    this.filterPanel.hidden = !this.isFilterPanelOpen;

    const toggleBtn = this.querySelector('.filter-toggle-btn') as HTMLButtonElement;
    toggleBtn.setAttribute('aria-expanded', String(this.isFilterPanelOpen));
  }

  private updateFilterCount(): void {
    let count = 0;
    if (this.currentFilters.languages?.length) count++;
    if (this.currentFilters.fileTypes?.length) count++;
    if (this.currentFilters.dateRange?.start || this.currentFilters.dateRange?.end) count++;
    if (this.currentFilters.isPublic !== undefined) count++;
    if (this.currentFilters.isStarred) count++;

    const countBadge = this.querySelector('.filter-count') as HTMLElement;
    if (count > 0) {
      countBadge.textContent = String(count);
      countBadge.style.display = 'block';
    } else {
      countBadge.style.display = 'none';
    }
  }

  private async loadSearchHistory(): Promise<void> {
    try {
      this.searchHistory = await gistStore.getSearchSuggestions('');
      this.updateHistoryDropdown();
    } catch (err) {
      console.error('[AdvancedSearch] Failed to load search history', err);
    }
  }

  private async loadSavedSearches(): Promise<void> {
    try {
      this.savedSearches = await gistStore.getSavedSearches();
      this.updateHistoryDropdown();
    } catch (err) {
      console.error('[AdvancedSearch] Failed to load saved searches', err);
    }
  }

  private updateHistoryDropdown(): void {
    const historyList = this.historyDropdown.querySelector('.history-list');
    if (historyList) {
      historyList.innerHTML =
        this.searchHistory.length > 0
          ? this.searchHistory
              .map(
                (query) =>
                  `<li class="history-item" data-query="${this.escapeHtml(query)}">${this.escapeHtml(query)}</li>`
              )
              .join('')
          : '<li class="history-empty">No recent searches</li>';
    }

    const savedSection = this.historyDropdown.querySelector('.saved-section');
    if (this.savedSearches.length > 0 && !savedSection) {
      const savedHtml = `
        <div class="saved-section">
          <h4>Saved Searches</h4>
          <ul class="saved-list">
            ${this.savedSearches.map((search) => `<li class="saved-item" data-id="${search.id}"><span>${this.escapeHtml(search.name)}</span><button class="delete-saved-btn" data-id="${search.id}" aria-label="Delete saved search">×</button></li>`).join('')}
          </ul>
        </div>
      `;
      this.historyDropdown.insertAdjacentHTML('beforeend', savedHtml);
    }
  }

  private showHistoryDropdown(): void {
    if (this.searchHistory.length > 0 || this.savedSearches.length > 0) {
      this.historyDropdown.hidden = false;
    }
  }

  private hideHistoryDropdown(): void {
    this.historyDropdown.hidden = true;
  }

  private async saveCurrentSearch(): Promise<void> {
    const name = prompt('Enter a name for this search:');
    if (!name) return;

    const search: SavedSearch = {
      id: `search-${Date.now()}`,
      name,
      query: this.searchInput.value,
      filters: this.currentFilters,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    try {
      const { saveSavedSearch } = await import('../../services/db');
      await saveSavedSearch(search);
      this.savedSearches.push(search);
      this.updateHistoryDropdown();
    } catch (err) {
      console.error('[AdvancedSearch] Failed to save search', err);
    }
  }

  private async loadSavedSearch(id: string): Promise<void> {
    const search = this.savedSearches.find((s) => s.id === id);
    if (!search) return;

    this.searchInput.value = search.query;
    this.currentFilters = { ...search.filters };

    // Update UI to reflect loaded filters
    // (Implementation would set all filter inputs based on currentFilters)

    await gistStore.useSavedSearch(id);
    this.performSearch();
  }

  private async deleteSavedSearch(id: string): Promise<void> {
    try {
      const { deleteSavedSearch } = await import('../../services/db');
      await deleteSavedSearch(id);
      this.savedSearches = this.savedSearches.filter((s) => s.id !== id);
      this.updateHistoryDropdown();
    } catch (err) {
      console.error('[AdvancedSearch] Failed to delete saved search', err);
    }
  }

  private dispatchSearchEvent(results: SearchResult[]): void {
    this.dispatchEvent(
      new CustomEvent('search', {
        detail: { results, query: this.searchInput.value, filters: this.currentFilters },
        bubbles: true,
      })
    );
  }

  private getAvailableLanguages(): string[] {
    const languages = new Set<string>();
    const gists = gistStore.getGists();

    for (const gist of gists) {
      for (const file of Object.values(gist.files)) {
        if (file.language) {
          languages.add(file.language);
        }
      }
    }

    return Array.from(languages).sort();
  }

  private getAvailableFileTypes(): string[] {
    const types = new Set<string>();
    const gists = gistStore.getGists();

    for (const gist of gists) {
      for (const file of Object.values(gist.files)) {
        const parts = file.filename.split('.');
        if (parts.length > 1) {
          types.add('.' + parts[parts.length - 1]);
        }
      }
    }

    return Array.from(types).sort();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('advanced-search', AdvancedSearch);
