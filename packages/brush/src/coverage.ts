import { C } from "./types";
import type { Preset, Tip, Mask } from "./types";
const clamp = (v: number) => Math.max(0, Math.min(1, v));
export type Bounds = Readonly<{
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}>;
export function dabBounds(d: ArrayLike<number>, o: number, p: Preset): Bounds {
  const rx = d[o + C.SIZE]! / 2,
    ry = rx * d[o + C.ASPECT]!,
    a = d[o + C.ANGLE]!,
    c = Math.abs(Math.cos(a)),
    s = Math.abs(Math.sin(a));
  const rectangular = [p.tip, p.dual].some(
    (t) => t === "rect" || t === "bristle" || t === "mask",
  );
  // Rotated rectangular corners extend beyond radius. Include rotated AA support.
  const ex = rectangular
    ? (rx + 0.75) * c + (ry + 0.75) * s
    : Math.hypot(rx * c, ry * s) + 1;
  const ey = rectangular
    ? (rx + 0.75) * s + (ry + 0.75) * c
    : Math.hypot(rx * s, ry * c) + 1;
  const x = d[o + C.X]!,
    y = d[o + C.Y]!;
  return {
    x0: Math.floor(x - ex - 1),
    y0: Math.floor(y - ey - 1),
    x1: Math.ceil(x + ex + 1),
    y1: Math.ceil(y + ey + 1),
  };
}
function image(a: Mask, u: number, v: number, repeat = false) {
  if (repeat) {
    u = ((u % 1) + 1) % 1;
    v = ((v % 1) + 1) % 1;
  } else if (u < 0 || u > 1 || v < 0 || v > 1) return 0;
  const x = Math.min(a.width - 1, Math.floor(u * a.width)),
    y = Math.min(a.height - 1, Math.floor(v * a.height));
  return a.alpha[y * a.width + x] ?? 0;
}
function shape(
  t: Tip,
  x: number,
  y: number,
  rx: number,
  ry: number,
  p: Preset,
): number {
  if (rx * ry < 0.08 && t === "round") return 0; // subpixel round handled in document coordinates
  if (t === "rect" || t === "bristle") {
    const edge = Math.max(Math.abs(x) - rx, Math.abs(y) - ry);
    let a = clamp(0.5 - edge);
    if (t === "bristle")
      a *=
        0.3 +
        0.7 *
          Math.pow(
            Math.abs(Math.sin((y / Math.max(0.35, ry / 5)) * Math.PI)),
            0.5,
          );
    return a;
  }
  if (t === "round" && rx === ry) {
    const radius = Math.sqrt(x * x + y * y);
    const hard = rx * p.hardness;
    if (radius <= hard) return 1;
    return p.hardness === 1
      ? clamp(rx + 0.5 - radius)
      : clamp((rx + 0.5 - radius) / Math.max(0.5, rx - hard));
  }
  // Exact subpixel shape sampling has conservative support for narrow/rotated tips.
  let sum = 0;
  for (const dx of [-0.25, 0.25])
    for (const dy of [-0.25, 0.25]) {
      const u = (x + dx) / rx,
        v = (y + dy) / ry,
        r = Math.hypot(u, v);
      if (t === "mask") {
        sum += image(p.mask!, u / 2 + 0.5, v / 2 + 0.5);
        continue;
      }
      let q = 0;
      if (t === "ellipse" || t === "round")
        q =
          r < 1
            ? p.hardness === 1
              ? 1
              : clamp((1 - r) / Math.max(0.001, 1 - p.hardness))
            : 0;
      else if (t === "star") {
        const angle = Math.atan2(v, u);
        q = r < 0.65 + 0.35 * Math.cos(angle * 5) ? 1 : 0;
      } else if (t === "leaf")
        q =
          Math.abs(v) <
          Math.sqrt(Math.max(0, 1 - u * u)) * (1 - Math.abs(u) * 0.7)
            ? 1
            : 0;
      sum += q;
    }
  return sum / 4;
}
export type CoverageContext = Readonly<{
  cx: number;
  cy: number;
  cos: number;
  sin: number;
  rx: number;
  ry: number;
}>;
export function prepareCoverage(
  d: ArrayLike<number>,
  o: number,
): CoverageContext {
  const rx = d[o + C.SIZE]! / 2,
    a = d[o + C.ANGLE]!;
  return {
    cx: d[o + C.X]!,
    cy: d[o + C.Y]!,
    cos: Math.cos(a),
    sin: Math.sin(a),
    rx,
    ry: rx * d[o + C.ASPECT]!,
  };
}
export function coverage(
  d: ArrayLike<number>,
  o: number,
  x: number,
  y: number,
  p: Preset,
  prepared?: CoverageContext,
): number {
  const v = prepared ?? prepareCoverage(d, o),
    dx = x - v.cx,
    dy = y - v.cy,
    lx = dx * v.cos + dy * v.sin,
    ly = -dx * v.sin + dy * v.cos,
    rx = v.rx,
    ry = v.ry;
  let value =
    rx * ry < 0.08 && p.tip === "round"
      ? Math.max(0, 1 - Math.abs(dx)) *
        Math.max(0, 1 - Math.abs(dy)) *
        Math.min(1, Math.PI * rx * ry)
      : shape(p.tip, lx, ly, rx, ry, p);
  if (p.dual) value *= shape(p.dual, lx, ly, rx, ry, p);
  const grain = d[o + C.GRAIN]!;
  if (grain && value) {
    const gx = x / p.grainScale,
      gy = y / p.grainScale;
    let texture: number;
    if (p.grainKind === "image") texture = image(p.texture!, gx, gy, true);
    else if (p.grainKind === "hatch")
      texture =
        0.15 + 0.85 * Math.pow(Math.abs(Math.sin((gx + gy) * Math.PI)), 0.7);
    else {
      const hash =
        Math.imul(
          (Math.floor(gx) * 73856093) ^ (Math.floor(gy) * 19349663),
          83492791,
        ) >>> 0;
      texture =
        p.grainKind === "paper"
          ? 0.25 + (0.75 * hash) / 4294967295
          : hash / 4294967295;
    }
    value *= 1 - grain + grain * texture;
  }
  return clamp(value);
}
