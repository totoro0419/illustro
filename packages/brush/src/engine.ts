import { C, LIMITS, STRIDE } from "./types";
import type { Point, Preset, Sample, StrokeRecord, PageSink } from "./types";
import { normalize } from "./input";
import { Reconstructor, interpolate } from "./reconstruction";
import { makeDab } from "./dynamics";
import { validatePreset } from "./record";
export type EngineOptions = Readonly<{
  seed?: readonly [number, number];
  sink?: PageSink;
  geometrySink?: (point: Point) => void;
  retain?: boolean;
}>;
export class BrushEngine {
  readonly preset: Preset;
  readonly seed: readonly [number, number];
  private filter: Reconstructor;
  private points: Point[] = [];
  private previous: Point | undefined;
  private total = 0;
  private carry = 0;
  private spacing = 0.25;
  private index = 0;
  private startTime = 0;
  private lastTime = -1;
  private exposureTime = 0;
  private direction = 0;
  private readonly tailCapacity: number;
  private tail: Float64Array;
  private scratch = new Float64Array(STRIDE);
  private tailHead = 0;
  private tailLength = 0;
  private page = new Float64Array(LIMITS.pageCommands * STRIDE);
  private pageLength = 0;
  private savedPages: (readonly number[])[] = [];
  private geometry: Point[] = [];
  private closed = false;
  private failed = false;
  private accepted = 0;
  private stable = 0;
  constructor(
    preset: Preset,
    private readonly options: EngineOptions = {},
  ) {
    validatePreset(preset);
    this.tailCapacity = Math.min(
      LIMITS.maxTailCommands,
      Math.max(256, Math.ceil(preset.taperEnd / 0.25) + 512),
    );
    this.tail = new Float64Array(this.tailCapacity * STRIDE);
    this.preset = deepFreeze(JSON.parse(JSON.stringify(preset)) as Preset);
    if (
      options.seed &&
      (options.seed.length !== 2 ||
        !options.seed.every(
          (v) => Number.isSafeInteger(v) && v >= 0 && v <= 4294967295,
        ))
    )
      throw new Error("invalid semantic seed");
    this.seed = Object.freeze([
      ...(options.seed ?? [0x12345678, 0x9abcdef0]),
    ]) as readonly [number, number];
    this.filter = new Reconstructor(
      preset.stabilization,
      preset.pressureSmoothing,
    );
  }
  diagnosticPoints(limit = 5000) {
    return this.geometry.slice(-Math.max(0, Math.min(5000, limit)));
  }
  get metrics() {
    return {
      accepted: this.accepted,
      commands: this.index,
      stableCommands: this.stable,
      activeBytes: this.tail.byteLength + this.page.byteLength,
      tailCommands: this.tailLength,
      distance: this.total,
    };
  }
  accept(sample: Sample) {
    this.open();
    try {
      const raw = normalize(sample);
      if (raw.t < this.lastTime) throw new Error("out-of-order input");
      if (this.accepted >= LIMITS.maxGeometry && this.options.retain !== false)
        throw new Error("geometry retention limit reached");
      const point = this.filter.accept(raw);
      this.lastTime = point.t;
      this.accepted++;
      if (this.options.retain !== false)
        this.geometry.push(Object.freeze(point));
      this.options.geometrySink?.(Object.freeze(point));
      if (!this.previous) {
        this.startTime = point.t;
        this.exposureTime = point.t;
        this.previous = point;
        this.points = [point, point];
        this.emit(point, 0, 0);
        return;
      }
      const last = this.points.at(-1)!;
      if (point.x === last.x && point.y === last.y) {
        this.points[this.points.length - 1] = point;
        if (
          point.p !== last.p &&
          point.x === this.previous.x &&
          point.y === this.previous.y
        )
          this.emit(point, 0, this.direction);
        return;
      }
      this.points.push(point);
      if (this.points.length === 4) {
        this.segment(
          this.points[0]!,
          this.points[1]!,
          this.points[2]!,
          this.points[3]!,
        );
        this.points.shift();
      }
    } catch (e) {
      this.failed = true;
      throw e;
    }
  }
  // Held exposure is explicit. It does not claim new physical samples or change the filter.
  expose(time: number) {
    this.open();
    if (!Number.isFinite(time) || time < 0)
      throw new Error("invalid exposure time");
    if (time < this.exposureTime) return;
    if (!this.preset.exposureMs || !this.previous) return;
    const end = Math.min(
      time,
      this.exposureTime + this.preset.exposureMs * 4096,
    );
    if (end !== time) throw new Error("exposure backlog limit");
    if (
      this.exposureTime + this.preset.exposureMs <= time &&
      this.points.length >= 3
    ) {
      this.finishPath();
      const latest = this.points.at(-1)!;
      this.points = [latest, latest];
      this.previous = latest;
      this.carry = 0;
    }
    while (this.exposureTime + this.preset.exposureMs <= time) {
      this.exposureTime += this.preset.exposureMs;
      this.emit({ ...this.previous, t: this.exposureTime }, 0, this.direction);
    }
  }
  finish() {
    this.open();
    try {
      this.finishPath();
      this.flushTail(true);
      this.seal();
      this.closed = true;
      return this.metrics;
    } catch (e) {
      this.failed = true;
      throw e;
    }
  }
  cancel() {
    if (this.closed) throw new Error("stroke closed");
    this.closed = true;
    this.pageLength = this.tailLength = 0;
    this.geometry = [];
    this.savedPages = [];
  }
  record(): StrokeRecord {
    if (!this.closed || this.failed)
      throw new Error("stroke must be successfully finalized");
    if (this.options.retain === false)
      throw new Error("streaming sink owns stroke pages");
    return Object.freeze({
      version: 1,
      engine: "illustro-brush-1",
      reconstruction: "one-euro-4-4-1.monotone-1",
      random: "philox4x32-10",
      seed: this.seed,
      preset: deepFreeze(this.preset),
      geometry: Object.freeze([...this.geometry]),
      commands: Object.freeze([...this.savedPages]),
    });
  }
  // Isolated bounded tail preview. Prefix pages are consumed incrementally by the renderer.
  preview(): Float64Array {
    if (this.failed) throw new Error("failed stroke");
    if (this.closed) return new Float64Array();
    const state = {
      total: this.total,
      carry: this.carry,
      spacing: this.spacing,
      index: this.index,
      previous: this.previous,
      direction: this.direction,
      head: this.tailHead,
      length: this.tailLength,
      stable: this.stable,
    };
    const scratch = new Float64Array(this.tail);
    const savedPage = this.page,
      savedLength = this.pageLength;
    const savedPages = this.savedPages;
    const output: number[] = [];
    this.page = new Float64Array(LIMITS.pageCommands * STRIDE);
    this.pageLength = 0;
    this.savedPages = [];
    this.previewSink = (page) => output.push(...page);
    try {
      this.finishPath();
      this.flushTail(true);
      this.seal();
      return Float64Array.from(output);
    } finally {
      this.total = state.total;
      this.carry = state.carry;
      this.spacing = state.spacing;
      this.index = state.index;
      this.previous = state.previous;
      this.direction = state.direction;
      this.tail = scratch;
      this.tailHead = state.head;
      this.tailLength = state.length;
      this.stable = state.stable;
      this.page = savedPage;
      this.pageLength = savedLength;
      this.savedPages = savedPages;
      this.previewSink = undefined;
    }
  }
  pendingPrefix() {
    return this.page.slice(0, this.pageLength * STRIDE);
  }
  private previewSink: PageSink | undefined;
  private finishPath() {
    if (this.points.length >= 3)
      this.segment(
        this.points[0]!,
        this.points[1]!,
        this.points[2]!,
        this.points[2]!,
      );
    const end = this.points.at(-1);
    if (
      end &&
      this.previous &&
      Math.hypot(end.x - this.previous.x, end.y - this.previous.y) > 1e-9
    )
      this.step(end);
    if (this.total > 0 && this.carry > 1e-9 && end)
      this.emit(end, 0, this.direction);
  }
  private segment(a: Point, b: Point, c: Point, d: Point) {
    const chord = Math.hypot(c.x - b.x, c.y - b.y);
    const minimum = Math.max(0.25, Math.min(2, this.spacing * 0.5));
    const steps = Math.max(1, Math.ceil(chord / minimum));
    if (steps > 1000000) throw new Error("segment work limit reached");
    for (let i = 1; i <= steps; i++)
      this.step(interpolate(a, b, c, d, i / steps));
  }
  private step(p: Point) {
    const prev = this.previous!;
    const dx = p.x - prev.x,
      dy = p.y - prev.y,
      length = Math.hypot(dx, dy);
    if (!length) {
      this.previous = p;
      return;
    }
    this.direction = Math.atan2(dy, dx);
    const speed = length / Math.max(0.001, (p.t - prev.t) / 1000);
    let at = this.spacing - this.carry;
    while (at <= length + 1e-10) {
      const u = Math.min(1, at / length);
      const q = {
        ...p,
        x: prev.x + dx * u,
        y: prev.y + dy * u,
        t: prev.t + (p.t - prev.t) * u,
        p: prev.p + (p.p - prev.p) * u,
        tilt: prev.tilt + (p.tilt - prev.tilt) * u,
        azimuth: prev.azimuth + (p.azimuth - prev.azimuth) * u,
        twist: prev.twist + (p.twist - prev.twist) * u,
        valid: prev.valid & p.valid,
      };
      const dist = this.total + at;
      this.emit(q, speed, this.direction, dist);
      at += this.spacing;
    }
    this.carry = length - (at - this.spacing);
    this.total += length;
    this.previous = p;
    this.flushTail(false);
  }
  private emit(
    p: Point,
    speed: number,
    direction: number,
    distance = this.total,
  ) {
    if (this.index >= LIMITS.maxCommands)
      throw new Error("command capacity reached");
    if (this.tailLength >= this.tailCapacity)
      throw new Error("mutable tail capacity reached");
    const dab = makeDab(
      p,
      this.preset,
      this.index++,
      this.seed,
      distance,
      speed,
      direction,
      p.t - this.startTime,
      this.scratch,
    );
    this.spacing = Math.max(
      0.25,
      dab[C.SIZE]! * dab[C.ASPECT]! * dab[C.RESERVED1]!,
    );
    const slot = (this.tailHead + this.tailLength) % this.tailCapacity;
    this.tail.set(dab, slot * STRIDE);
    this.tailLength++;
    if (
      this.total > 0 ||
      (this.preset.taperStart === 0 && this.preset.taperEnd === 0)
    )
      this.flushTail(false);
  }
  private flushTail(final: boolean) {
    while (this.tailLength) {
      const offset = this.tailHead * STRIDE,
        dist = this.tail[offset + C.DISTANCE]!;
      if (!final && dist > this.total - this.preset.taperEnd) break;
      const slot = this.pageLength * STRIDE;
      this.page.set(this.tail.subarray(offset, offset + STRIDE), slot);
      if (this.total > 0) {
        const start = this.preset.taperStart
          ? Math.min(1, dist / this.preset.taperStart)
          : 1;
        const end =
          final && this.preset.taperEnd
            ? Math.min(
                1,
                Math.max(0, (this.total - dist) / this.preset.taperEnd),
              )
            : 1;
        this.page[slot + C.SIZE] = Math.max(
          0.01,
          this.page[slot + C.SIZE]! * Math.max(0.02, Math.min(start, end)),
        );
      }
      this.tailHead = (this.tailHead + 1) % this.tailCapacity;
      this.tailLength--;
      this.pageLength++;
      this.stable++;
      if (this.pageLength === LIMITS.pageCommands) this.seal();
    }
  }
  private seal() {
    if (!this.pageLength) return;
    const owned = this.page.slice(0, this.pageLength * STRIDE);
    if (this.previewSink) this.previewSink(owned);
    else {
      this.options.sink?.(owned.slice());
      if (this.options.retain !== false)
        this.savedPages.push(Object.freeze(Array.from(owned)));
    }
    this.pageLength = 0;
  }
  private open() {
    if (this.closed) throw new Error("stroke closed");
    if (this.failed) throw new Error("stroke failed");
  }
}
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const v of Object.values(value))
      if (v && typeof v === "object" && !Object.isFrozen(v)) deepFreeze(v);
  }
  return value;
}
