import { defineConfig, devices } from '@playwright/test';

/**
 * Visual verification config — no webServer, manual dev server expected.
 */
export default defineConfig({
  testDir: './tests/visual',
  fullyParallel: true,
  forbidOnly: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'on',
    trace: 'off',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'visual',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
