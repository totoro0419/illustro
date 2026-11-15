import type { Point, Sample } from "./types";
import { LIMITS } from "./types";
export function normalize(s: Sample): Point {
  if (s.predicted) throw new Error("predicted input cannot be canonical");
  if (
    !Number.isFinite(s.x) ||
    !Number.isFinite(s.y) ||
    !Number.isFinite(s.t) ||
    s.t < 0 ||
    s.t > 1e15 ||
    Math.abs(s.x) > LIMITS.maxCoordinate ||
    Math.abs(s.y) > LIMITS.maxCoordinate
  )
    throw new Error("invalid input coordinate/time");
  for (const v of [s.pressure, s.tilt, s.azimuth, s.twist])
    if (v !== undefined && !Number.isFinite(v))
      throw new Error("invalid sensor");
  for (const v of [s.azimuth, s.twist])
    if (v !== undefined && Math.abs(v) > 100)
      throw new Error("invalid sensor range");
  if (
    s.pointerType !== undefined &&
    !["", "pen", "mouse", "touch", "unknown"].includes(s.pointerType)
  )
    throw new Error("invalid pointer type");
  if (
    s.viewGeneration !== undefined &&
    (!Number.isSafeInteger(s.viewGeneration) || s.viewGeneration < 0)
  )
    throw new Error("invalid view generation");
  const pen = s.pointerType === undefined || s.pointerType === "pen";
  let valid = 0;
  const p =
    pen && s.pressure !== undefined
      ? ((valid |= 1), Math.max(0, Math.min(1, s.pressure)))
      : 1;
  const tilt =
    pen && s.tilt !== undefined
      ? ((valid |= 2), Math.max(0, Math.min(1, s.tilt)))
      : 0;
  const azimuth =
    pen && s.azimuth !== undefined ? ((valid |= 4), s.azimuth) : 0;
  const twist = pen && s.twist !== undefined ? ((valid |= 8), s.twist) : 0;
  return { x: s.x, y: s.y, t: s.t, p, tilt, azimuth, twist, valid };
}
export function capturePointer(
  e: PointerEvent,
  transform: (x: number, y: number) => readonly [number, number],
  viewGeneration: number,
): Sample[] {
  const coalesced = e.getCoalescedEvents?.() ?? [];
  const events = coalesced.length ? coalesced : [e];
  // Unsupported pen sensors have no reliable automatic capability probe. Zero is recorded
  // only for pressure; optional tilt/azimuth/twist must be supplied by the caller's profile.
  return events.map((v) => {
    const [x, y] = transform(v.clientX, v.clientY);
    return {
      x,
      y,
      t: v.timeStamp,
      pressure: v.pressure,
      pointerType: v.pointerType,
      viewGeneration,
    };
  });
}
export function penSensors(
  e: PointerEvent,
  capabilities: Readonly<{ tilt: boolean; azimuth: boolean; twist: boolean }>,
): Partial<Sample> {
  return {
    ...(capabilities.tilt
      ? { tilt: Math.min(1, Math.hypot(e.tiltX, e.tiltY) / 90) }
      : {}),
    ...(capabilities.azimuth ? { azimuth: e.azimuthAngle } : {}),
    ...(capabilities.twist ? { twist: (e.twist * Math.PI) / 180 } : {}),
  };
}
