# Illustro realtime brush candidate v2

New implementation built after primary-source research. Production is **not promoted**; see VALIDATION.md for all open gates and candidate limits.

- [Research](RESEARCH.md) — documented facts, design judgments, unknown internals.
- [Architecture](ARCHITECTURE.md) — multi-option comparison and chosen input/preview/canonical/tile/history split.
- [Failure analysis](FAILURE_ANALYSIS.md) — old CPU/GPU code findings and failed new iterations.
- [Benchmark](BENCHMARK.md) — distinct simulation/GPU-proxy/physical stages.
- [Validation](VALIDATION.md) — independently executed results and remaining gates.
- [Competitor comparison](COMPETITOR_COMPARISON.md).

Implementation: `packages/brush-rt/src`. Interactive source/build/test runner: `prototypes/brush-rt`.

Self-contained human test file: `prototypes/brush-rt/dist/illustro-brush-rt.html`. Download and open it in a modern browser. It includes all56 unchanged preset configurations. WebGPU preferred; explicit WebGL2 alternative. Raw/coalesced inputs are selected without treating both movement streams as separate physical input. Predictions remain transient.

Input/record and rendering use separate interfaces. Reference pixel loops and Canvas2D image transfer exist only in comparison/export functions, never in the live frame/input path. The current product/core adapter is not implemented by this candidate.

The dedicated workflow preserves existing P0 architecture Pages content and adds `/brush-rt/` as a labeled candidate, with failed evidence retained. Do not merge/promote based solely on its Node tests.
