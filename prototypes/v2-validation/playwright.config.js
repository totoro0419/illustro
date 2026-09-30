import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: [
    'device/*.spec.js',
    'real-art/real-art.spec.js',
    'real-art/development-regression.spec.js',
    'real-art/interactive-region.spec.js',
    'real-art/final-large-source.spec.js',
    'real-art/final-large2-source.spec.js',
    'real-art/final-large3-source.spec.js',
    'connectivity/interactive-connectivity.spec.js',
  ],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  workers: 1,
  retries: 0,
  use: {
    browserName: 'chromium',
    headless: true,
    launchOptions: process.env.ILLUSTRO_TEST_BROWSER ? { executablePath: process.env.ILLUSTRO_TEST_BROWSER } : {},
  },
  reporter: [['line']],
});
