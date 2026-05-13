/**
 * Unit tests for Navigation Rail Component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/utils/announcer', () => ({
  announcer: {
    announce: vi.fn(),
  },
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { NavRail, navRail } from '../../src/components/ui/nav-rail';
import { announcer } from '../../src/utils/announcer';

// ── Tests ─────────────────────────────────────────────────────────────

describe('NavRail', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    container.className = 'rail-nav';
    container.innerHTML = navRail.render('home');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ── render ──────────────────────────────────────────────────────────

  describe('render', () => {
    it('returns HTML with navigation aside', () => {
      const html = navRail.render('home');

      expect(html).toContain('rail-nav');
      expect(html).toContain('role="navigation"');
      expect(html).toContain('Rail navigation');
    });

    it('renders all navigation items', () => {
      const html = navRail.render('home');

      expect(html).toContain('Home');
      expect(html).toContain('Starred');
      expect(html).toContain('Create');
      expect(html).toContain('Conflicts');
      expect(html).toContain('Offline');
      expect(html).toContain('Settings');
    });

    it('marks active route with active class and aria-current', () => {
      const html = navRail.render('create');

      expect(html).toContain('active');
      expect(html).toContain('aria-current="page"');
    });

    it('does not mark other routes as active', () => {
      const html = navRail.render('starred');

      // Home should not have active class
      expect(html).toContain('data-route="home"');
      // Only one active item (the starred route)
      const activeCount = (html.match(/class="rail-item active"/g) || []).length;
      expect(activeCount).toBe(1);
    });

    it('sets data-testid on each item', () => {
      const html = navRail.render('home');

      expect(html).toContain('data-testid="nav-home"');
      expect(html).toContain('data-testid="nav-create"');
    });
  });

  // ── updateActive ────────────────────────────────────────────────────

  describe('updateActive', () => {
    it('updates active class on mounted nav rail buttons', () => {
      const rail = new NavRail();
      rail.mount(container, 'home');

      rail.updateActive('settings');

      const settingsBtn = container.querySelector(
        '[data-testid="settings-btn"]'
      ) as HTMLElement;
      expect(settingsBtn?.classList.contains('active')).toBe(true);
      expect(settingsBtn?.getAttribute('aria-current')).toBe('page');

      const homeBtn = container.querySelector(
        '[data-testid="nav-home"]'
      ) as HTMLElement;
      expect(homeBtn?.classList.contains('active')).toBe(false);
      expect(homeBtn?.hasAttribute('aria-current')).toBe(false);
    });

    it('calls announcer when active route changes', () => {
      const rail = new NavRail();
      rail.mount(container, 'home');

      rail.updateActive('starred');

      expect(announcer.announce).toHaveBeenCalledWith(
        'Navigation rail updated for starred'
      );
    });
  });

  // ── mount ───────────────────────────────────────────────────────────

  describe('mount', () => {
    it('sets up event listeners on the container', () => {
      const rail = new NavRail();
      rail.mount(container, 'home');

      // Verify items exist after mount
      const items = container.querySelectorAll('.rail-item');
      expect(items.length).toBe(6);
    });

    it('sets initial active state', () => {
      const rail = new NavRail();
      rail.mount(container, 'create');

      const createBtn = container.querySelector(
        '[data-testid="nav-create"]'
      ) as HTMLElement;
      expect(createBtn?.classList.contains('active')).toBe(true);
    });
  });

  // ── keyboard navigation ─────────────────────────────────────────────

  describe('keyboard navigation', () => {
    it('handles Enter key on rail item', () => {
      container.innerHTML = navRail.render('home');
      const rail = new NavRail();
      rail.mount(container, 'home');

      const homeBtn = container.querySelector(
        '[data-testid="nav-home"]'
      ) as HTMLElement;
      expect(homeBtn).not.toBeNull();

      // Simulate Enter key
      homeBtn?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );
    });

    it('handles ArrowDown to focus next item', () => {
      container.innerHTML = navRail.render('home');
      const rail = new NavRail();
      rail.mount(container, 'home');

      const homeBtn = container.querySelector(
        '[data-testid="nav-home"]'
      ) as HTMLElement;
      homeBtn?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );

      const starredBtn = container.querySelector(
        '[data-testid="nav-starred"]'
      ) as HTMLElement;
      expect(document.activeElement).toBe(starredBtn);
    });

    it('handles ArrowUp to focus previous item', () => {
      container.innerHTML = navRail.render('create');
      const rail = new NavRail();
      rail.mount(container, 'create');

      const createBtn = container.querySelector(
        '[data-testid="nav-create"]'
      ) as HTMLElement;
      createBtn?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
      );

      const starredBtn = container.querySelector(
        '[data-testid="nav-starred"]'
      ) as HTMLElement;
      // Should have wrapped from Create up to Starred (index 1 from 2)
      expect(document.activeElement).toBe(starredBtn);
    });

    it('wraps around from first to last on ArrowUp', () => {
      container.innerHTML = navRail.render('home');
      const rail = new NavRail();
      rail.mount(container, 'home');

      const homeBtn = container.querySelector(
        '[data-testid="nav-home"]'
      ) as HTMLElement;
      homeBtn?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
      );

      const settingsBtn = container.querySelector(
        '[data-testid="settings-btn"]'
      ) as HTMLElement;
      expect(document.activeElement).toBe(settingsBtn);
    });

    it('wraps around from last to first on ArrowDown', () => {
      container.innerHTML = navRail.render('home');
      const rail = new NavRail();
      rail.mount(container, 'home');

      const settingsBtn = container.querySelector(
        '[data-testid="settings-btn"]'
      ) as HTMLElement;
      settingsBtn?.focus();
      // Dispatch from the focused element
      settingsBtn?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
      );

      const homeBtn = container.querySelector(
        '[data-testid="nav-home"]'
      ) as HTMLElement;
      expect(document.activeElement).toBe(homeBtn);
    });
  });

  // ── singleton ───────────────────────────────────────────────────────

  describe('singleton', () => {
    it('exports a default singleton instance', () => {
      expect(navRail).toBeInstanceOf(NavRail);
    });
  });
});
