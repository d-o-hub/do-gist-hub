/**
 * Unit tests for Bottom Sheet Component
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// skipcq: JS-0010
void 0; // Ensure module scope is valid

// ─── Mocks (hoisted) ───────────────────────────────────────────

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

/** Helper: create a DocumentFragment from a text string for test convenience. */
function textFrag(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  const p = document.createElement('p');
  p.textContent = text;
  frag.appendChild(p);
  return frag;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('BottomSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    for (const el of document.querySelectorAll('.bottom-sheet')) el.remove();
    for (const el of document.querySelectorAll('.bottom-sheet-backdrop')) el.remove();
  });

  // ── Constructor ─────────────────────────────────────────────────────

  describe('constructor', () => {
    it('creates backdrop and container elements', () => {
      new BottomSheet();

      const backdrops = document.querySelectorAll('.bottom-sheet-backdrop');
      const containers = document.querySelectorAll('.bottom-sheet');
      expect(backdrops.length).toBeGreaterThanOrEqual(1);
      expect(containers.length).toBeGreaterThanOrEqual(1);
    });

    it('creates sheet with correct ARIA attributes', () => {
      new BottomSheet();

      const container = document.querySelector('.bottom-sheet');
      expect(container?.getAttribute('role')).toBe('dialog');
      expect(container?.getAttribute('aria-modal')).toBe('true');
      expect(container?.getAttribute('aria-hidden')).toBe('true');
    });

    it('creates handle element inside container', () => {
      new BottomSheet();

      const container = document.querySelector('.bottom-sheet');
      const handle = container?.querySelector('.bottom-sheet-handle');
      expect(handle).not.toBeNull();
    });
  });

  // ── open ────────────────────────────────────────────────────────────

  describe('open', () => {
    it('adds open and visible classes', async () => {
      const sheet = new BottomSheet();
      await sheet.open(textFrag('Test content'), 'Test Title');

      const container = document.querySelector('.bottom-sheet');
      const backdrop = document.querySelector('.bottom-sheet-backdrop');
      expect(container?.classList.contains('open')).toBe(true);
      expect(backdrop?.classList.contains('visible')).toBe(true);
    });

    it('sets aria-hidden to false', async () => {
      const sheet = new BottomSheet();
      await sheet.open(textFrag('content'));

      const container = document.querySelector('.bottom-sheet');
      expect(container?.getAttribute('aria-hidden')).toBe('false');
    });

    it('renders title when provided', async () => {
      const sheet = new BottomSheet();
      await sheet.open(textFrag('Body'), 'My Title');

      const container = document.querySelector('.bottom-sheet');
      expect(container?.textContent).toContain('My Title');
    });

    it('renders content when no title', async () => {
      const sheet = new BottomSheet();
      await sheet.open(textFrag('Body only'));

      const container = document.querySelector('.bottom-sheet');
      expect(container?.textContent).toContain('Body only');
    });

    it('activates focus trap after opening', async () => {
      const sheet = new BottomSheet();
      await sheet.open(textFrag('content'), 'Title');

      expect(focusTrap.activate).toHaveBeenCalled();
    });

    it('announces sheet open', async () => {
      const sheet = new BottomSheet();
      await sheet.open(textFrag('content'), 'Menu');

      expect(announcer.announce).toHaveBeenCalledWith('Opened Menu sheet');
    });

    it('is idempotent — does nothing when already open', async () => {
      const sheet = new BottomSheet();
      await sheet.open(textFrag('content1'), 'First');
      await sheet.open(textFrag('content2'), 'Second');

      // Should still show "First" content since second open was ignored
      const container = document.querySelector('.bottom-sheet');
      expect(container?.textContent).toContain('content1');
      expect(container?.textContent).not.toContain('content2');
    });

    it('handles Escape keydown to close', async () => {
      const sheet = new BottomSheet();
      await sheet.open(textFrag('content'));

      const container = document.querySelector('.bottom-sheet');
      container?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(container?.classList.contains('open')).toBe(false);
    });
  });

  // ── close ───────────────────────────────────────────────────────────

  describe('close', () => {
    it('removes open and visible classes', async () => {
      const sheet = new BottomSheet();
      await sheet.open(textFrag('content'));
      await sheet.close();

      const container = document.querySelector('.bottom-sheet');
      const backdrop = document.querySelector('.bottom-sheet-backdrop');
      expect(container?.classList.contains('open')).toBe(false);
      expect(backdrop?.classList.contains('visible')).toBe(false);
    });

    it('sets aria-hidden to true', async () => {
      const sheet = new BottomSheet();
      await sheet.open(textFrag('content'));
      await sheet.close();

      const container = document.querySelector('.bottom-sheet');
      expect(container?.getAttribute('aria-hidden')).toBe('true');
    });

    it('deactivates focus trap', async () => {
      const sheet = new BottomSheet();
      await sheet.open(textFrag('content'));
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
      await sheet.open(textFrag('content'));

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
