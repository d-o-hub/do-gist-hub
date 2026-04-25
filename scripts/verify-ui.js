// Verify UI at multiple viewports
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const OUTPUT_DIR = 'analysis/responsive';

const viewports = [
  { name: 'mobile-320px', width: 320, height: 844 },
  { name: 'mobile-390px', width: 390, height: 844 },
  { name: 'tablet-768px', width: 768, height: 1024 },
  { name: 'desktop-1024px', width: 1024, height: 800 },
  { name: 'desktop-1280px', width: 1280, height: 800 },
];

async function verify() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ 
      path: `${OUTPUT_DIR}/${vp.name}.png`, 
      fullPage: true 
    });
    
    // Check nav visibility
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
  console.log('\nScreenshots saved to analysis/responsive/');
}

verify().catch(console.error);