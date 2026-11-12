import { describe, it, expect } from "vitest";
import { BrushEngine } from "./engine";
import { normalize, capturePointer, penSensors } from "./input";
import { philox } from "./random";
import { Reconstructor, cubic } from "./reconstruction";
import { PRESETS, preset, mapping } from "./presets";
import { generate, fixture, SHAPES } from "./fixtures";
import { serialize, deserialize, validatePreset } from "./record";
import { C, STRIDE } from "./types";
import type { Preset, Point, StrokeRecord } from "./types";
const base = preset("test", "テスト", "検査", "検査用", { size: 8 });
describe("Philox independent conformance", () => {
  function reference(c: readonly number[], k: readonly number[]) {
    let [a, b, d, e] = c.map(BigInt) as [bigint, bigint, bigint, bigint];
    let [x, y] = k.map(BigInt) as [bigint, bigint];
    const mask = 0xffffffffn;
    for (let n = 0; n < 10; n++) {
      const p = 0xd2511f53n * a,
        q = 0xcd9e8d57n * d;
      [a, b, d, e] = [
        ((q >> 32n) ^ b ^ x) & mask,
        q & mask,
        ((p >> 32n) ^ e ^ y) & mask,
        p & mask,
      ];
      x = (x + 0x9e3779b9n) & mask;
      y = (y + 0xbb67ae85n) & mask;
    }
    return [a, b, d, e].map(Number);
  }
  it("known zero vector", () =>
    expect(philox([0, 0, 0, 0], [0, 0])).toEqual([
      0x6627e8d5, 0xe169c58d, 0xbc57ac4c, 0x9b00dbd8,
    ]));
  it("1000 limb multiply cases agree with independent BigInt implementation", () => {
    for (let i = 0; i < 1000; i++) {
      const c = [
          Math.imul(i, 1234567) >>> 0,
          ~i >>> 0,
          Math.imul(i, 7654321) >>> 0,
          i >>> 0,
        ] as const,
        k = [i >>> 0, 0x9abcdef0] as const;
      expect(philox(c, k)).toEqual(reference(c, k));
    }
  });
});
describe("actual inputs and missing sensors", () => {
  it("duplicate identical input does not create a second canonical sample", () => {
    const e = new BrushEngine(base);
    const s = { x: 40, y: 40, t: 1, pressure: 0.5 };
    e.accept(s);
    e.accept(s);
    e.finish();
    expect(e.record().geometry).toHaveLength(1);
    expect(e.metrics.duplicates).toBe(1);
  });
  it("unsupported future preset fields cannot silently disappear", () =>
    expect(() => validatePreset({ ...base, futureValue: 1 } as Preset)).toThrow(
      "unknown",
    ));

  it("predicted rejected", () =>
    expect(() => normalize({ x: 1, y: 2, t: 0, predicted: true })).toThrow());
  for (const n of [NaN, Infinity, -Infinity])
    it("rejects nonfinite " + n, () =>
      expect(() => normalize({ x: n, y: 0, t: 0 })).toThrow(),
    );
  it("missing pressure is a fallback, not pen measurement", () =>
    expect(
      normalize({ x: 1, y: 2, t: 0, pointerType: "mouse", pressure: 0.5 }),
    ).toMatchObject({ p: 1, valid: 0 }));
  it("coalesced events replace the parent and capture document position", () => {
    const actual = [
      {
        clientX: 10,
        clientY: 20,
        timeStamp: 1,
        pressure: 0.2,
        pointerType: "pen",
      },
      {
        clientX: 15,
        clientY: 25,
        timeStamp: 2,
        pressure: 0.5,
        pointerType: "pen",
      },
    ];
    const event = {
      ...actual[1],
      clientX: 999,
      getCoalescedEvents: () => actual,
    } as unknown as PointerEvent;
    const s = capturePointer(event, (x, y) => [x / 2, y / 2], 3);
    expect(s.map((x) => x.x)).toEqual([5, 7.5]);
    expect(s.every((x) => x.viewGeneration === 3)).toBe(true);
  });
  it("sensor capability is explicit", () =>
    expect(
      penSensors(
        { tiltX: 30, tiltY: 0, azimuthAngle: 1, twist: 90 } as PointerEvent,
        { tilt: false, azimuth: false, twist: false },
      ),
    ).toEqual({}));
  it("out-of-order poisons a stroke; no successful partial record", () => {
    const e = new BrushEngine(base);
    e.accept({ x: 0, y: 0, t: 10 });
    expect(() => e.accept({ x: 1, y: 1, t: 9 })).toThrow();
    expect(() => e.finish()).toThrow();
  });
  it("same position with pressure changes survives", () => {
    const r = generate(base, [
      { x: 40, y: 40, t: 0, pressure: 0.1 },
      { x: 40, y: 40, t: 10, pressure: 1 },
    ]);
    expect(r.geometry).toHaveLength(2);
    expect(r.commands.flat().length / STRIDE).toBeGreaterThan(1);
  });
});
describe("reconstruction", () => {
  it("true OFF and pressure smoothing OFF preserve exact values", () => {
    const f = new Reconstructor(0, 0);
    for (const s of fixture("zigzag")) {
      const p = normalize(s);
      expect(f.accept(p)).toEqual(p);
    }
  });
  it("monotone cubic stays in each axis endpoint interval, including sharp reversals", () => {
    for (const a of [-10, 0, 12])
      for (const b of [-3, 1, 8])
        for (const c of [-3, 1, 8])
          for (const d of [-10, 0, 12])
            for (let i = 0; i <= 100; i++) {
              const v = cubic(a, b, c, d, i / 100);
              expect(v).toBeGreaterThanOrEqual(Math.min(b, c) - 1e-12);
              expect(v).toBeLessThanOrEqual(Math.max(b, c) + 1e-12);
            }
  });
  for (const strength of [0, 0.15, 0.5, 0.85, 1])
    it("finite strokes at correction " + strength, () => {
      for (const shape of SHAPES) {
        const r = generate(
          { ...base, stabilization: strength },
          fixture(shape),
        );
        expect(() => deserialize(serialize(r))).not.toThrow();
      }
    });
  it("preview cannot advance RNG or canonical commands", () => {
    const samples = fixture("s"),
      e = new BrushEngine(
        { ...base, taperEnd: 20, sizeJitter: 0.5 },
        { seed: [3, 4] },
      ),
      expected = generate(
        { ...base, taperEnd: 20, sizeJitter: 0.5 },
        samples,
        [3, 4],
      );
    for (const s of samples) {
      e.accept(s);
      const m = e.metrics;
      e.preview();
      e.preview();
      expect(e.metrics).toEqual(m);
    }
    e.finish();
    expect(e.record()).toEqual(expected);
  });
  it("input-time publication sends every stable command exactly once without changing record pages", () => {
    const preset = { ...base, taperEnd: 12, sizeJitter: 0.4 };
    const samples = fixture("s", 400),
      published: number[] = [];
    const e = new BrushEngine(preset, {
      seed: [3, 4],
      sink: (p) => published.push(...p),
    });
    for (const s of samples) {
      e.accept(s);
      e.publishStable();
      e.publishStable();
      expect(e.pendingPrefix().length).toBe(0);
      e.preview();
    }
    e.finish();
    const expected = generate(preset, samples, [3, 4]);
    expect(e.record()).toEqual(expected);
    expect(published).toEqual(expected.commands.flat());
    expect(() => deserialize(serialize(e.record()))).not.toThrow();
  });
  it("tap has finite visible size", () => {
    const r = generate({ ...base, taperStart: 10, taperEnd: 10 }, [
      { x: 40, y: 40, t: 0, pressure: 0.5 },
    ]);
    expect(r.commands[0]![C.SIZE]).toBeGreaterThan(1);
  });
  it("streaming sends real owned pages and bounds active staging", () => {
    let pages = 0,
      commands = 0,
      points = 0;
    const e = new BrushEngine(base, {
      retain: false,
      sink: (p) => {
        pages++;
        commands += p.length / STRIDE;
      },
      geometrySink: () => points++,
    });
    for (let i = 0; i < 100000; i++)
      e.accept({ x: i * 0.1, y: 40, t: (i * 1000) / 240, pressure: 0.5 });
    e.finish();
    expect(points).toBe(100000);
    expect(commands).toBe(e.metrics.commands);
    expect(pages).toBeGreaterThan(1);
    expect(e.metrics.activeBytes).toBeLessThan(2 * 1024 * 1024);
    expect(() => e.record()).toThrow();
  });
  it("sink failure invalidates the complete stroke", () => {
    const e = new BrushEngine(
      { ...base, spacing: 0.01 },
      {
        sink: () => {
          throw new Error("disk unavailable");
        },
      },
    );
    expect(() => {
      for (let i = 0; i < 1000; i++) e.accept({ x: i, y: 1, t: i });
      e.finish();
    }).toThrow("disk unavailable");
    expect(() => e.record()).toThrow();
  });
  it("held airbrush uses explicit exposure, no invented accepted points", () => {
    const e = new BrushEngine({ ...base, exposureMs: 10 });
    e.accept({ x: 30, y: 30, t: 0, pressure: 0.5 });
    e.expose(100);
    e.finish();
    const r = e.record();
    expect(r.geometry).toHaveLength(1);
    expect(r.commands.flat().length / STRIDE).toBe(11);
  });
  it("moving airbrush resumes exposure at the newest filtered endpoint", () => {
    const e = new BrushEngine({ ...base, stabilization: 0, exposureMs: 10 });
    e.accept({ x: 10, y: 10, t: 0, pressure: 0.5 });
    e.accept({ x: 80, y: 40, t: 100, pressure: 0.8 });
    e.expose(120);
    e.finish();
    const r = e.record(),
      d = r.commands.flat();
    expect(r.geometry).toHaveLength(2);
    for (const t of [110, 120]) {
      const at =
        d.findIndex((v, i) => i % STRIDE === C.TIME && v === t) - C.TIME;
      expect(at).toBeGreaterThanOrEqual(0);
      expect(d[at + C.X]).toBe(80);
      expect(d[at + C.Y]).toBe(40);
    }
    expect(d.filter((v, i) => i % STRIDE === C.TIME && v > 100)).toHaveLength(
      2,
    );
  });
});
describe("preset corpus and persistence", () => {
  it("50 standard and six functionally different signature presets", () => {
    expect(PRESETS).toHaveLength(56);
    expect(PRESETS.filter((x) => x.signature)).toHaveLength(6);
    const fingerprints = PRESETS.map((x) => {
      const { id, name, category, purpose, signature, preview, ...rest } = x;
      return JSON.stringify(rest);
    });
    expect(new Set(fingerprints).size).toBe(56);
  });
  for (const p of PRESETS)
    it(p.name + " shapes and size/speed/pressure corpus", () => {
      validatePreset(p);
      for (const shape of SHAPES)
        for (const scale of [0.15, 1, 4]) {
          const r = generate(
            { ...p, size: Math.max(0.01, p.size * scale) },
            fixture(
              shape,
              shape === "long" ? 500 : 36,
              scale === 0.15 ? 30 : scale === 1 ? 120 : 240,
            ),
          );
          expect(deserialize(serialize(r))).toEqual(r);
        }
    });
  it("damaged indexes and missing resources are rejected", () => {
    const r = JSON.parse(
      serialize(generate(base, fixture("line", 4))),
    ) as StrokeRecord;
    (r.commands[0] as number[])[C.INDEX] = 7;
    expect(() => deserialize(JSON.stringify(r))).toThrow();
    expect(() => validatePreset({ ...base, tip: "mask" })).toThrow();
  });
  it("source changes after begin do not mutate saved preset", () => {
    const p = JSON.parse(JSON.stringify(base)) as Preset,
      e = new BrushEngine(p);
    (p as { size: number }).size = 99;
    e.accept({ x: 10, y: 10, t: 0 });
    e.finish();
    expect(e.record().preset.size).toBe(8);
  });
});
