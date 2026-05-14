/**
 * Home Route
 * Gist list with search, filter, and sort
 */

import { bindCardEvents, renderCard } from '../components/gist-card';
import { EmptyState } from '../components/ui/empty-state';
import { Skeleton } from '../components/ui/skeleton';
import { sanitizeHtml } from '../services/security';
import gistStore from '../stores/gist-store';

export type Filter = 'all' | 'mine' | 'starred';
export type Sort = 'created-desc' | 'updated-desc' | 'updated-asc';

let storeUnsubscribe: (() => void) | undefined;
let searchTimeout: number | undefined;

// BOLT: Module-scope cache for parsed timestamps to improve sorting performance across renders
const timestampCache = new Map<string, number>();

export function render(container: HTMLElement, params?: Record<string, string>): void {
  storeUnsubscribe?.();

  let currentFilter = (params?.filter as Filter) || 'all';
  let currentSort = (params?.sort as Sort) || 'updated-desc';
  let searchQuery = params?.searchQuery || '';

  container.innerHTML = getHomeHtml(currentFilter, currentSort, searchQuery);
  updateList();

  storeUnsubscribe = gistStore.subscribe(() => {
    if (document.contains(container)) {
      updateList();
    }
  });

  bindEvents();

  function getHomeHtml(filter: Filter, sort: Sort, query: string): string {
    return `
      <div class="route-home">
        <div class="search-container">
          <input type="text" id="gist-search" class="search-input" placeholder="Search gists..." value="${sanitizeHtml(query)}">
        </div>
        <div class="filter-header flex-between mb-4">
            <div class="filter-buttons filter-chips">
              <button class="chip ${filter === 'all' ? 'active' : ''}" data-filter="all">All</button>
              <button class="chip ${filter === 'mine' ? 'active' : ''}" data-filter="mine">Mine</button>
              <button class="chip ${filter === 'starred' ? 'active' : ''}" data-filter="starred">Starred</button>
            </div>
            <select id="sort-select" class="form-input w-auto mb-0">
                <option value="updated-desc" ${sort === 'updated-desc' ? 'selected' : ''}>Recent</option>
                <option value="created-desc" ${sort === 'created-desc' ? 'selected' : ''}>Newest</option>
                <option value="updated-asc" ${sort === 'updated-asc' ? 'selected' : ''}>Oldest</option>
            </select>
        </div>
        <div id="gist-list" class="gist-list gist-grid">
          ${renderGistList()}
        </div>
      </div>
    `;
  }

  function renderGistList(): string {
    if (gistStore.getLoading() && gistStore.getGists().length === 0) {
      return Skeleton.renderList(3);
    }

    let gists = gistStore.filterGists(
      currentFilter === 'mine' ? 'all' : (currentFilter as 'all' | 'starred')
    );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      gists = gists.filter((g) => {
        if (g.description?.toLowerCase().includes(q)) return true;
        // BOLT: Efficient file search avoiding Object.values() array allocation
        for (const filename in g.files) {
          if (filename.toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }

    // BOLT: Optimize by skipping sorting when the order matches the store's natural order (updated-desc).
    // The store already maintains gists sorted by updatedAt descending.
    if (currentSort !== 'updated-desc' || searchQuery) {
      gists = [...gists].sort((a, b) => {
        if (currentSort === 'created-desc') {
          return getTs(b.createdAt) - getTs(a.createdAt);
        }
        if (currentSort === 'updated-desc') {
          return getTs(b.updatedAt) - getTs(a.updatedAt);
        }
        if (currentSort === 'updated-asc') {
          return getTs(a.updatedAt) - getTs(b.updatedAt);
        }
        return 0;
      });
    }

    if (gists.length === 0) {
      if (searchQuery) {
        return EmptyState.render({
          title: 'No Matches Found',
          description: `We couldn't find any gists matching "${sanitizeHtml(searchQuery)}"`,
          actionLabel: 'Clear Search',
          actionType: 'clear-search',
        });
      }

      const isStarred = currentFilter === 'starred';
      return EmptyState.render({
        title: isStarred ? 'No Starred Gists' : 'No Gists Found',
        description: isStarred
          ? "You haven't starred any gists yet"
          : 'Start by creating your first gist or syncing from GitHub',
        actionLabel: isStarred ? 'View All Gists' : 'Create New Gist',
        actionRoute: isStarred ? 'home' : 'create',
      });
    }

    return gists.map((g) => renderCard(g)).join('');
  }

  /**
   * Get numeric timestamp from date string, with module-level caching.
   * BOLT: Consolidate timestamp parsing logic for O(N) instead of O(N log N).
   */
  function getTs(dateStr: string): number {
    let ts = timestampCache.get(dateStr);
    if (ts === undefined) {
      ts = Date.parse(dateStr);
      timestampCache.set(dateStr, ts);
    }
    return ts;
  }

  function updateList(): void {
    const list = container.querySelector('#gist-list');
    if (list) {
      list.innerHTML = renderGistList();
      bindCardEvents(list as HTMLElement, (id: string) => {
        window.dispatchEvent(
          new CustomEvent('app:navigate', {
            detail: { route: 'detail', params: { gistId: id } },
          })
        );
      });
    }
  }

  function bindEvents(): void {
    const searchInput = container.querySelector('#gist-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const val = (e.target as HTMLInputElement).value;
        searchTimeout = window.setTimeout(() => {
          searchQuery = val;
          updateList();
        }, 300);
      });
    }

    container.querySelector('.filter-chips')?.addEventListener('click', (e) => {
      const chip = (e.target as HTMLElement).closest('.chip') as HTMLElement;
      if (!chip) return;

      for (const b of container.querySelectorAll('.chip')) {
        b.classList.remove('active');
      }
      chip.classList.add('active');
      currentFilter = (chip.dataset.filter as Filter) || 'all';
      updateList();
    });

    container.querySelector('#sort-select')?.addEventListener('change', (e) => {
      currentSort = (e.target as HTMLSelectElement).value as Sort;
      window.dispatchEvent(new CustomEvent('app:sort-changed', { detail: { sort: currentSort } }));
      updateList();
    });

    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const actionBtn = target.closest('[data-action="clear-search"]') as HTMLElement;
      if (actionBtn) {
        searchQuery = '';
        const input = container.querySelector('#gist-search') as HTMLInputElement;
        if (input) input.value = '';
        updateList();
      }
    });
  }
}
