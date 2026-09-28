# Illustro V2 Brush / Region Validation Prototype

> Status: non-Production validation harness
> Date: 2026-09-28
> Production code dependency: none

This prototype validates the benchmark gates defined by Architecture V2 without changing `packages/core`.

## Scope

### Brush

- reconstruction candidate calibration
- Philox4x32-10 known-answer and order-invariance tests
- semantic record / predicted-input isolation
- strict replay / reopen determinism
- Zoom and Tile traversal independence
- Preview F32 vs strict canonical tolerance
- Stable Prefix / Mutable Tail bounded release work
- long-stroke streaming/backpressure accounting
- Airbrush time-exposure event-rate independence
- source/selection/mixing dependency capture
- derived renderer loss/recreate
- reference hot-path and materialization replay measurements

### Region

- labeled synthetic/adversarial corpus
- Evidence / gap / confidence calibration
- one-to-one / split / merge / delete-create / transform / redraw / ambiguity transitions
- conflicting assignment ambiguity
- user-pinned boundary preservation
- stale generation rejection
- fixed-source immutability
- incremental vs full topology equivalence
- reference background-work measurements

## Run

```bash
npm test
npm run benchmark
npm run check
```

Benchmark JSON is written to `results/benchmark-2026-09-28.json`.

## Important interpretation

The Node benchmark environment is a **reference execution environment**, not a PC/Tablet/Smartphone support claim.

The Region corpus is fully labeled but synthetic. It can validate algorithmic semantics and regression behavior; it cannot substitute for a representative real-artwork corpus when production thresholds are frozen.

See:

- `docs/benchmarks/BRUSH_V2_BENCHMARK_2026-09-28.md`
- `docs/benchmarks/REGION_V2_BENCHMARK_2026-09-28.md`
- `docs/V2_VALIDATION_REEVALUATION_2026-09-28.md`
