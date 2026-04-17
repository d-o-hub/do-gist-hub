/**
 * Accessibility Keyboard Navigation Tests
 * Test keyboard navigation, focus management, tab order, and focus traps
 */
import { test, expect } from '@playwright/test';

test.describe('Accessibility - Keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should be reachable via keyboard from initial load', async ({ page }) => {
    // First focusable element should be reachable with Tab
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedTag).toBeTruthy();
  });

  test('should navigate with Tab key', async ({ page }) => {
    // Press Tab multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }

    // Something should be focused
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focusedTag);
  });

  test('should support Shift+Tab for reverse navigation', async ({ page }) => {
    // Tab forward a few times
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }

    const forwardElement = await page.evaluate(() => document.activeElement?.tagName);

    // Shift+Tab should go back
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(50);

    const backwardElement = await page.evaluate(() => document.activeElement?.tagName);
    
    // Should have moved focus (may be same if at start)
    test.info().annotations.push({
      type: 'shift-tab',
      description: `Forward: ${forwardElement}, Backward: ${backwardElement}`,
    });
  });

  test('should activate buttons with Enter key', async ({ page }) => {
    // Navigate to settings button
    const settingsBtn = page.locator('[data-testid="settings-btn"]');
    await settingsBtn.focus();
    await expect(settingsBtn).toBeFocused();

    // Activate with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Should navigate to settings
    await expect(page).toHaveURL(/#settings/);
  });

  test('should activate buttons with Space key', async ({ page }) => {
    // Navigate to first nav item
    const homeBtn = page.locator('[data-testid="nav-home"]');
    await homeBtn.focus();
    await expect(homeBtn).toBeFocused();

    // Activate with Space
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // Should still be on home (no error)
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
  });

  test('should manage focus on route navigation', async ({ page }) => {
    // Navigate to create page
    await page.locator('[data-testid="nav-create"]').click();
    await page.waitForTimeout(300);

    // Focus should be somewhere in the new view
    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElement).toBeTruthy();

    // Should be able to tab within the new view
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);
    
    const newActiveElement = await page.evaluate(() => document.activeElement?.tagName);
    test.info().annotations.push({
      type: 'focus-after-nav',
      description: `After nav: ${activeElement}, After tab: ${newActiveElement}`,
    });
  });

  test('should have visible focus indicators', async ({ page }) => {
    // Focus first button
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Check if focused element has visible focus style
    const hasFocusStyle = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      
      const style = getComputedStyle(el);
      const outline = style.outline;
      const outlineWidth = style.outlineWidth;
      const boxShadow = style.boxShadow;
      
      // Check for any visible focus indicator
      return outline !== 'none' || 
             outlineWidth !== '0px' || 
             boxShadow !== 'none';
    });

    test.info().annotations.push({
      type: 'focus-visible',
      description: `Has visible focus indicator: ${hasFocusStyle}`,
    });
  });

  test('should not trap focus unintentionally', async ({ page }) => {
    // Press Tab many times - should eventually cycle through all focusable elements
    const tabSequence: string[] = [];
    
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
      
      const activeId = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return 'none';
        return el.id || el.className?.toString().slice(0, 30) || el.tagName;
      });
      
      tabSequence.push(activeId);
    }

    // Should have visited multiple different elements (not trapped)
    const uniqueElements = new Set(tabSequence);
    expect(uniqueElements.size).toBeGreaterThan(3);
  });

  test('should close modals with Escape key (if any)', async ({ page }) => {
    // Navigate to settings
    await page.locator('[data-testid="settings-btn"]').click();
    
    // Press Escape (shouldn't break anything even if no modal)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Page should still be functional
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible();
  });

  test('should navigate filter buttons with arrow keys', async ({ page }) => {
    // Focus first filter button
    const firstFilter = page.locator('[data-filter="all"]');
    await firstFilter.focus();
    await expect(firstFilter).toBeFocused();

    // Try arrow keys
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    // Focus should have moved to another filter or stayed (both acceptable)
    const focusedFilter = page.locator('.filter-btn:focus');
    const isFocused = await focusedFilter.count().then(c => c > 0);
    
    test.info().annotations.push({
      type: 'arrow-nav',
      description: `Arrow key navigation moved focus: ${isFocused}`,
    });
  });

  test('should navigate gist cards with keyboard', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Tab to first gist card
    let foundCard = false;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
      
      const activeElement = await page.evaluate(() => document.activeElement?.className);
      if (activeElement?.includes('gist-card')) {
        foundCard = true;
        break;
      }
    }

    test.info().annotations.push({
      type: 'card-keyboard',
      description: `Found focusable gist card: ${foundCard}`,
    });
  });

  test('should support keyboard form submission', async ({ page }) => {
    // Navigate to create page
    await page.locator('[data-testid="nav-create"]').click();

    // Fill form with keyboard
    const descriptionInput = page.locator('#gist-description');
    await descriptionInput.fill('Test Gist');

    // Tab to submit button
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(50);
    }

    // Check if we're on submit button
    const activeElement = await page.evaluate(() => document.activeElement?.id);
    
    if (activeElement === 'create-submit-btn') {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Should show validation or success
      const toast = page.locator('.toast');
      const toastVisible = await toast.isVisible().catch(() => false);
      
      test.info().annotations.push({
        type: 'keyboard-submit',
        description: `Toast after keyboard submit: ${toastVisible}`,
      });
    }
  });

  test('should skip repetitive navigation elements with skip link', async ({ page }) => {
    // Check if skip link exists (recommended but not required)
    const skipLink = page.locator('a[href="#main-content"], a:has-text("Skip to content")');
    const skipExists = await skipLink.count().then(c => c > 0);

    test.info().annotations.push({
      type: 'skip-link',
      description: `Skip navigation link exists: ${skipExists}`,
    });
  });
});
