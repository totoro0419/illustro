# 4000px thin strokes: formal GPU work follow-up

Status: EXPERIMENTAL. Implementation and publication are subject to exact-source automated/browser gates. Physical Android performance and user acceptance remain unverified.

## Handoff and cause

Resume from PR29 head `417c02800332c73d491434e95b2efbb35068823c`, tree `71f23f3269c2b67ebfee1bb42ef9df2c175f5fc0`. PR28/25/23 and all additional color-wheel changes remain ancestors; no merge, branch replacement or UI redesign is performed. The earlier PR28-to-417 comparison is recorded in [the preceding research](THIN_STROKE_4000_2026-10-15.md) and [run38847557289](https://github.com/totoro0419/illustro/actions/runs/38847557289). This follow-up uses417 as its immutable comparison baseline.

Input reservation/ordered logical commit, latest live preview, formal GPU completion and Recovery are already separate in that baseline. The remaining delay is chiefly in completing/displaying GPU submissions in the measured software-GPU environment; this is not evidence of isolated hardware GPU time. A new local16px profile on417 used312 formal jobs and508 commands across four61-sample strokes. Solid coverage is already rasterized. Of2,555,904 full-tile compute pixels, geometric bounds would cover1,331,904, but reducing dispatch bounds would require preserving destination pixels and extra copies. That speculative shader/copy rewrite was not adopted.

Two concrete sources of avoidable formal work were instead found:

- A solid stroke/tile allocated **two**128² RGBA16F coverage images, while all solid deposition, commit and composition use slot0. Unlike deposited/pencil brushes, solid coverage never flips its index. The second image was never read or written after initialization.
- WebGPU begins and ends a separate compute pass for every formal commit dispatch. Batching these boundaries was tested and rejected: fewer API passes did not establish a reliable speed gain and the local16px burst median regressed1969.8→2076.0ms.

The canvas size does not directly alter128px tile dimensions. A stroke crossing a longer document-space path touches more tiles when fitting a4000px canvas into a small phone viewport. That increases formal allocation/dispatch work; multiplying full-canvas caches would not address this source.

## Implementation and correctness

Solid brushes now allocate one **unchanged RGBA16F** coverage image. Deposited/pencil/soft-erase brushes retain both **unchanged RGBA32F** ping-pong images. No artwork, coverage precision, shader, brush mathematics, actual sample, command, resolution, presentation sampler or canvas ownership changes.

Dispatch/pass boundaries, pipeline/bindings, history capture/copies and retirement after GPU completion remain unchanged on both backends. The final change is limited to removing the unused allocation; the experimental compute-pass batching is not included.

No additional cache is introduced. Existing preview256MiB, viewport32MiB and formal job/pixel/admission bounds remain unchanged. Runtime history defaults to16MiB; the inherited editor explicitly uses32MiB, or64MiB with a deviceMemory hint of at least8GiB. This follow-up changes none of those history budgets. Undo/Redo patches retain the same tile boundaries; saved Core/Recovery records, revisions, transactions and worker canonical records are untouched. Full replay remains the cold-history fallback.

Changed implementation: `packages/brush-rt/src/renderer.mjs` and its generated standalone prototype. The remaining changes are the baseline/evidence gates, comparison instrumentation, dedicated GPU equivalence test and this research record.

## Local measurements before exact-source CI

Same Chromium153/SwiftShader,390×844 CSS,DPR3, deviceMemory hint4,4000². Both builds run alternately before/after/after/before/before/after; three trials each. One warm-up stroke is excluded and recorded separately. Each trial retains four strokes/244 actual pen samples. The final allocation-only comparison below requests0ms between events to reduce the paced-input floor. Browser timer clamping and scheduling still affect actual input time; this is not an isolated GPU benchmark.

| Backend / width | Total median ms before → after | Settle median ms | CPU encoding total ms/trial | Formal targets/trial |
|---|---:|---:|---:|---:|
| WebGL2 /1px |1598.2 →1682.8|224.8 →240.4|334.0 →339.0|292 →146|
| WebGL2 /16px |1673.0 →1727.8|209.0 →246.0|358.5 →374.3|312 →156|
| WebGPU /1px |1883.3 →1881.3|782.7 →766.5|40.3 →39.7|291.3 →146|
| WebGPU /16px |2017.7 →1844.6|894.4 →734.5|44.5 →43.2|312 →156|

Solid formal allocation volume is halved:16px40,894,464→20,447,232bytes over four strokes, **not** an actual VRAM peak measurement. This lowers resource initialization/retirement churn without increasing any cache. The16px WebGPU local burst total improves8.6%, but WebGL2 totals/CPU regress in this sample. No uniform latency/60Hz success is inferred. Timing-dependent footprint/canonical spacing can vary slightly in the real-time1px input corpus; the separate fixed-time corpus below requires exact record/command/job conservation. Exact-source CI repeats both ordinary8ms/25ms input and burst loads and supersedes local timings.

## Reproducible gates and evidence

`scripts/formal-resource-quality.mjs` serves immutable417 and the candidate runtime in the same browser. Fixed actual samples, times and seeds cover all seven brush presets, forced fade, three surfaces, transparent overlap and erasing, hot Undo/Redo and full replay. All occupied strict tile pixels and canonical record hashes, formal job/command counts and compute-pass counts must be identical between builds on each backend. It observes actual arrays assigned to formal tile targets and real compute-pass creation, not just a predicted counter. It also requires no remaining coverage targets after completion and no renderer/session/browser errors. Local mixed-corpus result:204→116 formal targets on each backend, WebGPU130 compute passes unchanged,250jobs and all commands unchanged, all exact comparisons passed.

The CI comparison repeats1/2/4/8/16/32/64px at4000² with three balanced trials each,512×384/2048²/3000² scaling and256/512px controls. Additional1/16px burst comparisons request0ms between events to reduce the paced-input floor; browser timer clamps and actual elapsed input time remain recorded. These synthetic events are not physical touch-to-photon measurements.

The normal Home flow also creates4000² through visible controls, draws trusted1/4/16px finger strokes, cancels a stroke into a two-finger gesture and performs three consecutive touch Undo/Redo operations on each backend. Repeat all prior four-size/three-layer/seven-brush quality, heavy-area, viewport/direct-cache equality,4000px history, pressure retention, save/Recovery and trusted finger/two-finger regressions.1100-short and100-long completion tests explicitly pace admission at the existing bounds and report all waits. The separate fixed offered200-stroke load reports capacity refusals; it cannot silently retry or discard accepted input. All queues must drain to zero, every accepted record/sample must be conserved and Recovery protection must catch up.

Publish only `/qa/perf-thin-stroke4000/` after all gates; checksum every other QA file, then verify exact-source drawing, immediate history and save on public Pages. Preserve the previous417 summary in `evidence/prior-417/` when present. Final numeric evidence is `evidence/qa-status.json` with the exact source and baseline SHAs; CI results supersede local timings. Physical Android/pen, isolated GPU execution, actual RSS/VRAM, scanout and thermal/power behavior remain unmeasured.

## Primary technical references

- [GPUComputePassEncoder](https://gpuweb.github.io/types/interfaces/GPUComputePassEncoder.html): pipeline/bind-group state applies to subsequent ordered dispatch commands; end the pass before returning to command-encoder work.
- [GPUCommandEncoder](https://gpuweb.github.io/types/interfaces/GPUCommandEncoder.html): explicit compute/render passes and texture-copy encoding.
- [WebGPU specification](https://www.w3.org/TR/webgpu/): compute resource usage is validated per dispatch. No competitor's unpublished renderer behavior is assumed.
- [WebGL2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/): existing color-buffer and framebuffer operations are preserved.
