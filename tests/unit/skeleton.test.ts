/**
 * Unit tests for Skeleton Loading Component
 */
import { describe, it, expect } from 'vitest';
import { Skeleton } from '../../src/components/ui/skeleton';

describe('Skeleton', () => {
  // ── renderCard ────────────────────────────────────────────────

  describe('renderCard', () => {
    it('returns a non-empty string', () => {
      const html = Skeleton.renderCard();
      expect(html).toBeTruthy();
      expect(typeof html).toBe('string');
    });

    it('renders with skeleton-card class', () => {
      const html = Skeleton.renderCard();
      expect(html).toContain('skeleton-card');
    });

    it('has aria-hidden="true"', () => {
      const html = Skeleton.renderCard();
      expect(html).toContain('aria-hidden="true"');
    });

    it('contains skeleton title placeholder', () => {
      const html = Skeleton.renderCard();
      expect(html).toContain('skeleton-title');
    });

    it('contains skeleton description placeholder', () => {
      const html = Skeleton.renderCard();
      expect(html).toContain('skeleton-desc');
    });

    it('contains loading-skeleton class', () => {
      const html = Skeleton.renderCard();
      expect(html).toContain('loading-skeleton');
    });

    it('renders gist-card structure', () => {
      const html = Skeleton.renderCard();
      expect(html).toContain('gist-card');
      expect(html).toContain('gist-card-header');
      expect(html).toContain('gist-card-meta');
      expect(html).toContain('gist-card-actions');
    });
  });

  // ── renderList ────────────────────────────────────────────────

  describe('renderList', () => {
    it('renders default 3 skeleton cards', () => {
      const html = Skeleton.renderList();
      const matches = html.match(/skeleton-card/g) ?? [];
      expect(matches.length).toBe(3);
    });

    it('renders specified number of skeleton cards', () => {
      const html = Skeleton.renderList(5);
      const matches = html.match(/skeleton-card/g) ?? [];
      expect(matches.length).toBe(5);
    });

    it('renders 0 cards when count is 0', () => {
      const html = Skeleton.renderList(0);
      expect(html).toBe('');
    });

    it('renders 1 card when count is 1', () => {
      const html = Skeleton.renderList(1);
      const matches = html.match(/skeleton-card/g) ?? [];
      expect(matches.length).toBe(1);
    });
  });

  // ── renderDetail ──────────────────────────────────────────────

  describe('renderDetail', () => {
    it('returns a non-empty string', () => {
      const html = Skeleton.renderDetail();
      expect(html).toBeTruthy();
    });

    it('renders with gist-detail-skeleton class', () => {
      const html = Skeleton.renderDetail();
      expect(html).toContain('gist-detail-skeleton');
    });

    it('has aria-hidden="true"', () => {
      const html = Skeleton.renderDetail();
      expect(html).toContain('aria-hidden="true"');
    });

    it('contains skeleton header section', () => {
      const html = Skeleton.renderDetail();
      expect(html).toContain('skeleton-header');
    });

    it('contains skeleton content section', () => {
      const html = Skeleton.renderDetail();
      expect(html).toContain('skeleton-content');
    });

    it('contains skeleton code lines', () => {
      const html = Skeleton.renderDetail();
      expect(html).toContain('skeleton-code-lines');
    });

    it('contains skeleton file tab', () => {
      const html = Skeleton.renderDetail();
      expect(html).toContain('skeleton-file-tab');
    });

    it('contains multiple skeleton-code-line divs', () => {
      const html = Skeleton.renderDetail();
      const lines = html.match(/skeleton-code-line/g) ?? [];
      expect(lines.length).toBeGreaterThanOrEqual(5);
    });
  });
});
