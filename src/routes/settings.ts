/**
 * Settings Route
 */

import {
  cleanupAmbientLightSensor,
  enableAmbientLightTheming,
} from '../components/ui/ambient-light';
import { toast } from '../components/ui/toast';
import { getToken, removeToken, saveToken } from '../services/github/auth';
import { lifecycle } from '../services/lifecycle';
import networkMonitor from '../services/network/offline-monitor';
import { redactToken, sanitizeHtml } from '../services/security';
import { safeError } from '../services/security/logger';
import { recordAuthCompleted } from '../services/telemetry/auth-telemetry';
import gistStore from '../stores/gist-store';
import { getThemePreference, initTheme } from '../tokens/design-tokens';
import { showConfirmDialog } from '../utils/dialog';

export async function render(
  container: HTMLElement,
  params?: Record<string, string>
): Promise<void> {
  const currentTheme = params?.currentTheme || 'auto';

  const signal = lifecycle.getRouteSignal();

  container.innerHTML = `
    <div class="route-settings">
      <header class="detail-header">
          <h2 class="detail-title">Settings</h2>
      </header>

      <div class="settings-list">
        <details class="settings-section" open>
          <summary class="settings-section-header">
            <h3 class="form-label">Authentication</h3>
          </summary>
          <div class="settings-section-content">
            <div class="form-group">
              <label class="form-label" for="pat-input">GitHub Personal Access Token</label>
              <div class="flex-row gap-2">
                  <input type="password" id="pat-input" class="form-input flex-1" placeholder="ghp_...">
                  <button id="save-token-btn" class="btn btn-primary">SAVE</button>
                  <button id="remove-token-btn" class="btn btn-ghost">REMOVE</button>
              </div>
              <div id="token-status" class="token-status-mt"></div>
              <div class="flex-row gap-2 mt-4">
                <button id="device-flow-login-btn" class="btn btn-primary">SIGN IN WITH GITHUB</button>
              </div>
              <div id="device-flow-status" class="micro-label mt-2" style="white-space: pre-line;"></div>
              <p class="micro-label hint-text mt-2">
                ⚠️ Only enter the code on <strong>github.com</strong>. Never share it with anyone.
              </p>
            </div>
          </div>
        </details>

        <details class="settings-section" open>
          <summary class="settings-section-header">
            <h3 class="form-label">Data Management</h3>
          </summary>
          <div class="settings-section-content">
              <div class="form-actions flex-col gap-2">
                  <div class="flex-row gap-2">
                      <button id="export-all-btn" class="btn btn-secondary flex-1">EXPORT ALL GISTS</button>
                      <button id="import-btn" class="btn btn-secondary flex-1">IMPORT GISTS</button>
                      <input type="file" id="import-file-input" accept=".json" class="hidden" />
                  </div>
            </div>
          </div>
        </details>

        <details class="settings-section">
          <summary class="settings-section-header">
            <h3 class="form-label">Preferences</h3>
          </summary>
          <div class="settings-section-content">
            <div class="form-group">
              <label class="form-label" for="theme-select">Theme</label>
              <select id="theme-select" class="form-input">
                <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light</option>
                <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
                <option value="auto" ${currentTheme === 'auto' ? 'selected' : ''}>Auto (System)</option>
                <option value="time" ${currentTheme === 'time' ? 'selected' : ''}>Time-based (Dark 7PM–7AM)</option>
                <option value="ambient" ${currentTheme === 'ambient' ? 'selected' : ''}>Ambient Light (Opt-in)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="accent-hue-input">Accent Color <span id="accent-hue-value" class="micro-label"></span></label>
              <input type="range" id="accent-hue-input" class="form-input" min="0" max="360" value="220" aria-label="Accent hue">
              <p class="micro-label hint-text">Adjust the accent color hue (0-360). Default: 220 (blue).</p>
            </div>
          </div>
        </details>

        <details class="settings-section">
          <summary class="settings-section-header">
            <h3 class="form-label">Data & Diagnostics</h3>
          </summary>
          <div class="settings-section-content">
            <div class="form-actions flex-col gap-2">
              <button id="export-data-btn" class="btn btn-ghost">Export Data (JSON)</button>
              <button id="clear-cache-btn" class="btn btn-danger">CLEAR LOCAL CACHE</button>
            </div>
            <div id="diagnostics-info" class="diagnostics-info diagnostics-mt"></div>
          </div>
        </details>
      </div>
    </div>
  `;

  await loadTokenInfo(container);
  loadDiagnostics(container);
  loadAccentHue(container);
  bindEvents(container, signal);
}

