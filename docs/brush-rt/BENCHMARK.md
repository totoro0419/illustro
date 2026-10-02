# Benchmark protocol and measured failures

Three evidence levels remain distinct:

1. Node geometry/scheduling simulation:180s × sizes16/128/512/1024 × rates60/120/240/480. All actual input is retained, local fit is bounded and mailbox capacity is one. No raster GPU/physical latency result.
2. Browser software-GPU wall-clock trial: sizes16/128/512/1024 × rates60/120/240 on2048×1536, four seconds each; intentional formal stall;180s wide continuous stroke. Twelve shape cases and active/final pixel tests are separate. Report actual duration/input count, generator lateness and viewport/document dimensions.
3. Real GPU/stylus: UNVERIFIED. Same device/canvas/brush/correction/motion is required for ibis/CSP comparison. Film the initial/final seconds if possible.

The primary software gate compares first/last1s p95 GPU-completion input age: end minus start ≤20ms with samples in both windows. This is `PASS_PROXY`, never physical PASS. Large absolute age remains unacceptable even if growth is small; missing end samples fail. Timestamp generation lateness is reported separately, without rewriting old input as fresh input.

## Results actually observed

| Run / document | Selected measurement | Verdict |
|---|---|---|
|37034137600 /512×384 | WebGL2 512px240Hz:81.7→952.3ms;1024px240Hz:79.3→954.0ms | FAIL; long-run confirmed drain timed out |
|37040087180 /2048×1536 | WebGPU16px240Hz:273.3→824.7ms; wide matrix incomplete after drain timeout | FAIL |
|37043019906 /2048×1536 | WebGL2 16px240Hz:71.4→70.4ms;512px240Hz:184.8→2035.1ms | Narrow proxy growth pass, wide FAIL |
|37043019906 /2048×1536 | WebGPU1024px240Hz:474.8→10281.7ms, actual test duration10810.8ms | FAIL; software workload also starved the input generator |

These failed candidates motivate incremental readiness, exact no-op elision, instanced confirmed solids, dirty composition and scissored prefix coverage. Subsequent source changes are not counted as performance success until executed. Per-run JSON summaries are retained in `evidence`.

Run:

```sh
node prototypes/brush-rt/build.mjs
node --test packages/brush-rt/test/*.test.mjs
RT_PLAYWRIGHT_PATH=/path/to/playwright RT_LONG_TEST=1 node prototypes/brush-rt/browser-check.mjs
```

`RT_BACKEND=webgl2` or `webgpu` selects one backend. CI runs both as independent jobs and preserves failures. Backend metadata keeps hardwareVerified=false. Pointer API availability and observed predicted samples are distinct; synthesized test prediction is not real pen prediction.

A formal chunk remains one128px tile and up to16 commands;1–8 ordinary chunks per GPU batch follow live feedback. Exact covered-tile no-ops can be consumed without GPU deposition. This work bound cannot promise arbitrary hardware milliseconds or GPU preemption.
