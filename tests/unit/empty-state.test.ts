/**
 * Unit tests for Empty State Component
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mock for sanitizeHtml
vi.mock('../../src/services/security/dom', () => ({
  sanitizeHtml: vi.fn((s: string) => s),
}));

import { EmptyState } from '../../src/components/ui/empty-state';
import { sanitizeHtml } from '../../src/services/security/dom';

describe('EmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── render (basic) ─────────────────────────────────────────────

  describe('render', () => {
    it('returns HTML containing the title', () => {
      const html = EmptyState.render({
        title: 'No Gists Found',
        description: 'Create your first gist to get started.',
      });
      expect(html).toContain('No Gists Found');
    });

    it('returns HTML containing the description', () => {
      const html = EmptyState.render({
        title: 'No Gists Found',
        description: 'Create your first gist to get started.',
      });
      expect(html).toContain('Create your first gist to get started.');
    });

    it('wraps content in empty-state-container with role="status"', () => {
      const html = EmptyState.render({
        title: 'Empty',
        description: 'Nothing here.',
      });
      expect(html).toContain('empty-state-container');
      expect(html).toContain('role="status"');
    });

    it('renders title and description headings', () => {
      const html = EmptyState.render({
        title: 'No Results',
        description: 'Try a different search.',
      });
      expect(html).toContain('empty-state-title');
      expect(html).toContain('empty-state-description');
    });
  });

  // ── render (with action) ───────────────────────────────────────

  describe('render with action', () => {
    it('renders action button when actionLabel is provided', () => {
      const html = EmptyState.render({
        title: 'Empty',
        description: 'Nothing to see.',
        actionLabel: 'Create Gist',
      });
      expect(html).toContain('btn');
      expect(html).toContain('Create Gist');
    });

    it('includes data-route attribute when actionRoute is provided', () => {
      const html = EmptyState.render({
        title: 'Empty',
        description: 'Nothing to see.',
        actionLabel: 'Go Home',
        actionRoute: '/home',
      });
      expect(html).toContain('data-route="/home"');
    });

    it('includes data-action attribute when actionType is provided', () => {
      const html = EmptyState.render({
        title: 'Empty',
        description: 'Nothing to see.',
        actionLabel: 'Refresh',
        actionType: 'refresh',
      });
      expect(html).toContain('data-action="refresh"');
    });

    it('does not include action button when actionLabel is omitted', () => {
      const html = EmptyState.render({
        title: 'Empty',
        description: 'Nothing to see.',
      });
      expect(html).not.toContain('btn');
    });

    it('renders empty-state-action class on action button', () => {
      const html = EmptyState.render({
        title: 'Empty',
        description: 'Nothing.',
        actionLabel: 'Action',
      });
      expect(html).toContain('empty-state-action');
    });

    it('renders icon when provided', () => {
      const html = EmptyState.render({
        title: 'Empty',
        description: 'Nothing.',
        icon: '✨',
      });
      expect(html).toContain('empty-state-icon');
      expect(html).toContain('✨');
    });

    it('renders icon in fragment when provided', () => {
      const frag = EmptyState.renderToFragment({
        title: 'Empty',
        description: 'Nothing.',
        icon: '🔍',
      });
      const iconDiv = frag.querySelector('.empty-state-icon');
      expect(iconDiv).not.toBeNull();
      expect(iconDiv?.textContent).toBe('🔍');
    });

    it('calls sanitizeHtml on user-provided values', () => {
      EmptyState.render({
        title: 'Test',
        description: 'Test desc',
        actionLabel: 'Click',
      });
      expect(sanitizeHtml).toHaveBeenCalled();
    });
  });
});
