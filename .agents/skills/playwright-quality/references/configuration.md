# Configuration (2026 Best Practices)

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30 * 1000,
  expect: { timeout: 10 * 1000 },
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list', { printSteps: true }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 10 * 1000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testDir: './tests/browser' },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testDir: './tests/browser' },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testDir: './tests/browser' },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, testDir: './tests/mobile' },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] }, testDir: './tests/mobile' },
    { name: 'tablet', use: { ...devices['iPad Mini'] }, testDir: './tests/mobile' },
    {
      name: 'mobile-small',
      use: { viewport: { width: 320, height: 568 } },
      testDir: './tests/mobile',
    },
    {
      name: 'offline',
      use: { ...devices['Desktop Chrome'], offline: true },
      testDir: './tests/offline',
    },
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
```
