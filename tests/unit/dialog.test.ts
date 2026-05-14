/**
 * Unit tests for Confirm Dialog utility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/security/dom', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { showConfirmDialog } from '../../src/utils/dialog';
import { sanitizeHtml } from '../../src/services/security/dom';

// ── Tests ─────────────────────────────────────────────────────────────

describe('showConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Mock requestAnimationFrame to execute callback immediately
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Clean up any leftover overlays
    document.querySelectorAll('.confirm-overlay').forEach((el) => el.remove());
  });

  // ── DOM Creation ──────────────────────────────────────────────────

  describe('DOM creation', () => {
    it('creates overlay with correct class', () => {
      showConfirmDialog('Test message');
      const overlay = document.querySelector('.confirm-overlay');
      expect(overlay).not.toBeNull();
    });

    it('creates dialog with role and aria-modal attributes', () => {
      showConfirmDialog('Test message');
      const dialog = document.querySelector('[role="alertdialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
    });

    it('renders title inside dialog', () => {
      showConfirmDialog('Are you sure?', 'DELETE GIST');
      const title = document.querySelector('.confirm-title');
      expect(title?.textContent).toBe('DELETE GIST');
    });

    it('renders message inside dialog', () => {
      showConfirmDialog('This action cannot be undone');
      const message = document.querySelector('.confirm-message');
      expect(message?.textContent).toBe('This action cannot be undone');
    });

    it('renders CANCEL and CONFIRM buttons', () => {
      showConfirmDialog('Test');
      const cancelBtn = document.querySelector('[data-action="cancel"]');
      const confirmBtn = document.querySelector('[data-action="confirm"]');
      expect(cancelBtn?.textContent).toBe('CANCEL');
      expect(confirmBtn?.textContent).toBe('CONFIRM');
    });
  });

  // ── Sanitization ─────────────────────────────────────────────────

  it('sanitizes the title', () => {
    showConfirmDialog('Message', '<script>alert("xss")</script>');
    expect(sanitizeHtml).toHaveBeenCalledWith('<script>alert("xss")</script>');
  });

  it('sanitizes the message', () => {
    showConfirmDialog('<img onerror="alert(1)" src=x>');
    expect(sanitizeHtml).toHaveBeenCalledWith(
      '<img onerror="alert(1)" src=x>',
    );
  });

  // ── Confirmation ────────────────────────────────────────────────

  it('resolves true when CONFIRM button is clicked', async () => {
    const promise = showConfirmDialog('Proceed?');

    const confirmBtn = document.querySelector(
      '[data-action="confirm"]',
    ) as HTMLElement;
    confirmBtn?.click();

    // Advance past the 200ms removal timeout
    vi.advanceTimersByTime(200);

    const result = await promise;
    expect(result).toBe(true);
  });

  it('resolves false when CANCEL button is clicked', async () => {
    const promise = showConfirmDialog('Cancel?');

    const cancelBtn = document.querySelector(
      '[data-action="cancel"]',
    ) as HTMLElement;
    cancelBtn?.click();

    vi.advanceTimersByTime(200);

    const result = await promise;
    expect(result).toBe(false);
  });

  // ── Animation ────────────────────────────────────────────────────

  it('adds visible class via requestAnimationFrame', () => {
    showConfirmDialog('Animated');
    const overlay = document.querySelector('.confirm-overlay');
    expect(overlay?.classList.contains('visible')).toBe(true);
  });

  it('removes visible class before removing overlay on confirm', async () => {
    const promise = showConfirmDialog('Remove me');

    const confirmBtn = document.querySelector(
      '[data-action="confirm"]',
    ) as HTMLElement;
    confirmBtn?.click();

    const overlay = document.querySelector('.confirm-overlay');
    expect(overlay?.classList.contains('visible')).toBe(false);

    vi.advanceTimersByTime(200);
    await promise;
    expect(document.querySelector('.confirm-overlay')).toBeNull();
  });

  it('removes visible class before removing overlay on cancel', async () => {
    const promise = showConfirmDialog('Cancel remove');

    const cancelBtn = document.querySelector(
      '[data-action="cancel"]',
    ) as HTMLElement;
    cancelBtn?.click();

    const overlay = document.querySelector('.confirm-overlay');
    expect(overlay?.classList.contains('visible')).toBe(false);

    vi.advanceTimersByTime(200);
    await promise;
    expect(document.querySelector('.confirm-overlay')).toBeNull();
  });

  // ── Default title ───────────────────────────────────────────────

  it('uses default title "CONFIRM" when title is not provided', () => {
    showConfirmDialog('Default title');
    const title = document.querySelector('.confirm-title');
    expect(title?.textContent).toBe('CONFIRM');
  });
});
