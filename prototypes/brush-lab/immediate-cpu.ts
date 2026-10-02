import { StrokeRaster, RasterQueue } from "../../packages/brush/src/raster";
import type { Preset } from "../../packages/brush/src/types";
/** Exact arithmetic fallback, with only changed tiles repainted at input time. */
export class ImmediateCPU {
  private base: Uint8ClampedArray;
  private displayed: Uint8ClampedArray;
  private raster: StrokeRaster;
  private preset!: Preset;
  private oldTail: string[] = [];
  presentations = 0;
  constructor(
    readonly canvas: HTMLCanvasElement,
    private ctx = canvas.getContext("2d")!,
  ) {
    this.base = new Uint8ClampedArray(canvas.width * canvas.height * 4);
    this.displayed = this.base.slice();
    this.raster = new StrokeRaster(canvas.width, canvas.height, 32);
  }
  begin(p: Preset) {
    this.preset = p;
    this.raster = new StrokeRaster(this.canvas.width, this.canvas.height, 32);
    this.oldTail = [];
  }
  private draw(r: StrokeRaster, d: ArrayLike<number>) {
    const q = new RasterQueue(r, this.preset, 2000000);
    q.enqueue(d);
    while (q.remaining) q.run(1048576);
  }
  append(d: ArrayLike<number>) {
    this.draw(this.raster, d);
  }
  present(d: ArrayLike<number>) {
    const r = this.raster.fork();
    this.draw(r, d);
    const tail = r.takeDirty();
    this.patch(r, [
      ...new Set([...this.raster.takeDirty(), ...this.oldTail, ...tail]),
    ]);
    this.oldTail = tail;
    this.presentations++;
  }
  private patch(r: StrokeRaster, keys: string[]) {
    const size = r.tileSize,
      w = this.canvas.width,
      h = this.canvas.height;
    for (const key of keys) {
      const [tx, ty] = key.split(",").map(Number),
        x = tx! * size,
        y = ty! * size,
        width = Math.min(size, w - x),
        height = Math.min(size, h - y),
        dst = new Uint8Array(size * size * 4);
      for (let row = 0; row < height; row++)
        dst.set(
          this.base.subarray(
            ((y + row) * w + x) * 4,
            ((y + row) * w + x + width) * 4,
          ),
          row * size * 4,
        );
      const tile = r.tiles.get(key);
      if (tile) r.compositeTile(tile, dst, this.preset);
      const patch = new Uint8ClampedArray(width * height * 4);
      for (let row = 0; row < height; row++) {
        const bytes = dst.subarray(row * size * 4, (row * size + width) * 4);
        patch.set(bytes, row * width * 4);
        this.displayed.set(bytes, ((y + row) * w + x) * 4);
      }
      this.ctx.putImageData(new ImageData(patch, width, height), x, y);
    }
  }
  finish() {
    this.patch(this.raster, [
      ...new Set([...this.raster.takeDirty(), ...this.oldTail]),
    ]);
    this.base = this.displayed.slice();
    this.oldTail = [];
    this.presentations++;
  }
  cancel() {
    this.displayed = this.base.slice();
    this.ctx.putImageData(
      new ImageData(
        new Uint8ClampedArray(this.displayed),
        this.canvas.width,
        this.canvas.height,
      ),
      0,
      0,
    );
  }
  setBase(bytes: Uint8ClampedArray) {
    this.base = bytes.slice();
    this.cancel();
  }
  readPixels() {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
      .data;
  }
}
