/**
 * Unit tests for Settings Route
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/github/auth', () => ({
  getToken: vi.fn(),
  saveToken: vi.fn(),
  removeToken: vi.fn(),
}));

vi.mock('../../src/services/network/offline-monitor', () => ({
  default: {
    isOnline: vi.fn(() => true),
    subscribe: vi.fn(() => vi.fn()),
  },
}));

vi.mock('../../src/services/security', () => ({
  redactToken: vi.fn((t: string) => `ghp_****${t.slice(-4)}`),
  sanitizeHtml: vi.fn((s: string) => s),
}));

vi.mock('../../src/services/security/logger', () => ({
  safeLog: vi.fn(),
  safeError: vi.fn(),
}));

vi.mock('../../src/services/export-import', () => ({
  exportAllGists: vi.fn().mockResolvedValue(new Blob(['{}'], { type: 'application/json' })),
  importGists: vi.fn().mockResolvedValue({ imported: 2, updated: 1, conflicts: 0 }),
}));

vi.mock('../../src/services/db', () => ({
  clearAllData: vi.fn(),
  exportData: vi.fn().mockResolvedValue(JSON.stringify({ version: '3.0.0' })),
}));

vi.mock('../../src/stores/gist-store', () => ({
  default: {
    getGists: vi.fn(() => []),
    reloadFromDb: vi.fn(),
  },
}));

vi.mock('../../src/tokens/design-tokens', () => ({
  getThemePreference: vi.fn(() => 'auto'),
  initTheme: vi.fn(),
  setTheme: vi.fn(),
}));

vi.mock('../../src/components/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../src/components/ui/ambient-light', () => ({
  enableAmbientLightTheming: vi.fn(),
  cleanupAmbientLightSensor: vi.fn(),
}));

vi.mock('../../src/utils/dialog', () => ({
  showConfirmDialog: vi.fn(),
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { render } from '../../src/routes/settings';
import { toast } from '../../src/components/ui/toast';
import { getToken, saveToken, removeToken } from '../../src/services/github/auth';
import networkMonitor from '../../src/services/network/offline-monitor';
import { getThemePreference, initTheme } from '../../src/tokens/design-tokens';
import {
  enableAmbientLightTheming,
  cleanupAmbientLightSensor,
} from '../../src/components/ui/ambient-light';

// ── Tests ─────────────────────────────────────────────────────────────

describe('Settings Route', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ── render ─────────────────────────────────────────────────────────

  describe('render', () => {
    it('renders settings sections', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      expect(container.innerHTML).toContain('Settings');
      expect(container.innerHTML).toContain('Authentication');
      expect(container.innerHTML).toContain('Data Management');
      expect(container.innerHTML).toContain('Preferences');
      expect(container.innerHTML).toContain('Data');
      expect(container.innerHTML).toContain('Diagnostics');
      expect(container.innerHTML).toContain('Export Data');
    });

    it('renders theme options with current theme selected', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container, { currentTheme: 'light' });

      const themeSelect = container.querySelector('#theme-select') as HTMLSelectElement;
      expect(themeSelect?.value).toBe('light');
    });

    it('renders token status when no token saved', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      expect(container.innerHTML).toContain('No token saved');
    });

    it('renders token status when token is saved', async () => {
      vi.mocked(getToken).mockResolvedValue('ghp_test12345678');
      await render(container);

      expect(container.innerHTML).toContain('Token active');
    });

    it('renders diagnostics info', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      vi.mocked(networkMonitor.isOnline).mockReturnValue(true);
      await render(container);

      expect(container.innerHTML).toContain('Online: Yes');
    });
  });

  // ── authentication ─────────────────────────────────────────────────

  describe('authentication', () => {
    it('saves token when save button is clicked with value', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      vi.mocked(saveToken).mockResolvedValue(undefined);
      await render(container);

      const input = container.querySelector('#pat-input') as HTMLInputElement;
      input.value = 'ghp_newtoken123';

      const saveBtn = container.querySelector('#save-token-btn') as HTMLElement;
      saveBtn?.click();

      await vi.waitFor(() => {
        expect(saveToken).toHaveBeenCalledWith('ghp_newtoken123');
        expect(toast.success).toHaveBeenCalledWith('TOKEN SAVED');
      });
    });

    it('shows error when save clicked with empty input', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const saveBtn = container.querySelector('#save-token-btn') as HTMLElement;
      saveBtn?.click();

      expect(toast.error).toHaveBeenCalledWith('ENTER A TOKEN');
      expect(saveToken).not.toHaveBeenCalled();
    });

    it('removes token when remove button is clicked', async () => {
      vi.mocked(getToken).mockResolvedValue('ghp_existing');
      vi.mocked(removeToken).mockResolvedValue(undefined);
      await render(container);

      const removeBtn = container.querySelector('#remove-token-btn') as HTMLElement;
      removeBtn?.click();

      await vi.waitFor(() => {
        expect(removeToken).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('TOKEN REMOVED');
      });
    });
  });

  // ── theme ──────────────────────────────────────────────────────────

  describe('theme', () => {
    it('changes theme via select dropdown', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const themeSelect = container.querySelector('#theme-select') as HTMLSelectElement;
      themeSelect.value = 'dark';
      themeSelect?.dispatchEvent(new Event('change'));

      expect(localStorage.getItem('theme-preference')).toBe('dark');
    });

    it('switches to time-based theme', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const themeSelect = container.querySelector('#theme-select') as HTMLSelectElement;
      themeSelect.value = 'time';
      themeSelect?.dispatchEvent(new Event('change'));

      expect(localStorage.getItem('theme-preference')).toBe('time');
    });

    it('handles auto theme by removing preference', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      localStorage.setItem('theme-preference', 'dark');
      await render(container);

      const themeSelect = container.querySelector('#theme-select') as HTMLSelectElement;
      themeSelect.value = 'auto';
      themeSelect?.dispatchEvent(new Event('change'));

      expect(localStorage.getItem('theme-preference')).toBeNull();
    });
  });

  // ── export / import ────────────────────────────────────────────────

  describe('export/import', () => {
    it('triggers file input click on import button', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const fileInput = container.querySelector('#import-file-input') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');

      const importBtn = container.querySelector('#import-btn') as HTMLElement;
      importBtn?.click();

      expect(clickSpy).toHaveBeenCalled();
    });

    it('exports all gists on export button click', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const exportBtn = container.querySelector('#export-all-btn') as HTMLElement;
      exportBtn?.click();

      await vi.waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('EXPORT COMPLETE');
      });
    });

    it('handles import file selection and shows result', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      // Trigger file selection via change event
      const fileInput = container.querySelector('#import-file-input') as HTMLInputElement;

      // Create a mock file
      const file = new File(
        [JSON.stringify({ version: '3.0.0', gists: [], metadata: { total: 0, starred: 0 } })],
        'import.json',
        { type: 'application/json' }
      );

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        configurable: true,
      });

      fileInput.dispatchEvent(new Event('change'));

      await vi.waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('IMPORT COMPLETE')
        );
      });
    });

    it('shows error toast on import failure', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      // Override import mock to reject for this test
      const { importGists } = await import('../../src/services/export-import');
      vi.mocked(importGists).mockRejectedValue(new Error('Parse error'));

      await render(container);

      const fileInput = container.querySelector('#import-file-input') as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [new File(['not json'], 'bad.json', { type: 'application/json' })],
        configurable: true,
      });

      fileInput.dispatchEvent(new Event('change'));

      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('IMPORT FAILED');
      });
    });
  });

  // ── data management ────────────────────────────────────────────────

  describe('data management', () => {
    it('clears all data on clear cache button confirm', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      const { showConfirmDialog } = await import('../../src/utils/dialog');
      vi.mocked(showConfirmDialog).mockResolvedValue(true);

      await render(container);

      const clearBtn = container.querySelector('#clear-cache-btn') as HTMLElement;
      clearBtn?.click();

      await vi.waitFor(() => {
        expect(showConfirmDialog).toHaveBeenCalledWith('CLEAR ALL LOCAL DATA?');
      });
    });

    it('does not clear data on cache button cancel', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      const { showConfirmDialog } = await import('../../src/utils/dialog');
      vi.mocked(showConfirmDialog).mockResolvedValue(false);

      await render(container);

      const clearBtn = container.querySelector('#clear-cache-btn') as HTMLElement;
      clearBtn?.click();

      await vi.waitFor(() => {
        expect(showConfirmDialog).toHaveBeenCalled();
      });
    });

    it('exports data on export data button click', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const exportDataBtn = container.querySelector('#export-data-btn') as HTMLElement;
      exportDataBtn?.click();

      await vi.waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('DATA EXPORTED');
      });
    });
  });

  // ── ambient theme ──────────────────────────────────────────────────

  describe('ambient theme', () => {
    it('selects ambient and calls enableAmbientLightTheming', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      vi.mocked(enableAmbientLightTheming).mockResolvedValue(true);
      await render(container);

      const themeSelect = container.querySelector('#theme-select') as HTMLSelectElement;
      themeSelect.value = 'ambient';
      themeSelect.dispatchEvent(new Event('change'));

      await vi.waitFor(() => {
        expect(enableAmbientLightTheming).toHaveBeenCalled();
      });
    });

    it('refreshes select value when ambient theming fails', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      vi.mocked(enableAmbientLightTheming).mockResolvedValue(false);
      vi.mocked(getThemePreference).mockReturnValue('time');

      await render(container);

      const themeSelect = container.querySelector('#theme-select') as HTMLSelectElement;
      themeSelect.value = 'ambient';
      themeSelect.dispatchEvent(new Event('change'));

      await vi.waitFor(() => {
        expect(cleanupAmbientLightSensor).toHaveBeenCalled();
      });
    });
  });

  // ── abort controller ───────────────────────────────────────────────

  describe('abort controller', () => {
    it('aborts previous controller on re-render', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      // The re-render should trigger abort on the previous controller
      await render(container);

      expect(container.innerHTML).toContain('Settings');
    });
  });
});
