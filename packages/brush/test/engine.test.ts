import { describe, it, expect } from "vitest";
import { BrushEngine } from "../src/engine";
import { BASE, PRESETS, mapping } from "../src/presets";
import { normalize } from "../src/input";
import { philox } from "../src/random";
import {
  serialize,
  deserialize,
  validateRecord,
  validatePreset,
} from "../src/record";
import { C, STRIDE } from "../src/types";
import { fixture, shapes } from "./fixtures";
import { cubic } from "../src/reconstruction";
function stroke(p = BASE, input = fixture("s")) {
  const e = new BrushEngine(p);
  for (const x of input) e.accept(x);
  e.finish();
  return e.record();
}
describe("reference inheritance and sensors", () => {
  it("known Philox zero answer", () =>
    expect(philox([0, 0, 0, 0], [0, 0])).toEqual([
      0x6627e8d5, 0xe169c58d, 0xbc57ac4c, 0x9b00dbd8,
    ]));
  it("matches independent BigInt multiplication across 300 vectors", () => {
    function ref(c: number[], k: number[]) {
      let [a, b, d, e] = c as [number, number, number, number];
      let [j, l] = k as [number, number];
      for (let r = 0; r < 10; r++) {
        const x = BigInt(a) * 0xd2511f53n,
          y = BigInt(d) * 0xcd9e8d57n;
        [a, b, d, e] = [
          (Number(y >> 32n) ^ b ^ j) >>> 0,
          Number(y & 0xffffffffn),
          (Number(x >> 32n) ^ e ^ l) >>> 0,
          Number(x & 0xffffffffn),
        ];
        j = (j + 0x9e3779b9) >>> 0;
        l = (l + 0xbb67ae85) >>> 0;
      }
      return [a, b, d, e];
    }
    for (let i = 0; i < 300; i++) {
      const c = [i * 977, 0xffffffff - i, (i * 83723) >>> 0, i],
        k = [(i * 76643) >>> 0, ~i >>> 0] as const;
      expect(philox(c as [number, number, number, number], k)).toEqual(
        ref(c, [...k]),
      );
    }
  });
  it("missing sensors use explicit validity and mouse pressure does not halve width", () => {
    expect(normalize({ x: 1, y: 1, t: 1 })).toMatchObject({ p: 1, valid: 0 });
    expect(
      normalize({ x: 1, y: 1, t: 1, pointerType: "mouse", pressure: 0.5 }),
    ).toMatchObject({ p: 1, valid: 0 });
  });
  it.each([NaN, Infinity, -Infinity])("rejects invalid input %s", (v) =>
    expect(() => normalize({ x: v, y: 1, t: 0 })).toThrow(),
  );
  it("rejects live inputs that cannot fit the persisted numeric contract", () => {
    for (const extra of [{ t: 1e16 }, { azimuth: 101 }, { twist: -101 }])
      expect(() => normalize({ x: 1, y: 1, t: 0, ...extra })).toThrow();
    expect(normalize({ x: 1, y: 1, t: 1e15, azimuth: 100, twist: -100 }))
      .toMatchObject({ t: 1e15, azimuth: 100, twist: -100 });
  });
  it("prediction and unordered time never enter canonical stroke", () => {
    const e = new BrushEngine(BASE);
    expect(() => e.accept({ x: 1, y: 1, t: 1, predicted: true })).toThrow();
    const b = new BrushEngine(BASE);
    b.accept({ x: 0, y: 0, t: 10 });
    expect(() => b.accept({ x: 1, y: 1, t: 9 })).toThrow();
    expect(() => b.finish()).toThrow();
  });
  it("component monotone interpolation never overshoots corners/extrema", () => {
    for (const a of [-10, 0, 10])
      for (const d of [-10, 0, 10])
        for (let j = 0; j <= 100; j++) {
          const v = cubic(a, 2, 5, d, j / 100);
          expect(v).toBeGreaterThanOrEqual(2 - 1e-12);
          expect(v).toBeLessThanOrEqual(5 + 1e-12);
        }
  });
});
describe("preset and stroke corpus", () => {
  it("56 non-identical definitions, 6 signatures and required purpose metadata", () => {
    expect(PRESETS).toHaveLength(56);
    expect(PRESETS.filter((p) => p.signature)).toHaveLength(6);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(56);
    const signatures = PRESETS.map((p) =>
      JSON.stringify({
        ...p,
        id: 0,
        name: 0,
        purpose: 0,
        category: 0,
        signature: 0,
        preview: 0,
      }),
    );
    expect(new Set(signatures).size).toBe(56);
    PRESETS.forEach(validatePreset);
  });
  for (const p of PRESETS)
    it(p.name + " sizes, pressure, speed, shapes, JSON exact replay", () => {
      for (const scale of [0.15, 1, 4])
        for (const kind of ["line", "s", "small-loop", "dot", "long"]) {
          const r = stroke(
            { ...p, size: Math.min(4096, p.size * scale) },
            fixture(kind, 40, scale === 0.15 ? 30 : scale === 4 ? 240 : 120),
          );
          validateRecord(r);
          expect(deserialize(serialize(r))).toEqual(r);
          expect(r.commands.flat().every(Number.isFinite)).toBe(true);
        }
    });
  it.each(shapes)("%s at OFF/weak/normal/strong", (kind) => {
    for (const stabilization of [0, 0.15, 0.5, 0.85, 1]) {
      const r = stroke({ ...BASE, stabilization }, fixture(kind));
      validateRecord(r);
      expect(r).toEqual(stroke({ ...BASE, stabilization }, fixture(kind)));
    }
  });
  it("true OFF preserves every accepted coordinate including duplicate sensor changes", () => {
    const input = [
      { x: 1, y: 1, t: 1, pressure: 0.1 },
      { x: 1, y: 1, t: 2, pressure: 0.9 },
      { x: 1.000001, y: 1, t: 2, pressure: 0.9 },
    ];
    const r = stroke(
      { ...BASE, stabilization: 0, pressureSmoothing: 0 },
      input,
    );
    expect(r.geometry.map((p) => p.x)).toEqual(input.map((p) => p.x));
    expect(r.geometry.map((p) => p.p)).toEqual(input.map((p) => p.pressure));
  });
  it("preview evaluation changes neither canonical RNG nor final stream", () => {
    const input = fixture("s");
    const e = new BrushEngine({
      ...BASE,
      taperStart: 5,
      taperEnd: 20,
      scatter: 0.3,
    });
    for (const p of input) {
      e.accept(p);
      const a = e.preview(),
        b = e.preview();
      expect(b).toEqual(a);
    }
    e.finish();
    expect(e.record()).toEqual(
      stroke({ ...BASE, taperStart: 5, taperEnd: 20, scatter: 0.3 }, input),
    );
  });
  it("frozen sink pages contain actual data and bounded streaming staging", () => {
    const pages: Float64Array[] = [];
    const e = new BrushEngine(
      { ...BASE, mappings: [], size: 2 },
      { retain: false, sink: (p) => pages.push(p) },
    );
    for (let i = 0; i < 10000; i++)
      e.accept({ x: i % 1000, y: 40 + Math.floor(i / 1000), t: i });
    e.finish();
    expect(pages.length).toBeGreaterThan(10);
    expect(pages.every((p) => p.length && p.length <= 256 * STRIDE)).toBe(true);
    expect(pages.reduce((n, p) => n + p.length / STRIDE, 0)).toBe(
      e.metrics.commands,
    );
    expect(e.metrics.activeBytes).toBeLessThan(2e6);
    expect(() => e.record()).toThrow();
  });
  it("pressure independently changes size, opacity and flow", () => {
    const p = {
      ...BASE,
      pressureSmoothing: 0,
      mappings: [
        mapping("pressure", "size", 0.1, 1),
        mapping("pressure", "opacity", 0.2, 1),
        mapping("pressure", "flow", 0.3, 1),
      ],
    };
    const a = stroke(p, [{ x: 20, y: 20, t: 0, pressure: 0 }]).commands.flat(),
      b = stroke(p, [{ x: 20, y: 20, t: 0, pressure: 1 }]).commands.flat();
    for (const i of [C.SIZE, C.OPACITY, C.FLOW])
      expect(a[i]).toBeLessThan(b[i]!);
  });
  it("airbrush held exposure produces explicit commands without fabricated geometry", () => {
    const e = new BrushEngine({ ...BASE, exposureMs: 20, mappings: [] });
    e.accept({ x: 20, y: 20, t: 100 });
    e.expose(200);
    e.finish();
    const r = e.record();
    expect(r.geometry).toHaveLength(1);
    expect(r.commands.flat().length / STRIDE).toBe(6);
  });
  it("malformed presets and unknown versions fail visibly", () => {
    expect(() => validatePreset({ ...BASE, size: NaN })).toThrow();
    expect(() => validatePreset({ ...BASE, tip: "mask" })).toThrow();
    const r = stroke();
    expect(() => deserialize(JSON.stringify({ ...r, version: 99 }))).toThrow();
    const page = [...r.commands[0]!];
    page[C.INDEX] = 5;
    expect(() => validateRecord({ ...r, commands: [page] })).toThrow();
  });
});

it("moderate jumps are recorded; pathological jumps fail explicitly", () => {
  const p = { ...BASE, stabilization: 0, pressureSmoothing: 0 };
  const e = new BrushEngine(p);
  e.accept({ x: 0, y: 0, t: 0 });
  e.accept({ x: 10000, y: 0, t: 20 });
  e.finish();
  expect(e.record().geometry.at(-1)!.x).toBe(10000);
  const b = new BrushEngine(p);
  b.accept({ x: 0, y: 0, t: 0 });
  b.accept({ x: 10000000, y: 0, t: 20 });
  expect(() => b.finish()).toThrow("work limit");
});
it("sink buffer ownership cannot mutate the retained canonical pages", () => {
  const e = new BrushEngine(BASE, { sink: (p) => p.fill(-10) });
  fixture("s").forEach((p) => e.accept(p));
  e.finish();
  validateRecord(e.record());
  expect(
    e
      .record()
      .commands.flat()
      .every((v) => v !== -10),
  ).toBe(true);
});
