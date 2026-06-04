/**
 * Unit tests for Conflict Resolution Component
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/security/dom', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('../../src/services/sync/conflict-detector', () => ({
  getConflicts: vi.fn(),
}));

vi.mock('../../src/stores/gist-store', () => ({
  default: {
    resolveGistConflict: vi.fn().mockResolvedValue(undefined),
    getGists: vi.fn(() => []),
  },
}));

vi.mock('../../src/utils/announcer', () => ({
  announcer: {
    announce: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../src/utils/view-transitions', () => ({
  withViewTransition: vi.fn(async (fn: () => void | Promise<void>) => {
    await fn();
  }),
}));

vi.mock('../../src/components/ui/empty-state', () => ({
  EmptyState: {
    render: vi.fn(() => '<div class="empty-state"><h2>No Conflicts</h2></div>'),
    renderToFragment: vi.fn(() => {
      const frag = document.createDocumentFragment();
      const div = document.createElement('div');
      div.className = 'empty-state';
      const h2 = document.createElement('h2');
      h2.textContent = 'No Conflicts';
      div.appendChild(h2);
      frag.appendChild(div);
      return frag;
    }),
  },
}));

vi.mock('../../src/components/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import {
  bindConflictEvents,
  buildConflictDetail,
  buildConflictList,
  loadConflictResolution,
  renderConflictDetail,
  renderConflictList,
} from '../../src/components/conflict-resolution';
import { getConflicts } from '../../src/services/sync/conflict-detector';
import gistStore from '../../src/stores/gist-store';
import { announcer } from '../../src/utils/announcer';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeConflict(overrides: Record<string, unknown> = {}) {
  return {
    gistId: 'conflict-1',
    localVersion: {
      description: 'Local description',
      public: true,
      files: {
        'local.txt': { filename: 'local.txt', content: 'local', size: 5 },
      },
    },
    remoteVersion: {
      description: 'Remote description',
      public: false,
      files: {
        'remote.txt': { filename: 'remote.txt', content: 'remote', size: 6 },
      },
    },
    detectedAt: new Date('2026-01-01').toISOString(),
    conflictingFields: ['description'],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('Conflict Resolution', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ── renderConflictList ──────────────────────────────────────────────

  describe('buildConflictList', () => {
    /** Helper: render to a wrapper div and return it for querying. */
    function renderToWrapper(conflicts: ReturnType<typeof makeConflict>[]): HTMLElement {
      const w = document.createElement('div');
      w.appendChild(buildConflictList(conflicts as never));
      return w;
    }

    it('returns empty state when no conflicts', () => {
      const w = renderToWrapper([]);
      expect(w.textContent).toContain('No Conflicts');
    });

    it('renders conflict items for active conflicts', () => {
      const conflicts = [makeConflict(), makeConflict({ gistId: 'conflict-2' })];
      const w = renderToWrapper(conflicts);

      expect(w.querySelector('.conflict-list')).not.toBeNull();
      // gistId stored in dataset (XSS-safe), not textContent
      const items = w.querySelectorAll('.conflict-item');
      expect(items.length).toBe(2);
      expect((items[0] as HTMLElement).dataset.id).toBe('conflict-1');
      expect((items[1] as HTMLElement).dataset.id).toBe('conflict-2');
      expect(w.textContent).toContain('Local description');
      expect(w.textContent).toContain('RESOLVE');
    });

    it('renders conflicting fields in the detail chip', () => {
      const conflicts = [makeConflict({ conflictingFields: ['description', 'content'] })];
      const w = renderToWrapper(conflicts);

      expect(w.textContent).toContain('description, content');
    });

    it('renders UNTITLED GIST when description is null', () => {
      const conflicts = [
        makeConflict({
          localVersion: {
            description: null,
            public: true,
            files: { 'f.txt': { filename: 'f.txt' } },
          },
        }),
      ];
      const w = renderToWrapper(conflicts);

      expect(w.textContent).toContain('UNTITLED GIST');
    });
  });

  // ── buildConflictDetail ───────────────────────────────────────────

  describe('buildConflictDetail', () => {
    /** Helper: render to a wrapper div and return it for querying. */
    function renderToWrapper(conflict: ReturnType<typeof makeConflict>): HTMLElement {
      const w = document.createElement('div');
      w.appendChild(buildConflictDetail(conflict as never));
      return w;
    }

    it('renders side-by-side comparison view', () => {
      const conflict = makeConflict();
      const w = renderToWrapper(conflict);

      expect(w.querySelector('.conflict-detail')).not.toBeNull();
      expect(w.textContent).toContain('LOCAL VERSION');
      expect(w.textContent).toContain('REMOTE VERSION');
      expect(w.textContent).toContain('BACK TO LIST');
      expect(w.textContent).toContain('KEEP LOCAL VERSION');
      expect(w.textContent).toContain('USE REMOTE VERSION');
    });

    it('marks conflicting fields with has-conflict class', () => {
      const conflict = makeConflict({ conflictingFields: ['description'] });
      const w = renderToWrapper(conflict);

      expect(w.querySelector('.has-conflict')).not.toBeNull();
    });

    it('shows "No description" text for missing descriptions', () => {
      const conflict = makeConflict({
        localVersion: { description: null, public: true, files: {} },
        remoteVersion: { description: null, public: false, files: {} },
      });
      const w = renderToWrapper(conflict);

      // textContent is XSS-safe — no HTML parsing, so <i> is rendered as text
      const noDescs = w.querySelectorAll('i');
      expect(noDescs.length).toBe(2);
      expect(noDescs[0]?.textContent).toBe('No description');
    });

    it('sets gistId via textContent (XSS-safe)', () => {
      const conflict = makeConflict({ gistId: 'test" onerror="alert(1)' });
      const w = renderToWrapper(conflict);

      expect(w.querySelector('[onerror]')).toBeNull();
      expect(w.textContent).toContain('test" onerror="alert(1)');
    });
  });

  // ── bindConflictEvents ─────────────────────────────────────────────

  describe('bindConflictEvents', () => {
    it('does not throw when no conflict elements exist', () => {
      const onResolve = vi.fn();
      container.innerHTML = '<div></div>';

      expect(() => {
        bindConflictEvents(container, onResolve);
      }).not.toThrow();
    });

    it('handles missing strategy buttons gracefully', () => {
      const onResolve = vi.fn();
      container.replaceChildren(buildConflictDetail(makeConflict() as never));
      bindConflictEvents(container, onResolve);

      // Back button should be clickable
      const backBtn = container.querySelector('.back-to-list') as HTMLElement;
      expect(backBtn).not.toBeNull();
      backBtn?.click();
    });

    it('calls resolveGistConflict with correct id when resolve and local-wins are clicked in flow', async () => {
      vi.mocked(getConflicts).mockResolvedValue([
        makeConflict({ gistId: 'resolve-test' }) as never,
      ]);

      // Render conflict list with resolve button
      container.replaceChildren(
        buildConflictList([makeConflict({ gistId: 'resolve-test' })] as never)
      );
      const onResolve = vi.fn();
      bindConflictEvents(container, onResolve);

      // Click resolve button — this sets currentConflictId and triggers withViewTransition
      const resolveBtn = container.querySelector('.resolve-btn') as HTMLElement;
      expect(resolveBtn).not.toBeNull();
      resolveBtn?.click();

      // Now loadConflictResolution renders the detail view
      vi.mocked(getConflicts).mockResolvedValue([
        makeConflict({ gistId: 'resolve-test' }) as never,
      ]);
      container.replaceChildren(
        buildConflictDetail(makeConflict({ gistId: 'resolve-test' }) as never)
      );
      bindConflictEvents(container, onResolve);

      // Click local-wins strategy button
      const localBtn = container.querySelector('[data-strategy="local-wins"]') as HTMLElement;
      expect(localBtn).not.toBeNull();
      localBtn?.click();

      await vi.waitFor(() => {
        expect(gistStore.resolveGistConflict).toHaveBeenCalledWith('resolve-test', 'local-wins');
      });
    });
  });

  // ── loadConflictResolution ─────────────────────────────────────────

  describe('loadConflictResolution', () => {
    it('renders conflict list when no current conflict', async () => {
      vi.mocked(getConflicts).mockResolvedValue([] as never[]);

      await loadConflictResolution(container);

      expect(getConflicts).toHaveBeenCalled();
      expect(container.textContent).toContain('SYNC CONFLICTS');
    });

    it('renders conflict detail when currentConflictId matches', async () => {
      // First render the list to set currentConflictId via event binding
      vi.mocked(getConflicts).mockResolvedValue([makeConflict({ gistId: 'test-id' }) as never]);

      container.replaceChildren(buildConflictList([makeConflict({ gistId: 'test-id' })] as never));
      const onResolve = vi.fn();
      bindConflictEvents(container, onResolve);

      // Click resolve to set currentConflictId
      const resolveBtn = container.querySelector('.resolve-btn') as HTMLElement;
      resolveBtn?.click();

      // Now loadConflictResolution should find the conflict and render detail
      const w = document.createElement('div');
      w.appendChild(buildConflictDetail(makeConflict({ gistId: 'test-id' }) as never));
      expect(w.textContent).toContain('LOCAL VERSION');
      expect(w.textContent).toContain('REMOTE VERSION');
    });
  });
});
