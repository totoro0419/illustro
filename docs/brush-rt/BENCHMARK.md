# Benchmark definitions

There are three separate evidence levels:

1. Node scheduling/geometry tests (`evidence/node-tests.txt`): synthetic clocks, no raster GPU. 180s × four sizes × four rates. No physical latency result.
2. Browser software GPU benchmark (`evidence/browser-results.json` when produced): 4 wall-clock seconds × sizes16/128/512/1024 × rates60/120/240; 5s intentional confirmed stall; 180s high-frequency wide stroke. Start/end p95 **GPU completion input age** and its growth, current raw-to-preview distance, oldest confirmed work age, obsolete previews, confirmed lag. Threshold: end minus initial p95 ≤20ms; results are `PASS_PROXY` or `FAIL_OR_INSUFFICIENT`, never physical PASS. A long absolute age can still be unacceptable even with no growth.
3. Real GPU/stylus: UNVERIFIED. Requires user trial and preferably filmed frame-by-frame tip tracking. Compare same device, canvas, brush, correction and motion. Headless Chromium/SwiftShader is not an ibis/CSP competitor benchmark.

`renderer.info.hardwareVerified` stays false. API support and observed browser predicted sample count are recorded separately. JS PointerEvent synthesis does not prove that a real browser supplies prediction for a physical stylus.

Run:

```
node prototypes/brush-rt/build.mjs
node --test packages/brush-rt/test/*.test.mjs
RT_PLAYWRIGHT_PATH=/path/to/playwright RT_LONG_TEST=1 node prototypes/brush-rt/browser-check.mjs
```

Canonical queues are preserved; preview mailbox capacity is one, with at most one submitted GPU batch. A confirmed job is one128px tile × up to16commands. Between1and8 such jobs are submitted after live drawing, adjusted by the previous completion proxy. This controller bounds work; it cannot guarantee arbitrary hardware execution time. Queue age for confirmed work is displayed openly and is not mislabeled as preview queue age.
