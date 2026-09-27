import { expect, test } from '@playwright/test';

test('startup reaches first stroke before any advanced module is requested', async ({ page }) => {
  await page.goto('/?input=main');
  await expect(page.locator('#status')).toContainText('Illustro P0 prototype');

  const before = await page.evaluate(() => window.illustroPrototype.getStartupMetrics());
  expect(before.bootToCanvasReadyMs).toBeGreaterThanOrEqual(0);
  expect(Object.values(before.advancedLoads).every((loaded) => loaded === false)).toBe(true);

  const canvas = page.locator('#surface');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 80, { steps: 5 });
  await page.mouse.up();

  await expect.poll(async () => page.evaluate(() => window.illustroPrototype.getStartupMetrics().firstStrokeToNextRafMs)).not.toBeNull();
  const after = await page.evaluate(() => window.illustroPrototype.getStartupMetrics());
  expect(Object.values(after.advancedLoads).every((loaded) => loaded === false)).toBe(true);

  console.log('[V1_STARTUP]', JSON.stringify(after));
});

test('lazy benchmark modules execute and render backend smoke selects a working path', async ({ page }) => {
  await page.goto('/?input=main');

  const result = await page.evaluate(async () => {
    const api = window.illustroPrototype;
    return {
      tile: await api.runTileBenchmark(128, 100),
      history: await api.runHistoryBenchmark(1000),
      raster: await api.runRasterSealBenchmark(50, 2, 4096, 8),
      cache: await api.runCachePressureBenchmark(1024 * 1024, 20, 128 * 1024),
      graphicsProbe: await api.probeGraphicsCapabilities(),
      backend: await api.runGraphicsBackendSmoke(),
      wasm: await api.runWasmBoundaryBenchmark(1000),
      startup: api.getStartupMetrics(),
    };
  }) as any;

  expect(result.tile.allocatedTiles).toBeGreaterThan(0);
  expect(result.history.head).toBe(1000);
  expect(result.raster.finalRevision).toBe(50);
  expect(result.cache.usedBytes).toBeGreaterThan(0);
  expect(result.graphicsProbe.canvas2d).toBe(true);
  expect(result.backend.selected.smokePassed).toBe(true);
  expect(['webgpu', 'webgl2', 'canvas2d']).toContain(result.backend.selected.kind);
  expect(result.wasm.wasmResult).toBe(1000);
  expect(result.startup.advancedLoads.benchmarkCore).toBe(true);
  expect(result.startup.advancedLoads.benchmarkExtended).toBe(true);
  expect(result.startup.advancedLoads.graphics).toBe(true);
  expect(result.startup.advancedLoads.wasm).toBe(true);
  expect(result.startup.advancedLoads.persistence).toBe(false);

  console.log('[V1_GRAPHICS]', JSON.stringify({
    probe: result.graphicsProbe,
    selection: result.backend,
  }));
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

test('OPFS SyncAccessHandle persists complete frames across reload and rejects torn tail', async ({ page }) => {
  await page.goto('/?input=main');

  const first = await page.evaluate(async () => {
    const api = window.illustroPrototype;
    const startupBefore = api.getStartupMetrics();
    const reset = await api.resetPersistence() as any;
    const write = await api.runPersistenceBenchmark(8, 1024, { maxBatchBytes: 4096, batchDelayMs: 1 });
    const inspect = await api.inspectPersistence() as any;
    return { startupBefore, reset, write, inspect, startupAfter: api.getStartupMetrics() };
  }) as any;

  expect(first.startupBefore.advancedLoads.persistence).toBe(false);
  expect(first.startupAfter.advancedLoads.persistence).toBe(true);
  expect(first.reset.backend).toBe('opfs-sync-access');
  expect(first.write.backend).toBe('opfs-sync-access');
  expect(first.inspect.backend).toBe('opfs-sync-access');
  expect(first.inspect.frameCount).toBe(8);
  expect(first.inspect.tailBytes).toBe(0);
  expect(first.inspect.issue).toBeNull();

  await page.reload();

  const reopened = await page.evaluate(async () => {
    const api = window.illustroPrototype;
    const before = api.getStartupMetrics();
    const inspect = await api.inspectPersistence() as any;
    return { before, inspect };
  }) as any;

  expect(reopened.before.advancedLoads.persistence).toBe(false);
  expect(reopened.inspect.backend).toBe('opfs-sync-access');
  expect(reopened.inspect.frameCount).toBe(8);
  expect(reopened.inspect.tailBytes).toBe(0);
  expect(reopened.inspect.issue).toBeNull();

  const torn = await page.evaluate(async () => {
    const api = window.illustroPrototype;
    await api.injectTornPersistence(999_999, 64, 11);
    return api.inspectPersistence();
  }) as any;

  expect(torn.backend).toBe('opfs-sync-access');
  expect(torn.frameCount).toBe(8);
  expect(torn.tailBytes).toBe(11);
  expect(torn.issue).toBe('truncated-frame');

  console.log('[V1_OPFS]', JSON.stringify({
    initial: first.inspect,
    reopened: reopened.inspect,
    torn,
  }));
});
