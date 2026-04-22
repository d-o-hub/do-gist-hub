import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/benchmarks',
  fullyParallel: true,
  timeout: 30 * 1000,
  use: {
    baseURL: 'http://localhost:3000',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
