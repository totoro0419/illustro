# Illustro realtime brush candidate v2

New implementation built after primary-source research. Earlier GPU-proxy trials failed; fixes are being tested and are recorded rather than presented as success. Production is **not promoted**; see VALIDATION.md for all open gates and candidate limits.

- [Research](RESEARCH.md) — documented facts, design judgments, unknown internals.
- [Architecture](ARCHITECTURE.md) — multi-option comparison and chosen input/preview/canonical/tile/history split.
- [Failure analysis](FAILURE_ANALYSIS.md) — old CPU/GPU code findings and failed new iterations.
- [Benchmark](BENCHMARK.md) — distinct simulation/GPU-proxy/physical stages.
- [Validation](VALIDATION.md) — independently executed results and remaining gates.
- [Competitor comparison](COMPETITOR_COMPARISON.md).

Implementation: `packages/brush-rt/src`. Interactive source/build/test runner: `prototypes/brush-rt`.

Self-contained human test file: `prototypes/brush-rt/dist/illustro-brush-rt.html`. Download and open it in a modern browser. It includes all 56 unchanged preset configurations. WebGPU preferred; explicit WebGL2 alternative. Raw/coalesced inputs are selected without treating both movement streams as separate physical input. Predictions remain transient.

Input/record and rendering use separate interfaces. Reference pixel loops and Canvas2D image transfer exist only in comparison/export functions, never in the live frame/input path. The current product/core adapter is not implemented by this candidate.

The dedicated workflow preserves failed and successful evidence as downloadable artifacts. Candidate-branch Pages deployment is prohibited by existing protection rules, which remain intact. Do not merge/promote based solely on its Node tests.

Package integration (build first):

```js
import {GpuRenderer,RealtimeSession} from '@illustro/brush-rt';
const renderer=await GpuRenderer.create(canvas,2048,1536,'auto');
const session=new RealtimeSession(renderer); // module worker bundled with generated package
function frame(now){session.frame(now);requestAnimationFrame(frame);}
requestAnimationFrame(frame);
// begin(preset), accept(realSample), predictions(displayOnlySamples), end()
// export()/load() keep canonical sensors/preset/seed; renderer.read() waits final tiles.
```

`npm run build --workspace=@illustro/brush-rt` generates package modules and the standalone HTML. Type declarations document the v2.2 record and GPU-completion metric. The exported session owns one tile document; a multi-layer Illustro core adapter remains open.
