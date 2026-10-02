import { describe, it, expect } from "vitest";
import { BASE, PRESETS } from "../src/presets";
import { BrushEngine } from "../src/engine";
import { coverage, dabBounds } from "../src/coverage";
import { rasterize, StrokeRaster, RasterQueue } from "../src/raster";
import { makeDab } from "../src/dynamics";
import { normalize } from "../src/input";
import { fixture } from "./fixtures";
import { C, STRIDE } from "../src/types";
import { deserialize, serialize } from "../src/record";
function record(p = BASE) {
  const e = new BrushEngine(p);
  fixture("s", 30).forEach((s) => e.accept(s));
  e.finish();
  return e.record();
}
describe("strict reference raster and footprint support", () => {
  it("40px square at 45 degrees covers corner beyond old 21px bound", () => {
    const p = {
      ...BASE,
      size: 40,
      tip: "rect" as const,
      rotation: Math.PI / 4,
      mappings: [],
    };
    const d = makeDab(
      normalize({ x: 50, y: 50, t: 0 }),
      p,
      0,
      [1, 2],
      0,
      0,
      0,
      0,
    );
    const b = dabBounds(d, 0, p);
    expect(b.x1).toBeGreaterThan(77);
    expect(coverage(d, 0, 76.5, 50.5, p)).toBeGreaterThan(0);
    const r = record(p);
    expect(r.commands.length).toBeGreaterThan(0);
  });
  it.each([
    "round",
    "ellipse",
    "rect",
    "bristle",
    "star",
    "leaf",
    "mask",
  ] as const)(
    "%s rotated support encloses all positive independently scanned pixels",
    (tip) => {
      for (const size of [0.15, 2, 40])
        for (const aspect of [0.01, 0.3, 1])
          for (const angle of [0, 0.4, Math.PI / 4]) {
            const p = {
              ...BASE,
              tip,
              size,
              aspect,
              rotation: angle,
              mappings: [],
              mask: { width: 2, height: 2, alpha: [1, 1, 1, 1] },
            };
            const d = makeDab(
                normalize({ x: 50.2, y: 50.4, t: 0 }),
                p,
                0,
                [1, 2],
                0,
                0,
                0,
                0,
              ),
              b = dabBounds(d, 0, p);
            for (let y = 15; y < 85; y++)
              for (let x = 15; x < 85; x++)
                if (coverage(d, 0, x + 0.5, y + 0.5, p) > 0) {
                  expect(x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1).toBe(
                    true,
                  );
                }
          }
    },
  );
  it("subpixel dot is visible and conserves fractional area", () => {
    const p = { ...BASE, size: 0.15, mappings: [] };
    const d = makeDab(
      normalize({ x: 20, y: 20, t: 0 }),
      p,
      0,
      [1, 2],
      0,
      0,
      0,
      0,
    );
    let alpha = 0;
    for (let y = 18; y < 23; y++)
      for (let x = 18; x < 23; x++)
        alpha += coverage(d, 0, x + 0.5, y + 0.5, p);
    expect(alpha).toBeCloseTo(Math.PI * 0.075 * 0.075, 8);
  });
  it("tile size, page splits and save/reopen produce byte-identical pixels", () => {
    for (const p of [
      BASE,
      ...PRESETS.filter((p) => p.signature),
      PRESETS[25]!,
    ]) {
      const r = record({ ...p, size: 15 }),
        base = new Uint8ClampedArray(320 * 180 * 4);
      const a = rasterize(r, 320, 180, 64).composite(base, r.preset),
        b = rasterize(deserialize(serialize(r)), 320, 180, 128).composite(
          base,
          r.preset,
        );
      expect(a).toEqual(b);
    }
  });
  it("strict tile traversal equals an independent global footprint accumulator", () => {
    const p = {
        ...BASE,
        size: 14,
        opacity: 0.6,
        flow: 0.25,
        grain: 0.5,
        mappings: [],
      },
      r = record(p),
      global = new Float64Array(320 * 180 * 4);
    for (const page of r.commands)
      for (let o = 0; o < page.length; o += STRIDE) {
        const b = dabBounds(page, o, p);
        for (let y = Math.max(0, b.y0); y < Math.min(180, b.y1); y++)
          for (let x = Math.max(0, b.x0); x < Math.min(320, b.x1); x++) {
            const i = (y * 320 + x) * 4,
              a = global[i + 3]!,
              cap = page[o + C.OPACITY]!,
              amount =
                coverage(page, o, x + 0.5, y + 0.5, p) * page[o + C.FLOW]!,
              delta = Math.max(0, cap - a) * amount,
              exchange = amount * Math.min(a, cap),
              remain = a ? 1 - exchange / a : 0;
            for (let c = 0; c < 3; c++)
              global[i + c] =
                global[i + c]! * remain +
                (delta + exchange) * page[o + C.R + c]!;
            global[i + 3] = a + delta;
          }
      }
    const image = rasterize(r, 320, 180, 64).composite(
      new Uint8ClampedArray(320 * 180 * 4),
      p,
    );
    for (let i = 0; i < image.length; i += 4) {
      const a = global[i + 3]!;
      expect(image[i + 3]).toBe(Math.round(a * 255));
      if (a)
        for (let c = 0; c < 3; c++)
          expect(image[i + c]).toBe(
            Math.round(
              (Math.round((global[i + c]! / a) * 65535) / 65535) * 255,
            ),
          );
    }
  });
  it("scheduler splits a single huge dab without losing or changing pixels", () => {
    const r = record({ ...BASE, size: 512, mappings: [] }),
      a = new StrokeRaster(320, 180, 64),
      q = new RasterQueue(a, r.preset);
    for (const page of r.commands) q.enqueue(page);
    let turns = 0;
    while (q.remaining) {
      const result = q.run(1000);
      expect(result.pixels).toBeLessThanOrEqual(1000);
      turns++;
    }
    expect(turns).toBeGreaterThan(50);
    expect(a.composite(new Uint8ClampedArray(320 * 180 * 4), r.preset)).toEqual(
      rasterize(r, 320, 180, 64).composite(
        new Uint8ClampedArray(320 * 180 * 4),
        r.preset,
      ),
    );
  });
  it("stroke opacity stays capped while Flow controls buildup", () => {
    const p = { ...BASE, size: 8, mappings: [], opacity: 0.5, flow: 0.2 };
    const d = makeDab(
        normalize({ x: 10, y: 10, t: 0 }),
        p,
        0,
        [1, 2],
        0,
        0,
        0,
        0,
      ),
      r = new StrokeRaster(20, 20, 8);
    r.deposit(d, 0, 10, 10, p);
    let first = r.composite(new Uint8ClampedArray(1600), p)[
      (10 * 20 + 10) * 4 + 3
    ]!;
    for (let i = 0; i < 100; i++) r.deposit(d, 0, 10, 10, p);
    const last = r.composite(new Uint8ClampedArray(1600), p)[
      (10 * 20 + 10) * 4 + 3
    ]!;
    expect(first).toBeLessThan(last);
    expect(last).toBeLessThanOrEqual(128);
  });
  it("raster and queue budgets fail explicitly", () => {
    const p = { ...BASE, size: 20, mappings: [] };
    const d = makeDab(
      normalize({ x: 10, y: 10, t: 0 }),
      p,
      0,
      [1, 2],
      0,
      0,
      0,
      0,
    );
    const r = new StrokeRaster(100, 100, 64, 1);
    expect(() => r.deposit(d, 0, 10, 10, p)).toThrow();
    const q = new RasterQueue(new StrokeRaster(100, 100), p, 1);
    expect(() => q.enqueue(new Float64Array(2 * STRIDE))).toThrow();
  });
});
