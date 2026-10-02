import { it, expect, describe } from "vitest";
import { C, STRIDE } from "./types";
import type { Preset } from "./types";
import { preset, PRESETS } from "./presets";
import { fixture, generate } from "./fixtures";
import { StrokeRaster, RasterQueue, rasterize } from "./raster";
import { coverage, dabBounds } from "./coverage";
import { commitStroke, commitStrokeAsync } from "./coreSession";
import { CoreDocument } from "../../core/src/index";
import { deserialize, serialize } from "./record";
const base = preset("raster", "検査", "検査", "描画検査", {
  size: 12,
  dynamics: [],
  stabilization: 0,
});
const bytes = (r: StrokeRaster, p: Preset) =>
  r.composite(new Uint8ClampedArray(r.width * r.height * 4), p);
function command(size: number, aspect = 1, angle = 0) {
  const d = new Float64Array(STRIDE);
  d[C.X] = 48;
  d[C.Y] = 48;
  d[C.SIZE] = size;
  d[C.ASPECT] = aspect;
  d[C.ANGLE] = angle;
  d[C.OPACITY] = 1;
  d[C.FLOW] = 1;
  d[C.R] = 0.3;
  d[C.G] = 0.5;
  d[C.B] = 0.8;
  return d;
}
describe("tip bounds independent reference", () => {
  it("40px square rotated45 degrees retains its corner 26px outside the center", () => {
    const p = { ...base, tip: "rect" as const },
      d = command(40, 1, Math.PI / 4),
      b = dabBounds(d, 0, p);
    expect(b.x1).toBeGreaterThan(74);
    expect(coverage(d, 0, 74.5, 48.5, p)).toBeGreaterThan(0);
    const r = new StrokeRaster(96, 96),
      q = new RasterQueue(r, p);
    q.enqueue(d);
    while (q.remaining) q.run(17);
    expect(bytes(r, p)[(48 * 96 + 74) * 4 + 3]).toBeGreaterThan(0);
  });
  for (const kind of [
    "round",
    "ellipse",
    "rect",
    "bristle",
    "star",
    "leaf",
    "mask",
  ] as const)
    it(
      kind +
        " conservative rotated and narrow support equals full image traversal",
      () => {
        const p = {
          ...base,
          tip: kind,
          mask: { width: 2, height: 2, alpha: [1, 1, 1, 1] },
        };
        for (const size of [0.1, 1, 5, 40])
          for (const aspect of [0.01, 0.1, 1])
            for (const angle of [0, 0.31, Math.PI / 4, 1.6]) {
              const d = command(size, aspect, angle),
                actual = new StrokeRaster(96, 96, 16),
                q = new RasterQueue(actual, p);
              q.enqueue(d);
              while (q.remaining) q.run(8192);
              const reference = new StrokeRaster(96, 96, 16);
              for (let y = 0; y < 96; y++)
                for (let x = 0; x < 96; x++) reference.deposit(d, 0, x, y, p);
              expect(bytes(actual, p)).toEqual(bytes(reference, p));
            }
      },
    );
  it("independent dual tip aspect does not clip secondary shape", () => {
    const p = {
        ...base,
        tip: "round" as const,
        dual: "rect" as const,
        dualAspect: 1,
      },
      d = command(40, 0.02, 0.8),
      a = new StrokeRaster(96, 96, 16),
      q = new RasterQueue(a, p);
    q.enqueue(d);
    while (q.remaining) q.run(1000);
    const b = new StrokeRaster(96, 96, 16);
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 96; x++) b.deposit(d, 0, x, y, p);
    expect(bytes(a, p)).toEqual(bytes(b, p));
  });
});
describe("replay, batching and blending", () => {
  it("different tile sizes and scheduler slices yield exact output", () => {
    const r = generate(
      { ...base, size: 25, grain: 0.7, grainScale: 1.3 },
      fixture("s", 40),
    );
    const expected = bytes(rasterize(r, 320, 180, 128), r.preset);
    for (const size of [16, 64, 256]) {
      const a = new StrokeRaster(320, 180, size),
        q = new RasterQueue(a, r.preset);
      for (const page of r.commands) q.enqueue(page);
      while (q.remaining) q.run(137);
      expect(bytes(a, r.preset)).toEqual(expected);
    }
    expect(
      bytes(rasterize(deserialize(serialize(r)), 320, 180), r.preset),
    ).toEqual(expected);
  });
  it("a single large dab is sliced to the requested pixel limit", () => {
    const p = { ...base, size: 512 },
      a = new StrokeRaster(256, 256, 32),
      q = new RasterQueue(a, p);
    q.enqueue(command(512));
    const first = q.run(2000);
    expect(first.pixels).toBe(2000);
    expect(q.remaining).toBe(1);
    while (q.remaining) q.run(2000);
    expect(bytes(a, p).some((x) => x > 0)).toBe(true);
  });
  it("flow builds toward opacity and lower later caps cannot erase earlier deposit", () => {
    const p = { ...base, opacity: 0.4, flow: 0.1 },
      r = new StrokeRaster(96, 96, 16),
      d = command(40);
    d[C.OPACITY] = 0.4;
    d[C.FLOW] = 0.1;
    for (let i = 0; i < 100; i++) r.deposit(d, 0, 48, 48, p);
    const out = bytes(r, p),
      alpha = out[(48 * 96 + 48) * 4 + 3]!;
    expect(alpha).toBe(102);
    d[C.OPACITY] = 0.1;
    r.deposit(d, 0, 48, 48, p);
    expect(bytes(r, p)[(48 * 96 + 48) * 4 + 3]).toBe(alpha);
  });
  for (const blend of ["normal", "multiply", "screen", "erase"] as const)
    it("known single-pixel blend " + blend, () => {
      const p = { ...base, blend },
        r = new StrokeRaster(96, 96, 16),
        d = command(20);
      d[C.OPACITY] = 0.5;
      r.deposit(d, 0, 48, 48, p);
      const b = new Uint8ClampedArray(96 * 96 * 4);
      for (let i = 0; i < b.length; i += 4) b.set([128, 128, 128, 255], i);
      const out = r.composite(b, p),
        o = (48 * 96 + 48) * 4;
      expect(out[o + 3]).toBe(blend === "erase" ? 128 : 255);
      if (blend === "multiply") expect(out[o]).toBeLessThan(128);
      if (blend === "screen") expect(out[o]).toBeGreaterThan(128);
    });
  it("mask/image resources survive JSON without implicit fallback", () => {
    const p = {
      ...base,
      tip: "mask" as const,
      mask: { width: 3, height: 3, alpha: [0, 1, 0, 1, 1, 1, 0, 1, 0] },
      grain: 0.8,
      grainKind: "image" as const,
      texture: { width: 2, height: 2, alpha: [0.2, 0.8, 0.5, 1] },
    };
    const r = generate(p, fixture("curve", 20));
    expect(bytes(rasterize(r, 320, 180), p)).toEqual(
      bytes(rasterize(deserialize(serialize(r)), 320, 180), p),
    );
  });
  it("working memory capacity refuses drawing explicitly", () => {
    const p = { ...base, size: 64 },
      a = new StrokeRaster(96, 96, 16, 16),
      q = new RasterQueue(a, p);
    q.enqueue(command(40));
    expect(() => q.run(10000)).toThrow("memory");
  });
  for (const p of PRESETS)
    it(p.name + " produces actual raster coverage", () => {
      const record = generate(p, fixture("curve", 12));
      const raster = rasterize(record, 320, 180, 64);
      if (p.blend === "erase") {
        const b = new Uint8ClampedArray(320 * 180 * 4).fill(255);
        expect(
          raster.composite(b, p).some((v, i) => i % 4 === 3 && v < 255),
        ).toBe(true);
      } else expect(bytes(raster, p).some((v) => v > 0)).toBe(true);
    });
});
describe("Core integration and regression", () => {
  it("async materialization yields, matches synchronous commit and refuses stale head", async () => {
    const r = generate({ ...base, size: 100 }, fixture("curve", 30)),
      a = new CoreDocument({ width: 320, height: 180, tileSize: 64 }),
      b = new CoreDocument({ width: 320, height: 180, tileSize: 64 });
    let yielded = 0;
    await commitStrokeAsync(a, a.defaultRasterLayerId, r, {
      yieldWork: async () => {
        yielded++;
      },
      pixelsPerSlice: 512,
    });
    commitStroke(b, b.defaultRasterLayerId, r);
    expect(yielded).toBeGreaterThan(0);
    for (const x of [50, 145, 250])
      for (const y of [50, 100, 135])
        expect(a.readPixel(a.defaultRasterLayerId, x, y)).toEqual(
          b.readPixel(b.defaultRasterLayerId, x, y),
        );
    const c = new CoreDocument({ width: 320, height: 180, tileSize: 64 });
    let changed = false;
    await expect(
      commitStrokeAsync(c, c.defaultRasterLayerId, r, {
        yieldWork: async () => {
          if (!changed) {
            changed = true;
            const tx = c.begin("independent edit");
            tx.setPixel(c.defaultRasterLayerId, 0, 0, [1, 2, 3, 255]);
            tx.commit();
          }
        },
        pixelsPerSlice: 512,
      }),
    ).rejects.toThrow("stale");
    expect(c.revisionCount).toBe(2);
  });
  it("async cancellation leaves the existing revision untouched", async () => {
    const r = generate({ ...base, size: 100 }, fixture("curve", 30)),
      doc = new CoreDocument({ width: 320, height: 180 }),
      abort = new AbortController();
    await expect(
      commitStrokeAsync(doc, doc.defaultRasterLayerId, r, {
        yieldWork: async () => {
          abort.abort();
        },
        signal: abort.signal,
        pixelsPerSlice: 512,
      }),
    ).rejects.toThrow("cancelled");
    expect(doc.revisionCount).toBe(1);
  });

  it("semantic stroke and changed tiles share a revision, undo/redo and handoff", () => {
    const doc = new CoreDocument({ width: 320, height: 180, tileSize: 64 }),
      l = doc.defaultRasterLayerId,
      r = generate(base, fixture("curve", 30));
    const receipt = commitStroke(doc, l, r)!;
    expect(receipt.changedBlockIds.length).toBeGreaterThan(0);
    expect(receipt.persistence.changedBlockIds).toEqual(
      receipt.changedBlockIds,
    );
    const op = receipt.revision.command!.operations.find(
      (x) => x.kind === "brush.stroke",
    );
    expect(op).toMatchObject({ recordJson: serialize(r) });
    const original = doc.head,
      pixel = doc.readPixel(l, 145, 135);
    expect(pixel[3]).toBeGreaterThan(0);
    doc.undo();
    expect(doc.readPixel(l, 145, 135)[3]).toBe(0);
    doc.redo();
    expect(doc.head).toBe(original);
    expect(doc.readPixel(l, 145, 135)).toEqual(pixel);
  });
  it("off-document strokes do not create empty raster revisions", () => {
    const doc = new CoreDocument({ width: 64, height: 64 }),
      r = generate(base, [{ x: 1000, y: 1000, t: 0 }]);
    expect(commitStroke(doc, doc.defaultRasterLayerId, r)).toBeNull();
    expect(doc.revisionCount).toBe(1);
  });
});
