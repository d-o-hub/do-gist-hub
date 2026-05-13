/**
 * Unit tests for Announcer utility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Announcer, announcer } from '../../src/utils/announcer';

describe('Announcer', () => {
  let ann: Announcer;

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock requestAnimationFrame to run callback immediately
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    );
    // Clean up pre-existing .sr-only regions created by the singleton import
    document.querySelectorAll('.sr-only').forEach((el) => el.remove());
    ann = new Announcer();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.querySelectorAll('.sr-only').forEach((el) => el.remove());
  });

  // ── Constructor ────────────────────────────────────────────────

  describe('constructor', () => {
    it('creates polite and assertive ARIA live regions', () => {
      const regions = document.querySelectorAll('.sr-only');
      expect(regions.length).toBe(2);
    });

    it('sets correct aria-live attributes', () => {
      const polite = document.querySelector('[aria-live="polite"]');
      const assertive = document.querySelector('[aria-live="assertive"]');
      expect(polite).not.toBeNull();
      expect(assertive).not.toBeNull();
    });

    it('sets aria-atomic on both regions', () => {
      const regions = document.querySelectorAll('[aria-atomic="true"]');
      expect(regions.length).toBe(2);
    });
  });

  // ── announce ──────────────────────────────────────────────────

  describe('announce', () => {
    it('sets text content on polite region', () => {
      ann.announce('Hello world');
      const polite = document.querySelector('[aria-live="polite"]');
      expect(polite?.textContent).toBe('Hello world');
    });

    it('sets text content on assertive region when priority is assertive', () => {
      ann.announce('Alert!', 'assertive');
      const assertive = document.querySelector('[aria-live="assertive"]');
      expect(assertive?.textContent).toBe('Alert!');
    });

    it('clears content after 1000ms timeout', () => {
      ann.announce('Temporary');
      expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe('Temporary');
      vi.advanceTimersByTime(1000);
      expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe('');
    });
  });

  // ── success ───────────────────────────────────────────────────

  describe('success', () => {
    it('announces success message with polite priority', () => {
      ann.success('Gist saved');
      const polite = document.querySelector('[aria-live="polite"]');
      expect(polite?.textContent).toBe('Success: Gist saved');
    });
  });

  // ── error ─────────────────────────────────────────────────────

  describe('error', () => {
    it('announces error message with assertive priority', () => {
      ann.error('Network failed');
      const assertive = document.querySelector('[aria-live="assertive"]');
      expect(assertive?.textContent).toBe('Error: Network failed');
    });
  });

  // ── loading ───────────────────────────────────────────────────

  describe('loading', () => {
    it('announces loading message with ellipsis', () => {
      ann.loading('Syncing');
      const polite = document.querySelector('[aria-live="polite"]');
      expect(polite?.textContent).toBe('Syncing...');
    });

    it('uses default message when not provided', () => {
      ann.loading();
      const polite = document.querySelector('[aria-live="polite"]');
      expect(polite?.textContent).toBe('Loading...');
    });
  });

  // ── Singleton ─────────────────────────────────────────────────

  describe('singleton', () => {
    it('exports a default singleton instance', () => {
      expect(announcer).toBeInstanceOf(Announcer);
    });
  });
});
