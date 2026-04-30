/**
 * Home Route
 * Gist list with search, filter, and sort
 */

import gistStore from '../stores/gist-store';
import { renderCard, bindCardEvents } from '../components/gist-card';
import { EmptyState } from '../components/ui/empty-state';
import { sanitizeHtml } from '../services/security';

export type Filter = 'all' | 'mine' | 'starred';
export type Sort = 'created-desc' | 'updated-desc' | 'updated-asc';

let storeUnsubscribe: (() => void) | undefined;
let searchTimeout: number | undefined;

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
        <div class="filter-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
            <div class="filter-buttons filter-chips">
              <button class="chip ${filter === 'all' ? 'active' : ''}" data-filter="all">All</button>
              <button class="chip ${filter === 'mine' ? 'active' : ''}" data-filter="mine">Mine</button>
              <button class="chip ${filter === 'starred' ? 'active' : ''}" data-filter="starred">Starred</button>
            </div>
            <select id="sort-select" class="form-input" style="width: auto; margin-bottom: 0;">
                <option value="updated-desc" ${sort === 'updated-desc' ? 'selected' : ''}>Recent</option>
                <option value="created-desc" ${sort === 'created-desc' ? 'selected' : ''}>Newest</option>
                <option value="updated-asc" ${sort === 'updated-asc' ? 'selected' : ''}>Oldest</option>
            </select>
        </div>
        <div id="gist-list" class="gist-list">
          ${renderGistList()}
        </div>
      </div>
    `;
  }

  function renderGistList(): string {
    if (gistStore.getLoading() && gistStore.getGists().length === 0) {
      return Array(3)
        .fill('')
        .map(
          () => `
        <div class="gist-card skeleton">
          <div class="loading-skeleton" style="height:20px;width:80%;margin-bottom:12px;"></div>
          <div class="loading-skeleton" style="height:14px;width:60%;margin-bottom:8px;"></div>
          <div class="loading-skeleton" style="height:12px;width:40%;"></div>
        </div>
      `
        )
        .join('');
    }

    let gists = gistStore.filterGists(
      currentFilter === 'mine' ? 'all' : (currentFilter as 'all' | 'starred')
    );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      gists = gists.filter(
        (g) =>
          g.description?.toLowerCase().includes(q) ||
          Object.values(g.files).some((f) => f.filename.toLowerCase().includes(q))
      );
    }

    // BOLT: Optimize sorting by pre-parsing timestamps
    const timestampMap = new Map<string, number>();
    const getTs = (id: string, date: string): number => {
      let ts = timestampMap.get(id);
      if (ts === undefined) {
        ts = Date.parse(date);
        timestampMap.set(id, ts);
      }
      return ts;
    };

    gists = [...gists].sort((a, b) => {
      if (currentSort === 'created-desc') {
        return getTs(b.id, b.createdAt) - getTs(a.id, a.createdAt);
      }
      if (currentSort === 'updated-desc') {
        return getTs(b.id, b.updatedAt) - getTs(a.id, a.updatedAt);
      }
      if (currentSort === 'updated-asc') {
        return getTs(a.id, a.updatedAt) - getTs(b.id, b.updatedAt);
      }
      return 0;
    });

    if (gists.length === 0) {
      if (searchQuery) {
        return EmptyState.render({
          title: 'No Matches Found',
          description: `We couldn't find any gists matching "${sanitizeHtml(searchQuery)}"`,
          icon: '🔍',
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
        icon: isStarred ? '⭐' : '📝',
        actionLabel: isStarred ? 'View All Gists' : 'Create New Gist',
        actionRoute: isStarred ? 'home' : 'create',
      });
    }

    return gists.map((g) => renderCard(g)).join('');
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

      container.querySelectorAll('.chip').forEach((b) => b.classList.remove('active'));
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
