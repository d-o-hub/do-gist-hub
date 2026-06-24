import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showConfirmDialog } from '../../src/utils/dialog';

describe('showConfirmDialog options variant', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.querySelectorAll('.confirm-overlay').forEach((el) => void el.remove());
  });

  it('accepts options object with custom labels', () => {
    void showConfirmDialog({
      title: 'Delete gist?',
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
    });

    const confirmBtn = document.querySelector('[data-action="confirm"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    expect(confirmBtn?.textContent).toBe('Delete');
    expect(cancelBtn?.textContent).toBe('Keep');
  });

  it('uses default labels when not specified in options', () => {
    void showConfirmDialog({
      title: 'Confirm',
      message: 'Are you sure?',
    });

    const confirmBtn = document.querySelector('[data-action="confirm"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    expect(confirmBtn?.textContent).toBe('Confirm');
    expect(cancelBtn?.textContent).toBe('Cancel');
  });

  it('applies primary variant class', () => {
    void showConfirmDialog({
      title: 'Sync?',
      message: 'Sync now.',
      variant: 'primary',
    });

    const confirmBtn = document.querySelector('[data-action="confirm"]');
    expect(confirmBtn?.className).toContain('btn-primary');
    expect(confirmBtn?.className).not.toContain('btn-danger');
  });

  it('applies danger variant class by default', () => {
    void showConfirmDialog({
      title: 'Delete?',
      message: 'Gone.',
    });

    const confirmBtn = document.querySelector('[data-action="confirm"]');
    expect(confirmBtn?.className).toContain('btn-danger');
  });

  it('renders title from options', () => {
    void showConfirmDialog({
      title: 'Custom Title',
      message: 'Custom message',
    });

    const title = document.querySelector('.confirm-title');
    expect(title?.textContent).toBe('Custom Title');
  });

  it('renders message from options', () => {
    void showConfirmDialog({
      title: 'Title',
      message: 'Custom body text',
    });

    const message = document.querySelector('.confirm-message');
    expect(message?.textContent).toBe('Custom body text');
  });

  it('resolves false on Escape key', async () => {
    const promise = showConfirmDialog({
      title: 'Close?',
      message: 'Press Escape',
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    vi.advanceTimersByTime(200);

    const result = await promise;
    expect(result).toBe(false);
  });

  it('resolves true when confirm is clicked in options mode', async () => {
    const promise = showConfirmDialog({
      title: 'Proceed?',
      message: 'Yes?',
      confirmLabel: 'Go',
    });

    const confirmBtn = document.querySelector('[data-action="confirm"]') as HTMLElement;
    confirmBtn.click();
    vi.advanceTimersByTime(200);

    const result = await promise;
    expect(result).toBe(true);
  });
});
