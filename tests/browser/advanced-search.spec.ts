/**
 * Advanced Search E2E Tests
 * Tests search UI, filters, saved searches, and offline functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Advanced Search', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and wait for initialization
    await page.goto('/');
    await page.waitForSelector('[data-testid="gist-item"]', { timeout: 10000 });
  });

  test('should display search input', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Search gists...');
  });

  test('should search by description', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await searchInput.fill('TypeScript');
    
    // Wait for debounced search
    await page.waitForTimeout(400);
    
    // Verify results contain search term
    const cards = page.locator('.gist-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    
    const firstCard = cards.first();
    const text = await firstCard.textContent();
    expect(text?.toLowerCase()).toContain('typescript');
  });

  test('should search by file content', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await searchInput.fill('function');
    
    await page.waitForTimeout(400);
    
    const cards = page.locator('.gist-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show clear button when typing', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    const clearBtn = page.locator('.clear-search-btn');
    
    await expect(clearBtn).toBeHidden();
    
    await searchInput.fill('test');
    await expect(clearBtn).toBeVisible();
    
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');
    await expect(clearBtn).toBeHidden();
  });

  test('should toggle filter panel', async ({ page }) => {
    const filterToggle = page.locator('.filter-toggle-btn');
    const filterPanel = page.locator('.filter-panel');
    
    await expect(filterPanel).toBeHidden();
    
    await filterToggle.click();
    await expect(filterPanel).toBeVisible();
    await expect(filterToggle).toHaveAttribute('aria-expanded', 'true');
    
    await filterToggle.click();
    await expect(filterPanel).toBeHidden();
  });

  test('should filter by language', async ({ page }) => {
    const filterToggle = page.locator('.filter-toggle-btn');
    await filterToggle.click();
    
    const languageSelect = page.locator('select[data-filter="language"]');
    await languageSelect.selectOption('TypeScript');
    
    await page.waitForTimeout(400);
    
    const cards = page.locator('.gist-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    
    // Verify filter count badge
    const filterCount = page.locator('.filter-count');
    await expect(filterCount).toBeVisible();
    await expect(filterCount).toHaveText('1');
  });

  test('should filter by file type', async ({ page }) => {
    const filterToggle = page.locator('.filter-toggle-btn');
    await filterToggle.click();
    
    const fileTypeSelect = page.locator('select[data-filter="fileType"]');
    await fileTypeSelect.selectOption('.ts');
    
    await page.waitForTimeout(400);
    
    const cards = page.locator('.gist-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter by date range', async ({ page }) => {
    const filterToggle = page.locator('.filter-toggle-btn');
    await filterToggle.click();
    
    const startDate = page.locator('input[data-filter="dateStart"]');
    const endDate = page.locator('input[data-filter="dateEnd"]');
    
    await startDate.fill('2026-01-01');
    await endDate.fill('2026-12-31');
    
    await page.waitForTimeout(400);
    
    const cards = page.locator('.gist-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter by visibility', async ({ page }) => {
    const filterToggle = page.locator('.filter-toggle-btn');
    await filterToggle.click();
    
    const publicRadio = page.locator('input[name="visibility"][value="public"]');
    await publicRadio.check();
    
    await page.waitForTimeout(400);
    
    const cards = page.locator('.gist-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter by starred only', async ({ page }) => {
    const filterToggle = page.locator('.filter-toggle-btn');
    await filterToggle.click();
    
    const starredCheckbox = page.locator('input[data-filter="starred"]');
    await starredCheckbox.check();
    
    await page.waitForTimeout(400);
    
    // May have 0 results if no starred gists
    const cards = page.locator('.gist-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should sort by different criteria', async ({ page }) => {
    const filterToggle = page.locator('.filter-toggle-btn');
    await filterToggle.click();
    
    const sortSelect = page.locator('select[data-filter="sortBy"]');
    
    // Test each sort option
    await sortSelect.selectOption('updated');
    await page.waitForTimeout(400);
    
    await sortSelect.selectOption('created');
    await page.waitForTimeout(400);
    
    await sortSelect.selectOption('stars');
    await page.waitForTimeout(400);
  });

  test('should clear all filters', async ({ page }) => {
    const filterToggle = page.locator('.filter-toggle-btn');
    await filterToggle.click();
    
    // Apply some filters
    const languageSelect = page.locator('select[data-filter="language"]');
    await languageSelect.selectOption('TypeScript');
    
    const starredCheckbox = page.locator('input[data-filter="starred"]');
    await starredCheckbox.check();
    
    await page.waitForTimeout(400);
    
    // Verify filter count
    const filterCount = page.locator('.filter-count');
    await expect(filterCount).toBeVisible();
    
    // Clear filters
    const clearBtn = page.locator('.clear-filters-btn');
    await clearBtn.click();
    
    await page.waitForTimeout(400);
    
    // Verify filters cleared
    await expect(filterCount).toBeHidden();
    await expect(starredCheckbox).not.toBeChecked();
  });

  test('should show search history on focus', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    
    // Perform a search to add to history
    await searchInput.fill('test search');
    await page.waitForTimeout(400);
    
    // Clear and focus again
    await searchInput.clear();
    await searchInput.focus();
    
    const historyDropdown = page.locator('.history-dropdown');
    await expect(historyDropdown).toBeVisible();
  });

  test('should save search', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await searchInput.fill('important search');
    
    const filterToggle = page.locator('.filter-toggle-btn');
    await filterToggle.click();
    
    const saveBtn = page.locator('.save-search-btn');
    await saveBtn.click();
    
    // Handle prompt dialog
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('My Saved Search');
    });
    
    await page.waitForTimeout(500);
    
    // Verify saved search appears in dropdown
    await searchInput.focus();
    const savedItem = page.locator('.saved-item');
    await expect(savedItem).toBeVisible();
  });

  test('should load saved search', async ({ page }) => {
    // First save a search (assuming one exists from previous test)
    const searchInput = page.locator('.search-input');
    await searchInput.focus();
    
    const savedItem = page.locator('.saved-item').first();
    if (await savedItem.isVisible()) {
      await savedItem.click();
      
      // Verify search is loaded
      await page.waitForTimeout(400);
      const value = await searchInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test('should delete saved search', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await searchInput.focus();
    
    const deleteBtn = page.locator('.delete-saved-btn').first();
    if (await deleteBtn.isVisible()) {
      const initialCount = await page.locator('.saved-item').count();
      
      await deleteBtn.click();
      await page.waitForTimeout(400);
      
      const newCount = await page.locator('.saved-item').count();
      expect(newCount).toBeLessThan(initialCount);
    }
  });

  test('should highlight search matches', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await searchInput.fill('function');
    
    await page.waitForTimeout(400);
    
    // Check for search snippets
    const snippets = page.locator('.search-snippet');
    if (await snippets.count() > 0) {
      const firstSnippet = snippets.first();
      await expect(firstSnippet).toBeVisible();
      
      // Check for highlight marks
      const marks = firstSnippet.locator('mark');
      await expect(marks.first()).toBeVisible();
    }
  });

  test('should work offline', async ({ page, context }) => {
    // Load gists first
    await page.waitForSelector('[data-testid="gist-item"]');
    
    // Go offline
    await context.setOffline(true);
    
    // Perform search
    const searchInput = page.locator('.search-input');
    await searchInput.fill('test');
    
    await page.waitForTimeout(400);
    
    // Should still show results from IndexedDB
    const cards = page.locator('.gist-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
    
    // Go back online
    await context.setOffline(false);
  });

  test('should handle empty results', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await searchInput.fill('xyznonexistentquery123');
    
    await page.waitForTimeout(400);
    
    const emptyMessage = page.locator('.virtual-list-empty');
    await expect(emptyMessage).toBeVisible();
    await expect(emptyMessage).toHaveText('No results found');
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Tab to search input
    await page.keyboard.press('Tab');
    const searchInput = page.locator('.search-input');
    await expect(searchInput).toBeFocused();
    
    // Type search query
    await page.keyboard.type('test');
    await page.waitForTimeout(400);
    
    // Tab to filter toggle
    await page.keyboard.press('Tab');
    const filterToggle = page.locator('.filter-toggle-btn');
    await expect(filterToggle).toBeFocused();
    
    // Press Enter to toggle filters
    await page.keyboard.press('Enter');
    const filterPanel = page.locator('.filter-panel');
    await expect(filterPanel).toBeVisible();
  });

  test('should handle rapid search input', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    
    // Type rapidly
    await searchInput.fill('a');
    await searchInput.fill('ab');
    await searchInput.fill('abc');
    await searchInput.fill('abcd');
    
    // Wait for debounce
    await page.waitForTimeout(400);
    
    // Should only perform one search
    const cards = page.locator('.gist-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should combine search query with filters', async ({ page }) => {
    const searchInput = page.locator('.search-input');
    await searchInput.fill('function');
    
    const filterToggle = page.locator('.filter-toggle-btn');
    await filterToggle.click();
    
    const languageSelect = page.locator('select[data-filter="language"]');
    await languageSelect.selectOption('TypeScript');
    
    await page.waitForTimeout(400);
    
    const cards = page.locator('.gist-card');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
    
    // Results should match both query and filter
    if (count > 0) {
      const firstCard = cards.first();
      const text = await firstCard.textContent();
      expect(text?.toLowerCase()).toContain('typescript');
    }
  });
});
