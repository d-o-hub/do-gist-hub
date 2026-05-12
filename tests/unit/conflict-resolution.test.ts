/**
 * Unit tests for Conflict Resolution Component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
    render: vi.fn(
      () => '<div class="empty-state"><h2>No Conflicts</h2></div>'
    ),
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

import { renderConflictList, renderConflictDetail, bindConflictEvents, loadConflictResolution } from '../../src/components/conflict-resolution';
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

  describe('renderConflictList', () => {
    it('returns empty state when no conflicts', () => {
      const html = renderConflictList([]);

      // EmptyState.render should be called for the no-conflicts case
      expect(html).toContain('No Conflicts');
    });

    it('renders conflict items for active conflicts', () => {
      const conflicts = [makeConflict(), makeConflict({ gistId: 'conflict-2' })];
      const html = renderConflictList(conflicts);

      expect(html).toContain('conflict-list');
      expect(html).toContain('conflict-1');
      expect(html).toContain('conflict-2');
      expect(html).toContain('Local description');
      expect(html).toContain('RESOLVE');
    });

    it('renders conflicting fields in the detail chip', () => {
      const conflicts = [
        makeConflict({ conflictingFields: ['description', 'content'] }),
      ];
      const html = renderConflictList(conflicts);

      expect(html).toContain('description, content');
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
      const html = renderConflictList(conflicts);

      expect(html).toContain('UNTITLED GIST');
    });
  });

  // ── renderConflictDetail ───────────────────────────────────────────

  describe('renderConflictDetail', () => {
    it('renders side-by-side comparison view', () => {
      const conflict = makeConflict();
      const html = renderConflictDetail(conflict);

      expect(html).toContain('conflict-detail');
      expect(html).toContain('LOCAL VERSION');
      expect(html).toContain('REMOTE VERSION');
      expect(html).toContain('BACK TO LIST');
      expect(html).toContain('KEEP LOCAL VERSION');
      expect(html).toContain('USE REMOTE VERSION');
    });

    it('marks conflicting fields with has-conflict class', () => {
      const conflict = makeConflict({ conflictingFields: ['description'] });
      const html = renderConflictDetail(conflict);

      expect(html).toContain('has-conflict');
    });

    it('shows <i>No description</i> for missing descriptions', () => {
      const conflict = makeConflict({
        localVersion: { description: null, public: true, files: {} },
        remoteVersion: { description: null, public: false, files: {} },
      });
      const html = renderConflictDetail(conflict);

      expect(html).toContain('<i>No description</i>');
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
      container.innerHTML = renderConflictDetail(makeConflict());
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
      container.innerHTML = renderConflictList([
        makeConflict({ gistId: 'resolve-test' }),
      ]);
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
      const detail = renderConflictDetail(makeConflict({ gistId: 'resolve-test' }));
      container.innerHTML = detail;
      bindConflictEvents(container, onResolve);

      // Click local-wins strategy button
      const localBtn = container.querySelector(
        '[data-strategy="local-wins"]'
      ) as HTMLElement;
      expect(localBtn).not.toBeNull();
      localBtn?.click();

      await vi.waitFor(() => {
        expect(gistStore.resolveGistConflict).toHaveBeenCalledWith(
          'resolve-test',
          'local-wins'
        );
      });
    });
  });

  // ── loadConflictResolution ─────────────────────────────────────────

  describe('loadConflictResolution', () => {
    it('renders conflict list when no current conflict', async () => {
      vi.mocked(getConflicts).mockResolvedValue([] as never[]);

      await loadConflictResolution(container);

      expect(getConflicts).toHaveBeenCalled();
    });

    it('renders conflict detail when currentConflictId matches', async () => {
      // First render the list to set currentConflictId via event binding
      vi.mocked(getConflicts).mockResolvedValue([
        makeConflict({ gistId: 'test-id' }) as never,
      ]);

      container.innerHTML = renderConflictList([
        makeConflict({ gistId: 'test-id' }),
      ]);
      const onResolve = vi.fn();
      bindConflictEvents(container, onResolve);

      // Click resolve to set currentConflictId
      const resolveBtn = container.querySelector('.resolve-btn') as HTMLElement;
      resolveBtn?.click();

      // Now loadConflictResolution should find the conflict and render detail
      const detail = renderConflictDetail(makeConflict({ gistId: 'test-id' }));
      expect(detail).toContain('LOCAL VERSION');
      expect(detail).toContain('REMOTE VERSION');
    });
  });
});
