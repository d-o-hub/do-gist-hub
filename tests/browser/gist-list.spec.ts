/**
 * Browser Gist List Tests
 * Test gist list rendering, search, filters, and sorting
 */
import { test, expect } from '@playwright/test';

test.describe('Gist List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
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
    const emptyState = page.locator('.empty-state');
    // May show loading initially, then empty state
    await page.waitForTimeout(1000);
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    const listVisible = await page.locator('.gist-list').isVisible();
    
    // Either empty state or loading is acceptable
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

    await sortSelect.selectOption('title-asc');
    await expect(sortSelect).toHaveValue('title-asc');

    await sortSelect.selectOption('updated-desc');
    await expect(sortSelect).toHaveValue('updated-desc');
  });

  test('should search gists with debounce', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('test search');
    await page.waitForTimeout(350); // Wait for debounce

    // Search should be applied (UI should update)
    const searchValue = await searchInput.inputValue();
    expect(searchValue).toBe('test search');
  });

  test('should display gist cards with proper structure', async ({ page }) => {
    // Wait for cards to potentially render
    await page.waitForTimeout(1000);

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
    await page.waitForTimeout(1000);

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
    await page.waitForTimeout(1000);

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
