import type { Sample, Preset, StrokeRecord } from "./types";
import { BrushEngine } from "./engine";
export const SHAPES = [
  "line",
  "curve",
  "circle",
  "s",
  "zigzag",
  "small-loop",
  "long",
  "dot",
] as const;
export function fixture(
  shape: (typeof SHAPES)[number],
  count = 100,
  hz = 120,
): Sample[] {
  if (shape === "dot") count = 1;
  const out: Sample[] = [];
  for (let i = 0; i < count; i++) {
    const u = count <= 1 ? 0 : i / (count - 1);
    let x = 20 + u * 260,
      y = 90;
    if (shape === "curve") y += 45 * Math.sin(u * Math.PI);
    if (shape === "s" || shape === "long")
      y += 50 * Math.sin(u * Math.PI * (shape === "long" ? 20 : 2));
    if (shape === "circle" || shape === "small-loop") {
      const r = shape === "circle" ? 60 : 3;
      x = 145 + r * Math.cos(u * Math.PI * 2);
      y = 90 + r * Math.sin(u * Math.PI * 2);
    }
    if (shape === "zigzag") y += 30 * (1 - 4 * Math.abs(((u * 5) % 1) - 0.5));
    out.push({
      x,
      y,
      t: (i * 1000) / hz,
      pressure: 0.08 + 0.9 * Math.sin(u * Math.PI),
      tilt: 0.5 * u,
      azimuth: u * Math.PI * 2,
      twist: (u * Math.PI) / 2,
      pointerType: "pen",
    });
  }
  return out;
}
export function generate(
  preset: Preset,
  samples: readonly Sample[],
  seed: readonly [number, number] = [1, 2],
): StrokeRecord {
  const e = new BrushEngine(preset, { seed });
  for (const s of samples) e.accept(s);
  e.finish();
  return e.record();
}
