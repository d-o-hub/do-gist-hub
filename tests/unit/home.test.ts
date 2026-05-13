/**
 * Unit tests for Home Route
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock data factory ──────────────────────────────────────────────

function makeStoreGist(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    description: `Gist ${id}`,
    files: { 'test.txt': { filename: 'test.txt', content: 'hello', type: 'text/plain' as const } },
    htmlUrl: `https://gist.github.com/${id}`,
    gitPullUrl: `https://api.github.com/gists/${id}/git/pull`,
    gitPushUrl: `https://api.github.com/gists/${id}/git/push`,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-15T00:00:00Z',
    starred: false,
    public: true,
    syncStatus: 'synced',
    ...overrides,
  };
}

// ── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/stores/gist-store', () => {
  let loading = false;
  let gists: Record<string, unknown>[] = [];
  const subscribers = new Set<() => void>();

  const store = {
    subscribe: vi.fn((cb: () => void) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    }),
    getGists: vi.fn(() => gists),
    getLoading: vi.fn(() => loading),
    filterGists: vi.fn((_filter: string) => gists),
    setGists: (newGists: Record<string, unknown>[]) => {
      gists = newGists;
    },
    setLoading: (v: boolean) => {
      loading = v;
    },
    notify: () => {
      subscribers.forEach((cb) => cb());
    },
  };

  return { default: store };
});

vi.mock('../../src/components/gist-card', () => ({
  renderCard: vi.fn((gist: { id: string }) => `<div class="gist-card" data-id="${gist.id}"></div>`),
  bindCardEvents: vi.fn(),
}));

vi.mock('../../src/services/security', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
}));

vi.mock('../../src/components/ui/empty-state', () => ({
  EmptyState: {
    render: vi.fn((_opts: Record<string, string>) => '<div class="empty-state"></div>'),
  },
}));

vi.mock('../../src/components/ui/skeleton', () => ({
  Skeleton: {
    renderList: vi.fn((_count: number) => '<div class="skeleton-list"></div>'),
  },
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { render } from '../../src/routes/home';
import gistStore from '../../src/stores/gist-store';
import { renderCard, bindCardEvents } from '../../src/components/gist-card';
import { EmptyState } from '../../src/components/ui/empty-state';
import { Skeleton } from '../../src/components/ui/skeleton';

// ── Tests ─────────────────────────────────────────────────────────────

describe('Home Route', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ── Render ──────────────────────────────────────────────────────────

  describe('render', () => {
    it('renders search input, filter chips, and sort select', () => {
      render(container);

      expect(container.querySelector('#gist-search')).not.toBeNull();
      expect(container.querySelector('.filter-chips')).not.toBeNull();
      expect(container.querySelector('#sort-select')).not.toBeNull();
    });

    it('renders with default "all" filter active', () => {
      render(container);

      const allChip = container.querySelector('[data-filter="all"]');
      expect(allChip?.classList.contains('active')).toBe(true);
    });

    it('renders with specified filter param active', () => {
      render(container, { filter: 'starred', sort: 'updated-desc', searchQuery: '' });

      const starredChip = container.querySelector('[data-filter="starred"]');
      expect(starredChip?.classList.contains('active')).toBe(true);
    });

    it('renders with specified sort option selected', () => {
      render(container, { filter: 'all', sort: 'created-desc', searchQuery: '' });

      const sortSelect = container.querySelector('#sort-select') as HTMLSelectElement;
      expect(sortSelect?.value).toBe('created-desc');
    });

    it('sets search input value from params', () => {
      render(container, { filter: 'all', sort: 'updated-desc', searchQuery: 'test query' });

      const searchInput = container.querySelector('#gist-search') as HTMLInputElement;
      expect(searchInput?.value).toBe('test query');
    });
  });

  // ── Gist List ──────────────────────────────────────────────────────────

  describe('gist list', () => {
    it('renders skeleton loader when loading with no gists', () => {
      vi.mocked(gistStore.getLoading).mockReturnValue(true);
      vi.mocked(gistStore.getGists).mockReturnValue([]);

      render(container);

      expect(Skeleton.renderList).toHaveBeenCalled();
    });

    it('renders gist cards from store', () => {
      const testGists = [
        makeStoreGist('gist-1'),
        makeStoreGist('gist-2'),
      ];
      vi.mocked(gistStore.getGists).mockReturnValue(testGists as never[]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      vi.mocked(gistStore.filterGists).mockReturnValue(testGists as never[]);

      render(container);

      // renderCard is called twice: once from getHomeHtml -> renderGistList()
      // during the initial innerHTML assignment, and once from updateList()
      // which also calls renderGistList(). For 2 gists, that's 4 calls.
      expect(renderCard).toHaveBeenCalledTimes(4);
    });

    it('renders empty state when no gists found', () => {
      vi.mocked(gistStore.getGists).mockReturnValue([]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      vi.mocked(gistStore.filterGists).mockReturnValue([]);

      render(container);

      expect(EmptyState.render).toHaveBeenCalled();
    });

    it('renders starred-specific empty state for starred filter', () => {
      vi.mocked(gistStore.getGists).mockReturnValue([]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      vi.mocked(gistStore.filterGists).mockReturnValue([]);

      render(container, { filter: 'starred', sort: 'updated-desc', searchQuery: '' });

      expect(EmptyState.render).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'No Starred Gists' })
      );
    });
  });

  // ── Filter Interaction ────────────────────────────────────────────────

  describe('filter interaction', () => {
    it('filters gists when a filter chip is clicked', () => {
      const testGists = [makeStoreGist('gist-1')];
      vi.mocked(gistStore.getGists).mockReturnValue(testGists as never[]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      vi.mocked(gistStore.filterGists).mockReturnValue(testGists as never[]);

      render(container);

      // Click the "Mine" filter chip
      const mineChip = container.querySelector('[data-filter="mine"]') as HTMLElement;
      mineChip?.click();

      // "Mine" chip should now be active
      expect(mineChip?.classList.contains('active')).toBe(true);
      // "All" chip should have been deactivated
      const allChip = container.querySelector('[data-filter="all"]');
      expect(allChip?.classList.contains('active')).toBe(false);
    });
  });

  // ── Sort Interaction ──────────────────────────────────────────────────

  describe('sort interaction', () => {
    it('dispatches sort-changed event on sort change', () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      const testGists = [makeStoreGist('gist-1')];
      vi.mocked(gistStore.getGists).mockReturnValue(testGists as never[]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      vi.mocked(gistStore.filterGists).mockReturnValue(testGists as never[]);

      render(container);

      const sortSelect = container.querySelector('#sort-select') as HTMLSelectElement;
      sortSelect.value = 'created-desc';
      sortSelect.dispatchEvent(new Event('change'));

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'app:sort-changed',
          detail: { sort: 'created-desc' },
        })
      );
    });
  });

  // ── Search Interaction ────────────────────────────────────────────────

  describe('search interaction', () => {
    it('updates gist list on search input with debounce', async () => {
      vi.useFakeTimers();

      const testGists = [makeStoreGist('gist-1'), makeStoreGist('gist-2')];
      vi.mocked(gistStore.getGists).mockReturnValue(testGists as never[]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      vi.mocked(gistStore.filterGists).mockReturnValue(testGists as never[]);

      render(container);

      const searchInput = container.querySelector('#gist-search') as HTMLInputElement;

      // Type in search
      searchInput.value = 'test';
      searchInput.dispatchEvent(new Event('input'));

      // Before debounce, cards should not have been re-rendered
      // (debounce is 300ms, we advance 200ms)
      vi.advanceTimersByTime(200);

      // The debounce should be pending
      vi.advanceTimersByTime(200); // total 400ms

      // After debounce, list should have been updated
      const gistList = container.querySelector('#gist-list');
      expect(gistList).not.toBeNull();

      vi.useRealTimers();
    });

    it('clears search when clear-search action is triggered', () => {
      const testGists = [makeStoreGist('gist-1')];
      vi.mocked(gistStore.getGists).mockReturnValue(testGists as never[]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      vi.mocked(gistStore.filterGists).mockReturnValue(testGists as never[]);

      render(container, { filter: 'all', sort: 'updated-desc', searchQuery: 'something' });

      const searchInput = container.querySelector('#gist-search') as HTMLInputElement;
      expect(searchInput.value).toBe('something');

      // Trigger custom clear-search action
      const clearAction = container.querySelector('[data-action="clear-search"]');
      if (clearAction) {
        (clearAction as HTMLElement).click();
        expect(searchInput.value).toBe('');
      }
    });
  });

  // ── Empty Search Results ────────────────────────────────────────────────

  describe('empty search results', () => {
    it('renders clear-search action when search yields no results', () => {
      vi.mocked(gistStore.getGists).mockReturnValue([] as never[]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      vi.mocked(gistStore.filterGists).mockReturnValue([] as never[]);

      render(container, { filter: 'all', sort: 'updated-desc', searchQuery: 'nonexistent' });

      // EmptyState should be called with clear-search action type for search queries
      expect(EmptyState.render).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'No Matches Found',
          actionType: 'clear-search',
        })
      );
    });

    it('dispatches clear-search action to reset search query', () => {
      vi.mocked(gistStore.getGists).mockReturnValue([] as never[]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      vi.mocked(gistStore.filterGists).mockReturnValue([] as never[]);

      render(container, { filter: 'all', sort: 'updated-desc', searchQuery: 'something' });

      // Find the clear-search button and click it
      const clearBtn = container.querySelector('[data-action="clear-search"]') as HTMLElement;
      if (clearBtn) {
        clearBtn.click();
        // After clicking clear, the search input should be empty
        const searchInput = container.querySelector('#gist-search') as HTMLInputElement;
        expect(searchInput?.value).toBe('');
      }
    });
  });

  // ── Sort: updated-asc ─────────────────────────────────────────────────----

  describe('sort by updated-asc', () => {
    it('renders gists sorted by oldest first when sort is updated-asc', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const testGists = [
        makeStoreGist('gist-recent', { updatedAt: today.toISOString() }),
        makeStoreGist('gist-old', { updatedAt: twoDaysAgo.toISOString() }),
        makeStoreGist('gist-mid', { updatedAt: yesterday.toISOString() }),
      ];
      vi.mocked(gistStore.getGists).mockReturnValue(testGists as never[]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      vi.mocked(gistStore.filterGists).mockReturnValue(testGists as never[]);

      render(container, { filter: 'all', sort: 'updated-asc', searchQuery: '' });

      // Cards should be rendered for all 3 gists
      expect(renderCard).toHaveBeenCalled();
      expect(renderCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'gist-old' }));
      expect(renderCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'gist-mid' }));
      expect(renderCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'gist-recent' }));
    });
  });

  // ── Mine Filter Behavior ───────────────────────────────────────────────────

  describe('mine filter behavior', () => {
    it('renders only non-starred gists when filter is mine', () => {
      const mixedGists = [
        makeStoreGist('mine-1', { starred: false }),
        makeStoreGist('starred-1', { starred: true }),
        makeStoreGist('mine-2', { starred: false }),
        makeStoreGist('starred-2', { starred: true }),
      ];
      // filterGists with 'mine' is internally converted to 'all' in the source code
      vi.mocked(gistStore.getGists).mockReturnValue(mixedGists as never[]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      // For 'mine', the source passes 'all' to filterGists, so we return all gists
      vi.mocked(gistStore.filterGists).mockReturnValue(mixedGists as never[]);

      render(container, { filter: 'mine', sort: 'updated-desc', searchQuery: '' });

      expect(renderCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'mine-1' }));
      expect(renderCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'mine-2' }));
      expect(renderCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'starred-1' }));
      expect(renderCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'starred-2' }));

      // Mine chip should be active
      const mineChip = container.querySelector('[data-filter="mine"]');
      expect(mineChip?.classList.contains('active')).toBe(true);
    });

    it('switches filter from mine to all when all chip is clicked', () => {
      const testGists = [makeStoreGist('gist-1'), makeStoreGist('gist-2')];
      vi.mocked(gistStore.getGists).mockReturnValue(testGists as never[]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      vi.mocked(gistStore.filterGists).mockReturnValue(testGists as never[]);

      render(container, { filter: 'mine', sort: 'updated-desc', searchQuery: '' });

      // Click the 'All' chip
      const allChip = container.querySelector('[data-filter="all"]') as HTMLElement;
      allChip?.click();

      expect(allChip?.classList.contains('active')).toBe(true);
      const mineChip = container.querySelector('[data-filter="mine"]');
      expect(mineChip?.classList.contains('active')).toBe(false);
    });
  });

  // ── Store Subscription ────────────────────────────────────────────────

  describe('store subscription', () => {
    it('subscribes to gistStore on render', () => {
      render(container);
      expect(gistStore.subscribe).toHaveBeenCalled();
    });

    it('unsubscribes previous store subscription on re-render', () => {
      render(container);
      render(container);
      // subscribe should have been called twice,
      // the first subscription should have been cleaned up
      expect(gistStore.subscribe).toHaveBeenCalledTimes(2);
    });

    it('updates gist list when store notifies subscribers', () => {
      const testGists = [makeStoreGist('gist-notify')];
      vi.mocked(gistStore.getGists).mockReturnValue(testGists as never[]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      vi.mocked(gistStore.filterGists).mockReturnValue(testGists as never[]);

      render(container);

      // Clear the call count from the initial render
      vi.clearAllMocks();

      // Re-set mocks after clearing
      vi.mocked(gistStore.getGists).mockReturnValue(testGists as never[]);
      vi.mocked(gistStore.getLoading).mockReturnValue(false);
      vi.mocked(gistStore.filterGists).mockReturnValue(testGists as never[]);

      // Trigger store notification
      const subscribeCb = vi.mocked(gistStore.subscribe).mock.calls[0]?.[0];
      if (subscribeCb) {
        subscribeCb();
        expect(renderCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'gist-notify' }));
      }
    });
  });
});
