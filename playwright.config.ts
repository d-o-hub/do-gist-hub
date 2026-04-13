import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for GitHub Gist Manager
 * Tests browser, mobile emulation, offline scenarios, and accessibility
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Desktop browser
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

    // Mobile emulation
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

    // Offline scenarios
    {
      name: 'offline',
      use: {
        ...devices['Desktop Chrome'],
        offline: true,
      },
      testDir: './tests/offline',
    },

    // Accessibility
    {
      name: 'accessibility',
      use: { ...devices['Desktop Chrome'] },
      testDir: './tests/accessibility',
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