/**
 * Load and display the current GitHub PAT status in the settings UI.
 * Shows a rotation reminder if the token is older than 60 days.
 */
async function loadTokenInfo(container: HTMLElement): Promise<void> {
  const el = container.querySelector('#token-status');
  const token = await getToken();
  if (el) {
    if (token) {
      // Check token age for rotation reminder
      const savedAt = await (await import('../services/db')).getMetadata<number>('token-saved-at');
      let rotationHtml = '';
      if (savedAt) {
        const ageDays = (Date.now() - savedAt) / (1000 * 60 * 60 * 24);
        if (ageDays > 60) {
          rotationHtml = `<p class="micro-label token-rotation">⚠️ Token is ${Math.floor(ageDays)} days old. Consider rotating it for security.</p>`;
        }
      }
      el.innerHTML = `<p class="micro-label token-saved">Token active: ${sanitizeHtml(redactToken(token))}</p>${rotationHtml}`;
    } else {
      el.innerHTML = '<p class="micro-label token-missing">No token saved. Add one above.</p>';
    }
  }
}

/**
 * Render diagnostics info (online status, gist count, current theme) into the settings UI.
 */
function loadDiagnostics(container: HTMLElement): void {
  const diagnosticsContainer = container.querySelector('#diagnostics-info');
  if (!diagnosticsContainer) return;

  const info = {
    online: networkMonitor.isOnline(),
    gistsCount: gistStore.getGists().length,
    theme: document.documentElement.getAttribute('data-theme'),
  };

  diagnosticsContainer.innerHTML = `
    <div class="diagnostics-content micro-label">
      <p>Online: ${info.online ? 'Yes' : 'No'}</p>
      <p>Gists: ${info.gistsCount}</p>
      <p>Theme: ${sanitizeHtml(info.theme || 'auto')}</p>
    </div>
  `;
}

/**
 * Load the saved accent hue from localStorage and apply it to the range input and display span.
 */
function loadAccentHue(container: HTMLElement): void {
  const input = container.querySelector('#accent-hue-input') as HTMLInputElement | null;
  if (!input) return;
  const raw = localStorage.getItem('accent-hue') || '220';
  const parsed = Number.parseInt(raw, 10);
  const saved = Number.isNaN(parsed) || parsed < 0 || parsed > 360 ? '220' : String(parsed);
  input.value = saved;
  const display = container.querySelector('#accent-hue-value');
  if (display) {
    display.textContent = saved;
  }
  document.documentElement.style.setProperty('--accent-h', saved);
}

/**
 * Bind all event listeners for the settings route (auth, import/export, theme, cache).
 */
