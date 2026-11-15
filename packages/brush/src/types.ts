export type Sample = Readonly<{
  x: number;
  y: number;
  t: number;
  pressure?: number;
  tilt?: number;
  azimuth?: number;
  twist?: number;
  pointerType?: string;
  viewGeneration?: number;
  predicted?: boolean;
}>;
export type Point = Readonly<{
  x: number;
  y: number;
  t: number;
  p: number;
  tilt: number;
  azimuth: number;
  twist: number;
  valid: number;
}>;
export type Curve = readonly (readonly [number, number])[];
export type Source =
  | "pressure"
  | "velocity"
  | "tilt"
  | "azimuth"
  | "twist"
  | "direction"
  | "distance"
  | "time"
  | "random";
export type Target =
  | "size"
  | "opacity"
  | "flow"
  | "spacing"
  | "rotation"
  | "scatter"
  | "aspect"
  | "grain"
  | "hue"
  | "saturation"
  | "value";
export type Mapping = Readonly<{
  source: Source;
  target: Target;
  min: number;
  max: number;
  curve: Curve;
  mode: "multiply" | "add" | "replace";
  period?: number;
  fallback?: number;
}>;
export type Mask = Readonly<{
  width: number;
  height: number;
  alpha: readonly number[];
}>;
export type Tip =
  | "round"
  | "ellipse"
  | "rect"
  | "bristle"
  | "star"
  | "leaf"
  | "mask";
export type Preset = Readonly<{
  version: 1;
  id: string;
  name: string;
  category: string;
  purpose: string;
  signature: boolean;
  compatibility: "illustro-brush-1";
  preview: string;
  size: number;
  opacity: number;
  flow: number;
  hardness: number;
  bristles: number;
  dualAspect?: number;
  grainRotation: number;
  hueJitter: number;
  taperMinimum: number;
  pressureCurve: Curve;
  spacing: number;
  aspect: number;
  rotation: number;
  follow: boolean;
  scatter: number;
  sizeJitter: number;
  opacityJitter: number;
  flowJitter: number;
  rotationJitter: number;
  grain: number;
  grainScale: number;
  grainKind: "paper" | "hatch" | "noise" | "image";
  tip: Tip;
  mask?: Mask;
  texture?: Mask;
  dual?: Tip;
  taperStart: number;
  taperEnd: number;
  stabilization: number;
  pressureSmoothing: number;
  exposureMs: number;
  blend: "normal" | "multiply" | "screen" | "erase";
  color: readonly [number, number, number];
  mappings: readonly Mapping[];
}>;
// One packed command, Float64 for geometry and deterministic strict arithmetic.
export const STRIDE = 16;
export const C = {
  X: 0,
  Y: 1,
  SIZE: 2,
  ASPECT: 3,
  ANGLE: 4,
  OPACITY: 5,
  FLOW: 6,
  GRAIN: 7,
  R: 8,
  G: 9,
  B: 10,
  DISTANCE: 11,
  TIME: 12,
  INDEX: 13,
  RESERVED1: 14,
  RESERVED2: 15,
} as const;
export type PageSink = (page: Float64Array) => void;
export type StrokeRecord = Readonly<{
  version: 1;
  engine: "illustro-brush-1";
  reconstruction: "one-euro-4-4-1.monotone-1";
  random: "philox4x32-10";
  seed: readonly [number, number];
  preset: Preset;
  geometry: readonly Point[];
  commands: readonly (readonly number[])[];
}>;
export const LIMITS = Object.freeze({
  maxSize: 4096,
  maxCoordinate: 1e8,
  maxCommands: 2000000,
  maxGeometry: 500000,
  pageCommands: 256,
  maxTailCommands: 8192,
  maxWorkingBytes: 128 * 1024 * 1024,
  maxJsonBytes: 128 * 1024 * 1024,
});
