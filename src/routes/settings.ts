/**
 * Settings Route
 */

import { toast } from '../components/ui/toast';
import { getToken, removeToken, saveToken } from '../services/github/auth';
import networkMonitor from '../services/network/offline-monitor';
import { redactToken, sanitizeHtml } from '../services/security';
import { safeError } from '../services/security/logger';
import gistStore from '../stores/gist-store';
import { initTheme } from '../tokens/design-tokens';
import { showConfirmDialog } from '../utils/dialog';

export async function render(
  container: HTMLElement,
  params?: Record<string, string>
): Promise<void> {
  const currentTheme = params?.currentTheme || 'auto';

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
              </select>
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
  bindEvents(container);
}

async function loadTokenInfo(container: HTMLElement): Promise<void> {
  const el = container.querySelector('#token-status');
  const token = await getToken();
  if (el) {
    if (token) {
      el.innerHTML = `<p class="micro-label token-saved">Token active: ${sanitizeHtml(redactToken(token))}</p>`;
    } else {
      el.innerHTML = '<p class="micro-label token-missing">No token saved. Add one above.</p>';
    }
  }
}

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

function bindEvents(container: HTMLElement): void {
  container.querySelector('#save-token-btn')?.addEventListener('click', () => {
    const input = container.querySelector('#pat-input') as HTMLInputElement;
    if (input.value) {
      void (async () => {
        await saveToken(input.value);
        toast.success('TOKEN SAVED');
        await loadTokenInfo(container);
        input.value = '';
      })();
    } else {
      toast.error('ENTER A TOKEN');
    }
  });

  container.querySelector('#remove-token-btn')?.addEventListener('click', () => {
    void (async () => {
      await removeToken();
      toast.success('TOKEN REMOVED');
      await loadTokenInfo(container);
    })();
  });

  container.querySelector('#theme-select')?.addEventListener('change', (e) => {
    const theme = (e.target as HTMLSelectElement).value as 'light' | 'dark' | 'auto' | 'time';
    localStorage.setItem('theme-preference', theme);
    initTheme();
    loadDiagnostics(container);
  });

  container.querySelector('#export-all-btn')?.addEventListener('click', () => {
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
  });

  container.querySelector('#import-btn')?.addEventListener('click', () => {
    (container.querySelector('#import-file-input') as HTMLInputElement)?.click();
  });

  container.querySelector('#import-file-input')?.addEventListener('change', (e) => {
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
  });

  container.querySelector('#clear-cache-btn')?.addEventListener('click', () => {
    void (async () => {
      if (await showConfirmDialog('CLEAR ALL LOCAL DATA?')) {
        const { clearAllData } = await import('../services/db');
        await clearAllData();
        window.location.reload();
      }
    })();
  });

  container.querySelector('#export-data-btn')?.addEventListener('click', () => {
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
  });
}
