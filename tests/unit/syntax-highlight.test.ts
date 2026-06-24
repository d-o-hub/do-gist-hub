import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('shiki', () => {
  const loadLanguage = vi.fn().mockResolvedValue(undefined);
  const codeToHtml = vi.fn().mockImplementation((_code: string, opts: { lang?: string }) => {
    return Promise.resolve(
      `<pre class="shiki-highlighted"><code class="language-${opts.lang ?? 'text'}">highlighted</code></pre>`
    );
  });
  return {
    createHighlighter: vi.fn().mockResolvedValue({
      loadLanguage,
      codeToHtml,
    }),
  };
});

import {
  highlightCode,
  resetHighlighter,
  shouldLazyHighlight,
} from '../../src/services/syntax-highlight';

describe('SyntaxHighlight', () => {
  beforeEach(() => {
    resetHighlighter();
    vi.clearAllMocks();
  });

  describe('highlightCode', () => {
    it('returns empty string for empty code', async () => {
      const result = await highlightCode('');
      expect(result).toBe('');
    });

    it('returns highlighted HTML for valid code', async () => {
      const result = await highlightCode('const x = 1;', 'javascript');
      expect(result).toContain('shiki-highlighted');
      expect(result).toContain('language-javascript');
    });

    it('maps common language aliases', async () => {
      const result = await highlightCode('x = 1', 'js');
      expect(result).toContain('language-javascript');
    });

    it('returns empty string when language is not provided', async () => {
      const result = await highlightCode('hello');
      expect(result).toBe('');
    });

    it('uses dark theme by default', async () => {
      const { createHighlighter } = await import('shiki');
      await highlightCode('x', 'javascript');
      const mockHighlighter = await (createHighlighter as ReturnType<typeof vi.fn>).mock.results[0]
        ?.value;
      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(
        'x',
        expect.objectContaining({ theme: 'github-dark' })
      );
    });

    it('uses light theme when isDark is false', async () => {
      const { createHighlighter } = await import('shiki');
      await highlightCode('x', 'javascript', false);
      const mockHighlighter = await (createHighlighter as ReturnType<typeof vi.fn>).mock.results[0]
        ?.value;
      expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(
        'x',
        expect.objectContaining({ theme: 'github-light' })
      );
    });

    it('returns empty string on highlight failure', async () => {
      const { createHighlighter } = await import('shiki');
      (createHighlighter as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        loadLanguage: vi.fn().mockRejectedValue(new Error('unknown language')),
        codeToHtml: vi.fn(),
      });
      resetHighlighter();
      const result = await highlightCode('x', 'invalid-lang-xyz');
      expect(result).toBe('');
    });
  });

  describe('shouldLazyHighlight', () => {
    it('returns false for small code', () => {
      expect(shouldLazyHighlight('const x = 1;')).toBe(false);
    });

    it('returns true for code over 100KB', () => {
      const largeCode = 'x'.repeat(100 * 1024 + 1);
      expect(shouldLazyHighlight(largeCode)).toBe(true);
    });

    it('returns false for code exactly at 100KB', () => {
      const exactCode = 'x'.repeat(100 * 1024);
      expect(shouldLazyHighlight(exactCode)).toBe(false);
    });
  });

  describe('resetHighlighter', () => {
    it('allows creating a fresh highlighter', async () => {
      const { createHighlighter } = await import('shiki');
      await highlightCode('x', 'javascript');
      expect(createHighlighter).toHaveBeenCalledTimes(1);

      resetHighlighter();
      await highlightCode('y', 'javascript');
      expect(createHighlighter).toHaveBeenCalledTimes(2);
    });
  });
});
