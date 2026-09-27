import { describe, expect, it } from 'vitest';
import { ByteBudgetLru } from '../core/byteBudgetCache';
import { RasterSealingDocument } from '../core/rasterSeal';
import { RenderBackendState } from '../core/renderBackend';

describe('Architecture V1 cross-gate adversarial checks', () => {
  it('GPU backend loss cannot mutate canonical raster state', () => {
    const document = new RasterSealingDocument(64);
    const tx = document.beginTransaction();
    tx.editTile('0,0', (bytes) => { bytes[0] = 77; });
    tx.seal();

    const blockBefore = document.resolveBlockId('0,0');
    const bytesBefore = document.readTileCopy('0,0');

    const backend = new RenderBackendState('webgpu');
    expect(backend.deviceLost()).toBe('webgl2');

    expect(document.resolveBlockId('0,0')).toBe(blockBefore);
    expect(document.readTileCopy('0,0')).toEqual(bytesBefore);
    expect(document.readTileCopy('0,0')[0]).toBe(77);
  });

  it('cache pressure may exceed derived budget for pinned canonical data but never evicts it', () => {
    const cache = new ByteBudgetLru<string, Uint8Array>(2 * 1024 * 1024);
    cache.set('canonical:protected', new Uint8Array(1024 * 1024), 1024 * 1024, true);
    for (let i = 0; i < 12; i += 1) {
      cache.set(`derived:${i}`, new Uint8Array(256 * 1024), 256 * 1024);
    }

    cache.setBudget(0);

    expect(cache.has('canonical:protected')).toBe(true);
    expect(cache.size).toBe(1);
    expect(cache.usedBytes).toBe(1024 * 1024);
  });

  it('Undo after a sealed edit restores the prior canonical block identity', () => {
    const document = new RasterSealingDocument(32);
    const first = document.beginTransaction();
    first.editTile('0,0', (bytes) => { bytes[0] = 1; });
    first.seal();
    const firstBlock = document.resolveBlockId('0,0');

    const second = document.beginTransaction();
    second.editTile('0,0', (bytes) => { bytes[0] = 2; });
    second.seal();
    expect(document.resolveBlockId('0,0')).not.toBe(firstBlock);

    document.undo();
    expect(document.resolveBlockId('0,0')).toBe(firstBlock);
    expect(document.readTileCopy('0,0')[0]).toBe(1);
  });
});
