import { test, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname);

async function openHarness(page) {
  const html = await readFile(resolve(root, 'index.html'), 'utf8');
  const css = await readFile(resolve(root, 'styles.css'), 'utf8');
  const core = await readFile(resolve(root, 'brush-core.js'), 'utf8');
  const app = await readFile(resolve(root, 'app.js'), 'utf8');
  await page.route('https://illustro.test/styles.css', r => r.fulfill({ contentType: 'text/css', body: css }));
  await page.route('https://illustro.test/brush-core.js', r => r.fulfill({ contentType: 'text/javascript', body: core }));
  await page.route('https://illustro.test/app.js', r => r.fulfill({ contentType: 'text/javascript', body: app }));
  await page.route('https://illustro.test/', r => r.fulfill({ contentType: 'text/html', body: html }));
  await page.goto('https://illustro.test/');
}

test('browser pipeline processes 100k accepted samples with bounded release', async ({ page }) => {
  await openHarness(page);
  const b = await page.evaluate(() => window.illustroBrushDevice.runSyntheticBrowserBenchmark({ samples: 100000, batch: 32 }));
  expect(b.accepted).toBe(100000);
  expect(b.releaseWork).toBeLessThanOrEqual(272);
  expect(b.maxPendingObserved).toBeLessThanOrEqual(8);
  expect(b.p95Ms).toBeLessThan(6);
  await mkdir(new URL('../results/', import.meta.url), { recursive: true });
  await writeFile(new URL('../results/device-browser-ci.json', import.meta.url), JSON.stringify({ generatedAt: new Date().toISOString(), browserSynthetic100k: b }, null, 2) + '\n');
});

test('manual device report cannot falsely claim pen completion without pen evidence', async ({ page }) => {
  await openHarness(page);
  const s = await page.evaluate(() => window.illustroBrushDevice.summary());
  expect(s.gateEvidence.penProtocolComplete).toBe(false);
  expect(s.session.penSamples).toBe(0);
});
