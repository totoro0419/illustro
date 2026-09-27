# Illustro P0 Architecture Prototype

This is a deliberately minimal, non-product UI benchmark harness.

## Goals

- Compare main-thread vs worker/offscreen input/render path.
- Measure input scheduling and next-frame timing without claiming final display latency.
- Sweep sparse logical tile sizes without fixing a production value.
- Exercise revision-head Undo/Redo semantics.
- Exercise OPFS journal writes with memory fallback.
- Detect input-lifecycle mistakes such as hover drawing, multiple-pointer ownership, and cross-stroke continuation.

## Run

```bash
npm install
npm run test
npm run build
npm run dev
```

Main-thread path:

`http://localhost:5173/?input=main`

Worker/OffscreenCanvas path:

`http://localhost:5173/?input=worker`

## Console API

```js
illustroPrototype.tileSweep()
illustroPrototype.runHistoryBenchmark()
await illustroPrototype.runPersistenceBenchmark()

// Main path: event-handler start → next main-thread RAF callback.
// This is not a guaranteed physical display-latency measurement.
illustroPrototype.metrics.summary('input-to-raf')

// Worker path: main postMessage → worker draw-complete acknowledgement.
illustroPrototype.metrics.summary('worker-roundtrip')

// Worker path: same start → next main-thread RAF after acknowledgement.
// This is still a scheduling proxy, not proof of scan-out latency.
illustroPrototype.metrics.summary('worker-to-next-raf')
```

## Input lifecycle invariants

- No stroke starts from hover/move alone.
- Exactly one pointer owns the active stroke.
- Pointer cancel/lost capture ends ownership.
- Separate strokes do not reuse the previous stroke tail.
- Worker and main paths use the same logical stroke lifecycle.
- Worker canvas uses the same CSS-coordinate/DPR mapping as the main path.

## Non-goals

- Product UI
- production brush rendering
- production .illustro format
- fixed tile size
- fixed worker topology
- claiming performance targets before target-device measurements
