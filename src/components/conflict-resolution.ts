/**
 * Conflict Resolution Component
 * Provides UI for viewing and resolving sync conflicts.
 */

import { sanitizeHtml } from '../services/security/dom';
import { safeError } from '../services/security/logger';
import { type GistConflict, getConflicts } from '../services/sync/conflict-detector';
import gistStore from '../stores/gist-store';
import { announcer } from '../utils/announcer';
import { withViewTransition } from '../utils/view-transitions';
import { EmptyState } from './ui/empty-state';
import { toast } from './ui/toast';

let currentConflictId: string | null = null;

/**
 * Render list of all active conflicts.
 */
export function renderConflictList(conflicts: GistConflict[]): string {
  if (conflicts.length === 0) {
    return EmptyState.render({
      title: 'No Conflicts',
      description: 'All your gists are in sync with GitHub',
      actionLabel: 'Go Home',
      actionRoute: 'home',
    });
  }

  return `
    <div class="conflict-list">
      ${conflicts
        .map(
          (c) => `
        <div class="glass-card conflict-item" data-id="${sanitizeHtml(c.gistId)}">
          <div class="conflict-item-header">
            <h3 class="conflict-item-title">${sanitizeHtml(c.localVersion.description || 'UNTITLED GIST')}</h3>
            <span class="micro-label">ID: ${sanitizeHtml(c.gistId.substring(0, 8))}</span>
          </div>
          <div class="conflict-item-meta">
            <span class="detail-chip">CONFLICTING: ${c.conflictingFields.map(sanitizeHtml).join(', ')}</span>
            <span class="micro-label">DETECTED: ${new Date(c.detectedAt).toLocaleString()}</span>
          </div>
          <button class="btn btn-primary resolve-btn" data-id="${c.gistId}">RESOLVE</button>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Render detailed side-by-side comparison for a single conflict.
 */
export function renderConflictDetail(conflict: GistConflict): string {
  const { localVersion: local, remoteVersion: remote, conflictingFields } = conflict;

  return `
    <div class="conflict-detail">
      <header class="detail-header">
        <button class="btn btn-ghost back-to-list">← BACK TO LIST</button>
        <h1 class="detail-title">RESOLVE CONFLICT</h1>
        <p class="micro-label">GIST ID: ${sanitizeHtml(conflict.gistId)}</p>
      </header>

      <div class="comparison-grid">
        <!-- Local Version -->
        <div class="comparison-col local-version">
          <div class="comparison-header">
            <h2 class="comparison-title">LOCAL VERSION</h2>
            <span class="micro-label">YOUR CHANGES</span>
          </div>
          <div class="comparison-body">
            <div class="comp-field ${conflictingFields.includes('description') ? 'has-conflict' : ''}">
              <label class="micro-label">DESCRIPTION</label>
              <div class="comp-value">${local.description ? sanitizeHtml(local.description) : '<i>No description</i>'}</div>
            </div>
            <div class="comp-field ${conflictingFields.includes('public') ? 'has-conflict' : ''}">
              <label class="micro-label">VISIBILITY</label>
              <div class="comp-value">${local.public ? 'PUBLIC' : 'SECRET'}</div>
            </div>
            <div class="comp-field ${conflictingFields.includes('content') ? 'has-conflict' : ''}">
              <label class="micro-label">FILES</label>
              <div class="comp-files">
                ${Object.entries(local.files)
                  .map(
                    ([name, file]) => `
                  <div class="comp-file-item">
                    <span class="file-name">${sanitizeHtml(name)}</span>
                    <span class="file-size">${file.size || 0} bytes</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>
          <button class="btn btn-primary resolve-choice-btn" data-strategy="local-wins">KEEP LOCAL VERSION</button>
        </div>

        <!-- Remote Version -->
        <div class="comparison-col remote-version">
          <div class="comparison-header">
            <h2 class="comparison-title">REMOTE VERSION</h2>
            <span class="micro-label">GITHUB CHANGES</span>
          </div>
          <div class="comparison-body">
            <div class="comp-field ${conflictingFields.includes('description') ? 'has-conflict' : ''}">
              <label class="micro-label">DESCRIPTION</label>
              <div class="comp-value">${remote.description ? sanitizeHtml(remote.description) : '<i>No description</i>'}</div>
            </div>
            <div class="comp-field ${conflictingFields.includes('public') ? 'has-conflict' : ''}">
              <label class="micro-label">VISIBILITY</label>
              <div class="comp-value">${remote.public ? 'PUBLIC' : 'SECRET'}</div>
            </div>
            <div class="comp-field ${conflictingFields.includes('content') ? 'has-conflict' : ''}">
              <label class="micro-label">FILES</label>
              <div class="comp-files">
                ${Object.entries(remote.files)
                  .map(
                    ([name, file]) => `
                  <div class="comp-file-item">
                    <span class="file-name">${sanitizeHtml(name)}</span>
                    <span class="file-size">${file.size || 0} bytes</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          </div>
          <button class="btn btn-ghost resolve-choice-btn" data-strategy="remote-wins">USE REMOTE VERSION</button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Bind event listeners for conflict resolution UI.
 */
export function bindConflictEvents(
  container: HTMLElement,
  onResolve: () => void,
  signal?: AbortSignal
): void {
  // Resolve buttons in list
  container.querySelectorAll('.resolve-btn').forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        currentConflictId = (btn as HTMLElement).dataset.id || null;
        void withViewTransition(async () => {
          await loadConflictResolution(container, onResolve, signal);
        });
      },
      { signal }
    );
  });

  // Back to list button
  container.querySelector('.back-to-list')?.addEventListener(
    'click',
    () => {
      currentConflictId = null;
      void withViewTransition(async () => {
        await loadConflictResolution(container, onResolve, signal);
      });
    },
    { signal }
  );

  // Strategy selection buttons
  container.querySelectorAll('.resolve-choice-btn').forEach((btn) => {
    btn.addEventListener(
      'click',
      () => {
        void (async () => {
          if (!currentConflictId) return;
          const strategy = (btn as HTMLElement).dataset.strategy as 'local-wins' | 'remote-wins';

          try {
            await gistStore.resolveGistConflict(currentConflictId, strategy);
            if (signal?.aborted) return;
            const message = `CONFLICT RESOLVED: ${strategy.toUpperCase()}`;
            toast.success(message);
            announcer.success(message);
            currentConflictId = null;
            onResolve();
            await withViewTransition(async () => {
              await loadConflictResolution(container, onResolve, signal);
            });
          } catch (err) {
            toast.error('FAILED TO RESOLVE CONFLICT');
            safeError('[ConflictResolution] Failed to resolve:', err);
          }
        })();
      },
      { signal }
    );
  });
}

/**
 * Main entry point for conflict resolution view.
 */
export async function loadConflictResolution(
  container: HTMLElement,
  onResolve: () => void = () => {},
  signal?: AbortSignal
): Promise<void> {
  const conflicts = await getConflicts();
  if (signal?.aborted) return;

  if (currentConflictId) {
    const conflict = conflicts.find((c) => c.gistId === currentConflictId);
    if (conflict) {
      container.innerHTML = renderConflictDetail(conflict);
    } else {
      currentConflictId = null;
      container.innerHTML = `
        <header class="detail-header">
          <h1 class="detail-title">SYNC CONFLICTS</h1>
        </header>
        ${renderConflictList(conflicts)}
      `;
    }
  } else {
    container.innerHTML = `
      <header class="detail-header">
        <h1 class="detail-title">SYNC CONFLICTS</h1>
      </header>
      <div class="px-6">
        ${renderConflictList(conflicts)}
      </div>
    `;
  }

  bindConflictEvents(container, onResolve, signal);
}
