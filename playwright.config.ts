import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npm run build:ui && tsx src/index.ts',
    url: 'http://localhost:3000/health',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
