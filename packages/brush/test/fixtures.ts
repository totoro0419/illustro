import type { Sample } from "../src/types";
export const shapes = [
  "line",
  "curve",
  "circle",
  "s",
  "zigzag",
  "small-loop",
  "long",
  "dot",
  "slow",
  "fast",
] as const;
export function fixture(kind: string, count = 80, hz = 120): Sample[] {
  return Array.from({ length: kind === "dot" ? 1 : count }, (_, i) => {
    const u = count === 1 ? 0 : i / (count - 1);
    let x = 24 + u * 240,
      y = 80;
    if (kind === "curve") y += 40 * Math.sin(u * Math.PI);
    if (kind === "s") y += 30 * Math.sin(u * Math.PI * 2);
    if (kind === "circle") {
      x = 140 + 45 * Math.cos(u * Math.PI * 2);
      y = 100 + 45 * Math.sin(u * Math.PI * 2);
    }
    if (kind === "small-loop") {
      x = 100 + 2 * Math.cos(u * Math.PI * 2);
      y = 100 + 2 * Math.sin(u * Math.PI * 2);
    }
    if (kind === "zigzag") y += Math.abs(((u * 6) % 2) - 1) * 35;
    if (kind === "long") x = 10 + u * 1000;
    if (kind === "slow") x = 50 + u * 10;
    return {
      x,
      y,
      t: (i * 1000) / (kind === "fast" ? 240 : kind === "slow" ? 30 : hz),
      pressure: 0.05 + 0.95 * Math.sin(u * Math.PI),
      tilt: u,
      azimuth: u * 6,
      twist: u * 4,
      pointerType: "pen",
    };
  });
}
