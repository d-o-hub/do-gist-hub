/**
 * Unit tests for Confirm Dialog utility
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks (hoisted) ───────────────────────────────────────────

import { showConfirmDialog } from '../../src/utils/dialog';

// ── Tests ─────────────────────────────────────────────────────────────

describe('showConfirmDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Mock requestAnimationFrame to execute callback immediately
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Clean up any leftover overlays
    document.querySelectorAll('.confirm-overlay').forEach((el) => void el.remove());
  });

  // ── DOM Creation ──────────────────────────────────────────────────

  describe('DOM creation', () => {
    it('creates overlay with correct class', () => {
      void showConfirmDialog('Test message');
      const overlay = document.querySelector('.confirm-overlay');
      expect(overlay).not.toBeNull();
    });

    it('creates dialog with role and aria-modal attributes', () => {
      void showConfirmDialog('Test message');
      const dialog = document.querySelector('[role="alertdialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      const labelledBy = dialog?.getAttribute('aria-labelledby');
      const describedBy = dialog?.getAttribute('aria-describedby');
      expect(labelledBy).toBeTruthy();
      expect(describedBy).toBeTruthy();
      const titleEl = labelledBy ? document.getElementById(labelledBy) : null;
      const descEl = describedBy ? document.getElementById(describedBy) : null;
      expect(titleEl?.textContent).toBe('Are you sure?');
      expect(descEl?.textContent).toBe('Test message');
    });

    it('renders title inside dialog', () => {
      void showConfirmDialog('Are you sure?', 'DELETE GIST');
      const title = document.querySelector('.confirm-title');
      expect(title?.textContent).toBe('DELETE GIST');
    });

    it('renders message inside dialog', () => {
      void showConfirmDialog('This action cannot be undone');
      const message = document.querySelector('.confirm-message');
      expect(message?.textContent).toBe('This action cannot be undone');
    });

    it('renders Cancel and Confirm buttons', () => {
      void showConfirmDialog('Test');
      const cancelBtn = document.querySelector('[data-action="cancel"]');
      const confirmBtn = document.querySelector('[data-action="confirm"]');
      expect(cancelBtn?.textContent).toBe('Cancel');
      expect(confirmBtn?.textContent).toBe('Confirm');
    });
  });

  // ── XSS safety (textContent is safe by construction) ────────────

  it('sets title as text content, not HTML (XSS safe)', () => {
    void showConfirmDialog('Message', '<script>alert("xss")</script>');
    const title = document.querySelector('.confirm-title');
    expect(title?.textContent).toBe('<script>alert("xss")</script>');
    expect(title?.innerHTML).not.toContain('<script>');
  });

  it('sets message as text content, not HTML (XSS safe)', () => {
    void showConfirmDialog('<img onerror="alert(1)" src=x>');
    const message = document.querySelector('.confirm-message');
    expect(message?.textContent).toBe('<img onerror="alert(1)" src=x>');
    expect(message?.innerHTML).not.toContain('<img');
  });

  // ── Confirmation ────────────────────────────────────────────────

  it('resolves true when CONFIRM button is clicked', async () => {
    const promise = showConfirmDialog('Proceed?');

    const confirmBtn = document.querySelector('[data-action="confirm"]') as HTMLElement;
    confirmBtn?.click();

    // Advance past the 200ms removal timeout
    vi.advanceTimersByTime(200);

    const result = await promise;
    expect(result).toBe(true);
  });

  it('resolves false when CANCEL button is clicked', async () => {
    const promise = showConfirmDialog('Cancel?');

    const cancelBtn = document.querySelector('[data-action="cancel"]') as HTMLElement;
    cancelBtn?.click();

    vi.advanceTimersByTime(200);

    const result = await promise;
    expect(result).toBe(false);
  });

  // ── Animation ────────────────────────────────────────────────────

  it('adds visible class via requestAnimationFrame', () => {
    void showConfirmDialog('Animated');
    const overlay = document.querySelector('.confirm-overlay');
    expect(overlay?.classList.contains('visible')).toBe(true);
  });

  it('removes visible class before removing overlay on confirm', async () => {
    const promise = showConfirmDialog('Remove me');

    const confirmBtn = document.querySelector('[data-action="confirm"]') as HTMLElement;
    confirmBtn?.click();

    const overlay = document.querySelector('.confirm-overlay');
    expect(overlay?.classList.contains('visible')).toBe(false);

    vi.advanceTimersByTime(200);
    await promise;
    expect(document.querySelector('.confirm-overlay')).toBeNull();
  });

  it('removes visible class before removing overlay on cancel', async () => {
    const promise = showConfirmDialog('Cancel remove');

    const cancelBtn = document.querySelector('[data-action="cancel"]') as HTMLElement;
    cancelBtn?.click();

    const overlay = document.querySelector('.confirm-overlay');
    expect(overlay?.classList.contains('visible')).toBe(false);

    vi.advanceTimersByTime(200);
    await promise;
    expect(document.querySelector('.confirm-overlay')).toBeNull();
  });

  // ── Default title ───────────────────────────────────────────────

  it('uses default title "Are you sure?" when title is not provided', () => {
    void showConfirmDialog('Default title');
    const title = document.querySelector('.confirm-title');
    expect(title?.textContent).toBe('Are you sure?');
  });
});
