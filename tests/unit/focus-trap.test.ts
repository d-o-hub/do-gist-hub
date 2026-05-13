/**
 * Unit tests for FocusTrap utility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FocusTrap, focusTrap } from '../../src/utils/focus-trap';

describe('FocusTrap', () => {
  let container: HTMLElement;
  let btn1: HTMLElement;
  let btn2: HTMLElement;
  let btn3: HTMLElement;
  let trap: FocusTrap;

  /**
   * In jsdom, offsetParent is null for all elements (no layout engine).
   * FocusTrap.getFocusableElements filters out elements with null offsetParent,
   * so we stub it to a non-null value for test elements.
   */
  function stubOffsetParent(el: HTMLElement): void {
    Object.defineProperty(el, 'offsetParent', {
      value: document.body,
      configurable: true,
    });
  }

  beforeEach(() => {
    container = document.createElement('div');
    btn1 = document.createElement('button');
    btn1.id = 'btn1';
    btn2 = document.createElement('button');
    btn2.id = 'btn2';
    btn3 = document.createElement('button');
    btn3.id = 'btn3';
    [btn1, btn2, btn3].forEach(stubOffsetParent);
    container.append(btn1, btn2, btn3);
    document.body.appendChild(container);
    trap = new FocusTrap();
  });

  afterEach(() => {
    trap.deactivate();
    document.body.removeChild(container);
  });

  // ── activate ───────────────────────────────────────────────────

  describe('activate', () => {
    it('focuses the first focusable element', () => {
      trap.activate(container);
      expect(document.activeElement).toBe(btn1);
    });

    it('does nothing when container has no focusable elements', () => {
      const emptyDiv = document.createElement('div');
      document.body.appendChild(emptyDiv);
      trap.activate(emptyDiv);
      expect(document.activeElement).toBe(document.body);
      document.body.removeChild(emptyDiv);
    });

    it('sets previousFocus to current activeElement', () => {
      btn1.focus();
      trap.activate(container);
      expect(document.activeElement).toBe(btn1);
    });

    it('ignores elements with hidden attribute', () => {
      btn1.setAttribute('hidden', '');
      trap.activate(container);
      expect(document.activeElement).toBe(btn2);
    });

    it('ignores disabled elements', () => {
      btn1.setAttribute('disabled', '');
      // Re-stub after setting disabled so offsetParent still works
      stubOffsetParent(btn1);
      trap.activate(container);
      expect(document.activeElement).toBe(btn2);
    });

    it('deactivates previous trap before activating new one', () => {
      const deactivateSpy = vi.spyOn(trap, 'deactivate');
      trap.activate(container);

      const container2 = document.createElement('div');
      const otherBtn = document.createElement('button');
      otherBtn.id = 'other-btn';
      stubOffsetParent(otherBtn);
      container2.appendChild(otherBtn);
      document.body.appendChild(container2);

      trap.activate(container2);
      expect(deactivateSpy).toHaveBeenCalledTimes(2);
      expect(document.activeElement).toBe(otherBtn);
      document.body.removeChild(container2);
    });
  });

  // ── deactivate ─────────────────────────────────────────────────

  describe('deactivate', () => {
    it('restores focus to previously focused element', () => {
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      outside.focus();
      expect(document.activeElement).toBe(outside);

      trap.activate(container);
      trap.deactivate();
      expect(document.activeElement).toBe(outside);
      document.body.removeChild(outside);
    });

    it('is idempotent when called multiple times', () => {
      trap.activate(container);
      trap.deactivate();
      expect(() => trap.deactivate()).not.toThrow();
    });

    it('cleans up abort controller', () => {
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
      trap.activate(container);
      trap.deactivate();
      expect(abortSpy).toHaveBeenCalled();
    });

    it('can be called without prior activation', () => {
      expect(() => trap.deactivate()).not.toThrow();
    });
  });

  // ── Tab key handling ───────────────────────────────────────────

  describe('Tab key handling', () => {
    it('wraps forward from last to first element', () => {
      trap.activate(container);
      btn3.focus();

      btn3.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      expect(document.activeElement).toBe(btn1);
    });

    it('wraps backward from first to last element on Shift+Tab', () => {
      trap.activate(container);
      btn1.focus();

      btn1.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
      );
      expect(document.activeElement).toBe(btn3);
    });

    it('does nothing on non-Tab keys', () => {
      trap.activate(container);
      btn1.focus();

      btn1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(document.activeElement).toBe(btn1);
    });

    it('handles single focusable element without wrapping', () => {
      const single = document.createElement('button');
      single.id = 'single-btn';
      stubOffsetParent(single);
      const singleContainer = document.createElement('div');
      singleContainer.appendChild(single);
      document.body.appendChild(singleContainer);

      trap.activate(singleContainer);
      expect(document.activeElement).toBe(single);

      // Tab on a single element wraps to itself (production behavior)
      single.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      );
      expect(document.activeElement).toBe(single);
      document.body.removeChild(singleContainer);
    });

    it('does nothing when the trap is deactivated (listener removed)', () => {
      trap.activate(container);
      btn1.focus();
      trap.deactivate();

      // After deactivation, Tab listener should be removed via abort
      const caught = btn1.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      );
      // Event should not be cancelled since no listener handles it
      expect(caught).toBe(true);
    });
  });

  // ── Focusable element detection ─────────────────────────────────

  describe('focusable element detection', () => {
    it('finds anchor elements with href', () => {
      const link = document.createElement('a');
      link.setAttribute('href', '#test');
      link.id = 'test-link';
      stubOffsetParent(link);
      container.prepend(link);
      trap.activate(container);
      expect(document.activeElement).toBe(link);
    });

    it('finds input elements', () => {
      const input = document.createElement('input');
      input.id = 'test-input';
      stubOffsetParent(input);
      container.prepend(input);
      trap.activate(container);
      expect(document.activeElement).toBe(input);
    });

    it('finds elements with positive tabindex', () => {
      const div = document.createElement('div');
      div.setAttribute('tabindex', '0');
      div.id = 'test-div';
      stubOffsetParent(div);
      container.prepend(div);
      trap.activate(container);
      expect(document.activeElement).toBe(div);
    });

    it('ignores elements with tabindex=-1', () => {
      const div = document.createElement('div');
      div.setAttribute('tabindex', '-1');
      div.id = 'non-focusable';
      stubOffsetParent(div);
      container.prepend(div);
      trap.activate(container);
      expect(document.activeElement).toBe(btn1);
    });
  });

  // ── Singleton ──────────────────────────────────────────────────

  describe('singleton', () => {
    it('exports a default singleton instance', () => {
      expect(focusTrap).toBeInstanceOf(FocusTrap);
    });
  });
});
