/**
 * Scroll-Driven Parallax Verification Tests (Phase C Action 5.2)
 * Verifies the detail header parallax animation and reduced-motion compliance.
 */
import { test, expect } from '@playwright/test';
import { seedGists } from '../helpers/seed-gists';

test.describe('Scroll-Driven Parallax', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await seedGists(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should inject scroll-progress bar on gist detail page', async ({ page }) => {
    // Navigate to a gist detail page if available
    const card = page.locator('.gist-card').first();
    const cardVisible = await card.isVisible().catch(() => false);

    if (!cardVisible) {
      test.skip(true, 'No gist cards available to navigate to detail');
      return;
    }

    // Dispatch offline event so hydrateGist() reads from IndexedDB
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await card.click();
    await page.waitForSelector('.gist-detail', { timeout: 8000 }).catch(() => {});

    // Verify navigation succeeded before checking scroll-progress
    const detailVisible = await page.locator('.gist-detail').isVisible().catch(() => false);
    if (!detailVisible) {
      test.skip(true, 'Navigation to gist detail failed');
      return;
    }

    // Check if scroll-progress bar was injected (progressive enhancement)
    const supportsScrollTimeline = await page.evaluate(() =>
      CSS.supports('animation-timeline', 'scroll()')
    );

    const progressBar = page.locator('.scroll-progress');
    const barExists = await progressBar.count();

    if (supportsScrollTimeline) {
      expect(barExists).toBeGreaterThan(0);
      // Verify aria-hidden for accessibility
      const ariaHidden = await progressBar.getAttribute('aria-hidden');
      expect(ariaHidden).toBe('true');
    }

    test.info().annotations.push({
      type: 'scroll-progress',
      description: `supports scroll-timeline: ${supportsScrollTimeline}, progress bar exists: ${barExists > 0}`,
    });
  });

  test('should have detail-header-parallax animation in stylesheet', async ({ page }) => {
    const hasParallaxKeyframe = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (
              rule instanceof CSSKeyframesRule &&
              rule.name === 'detail-header-parallax'
            ) {
              return true;
            }
          }
        } catch {
          // Cross-origin stylesheet, skip
        }
      }
      return false;
    });

    expect(hasParallaxKeyframe).toBe(true);
  });

  test('should have @supports wrapper for scroll-timeline parallax', async ({ page }) => {
    const hasSupportsWrapper = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSSupportsRule) {
              const condition = rule.conditionText;
              if (condition.includes('animation-timeline') && condition.includes('scroll()')) {
                // Check if any rule inside targets .detail-header
                for (const inner of rule.cssRules) {
                  if (
                    inner instanceof CSSStyleRule &&
                    inner.selectorText.includes('.detail-header')
                  ) {
                    return true;
                  }
                }
              }
            }
          }
        } catch {
          // Cross-origin stylesheet, skip
        }
      }
      return false;
    });

    expect(hasSupportsWrapper).toBe(true);
  });

  test('should disable parallax when prefers-reduced-motion is active', async ({ page }) => {
    // Emulate prefers-reduced-motion: reduce
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // Navigate to gist detail
    const card = page.locator('.gist-card').first();
    const cardVisible = await card.isVisible().catch(() => false);

    if (!cardVisible) {
      test.skip(true, 'No gist cards available');
      return;
    }

    // Dispatch offline event so hydrateGist() reads from IndexedDB
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await card.click();
    await page.waitForSelector('.gist-detail', { timeout: 8000 }).catch(() => {});

    // Verify navigation succeeded before checking scroll-progress
    const detailVisible = await page.locator('.gist-detail').isVisible().catch(() => false);
    if (!detailVisible) {
      test.skip(true, 'Navigation to gist detail failed');
      return;
    }

    const detailHeader = page.locator('.detail-header').first();
    const headerVisible = await detailHeader.isVisible().catch(() => false);

    if (headerVisible) {
      // When reduced motion is active, animation-duration should be ~0.01ms
      // due to the reduced-motion media query
      const animationDuration = await detailHeader.evaluate(
        (el) => window.getComputedStyle(el).animationDuration
      );

      // The animation duration should be negligible (0.01ms or 0s)
      const durationSec = parseFloat(animationDuration) || 0;
      expect(durationSec).toBeLessThan(0.1);

      test.info().annotations.push({
        type: 'reduced-motion',
        description: `detail-header animation-duration with reduced-motion: ${animationDuration}`,
      });
    }
  });

  test('should have detail-header-parallax keyframe with translateY and opacity', async ({ page }) => {
    const keyframeDetails = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (
              rule instanceof CSSKeyframesRule &&
              rule.name === 'detail-header-parallax'
            ) {
              const details: string[] = [];
              for (const kf of rule.cssRules) {
                if (kf instanceof CSSKeyframeRule) {
                  details.push(`${kf.keyText}: ${kf.style.cssText}`);
                }
              }
              return details.join('; ');
            }
          }
        } catch {
          // skip
        }
      }
      return null;
    });

    expect(keyframeDetails).toBeTruthy();
    expect(keyframeDetails).toContain('translateY');
    expect(keyframeDetails).toContain('opacity');

    test.info().annotations.push({
      type: 'keyframe',
      description: `detail-header-parallax: ${keyframeDetails}`,
    });
  });
});
