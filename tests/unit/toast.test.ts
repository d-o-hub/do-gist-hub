/**
 * Unit tests for Toast Notification System
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/security', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { ToastManager, toast } from '../../src/components/ui/toast';

// ── Tests ─────────────────────────────────────────────────────────────

describe('ToastManager', () => {
  let manager: ToastManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    manager = new ToastManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Cleanup DOM
    const container = document.getElementById('toast-container');
    if (container) container.remove();
  });

  // ── Container ───────────────────────────────────────────────────────

  describe('container', () => {
    it('creates toast container on first show', () => {
      manager.show('Test message');

      const container = document.getElementById('toast-container');
      expect(container).not.toBeNull();
      expect(container?.getAttribute('role')).toBe('region');
      expect(container?.getAttribute('aria-label')).toBe('Notifications');
      expect(container?.getAttribute('aria-live')).toBe('polite');
      expect(container?.getAttribute('aria-atomic')).toBe('true');
    });

    it('reuses existing container', () => {
      manager.show('First');
      manager.show('Second');

      const container = document.getElementById('toast-container');
      expect(container?.children.length).toBe(2);
    });
  });

  // ── show ────────────────────────────────────────────────────────────

  describe('show', () => {
    it('creates toast element with correct attributes', () => {
      const id = manager.show('Hello world');

      const toastEl = document.getElementById(id);
      expect(toastEl).not.toBeNull();
      expect(toastEl?.getAttribute('role')).toBe('alert');
      expect(toastEl?.classList.contains('toast')).toBe(true);
      expect(toastEl?.classList.contains('toast-info')).toBe(true);
      expect(toastEl?.classList.contains('toast-enter')).toBe(true);
    });

    it('renders message text', () => {
      const id = manager.show('Operation successful');

      const toastEl = document.getElementById(id);
      expect(toastEl?.textContent).toContain('Operation successful');
    });

    it('renders close button', () => {
      const id = manager.show('Dismiss me');

      const toastEl = document.getElementById(id);
      const closeBtn = toastEl?.querySelector('.toast-close');
      expect(closeBtn).not.toBeNull();
      expect(closeBtn?.getAttribute('aria-label')).toBe('Dismiss notification');
    });

    it('returns a unique id', () => {
      const id1 = manager.show('One');
      const id2 = manager.show('Two');

      expect(id1).not.toBe(id2);
    });

    it('applies type-specific class', () => {
      const id = manager.show('Error!', 'error');

      const toastEl = document.getElementById(id);
      expect(toastEl?.classList.contains('toast-error')).toBe(true);
    });

    it('renders action button when action is provided', () => {
      const id = manager.show('Action toast', 'info', 4000, {
        label: 'Undo',
        onClick: vi.fn(),
      });

      const toastEl = document.getElementById(id);
      const actionBtn = toastEl?.querySelector('.toast-action');
      expect(actionBtn).not.toBeNull();
      expect(actionBtn?.textContent).toBe('Undo');
    });

    it('does not render action button when action is not provided', () => {
      const id = manager.show('No action');

      const toastEl = document.getElementById(id);
      expect(toastEl?.querySelector('.toast-action')).toBeNull();
    });

    it('auto-dismisses after durationMs', () => {
      const id = manager.show('Auto dismiss', 'info', 2000);
      expect(document.getElementById(id)).not.toBeNull();

      // 2000ms for auto-dismiss + 300ms for fallback setTimeout in dismiss()
      vi.advanceTimersByTime(2300);

      expect(document.getElementById(id)).toBeNull();
    });

    it('does not auto-dismiss when durationMs is 0', () => {
      const id = manager.show('Persistent', 'info', 0);

      vi.advanceTimersByTime(10000);

      expect(document.getElementById(id)).not.toBeNull();
    });

    it('sets pointer-events: auto on toast element', () => {
      const id = manager.show('Clickable');

      const toastEl = document.getElementById(id);
      expect(toastEl?.style.pointerEvents).toBe('auto');
    });
  });

  // ── Convenience Methods ─────────────────────────────────────────────

  describe('convenience methods', () => {
    describe('success', () => {
      it('creates a success toast', () => {
        const id = manager.success('Task completed');

        const toastEl = document.getElementById(id);
        expect(toastEl?.classList.contains('toast-success')).toBe(true);
        expect(toastEl?.textContent).toContain('Task completed');
      });
    });

    describe('error', () => {
      it('creates an error toast with longer default duration', () => {
        const id = manager.error('Something failed');

        const toastEl = document.getElementById(id);
        expect(toastEl?.classList.contains('toast-error')).toBe(true);
        expect(toastEl?.textContent).toContain('Something failed');
      });

      it('uses 6000ms default duration for errors', () => {
        const id = manager.error('Error');

        // Should still exist at 4000ms (longer than default 4000)
        vi.advanceTimersByTime(4000);
        expect(document.getElementById(id)).not.toBeNull();

        // Should be gone by 6000ms + 300ms fallback
        vi.advanceTimersByTime(2300);
        expect(document.getElementById(id)).toBeNull();
      });
    });

    describe('info', () => {
      it('creates an info toast', () => {
        const id = manager.info('Heads up');

        const toastEl = document.getElementById(id);
        expect(toastEl?.classList.contains('toast-info')).toBe(true);
      });
    });

    describe('warn', () => {
      it('creates a warning toast', () => {
        const id = manager.warn('Caution');

        const toastEl = document.getElementById(id);
        expect(toastEl?.classList.contains('toast-warning')).toBe(true);
      });
    });
  });

  // ── dismiss ─────────────────────────────────────────────────────────

  describe('dismiss', () => {
    it('removes toast element', () => {
      const id = manager.show('Remove me');
      expect(document.getElementById(id)).not.toBeNull();

      manager.dismiss(id);

      // After animation + fallback timeout
      vi.advanceTimersByTime(300);
      expect(document.getElementById(id)).toBeNull();
    });

    it('adds toast-exit class before removal', () => {
      const id = manager.show('Animate out');

      manager.dismiss(id);

      const toastEl = document.getElementById(id);
      expect(toastEl?.classList.contains('toast-exit')).toBe(true);
      expect(toastEl?.classList.contains('toast-enter')).toBe(false);
    });

    it('is idempotent — does nothing for non-existent id', () => {
      expect(() => manager.dismiss('non-existent')).not.toThrow();
    });

    it('can be called multiple times on same id', () => {
      const id = manager.show('Double dismiss');
      manager.dismiss(id);
      manager.dismiss(id);

      vi.advanceTimersByTime(300);
      expect(document.getElementById(id)).toBeNull();
    });
  });

  // ── dismissAll ──────────────────────────────────────────────────────

  describe('dismissAll', () => {
    it('removes all toasts', () => {
      manager.show('One');
      manager.show('Two');
      manager.show('Three');

      manager.dismissAll();

      vi.advanceTimersByTime(300);
      const container = document.getElementById('toast-container');
      expect(container?.children.length).toBe(0);
    });

    it('is idempotent when no toasts exist', () => {
      expect(() => manager.dismissAll()).not.toThrow();
    });
  });

  // ── Action Button Click ─────────────────────────────────────────────

  describe('action button', () => {
    it('calls action onClick when action button is clicked', () => {
      const onClick = vi.fn();
      const id = manager.show('Action!', 'info', 4000, {
        label: 'Undo',
        onClick,
      });

      const toastEl = document.getElementById(id);
      const actionBtn = toastEl?.querySelector('.toast-action') as HTMLElement;
      actionBtn?.click();

      expect(onClick).toHaveBeenCalled();
    });

    it('dismisses toast after action button click', () => {
      const onClick = vi.fn();
      const id = manager.show('Action!', 'info', 0, {
        label: 'Undo',
        onClick,
      });

      const toastEl = document.getElementById(id);
      const actionBtn = toastEl?.querySelector('.toast-action') as HTMLElement;
      actionBtn?.click();

      vi.advanceTimersByTime(300);
      expect(document.getElementById(id)).toBeNull();
    });
  });

  // ── Close Button Click ──────────────────────────────────────────────

  describe('close button', () => {
    it('dismisses toast when close button is clicked', () => {
      const id = manager.show('Close me');

      const toastEl = document.getElementById(id);
      const closeBtn = toastEl?.querySelector('.toast-close') as HTMLElement;
      closeBtn?.click();

      vi.advanceTimersByTime(300);
      expect(document.getElementById(id)).toBeNull();
    });

    it('does not throw if close button is missing', () => {
      // Create a toast but manually remove the close button
      const id = manager.show('No close btn');
      const toastEl = document.getElementById(id);
      toastEl?.querySelector('.toast-close')?.remove();

      // Should not throw when clicking nothing
      expect(() => manager.dismiss(id)).not.toThrow();
    });
  });

  // ── Animation End ───────────────────────────────────────────────────

  describe('animation end', () => {
    it('removes toast on animationend event', () => {
      const id = manager.show('Animated');
      manager.dismiss(id);

      const toastEl = document.getElementById(id);
      // Simulate animation end
      toastEl?.dispatchEvent(new Event('animationend'));

      expect(document.getElementById(id)).toBeNull();
    });
  });

  // ── Singleton ───────────────────────────────────────────────────────

  describe('singleton', () => {
    it('exports a default singleton instance', () => {
      expect(toast).toBeInstanceOf(ToastManager);
    });

    it('singleton convenience methods work', () => {
      const id = toast.success('Singleton test');

      const toastEl = document.getElementById(id);
      expect(toastEl?.classList.contains('toast-success')).toBe(true);
    });
  });
});
