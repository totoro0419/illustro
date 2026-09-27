import { describe, expect, it } from 'vitest';
import { RasterSealingDocument } from './rasterSeal';

describe('RasterSealingDocument', () => {
  it('publishes only edited tiles and preserves previous revisions', () => {
    const document = new RasterSealingDocument(16, 4);
    const tx1 = document.beginTransaction();
    tx1.editTile('0,0', (bytes) => { bytes[0] = 7; });
    const first = tx1.seal();
    expect(first.changedTiles).toBe(1);
    const firstBlock = document.resolveBlockId('0,0');
    expect(firstBlock).not.toBeNull();

    const tx2 = document.beginTransaction();
    tx2.editTile('1,0', (bytes) => { bytes[0] = 9; });
    tx2.seal();
    expect(document.resolveBlockId('0,0')).toBe(firstBlock);
    expect(document.readTileCopy('0,0')[0]).toBe(7);

    document.undo();
    expect(document.resolveBlockId('1,0')).toBeNull();
    expect(document.readTileCopy('0,0')[0]).toBe(7);
  });

  it('cancel leaves canonical state unchanged', () => {
    const document = new RasterSealingDocument(8);
    const tx = document.beginTransaction();
    tx.editTile('0,0', (bytes) => { bytes[0] = 99; });
    tx.cancel();
    expect(document.headId).toBe(0);
    expect(document.store.blockCount).toBe(0);
  });

  it('rejects publishing a stale transaction', () => {
    const document = new RasterSealingDocument(8);
    const stale = document.beginTransaction();
    const current = document.beginTransaction();
    current.editTile('0,0', (bytes) => { bytes[0] = 1; });
    current.seal();
    stale.editTile('1,0', (bytes) => { bytes[0] = 2; });
    expect(() => stale.seal()).toThrow(/stale/);
  });
});
