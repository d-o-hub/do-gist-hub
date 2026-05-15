/**
 * Offline Route
 */

import { EmptyState } from '../components/ui/empty-state';
import { lifecycle } from '../services/lifecycle';
import { sanitizeHtml } from '../services/security/dom';
import { getConflicts } from '../services/sync/conflict-detector';
import syncQueue from '../services/sync/queue';

export async function render(container: HTMLElement): Promise<void> {
  const signal = lifecycle.getRouteSignal();

  container.innerHTML = `
    <div class="route-offline">
      <header class="detail-header">
          <h2 class="detail-title">Offline Status</h2>
      </header>
        <div class="offline-stats">
            <div class="stat-card">
                <div class="stat-label">PENDING WRITES</div>
                <div class="stat-value" id="pending-count">0</div>
            </div>
            <div class="stat-card clickable" id="conflicts-stat-card">
                <div class="stat-label">SYNC CONFLICTS</div>
                <div class="stat-value" id="conflict-count">0</div>
            </div>
        </div>
      <div class="pending-operations pending-ops-mt" id="pending-ops"></div>
    </div>
  `;

  await updateOfflineStatus(container);

  window.addEventListener(
    'app:sync-change',
    () => {
      if (document.contains(container)) {
        void updateOfflineStatus(container);
      }
    },
    { signal }
  );

  container.querySelector('#conflicts-stat-card')?.addEventListener(
    'click',
    () => {
      window.dispatchEvent(new CustomEvent('app:navigate', { detail: { route: 'conflicts' } }));
    },
    { signal }
  );
}

async function updateOfflineStatus(container: HTMLElement): Promise<void> {
  const pendingEl = container.querySelector('#pending-count');
  const count = await syncQueue.getQueueLength();
  if (pendingEl) pendingEl.textContent = String(count);

  const opsEl = container.querySelector('#pending-ops');
  if (opsEl) {
    const content =
      count > 0
        ? `<div class="glass-card p-6 text-center">
             <p class="micro-label">${sanitizeHtml(String(count))} operation${count !== 1 ? 's' : ''} waiting for connection</p>
           </div>`
        : EmptyState.render({
            title: 'All Synced',
            description: 'Your local changes are fully synced with GitHub',
            actionLabel: 'Go Home',
            actionRoute: 'home',
          });

    opsEl.innerHTML = `<h3 class="form-label mb-4">Pending Operations</h3>${content}`;
  }

  const conflicts = await getConflicts();
  const conflictEl = container.querySelector('#conflict-count');
  if (conflictEl) conflictEl.textContent = String(conflicts.length);
}
