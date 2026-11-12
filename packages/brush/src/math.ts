import type { Curve } from "./types";
export const clamp = (v: number, lo = 0, hi = 1) =>
  Math.max(lo, Math.min(hi, v));
export function curveAt(c: Curve, x: number) {
  x = clamp(x);
  for (let i = 1; i < c.length; i++) {
    const a = c[i - 1]!,
      b = c[i]!;
    if (x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
  }
  return c.at(-1)![1];
}
export const LINEAR: Curve = Object.freeze([
  Object.freeze([0, 0] as const),
  Object.freeze([1, 1] as const),
]);
export function immutable<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) immutable(v);
    Object.freeze(value);
  }
  return value;
}
export function snapshot<T>(value: T): T {
  return immutable(structuredClone(value));
}
export const q16 = (x: number) => Math.round(clamp(x) * 65535);
export const mulQ = (a: number, b: number) =>
  Math.floor((a * b + 32767) / 65535);
export function hsv(rgb: readonly number[]) {
  const [r, g, b] = rgb as [number, number, number],
    m = Math.max(r, g, b),
    n = Math.min(r, g, b),
    d = m - n;
  let h = 0;
  if (d)
    h =
      m === r
        ? ((g - b) / d + 6) % 6
        : m === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
  return [h / 6, m ? d / m : 0, m] as const;
}
export function rgb(
  h: number,
  s: number,
  v: number,
): readonly [number, number, number] {
  h = ((h % 1) + 1) % 1;
  const c = v * s,
    x = c * (1 - Math.abs(((h * 6) % 2) - 1)),
    m = v - c;
  const rows = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  const a = rows[Math.floor(h * 6)]!;
  return [a[0]! + m, a[1]! + m, a[2]! + m];
}
