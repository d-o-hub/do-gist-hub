/**
 * Tests for commitlint.config.mjs
 *
 * Covers the changes introduced in this PR:
 *  - New ignore function: `commit.includes('AAB bundle release')`
 *  - New ignore function: `commit.includes('Firebase Test Lab CI')`
 *  - Pre-existing ignore function: `/^Merge (branch|pull request)/`
 *  - body-max-line-length rule changed from 200 to 250
 */

import { describe, expect, it } from 'vitest';
import config from '../../commitlint.config.mjs';

describe('commitlint.config.mjs', () => {
  // ── ignore functions ───────────────────────────────────────────────────────

  describe('ignores', () => {
    const ignores = config.ignores ?? [];

    it('exports an array of ignore functions', () => {
      expect(Array.isArray(ignores)).toBe(true);
      expect(ignores.length).toBeGreaterThanOrEqual(3);
      for (const fn of ignores) {
        expect(typeof fn).toBe('function');
      }
    });

    // Helper: run all ignore functions and return true if any matches
    function isIgnored(commit: string): boolean {
      return ignores.some((fn: (commit: string) => boolean) => fn(commit));
    }

    describe('Merge commit ignore (pre-existing)', () => {
      it('ignores "Merge branch ..." commits', () => {
        expect(isIgnored('Merge branch main into feat/my-feature')).toBe(true);
      });

      it('ignores "Merge pull request #123 ..." commits', () => {
        expect(isIgnored('Merge pull request #123 from org/branch')).toBe(true);
      });

      it('does not ignore commits that contain "Merge" but not at the start', () => {
        expect(isIgnored('feat: eMerge two datasets')).toBe(false);
      });

      it('does not ignore a regular commit with branch in the body', () => {
        expect(isIgnored('feat: add login button\n\nBranch: feature/login')).toBe(false);
      });
    });

    describe('AAB bundle release ignore (new in this PR)', () => {
      it('ignores a commit that includes "AAB bundle release"', () => {
        expect(isIgnored('build: AAB bundle release for v0.2.0')).toBe(true);
      });

      it('ignores a commit where "AAB bundle release" appears mid-message', () => {
        expect(isIgnored('Release pipeline: AAB bundle release artifacts uploaded')).toBe(true);
      });

      it('ignores a commit where "AAB bundle release" appears in the body', () => {
        expect(isIgnored('ci: update release workflow\n\nAAB bundle release step added')).toBe(true);
      });

      it('does not ignore a commit that mentions AAB but not the full phrase', () => {
        expect(isIgnored('build: generate AAB artifact')).toBe(false);
      });

      it('does not ignore a commit that mentions "bundle release" without "AAB"', () => {
        expect(isIgnored('feat: bundle release optimization')).toBe(false);
      });

      it('is case-sensitive — does not ignore "aab bundle release" (lowercase)', () => {
        expect(isIgnored('build: aab bundle release process')).toBe(false);
      });
    });

    describe('Firebase Test Lab CI ignore (new in this PR)', () => {
      it('ignores a commit that includes "Firebase Test Lab CI"', () => {
        expect(isIgnored('ci: Firebase Test Lab CI step added')).toBe(true);
      });

      it('ignores a commit where "Firebase Test Lab CI" appears in the body', () => {
        expect(isIgnored('release: update CI\n\nFirebase Test Lab CI enabled')).toBe(true);
      });

      it('ignores a commit where the phrase is the entire message', () => {
        expect(isIgnored('Firebase Test Lab CI')).toBe(true);
      });

      it('does not ignore a commit that mentions Firebase but not the full phrase', () => {
        expect(isIgnored('ci: add Firebase performance monitoring')).toBe(false);
      });

      it('does not ignore a commit that mentions "Test Lab" without Firebase prefix', () => {
        expect(isIgnored('ci: enable Test Lab CI step')).toBe(false);
      });

      it('is case-sensitive — does not ignore "firebase test lab ci" (lowercase)', () => {
        expect(isIgnored('ci: firebase test lab ci run')).toBe(false);
      });
    });

    describe('regular commits are not ignored', () => {
      it('does not ignore a conventional feat commit', () => {
        expect(isIgnored('feat: add dark mode toggle')).toBe(false);
      });

      it('does not ignore a fix commit', () => {
        expect(isIgnored('fix: resolve token refresh race condition')).toBe(false);
      });

      it('does not ignore a ci commit', () => {
        expect(isIgnored('ci: pin Playwright to v1.60.0')).toBe(false);
      });

      it('does not ignore an empty string', () => {
        expect(isIgnored('')).toBe(false);
      });
    });
  });

  // ── rules ──────────────────────────────────────────────────────────────────

  describe('rules', () => {
    it('exports a rules object', () => {
      expect(config.rules).toBeDefined();
      expect(typeof config.rules).toBe('object');
    });

    it('sets body-max-line-length to 250 (changed from 200 in this PR)', () => {
      const rule = config.rules?.['body-max-line-length'];
      expect(rule).toBeDefined();
      // Rule format: [severity, condition, value]
      expect(rule?.[2]).toBe(250);
    });

    it('sets header-max-length to 150', () => {
      const rule = config.rules?.['header-max-length'];
      expect(rule?.[2]).toBe(150);
    });

    it('sets footer-max-line-length to 200', () => {
      const rule = config.rules?.['footer-max-line-length'];
      expect(rule?.[2]).toBe(200);
    });

    it('allows the "plans" type in type-enum', () => {
      const rule = config.rules?.['type-enum'];
      const allowedTypes = rule?.[2] as string[];
      expect(allowedTypes).toContain('plans');
    });

    it('allows standard conventional commit types', () => {
      const rule = config.rules?.['type-enum'];
      const allowedTypes = rule?.[2] as string[];
      for (const type of ['feat', 'fix', 'ci', 'chore', 'docs', 'build', 'test', 'refactor', 'revert', 'style', 'perf']) {
        expect(allowedTypes).toContain(type);
      }
    });

    it('allows the "merge" type for merge commits', () => {
      const rule = config.rules?.['type-enum'];
      const allowedTypes = rule?.[2] as string[];
      expect(allowedTypes).toContain('merge');
    });
  });

  // ── extends ────────────────────────────────────────────────────────────────

  describe('extends', () => {
    it('extends @commitlint/config-conventional', () => {
      expect(config.extends).toContain('@commitlint/config-conventional');
    });
  });
});
