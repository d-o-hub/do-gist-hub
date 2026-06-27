/**
 * Conflict Resolution Component
 * Provides UI for viewing and resolving sync conflicts.
 */

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
export function buildConflictList(conflicts: GistConflict[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  if (conflicts.length === 0) {
    frag.appendChild(
      EmptyState.renderToFragment({
        title: 'No Conflicts',
        description: 'All your gists are in sync with GitHub',
        actionLabel: 'Go Home',
        actionRoute: 'home',
      })
    );
    return frag;
  }

  const listDiv = document.createElement('div');
  listDiv.className = 'conflict-list';
  listDiv.dataset.testid = 'conflict-list';

  for (const c of conflicts) {
    const item = document.createElement('div');
    item.className = 'glass-card conflict-item';
    item.dataset.id = c.gistId;

    const itemHeader = document.createElement('div');
    itemHeader.className = 'conflict-item-header';
    const title = document.createElement('h3');
    title.className = 'conflict-item-title';
    title.textContent = c.localVersion.description || 'UNTITLED GIST';
    itemHeader.appendChild(title);
    const idSpan = document.createElement('span');
    idSpan.className = 'micro-label';
    idSpan.textContent = `ID: ${c.gistId.substring(0, 8)}`;
    itemHeader.appendChild(idSpan);
    item.appendChild(itemHeader);

    const meta = document.createElement('div');
    meta.className = 'conflict-item-meta';
    const conflictChip = document.createElement('span');
    conflictChip.className = 'detail-chip';
    conflictChip.textContent = `CONFLICTING: ${c.conflictingFields.join(', ')}`;
    meta.appendChild(conflictChip);
    const detectedLabel = document.createElement('span');
    detectedLabel.className = 'micro-label';
    detectedLabel.textContent = `DETECTED: ${new Date(c.detectedAt).toLocaleString()}`;
    meta.appendChild(detectedLabel);
    item.appendChild(meta);

    const resolveBtn = document.createElement('button');
    resolveBtn.className = 'btn btn-primary resolve-btn';
    resolveBtn.dataset.testid = 'resolve-btn';
    resolveBtn.dataset.id = c.gistId;
    resolveBtn.textContent = 'RESOLVE';
    item.appendChild(resolveBtn);

    listDiv.appendChild(item);
  }
  frag.appendChild(listDiv);
  return frag;
}

/**
 * Render detailed side-by-side comparison for a single conflict.
 */
function buildComparisonCol(
  version: {
    description?: string | null;
    public: boolean;
    files: Record<string, { size?: number }>;
  },
  label: string,
  sublabel: string,
  btnClass: string,
  strategy: 'local-wins' | 'remote-wins',
  testId: string,
  conflictingFields: string[],
  btnLabel: string
): HTMLElement {
  const col = document.createElement('div');
  col.className = `comparison-col ${strategy === 'local-wins' ? 'local-version' : 'remote-version'}`;

  const colHeader = document.createElement('div');
  colHeader.className = 'comparison-header';
  const colTitle = document.createElement('h2');
  colTitle.className = 'comparison-title';
  colTitle.textContent = label;
  colHeader.appendChild(colTitle);
  const colSub = document.createElement('span');
  colSub.className = 'micro-label';
  colSub.textContent = sublabel;
  colHeader.appendChild(colSub);
  col.appendChild(colHeader);

  const body = document.createElement('div');
  body.className = 'comparison-body';

  // Description field
  const descField = document.createElement('div');
  descField.className = `comp-field${conflictingFields.includes('description') ? ' has-conflict' : ''}`;
  const descLabel = document.createElement('label');
  descLabel.className = 'micro-label';
  descLabel.textContent = 'DESCRIPTION';
  descField.appendChild(descLabel);
  const descValue = document.createElement('div');
  descValue.className = 'comp-value';
  if (version.description) {
    descValue.textContent = version.description;
  } else {
    const italic = document.createElement('i');
    italic.textContent = 'No description';
    descValue.appendChild(italic);
  }
  descField.appendChild(descValue);
  body.appendChild(descField);

  // Visibility field
  const visField = document.createElement('div');
  visField.className = `comp-field${conflictingFields.includes('public') ? ' has-conflict' : ''}`;
  const visLabel = document.createElement('label');
  visLabel.className = 'micro-label';
  visLabel.textContent = 'VISIBILITY';
  visField.appendChild(visLabel);
  const visValue = document.createElement('div');
  visValue.className = 'comp-value';
  visValue.textContent = version.public ? 'PUBLIC' : 'SECRET';
  visField.appendChild(visValue);
  body.appendChild(visField);

  // Files field
  const filesField = document.createElement('div');
  filesField.className = `comp-field${conflictingFields.includes('content') ? ' has-conflict' : ''}`;
  const filesLabel = document.createElement('label');
  filesLabel.className = 'micro-label';
  filesLabel.textContent = 'FILES';
  filesField.appendChild(filesLabel);
  const filesDiv = document.createElement('div');
  filesDiv.className = 'comp-files';
  for (const [name, file] of Object.entries(version.files)) {
    const fileItem = document.createElement('div');
    fileItem.className = 'comp-file-item';
    const fileName = document.createElement('span');
    fileName.className = 'file-name';
    fileName.textContent = name;
    fileItem.appendChild(fileName);
    const fileSize = document.createElement('span');
    fileSize.className = 'file-size';
    fileSize.textContent = `${file.size || 0} bytes`;
    fileItem.appendChild(fileSize);
    filesDiv.appendChild(fileItem);
  }
  filesField.appendChild(filesDiv);
  body.appendChild(filesField);

  col.appendChild(body);

  const actionBtn = document.createElement('button');
  actionBtn.className = btnClass;
  actionBtn.dataset.strategy = strategy;
  actionBtn.dataset.testid = testId;
  actionBtn.textContent = btnLabel;
  col.appendChild(actionBtn);

  return col;
}

export function buildConflictDetail(conflict: GistConflict): DocumentFragment {
  const { localVersion: local, remoteVersion: remote, conflictingFields } = conflict;
  const frag = document.createDocumentFragment();

  const wrapper = document.createElement('div');
  wrapper.className = 'conflict-detail';

  const header = document.createElement('header');
  header.className = 'detail-header';
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-ghost back-to-list';
  backBtn.textContent = 'BACK TO LIST';
  header.appendChild(backBtn);
  const h1 = document.createElement('h1');
  h1.className = 'detail-title';
  h1.textContent = 'RESOLVE CONFLICT';
  header.appendChild(h1);
  const gistIdLabel = document.createElement('p');
  gistIdLabel.className = 'micro-label';
  gistIdLabel.textContent = `GIST ID: ${conflict.gistId}`;
  header.appendChild(gistIdLabel);
  wrapper.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'comparison-grid';
  grid.appendChild(
    buildComparisonCol(
      local,
      'LOCAL VERSION',
      'YOUR CHANGES',
      'btn btn-primary resolve-choice-btn',
      'local-wins',
      'resolve-local',
      conflictingFields,
      'KEEP LOCAL VERSION'
    )
  );
  grid.appendChild(
    buildComparisonCol(
      remote,
      'REMOTE VERSION',
      'GITHUB CHANGES',
      'btn btn-ghost resolve-choice-btn',
      'remote-wins',
      'resolve-remote',
      conflictingFields,
      'USE REMOTE VERSION'
    )
  );
  wrapper.appendChild(grid);

  frag.appendChild(wrapper);
  return frag;
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
  onResolve: () => void = () => {
    // Default no-op handler
  },
  signal?: AbortSignal
): Promise<void> {
  const conflicts = await getConflicts();
  if (signal?.aborted) return;

  if (currentConflictId) {
    const conflict = conflicts.find((c) => c.gistId === currentConflictId);
    if (conflict) {
      container.replaceChildren(buildConflictDetail(conflict));
    } else {
      currentConflictId = null;
      container.replaceChildren();
      const header = document.createElement('header');
      header.className = 'detail-header';
      const h1 = document.createElement('h1');
      h1.className = 'detail-title';
      h1.textContent = 'SYNC CONFLICTS';
      header.appendChild(h1);
      container.appendChild(header);
      container.appendChild(buildConflictList(conflicts));
    }
  } else {
    container.replaceChildren();
    const header = document.createElement('header');
    header.className = 'detail-header';
    const h1 = document.createElement('h1');
    h1.className = 'detail-title';
    h1.textContent = 'SYNC CONFLICTS';
    header.appendChild(h1);
    container.appendChild(header);
    const wrapper = document.createElement('div');
    wrapper.className = 'px-6';
    wrapper.appendChild(buildConflictList(conflicts));
    container.appendChild(wrapper);
  }

  bindConflictEvents(container, onResolve, signal);
}
