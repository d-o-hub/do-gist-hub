import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/services/security/logger', () => ({
  getOfflineLogs: vi.fn().mockResolvedValue([]),
  clearOfflineLogs: vi.fn().mockResolvedValue(undefined),
  safeLog: vi.fn(),
  safeError: vi.fn(),
  safeWarn: vi.fn(),
}));

vi.mock('../../src/utils/dialog', () => ({
  showConfirmDialog: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../src/services/db', () => ({
  getDB: vi.fn(),
  isDBReady: vi.fn(() => true),
}));

import { renderLogViewer } from '../../src/components/log-viewer';
import type { LogEntry } from '../../src/services/db';
import { clearOfflineLogs, getOfflineLogs } from '../../src/services/security/logger';
import { showConfirmDialog } from '../../src/utils/dialog';

function makeLogs(n: number, level: LogEntry['level'] = 'info'): LogEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    timestamp: Date.now() - (n - i) * 1000,
    level,
    message: `[Test] Log entry ${i}`,
    data: i % 5 === 0 ? { detail: `data-${i}` } : undefined,
  }));
}

describe('LogViewer', () => {
  let container: HTMLElement;
  let signal: AbortSignal;
  let abort: AbortController;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    abort = new AbortController();
    signal = abort.signal;
  });

  afterEach(() => {
    abort.abort();
    document.body.removeChild(container);
  });

  describe('rendering', () => {
    it('renders the log viewer wrapper', () => {
      void renderLogViewer(container, signal);
      expect(container.querySelector('.log-viewer')).not.toBeNull();
      expect(container.querySelector('.log-viewer-viewport')).not.toBeNull();
    });

    it('shows empty state when no logs', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue([]);
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        expect(container.querySelector('.log-viewer-empty')).not.toBeNull();
      });
    });

    it('renders log entries when logs exist', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue(makeLogs(3));
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const rows = container.querySelectorAll('.log-viewer-row');
        expect(rows.length).toBe(3);
      });
    });

    it('displays correct level class on rows', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue([
        { id: 1, timestamp: Date.now(), level: 'error', message: 'err' },
        { id: 2, timestamp: Date.now(), level: 'warn', message: 'wrn' },
        { id: 3, timestamp: Date.now(), level: 'info', message: 'inf' },
      ]);
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const rows = container.querySelectorAll('.log-viewer-row');
        expect(rows[0]?.classList.contains('log-level-error')).toBe(true);
        expect(rows[1]?.classList.contains('log-level-warn')).toBe(true);
        expect(rows[2]?.classList.contains('log-level-info')).toBe(true);
      });
    });

    it('shows entry count', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue(makeLogs(5));
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const count = container.querySelector('.log-viewer-count');
        expect(count?.textContent).toBe('5 / 5 entries');
      });
    });
  });

  describe('level filter', () => {
    it('filters by error level', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue([
        { id: 1, timestamp: Date.now(), level: 'error', message: 'e1' },
        { id: 2, timestamp: Date.now(), level: 'info', message: 'i1' },
        { id: 3, timestamp: Date.now(), level: 'error', message: 'e2' },
      ]);
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const select = container.querySelector('.log-viewer-level-filter') as HTMLSelectElement;
        select.value = 'error';
        select.dispatchEvent(new Event('change'));
      });

      const rows = container.querySelectorAll('.log-viewer-row');
      expect(rows.length).toBe(2);
    });

    it('filters by warn level', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue([
        { id: 1, timestamp: Date.now(), level: 'error', message: 'e1' },
        { id: 2, timestamp: Date.now(), level: 'warn', message: 'w1' },
        { id: 3, timestamp: Date.now(), level: 'info', message: 'i1' },
      ]);
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const select = container.querySelector('.log-viewer-level-filter') as HTMLSelectElement;
        select.value = 'warn';
        select.dispatchEvent(new Event('change'));
      });

      const rows = container.querySelectorAll('.log-viewer-row');
      expect(rows.length).toBe(1);
    });

    it('shows all when level filter is all', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue(makeLogs(4));
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const select = container.querySelector('.log-viewer-level-filter') as HTMLSelectElement;
        select.value = 'error';
        select.dispatchEvent(new Event('change'));
      });

      await vi.waitFor(() => {
        const select = container.querySelector('.log-viewer-level-filter') as HTMLSelectElement;
        select.value = 'all';
        select.dispatchEvent(new Event('change'));
      });

      const rows = container.querySelectorAll('.log-viewer-row');
      expect(rows.length).toBe(4);
    });
  });

  describe('category filter', () => {
    it('populates categories from log messages', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue([
        { id: 1, timestamp: Date.now(), level: 'info', message: '[Auth] login' },
        { id: 2, timestamp: Date.now(), level: 'info', message: '[Sync] pull' },
        { id: 3, timestamp: Date.now(), level: 'info', message: '[Auth] logout' },
      ]);
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const select = container.querySelector('.log-viewer-category-filter') as HTMLSelectElement;
        const options = Array.from(select.options).map((o) => o.value);
        expect(options).toContain('Auth');
        expect(options).toContain('Sync');
        expect(options).toContain('');
      });
    });

    it('filters by selected category', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue([
        { id: 1, timestamp: Date.now(), level: 'info', message: '[Auth] login' },
        { id: 2, timestamp: Date.now(), level: 'info', message: '[Sync] pull' },
        { id: 3, timestamp: Date.now(), level: 'info', message: '[Auth] logout' },
      ]);
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const rows = container.querySelectorAll('.log-viewer-row');
        expect(rows.length).toBe(3);
      });

      const select = container.querySelector('.log-viewer-category-filter') as HTMLSelectElement;
      select.value = 'Auth';
      select.dispatchEvent(new Event('change'));

      const rows = container.querySelectorAll('.log-viewer-row');
      expect(rows.length).toBe(2);
    });

    it('assigns General category to messages without bracket prefix', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue([
        { id: 1, timestamp: Date.now(), level: 'info', message: 'No category' },
      ]);
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const select = container.querySelector('.log-viewer-category-filter') as HTMLSelectElement;
        const options = Array.from(select.options).map((o) => o.value);
        expect(options).toContain('General');
      });
    });
  });

  describe('search filter', () => {
    it('filters by search term in message', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue([
        { id: 1, timestamp: Date.now(), level: 'info', message: 'User login success' },
        { id: 2, timestamp: Date.now(), level: 'info', message: 'User logout' },
        { id: 3, timestamp: Date.now(), level: 'info', message: 'System startup' },
      ]);
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const input = container.querySelector('.log-viewer-search') as HTMLInputElement;
        input.value = 'user';
        input.dispatchEvent(new Event('input'));
      });

      await vi.waitFor(() => {
        const rows = container.querySelectorAll('.log-viewer-row');
        expect(rows.length).toBe(2);
      });
    });

    it('is case insensitive', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue([
        { id: 1, timestamp: Date.now(), level: 'info', message: 'ERROR occurred' },
        { id: 2, timestamp: Date.now(), level: 'info', message: 'Success' },
      ]);
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const input = container.querySelector('.log-viewer-search') as HTMLInputElement;
        input.value = 'error';
        input.dispatchEvent(new Event('input'));
      });

      await vi.waitFor(() => {
        const rows = container.querySelectorAll('.log-viewer-row');
        expect(rows.length).toBe(1);
      });
    });

    it('searches in data field', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue([
        { id: 1, timestamp: Date.now(), level: 'info', message: 'Event', data: { key: 'alpha' } },
        { id: 2, timestamp: Date.now(), level: 'info', message: 'Event', data: { key: 'beta' } },
      ]);
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const input = container.querySelector('.log-viewer-search') as HTMLInputElement;
        input.value = 'alpha';
        input.dispatchEvent(new Event('input'));
      });

      await vi.waitFor(() => {
        const rows = container.querySelectorAll('.log-viewer-row');
        expect(rows.length).toBe(1);
      });
    });
  });

  describe('copy all', () => {
    it('copies filtered logs to clipboard', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue([
        { id: 1, timestamp: 1000, level: 'error', message: 'fail' },
        { id: 2, timestamp: 2000, level: 'info', message: 'ok' },
      ]);
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const rows = container.querySelectorAll('.log-viewer-row');
        expect(rows.length).toBe(2);
      });

      const btn = container.querySelector('.log-viewer-copy-btn') as HTMLButtonElement;
      btn.click();

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalled();
        const text = writeText.mock.calls[0]?.[0] as string;
        expect(text).toContain('[ERROR] fail');
        expect(text).toContain('[INFO] ok');
      });
    });
  });

  describe('clear logs', () => {
    it('clears logs after confirmation', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue(makeLogs(2));
      vi.mocked(showConfirmDialog).mockResolvedValue(true);
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const btn = container.querySelector('.log-viewer-clear-btn') as HTMLButtonElement;
        btn.click();
      });

      await vi.waitFor(() => {
        expect(clearOfflineLogs).toHaveBeenCalled();
      });
    });

    it('does not clear logs on cancel', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue(makeLogs(2));
      vi.mocked(showConfirmDialog).mockResolvedValue(false);
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const btn = container.querySelector('.log-viewer-clear-btn') as HTMLButtonElement;
        btn.click();
      });

      await vi.waitFor(() => {
        expect(showConfirmDialog).toHaveBeenCalled();
      });
      expect(clearOfflineLogs).not.toHaveBeenCalled();
    });
  });

  describe('virtual scrolling', () => {
    it('renders all items when fewer than viewport capacity', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue(makeLogs(10));
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const rows = container.querySelectorAll('.log-viewer-row');
        expect(rows.length).toBe(10);
      });
    });

    it('shows spacers for virtual scroll', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue(makeLogs(100));
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const spacerTop = container.querySelector('.log-viewer-spacer-top') as HTMLElement;
        const spacerBottom = container.querySelector('.log-viewer-spacer-bottom') as HTMLElement;
        expect(spacerTop).not.toBeNull();
        expect(spacerBottom).not.toBeNull();
      });
    });
  });

  describe('combined filters', () => {
    it('applies level + category + search simultaneously', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue([
        { id: 1, timestamp: Date.now(), level: 'error', message: '[Auth] login failed' },
        { id: 2, timestamp: Date.now(), level: 'info', message: '[Auth] login success' },
        { id: 3, timestamp: Date.now(), level: 'error', message: '[Sync] pull failed' },
        { id: 4, timestamp: Date.now(), level: 'warn', message: '[Auth] token expiring' },
      ]);
      void renderLogViewer(container, signal);

      await vi.waitFor(() => {
        const levelSelect = container.querySelector(
          '.log-viewer-level-filter'
        ) as HTMLSelectElement;
        levelSelect.value = 'error';
        levelSelect.dispatchEvent(new Event('change'));
      });

      await vi.waitFor(() => {
        const catSelect = container.querySelector(
          '.log-viewer-category-filter'
        ) as HTMLSelectElement;
        catSelect.value = 'Auth';
        catSelect.dispatchEvent(new Event('change'));
      });

      await vi.waitFor(() => {
        const searchInput = container.querySelector('.log-viewer-search') as HTMLInputElement;
        searchInput.value = 'failed';
        searchInput.dispatchEvent(new Event('input'));
      });

      await vi.waitFor(() => {
        const rows = container.querySelectorAll('.log-viewer-row');
        expect(rows.length).toBe(1);
        expect(rows[0]?.textContent).toContain('login failed');
      });
    });
  });

  describe('cleanup', () => {
    it('cleans up on abort', async () => {
      vi.mocked(getOfflineLogs).mockResolvedValue(makeLogs(5));
      const cleanup = renderLogViewer(container, signal);

      await vi.waitFor(() => {
        expect(container.querySelector('.log-viewer')).not.toBeNull();
      });

      abort.abort();
      expect(typeof cleanup).toBe('function');
    });
  });
});
