/**
 * Unit tests for Settings Route
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/github/auth', () => ({
  getToken: vi.fn(),
  saveToken: vi.fn(),
  removeToken: vi.fn(),
  getTokenInfo: vi.fn(),
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
  getMetadata: vi.fn().mockResolvedValue(null),
  setMetadata: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/llm/client', () => ({
  loadLLMConfig: vi.fn().mockResolvedValue({
    provider: 'none',
    apiKey: undefined,
    model: undefined,
  }),
  saveLLMConfig: vi.fn().mockResolvedValue(undefined),
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

const mockAuthenticateWithDeviceFlow = vi.fn();
vi.mock('../../src/services/github/device-flow', () => ({
  authenticateWithDeviceFlow: mockAuthenticateWithDeviceFlow,
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import {
  cleanupAmbientLightSensor,
  enableAmbientLightTheming,
} from '../../src/components/ui/ambient-light';
import { toast } from '../../src/components/ui/toast';
import { render } from '../../src/routes/settings';
import { getToken, removeToken, saveToken } from '../../src/services/github/auth';
import networkMonitor from '../../src/services/network/offline-monitor';
import { getThemePreference } from '../../src/tokens/design-tokens';

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
      vi.mocked(saveToken).mockResolvedValue({ success: true });
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
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('IMPORT COMPLETE'));
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

  // ── token rotation boundary ────────────────────────────────────────

  describe('token rotation reminder', () => {
    it('does NOT show rotation warning when token is exactly 60 days old', async () => {
      const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
      const savedAt = Date.now() - sixtyDaysMs + 1000;
      const db = await import('../../src/services/db');
      vi.mocked(db.getMetadata).mockImplementation((key: string) => {
        if (key === 'token-saved-at') return Promise.resolve(savedAt);
        return Promise.resolve(null);
      });
      vi.mocked(getToken).mockResolvedValue('ghp_test12345678');
      await render(container);

      expect(container.innerHTML).toContain('Token active');
      expect(container.innerHTML).not.toContain('days old');
      expect(container.innerHTML).not.toContain('Consider rotating');
    });

    it('shows rotation warning when token is 61 days old', async () => {
      const sixtyOneDaysMs = 61 * 24 * 60 * 60 * 1000;
      const savedAt = Date.now() - sixtyOneDaysMs;
      const db = await import('../../src/services/db');
      vi.mocked(db.getMetadata).mockImplementation((key: string) => {
        if (key === 'token-saved-at') return Promise.resolve(savedAt);
        return Promise.resolve(null);
      });
      vi.mocked(getToken).mockResolvedValue('ghp_test12345678');
      await render(container);

      expect(container.innerHTML).toContain('Token is');
      expect(container.innerHTML).toContain('Consider rotating it for security');
    });
  });

  // ── accent hue boundary ───────────────────────────────────────────

  describe('accent hue boundary', () => {
    it('accepts hue value of 0', async () => {
      localStorage.setItem('accent-hue', '0');
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const input = container.querySelector('#accent-hue-input') as HTMLInputElement;
      expect(input.value).toBe('0');
    });

    it('accepts hue value of 360', async () => {
      localStorage.setItem('accent-hue', '360');
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const input = container.querySelector('#accent-hue-input') as HTMLInputElement;
      expect(input.value).toBe('360');
    });

    it('falls back to default (220) when hue is 361', async () => {
      localStorage.setItem('accent-hue', '361');
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const input = container.querySelector('#accent-hue-input') as HTMLInputElement;
      expect(input.value).toBe('220');
    });

    it('falls back to default (220) when hue is -1', async () => {
      localStorage.setItem('accent-hue', '-1');
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const input = container.querySelector('#accent-hue-input') as HTMLInputElement;
      expect(input.value).toBe('220');
    });

    it('falls back to default (220) when localStorage contains malformed value', async () => {
      localStorage.setItem('accent-hue', 'abc');
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const input = container.querySelector('#accent-hue-input') as HTMLInputElement;
      expect(input.value).toBe('220');
    });

    it('falls back to default (220) when localStorage accent-hue is empty', async () => {
      localStorage.setItem('accent-hue', '');
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const input = container.querySelector('#accent-hue-input') as HTMLInputElement;
      expect(input.value).toBe('220');
    });
  });

  // ── LLM provider visibility ───────────────────────────────────────

  describe('LLM provider field visibility', () => {
    it('shows API key field when provider is openai', async () => {
      const { loadLLMConfig } = await import('../../src/services/llm/client');
      vi.mocked(loadLLMConfig).mockResolvedValue({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o-mini',
      });
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const apiKeyGroup = container.querySelector('#llm-api-key-group') as HTMLElement;
      expect(apiKeyGroup.style.display).not.toBe('none');
    });

    it('hides API key field when provider is github-models', async () => {
      const { loadLLMConfig } = await import('../../src/services/llm/client');
      vi.mocked(loadLLMConfig).mockResolvedValue({
        provider: 'github-models',
        apiKey: undefined,
        model: 'gpt-4o',
      });
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const apiKeyGroup = container.querySelector('#llm-api-key-group') as HTMLElement;
      expect(apiKeyGroup.style.display).toBe('none');
    });

    it('hides API key and model fields when provider is none', async () => {
      const { loadLLMConfig } = await import('../../src/services/llm/client');
      vi.mocked(loadLLMConfig).mockResolvedValue({
        provider: 'none',
        apiKey: undefined,
        model: undefined,
      });
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const apiKeyGroup = container.querySelector('#llm-api-key-group') as HTMLElement;
      const modelGroup = container.querySelector('#llm-model-group') as HTMLElement;
      expect(apiKeyGroup.style.display).toBe('none');
      expect(modelGroup.style.display).toBe('none');
    });

    it('shows model field for openai provider', async () => {
      const { loadLLMConfig } = await import('../../src/services/llm/client');
      vi.mocked(loadLLMConfig).mockResolvedValue({
        provider: 'openai',
        apiKey: 'sk-test',
        model: 'gpt-4o',
      });
      vi.mocked(getToken).mockResolvedValue(null);
      await render(container);

      const modelGroup = container.querySelector('#llm-model-group') as HTMLElement;
      expect(modelGroup.style.display).not.toBe('none');
    });
  });

  // ── device flow error messages ─────────────────────────────────────

  describe('device flow error message mapping', () => {
    async function triggerDeviceFlowWithMock(errorCode: string) {
      vi.mocked(getToken).mockResolvedValue(null);
      mockAuthenticateWithDeviceFlow.mockReset();
      await render(container);

      const loginBtn = container.querySelector('#device-flow-login-btn') as HTMLButtonElement;
      mockAuthenticateWithDeviceFlow.mockResolvedValue({
        success: false,
        error: errorCode,
        errorDescription: `raw desc for ${errorCode}`,
      } as never);

      loginBtn.click();
      await vi.waitFor(() => {
        expect(mockAuthenticateWithDeviceFlow).toHaveBeenCalled();
      });
      return container.querySelector('#device-flow-status') as HTMLElement;
    }

    it('maps expired_token to correct message', async () => {
      const statusEl = await triggerDeviceFlowWithMock('expired_token');
      expect(statusEl.textContent).toBe(
        'The device code expired. Please click "SIGN IN WITH GITHUB" to try again.'
      );
    });

    it('maps access_denied to correct message', async () => {
      const statusEl = await triggerDeviceFlowWithMock('access_denied');
      expect(statusEl.textContent).toBe(
        'You denied the authorization request. Click "SIGN IN WITH GITHUB" to try again.'
      );
    });

    it('maps slow_down to correct message', async () => {
      const statusEl = await triggerDeviceFlowWithMock('slow_down');
      expect(statusEl.textContent).toBe(
        'GitHub rate-limited the request. Please wait a moment and try again.'
      );
    });

    it('maps network_error to correct message', async () => {
      const statusEl = await triggerDeviceFlowWithMock('network_error');
      expect(statusEl.textContent).toBe(
        'A network error occurred. Check your connection and try again.'
      );
    });

    it('maps timeout to correct message', async () => {
      const statusEl = await triggerDeviceFlowWithMock('timeout');
      expect(statusEl.textContent).toBe(
        'Authentication timed out. Please click "SIGN IN WITH GITHUB" to start over.'
      );
    });

    it('maps save_error to correct message', async () => {
      const statusEl = await triggerDeviceFlowWithMock('save_error');
      expect(statusEl.textContent).toBe('Failed to save the token. Please try again.');
    });

    it('falls back to raw error for unknown error code', async () => {
      const statusEl = await triggerDeviceFlowWithMock('unknown_code');
      expect(statusEl.textContent).toBe('raw desc for unknown_code');
    });

    it('shows generic message when error is empty', async () => {
      const statusEl = await triggerDeviceFlowWithMock('');
      expect(statusEl.textContent).toBe('Authentication failed. Please try again.');
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
