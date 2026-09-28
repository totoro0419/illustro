import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const standalone = resolve(import.meta.dirname, 'Illustro_Brush_V2_Device_Validation.html');

test('standalone device harness runs 100k benchmark and exports JSON', async ({ page }) => {
  const html = await readFile(standalone, 'utf8');
  await page.route('https://illustro.test/', r => r.fulfill({ contentType: 'text/html', body: html }));
  await page.goto('https://illustro.test/');
  const bench = await page.evaluate(() => window.illustroBrushDevice.runSyntheticBrowserBenchmark({ samples: 100000, batch: 32 }));
  expect(bench.accepted).toBe(100000);
  expect(bench.releaseWork).toBeLessThanOrEqual(272);
  expect(bench.maxPendingObserved).toBeLessThanOrEqual(8);

  const downloadPromise = page.waitForEvent('download');
  await page.click('#save');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^illustro-brush-device-.*\.json$/);
});

test('synthetic pen PointerEvents cannot satisfy hardware-pen gate', async ({ page }) => {
  const html = await readFile(standalone, 'utf8');
  await page.route('https://illustro.test/', r => r.fulfill({ contentType: 'text/html', body: html }));
  await page.goto('https://illustro.test/');

  for (let stroke = 0; stroke < 3; stroke += 1) {
    await page.dispatchEvent('#canvas', 'pointerdown', { pointerId: stroke + 1, pointerType: 'pen', clientX: 50, clientY: 80, pressure: 0.2 });
    for (let i = 0; i < 180; i += 1) {
      await page.dispatchEvent('#canvas', 'pointermove', { pointerId: stroke + 1, pointerType: 'pen', clientX: 50 + i, clientY: 80 + (i % 20), pressure: 0.2 + 0.6 * (i / 179) });
    }
    await page.dispatchEvent('#canvas', 'pointerup', { pointerId: stroke + 1, pointerType: 'pen', clientX: 230, clientY: 90, pressure: 0.7 });
  }

  const s = await page.evaluate(() => window.illustroBrushDevice.summary());
  expect(s.session.untrustedPointerSamples).toBeGreaterThan(500);
  expect(s.session.penSamples).toBe(0);
  expect(s.gateEvidence.penProtocolComplete).toBe(false);
});
