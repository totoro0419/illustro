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

## Persistence / Recovery prototype

The initial Persistence Worker flushed every record independently. That was intentionally simple but inconsistent with the performance-first architecture.

The worker now:

- frames recovery records before batching
- keeps OPFS `FileSystemSyncAccessHandle` open when available instead of opening/closing it per record
- batches multiple records before `flush()`
- exposes `maxBatchBytes` and `batchDelayMs` as **benchmark inputs**
- acknowledges records only after the containing batch has completed its durability attempt
- falls back to in-memory batches when OPFS is unavailable in the test environment

The harness defaults (`128 KiB`, `16 ms`) are convenience values for this prototype only. They are not production decisions and were not copied from the legacy review document.

### Prototype journal framing

A deliberately small prototype-only frame format was added to test torn-tail recovery behavior.

It is **not** the future `.illustro` journal format and deliberately does not adopt the legacy draft's fixed frame sizes, hashes, CRC choices, segment magic, or flush timings.

The scanner:

- accepts only consecutive complete frames
- stops at the first truncated/invalid frame
- never scans forward for a later matching magic value
- requires caller-supplied resource limits

### Fault injection result

A complete first frame and a second 257-byte-payload frame were concatenated.

The second frame was then truncated at **every byte position** before completion.

Result:

- truncation cut positions checked: **285**
- complete first frame recovered: **285 / 285**
- incomplete second frame accepted: **0 / 285**
- corrupted trailer test: **rejected**
- complete two-frame stream: **accepted**
- JournalBatcher threshold/take/reset behavior: **PASS**

This validates the intended torn-tail rule for the prototype framing. It does not yet prove power-loss durability or OPFS atomicity.

### Legacy-reference comparison

After the independent implementation plan was established, the relevant sections of `ILLUSTRO_SECTION9_ALGORITHM_REVIEW_DRAFT(2).txt` were rechecked.

Higher-level lessons retained:

- partial journal records must not become completed recovery state
- durability work must not run on the realtime UI path
- recovery/backpressure must stay bounded
- batching values are calibration inputs, not semantic constants
- API `flush()` success alone must not be promoted into an unmeasured power-loss guarantee

Details explicitly not inherited:

- legacy journal magic/record layout
- fixed header/trailer sizes
- SHA/CRC selection
- fixed payload size
- fixed batch sizes
- fixed flush-age candidates
- fixed recovery latency guarantees

## Verification not completed yet

The current execution environment timed out while running `npm install`, so these items remain **UNVERIFIED**:

- build with Vite 8.3.1
- typecheck with TypeScript 7.0.2
- Vitest package test run
- real served-page pointer-to-visible metrics
- exact module-Worker Main vs Worker comparison
- OPFS SyncAccessHandle batching/flush behavior on a secure served origin
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

## User-device measurement — 2026-09-28

> Exact device model / browser version / input device: **not yet recorded**.  
> Evidence source: user-run GitHub Pages harness screenshots and user-reported perceived latency.

### Main-thread path

Observed after sustained drawing:

- samples: 4096
- input → next RAF p50: **9.40 ms**
- p95: **13.40 ms**
- p99: **14.50 ms**
- max: **16.60 ms**

### Worker path

Observed after sustained drawing:

- worker roundtrip samples: 2048
- worker roundtrip p50: **3.70 ms**
- worker roundtrip p95: **6.20 ms**
- input → next RAF p50: **16.80 ms**
- input → next RAF p95: **18.90 ms**

### User perception

User report:

- **No meaningful perceived difference between Main and Worker paths.**

### Interpretation

These are scheduling proxies, not physical scan-out latency.

Within this single device/profile:

- Worker messaging/drawing adds measurable scheduling overhead.
- The Worker path does not show a user-perceived benefit.
- Main-thread input → next-RAF proxy is lower than the Worker path.
- Therefore **there is currently no evidence to prefer the Worker realtime path for this device profile**.

This does **not** establish a global Main-thread architecture decision. PC, tablet, smartphone, browser, refresh rate, stylus stack, GPU backend and workload can change the crossover.

Performance-first rule for this profile:

> If two paths feel equivalent and preserve the same semantics, prefer the path with less measured overhead and lower implementation/runtime complexity until contrary evidence appears.

## Next measurement gate

Before selecting production values or architecture placement:

1. Run the **served** harness in Chromium, Safari/WebKit and Firefox-compatible fallback environments where applicable.
2. Measure real stylus input on PC, iPad-class tablet, Android tablet, iPhone-class phone and Android phone.
3. Add WebGPU and compatibility GPU microbenchmarks.
4. Add memory high-water and tile eviction tests.
5. Fault-inject OPFS journal interruption.
6. Only then narrow Tile Size, Worker placement and persistence cadence candidates.
