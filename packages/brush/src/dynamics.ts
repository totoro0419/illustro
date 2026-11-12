import type { Curve, Mapping, Point, Preset, Target } from "./types";
import { C, STRIDE } from "./types";
import { random } from "./random";
export const linear: Curve = [
  [0, 0],
  [1, 1],
];
export function curve(points: Curve, x: number) {
  x = Math.max(0, Math.min(1, x));
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!,
      b = points[i]!;
    if (x <= b[0]) return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
  }
  return points.at(-1)![1];
}
function source(
  m: Mapping,
  p: Point,
  speed: number,
  direction: number,
  distance: number,
  time: number,
  r: number,
) {
  let value: number;
  switch (m.source) {
    case "pressure":
      value = p.valid & 1 ? p.p : (m.fallback ?? 1);
      break;
    case "tilt":
      value = p.valid & 2 ? p.tilt : (m.fallback ?? 0);
      break;
    case "azimuth":
      value = p.valid & 4 ? p.azimuth / (2 * Math.PI) : (m.fallback ?? 0);
      break;
    case "twist":
      value = p.valid & 8 ? p.twist / (2 * Math.PI) : (m.fallback ?? 0);
      break;
    case "velocity":
      value = speed / 1500;
      break;
    case "direction":
      value = (direction + Math.PI) / (2 * Math.PI);
      break;
    case "distance":
      value = distance / (m.period ?? 500);
      break;
    case "time":
      value = time / (m.period ?? 1000);
      break;
    case "random":
      value = r;
  }
  if (
    m.period !== undefined &&
    (m.source === "distance" || m.source === "time")
  )
    value = ((value % 1) + 1) % 1;
  return m.min + (m.max - m.min) * curve(m.curve, value);
}
export function makeDab(
  p: Point,
  preset: Preset,
  index: number,
  seed: readonly [number, number],
  distance: number,
  speed: number,
  direction: number,
  time: number,
  out?: Float64Array,
): Float64Array {
  const v: Record<Target, number> = {
    size: preset.size,
    opacity: preset.opacity,
    flow: preset.flow,
    spacing: preset.spacing,
    rotation: preset.rotation + (preset.follow ? direction : 0),
    scatter: preset.scatter,
    aspect: preset.aspect,
    grain: preset.grain,
    hue: 0,
    saturation: 1,
    value: 1,
  };
  for (let i = 0; i < preset.mappings.length; i++) {
    const m = preset.mappings[i]!,
      n = source(
        m,
        p,
        speed,
        direction,
        distance,
        time,
        m.source === "random" ? random(seed, index, 100 + i) : 0,
      );
    v[m.target] =
      m.mode === "multiply"
        ? v[m.target] * n
        : m.mode === "add"
          ? v[m.target] + n
          : n;
  }
  const dab = out ?? new Float64Array(STRIDE);
  const r = (stream: number) => random(seed, index, stream) * 2 - 1;
  const size = Math.max(
    0.01,
    Math.min(
      4096,
      v.size * (preset.sizeJitter ? 1 + r(3) * preset.sizeJitter : 1),
    ),
  );
  const scatter = v.scatter * size;
  dab[C.X] = p.x + (scatter ? r(1) * scatter : 0);
  dab[C.Y] = p.y + (scatter ? r(2) * scatter : 0);
  dab[C.SIZE] = size;
  dab[C.ASPECT] = Math.max(0.01, Math.min(1, v.aspect));
  dab[C.ANGLE] =
    v.rotation + (preset.rotationJitter ? r(4) * preset.rotationJitter : 0);
  dab[C.OPACITY] = Math.max(
    0,
    Math.min(
      1,
      v.opacity * (preset.opacityJitter ? 1 + r(5) * preset.opacityJitter : 1),
    ),
  );
  dab[C.FLOW] = Math.max(
    0,
    Math.min(
      1,
      v.flow * (preset.flowJitter ? 1 + r(6) * preset.flowJitter : 1),
    ),
  );
  dab[C.GRAIN] = Math.max(0, Math.min(1, v.grain));
  const rgb = rotateColor(
    preset.color,
    v.hue + (preset.hueJitter ? r(7) * preset.hueJitter : 0),
    v.saturation,
    v.value,
  );
  dab[C.R] = rgb[0];
  dab[C.G] = rgb[1];
  dab[C.B] = rgb[2];
  dab[C.DISTANCE] = distance;
  dab[C.TIME] = time;
  dab[C.INDEX] = index;
  dab[C.RESERVED1] = Math.max(0.01, Math.min(4, v.spacing));
  return dab;
}
function rotateColor(
  rgb: readonly [number, number, number],
  hue: number,
  saturation: number,
  value: number,
): readonly [number, number, number] {
  if (hue === 0 && saturation === 1 && value === 1) return rgb;
  const max = Math.max(...rgb),
    min = Math.min(...rgb),
    d = max - min;
  let h =
    d === 0
      ? 0
      : max === rgb[0]
        ? ((rgb[1] - rgb[2]) / d) % 6
        : max === rgb[1]
          ? (rgb[2] - rgb[0]) / d + 2
          : (rgb[0] - rgb[1]) / d + 4;
  h = (((h / 6 + hue) % 1) + 1) % 1;
  const s = max === 0 ? 0 : Math.min(1, (d / max) * saturation),
    v = Math.min(1, max * value),
    c = v * s,
    x = c * (1 - Math.abs(((h * 6) % 2) - 1)),
    m = v - c;
  const i = Math.floor(h * 6);
  const out = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][i]!;
  return [out[0]! + m, out[1]! + m, out[2]! + m];
}
