import { writeFileSync } from "node:fs";
import { PerformanceObserver } from "node:perf_hooks";
import { Reconstructor } from "../src/reconstruction";
import { normalize } from "../src/input";
import { BrushEngine } from "../src/engine";
import { BASE, PRESETS } from "../src/presets";
import { StrokeRaster, RasterQueue } from "../src/raster";
import { fixture } from "./fixtures";
const q = (a: number[], p: number) => {
  const b = [...a].sort((a, b) => a - b);
  return b[Math.floor((b.length - 1) * p)] ?? 0;
};
const times = (a: number[]) => ({
  p50Ms: q(a, 0.5),
  p95Ms: q(a, 0.95),
  p99Ms: q(a, 0.99),
  maxMs: Math.max(...a),
  samples: a,
});
const gc: number[] = [];
const observer = new PerformanceObserver((list) => {
  for (const e of list.getEntries()) gc.push(e.duration);
});
observer.observe({ entryTypes: ["gc"] });
const stabilization = [];
for (const kind of ["stationary", "small-loop", "circle", "s"]) {
  const input = fixture(kind, 360);
  if (kind === "stationary")
    for (let i = 0; i < input.length; i++)
      input[i] = { ...input[i]!, x: 100, y: 100 };
  let seed = 42;
  const noise = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed / 4294967296 - 0.5) * 0.76;
  };
  const noisy = input.map((p) => ({
    ...p,
    x: p.x + noise(),
    y: p.y + noise(),
  }));
  for (const strength of [0, 0.15, 0.5, 0.85, 1]) {
    const f = new Reconstructor(strength, 0.15);
    let error = 0;
    for (let i = 0; i < noisy.length; i++) {
      const p = f.accept(normalize(noisy[i]!));
      error += (p.x - input[i]!.x) ** 2 + (p.y - input[i]!.y) ** 2;
    }
    stabilization.push({
      kind,
      strength,
      rmsePixels: Math.sqrt(error / noisy.length),
    });
  }
}
const before = process.memoryUsage(),
  pipeline = [];
for (let rep = 0; rep < 5; rep++) {
  const batch: number[] = [],
    e = new BrushEngine(
      { ...BASE, size: 6, mappings: [] },
      { retain: false, sink: () => {} },
    );
  for (let i = 0; i < 100000; i += 32) {
    const t = performance.now();
    for (let j = i; j < Math.min(i + 32, 100000); j++)
      e.accept({
        x: 100 + 80 * Math.sin(j / 1000),
        y: 100 + 50 * Math.cos(j / 1000),
        t: (j * 1000) / 240,
        pressure: 0.5,
      });
    batch.push(performance.now() - t);
  }
  const t = performance.now();
  e.finish();
  pipeline.push({
    repeat: rep,
    accepted: e.metrics.accepted,
    commands: e.metrics.commands,
    activeBytes: e.metrics.activeBytes,
    releaseMs: performance.now() - t,
    batch32: times(batch),
  });
}
const cases = [
  { name: "round-2", p: { ...BASE, size: 2, mappings: [] } },
  { name: "round-16", p: { ...BASE, size: 16, mappings: [] } },
  { name: "round-128", p: { ...BASE, size: 128, mappings: [] } },
  { name: "round-512", p: { ...BASE, size: 512, mappings: [] } },
  {
    name: "dry-texture-48",
    p: { ...PRESETS.find((p) => p.id === "dry-brush")!, size: 48 },
  },
  {
    name: "dense-star-32",
    p: { ...PRESETS.find((p) => p.id === "star")!, size: 32, spacing: 0.08 },
  },
  { name: "pressure-line-12", p: { ...BASE, size: 12 } },
  {
    name: "signature-hair-32",
    p: { ...PRESETS.find((p) => p.id === "bundle")!, size: 32 },
  },
];
const rasterCases = [];
for (const { name, p } of cases) {
  const e = new BrushEngine(p);
  fixture("s", 100).forEach((s) => e.accept(s));
  e.finish();
  const record = e.record(),
    whole: number[] = [],
    slices: number[] = [];
  let peak = 0,
    pixels = 0;
  for (let rep = 0; rep < 5; rep++) {
    const raster = new StrokeRaster(512, 320),
      queue = new RasterQueue(raster, p);
    for (const page of record.commands) queue.enqueue(page);
    const t = performance.now();
    while (queue.remaining) {
      const result = queue.run(16000, 3);
      slices.push(result.elapsedMs);
      pixels += result.pixels;
    }
    whole.push(performance.now() - t);
    peak = Math.max(peak, raster.allocatedBytes);
  }
  rasterCases.push({
    name,
    commands: e.metrics.commands,
    pixels,
    peakBytes: peak,
    wholeStroke: times(whole),
    scheduledSlices: times(slices),
  });
}
const after = process.memoryUsage();
if (globalThis.gc) globalThis.gc();
setImmediate(() => {
  const final = process.memoryUsage();
  const result = {
    date: new Date().toISOString(),
    runtime: process.version,
    platform: process.platform,
    scope:
      "Node synthetic workloads; not physical device or input-to-display latency",
    pipeline,
    stabilization,
    rasterCases,
    memory: { before, after, forcedGC: !!globalThis.gc, afterForcedGC: final },
    gcObservedMs: gc,
    limitations: [
      "GC observation includes entire process; no allocation-free claim",
      "3ms slices are experimental scheduling parameters, not device acceptance targets",
      "CPU full compositing/display cost excluded from rasterCases",
      "Presets/records retained separately; streaming staging bound does not bound all saved history",
    ],
  };
  writeFileSync(
    "docs/brush/evidence/current-node-benchmark.json",
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      pipeline: pipeline.map((p) => ({
        accepted: p.accepted,
        p95: p.batch32.p95Ms,
        max: p.batch32.maxMs,
        release: p.releaseMs,
      })),
      raster: rasterCases.map((r) => ({
        name: r.name,
        p95: r.wholeStroke.p95Ms,
        sliceP95: r.scheduledSlices.p95Ms,
        sliceMax: r.scheduledSlices.maxMs,
        bytes: r.peakBytes,
      })),
      memory: result.memory,
    }),
  );
  observer.disconnect();
});
