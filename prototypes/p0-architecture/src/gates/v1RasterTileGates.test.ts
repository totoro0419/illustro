import { describe, expect, it } from 'vitest';
import { ByteBudgetLru } from '../core/byteBudgetCache';
import { RasterSealingDocument } from '../core/rasterSeal';
import { createPaintWorkloads, runTileWorkload } from './paintWorkload';

describe('Architecture V1 raster/tile gates', () => {
  it('compares sparse tile candidates on deterministic brush-like workloads', () => {
    const workloads = createPaintWorkloads();
    const results = workloads.flatMap((workload) => [128, 256, 512].map((tileSize) => runTileWorkload(tileSize, workload)));

    for (const result of results) {
      expect(result.uniqueTiles).toBeGreaterThan(0);
      expect(result.allocatedBytes).toBe(result.uniqueTiles * result.tileSize * result.tileSize * 4);
      expect(result.dirtyUploadBytes).toBeGreaterThan(0);
      expect(result.tileTouches).toBeGreaterThanOrEqual(result.uniqueTiles);
    }

    const fullCanvasBytes = workloads[0]!.canvasSize ** 2 * 4;
    for (const result of results.filter((item) => item.workload === 'fine' || item.workload === 'medium')) {
      expect(result.allocatedBytes).toBeLessThan(fullCanvasBytes);
    }

    console.log('[V1_TILE_MATRIX]', JSON.stringify(results.map(({ touchedKeysByStroke, ...metrics }) => metrics)));
  });

  it('seals realistic RGBA tile payloads with copy cost bounded by changed tiles', () => {
    const tileBytes = 256 * 256 * 4;
    const document = new RasterSealingDocument(tileBytes, 32);
    const workload = runTileWorkload(256, createPaintWorkloads(8192)[1]!);
    const strokes = workload.touchedKeysByStroke.slice(0, 64);
    let changedTiles = 0;
    let canonicalReadBytes = 0;
    let workingAllocatedBytes = 0;
    let transferredBytes = 0;

    for (let strokeIndex = 0; strokeIndex < strokes.length; strokeIndex += 1) {
      const tx = document.beginTransaction();
      const keys = strokes[strokeIndex]!.slice(0, 4);
      for (const key of keys) {
        tx.editTile(key, (bytes) => {
          const offset = (strokeIndex * 997) % bytes.byteLength;
          bytes[offset] = (bytes[offset] + 1) & 0xff;
        });
      }
      const metrics = tx.seal();
      changedTiles += metrics.changedTiles;
      canonicalReadBytes += metrics.canonicalReadBytes;
      workingAllocatedBytes += metrics.workingAllocatedBytes;
      transferredBytes += metrics.transferredBytes;
      expect(metrics.avoidableSealCopyBytes).toBe(0);
      expect(metrics.workingAllocatedBytes).toBe(metrics.changedTiles * tileBytes);
      expect(metrics.transferredBytes).toBe(metrics.changedTiles * tileBytes);
      expect(metrics.canonicalReadBytes).toBeLessThanOrEqual(metrics.workingAllocatedBytes);
    }

    expect(document.headId).toBe(strokes.length);
    expect(workingAllocatedBytes).toBe(changedTiles * tileBytes);
    expect(transferredBytes).toBe(changedTiles * tileBytes);
    expect(canonicalReadBytes).toBeLessThanOrEqual(changedTiles * tileBytes);
    console.log('[V1_RASTER_SEAL]', JSON.stringify({
      revisions: strokes.length,
      changedTiles,
      tileBytes,
      canonicalReadBytes,
      workingAllocatedBytes,
      transferredBytes,
      canonicalBlocks: document.store.blockCount,
      canonicalBytes: document.store.allocatedBytes,
    }));
  });

  it('keeps derived cache within budget without evicting pinned canonical entries', () => {
    const budget = 8 * 1024 * 1024;
    const cache = new ByteBudgetLru<string, Uint8Array>(budget);
    cache.set('canonical:current', new Uint8Array(2 * 1024 * 1024), 2 * 1024 * 1024, true);
    for (let i = 0; i < 80; i += 1) {
      cache.set(`derived:${i}`, new Uint8Array(256 * 1024), 256 * 1024);
    }
    expect(cache.has('canonical:current')).toBe(true);
    expect(cache.usedBytes).toBeLessThanOrEqual(budget);
    console.log('[V1_CACHE]', JSON.stringify({ budget, usedBytes: cache.usedBytes, entries: cache.size }));
  });
});
