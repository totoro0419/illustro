import type { Rect } from './types';

export type TileKey = `${number},${number}`;

export type Tile = {
  readonly tx: number;
  readonly ty: number;
  readonly pixels: Uint8ClampedArray;
  dirty: Rect | null;
};

export class SparseTileSurface {
  readonly tileSize: number;
  readonly #tiles = new Map<TileKey, Tile>();

  constructor(tileSize: number) {
    if (!Number.isInteger(tileSize) || tileSize <= 0) throw new Error('tileSize must be a positive integer');
    this.tileSize = tileSize;
  }

  get tileCount(): number {
    return this.#tiles.size;
  }

  get allocatedBytes(): number {
    return this.#tiles.size * this.tileSize * this.tileSize * 4;
  }

  getOrCreate(tx: number, ty: number): Tile {
    const key = `${tx},${ty}` as TileKey;
    let tile = this.#tiles.get(key);
    if (!tile) {
      tile = {
        tx,
        ty,
        pixels: new Uint8ClampedArray(this.tileSize * this.tileSize * 4),
        dirty: null,
      };
      this.#tiles.set(key, tile);
    }
    return tile;
  }

  markRect(rect: Rect): number {
    if (rect.width <= 0 || rect.height <= 0) return 0;
    const minTx = Math.floor(rect.x / this.tileSize);
    const minTy = Math.floor(rect.y / this.tileSize);
    const maxTx = Math.floor((rect.x + rect.width - 1) / this.tileSize);
    const maxTy = Math.floor((rect.y + rect.height - 1) / this.tileSize);
    let touched = 0;
    for (let ty = minTy; ty <= maxTy; ty += 1) {
      for (let tx = minTx; tx <= maxTx; tx += 1) {
        const tile = this.getOrCreate(tx, ty);
        const tileX = tx * this.tileSize;
        const tileY = ty * this.tileSize;
        const local: Rect = {
          x: Math.max(0, rect.x - tileX),
          y: Math.max(0, rect.y - tileY),
          width: Math.max(0, Math.min(tileX + this.tileSize, rect.x + rect.width) - Math.max(tileX, rect.x)),
          height: Math.max(0, Math.min(tileY + this.tileSize, rect.y + rect.height) - Math.max(tileY, rect.y)),
        };
        tile.dirty = unionRect(tile.dirty, local);
        touched += 1;
      }
    }
    return touched;
  }

  consumeDirty(): Tile[] {
    const dirty: Tile[] = [];
    for (const tile of this.#tiles.values()) {
      if (tile.dirty) {
        dirty.push(tile);
        tile.dirty = null;
      }
    }
    return dirty;
  }
}

function unionRect(a: Rect | null, b: Rect): Rect {
  if (!a) return b;
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}
