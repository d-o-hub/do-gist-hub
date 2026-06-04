/**
 * Offline Route
 */

import { EmptyState } from '../components/ui/empty-state';
import { lifecycle } from '../services/lifecycle';
import { getConflicts } from '../services/sync/conflict-detector';
import syncQueue from '../services/sync/queue';

export async function render(container: HTMLElement): Promise<void> {
  const signal = lifecycle.getRouteSignal();

  container.replaceChildren(buildOfflineShell());

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

function buildOfflineShell(): DocumentFragment {
  const frag = document.createDocumentFragment();
  const wrapper = document.createElement('div');
  wrapper.className = 'route-offline';

  const header = document.createElement('header');
  header.className = 'detail-header';
  const h2 = document.createElement('h2');
  h2.className = 'detail-title';
  h2.textContent = 'Offline Status';
  header.appendChild(h2);
  wrapper.appendChild(header);

  const stats = document.createElement('div');
  stats.className = 'offline-stats';

  const pendingCard = document.createElement('div');
  pendingCard.className = 'stat-card';
  const pendingLabel = document.createElement('div');
  pendingLabel.className = 'stat-label';
  pendingLabel.textContent = 'PENDING WRITES';
  pendingCard.appendChild(pendingLabel);
  const pendingValue = document.createElement('div');
  pendingValue.className = 'stat-value';
  pendingValue.id = 'pending-count';
  pendingValue.textContent = '0';
  pendingCard.appendChild(pendingValue);
  stats.appendChild(pendingCard);

  const conflictCard = document.createElement('div');
  conflictCard.className = 'stat-card clickable';
  conflictCard.id = 'conflicts-stat-card';
  conflictCard.dataset.testid = 'conflicts-stat-card';
  const conflictLabel = document.createElement('div');
  conflictLabel.className = 'stat-label';
  conflictLabel.textContent = 'SYNC CONFLICTS';
  conflictCard.appendChild(conflictLabel);
  const conflictValue = document.createElement('div');
  conflictValue.className = 'stat-value';
  conflictValue.id = 'conflict-count';
  conflictValue.dataset.testid = 'conflict-count';
  conflictValue.textContent = '0';
  conflictCard.appendChild(conflictValue);
  stats.appendChild(conflictCard);

  wrapper.appendChild(stats);

  const ops = document.createElement('div');
  ops.className = 'pending-operations pending-ops-mt';
  ops.id = 'pending-ops';
  wrapper.appendChild(ops);

  frag.appendChild(wrapper);
  return frag;
}

async function updateOfflineStatus(container: HTMLElement): Promise<void> {
  const pendingEl = container.querySelector('#pending-count');
  const count = await syncQueue.getQueueLength();
  if (pendingEl) pendingEl.textContent = String(count);

  const opsEl = container.querySelector('#pending-ops');
  if (opsEl) {
    opsEl.replaceChildren();

    const heading = document.createElement('h3');
    heading.className = 'form-label mb-4';
    heading.textContent = 'Pending Operations';
    opsEl.appendChild(heading);

    if (count > 0) {
      const card = document.createElement('div');
      card.className = 'glass-card p-6 text-center';
      const p = document.createElement('p');
      p.className = 'micro-label';
      p.textContent = `${count} operation${count !== 1 ? 's' : ''} waiting for connection`;
      card.appendChild(p);
      opsEl.appendChild(card);
    } else {
      opsEl.appendChild(
        EmptyState.renderToFragment({
          title: 'All Synced',
          description: 'Your local changes are fully synced with GitHub',
          actionLabel: 'Go Home',
          actionRoute: 'home',
        })
      );
    }
  }

  const conflicts = await getConflicts();
  const conflictEl = container.querySelector('#conflict-count');
  if (conflictEl) conflictEl.textContent = String(conflicts.length);
}
