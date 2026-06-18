/**
 * Home Route
 * Gist list with search, filter, and sort
 */

import { bindCardEvents, renderCard } from '../components/gist-card';
import { EmptyState } from '../components/ui/empty-state';
import { Skeleton } from '../components/ui/skeleton';
import { lifecycle } from '../services/lifecycle';
import gistStore from '../stores/gist-store';
import { parseIsoDate } from '../utils/date';

export type Filter = 'all' | 'mine' | 'starred';
export type Sort = 'created-desc' | 'updated-desc' | 'updated-asc';

let searchTimeout: number | undefined;

export function render(container: HTMLElement, params?: Record<string, string>): void {
  const signal = lifecycle.getRouteSignal();

  // State must be declared before subscribe() because the callback fires synchronously
  // and accesses these variables. If declared after, they're in the Temporal Dead Zone.
  let currentFilter = (params?.filter as Filter) || 'all';
  let currentSort = (params?.sort as Sort) || 'updated-desc';
  let searchQuery = params?.searchQuery || '';

  const unsubscribe = gistStore.subscribe(() => {
    if (document.contains(container)) {
      updateList();
    }
  });
  lifecycle.onRouteCleanup(() => unsubscribe());

  buildHomeShell(currentFilter, currentSort, searchQuery, container);
  updateList();

  // After the first successful render, mark the list as arrived so
  // subsequent re-renders (filter / sort / search) don't re-trigger
  // the entrance animation. The CSS keyframe `card-enter` is suppressed
  // for [data-arrived="true"] children. This keeps the choreographed
  // reveal as a one-time arrival signal.
  requestAnimationFrame(() => {
    const list = container.querySelector('#gist-list');
    if (list) (list as HTMLElement).dataset.arrived = 'true';
  });

  bindEvents(signal);

  function buildHomeShell(filter: Filter, sort: Sort, query: string, target: HTMLElement): void {
    target.replaceChildren();

    const routeHome = document.createElement('div');
    routeHome.className = 'route-home';

    // Search container
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'gist-search';
    searchInput.className = 'search-input';
    searchInput.placeholder = 'Search gists...';
    searchInput.value = query;
    searchInput.setAttribute('aria-label', 'Search gists');
    searchContainer.appendChild(searchInput);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.id = 'gist-search-clear';
    clearBtn.className = 'search-clear-btn';
    clearBtn.setAttribute('aria-label', 'Clear search');
    // Use aria-hidden + tabindex to hide from AT/keyboard without
    // removing the element from layout, so the opacity/transform
    // transition can play (display:none cannot transition).
    const initiallyEmpty = query.length === 0;
    if (initiallyEmpty) {
      clearBtn.setAttribute('aria-hidden', 'true');
      clearBtn.tabIndex = -1;
    }
    clearBtn.textContent = '×';
    searchContainer.appendChild(clearBtn);
    routeHome.appendChild(searchContainer);

    // Filter header
    const filterHeader = document.createElement('div');
    filterHeader.className = 'filter-header flex-between mb-4';

    const filterButtons = document.createElement('div');
    filterButtons.className = 'filter-buttons filter-chips';
    for (const f of ['all', 'mine', 'starred'] as const) {
      const chip = document.createElement('button');
      chip.className = `chip${filter === f ? ' active' : ''}`;
      chip.dataset.filter = f;
      chip.textContent = f === 'all' ? 'All' : f === 'mine' ? 'Mine' : 'Starred';
      filterButtons.appendChild(chip);
    }
    filterHeader.appendChild(filterButtons);

    const sortSelect = document.createElement('select');
    sortSelect.id = 'sort-select';
    sortSelect.className = 'form-input w-auto mb-0';
    for (const [value, label] of [
      ['updated-desc', 'Recent'],
      ['created-desc', 'Newest'],
      ['updated-asc', 'Oldest'],
    ] as const) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      if (sort === value) option.selected = true;
      sortSelect.appendChild(option);
    }
    filterHeader.appendChild(sortSelect);
    routeHome.appendChild(filterHeader);

    // Gist list placeholder (populated by updateList)
    const gistList = document.createElement('div');
    gistList.id = 'gist-list';
    gistList.className = 'gist-list gist-grid';
    routeHome.appendChild(gistList);

    // Result count: visible summary + screen-reader-only live region.
    // The visible count tells the user "X gists" at a glance; the
    // live region announces the same value to AT when the list
    // changes (filter, sort, search). Both use the same element id.
    const resultCount = document.createElement('p');
    resultCount.id = 'gist-result-count';
    resultCount.className = 'result-count micro-label';
    resultCount.setAttribute('aria-live', 'polite');
    resultCount.setAttribute('aria-atomic', 'true');
    routeHome.appendChild(resultCount);

    target.appendChild(routeHome);
  }

  /**
   * Update the gist list and result count.
   * BOLT: Consolidated filtering, searching, sorting, and rendering into a single
   * pass to eliminate redundant O(N) iterations and function overhead.
   */
  function updateList(): void {
    const list = container.querySelector('#gist-list') as HTMLElement | null;
    const countEl = container.querySelector('#gist-result-count') as HTMLElement | null;

    if (!list) return;

    // Loading state
    if (gistStore.getLoading() && gistStore.getGists().length === 0) {
      list.innerHTML = Skeleton.renderList(3);
      if (countEl) countEl.textContent = 'Loading gists...';
      return;
    }

    // 1. Initial filter
    let gists = gistStore.filterGists(
      currentFilter === 'mine' ? 'all' : (currentFilter as 'all' | 'starred')
    );

    // 2. Search filter
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

    const filteredCount = gists.length;
    const totalCount = gistStore.getGists().length;

    // 3. Update result count
    if (countEl) {
      countEl.textContent =
        filteredCount === totalCount
          ? `${totalCount} gist${totalCount === 1 ? '' : 's'}`
          : `${filteredCount} of ${totalCount} gist${totalCount === 1 ? '' : 's'}`;
    }

    // 4. Handle empty state
    if (filteredCount === 0) {
      if (searchQuery) {
        list.innerHTML = EmptyState.render({
          title: 'No Matches Found',
          description: `We couldn't find any gists matching "${searchQuery}"`,
          actionLabel: 'Clear Search',
          actionType: 'clear-search',
        });
      } else {
        const isStarred = currentFilter === 'starred';
        list.innerHTML = EmptyState.render({
          title: isStarred ? 'No Starred Gists' : 'No Gists Found',
          description: isStarred
            ? "You haven't starred any gists yet"
            : 'Start by creating your first gist or syncing from GitHub',
          actionLabel: isStarred ? 'View All Gists' : 'Create New Gist',
          actionRoute: isStarred ? 'home' : 'create',
        });
      }
      return;
    }

    // 5. Sort (if not natural updated-desc order)
    if (currentSort !== 'updated-desc') {
      gists = gists
        .map((gist) => ({
          gist,
          ts: parseIsoDate(currentSort === 'created-desc' ? gist.createdAt : gist.updatedAt),
        }))
        .sort((a, b) => (currentSort === 'updated-asc' ? a.ts - b.ts : b.ts - a.ts))
        .map((item) => item.gist);
    }

    // 6. Render and bind
    list.innerHTML = gists.map((g) => renderCard(g)).join('');
    bindCardEvents(
      list,
      (id: string) => {
        window.dispatchEvent(
          new CustomEvent('app:navigate', {
            detail: { route: 'detail', params: { gistId: id } },
          })
        );
      },
      signal
    );
  }

  function bindEvents(signal: AbortSignal): void {
    const searchInput = container.querySelector('#gist-search') as HTMLInputElement | null;
    const clearBtn = container.querySelector('#gist-search-clear') as HTMLButtonElement | null;
    if (searchInput) {
      const toggleClear = (): void => {
        if (!clearBtn) return;
        const isEmpty = searchInput.value.length === 0;
        if (isEmpty) {
          clearBtn.setAttribute('aria-hidden', 'true');
          clearBtn.tabIndex = -1;
        } else {
          clearBtn.removeAttribute('aria-hidden');
          clearBtn.removeAttribute('tabindex');
        }
      };
      searchInput.addEventListener(
        'input',
        (e) => {
          toggleClear();
          clearTimeout(searchTimeout);
          const val = (e.target as HTMLInputElement).value;
          searchTimeout = window.setTimeout(() => {
            searchQuery = val;
            updateList();
          }, 300);
        },
        { signal }
      );

      searchInput.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'Escape' && searchInput.value.length > 0) {
            e.preventDefault();
            clearTimeout(searchTimeout);
            searchTimeout = undefined;
            searchInput.value = '';
            searchQuery = '';
            toggleClear();
            updateList();
          }
        },
        { signal }
      );

      if (clearBtn) {
        clearBtn.addEventListener(
          'click',
          () => {
            clearTimeout(searchTimeout);
            searchTimeout = undefined;
            searchInput.value = '';
            searchQuery = '';
            toggleClear();
            updateList();
            searchInput.focus();
          },
          { signal }
        );
      }

      // Clear debounce timer when the signal aborts to prevent stale updates
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(searchTimeout);
          searchTimeout = undefined;
        },
        { once: true }
      );
    }

    container.querySelector('.filter-chips')?.addEventListener(
      'click',
      (e) => {
        const chip = (e.target as HTMLElement).closest('.chip') as HTMLElement;
        if (!chip) return;

        for (const b of container.querySelectorAll('.chip')) {
          b.classList.remove('active');
        }
        chip.classList.add('active');
        currentFilter = (chip.dataset.filter as Filter) || 'all';
        updateList();
      },
      { signal }
    );

    container.querySelector('#sort-select')?.addEventListener(
      'change',
      (e) => {
        currentSort = (e.target as HTMLSelectElement).value as Sort;
        window.dispatchEvent(
          new CustomEvent('app:sort-changed', { detail: { sort: currentSort } })
        );
        updateList();
      },
      { signal }
    );

    container.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement;
        const actionBtn = target.closest('[data-action="clear-search"]') as HTMLElement;
        if (actionBtn) {
          searchQuery = '';
          const input = container.querySelector('#gist-search') as HTMLInputElement;
          if (input) input.value = '';
          updateList();
        }
      },
      { signal }
    );
  }
}
