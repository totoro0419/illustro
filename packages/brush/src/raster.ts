import { C, LIMITS, STRIDE } from "./types";
import type { Preset, StrokeRecord } from "./types";
import {
  coverage,
  dabBounds,
  prepareCoverage,
  type CoverageContext,
} from "./coverage";
export type RasterTile = { x: number; y: number; values: Float64Array };
export class StrokeRaster {
  readonly tiles = new Map<string, RasterTile>();
  private bytes = 0;
  private shared = new Set<string>();
  private dirty = new Set<string>();
  private cachedX = -1;
  private cachedY = -1;
  private cachedTile: RasterTile | undefined;
  private cachedKey = "";
  private cachedOwned = true;
  private cachedDirty = false;
  constructor(
    readonly width: number,
    readonly height: number,
    readonly tileSize = 128,
    readonly maxBytes = LIMITS.maxWorkingBytes,
  ) {
    for (const n of [width, height, tileSize])
      if (!Number.isSafeInteger(n) || n < 1)
        throw new Error("invalid raster extent");
  }
  get allocatedBytes() {
    return this.bytes;
  }
  // Both owners copy a tile before mutation. A regional fork includes only the requested tiles;
  // its caller reads untouched regions from the stable parent.
  fork(keys: Iterable<string> = this.tiles.keys()) {
    const n = new StrokeRaster(
      this.width,
      this.height,
      this.tileSize,
      this.maxBytes,
    );
    for (const k of keys) {
      const t = this.tiles.get(k);
      if (!t || n.tiles.has(k)) continue;
      n.tiles.set(k, t);
      n.shared.add(k);
      this.shared.add(k);
      n.bytes += t.values.byteLength;
    }
    this.cachedTile = undefined;
    this.cachedX = this.cachedY = -1;
    return n;
  }
  takeDirty() {
    const keys = [...this.dirty];
    this.dirty.clear();
    this.cachedDirty = false;
    return keys;
  }
  clone() {
    const n = new StrokeRaster(
      this.width,
      this.height,
      this.tileSize,
      this.maxBytes,
    );
    for (const [k, t] of this.tiles)
      n.tiles.set(k, { x: t.x, y: t.y, values: t.values.slice() });
    n.bytes = this.bytes;
    return n;
  }
  deposit(
    d: ArrayLike<number>,
    o: number,
    x: number,
    y: number,
    p: Preset,
    prepared?: CoverageContext,
  ) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const tx = Math.floor(x / this.tileSize),
      ty = Math.floor(y / this.tileSize);
    let tile: RasterTile | undefined;
    if (this.cachedX === tx && this.cachedY === ty) tile = this.cachedTile;
    else {
      this.cachedKey = tx + "," + ty;
      tile = this.tiles.get(this.cachedKey);
      this.cachedX = tx;
      this.cachedY = ty;
      this.cachedTile = tile;
      this.cachedOwned = !this.shared.has(this.cachedKey);
      this.cachedDirty = this.dirty.has(this.cachedKey);
    }
    const i = ((y % this.tileSize) * this.tileSize + (x % this.tileSize)) * 4;
    // A saturated stroke pixel cannot take any more deposit, regardless of tip/grain/color.
    if (tile && tile.values[i + 3]! >= d[o + C.OPACITY]!) return;
    const amount =
      coverage(d, o, x + 0.5, y + 0.5, p, prepared) * d[o + C.FLOW]!;
    if (!amount) return;
    if (!tile) {
      const bytes = this.tileSize * this.tileSize * 4 * 8;
      if (this.bytes + bytes > this.maxBytes)
        throw new Error("raster working memory limit reached");
      tile = { x: tx, y: ty, values: new Float64Array(bytes / 8) };
      this.tiles.set(tx + "," + ty, tile);
      this.cachedTile = tile;
      this.bytes += bytes;
    }
    const key = this.cachedKey;
    if (!this.cachedOwned) {
      this.shared.delete(key);
      this.cachedOwned = true;
      tile = { x: tx, y: ty, values: tile.values.slice() };
      this.tiles.set(key, tile);
      this.cachedTile = tile;
    }
    const v = tile.values,
      a = v[i + 3]!,
      delta = Math.max(0, d[o + C.OPACITY]! - a) * amount;
    if (delta <= 0) return;
    if (!this.cachedDirty) {
      this.dirty.add(key);
      this.cachedDirty = true;
    }
    v[i] = v[i]! + delta * d[o + C.R]!;
    v[i + 1] = v[i + 1]! + delta * d[o + C.G]!;
    v[i + 2] = v[i + 2]! + delta * d[o + C.B]!;
    v[i + 3] = a + delta;
  }
  compositeTile(t: RasterTile, destination: Uint8Array, p: Preset) {
    if (destination.length !== t.values.length)
      throw new Error("destination tile shape mismatch");
    const v = t.values;
    for (let i = 0; i < v.length; i += 4) {
      const sa = v[i + 3]!;
      if (!sa) continue;
      const da = destination[i + 3]! / 255;
      if (p.blend === "erase") {
        destination[i + 3] = Math.round(da * (1 - sa) * 255);
        if (!destination[i + 3])
          destination[i] = destination[i + 1] = destination[i + 2] = 0;
        continue;
      }
      const a = sa + da * (1 - sa);
      for (let channel = 0; channel < 3; channel++) {
        const s = v[i + channel]! / sa,
          d = destination[i + channel]! / 255;
        const blend =
          p.blend === "multiply"
            ? s * d
            : p.blend === "screen"
              ? 1 - (1 - s) * (1 - d)
              : s;
        const premul = (1 - sa) * da * d + (1 - da) * sa * s + sa * da * blend;
        destination[i + channel] = Math.round(
          Math.max(0, Math.min(1, premul / a)) * 255,
        );
      }
      destination[i + 3] = Math.round(a * 255);
    }
  }
  composite(base: Uint8ClampedArray, p: Preset) {
    if (base.length !== this.width * this.height * 4)
      throw new Error("base image shape mismatch");
    const out = base.slice(),
      size = this.tileSize;
    for (const tile of this.tiles.values()) {
      const dst = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) {
        const gy = tile.y * size + y;
        if (gy >= this.height) break;
        const gx = tile.x * size,
          len = Math.min(size, this.width - gx);
        dst.set(
          base.subarray(
            (gy * this.width + gx) * 4,
            (gy * this.width + gx + len) * 4,
          ),
          y * size * 4,
        );
      }
      this.compositeTile(tile, dst, p);
      for (let y = 0; y < size; y++) {
        const gy = tile.y * size + y;
        if (gy >= this.height) break;
        const gx = tile.x * size,
          len = Math.min(size, this.width - gx);
        out.set(
          dst.subarray(y * size * 4, (y * size + len) * 4),
          (gy * this.width + gx) * 4,
        );
      }
    }
    return out;
  }
}
// FIFO scheduler slices even one huge footprint. Budget is explicit, never silently changes ink.
export class RasterQueue {
  private jobs: Array<{ data: ArrayLike<number>; offset: number }> = [];
  private head = 0;
  private active: ReturnType<typeof dabBounds> | undefined;
  private x = 0;
  private y = 0;
  private pending = 0;
  private prepared: CoverageContext | undefined;
  constructor(
    readonly raster: StrokeRaster,
    readonly preset: Preset,
    readonly maxCommands = 100000,
  ) {}
  get remaining() {
    return this.pending;
  }
  enqueue(page: ArrayLike<number>) {
    if (page.length % STRIDE) throw new Error("invalid raster commands");
    if (this.pending + page.length / STRIDE > this.maxCommands)
      throw new Error("renderer queue admission limit");
    for (let i = 0; i < page.length; i += STRIDE)
      this.jobs.push({ data: page, offset: i });
    this.pending += page.length / STRIDE;
  }
  run(
    pixelBudget: number,
    timeBudgetMs = Infinity,
  ): { pixels: number; commands: number; elapsedMs: number } {
    if (
      !Number.isSafeInteger(pixelBudget) ||
      pixelBudget < 1 ||
      timeBudgetMs <= 0
    )
      throw new Error("invalid work budget");
    const start = performance.now();
    let pixels = 0,
      commands = 0;
    while (this.head < this.jobs.length && pixels < pixelBudget) {
      const job = this.jobs[this.head]!;
      if (!this.active) {
        this.prepared = prepareCoverage(job.data, job.offset, this.preset);
        const b = dabBounds(job.data, job.offset, this.preset);
        this.active = {
          x0: Math.max(0, b.x0),
          y0: Math.max(0, b.y0),
          x1: Math.min(this.raster.width, b.x1),
          y1: Math.min(this.raster.height, b.y1),
        };
        this.x = this.active.x0;
        this.y = this.active.y0;
      }
      const b = this.active;
      if (b.x1 <= b.x0 || b.y1 <= b.y0) {
        this.end();
        commands++;
        continue;
      }
      while (this.y < b.y1 && pixels < pixelBudget) {
        this.raster.deposit(
          job.data,
          job.offset,
          this.x,
          this.y,
          this.preset,
          this.prepared,
        );
        pixels++;
        if (++this.x >= b.x1) {
          this.x = b.x0;
          this.y++;
        }
        if (pixels % 128 === 0 && performance.now() - start >= timeBudgetMs)
          return { pixels, commands, elapsedMs: performance.now() - start };
      }
      if (this.y >= b.y1) {
        this.end();
        commands++;
      }
    }
    return { pixels, commands, elapsedMs: performance.now() - start };
  }
  private end() {
    this.head++;
    this.pending--;
    this.active = undefined;
    if (this.head > 4096 && this.head * 2 > this.jobs.length) {
      this.jobs = this.jobs.slice(this.head);
      this.head = 0;
    }
    if (!this.pending) {
      this.jobs = [];
      this.head = 0;
    }
  }
}
export function rasterize(
  record: StrokeRecord,
  width: number,
  height: number,
  tileSize = 128,
) {
  const raster = new StrokeRaster(width, height, tileSize),
    q = new RasterQueue(raster, record.preset, 2000000);
  for (const page of record.commands) {
    q.enqueue(page);
    while (q.remaining) q.run(65536);
  }
  return raster;
}
