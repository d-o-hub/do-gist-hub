/**
 * Unit tests for src/routes/offline.ts
 * Covers render, updateOfflineStatus, pending operations, conflicts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import syncQueue from '../../src/services/sync/queue';
import { getConflicts } from '../../src/services/sync/conflict-detector';

// Mock the imports used by offline route
vi.mock('../../src/services/sync/queue', () => ({
  default: {
    getQueueLength: vi.fn(),
  },
}));

vi.mock('../../src/services/sync/conflict-detector', () => ({
  getConflicts: vi.fn(),
}));

vi.mock('../../src/components/ui/empty-state', () => ({
  EmptyState: {
    render: vi.fn(({ title }) => `<div class="empty-state">${title}</div>`),
  },
}));

describe('OfflineRoute', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);

    vi.mocked(syncQueue.getQueueLength).mockResolvedValue(0);
    vi.mocked(getConflicts).mockResolvedValue([]);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('renders offline status page with stats', async () => {
    const { render } = await import('../../src/routes/offline');
    await render(container);

    expect(container.innerHTML).toContain('Offline Status');
    expect(container.innerHTML).toContain('PENDING WRITES');
    expect(container.innerHTML).toContain('SYNC CONFLICTS');
    expect(container.innerHTML).toContain('pending-count');
    expect(container.innerHTML).toContain('conflict-count');
  });

  it('shows pending count from sync queue', async () => {
    vi.mocked(syncQueue.getQueueLength).mockResolvedValue(3);

    const { render } = await import('../../src/routes/offline');
    await render(container);

    const pendingEl = container.querySelector('#pending-count');
    expect(pendingEl?.textContent).toBe('3');
  });

  it('shows All Synced message when queue is empty', async () => {
    vi.mocked(syncQueue.getQueueLength).mockResolvedValue(0);

    const { render } = await import('../../src/routes/offline');
    await render(container);

    // With no pending ops, should show synced state
    const opsEl = container.querySelector('#pending-ops');
    expect(opsEl?.innerHTML).toContain('All Synced');
  });

  it('shows pending operation count when operations are queued', async () => {
    vi.mocked(syncQueue.getQueueLength).mockResolvedValue(5);

    const { render } = await import('../../src/routes/offline');
    await render(container);

    const opsEl = container.querySelector('#pending-ops');
    expect(opsEl?.innerHTML).toContain('5 operations waiting');
  });

  it('displays conflict count', async () => {
    vi.mocked(getConflicts).mockResolvedValue([
      { gistId: 'gist-1' } as unknown as Awaited<ReturnType<typeof getConflicts>>[number],
    ]);

    const { render } = await import('../../src/routes/offline');
    await render(container);

    const conflictEl = container.querySelector('#conflict-count');
    expect(conflictEl?.textContent).toBe('1');
  });

  it('conflicts card navigates to conflicts route on click', async () => {
    const { render } = await import('../../src/routes/offline');
    await render(container);

    const navigationHandler = vi.fn();
    window.addEventListener('app:navigate', navigationHandler);

    const conflictCard = container.querySelector('#conflicts-stat-card') as HTMLElement;
    conflictCard?.click();

    expect(navigationHandler).toHaveBeenCalled();
    const event = navigationHandler.mock.calls[0][0] as CustomEvent;
    expect(event.detail.route).toBe('conflicts');

    // Clean up event listener to prevent leaks
    window.removeEventListener('app:navigate', navigationHandler);
  });
});
