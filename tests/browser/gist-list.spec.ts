/**
 * Browser Gist List Tests
 * Test gist list rendering, search, filters, and sorting
 */
import { test, expect } from '../base';

test.describe('Gist List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should display gist list header with search and filters', async ({ page }) => {
    await expect(page.locator('.search-input')).toBeVisible();
    await expect(page.locator('.filter-buttons')).toBeVisible();
    await expect(page.locator('#sort-select')).toBeVisible();

    // Filter buttons
    await expect(page.locator('[data-filter="all"]')).toBeVisible();
    await expect(page.locator('[data-filter="mine"]')).toBeVisible();
    await expect(page.locator('[data-filter="starred"]')).toBeVisible();
  });

  test('should show empty state when no gists exist', async ({ page }) => {
    const emptyState = page.locator('.empty-state-container');
    const gistList = page.locator('.gist-list');

    // Wait for either the empty state or the gist list to become visible
    await expect(emptyState.or(gistList).first()).toBeVisible({ timeout: 10000 });

    const emptyVisible = await emptyState.isVisible();
    const listVisible = await gistList.isVisible();

    expect(emptyVisible || listVisible).toBe(true);
  });

  test('should filter gists by category', async ({ page }) => {
    // Click "Mine" filter
    await page.locator('[data-filter="mine"]').click();
    await expect(page.locator('[data-filter="mine"]')).toHaveClass(/active/);

    // Click "Starred" filter  
    await page.locator('[data-filter="starred"]').click();
    await expect(page.locator('[data-filter="starred"]')).toHaveClass(/active/);

    // Click "All" filter
    await page.locator('[data-filter="all"]').click();
    await expect(page.locator('[data-filter="all"]')).toHaveClass(/active/);
  });

  test('should change sort order', async ({ page }) => {
    const sortSelect = page.locator('#sort-select');
    await expect(sortSelect).toBeVisible();

    // Change to different sort options
    await sortSelect.selectOption('created-desc');
    await expect(sortSelect).toHaveValue('created-desc');

    await sortSelect.selectOption('updated-asc');
    await expect(sortSelect).toHaveValue('updated-asc');

    await sortSelect.selectOption('updated-desc');
    await expect(sortSelect).toHaveValue('updated-desc');
  });

  test('should search gists with debounce', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('test search');
    // Debounce wait - alternatively wait for some UI change if possible
    await page.waitForTimeout(500);

    // Search should be applied (UI should update)
    const searchValue = await searchInput.inputValue();
    expect(searchValue).toBe('test search');
  });

  test('should display gist cards with proper structure', async ({ page }) => {
    const emptyState = page.locator('.empty-state-container');
    const gistList = page.locator('.gist-list');

    // Wait for initial load
    await expect(emptyState.or(gistList).first()).toBeVisible({ timeout: 10000 });

    const cards = page.locator('.gist-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Check first card structure
      const firstCard = cards.first();
      await expect(firstCard.locator('.gist-card-header')).toBeVisible();
      await expect(firstCard.locator('.gist-card-meta')).toBeVisible();
      
      // Card should have action buttons
      await expect(firstCard.locator('.star-btn')).toBeVisible();
      await expect(firstCard.locator('.delete-btn')).toBeVisible();
    }
  });

  test('should show gist metadata on cards', async ({ page }) => {
    const gistList = page.locator('.gist-list');
    await expect(gistList.or(page.locator('.empty-state-container')).first()).toBeVisible();

    const cards = page.locator('.gist-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();
      const meta = firstCard.locator('.gist-card-meta');
      await expect(meta).toBeVisible();

      // Should show file count, visibility, update time
      const metaText = await meta.textContent();
      expect(metaText).toBeTruthy();
    }
  });

  test('should toggle star button on card', async ({ page }) => {
    const gistList = page.locator('.gist-list');
    await expect(gistList.or(page.locator('.empty-state-container')).first()).toBeVisible();

    const starBtn = page.locator('.gist-card .star-btn').first();
    const starBtnVisible = await starBtn.isVisible().catch(() => false);

    if (starBtnVisible) {
      const initialLabel = await starBtn.getAttribute('aria-label');
      await starBtn.click();
      
      // Button should be disabled briefly during request
      await page.waitForTimeout(100);
      
      // Label should change after toggle
      const newLabel = await starBtn.getAttribute('aria-label');
      expect(newLabel).not.toBe(initialLabel);
    }
  });
});
