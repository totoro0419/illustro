# Illustro P0 Architecture Prototype

This is a deliberately minimal, non-product UI benchmark harness.

## Goals

- Compare main-thread vs worker/offscreen input/render path.
- Measure input-to-visible scheduling latency.
- Sweep sparse logical tile sizes without fixing a production value.
- Exercise revision-head Undo/Redo semantics.
- Exercise OPFS journal writes with memory fallback.

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
illustroPrototype.metrics.summary('input-to-raf')
illustroPrototype.metrics.summary('main-to-worker-complete')
```

## Non-goals

- Product UI
- production brush rendering
- production .illustro format
- fixed tile size
- fixed worker topology
- claiming performance targets before target-device measurements
