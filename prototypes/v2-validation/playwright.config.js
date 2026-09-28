import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['device/*.spec.js', 'real-art/*.spec.js'],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  workers: 1,
  retries: 0,
  use: {
    browserName: 'chromium',
    headless: true,
  },
  reporter: [['line']],
});
