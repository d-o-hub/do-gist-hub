/**
 * Unit tests for Bottom Sheet Component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks (hoisted) ───────────────────────────────────────────

vi.mock('../../src/services/security/dom', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
}));

vi.mock('../../src/utils/announcer', () => ({
  announcer: {
    announce: vi.fn(),
  },
}));

vi.mock('../../src/utils/focus-trap', () => ({
  focusTrap: {
    activate: vi.fn(),
    deactivate: vi.fn(),
  },
}));

vi.mock('../../src/utils/view-transitions', () => ({
  withViewTransition: vi.fn(async (fn: () => void | Promise<void>) => {
    await fn();
  }),
}));

// ── Imports (after mocks) ───────────────────────────────────────────

import { BottomSheet, bottomSheet } from '../../src/components/ui/bottom-sheet';
import { announcer } from '../../src/utils/announcer';
import { focusTrap } from '../../src/utils/focus-trap';
import { withViewTransition } from '../../src/utils/view-transitions';

// ── Tests ─────────────────────────────────────────────────────────────

describe('BottomSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.querySelectorAll('.bottom-sheet').forEach(el => el.remove());
    document.querySelectorAll('.bottom-sheet-backdrop').forEach(el => el.remove());
  });

  // ── Constructor ─────────────────────────────────────────────────────

  describe('constructor', () => {
    it('creates backdrop and container elements', () => {
      const sheet = new BottomSheet();

      const backdrops = document.querySelectorAll('.bottom-sheet-backdrop');
      const containers = document.querySelectorAll('.bottom-sheet');
      expect(backdrops.length).toBeGreaterThanOrEqual(1);
      expect(containers.length).toBeGreaterThanOrEqual(1);
    });

    it('creates sheet with correct ARIA attributes', () => {
      const sheet = new BottomSheet();

      const container = document.querySelector('.bottom-sheet');
      expect(container?.getAttribute('role')).toBe('dialog');
      expect(container?.getAttribute('aria-modal')).toBe('true');
      expect(container?.getAttribute('aria-hidden')).toBe('true');
    });

    it('creates handle element inside container', () => {
      const sheet = new BottomSheet();

      const container = document.querySelector('.bottom-sheet');
      const handle = container?.querySelector('.bottom-sheet-handle');
      expect(handle).not.toBeNull();
    });
  });

  // ── open ────────────────────────────────────────────────────────────

  describe('open', () => {
    it('adds open and visible classes', async () => {
      const sheet = new BottomSheet();
      await sheet.open('<p>Test content</p>', 'Test Title');

      const container = document.querySelector('.bottom-sheet');
      const backdrop = document.querySelector('.bottom-sheet-backdrop');
      expect(container?.classList.contains('open')).toBe(true);
      expect(backdrop?.classList.contains('visible')).toBe(true);
    });

    it('sets aria-hidden to false', async () => {
      const sheet = new BottomSheet();
      await sheet.open('content');

      const container = document.querySelector('.bottom-sheet');
      expect(container?.getAttribute('aria-hidden')).toBe('false');
    });

    it('renders title when provided', async () => {
      const sheet = new BottomSheet();
      await sheet.open('<p>Body</p>', 'My Title');

      const container = document.querySelector('.bottom-sheet');
      expect(container?.innerHTML).toContain('My Title');
    });

    it('renders content when no title', async () => {
      const sheet = new BottomSheet();
      await sheet.open('<p>Body only</p>');

      const container = document.querySelector('.bottom-sheet');
      expect(container?.innerHTML).toContain('Body only');
    });

    it('activates focus trap after opening', async () => {
      const sheet = new BottomSheet();
      await sheet.open('content', 'Title');

      expect(focusTrap.activate).toHaveBeenCalled();
    });

    it('announces sheet open', async () => {
      const sheet = new BottomSheet();
      await sheet.open('content', 'Menu');

      expect(announcer.announce).toHaveBeenCalledWith('Opened Menu sheet');
    });

    it('is idempotent — does nothing when already open', async () => {
      const sheet = new BottomSheet();
      await sheet.open('content1', 'First');
      await sheet.open('content2', 'Second');

      // Should still show "First" content since second open was ignored
      const container = document.querySelector('.bottom-sheet');
      expect(container?.innerHTML).toContain('First');
      expect(container?.innerHTML).not.toContain('Second');
    });

    it('handles Escape keydown to close', async () => {
      const sheet = new BottomSheet();
      await sheet.open('content');

      const container = document.querySelector('.bottom-sheet');
      container?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(container?.classList.contains('open')).toBe(false);
    });
  });

  // ── close ───────────────────────────────────────────────────────────

  describe('close', () => {
    it('removes open and visible classes', async () => {
      const sheet = new BottomSheet();
      await sheet.open('content');
      await sheet.close();

      const container = document.querySelector('.bottom-sheet');
      const backdrop = document.querySelector('.bottom-sheet-backdrop');
      expect(container?.classList.contains('open')).toBe(false);
      expect(backdrop?.classList.contains('visible')).toBe(false);
    });

    it('sets aria-hidden to true', async () => {
      const sheet = new BottomSheet();
      await sheet.open('content');
      await sheet.close();

      const container = document.querySelector('.bottom-sheet');
      expect(container?.getAttribute('aria-hidden')).toBe('true');
    });

    it('deactivates focus trap', async () => {
      const sheet = new BottomSheet();
      await sheet.open('content');
      await sheet.close();

      expect(focusTrap.deactivate).toHaveBeenCalled();
    });

    it('is idempotent — does nothing when already closed', async () => {
      const sheet = new BottomSheet();
      // Should not throw when closing without opening
      await expect(sheet.close()).resolves.toBeUndefined();
    });
  });

  // ── backdrop click ─────────────────────────────────────────────────

  describe('backdrop click', () => {
    it('closes sheet when backdrop is clicked', async () => {
      const sheet = new BottomSheet();
      await sheet.open('content');

      const backdrop = document.querySelector('.bottom-sheet-backdrop') as HTMLElement;
      backdrop?.click();

      const container = document.querySelector('.bottom-sheet');
      expect(container?.classList.contains('open')).toBe(false);
    });
  });

  // ── Singleton (default export) ──────────────────────────────────────

  describe('singleton', () => {
    it('exports a default singleton instance', () => {
      expect(bottomSheet).toBeInstanceOf(BottomSheet);
    });
  });
});
