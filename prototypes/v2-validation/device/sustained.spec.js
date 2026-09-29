import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const file = resolve(import.meta.dirname, 'Illustro_Brush_V2_Sustained_Validation.html');

async function openHarness(page) {
  const html = await readFile(file, 'utf8');
  await page.route('https://illustro.test/**', r => {
    const url = new URL(r.request().url());
    if (url.pathname === '/' || url.pathname.endsWith('.html')) {
      return r.fulfill({ contentType: 'text/html', body: html });
    }
    return r.abort();
  });
  await page.goto('https://illustro.test/?ci=1');
}

test('adaptive sustained harness completes automatic phase and stays bounded', async ({ page }) => {
  test.setTimeout(30000);
  await openHarness(page);
  await page.click('#start');
  await expect.poll(async () => {
    const r = await page.evaluate(() => window.illustroSustained.report());
    return r.auto.phase;
  }, { timeout: 15000 }).toBe('post-pen');

  const r = await page.evaluate(() => window.illustroSustained.report());
  expect(r.ciMode).toBe(true);
  expect(r.auto.elapsedMs).toBeGreaterThanOrEqual(r.config.minMs);
  expect(r.auto.generatedSamples).toBeGreaterThan(0);
  expect(r.auto.acceptedSamples).toBeGreaterThanOrEqual(r.auto.generatedSamples);
  expect(r.auto.maxPendingObserved).toBeLessThanOrEqual(8);
  expect(r.auto.visibilityInterruptions).toBe(0);
  expect(r.auto.buckets.length).toBeGreaterThanOrEqual(4);
  expect(['stable-screening-criterion', 'max-duration']).toContain(r.auto.stopReason);
});

test('synthetic PointerEvents cannot complete post-stress physical Pen check', async ({ page }) => {
  test.setTimeout(30000);
  await openHarness(page);
  await page.click('#start');
  await expect.poll(async () => {
    const r = await page.evaluate(() => window.illustroSustained.report());
    return r.auto.phase;
  }, { timeout: 15000 }).toBe('post-pen');

  for (let i = 0; i < 520; i += 1) {
    const type = i === 0 ? 'pointerdown' : i === 519 ? 'pointerup' : 'pointermove';
    await page.dispatchEvent('#canvas', type, {
      pointerId: 7,
      pointerType: 'pen',
      clientX: 40 + (i % 300),
      clientY: 120 + (i % 40),
      pressure: 0.2 + 0.6 * (i / 519),
    });
  }

  const r = await page.evaluate(() => window.illustroSustained.report());
  expect(r.postPen.trustedPenSamples).toBe(0);
  expect(r.reviewEligibility.postPenComplete).toBe(false);
});
