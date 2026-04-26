/**
 * Conflict Resolution Component
 * Provides UI for viewing and resolving sync conflicts.
 */

import { GistConflict, getConflicts } from '../services/sync/conflict-detector';
import gistStore from '../stores/gist-store';
import { toast } from './ui/toast';
import { EmptyState } from './ui/empty-state';
import { withViewTransition } from '../utils/view-transitions';
import { safeError } from '../services/security/logger';
import { announcer } from '../utils/announcer';
import { sanitizeHtml } from '../services/security/dom';

let currentConflictId: string | null = null;

/**
 * Render list of all active conflicts.
 */
export function renderConflictList(conflicts: GistConflict[]): string {
  if (conflicts.length === 0) {
    return EmptyState.render({
      title: 'No Conflicts',
      description: 'All your gists are in sync with GitHub',
      icon: '✅',
      actionLabel: 'Go Home',
      actionRoute: 'home',
    });
  }

  return `
    <div class="conflict-list">
      ${conflicts
        .map(
          (c) => `
        <div class="glass-card conflict-item" data-id="${c.gistId}">
          <div class="conflict-item-header">
            <h3 class="conflict-item-title">${sanitizeHtml(c.localVersion.description || 'UNTITLED GIST')}</h3>
            <span class="micro-label">ID: ${c.gistId.substring(0, 8)}</span>
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

interface VersionData {
  description: string | null;
  public: boolean;
  files: Record<string, { size?: number }>;
}

function renderFiles(files: Record<string, { size?: number }>): string {
  return Object.entries(files)
    .map(
      ([name, file]) => `
                  <div class="comp-file-item">
                    <span class="file-name">${sanitizeHtml(name)}</span>
                    <span class="file-size">${file.size || 0} bytes</span>
                  </div>
                `
    )
    .join('');
}

function renderComparisonColumn(
  colClass: string,
  title: string,
  subtitle: string,
  version: VersionData,
  conflictingFields: string[],
  btnClass: string,
  strategy: string,
  btnText: string
): string {
  return `
        <div class="comparison-col ${colClass}">
          <div class="comparison-header">
            <h2 class="comparison-title">${title}</h2>
            <span class="micro-label">${subtitle}</span>
          </div>
          <div class="comparison-body">
            <div class="comp-field ${conflictingFields.includes('description') ? 'has-conflict' : ''}">
              <label class="micro-label">DESCRIPTION</label>
              <div class="comp-value">${version.description ? sanitizeHtml(version.description) : '<i>No description</i>'}</div>
            </div>
            <div class="comp-field ${conflictingFields.includes('public') ? 'has-conflict' : ''}">
              <label class="micro-label">VISIBILITY</label>
              <div class="comp-value">${version.public ? 'PUBLIC' : 'SECRET'}</div>
            </div>
            <div class="comp-field ${conflictingFields.includes('content') ? 'has-conflict' : ''}">
              <label class="micro-label">FILES</label>
              <div class="comp-files">
                ${renderFiles(version.files)}
              </div>
            </div>
          </div>
          <button class="btn ${btnClass} resolve-choice-btn" data-strategy="${strategy}">${btnText}</button>
        </div>`;
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
        <p class="micro-label">GIST ID: ${conflict.gistId}</p>
      </header>

      <div class="comparison-grid">
        <!-- Local Version -->
        ${renderComparisonColumn(
          'local-version',
          'LOCAL VERSION',
          'YOUR CHANGES',
          local,
          conflictingFields,
          'btn-primary',
          'local-wins',
          'KEEP LOCAL VERSION'
        )}

        <!-- Remote Version -->
        ${renderComparisonColumn(
          'remote-version',
          'REMOTE VERSION',
          'GITHUB CHANGES',
          remote,
          conflictingFields,
          'btn-ghost',
          'remote-wins',
          'USE REMOTE VERSION'
        )}
      </div>
    </div>
  `;
}

/**
 * Bind event listeners for conflict resolution UI.
 */
export function bindConflictEvents(container: HTMLElement, onResolve: () => void): void {
  // Resolve buttons in list
  container.querySelectorAll('.resolve-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentConflictId = (btn as HTMLElement).dataset.id || null;
      void withViewTransition(async () => {
        await loadConflictResolution(container, onResolve);
      });
    });
  });

  // Back to list button
  container.querySelector('.back-to-list')?.addEventListener('click', () => {
    currentConflictId = null;
    void withViewTransition(async () => {
      await loadConflictResolution(container, onResolve);
    });
  });

  // Strategy selection buttons
  container.querySelectorAll('.resolve-choice-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      void (async () => {
        if (!currentConflictId) return;
        const strategy = (btn as HTMLElement).dataset.strategy as 'local-wins' | 'remote-wins';

        try {
          await gistStore.resolveGistConflict(currentConflictId, strategy);
          const message = `CONFLICT RESOLVED: ${strategy.toUpperCase()}`;
          toast.success(message);
          announcer.success(message);
          currentConflictId = null;
          onResolve();
          await withViewTransition(async () => {
            await loadConflictResolution(container, onResolve);
          });
        } catch (err) {
          toast.error('FAILED TO RESOLVE CONFLICT');
          safeError('[ConflictResolution] Failed to resolve:', err);
        }
      })();
    });
  });
}

/**
 * Main entry point for conflict resolution view.
 */
export async function loadConflictResolution(
  container: HTMLElement,
  onResolve: () => void = () => {}
): Promise<void> {
  const conflicts = await getConflicts();

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
      <div style="padding: 0 var(--space-6);">
        ${renderConflictList(conflicts)}
      </div>
    `;
  }

  bindConflictEvents(container, onResolve);
}