function bindEvents(container: HTMLElement, signal: AbortSignal): void {
  container.querySelector('#save-token-btn')?.addEventListener(
    'click',
    () => {
      const input = container.querySelector('#pat-input') as HTMLInputElement;
      if (input.value) {
        void (async () => {
          try {
            const result = await saveToken(input.value);
            if (result.success) {
              toast.success('TOKEN SAVED');
              await recordAuthCompleted();
              await loadTokenInfo(container);
              input.value = '';
            } else {
              toast.error(result.error || 'FAILED TO SAVE TOKEN');
            }
          } catch {
            toast.error('FAILED TO SAVE TOKEN');
          }
        })();
      } else {
        toast.error('ENTER A TOKEN');
      }
    },
    { signal }
  );

  container.querySelector('#remove-token-btn')?.addEventListener(
    'click',
    () => {
      void (async () => {
        await removeToken();
        toast.success('TOKEN REMOVED');
        await loadTokenInfo(container);
      })();
    },
    { signal }
  );

  container.querySelector('#device-flow-login-btn')?.addEventListener(
    'click',
    () => {
      void (async () => {
        const statusEl = container.querySelector('#device-flow-status');
        const loginBtn = container.querySelector('#device-flow-login-btn') as HTMLButtonElement;
        if (!statusEl || !loginBtn) return;

        loginBtn.disabled = true;
        loginBtn.textContent = 'CONNECTING...';
        statusEl.textContent = 'Initializing...';

        try {
          const { authenticateWithDeviceFlow } = await import('../services/github/device-flow');
          const result = await authenticateWithDeviceFlow((status) => {
            statusEl.textContent = status;
          });

          if (result.success) {
            toast.success('AUTHENTICATED VIA GITHUB');
            statusEl.textContent = 'Authentication successful!';
            await loadTokenInfo(container);
          } else {
            toast.error('AUTHENTICATION FAILED');
            const errorMessages: Record<string, string> = {
              expired_token:
                'The device code expired. Please click "SIGN IN WITH GITHUB" to try again.',
              access_denied:
                'You denied the authorization request. Click "SIGN IN WITH GITHUB" to try again.',
              slow_down: 'GitHub rate-limited the request. Please wait a moment and try again.',
              network_error: 'A network error occurred. Check your connection and try again.',
              timeout:
                'Authentication timed out. Please click "SIGN IN WITH GITHUB" to start over.',
              save_error: 'Failed to save the token. Please try again.',
            };
            const msg = result.error
              ? errorMessages[result.error] || result.errorDescription
              : 'Authentication failed. Please try again.';
            statusEl.textContent = msg || 'Authentication failed. Please try again.';
          }
        } catch {
          toast.error('AUTHENTICATION FAILED');
          statusEl.textContent = 'An unexpected error occurred. Please try again.';
        } finally {
          loginBtn.disabled = false;
          loginBtn.textContent = 'SIGN IN WITH GITHUB';
        }
      })();
    },
    { signal }
  );

  container.querySelector('#theme-select')?.addEventListener(
    'change',
    (e) => {
      const theme = (e.target as HTMLSelectElement).value as
        | 'light'
        | 'dark'
        | 'auto'
        | 'time'
        | 'ambient';
      cleanupAmbientLightSensor();
      if (theme === 'auto') {
        localStorage.removeItem('theme-preference');
        initTheme();
      } else if (theme === 'ambient') {
        void (async () => {
          if (signal.aborted) return;
          const ok = await enableAmbientLightTheming();
          if (signal.aborted) return;
          if (!ok) {
            // Fallback already handled inside enableAmbientLightTheming
            // Refresh select to show the effective preference
            const select = container.querySelector('#theme-select') as HTMLSelectElement;
            const effective = getThemePreference() || 'auto';
            select.value = effective;
          }
          if (signal.aborted) return;
          loadDiagnostics(container);
        })();
        return;
      } else {
        localStorage.setItem('theme-preference', theme);
        initTheme();
      }
      loadDiagnostics(container);
    },
    { signal }
  );

  container.querySelector('#export-all-btn')?.addEventListener(
    'click',
    () => {
      void (async () => {
        const { exportAllGists } = await import('../services/export-import');
        const blob = await exportAllGists();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gists-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('EXPORT COMPLETE');
      })();
    },
    { signal }
  );

  container.querySelector('#import-btn')?.addEventListener(
    'click',
    () => {
      (container.querySelector('#import-file-input') as HTMLInputElement)?.click();
    },
    { signal }
  );

  container.querySelector('#import-file-input')?.addEventListener(
    'change',
    (e) => {
      void (async () => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const { importGists } = await import('../services/export-import');
          const result = await importGists(file);
          await gistStore.reloadFromDb();
          toast.success(
            `IMPORT COMPLETE: ${result.imported} NEW, ${result.updated} UPDATED, ${result.conflicts} CONFLICTS`
          );
        } catch (err) {
          toast.error('IMPORT FAILED');
          safeError('Import failed', err);
        } finally {
          (e.target as HTMLInputElement).value = '';
        }
      })();
    },
    { signal }
  );

  container.querySelector('#clear-cache-btn')?.addEventListener(
    'click',
    () => {
      void (async () => {
        if (await showConfirmDialog('CLEAR ALL LOCAL DATA?')) {
          const { clearAllData } = await import('../services/db');
          await clearAllData();
          window.location.reload();
        }
      })();
    },
    { signal }
  );

  container.querySelector('#export-data-btn')?.addEventListener(
    'click',
    () => {
      void (async () => {
        try {
          const { exportData } = await import('../services/db');
          const data = await exportData();
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `gist-hub-backup-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success('DATA EXPORTED');
        } catch {
          toast.error('EXPORT FAILED');
        }
      })();
    },
    { signal }
  );

  container.querySelector('#accent-hue-input')?.addEventListener(
    'input',
    (e) => {
      const value = (e.target as HTMLInputElement).value;
      localStorage.setItem('accent-hue', value);
      document.documentElement.style.setProperty('--accent-h', value);
      const display = container.querySelector('#accent-hue-value');
      if (display) {
        display.textContent = value;
      }
    },
    { signal }
  );
}
