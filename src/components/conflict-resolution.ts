/**
 * Conflict Resolution UI
 * Displays sync conflicts and allows users to choose resolution strategy.
 */

import {
  GistConflict,
  getConflicts,
  resolveConflict,
  clearConflict,
} from '../services/sync/conflict-detector';
import { saveGist } from '../services/db';
import { withViewTransition } from '../utils/view-transitions';
import { toast } from './ui/toast';

/**
 * Render the list of gists with sync conflicts
 */
export function renderConflictList(conflicts: GistConflict[]): string {
  if (conflicts.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <div class="empty-text">NO SYNC CONFLICTS FOUND</div>
        <div class="empty-subtext">ALL YOUR GISTS ARE IN SYNC.</div>
      </div>
    `;
  }

  return `
    <div class="conflict-list">
      ${conflicts
        .map(
          (c) => `
        <div class="glass-card conflict-item" data-gist-id="${c.gistId}">
          <div class="conflict-item-info">
            <div class="micro-label">GIST ID: ${c.gistId}</div>
            <div class="conflict-item-title">${c.localVersion.description || 'UNTITLED GIST'}</div>
            <div class="conflict-item-meta">DETECTED AT ${new Date(
              c.detectedAt
            ).toLocaleString()}</div>
          </div>
          <button class="btn btn-ghost resolve-btn" data-gist-id="${c.gistId}">RESOLVE</button>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Render side-by-side comparison for a specific conflict
 */
export function renderConflictDetail(conflict: GistConflict): string {
  const local = conflict.localVersion;
  const remote = conflict.remoteVersion;

  const isDiff = (field: string): boolean => conflict.conflictingFields.includes(field);

  return `
    <div class="conflict-detail">
      <header class="detail-header">
        <button class="btn btn-ghost" id="back-to-conflicts">← BACK</button>
        <h1 class="detail-title">RESOLVE CONFLICT</h1>
        <div class="micro-label">GIST ID: ${conflict.gistId}</div>
      </header>

      <div class="conflict-comparison-scroll">
        <div class="conflict-comparison">
          <div class="conflict-grid">
            <div class="conflict-header-cell">LOCAL VERSION</div>
            <div class="conflict-header-cell">REMOTE VERSION</div>

            <!-- Description -->
            <div class="conflict-field ${isDiff('description') ? 'diff' : ''}">
              <div class="micro-label">DESCRIPTION</div>
              <div class="field-value">${local.description || 'NO DESCRIPTION'}</div>
            </div>
            <div class="conflict-field ${isDiff('description') ? 'diff' : ''}">
              <div class="micro-label">DESCRIPTION</div>
              <div class="field-value">${remote.description || 'NO DESCRIPTION'}</div>
            </div>

            <!-- Public/Private -->
            <div class="conflict-field ${isDiff('public') ? 'diff' : ''}">
              <div class="micro-label">VISIBILITY</div>
              <div class="field-value">${local.public ? 'PUBLIC' : 'PRIVATE'}</div>
            </div>
            <div class="conflict-field ${isDiff('public') ? 'diff' : ''}">
              <div class="micro-label">VISIBILITY</div>
              <div class="field-value">${remote.public ? 'PUBLIC' : 'PRIVATE'}</div>
            </div>

            <!-- Files -->
            <div class="conflict-field ${isDiff('content') ? 'diff' : ''}">
              <div class="micro-label">FILES</div>
              <div class="field-value files-list">
                ${Object.values(local.files)
                  .map(
                    (f) => `
                  <div class="file-item">
                    <span class="file-name">${f.filename}</span>
                    <span class="file-size">${f.size} BYTES</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
            <div class="conflict-field ${isDiff('content') ? 'diff' : ''}">
              <div class="micro-label">FILES</div>
              <div class="field-value files-list">
                ${Object.values(remote.files)
                  .map(
                    (f) => `
                  <div class="file-item">
                    <span class="file-name">${f.filename}</span>
                    <span class="file-size">${f.size} BYTES</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="conflict-actions">
        <button class="btn btn-primary" id="keep-local-btn">KEEP LOCAL</button>
        <button class="btn btn-primary" id="use-remote-btn">USE REMOTE</button>
      </div>
    </div>
  `;
}

/**
 * Bind event listeners for conflict resolution
 */
export function bindConflictEvents(container: HTMLElement, _onResolve: () => void): void {
  // List view events
  container.querySelectorAll('.resolve-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.gistId;
      if (id) {
        const event = new CustomEvent('conflict:select', { detail: { id } });
        container.dispatchEvent(event);
      }
    });
  });

  // Detail view events
  container.querySelector('#back-to-conflicts')?.addEventListener('click', () => {
    container.dispatchEvent(new CustomEvent('conflict:back'));
  });

  container.querySelector('#keep-local-btn')?.addEventListener('click', () => {
    container.dispatchEvent(
      new CustomEvent('conflict:resolve', { detail: { strategy: 'local-wins' } })
    );
  });

  container.querySelector('#use-remote-btn')?.addEventListener('click', () => {
    container.dispatchEvent(
      new CustomEvent('conflict:resolve', { detail: { strategy: 'remote-wins' } })
    );
  });
}

/**
 * Load and manage conflict resolution UI
 */
export async function loadConflictResolution(container: HTMLElement): Promise<void> {
  let conflicts = await getConflicts();
  let selectedConflictId: string | null = null;

  const render = async (): Promise<void> => {
    const selectedConflict = conflicts.find((c) => c.gistId === selectedConflictId);

    await withViewTransition(async () => {
      if (selectedConflict) {
        container.innerHTML = renderConflictDetail(selectedConflict);
      } else {
        container.innerHTML = `
          <header class="detail-header">
            <h1 class="detail-title">SYNC CONFLICTS</h1>
          </header>
          <div class="conflict-list-container">
            ${renderConflictList(conflicts)}
          </div>
        `;
      }

      bindConflictEvents(container, () => {});
      return Promise.resolve();
    });
  };

  container.addEventListener('conflict:select', ((e: Event) => {
    const customEvent = e as CustomEvent;
    selectedConflictId = (customEvent.detail as { id: string }).id;
    void render();
  }) as EventListener);

  container.addEventListener('conflict:back', () => {
    selectedConflictId = null;
    void render();
  });

  container.addEventListener('conflict:resolve', ((e: Event) => {
    const customEvent = e as CustomEvent;
    const selectedConflict = conflicts.find((c) => c.gistId === selectedConflictId);
    if (selectedConflict) {
      const resolve = async (): Promise<void> => {
        try {
          const strategy = (customEvent.detail as { strategy: string }).strategy;
          const resolved = resolveConflict(
            selectedConflict,
            strategy as 'local-wins' | 'remote-wins' | 'manual'
          );
          await saveGist(resolved);
          await clearConflict(selectedConflict.gistId);

          toast.success(`CONFLICT RESOLVED: ${strategy.toUpperCase()}`);

          // Refresh list
          conflicts = await getConflicts();
          selectedConflictId = null;
          await render();

          // Notify app to refresh store
          window.dispatchEvent(new CustomEvent('app:sync-complete'));
        } catch (error) {
          console.error('[ConflictResolution] Resolve failed:', error);
          toast.error('FAILED TO RESOLVE CONFLICT');
        }
      };
      void resolve();
    }
  }) as EventListener);

  await render();
}
