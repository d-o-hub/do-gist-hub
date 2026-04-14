/**
 * Standalone visual verification script
 * Takes screenshots at all breakpoints and reports findings
 */
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = 'analysis/tests';
const BASE_URL = 'http://localhost:5173';

const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 812, label: 'Mobile (375×812)' },
  { name: 'tablet', width: 768, height: 1024, label: 'Tablet (768×1024)' },
  { name: 'desktop', width: 1280, height: 800, label: 'Desktop (1280×800)' },
  { name: 'wide', width: 1536, height: 864, label: 'Wide Desktop (1536×864)' },
];

interface Findings {
  breakpoint: string;
  horizontalOverflow: boolean;
  navVisible: boolean;
  navType: string;
  cardCount: number;
  cardsOverlap: boolean;
  smallTouchTargets: { tag: string; w: number; h: number }[];
  activeNavPillStyle: { borderRadius: string; backgroundColor: string } | null;
  errors: string[];
}

async function verifyBreakpoint(browser: any, bp: (typeof BREAKPOINTS)[0]): Promise<Findings> {
  const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
  const findings: Findings = {
    breakpoint: bp.label,
    horizontalOverflow: false,
    navVisible: false,
    navType: 'none',
    cardCount: 0,
    cardsOverlap: false,
    smallTouchTargets: [],
    activeNavPillStyle: null,
    errors: [],
  };

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(500);

    // Horizontal overflow check
    const overflow = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const cw = document.documentElement.clientWidth;
      return sw > cw;
    });
    findings.horizontalOverflow = overflow;
    if (overflow) findings.errors.push(`Horizontal overflow detected: scrollWidth > clientWidth`);

    // Navigation check
    const bottomNavCount = await page.locator('.bottom-nav').count();
    const sidebarNavCount = await page.locator('.sidebar-nav').count();
    const sidebarVisible = bp.width >= 768 && sidebarNavCount > 0;
    const bottomVisible = bp.width < 768 && bottomNavCount > 0;
    findings.navVisible = sidebarVisible || bottomVisible;
    findings.navType = sidebarVisible ? 'sidebar' : bottomVisible ? 'bottom' : 'none';
    if (!findings.navVisible) findings.errors.push(`No navigation visible`);

    // Card rendering
    findings.cardCount = await page.locator('.gist-card').count();

    // Overlap check
    if (findings.cardCount > 0) {
      const overlaps = await page.evaluate(() => {
        const elements = document.querySelectorAll('.gist-card');
        const rects: DOMRect[] = [];
        elements.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.height > 0) rects.push(r);
        });
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i],
              b = rects[j];
            const ox = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
            const oy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            if (ox > 10 && oy > 10) return true;
          }
        }
        return false;
      });
      findings.cardsOverlap = overlaps;
      if (overlaps) findings.errors.push(`Card overlap detected`);
    }

    // Touch target check (mobile only)
    if (bp.width < 768) {
      findings.smallTouchTargets = await page.evaluate(() => {
        const elements = document.querySelectorAll(
          'button, .nav-item, .icon-button, .filter-btn, .gist-action-btn'
        );
        const small: { tag: string; w: number; h: number }[] = [];
        elements.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
            small.push({ tag: el.tagName, w: Math.round(r.width), h: Math.round(r.height) });
          }
        });
        return small;
      });
      if (findings.smallTouchTargets.length > 0) {
        findings.errors.push(`${findings.smallTouchTargets.length} touch targets < 44px`);
      }
    }

    // Active nav pill style check
    const activeSelector = bp.width >= 768 ? '.sidebar-item.active' : '.nav-item.active';
    const activeEl = await page.locator(activeSelector).first();
    if ((await activeEl.count()) > 0) {
      findings.activeNavPillStyle = await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { borderRadius: cs.borderRadius, backgroundColor: cs.backgroundColor };
      }, activeSelector);

      // Verify pill styling
      const br = findings.activeNavPillStyle?.borderRadius || '';
      if (!br.includes('9999') && !br.includes('full') && parseFloat(br) < 50) {
        findings.errors.push(`Active nav item missing pill-style border-radius: ${br}`);
      }
    } else {
      findings.errors.push(`No active nav item found`);
    }

    // Screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `screenshot-${bp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  ✓ Screenshot saved: ${screenshotPath}`);
  } catch (err: any) {
    findings.errors.push(`Exception: ${err.message}`);
  } finally {
    await page.close();
  }

  return findings;
}

async function main() {
  console.log('\n========================================');
  console.log('  UI Visual Verification Report');
  console.log('========================================\n');

  // Ensure screenshot dir exists
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results: Findings[] = [];

  for (const bp of BREAKPOINTS) {
    console.log(`Checking ${bp.label}...`);
    const findings = await verifyBreakpoint(browser, bp);
    results.push(findings);
    console.log(
      `  Cards: ${findings.cardCount} | Nav: ${findings.navType} | Overflow: ${findings.horizontalOverflow}`
    );
    if (findings.errors.length > 0) {
      console.log(`  ⚠ Issues: ${findings.errors.join('; ')}`);
    } else {
      console.log(`  ✓ All checks passed`);
    }
    console.log('');
  }

  await browser.close();

  // Summary
  console.log('========================================');
  console.log('  Summary');
  console.log('========================================');
  let totalIssues = 0;
  for (const r of results) {
    const status = r.errors.length === 0 ? '✓ PASS' : `✗ FAIL (${r.errors.length} issues)`;
    console.log(`  ${r.breakpoint}: ${status}`);
    if (r.errors.length > 0) {
      r.errors.forEach((e) => console.log(`    - ${e}`));
      totalIssues += r.errors.length;
    }
  }
  console.log(`\n  Total issues: ${totalIssues}`);
  console.log('========================================\n');

  // Exit with error code if issues found
  if (totalIssues > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
