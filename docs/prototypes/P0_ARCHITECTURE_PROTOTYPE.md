# P0 Architecture Prototype — Initial Harness

> Date: 2026-09-27  
> Status: **Implemented and committed / core static+runtime checks PASS / limited Headless Chromium execution PASS / target-device browser validation still pending**

## Purpose

This prototype is intentionally isolated from the production app. It exists to measure assumptions before the final runtime/backend/language/thread layout is fixed.

Current harness covers:

- Main-thread pointer/render path
- Worker + OffscreenCanvas pointer/render path
- coalesced Pointer Event normalization
- Sparse logical tile allocation + dirty rectangles
- Revision-head Undo/Redo control-plane semantics
- OPFS journal worker with in-memory fallback
- input scheduling percentile collection
- active-pointer/stroke-lifecycle guard
- synthetic Tile-size sweep

Prototype source:

`prototypes/p0-architecture/`

## Dependency baseline checked on 2026-09-27

- Vite 8.3.1
- TypeScript 7.0.2
- Vitest 5.0.2

These are prototype dependencies, not production locks.

## Verification completed

### TypeScript static check

The application/worker source was checked with the available global TypeScript compiler (5.8.3) under strict settings.

Result: **PASS** after the initial DOM nullable fixes and the later pointer-lifecycle/DPR corrections.

This does not substitute for a final check using the declared TypeScript 7.0.2 package.

### Dependency-free core runtime check

Core TypeScript was transpiled and executed under Node for:

- SparseTileSurface
- RevisionHistory
- MetricSeries

Result:

- Sparse Tile boundary allocation: **PASS**
- Dirty state consume/reset: **PASS**
- Undo/Redo head switching: **PASS**
- Redo invalidation after branch: **PASS**
- Metric percentile summary: **PASS**
- ActivePointerGate ownership/lifecycle runtime check: **PASS**

### Synthetic tile sweep

Environment: container Node v22.16.0.  
Workload: 5,000 deterministic scattered dirty rectangles over a 16,384×16,384 logical coordinate space.

| Logical tile | Touched operations | Allocated tiles | Approx allocated RGBA bytes | Duration |
|---:|---:|---:|---:|---:|
| 64 | 22,550 | 17,968 | 294,387,712 | 1310.17 ms |
| 128 | 11,825 | 5,278 | 345,899,008 | 288.01 ms |
| 256 | 7,980 | 1,434 | 375,914,496 | 226.07 ms |
| 512 | 6,390 | 407 | 426,770,432 | 125.70 ms |

Interpretation:

- Larger tiles reduced metadata/tile-touch overhead in this synthetic workload.
- Larger tiles also increased allocated pixel memory because each touched tile is materially larger.
- This benchmark is deliberately simple and **does not identify a production-optimal tile size**.
- Real brush locality, empty-tile compression, GPU upload granularity, filter halos, cache behavior and mobile memory pressure must be measured before deciding.

### Synthetic history control-plane benchmark

100,000 simple revision commits + 1,000 undo + 1,000 redo operations:

- duration: 102.61 ms in the local Node synthetic test
- final head: revision 100,000

This tests revision-control overhead only. It does not model raster payload memory or persistence.

## Limited Headless Chromium execution

The environment contains Headless Chromium 144, but it is governed by an organization navigation policy.

Observed navigation restrictions:

- localhost/private-IP HTTP: blocked
- `file:`: blocked
- `data:`: blocked
- external HTTPS navigation: blocked

Therefore the actual Vite-served page could not be navigated in this environment.

To continue verification without publishing the prototype, the compiled Core and Worker logic was injected into an existing `about:blank` target through the DevTools Protocol.

### Verified in the injected environment

- Core JavaScript executes in Chromium: **PASS**
- `OffscreenCanvas` capability exists: **PASS**
- Worker creation exists: **PASS**
- OffscreenCanvas transfer to a classic Blob Worker: **PASS**
- Worker receives sample batches and acknowledges completed drawing work: **PASS**
- Sparse Tile benchmark executes in Chromium: **PASS**
- Revision benchmark executes in Chromium: **PASS**

The synthetic worker path showed non-zero and variable scheduling/message overhead. The metric is a Worker roundtrip proxy, not physical display latency. This is enough to reject the assumption that moving realtime drawing to a Worker is automatically faster; production placement remains device/Browser benchmark-driven.

### Prototype defects discovered by browser review and corrected

1. **Cross-stroke continuation**  
   The previous last sample could survive `pointerup`, causing the next stroke to connect to the previous stroke.

   Fix: explicit `begin` / `end` stroke messages and tail reset on both main and Worker paths.

2. **Pen hover could enter drawing processing**  
   The previous condition allowed pen `pointermove` with no active press.

   Fix: `ActivePointerGate`; only a pointer that successfully entered through `pointerdown` can feed the active stroke.

3. **Worker DPR mismatch**  
   Worker rendering used physical backing dimensions but CSS-coordinate input without applying DPR transform.

   Fix: pass DPR on init/resize and apply `setTransform(dpr, ...)`.

4. **High-frequency layout read in pointer path**  
   The prototype called `getBoundingClientRect()` for every pointer event.

   Fix: cache Canvas geometry and refresh on resize/scroll/VisualViewport changes.

5. **Worker metric naming overstated meaning**  
   The old metric name suggested presentation completion.

   Fix: split into `worker-roundtrip` and `worker-to-next-raf`, with explicit proxy semantics.

### Still unverified in Chromium

- the exact Vite module-Worker loading path
- secure-origin OPFS / SyncAccessHandle
- WebGPU
- real Pointer Events/coalesced stylus samples from hardware
- physical input-to-visible/display latency

A module Worker created from a Blob under the injected opaque-origin test failed to load, while the classic Blob Worker path succeeded. Because the real application uses a normal module Worker from a served origin, this failure is treated as an environment/origin limitation until tested from an actual preview or local development origin.

## Verification not completed yet

The current execution environment timed out while running `npm install`, so these items remain **UNVERIFIED**:

- build with Vite 8.3.1
- typecheck with TypeScript 7.0.2
- Vitest package test run
- real served-page pointer-to-visible metrics
- exact module-Worker Main vs Worker comparison
- OPFS SyncAccessHandle behavior on a secure served origin
- mobile Safari / Android Chrome behavior
- WebGPU path (not included in this first harness yet)

The timeout is an environment/dependency-fetch limitation, not evidence that the prototype code succeeds or fails in-browser.

## How to run when dependencies are available

From `prototypes/p0-architecture`:

```bash
npm install
npm run test
npm run build
npm run dev
```

Open:

- `?input=main` for the main-thread path
- `?input=worker` for Worker + OffscreenCanvas path

Console API:

```js
illustroPrototype.tileSweep()
illustroPrototype.runHistoryBenchmark()
await illustroPrototype.runPersistenceBenchmark()
illustroPrototype.metrics.summary('input-to-raf')
illustroPrototype.metrics.summary('worker-roundtrip')
illustroPrototype.metrics.summary('worker-to-next-raf')
```

## Next measurement gate

Before selecting production values or architecture placement:

1. Run the **served** harness in Chromium, Safari/WebKit and Firefox-compatible fallback environments where applicable.
2. Measure real stylus input on PC, iPad-class tablet, Android tablet, iPhone-class phone and Android phone.
3. Add WebGPU and compatibility GPU microbenchmarks.
4. Add memory high-water and tile eviction tests.
5. Fault-inject OPFS journal interruption.
6. Only then narrow Tile Size, Worker placement and persistence cadence candidates.
