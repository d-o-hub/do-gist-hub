import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for d.o. Gist Hub (2026 Best Practices)
 * Reference: https://playwright.dev/docs/best-practices
 * Reference: https://testdino.com/blog/playwright-best-practices/
 *
 * Key Principles:
 * - Test what users see, not implementation details
 * - Use stable, role-based locators (getByRole, getByLabel)
 * - Tests are isolated with separate browser contexts
 * - Web-first assertions auto-retry
 * - Mock external dependencies for speed
 */
export default defineConfig({
  testDir: './tests',

  // Run tests in parallel for speed
  fullyParallel: true,

  // Fail build if test.only is left in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI for flakiness detection
  retries: process.env.CI ? 2 : 0,

  // Single worker in CI for stability, parallel locally
  workers: process.env.CI ? 1 : undefined,

  // Global timeout per test
  timeout: 30 * 1000,

  // Expect timeout for assertions
  expect: {
    timeout: 10 * 1000,
  },

  // Reporters
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list', { printSteps: true }],
  ],

  // Global test settings
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
  },

  // Test projects - organized by category
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testDir: './tests/browser',
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testDir: './tests/browser',
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testDir: './tests/browser',
    },

    // Mobile emulation - key breakpoints
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      testDir: './tests/mobile',
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
      testDir: './tests/mobile',
    },

    // Tablet
    {
      name: 'tablet',
      use: { ...devices['iPad Mini'] },
      testDir: './tests/mobile',
    },

    // Small mobile - 320px breakpoint
    {
      name: 'mobile-small',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 320, height: 568 },
      },
      testDir: './tests/mobile',
    },

    // Offline scenarios
    {
      name: 'offline',
      use: {
        ...devices['Desktop Chrome'],
        offline: true,
      },
      testDir: './tests/offline',
    },

    // Accessibility testing
    {
      name: 'accessibility',
      use: { ...devices['Desktop Chrome'] },
      testDir: './tests/accessibility',
    },
  ],

  // Web server for dev mode
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 300 * 1000,
  },
});
