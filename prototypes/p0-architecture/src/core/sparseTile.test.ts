import { describe, expect, it } from 'vitest';
import { SparseTileSurface } from './sparseTile';

describe('SparseTileSurface', () => {
  it('allocates only touched tiles', () => {
    const surface = new SparseTileSurface(256);
    expect(surface.markRect({ x: 10, y: 20, width: 30, height: 40 })).toBe(1);
    expect(surface.tileCount).toBe(1);
  });

  it('spans tile boundaries and coalesces dirty state', () => {
    const surface = new SparseTileSurface(256);
    expect(surface.markRect({ x: 250, y: 250, width: 20, height: 20 })).toBe(4);
    expect(surface.tileCount).toBe(4);
    expect(surface.consumeDirty()).toHaveLength(4);
    expect(surface.consumeDirty()).toHaveLength(0);
  });

  it('preserves the consumed dirty rect snapshot after clearing tile state', () => {
    const surface = new SparseTileSurface(256);
    surface.markRect({ x: 10, y: 20, width: 30, height: 40 });
    const consumed = surface.consumeDirty();
    expect(consumed).toHaveLength(1);
    expect(consumed[0]?.dirty).toEqual({ x: 10, y: 20, width: 30, height: 40 });
    expect(consumed[0]?.tile.dirty).toBeNull();
  });
});
