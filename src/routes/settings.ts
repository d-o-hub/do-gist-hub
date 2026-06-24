/**
 * Settings Route
 */

import { renderLogViewer } from '../components/log-viewer';
import {
  cleanupAmbientLightSensor,
  enableAmbientLightTheming,
} from '../components/ui/ambient-light';
import { toast } from '../components/ui/toast';
import { getToken, getTokenInfo, removeToken, saveToken } from '../services/github/auth';
import { lifecycle } from '../services/lifecycle';
import { loadLLMConfig, saveLLMConfig } from '../services/llm/client';
import networkMonitor from '../services/network/offline-monitor';
import { redactToken } from '../services/security';
import { safeError } from '../services/security/logger';
import {
  readTelemetry,
  recordAuthCompleted,
  recordAuthMethod,
} from '../services/telemetry/auth-telemetry';
import gistStore from '../stores/gist-store';
import { getThemePreference, initTheme } from '../tokens/design-tokens';
import { showConfirmDialog } from '../utils/dialog';
import { clearFieldError, showFieldError } from '../utils/form-error';
import { noop } from '../utils/noop';

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
                  <input
                    type="password"
                    id="pat-input"
                    class="form-input flex-1"
                    placeholder="ghp_..."
                    aria-describedby="pat-hint"
                  >
                  <button
                    id="save-token-btn"
                    class="btn btn-primary"
                    disabled
                    aria-describedby="pat-hint"
                  >SAVE</button>
                  <button id="remove-token-btn" class="btn btn-ghost">REMOVE</button>
              </div>
              <p id="pat-hint" class="micro-label hint-text">Paste a GitHub PAT to enable sync. Both <code>ghp_</code> and <code>github_pat_</code> formats are supported.</p>
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

        <details class="settings-section">
          <summary class="settings-section-header">
            <h3 class="form-label">Logs</h3>
          </summary>
          <div class="settings-section-content">
            <div id="log-viewer-container"></div>
          </div>
        </details>

        <details class="settings-section">
          <summary class="settings-section-header">
            <h3 class="form-label">Manage Tags</h3>
          </summary>
          <div class="settings-section-content">
            <div class="manage-tags">
              <div class="tag-create-form">
                <div class="form-group">
                  <label class="form-label" for="tag-name-input">Tag Name</label>
                  <input type="text" id="tag-name-input" class="form-input" placeholder="e.g., important, bug, feature">
                </div>
                <div class="form-group">
                  <label class="form-label" for="tag-color-input">Color</label>
                  <div class="color-input-wrapper">
                    <input type="color" id="tag-color-input" value="#3b82f6">
                  </div>
                </div>
                <button id="create-tag-btn" class="btn btn-primary">CREATE</button>
              </div>
              <div id="tag-list" class="tag-list"></div>
            </div>
          </div>
        </details>

        <details class="settings-section">
          <summary class="settings-section-header">
            <h3 class="form-label">AI Integration (Optional)</h3>
          </summary>
          <div class="settings-section-content">
            <div class="form-group">
              <label class="form-label" for="llm-provider-select">LLM Provider</label>
              <select id="llm-provider-select" class="form-input">
                <option value="none">Disabled</option>
                <option value="github-models">GitHub Models (uses your PAT)</option>
                <option value="openai">OpenAI (requires API key)</option>
              </select>
              <p class="micro-label hint-text mt-2">Enable AI-assisted paste processing and description generation.</p>
            </div>
            <div id="llm-api-key-group" class="form-group" style="display: none;">
              <label class="form-label" for="llm-api-key-input">API Key</label>
              <input type="password" id="llm-api-key-input" class="form-input" placeholder="sk-...">
            </div>
            <div id="llm-model-group" class="form-group" style="display: none;">
              <label class="form-label" for="llm-model-input">Model</label>
              <input type="text" id="llm-model-input" class="form-input" placeholder="gpt-4o-mini">
              <p class="micro-label hint-text mt-2">Leave blank for default model.</p>
            </div>
            <div class="form-actions">
              <button id="save-llm-btn" class="btn btn-primary">SAVE LLM SETTINGS</button>
            </div>
          </div>
        </details>
      </div>
    </div>
  `;

  await loadTokenInfo(container);
  await loadDiagnostics(container);
  await loadLLMSettings(container);
  loadAccentHue(container);
  await loadTags(container);
  bindEvents(container, signal);
  bindTagEvents(container, signal);

  const logViewerContainer = container.querySelector('#log-viewer-container');
  if (logViewerContainer) {
    const cleanupLogViewer = renderLogViewer(logViewerContainer as HTMLElement, signal);
    signal.addEventListener('abort', () => cleanupLogViewer(), { once: true });
  }
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
      const tokenInfo = await getTokenInfo();
      el.replaceChildren();
      const activeP = document.createElement('p');
      activeP.className = 'micro-label token-saved';
      activeP.textContent = `Token active: ${redactToken(token)}`;
      el.appendChild(activeP);
      if (tokenInfo?.tokenExpiry) {
        const expiryP = document.createElement('p');
        expiryP.className = 'micro-label token-saved';
        expiryP.textContent = `Token expires: ${new Date(tokenInfo.tokenExpiry).toLocaleDateString()}`;
        el.appendChild(expiryP);
      }
      if (savedAt) {
        const ageDays = (Date.now() - savedAt) / (1000 * 60 * 60 * 24);
        if (ageDays > 60) {
          const rotationP = document.createElement('p');
          rotationP.className = 'micro-label token-rotation';
          rotationP.textContent = `⚠️ Token is ${Math.floor(ageDays)} days old. Consider rotating it for security.`;
          el.appendChild(rotationP);
        }
      }
    } else {
      el.replaceChildren();
      const missingP = document.createElement('p');
      missingP.className = 'micro-label token-missing';
      missingP.textContent = 'No token saved. Add one above.';
      el.appendChild(missingP);
    }
  }
}

/**
 * Render diagnostics info (online status, gist count, current theme, auth telemetry) into the settings UI.
 */
async function loadDiagnostics(container: HTMLElement): Promise<void> {
  const diagnosticsContainer = container.querySelector('#diagnostics-info');
  if (!diagnosticsContainer) return;

  const info = {
    online: networkMonitor.isOnline(),
    gistsCount: gistStore.getGists().length,
    theme: document.documentElement.getAttribute('data-theme'),
    telemetry: await (async () => {
      try {
        return await readTelemetry();
      } catch {
        return null;
      }
    })(),
  };

  diagnosticsContainer.replaceChildren();
  const diagDiv = document.createElement('div');
  diagDiv.className = 'diagnostics-content micro-label';
  const onlineP = document.createElement('p');
  onlineP.textContent = `Online: ${info.online ? 'Yes' : 'No'}`;
  diagDiv.appendChild(onlineP);
  const gistsP = document.createElement('p');
  gistsP.textContent = `Gists: ${info.gistsCount}`;
  diagDiv.appendChild(gistsP);
  const themeP = document.createElement('p');
  themeP.textContent = `Theme: ${info.theme || 'auto'}`;
  diagDiv.appendChild(themeP);
  diagnosticsContainer.appendChild(diagDiv);

  if (info.telemetry) {
    const telemetryRow = document.createElement('p');
    telemetryRow.textContent = `Auth: ${info.telemetry.patCount} PAT, ${info.telemetry.deviceFlowCount} Device Flow`;
    diagnosticsContainer.querySelector('.diagnostics-content')?.appendChild(telemetryRow);
  }
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
 * Load LLM configuration and populate the settings UI.
 */
async function loadLLMSettings(container: HTMLElement): Promise<void> {
  try {
    const config = await loadLLMConfig();
    const providerSelect = container.querySelector('#llm-provider-select') as HTMLSelectElement;
    const apiKeyGroup = container.querySelector('#llm-api-key-group') as HTMLElement;
    const modelGroup = container.querySelector('#llm-model-group') as HTMLElement;
    const apiKeyInput = container.querySelector('#llm-api-key-input') as HTMLInputElement;
    const modelInput = container.querySelector('#llm-model-input') as HTMLInputElement;

    if (providerSelect) {
      providerSelect.value = config.provider;
    }
    if (apiKeyInput && config.apiKey) {
      apiKeyInput.value = config.apiKey;
    }
    if (modelInput && config.model) {
      modelInput.value = config.model;
    }

    // Show/hide provider-specific fields
    updateLLMFieldsVisibility(config.provider, apiKeyGroup, modelGroup);
  } catch {
    // Silently handle - LLM is optional
  }
}

/**
 * Show/hide API key and model fields based on provider selection.
 */
function updateLLMFieldsVisibility(
  provider: string,
  apiKeyGroup: HTMLElement,
  modelGroup: HTMLElement
): void {
  const showApiKey = provider === 'openai';
  const showModel = provider !== 'none';

  apiKeyGroup.style.display = showApiKey ? '' : 'none';
  modelGroup.style.display = showModel ? '' : 'none';
}

/**
 * Bind all event listeners for the settings route (auth, import/export, theme, cache).
 */
function bindEvents(container: HTMLElement, signal: AbortSignal): void {
  const patInput = container.querySelector('#pat-input') as HTMLInputElement;
  const saveTokenBtn = container.querySelector('#save-token-btn') as HTMLButtonElement | null;
  // Enable the SAVE button only when the user has typed a non-empty
  // value. The hint text under the input already explains what's
  // expected, so the disabled state needs no separate aria.
  const syncSaveEnabled = (): void => {
    if (!saveTokenBtn || !patInput) return;
    saveTokenBtn.disabled = patInput.value.trim().length === 0;
  };
  if (patInput) {
    patInput.addEventListener('input', syncSaveEnabled, { signal });
    // Format-on-blur: show an inline error if the value doesn't
    // match a known PAT format. We don't block submission here
    // because GitHub's API will reject a malformed token with a
    // clear error message; the inline warning is just an early
    // signal so the user doesn't wait for a network round-trip.
    patInput.addEventListener(
      'blur',
      () => {
        const value = patInput.value.trim();
        if (!value) {
          clearFieldError(patInput);
          return;
        }
        const looksLikePat = /^(ghp_|github_pat_)/.test(value);
        if (!looksLikePat) {
          showFieldError(patInput, 'Token should start with ghp_ or github_pat_');
        } else {
          clearFieldError(patInput);
        }
      },
      { signal }
    );
  }
  saveTokenBtn?.addEventListener(
    'click',
    () => {
      const input = patInput;
      if (!input.value) return;
      if (saveTokenBtn?.disabled) return;
      // Prevent double-clicks while the save is in flight. The button
      // is re-enabled in the finally block whether the save succeeds
      // or fails.
      const restore = (): void => {
        if (!saveTokenBtn) return;
        saveTokenBtn.disabled = false;
        saveTokenBtn.removeAttribute('aria-busy');
        saveTokenBtn.textContent = 'SAVE TOKEN';
      };
      saveTokenBtn.disabled = true;
      saveTokenBtn.setAttribute('aria-busy', 'true');
      saveTokenBtn.textContent = 'SAVING...';
      void (async () => {
        try {
          const result = await saveToken(input.value);
          if (result.success) {
            toast.success('TOKEN SAVED');
            void recordAuthMethod('pat').catch(noop);
            void recordAuthCompleted().catch(noop);
            await loadTokenInfo(container);
            input.value = '';
          } else {
            toast.error(result.error || 'FAILED TO SAVE TOKEN');
          }
        } catch {
          toast.error('FAILED TO SAVE TOKEN');
        } finally {
          restore();
          syncSaveEnabled();
        }
      })();
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
            statusEl.textContent = 'Authentication successful';
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
          await loadDiagnostics(container);
        })();
        return;
      } else {
        localStorage.setItem('theme-preference', theme);
        initTheme();
      }
      void loadDiagnostics(container);
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
        if (
          await showConfirmDialog({
            title: 'Clear all local data?',
            message:
              'This deletes every cached gist, pending sync, and stored token from this device. Your gists on GitHub are not touched.',
            confirmLabel: 'Clear local cache',
            cancelLabel: 'Keep it',
            variant: 'danger',
          })
        ) {
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

  // LLM provider change
  container.querySelector('#llm-provider-select')?.addEventListener(
    'change',
    (e) => {
      const provider = (e.target as HTMLSelectElement).value;
      const apiKeyGroup = container.querySelector('#llm-api-key-group') as HTMLElement;
      const modelGroup = container.querySelector('#llm-model-group') as HTMLElement;
      updateLLMFieldsVisibility(provider, apiKeyGroup, modelGroup);
    },
    { signal }
  );

  // Save LLM settings
  container.querySelector('#save-llm-btn')?.addEventListener(
    'click',
    () => {
      void (async () => {
        try {
          const providerSelect = container.querySelector(
            '#llm-provider-select'
          ) as HTMLSelectElement;
          const apiKeyInput = container.querySelector('#llm-api-key-input') as HTMLInputElement;
          const modelInput = container.querySelector('#llm-model-input') as HTMLInputElement;

          const config = {
            provider: providerSelect.value as 'none' | 'openai' | 'github-models',
            apiKey: apiKeyInput?.value || undefined,
            model: modelInput?.value || undefined,
            enabled: providerSelect.value !== 'none',
          };

          await saveLLMConfig(config);
          toast.success('LLM SETTINGS SAVED');
        } catch {
          toast.error('FAILED TO SAVE LLM SETTINGS');
        }
      })();
    },
    { signal }
  );
}

async function loadTags(container: HTMLElement): Promise<void> {
  const tagList = container.querySelector('#tag-list');
  if (!tagList) return;

  const tags = await gistStore.getAllTags();
  tagList.innerHTML = '';

  if (tags.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'micro-label';
    emptyMsg.textContent = 'No tags created yet. Create one above.';
    tagList.appendChild(emptyMsg);
    return;
  }

  for (const tag of tags) {
    const item = document.createElement('div');
    item.className = 'tag-list-item';
    item.dataset.tagId = tag.id;

    const colorDot = document.createElement('span');
    colorDot.style.cssText = `width: 12px; height: 12px; border-radius: 50%; background: ${tag.color}; flex-shrink: 0;`;
    item.appendChild(colorDot);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tag-list-item-name';
    nameSpan.textContent = tag.name;
    item.appendChild(nameSpan);

    const gistCount = document.createElement('span');
    gistCount.className = 'micro-label';
    gistCount.textContent = `${tag.gistIds.length} gists`;
    item.appendChild(gistCount);

    const actions = document.createElement('div');
    actions.className = 'tag-list-item-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn btn-ghost btn-sm';
    renameBtn.textContent = 'RENAME';
    renameBtn.dataset.action = 'rename-tag';
    renameBtn.dataset.tagId = tag.id;
    actions.appendChild(renameBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-ghost btn-sm';
    deleteBtn.textContent = 'DELETE';
    deleteBtn.dataset.action = 'delete-tag';
    deleteBtn.dataset.tagId = tag.id;
    actions.appendChild(deleteBtn);

    item.appendChild(actions);
    tagList.appendChild(item);
  }
}

function bindTagEvents(container: HTMLElement, signal: AbortSignal): void {
  container.querySelector('#create-tag-btn')?.addEventListener(
    'click',
    () => {
      void (async () => {
        const nameInput = container.querySelector('#tag-name-input') as HTMLInputElement;
        const colorInput = container.querySelector('#tag-color-input') as HTMLInputElement;

        const name = nameInput?.value.trim();
        const color = colorInput?.value || '#3b82f6';

        if (!name) {
          toast.error('TAG NAME IS REQUIRED');
          return;
        }

        try {
          await gistStore.createTag(name, color);
          toast.success('TAG CREATED');
          nameInput.value = '';
          await loadTags(container);
        } catch {
          toast.error('FAILED TO CREATE TAG');
        }
      })();
    },
    { signal }
  );

  container.querySelector('#tag-list')?.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement;

      if (target.dataset.action === 'rename-tag') {
        const tagId = target.dataset.tagId;
        if (!tagId) return;

        const item = target.closest('.tag-list-item');
        const nameSpan = item?.querySelector('.tag-list-item-name');
        const currentName = nameSpan?.textContent || '';

        const newName = window.prompt('Enter new tag name:', currentName);
        if (newName?.trim() && newName.trim() !== currentName) {
          void (async () => {
            try {
              await gistStore.renameTag(tagId, newName.trim());
              toast.success('TAG RENAMED');
              await loadTags(container);
            } catch {
              toast.error('FAILED TO RENAME TAG');
            }
          })();
        }
      }

      if (target.dataset.action === 'delete-tag') {
        const tagId = target.dataset.tagId;
        if (!tagId) return;

        void (async () => {
          const confirmed = await showConfirmDialog({
            title: 'Delete this tag?',
            message: 'This will remove the tag from all gists. This cannot be undone.',
            confirmLabel: 'Delete tag',
            cancelLabel: 'Keep it',
            variant: 'danger',
          });
          if (!confirmed) return;

          try {
            await gistStore.deleteTag(tagId);
            toast.success('TAG DELETED');
            await loadTags(container);
          } catch {
            toast.error('FAILED TO DELETE TAG');
          }
        })();
      }
    },
    { signal }
  );
}
