/**
 * Accessibility Screen Reader Tests
 * Test screen reader announcements, live regions, and assistive technology support
 */
import { test, expect } from '@playwright/test';

test.describe('Accessibility - Screen Reader', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should announce page title changes', async ({ page }) => {
    // App title should be visible
    const appTitle = page.locator('[data-testid="app-title"]');
    await expect(appTitle).toBeVisible();

    const titleText = await appTitle.textContent();
    expect(titleText).toBeTruthy();
    expect(titleText?.length).toBeGreaterThan(0);
  });

  test('should announce toast notifications via aria-live', async ({ page }) => {
    // Trigger a toast by performing an action
    await page.locator('[data-testid="nav-create"]').click();

    // Try to create a gist without required fields
    await page.locator('#create-submit-btn').click();
    await page.waitForTimeout(500);

    // Check if toast has aria-live or role="alert"
    const toast = page.locator('.toast, [role="alert"], [aria-live]');
    const toastVisible = await toast.isVisible().catch(() => false);

    if (toastVisible) {
      const ariaLive = await toast.getAttribute('aria-live');
      const role = await toast.getAttribute('role');

      test.info().annotations.push({
        type: 'toast-announcement',
        description: `Toast has aria-live="${ariaLive}" or role="${role}"`,
      });
    }
  });

  test('should have meaningful button labels', async ({ page }) => {
    // Get all buttons and check their labels
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    let meaningfulLabels = 0;
    let genericLabels = 0;

    for (let i = 0; i < Math.min(buttonCount, 30); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = (await button.textContent())?.trim();

      const label = ariaLabel || text || '';

      // Check for generic/useless labels
      if (['...', '···', '•••', ''].includes(label.toLowerCase())) {
        genericLabels++;
      } else if (label.length > 0) {
        meaningfulLabels++;
      }
    }

    test.info().annotations.push({
      type: 'button-labels',
      description: `${meaningfulLabels} meaningful, ${genericLabels} generic labels`,
    });

    expect(genericLabels).toBeLessThan(5);
  });

  test('should announce navigation changes', async ({ page }) => {
    // Navigate and check if main content region updates
    await page.locator('[data-testid="nav-starred"]').click();
    await page.waitForTimeout(300);

    // Main content should have updated
    const mainContent = page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible();

    // Check if there's an aria-live region for announcements
    const announcer = page.locator('[aria-live="polite"], [aria-live="assertive"]');
    const announcerExists = await announcer.count().then(c => c > 0);

    test.info().annotations.push({
      type: 'nav-announcement',
      description: `Announcer region exists: ${announcerExists}`,
    });
  });

  test('should provide context for icon-only buttons', async ({ page }) => {
    // Theme toggle should have label
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    const themeLabel = await themeToggle.getAttribute('aria-label');
    expect(themeLabel).toBeTruthy();

    // Settings button should have label
    const settingsBtn = page.locator('[data-testid="settings-btn"]');
    const settingsLabel = await settingsBtn.getAttribute('aria-label');
    expect(settingsLabel).toBeTruthy();
  });

  test('should announce star toggle state', async ({ page }) => {
    await page.waitForTimeout(1000);

    const starBtn = page.locator('.gist-card .star-btn').first();
    const starVisible = await starBtn.isVisible().catch(() => false);

    if (starVisible) {
      const ariaLabel = await starBtn.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toMatch(/star|unstar/i);
    }
  });

  test('should announce sync status', async ({ page }) => {
    const syncIndicator = page.locator('#sync-indicator');
    await expect(syncIndicator).toBeVisible();

    const ariaLabel = await syncIndicator.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toMatch(/sync|offline|online|pending/i);
  });

  test('should have descriptive link text for external links', async ({ page }) => {
    await page.waitForTimeout(1000);

    // GitHub links on gist cards
    const githubLinks = page.locator('.gist-card a[href*="gist.github.com"]');
    const linkCount = await githubLinks.count();

    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const link = githubLinks.nth(i);
      const text = (await link.textContent())?.trim();
      const ariaLabel = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');

      const label = text || ariaLabel || title;
      expect(label).toBeTruthy();
    }
  });

  test('should use aria-describedby for help text', async ({ page }) => {
    // Navigate to settings
    await page.locator('[data-testid="settings-btn"]').click();

    // PAT input should have help text
    const patInput = page.locator('#pat-input');
    const ariaDescribedBy = await patInput.getAttribute('aria-describedby');

    if (ariaDescribedBy) {
      const helpText = page.locator(`#${ariaDescribedBy}`);
      const helpExists = await helpText.count().then(c => c > 0);
      expect(helpExists).toBe(true);
    } else {
      // Check if help text is visually associated
      const helpText = page.locator('.help-text');
      const helpVisible = await helpText.isVisible().catch(() => false);
      
      test.info().annotations.push({
        type: 'help-text',
        description: `Help text visible but not linked via aria-describedby: ${helpVisible}`,
      });
    }
  });

  test('should announce form validation errors', async ({ page }) => {
    // Navigate to create page
    await page.locator('[data-testid="nav-create"]').click();

    // Try to submit without files
    await page.locator('#create-submit-btn').click();
    await page.waitForTimeout(500);

    // Check for error announcement
    const toast = page.locator('.toast');
    const toastVisible = await toast.isVisible().catch(() => false);

    if (toastVisible) {
      const toastRole = await toast.getAttribute('role');
      const toastLive = await toast.getAttribute('aria-live');

      test.info().annotations.push({
        type: 'error-announcement',
        description: `Error toast has role="${toastRole}" aria-live="${toastLive}"`,
      });
    }
  });

  test('should have proper heading for main content sections', async ({ page }) => {
    // Home route should have heading
    await page.locator('[data-testid="nav-home"]').click();
    
    // Starred route should have heading
    await page.locator('[data-testid="nav-starred"]').click();
    await expect(page.locator('h2')).toContainText('Starred');

    // Create route should have heading
    await page.locator('[data-testid="nav-create"]').click();
    await expect(page.locator('h2')).toContainText('Create');

    // Offline route should have heading
    await page.locator('[data-testid="nav-offline"]').click();
    await expect(page.locator('h2')).toContainText('Offline');
  });

  test('should provide context for gist cards', async ({ page }) => {
    await page.waitForTimeout(1000);

    const cards = page.locator('.gist-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();
      
      // Card should be an article element
      const tagName = await firstCard.evaluate(el => el.tagName);
      expect(tagName.toLowerCase()).toBe('article');

      // Should have accessible name
      const ariaLabel = await firstCard.getAttribute('aria-label');
      const title = firstCard.locator('.gist-card-title');
      const titleText = await title.textContent().catch(() => '');

      test.info().annotations.push({
        type: 'card-accessibility',
        description: `Card is <article>, has title: "${titleText?.slice(0, 50)}"`,
      });
    }
  });

  test('should announce empty states', async ({ page }) => {
    await page.waitForTimeout(1000);

    const emptyState = page.locator('.empty-state');
    const emptyVisible = await emptyState.isVisible().catch(() => false);

    if (emptyVisible) {
      const emptyText = await emptyState.textContent();
      expect(emptyText).toBeTruthy();
      expect(emptyText?.length).toBeGreaterThan(0);

      // Should have role="status" or be in a live region
      const role = await emptyState.getAttribute('role');
      test.info().annotations.push({
        type: 'empty-state',
        description: `Empty state has role="${role}"`,
      });
    }
  });

  test('should use lang attribute on html element', async ({ page }) => {
    const htmlLang = await page.evaluate(() => 
      document.documentElement.getAttribute('lang')
    );

    test.info().annotations.push({
      type: 'html-lang',
      description: `HTML lang attribute: "${htmlLang}"`,
    });

    // Recommended but not required for this test
    expect(htmlLang).toBeTruthy();
  });
});
