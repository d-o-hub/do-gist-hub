/**
 * Unit tests for Navigation Keyboard Handler
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NavKeyboardHandler } from '../../src/utils/nav-keyboard';

describe('NavKeyboardHandler', () => {
  let container: HTMLElement;
  let items: HTMLElement[];

  function createItems(count: number): HTMLElement[] {
    return Array.from({ length: count }, (_, i) => {
      const el = document.createElement('div');
      el.setAttribute('role', 'menuitem');
      el.setAttribute('tabindex', '-1');
      el.id = `item-${i}`;
      return el;
    });
  }

  beforeEach(() => {
    container = document.createElement('nav');
    items = createItems(3);
    items.forEach((item) => container.appendChild(item));
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  // ── Constructor ───────────────────────────────────────────────────

  describe('constructor', () => {
    it('finds all menuitem elements', () => {
      const handler = new NavKeyboardHandler(container);
      expect((handler as unknown as { items: HTMLElement[] }).items).toHaveLength(3);
      handler.destroy();
    });

    it('finds elements with data-route attribute', () => {
      container.innerHTML = '';
      const routeItem = document.createElement('a');
      routeItem.setAttribute('data-route', 'home');
      container.appendChild(routeItem);
      const otherItem = document.createElement('div');
      otherItem.setAttribute('role', 'menuitem');
      container.appendChild(otherItem);

      const handler = new NavKeyboardHandler(container);
      const privateItems = (handler as unknown as { items: HTMLElement[] }).items;
      expect(privateItems).toHaveLength(2);
      handler.destroy();
    });

    it('filters out non-HTMLElement nodes', () => {
      container.innerHTML = '';
      const textNode = document.createTextNode('text');
      container.appendChild(textNode);
      const item = document.createElement('div');
      item.setAttribute('role', 'menuitem');
      container.appendChild(item);

      const handler = new NavKeyboardHandler(container);
      const privateItems = (handler as unknown as { items: HTMLElement[] }).items;
      expect(privateItems).toHaveLength(1);
      handler.destroy();
    });

    it('handles empty container', () => {
      const emptyDiv = document.createElement('div');
      const handler = new NavKeyboardHandler(emptyDiv);
      const privateItems = (handler as unknown as { items: HTMLElement[] }).items;
      expect(privateItems).toHaveLength(0);
      handler.destroy();
    });
  });

  // ── Arrow Key Navigation ──────────────────────────────────────────

  describe('arrow key navigation', () => {
    it('focuses next item on ArrowDown', () => {
      const handler = new NavKeyboardHandler(container);
      items[0].focus();

      container.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      expect(document.activeElement).toBe(items[1]);
      handler.destroy();
    });

    it('focuses next item on ArrowRight', () => {
      const handler = new NavKeyboardHandler(container);
      items[0].focus();

      container.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      expect(document.activeElement).toBe(items[1]);
      handler.destroy();
    });

    it('focuses previous item on ArrowUp', () => {
      const handler = new NavKeyboardHandler(container);
      items[2].focus();

      container.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
      expect(document.activeElement).toBe(items[1]);
      handler.destroy();
    });

    it('focuses previous item on ArrowLeft', () => {
      const handler = new NavKeyboardHandler(container);
      items[2].focus();

      container.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      expect(document.activeElement).toBe(items[1]);
      handler.destroy();
    });

    it('wraps from last to first item on ArrowDown', () => {
      const handler = new NavKeyboardHandler(container);
      items[2].focus();

      container.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      expect(document.activeElement).toBe(items[0]);
      handler.destroy();
    });

    it('wraps from first to last item on ArrowUp', () => {
      const handler = new NavKeyboardHandler(container);
      items[0].focus();

      container.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
      expect(document.activeElement).toBe(items[2]);
      handler.destroy();
    });

    it('prevents default on arrow key events', () => {
      const handler = new NavKeyboardHandler(container);
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      const defaultPrevented = !container.dispatchEvent(event);
      expect(defaultPrevented).toBe(true);
      handler.destroy();
    });

    it('does not wrap when there are no items', () => {
      const emptyDiv = document.createElement('div');
      const handler = new NavKeyboardHandler(emptyDiv);
      // Should not throw
      expect(() => {
        emptyDiv.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
        );
      }).not.toThrow();
      handler.destroy();
    });
  });

  // ── Home / End Navigation ────────────────────────────────────────

  describe('Home / End navigation', () => {
    it('focuses first item on Home', () => {
      const handler = new NavKeyboardHandler(container);
      items[2].focus();

      container.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
      );
      expect(document.activeElement).toBe(items[0]);
      handler.destroy();
    });

    it('focuses last item on End', () => {
      const handler = new NavKeyboardHandler(container);
      items[0].focus();

      container.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
      );
      expect(document.activeElement).toBe(items[2]);
      handler.destroy();
    });

    it('prevents default on Home/End', () => {
      const handler = new NavKeyboardHandler(container);
      const homeEvent = new KeyboardEvent('keydown', {
        key: 'Home',
        bubbles: true,
        cancelable: true,
      });
      const homePrevented = !container.dispatchEvent(homeEvent);
      expect(homePrevented).toBe(true);

      const endEvent = new KeyboardEvent('keydown', {
        key: 'End',
        bubbles: true,
        cancelable: true,
      });
      const endPrevented = !container.dispatchEvent(endEvent);
      expect(endPrevented).toBe(true);
      handler.destroy();
    });
  });

  // ── Focus Tracking ────────────────────────────────────────────────

  describe('focus tracking', () => {
    it('updates currentIndex when an item receives focus', () => {
      const handler = new NavKeyboardHandler(container);

      items[2].focus();
      items[2].dispatchEvent(new FocusEvent('focus', { bubbles: false }));

      // ArrowUp should now go to item[1] since currentIndex is 2
      container.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
      expect(document.activeElement).toBe(items[1]);
      handler.destroy();
    });

    it('tracks focus on all items', () => {
      const handler = new NavKeyboardHandler(container);

      items[0].focus();
      items[0].dispatchEvent(new FocusEvent('focus', { bubbles: false }));

      items[1].focus();
      items[1].dispatchEvent(new FocusEvent('focus', { bubbles: false }));

      // ArrowDown should go to item[2] since currentIndex is 1
      container.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      expect(document.activeElement).toBe(items[2]);
      handler.destroy();
    });
  });

  // ── Lifecycle ─────────────────────────────────────────────────────

  describe('lifecycle', () => {
    it('destroy removes all event listeners', () => {
      const handler = new NavKeyboardHandler(container);
      handler.destroy();

      // After destroy, keydown should not trigger navigation
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      });
      const notPrevented = container.dispatchEvent(event);
      // Should be cancelled only if a listener handled it
      expect(notPrevented).toBe(true);
    });

    it('destroy clears items array', () => {
      const handler = new NavKeyboardHandler(container);
      handler.destroy();
      const privateItems = (handler as unknown as { items: HTMLElement[] }).items;
      expect(privateItems).toHaveLength(0);
    });

    it('destroy is idempotent', () => {
      const handler = new NavKeyboardHandler(container);
      handler.destroy();
      expect(() => handler.destroy()).not.toThrow();
    });
  });
});
