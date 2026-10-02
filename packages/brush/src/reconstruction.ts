import type { Point } from "./types";
const alpha = (cutoff: number, dt: number) =>
  1 / (1 + 1 / (2 * Math.PI * cutoff * dt));
class Euro {
  private x = 0;
  private raw = 0;
  private dx = 0;
  private ready = false;
  next(v: number, dt: number) {
    if (!this.ready) {
      this.ready = true;
      this.x = this.raw = v;
      return v;
    }
    const a = alpha(1, dt);
    this.dx = (a * (v - this.raw)) / dt + (1 - a) * this.dx;
    this.raw = v;
    const b = alpha(4 + 4 * Math.abs(this.dx), dt);
    this.x = b * v + (1 - b) * this.x;
    return this.x;
  }
}
export class Reconstructor {
  private fx = new Euro();
  private fy = new Euro();
  private last: Point | undefined;
  constructor(
    readonly strength: number,
    readonly pressureSmoothing: number,
  ) {}
  accept(p: Point): Point {
    const prev = this.last;
    if (prev && p.t < prev.t) throw new Error("out-of-order input");
    const dt = prev ? Math.max(1e-6, (p.t - prev.t) / 1000) : 1 / 120;
    const x = this.strength
        ? p.x + (this.fx.next(p.x, dt) - p.x) * this.strength
        : p.x,
      y = this.strength
        ? p.y + (this.fy.next(p.y, dt) - p.y) * this.strength
        : p.y;
    const pa = alpha(30 / (1 + this.pressureSmoothing * 8), dt);
    const pressure = prev ? prev.p + (p.p - prev.p) * pa : p.p;
    const q = { ...p, x, y, p: this.pressureSmoothing === 0 ? p.p : pressure };
    this.last = q;
    return q;
  }
}
function slope(a: number, b: number) {
  return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
}
// Component-wise monotone Hermite: does not overshoot local x/y extrema at corners.
export function cubic(a: number, b: number, c: number, d: number, u: number) {
  const delta = c - b;
  let m = slope(b - a, delta),
    n = slope(delta, d - c);
  if (delta === 0) m = n = 0;
  else {
    const h = Math.hypot(m / delta, n / delta);
    if (h > 3) {
      m *= 3 / h;
      n *= 3 / h;
    }
  }
  const u2 = u * u,
    u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * b +
    (u3 - 2 * u2 + u) * m +
    (-2 * u3 + 3 * u2) * c +
    (u3 - u2) * n
  );
}
export function interpolate(
  a: Point,
  b: Point,
  c: Point,
  d: Point,
  u: number,
): Point {
  return {
    x: cubic(a.x, b.x, c.x, d.x, u),
    y: cubic(a.y, b.y, c.y, d.y, u),
    t: b.t + (c.t - b.t) * u,
    p: b.p + (c.p - b.p) * u,
    tilt: b.tilt + (c.tilt - b.tilt) * u,
    azimuth: b.azimuth + (c.azimuth - b.azimuth) * u,
    twist: b.twist + (c.twist - b.twist) * u,
    valid: b.valid & c.valid,
    pointerType: b.pointerType,
    viewGeneration: b.viewGeneration,
  };
}
