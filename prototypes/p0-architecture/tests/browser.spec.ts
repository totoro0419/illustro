import { expect, test } from '@playwright/test';

test('main-thread harness exposes core benchmark API', async ({ page }) => {
  await page.goto('/?input=main');
  await expect(page.locator('#status')).toContainText('Illustro P0 prototype');
  const result = await page.evaluate(async () => {
    const api = window.illustroPrototype;
    return {
      tile: api.runTileBenchmark(128, 100),
      history: api.runHistoryBenchmark(1000),
      raster: api.runRasterSealBenchmark(50, 2, 4096, 8),
      cache: api.runCachePressureBenchmark(1024 * 1024, 20, 128 * 1024),
      graphics: await api.probeGraphicsCapabilities(),
      wasm: await api.runWasmBoundaryBenchmark(1000),
    };
  });
  expect(result.tile.allocatedTiles).toBeGreaterThan(0);
  expect(result.history.head).toBe(1000);
  expect(result.raster.finalRevision).toBe(50);
  expect(result.cache.usedBytes).toBeGreaterThan(0);
  expect(result.graphics.canvas2d).toBe(true);
  expect(result.wasm.wasmResult).toBe(1000);
});

test('served module worker path receives pointer input', async ({ page }) => {
  await page.goto('/?input=worker');
  const canvas = page.locator('#surface');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 80, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => page.evaluate(() => window.illustroPrototype.metrics.summary('worker-roundtrip').count)).toBeGreaterThan(0);
});

test('secure localhost persistence benchmark completes', async ({ page }) => {
  await page.goto('/?input=main');
  const result = await page.evaluate(async () => {
    await window.illustroPrototype.runPersistenceBenchmark(8, 1024, { maxBatchBytes: 4096, batchDelayMs: 1 });
    return {
      flushes: window.illustroPrototype.metrics.summary('journal-batch-flush').count,
      records: window.illustroPrototype.metrics.summary('journal-batch-records').count,
    };
  });
  expect(result.flushes).toBeGreaterThan(0);
  expect(result.records).toBeGreaterThan(0);
});
