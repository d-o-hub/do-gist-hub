#!/usr/bin/env node
/**
 * Verify UI at multiple viewports
 * Takes responsive screenshots and checks navigation visibility.
 * Usage: pnpm run verify:responsive
 *
 * Requires the dev server to be running on localhost:3000.
 */

import { chromium, type Browser, type Page } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = join(import.meta.dirname ?? '.', '..', 'analysis', 'responsive');

interface Viewport {
  name: string;
  width: number;
  height: number;
}

const viewports: Viewport[] = [
  { name: 'mobile-320px', width: 320, height: 844 },
  { name: 'mobile-390px', width: 390, height: 844 },
  { name: 'tablet-768px', width: 768, height: 1024 },
  { name: 'desktop-1024px', width: 1024, height: 800 },
  { name: 'desktop-1280px', width: 1280, height: 800 },
];

async function verify(): Promise<void> {
  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser: Browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage();

  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: join(OUTPUT_DIR, `${vp.name}.png`),
      fullPage: true,
    });

    // Check navigation visibility
    const bottomNav = await page.locator('.bottom-nav').isVisible();
    const sidebar = await page.locator('.sidebar-nav').isVisible();
    const rail = await page.locator('.rail-nav').isVisible();

    console.log(`${vp.name}:`);
    console.log(`  - bottom-nav visible: ${bottomNav}`);
    console.log(`  - sidebar visible: ${sidebar}`);
    console.log(`  - rail visible: ${rail}`);
  }

  if (errors.length > 0) {
    console.log('\nConsole errors:', errors);
  } else {
    console.log('\n✓ No console errors');
  }

  await browser.close();
  console.log(`\nScreenshots saved to ${OUTPUT_DIR}/`);
}

verify().catch(console.error);
