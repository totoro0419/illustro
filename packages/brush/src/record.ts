import { C, LIMITS, STRIDE } from "./types";
import type { Preset, StrokeRecord, Curve } from "./types";
function keys(value: object, allowed: string[]) {
  for (const k of Object.keys(value))
    if (!allowed.includes(k)) throw new Error("unsupported field " + k);
}
const tips = ["round", "ellipse", "rect", "bristle", "star", "leaf", "mask"];
const sources = [
  "pressure",
  "velocity",
  "tilt",
  "azimuth",
  "twist",
  "direction",
  "distance",
  "time",
  "random",
];
const targets = [
  "size",
  "opacity",
  "flow",
  "spacing",
  "rotation",
  "scatter",
  "aspect",
  "grain",
  "hue",
  "saturation",
  "value",
];
function number(v: unknown, min: number, max: number) {
  if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
    throw new Error("invalid numeric value");
}
export function validateCurve(c: Curve) {
  if (
    !Array.isArray(c) ||
    c.length < 2 ||
    c.length > 128 ||
    c[0]?.[0] !== 0 ||
    c.at(-1)?.[0] !== 1
  )
    throw new Error("invalid curve");
  let x = -1;
  for (const pair of c) {
    if (!Array.isArray(pair) || pair.length !== 2)
      throw new Error("invalid curve pair");
    number(pair[0], 0, 1);
    number(pair[1], 0, 1);
    if (pair[0] <= x) throw new Error("unordered curve");
    x = pair[0];
  }
}
export function validatePreset(p: Preset) {
  if (!p || p.version !== 1 || p.compatibility !== "illustro-brush-1")
    throw new Error("unsupported brush version");
  keys(p, [
    "version",
    "id",
    "name",
    "category",
    "purpose",
    "signature",
    "compatibility",
    "preview",
    "size",
    "opacity",
    "flow",
    "hardness",
    "spacing",
    "aspect",
    "rotation",
    "follow",
    "scatter",
    "sizeJitter",
    "opacityJitter",
    "flowJitter",
    "rotationJitter",
    "grain",
    "grainScale",
    "grainKind",
    "tip",
    "mask",
    "texture",
    "dual",
    "taperStart",
    "taperEnd",
    "stabilization",
    "pressureSmoothing",
    "exposureMs",
    "blend",
    "color",
    "mappings",
  ]);
  for (const key of ["id", "name", "category", "purpose", "preview"] as const)
    if (typeof p[key] !== "string" || p[key].length > 4096 || !p[key].trim())
      throw new Error("invalid brush metadata");
  if (
    typeof p.signature !== "boolean" ||
    typeof p.follow !== "boolean" ||
    !tips.includes(p.tip) ||
    !["normal", "multiply", "screen", "erase"].includes(p.blend) ||
    !["paper", "hatch", "noise", "image"].includes(p.grainKind)
  )
    throw new Error("invalid brush enum");
  number(p.size, 0.01, LIMITS.maxSize);
  number(p.spacing, 0.01, 4);
  number(p.aspect, 0.01, 1);
  number(p.rotation, -100, 100);
  number(p.rotationJitter, 0, Math.PI * 2);
  number(p.scatter, 0, 10);
  number(p.grainScale, 0.1, 2048);
  number(p.taperStart, 0, 2048);
  number(p.taperEnd, 0, 2048);
  number(p.exposureMs, 0, 10000);
  for (const key of [
    "opacity",
    "flow",
    "hardness",
    "sizeJitter",
    "opacityJitter",
    "flowJitter",
    "grain",
    "stabilization",
    "pressureSmoothing",
  ] as const)
    number(p[key], 0, 1);
  if (!Array.isArray(p.color) || p.color.length !== 3)
    throw new Error("invalid color");
  p.color.forEach((v) => number(v, 0, 1));
  if (!Array.isArray(p.mappings) || p.mappings.length > 64)
    throw new Error("invalid mappings");
  for (const m of p.mappings) {
    keys(m, [
      "source",
      "target",
      "min",
      "max",
      "curve",
      "mode",
      "period",
      "fallback",
    ]);
    if (
      !sources.includes(m.source) ||
      !targets.includes(m.target) ||
      !["multiply", "add", "replace"].includes(m.mode)
    )
      throw new Error("invalid mapping");
    number(m.min, -10000, 10000);
    number(m.max, -10000, 10000);
    validateCurve(m.curve);
    if (m.period !== undefined) number(m.period, 0.001, 1e9);
    if (m.fallback !== undefined) number(m.fallback, 0, 1);
  }
  for (const a of [p.mask, p.texture])
    if (a) {
      if (
        !Number.isSafeInteger(a.width) ||
        !Number.isSafeInteger(a.height) ||
        a.width < 1 ||
        a.height < 1 ||
        a.width > 1024 ||
        a.height > 1024 ||
        !Array.isArray(a.alpha) ||
        a.alpha.length !== a.width * a.height
      )
        throw new Error("invalid image resource");
      for (const v of a.alpha) number(v, 0, 1);
    }
  if ((p.tip === "mask" || p.dual === "mask") && !p.mask)
    throw new Error("missing tip resource");
  if (p.dual !== undefined && !tips.includes(p.dual))
    throw new Error("invalid secondary tip");
  if (p.grainKind === "image" && !p.texture)
    throw new Error("missing texture resource");
}
export function validateRecord(r: StrokeRecord) {
  if (
    !r ||
    r.version !== 1 ||
    r.engine !== "illustro-brush-1" ||
    r.random !== "philox4x32-10" ||
    r.reconstruction !== "one-euro-4-4-1.monotone-1"
  )
    throw new Error("unsupported stroke");
  validatePreset(r.preset);
  if (
    !Array.isArray(r.seed) ||
    r.seed.length !== 2 ||
    !r.seed.every((x) => Number.isSafeInteger(x) && x >= 0 && x <= 4294967295)
  )
    throw new Error("invalid seed");
  if (
    !Array.isArray(r.geometry) ||
    r.geometry.length < 1 ||
    r.geometry.length > LIMITS.maxGeometry
  )
    throw new Error("invalid geometry");
  let time = -1;
  for (const p of r.geometry) {
    number(p.x, -LIMITS.maxCoordinate, LIMITS.maxCoordinate);
    number(p.y, -LIMITS.maxCoordinate, LIMITS.maxCoordinate);
    number(p.t, 0, 1e15);
    if (p.t < time) throw new Error("unordered geometry");
    time = p.t;
    number(p.p, 0, 1);
    number(p.tilt, 0, 1);
    number(p.azimuth, -100, 100);
    number(p.twist, -100, 100);
    if (!Number.isInteger(p.valid) || p.valid < 0 || p.valid > 15)
      throw new Error("invalid sensor validity");
    if (!["unknown", "mouse", "pen", "touch"].includes(p.pointerType))
      throw new Error("invalid pointer type");
    number(p.viewGeneration, 0, Number.MAX_SAFE_INTEGER);
    if (!Number.isSafeInteger(p.viewGeneration))
      throw new Error("invalid view generation");
  }
  if (
    !Array.isArray(r.commands) ||
    r.commands.length > Math.ceil(LIMITS.maxCommands / LIMITS.pageCommands)
  )
    throw new Error("invalid command pages");
  let count = 0,
    lastDistance = -1;
  for (const page of r.commands) {
    if (
      !Array.isArray(page) ||
      page.length % STRIDE ||
      !page.length ||
      page.length > LIMITS.pageCommands * STRIDE
    )
      throw new Error("invalid command page");
    for (let i = 0; i < page.length; i += STRIDE) {
      for (let j = 0; j < STRIDE; j++)
        if (!Number.isFinite(page[i + j])) throw new Error("nonfinite command");
      number(
        page[i + C.X],
        -LIMITS.maxCoordinate * 2,
        LIMITS.maxCoordinate * 2,
      );
      number(
        page[i + C.Y],
        -LIMITS.maxCoordinate * 2,
        LIMITS.maxCoordinate * 2,
      );
      number(page[i + C.SIZE], 0.01, LIMITS.maxSize);
      number(page[i + C.ASPECT], 0.01, 1);
      number(page[i + C.ANGLE], -1e6, 1e6);
      for (const c of [C.OPACITY, C.FLOW, C.GRAIN, C.R, C.G, C.B])
        number(page[i + c], 0, 1);
      if (page[i + C.INDEX] !== count++)
        throw new Error("unordered command index");
      number(page[i + C.DISTANCE], lastDistance, 1e12);
      lastDistance = page[i + C.DISTANCE]!;
      number(page[i + C.TIME], 0, 1e15);
      if (count > LIMITS.maxCommands) throw new Error("command limit");
    }
  }
  if (!count) throw new Error("empty stroke");
}
export function serialize(r: StrokeRecord) {
  validateRecord(r);
  return JSON.stringify(r);
}
export function deserialize(text: string): StrokeRecord {
  if (text.length > LIMITS.maxJsonBytes)
    throw new Error("stroke import too large");
  const r = JSON.parse(text) as StrokeRecord;
  validateRecord(r);
  return r;
}
