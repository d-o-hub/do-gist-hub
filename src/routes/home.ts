/**
 * Home Route
 * Gist list with search, filter, and sort
 */

import { bindCardEvents, renderCard } from '../components/gist-card';
import { EmptyState } from '../components/ui/empty-state';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from '../components/ui/toast';
import { lifecycle } from '../services/lifecycle';
import type { BulkAction } from '../stores/gist-store';
import gistStore from '../stores/gist-store';
import { parseIsoDate } from '../utils/date';
import { destroyKeyboardShortcuts, registerKeyboardShortcuts } from '../utils/keyboard-shortcuts';

export type Filter = 'all' | 'mine' | 'starred' | 'pending' | 'conflict' | 'error';
export type Sort = 'created-desc' | 'updated-desc' | 'updated-asc';

let searchTimeout: number | undefined;

export function render(container: HTMLElement, params?: Record<string, string>): void {
  const signal = lifecycle.getRouteSignal();

  // State must be declared before subscribe() because the callback fires synchronously
  // and accesses these variables. If declared after, they're in the Temporal Dead Zone.
  let currentFilter = (params?.filter as Filter) || 'all';
  let currentSort = (params?.sort as Sort) || 'updated-desc';
  let searchQuery = params?.searchQuery || '';
  let selectedTagId: string | null = null;

  const unsubscribe = gistStore.subscribe(() => {
    if (document.contains(container)) {
      updateList();
    }
  });
  lifecycle.onRouteCleanup(() => unsubscribe());

  const unsubscribeSelection = gistStore.subscribeSelection(() => {
    if (document.contains(container)) {
      updateBulkToolbar();
      updateList();
    }
  });
  lifecycle.onRouteCleanup(() => unsubscribeSelection());

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
    for (const f of ['all', 'mine', 'starred', 'pending', 'conflict', 'error'] as const) {
      const chip = document.createElement('button');
      chip.className = `chip${filter === f ? ' active' : ''}`;
      chip.dataset.filter = f;
      chip.textContent =
        f === 'all'
          ? 'All'
          : f === 'mine'
            ? 'Mine'
            : f === 'starred'
              ? 'Starred'
              : f === 'pending'
                ? 'Pending Sync'
                : f === 'conflict'
                  ? 'Conflicts'
                  : 'Errors';
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

    // Tag filter
    const tagFilter = document.createElement('div');
    tagFilter.className = 'tag-filter';
    tagFilter.id = 'tag-filter';
    routeHome.appendChild(tagFilter);
    void loadTagFilters(tagFilter);

    // Gist list placeholder (populated by updateList)
    const gistList = document.createElement('div');
    gistList.id = 'gist-list';
    gistList.className = 'gist-list gist-grid';
    routeHome.appendChild(gistList);

    // Bulk action toolbar
    const bulkToolbar = document.createElement('div');
    bulkToolbar.id = 'bulk-toolbar';
    bulkToolbar.className = 'bulk-toolbar';
    bulkToolbar.style.display = 'none';
    bulkToolbar.setAttribute('role', 'toolbar');
    bulkToolbar.setAttribute('aria-label', 'Bulk actions');
    bulkToolbar.innerHTML = `
      <span class="bulk-count micro-label" aria-live="polite"></span>
      <div class="bulk-actions">
        <button class="chip" data-bulk-action="star" type="button">STAR</button>
        <button class="chip" data-bulk-action="unstar" type="button">UNSTAR</button>
        <button class="chip" data-bulk-action="delete" type="button">DELETE</button>
        <button class="chip" data-bulk-action="copy-urls" type="button">COPY URLS</button>
        <button class="chip" data-bulk-action="clear" type="button">CLEAR</button>
      </div>
    `;
    routeHome.appendChild(bulkToolbar);

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
   * BOLT: Consolidated filtering, searching, and sorting preparation into a
   * single O(N) pass to eliminate multiple array allocations and redundant
   * iterations. Skips sorting entirely for the default "updated-desc" order.
   */
  function updateList(): void {
    const list = container.querySelector('#gist-list') as HTMLElement | null;
    const countEl = container.querySelector('#gist-result-count') as HTMLElement | null;

    if (!list) return;

    // Loading state
    const allGists = gistStore.getGists();
    if (gistStore.getLoading() && allGists.length === 0) {
      list.innerHTML = Skeleton.renderList(3);
      if (countEl) countEl.textContent = 'Loading gists...';
      return;
    }

    const q = searchQuery.toLowerCase();
    const isSortNeeded = currentSort !== 'updated-desc';
    const filtered: typeof allGists = [];
    const sortData: { gist: (typeof allGists)[number]; ts: number }[] = [];

    // 1. Unified pass for filtering and sort data collection
    for (let i = 0, len = allGists.length; i < len; i++) {
      const g = allGists[i]!;

      // Filter by status/owner
      if (currentFilter === 'pending') {
        if (g.syncStatus !== 'pending') continue;
      } else if (currentFilter === 'conflict') {
        if (g.syncStatus !== 'conflict') continue;
      } else if (currentFilter === 'error') {
        if (g.syncStatus !== 'error') continue;
      } else if (currentFilter === 'starred') {
        if (!g.starred) continue;
      }

      // Filter by tag
      if (selectedTagId) {
        const tags = gistStore.getTagsFromCache(g.id);
        let tagMatch = false;
        for (let j = 0, tLen = tags.length; j < tLen; j++) {
          if (tags[j]?.id === selectedTagId) {
            tagMatch = true;
            break;
          }
        }
        if (!tagMatch) continue;
      }

      // Filter by search query
      if (q) {
        let searchMatch = false;
        if (g.description?.toLowerCase().includes(q)) {
          searchMatch = true;
        } else {
          for (const filename in g.files) {
            if (filename.toLowerCase().includes(q)) {
              searchMatch = true;
              break;
            }
          }
        }
        if (!searchMatch) continue;
      }

      if (isSortNeeded) {
        sortData.push({
          gist: g,
          ts: parseIsoDate(currentSort === 'created-desc' ? g.createdAt : g.updatedAt),
        });
      } else {
        filtered.push(g);
      }
    }

    // 2. Sort if non-default order requested
    if (isSortNeeded) {
      sortData.sort((a, b) => (currentSort === 'updated-asc' ? a.ts - b.ts : b.ts - a.ts));
      for (let i = 0, len = sortData.length; i < len; i++) {
        filtered.push(sortData[i]!.gist);
      }
    }

    const filteredCount = filtered.length;
    const totalCount = allGists.length;

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
        const isPending = currentFilter === 'pending';
        const isConflict = currentFilter === 'conflict';
        const isError = currentFilter === 'error';
        const isSyncFilter = isPending || isConflict || isError;
        list.innerHTML = EmptyState.render({
          title: isConflict
            ? 'No Conflicts'
            : isError
              ? 'No Errors'
              : isPending
                ? 'No Pending Syncs'
                : isStarred
                  ? 'No Starred Gists'
                  : 'No Gists Found',
          description: isConflict
            ? 'All gists are free of conflicts'
            : isError
              ? 'No gists have sync errors'
              : isPending
                ? 'All gists are synced'
                : isStarred
                  ? "You haven't starred any gists yet"
                  : 'Start by creating your first gist or syncing from GitHub',
          actionLabel: isSyncFilter || isStarred ? 'View All Gists' : 'Create New Gist',
          actionRoute: isSyncFilter || isStarred ? 'home' : 'create',
        });
      }
      return;
    }

    // 5. Render and bind
    list.innerHTML = filtered.map((g) => renderCard(g, gistStore.isSelected(g.id))).join('');
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
    registerKeyboardShortcuts(signal, (route: string) => {
      window.dispatchEvent(new CustomEvent('app:navigate', { detail: { route } }));
    });

    signal.addEventListener(
      'abort',
      () => {
        destroyKeyboardShortcuts();
      },
      { once: true }
    );

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
        const newFilter = chip.dataset.filter as Filter;
        if (newFilter === currentFilter) return;
        currentFilter = newFilter;
        container.querySelectorAll('.filter-chips .chip').forEach((c) => {
          c.classList.remove('active');
        });
        chip.classList.add('active');
        updateList();
      },
      { signal }
    );

    const sortSelect = container.querySelector('#sort-select') as HTMLSelectElement | null;
    if (sortSelect) {
      sortSelect.addEventListener(
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
    }

    container.addEventListener('click', (e) => {
      const actionEl = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
      if (!actionEl) return;
      const action = actionEl.dataset.action;
      if (action === 'clear-search') {
        clearTimeout(searchTimeout);
        searchTimeout = undefined;
        const input = container.querySelector('#gist-search') as HTMLInputElement | null;
        if (input) input.value = '';
        searchQuery = '';
        updateList();
      }
    });

    document.addEventListener('keydown', (e) => {
      const isInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';
      if (isInput) return;
      if (e.key === 'x') {
        const focused = document.activeElement?.closest('.gist-card') as HTMLElement | null;
        if (focused) {
          const id = focused.getAttribute('data-gist-id');
          if (id) gistStore.toggleSelect(id);
        }
      }
      if (e.key === 'Escape') {
        gistStore.clearSelection();
      }
    });

    container.addEventListener('click', (e) => {
      const bulkBtn = (e.target as HTMLElement).closest('[data-bulk-action]') as HTMLElement;
      if (bulkBtn) {
        e.preventDefault();
        e.stopPropagation();
        const action = bulkBtn.dataset.bulkAction as BulkAction | 'clear';
        void handleBulkAction(action);
      }
    });
  }

  function updateBulkToolbar(): void {
    const toolbar = container.querySelector('#bulk-toolbar') as HTMLElement | null;
    if (!toolbar) return;
    const count = gistStore.getSelectedIds().size;
    const countEl = toolbar.querySelector('.bulk-count') as HTMLElement | null;
    if (countEl) countEl.textContent = `${count} SELECTED`;
    toolbar.style.display = count > 0 ? '' : 'none';
  }

  async function handleBulkAction(action: BulkAction | 'clear'): Promise<void> {
    if (action === 'clear') {
      gistStore.clearSelection();
      return;
    }
    if (action === 'copy-urls') {
      const result = await gistStore.executeBulkAction(action);
      const urls = result.succeeded
        .map((id) => gistStore.getGist(id)?.htmlUrl ?? '')
        .filter(Boolean);
      if (urls.length > 0) {
        await navigator.clipboard.writeText(urls.join('\n'));
        toast.success(`${urls.length} URL${urls.length === 1 ? '' : 'S'} COPIED`);
      }
      return;
    }
    const result = await gistStore.executeBulkAction(action);
    if (result.failed.length > 0) {
      toast.error(`${result.failed.length} FAILED`, 5000);
    } else {
      toast.success(`${result.succeeded.length} ${action.toUpperCase()}D`);
    }
  }

  async function loadTagFilters(container: HTMLElement): Promise<void> {
    const tags = await gistStore.getAllTags();
    container.innerHTML = '';

    if (tags.length === 0) return;

    const allChip = document.createElement('button');
    allChip.className = `tag-filter-chip${selectedTagId === null ? ' active' : ''}`;
    allChip.textContent = 'All Tags';
    allChip.dataset.tagId = '';
    allChip.addEventListener(
      'click',
      () => {
        selectedTagId = null;
        void loadTagFilters(container);
        updateList();
      },
      { signal }
    );
    container.appendChild(allChip);

    for (const tag of tags) {
      const chip = document.createElement('button');
      chip.className = `tag-filter-chip${selectedTagId === tag.id ? ' active' : ''}`;
      chip.textContent = tag.name;
      chip.style.cssText = `border-color: ${tag.color}; ${selectedTagId === tag.id ? `background: ${tag.color}20; color: ${tag.color};` : ''}`;
      chip.dataset.tagId = tag.id;
      chip.addEventListener(
        'click',
        () => {
          selectedTagId = selectedTagId === tag.id ? null : tag.id;
          void loadTagFilters(container);
          updateList();
        },
        { signal }
      );
      container.appendChild(chip);
    }
  }
}
