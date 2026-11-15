import { performance, PerformanceObserver } from "node:perf_hooks";
import { writeFileSync, mkdirSync } from "node:fs";
import { BrushEngine } from "./engine";
import { preset, PRESETS } from "./presets";
import { generate, fixture } from "./fixtures";
import { rasterize, RasterQueue, StrokeRaster } from "./raster";
import { Reconstructor } from "./reconstruction";
import { normalize } from "./input";
const p95 = (a: number[]) =>
  [...a].sort((a, b) => a - b)[Math.floor((a.length - 1) * 0.95)] ?? 0;
const gc: number[] = [];
const observer = new PerformanceObserver((list) => {
  for (const e of list.getEntries()) gc.push(e.duration);
});
observer.observe({ entryTypes: ["gc"] });
const forceGC = () => {
  (globalThis as any).gc?.();
};
forceGC();
const heapBefore = process.memoryUsage().heapUsed;
const inputRuns = [];
for (let run = 0; run < 5; run++) {
  let delivered = 0;
  const e = new BrushEngine(preset("benchmark", "測定", "検査", "性能検査"), {
      retain: false,
      sink: (p) => {
        delivered += p.length / 16;
      },
    }),
    batches: number[] = [];
  for (let i = 0; i < 100000; i += 32) {
    const start = performance.now();
    for (let j = i; j < Math.min(100000, i + 32); j++)
      e.accept({
        x: 30 + j * 0.004,
        y: 120 + 40 * Math.sin(j * 0.003),
        t: (j * 1000) / 240,
        pressure: 0.1 + 0.8 * (0.5 + 0.5 * Math.sin(j * 0.001)),
      });
    batches.push(performance.now() - start);
  }
  const start = performance.now();
  e.finish();
  inputRuns.push({
    accepted: e.metrics.accepted,
    delivered,
    commands: e.metrics.commands,
    activeBytes: e.metrics.activeBytes,
    batchP95Ms: p95(batches),
    batchMaxMs: Math.max(...batches),
    releaseMs: performance.now() - start,
  });
}
forceGC();
const heapAfter = process.memoryUsage().heapUsed;
const cases = [
  preset("s2", "丸2px", "測定", "測定", { size: 2, dynamics: [] }),
  preset("s16", "丸16px", "測定", "測定", { size: 16, dynamics: [] }),
  preset("s128", "丸128px", "測定", "測定", { size: 128, dynamics: [] }),
  preset("s512", "丸512px", "測定", "測定", { size: 512, dynamics: [] }),
  PRESETS.find((p) => p.id === "dry-brush")!,
  { ...PRESETS.find((p) => p.id === "star-stamp")!, spacing: 0.05 },
  PRESETS.find((p) => p.id === "clean-ink")!,
  PRESETS.find((p) => p.id === "bundle")!,
];
const materialization = [];
for (const p of cases) {
  const record = generate(p, fixture("curve", 100)),
    full: number[] = [],
    slice: number[] = [],
    dabs: number[] = [];
  let memory = 0;
  for (let run = 0; run < 5; run++) {
    const r = new StrokeRaster(512, 320),
      q = new RasterQueue(r, p);
    for (const page of record.commands) q.enqueue(page);
    const start = performance.now();
    while (q.remaining) {
      const m = q.run(4096, 2);
      slice.push(m.elapsedMs);
    }
    full.push(performance.now() - start);
    memory = Math.max(memory, r.allocatedBytes);
  }
  materialization.push({
    id: p.id,
    name: p.name,
    commands: record.commands.reduce((n, p) => n + p.length / 16, 0),
    wholeStrokeP95Ms: p95(full),
    sliceP95Ms: p95(slice),
    sliceMaxMs: Math.max(...slice),
    rasterBytes: memory,
    rawWholeRunsMs: full,
    rawSlicesMs: slice,
  });
}
const stabilization = [];
for (const strength of [0, 0.15, 0.5, 0.85, 1]) {
  const f = new Reconstructor(strength, 0.25);
  let noise = 0;
  for (let i = 0; i < 1000; i++) {
    const s = {
        x: 100 + 0.35 * Math.sin(i * 1.7),
        y: 100 + 0.35 * Math.cos(i * 2.3),
        t: (i * 1000) / 120,
        pressure: 0.5,
      },
      p = f.accept(normalize(s));
    noise += (p.x - 100) ** 2 + (p.y - 100) ** 2;
  }
  const loop = fixture("small-loop", 400),
    g = new Reconstructor(strength, 0.25);
  let shapeError = 0;
  for (const s of loop) {
    const p = g.accept(normalize(s));
    shapeError += (p.x - s.x) ** 2 + (p.y - s.y) ** 2;
  }
  stabilization.push({
    strength,
    stationaryRms: Math.sqrt(noise / 1000),
    smallLoopChangeRms: Math.sqrt(shapeError / loop.length),
  });
}
await new Promise((r) => setTimeout(r, 20));
observer.disconnect();
const result = {
  version: 1,
  measuredAt: new Date().toISOString(),
  runtime: process.version,
  platform: process.platform,
  scope:
    "Node process; no physical input/display latency or Android hardware certification",
  inputRuns,
  materialization,
  stabilization,
  memory: {
    heapBefore,
    heapAfter,
    forcedGC: !!(globalThis as any).gc,
    gcDurationsMs: gc,
  },
  performanceStatus: "MEASURED; not a universal device performance PASS",
};
mkdirSync("docs/brush/evidence", { recursive: true });
writeFileSync(
  "docs/brush/evidence/node-performance.json",
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify(
    {
      inputRuns,
      materialization: materialization.map(
        ({ rawSlicesMs, rawWholeRunsMs, ...rest }) => rest,
      ),
      stabilization,
      memory: { heapBefore, heapAfter, gcMaxMs: Math.max(0, ...gc) },
    },
    null,
    2,
  ),
);
