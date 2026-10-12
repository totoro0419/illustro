import { expect, it } from "vitest";
import { normalize } from "./input";
import { BrushEngine } from "./engine";
import { preset, PRESETS } from "./presets";
import { coverage, prepareCoverage } from "./coverage";
import { fixture, generate } from "./fixtures";
import { C, STRIDE } from "./types";

it("rejects live input outside the saved numeric and pointer contract", () => {
  for (const extra of [
    { t: 1e16 },
    { azimuth: 101 },
    { twist: -101 },
    { pointerType: "invalid" },
    { viewGeneration: -1 },
  ])
    expect(() => normalize({ x: 1, y: 1, t: 0, ...extra })).toThrow();
});
it("external pressure curve edits cannot change an already started stroke", () => {
  const p = JSON.parse(
    JSON.stringify(preset("snapshot", "snapshot", "test", "test")),
  );
  const a = new BrushEngine(p),
    b = new BrushEngine(p);
  for (const s of fixture("curve", 20)) a.accept(s);
  p.pressureCurve[1][1] = 0;
  for (const s of fixture("curve", 20)) b.accept(s);
  a.finish();
  b.finish();
  expect(b.record()).toEqual(a.record());
  expect(Object.isFrozen(b.preset.pressureCurve)).toBe(true);
});
it("prepared trigonometry matches independent per-pixel evaluation exactly", () => {
  for (const p of PRESETS) {
    const r = generate(p, fixture("curve", 10));
    for (const page of r.commands)
      for (let o = 0; o < page.length; o += STRIDE) {
        const prepared = prepareCoverage(page, o, p);
        for (const dx of [-1.4, -0.4, 0, 0.4, 1.4])
          for (const dy of [-0.8, 0, 0.8]) {
            const x = page[o + C.X]! + dx * page[o + C.SIZE]!,
              y = page[o + C.Y]! + dy * page[o + C.SIZE]!;
            expect(coverage(page, o, x, y, p, prepared)).toBe(
              coverage(page, o, x, y, p),
            );
          }
      }
  }
});
it("short taper does not allocate the maximum mutable tail", () => {
  const e = new BrushEngine(
    preset("small", "small", "test", "test", { taperEnd: 0 }),
  );
  expect(e.metrics.activeBytes).toBe((512 + 256) * STRIDE * 8);
});
