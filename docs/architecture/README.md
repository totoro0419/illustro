# Illustro Architecture

> Current baseline: **v0.2 — Performance-first, accepted for prototyping**  
> Date: 2026-09-27

## Read first

1. [Architecture Overview](ARCHITECTURE_OVERVIEW.md)
2. [Integration Validation](INTEGRATION_VALIDATION.md)
3. [Performance-First Policy](PERFORMANCE_POLICY.md)
4. [Performance Audit 2026-09-27](PERFORMANCE_AUDIT_2026-09-27.md)
5. [Device Compatibility Audit](DEVICE_COMPATIBILITY_AUDIT_2026-09-27.md)
6. [Device Test Matrix](DEVICE_TEST_MATRIX.md)

## Architecture decisions

1. [ADR-0001 — Document / Layer Data Model](ADR-0001-document-layer-model.md)
2. [ADR-0002 — Tile Canvas / Render Pipeline](ADR-0002-tile-render-pipeline.md)
3. [ADR-0003 — Command / Undo / Redo / Snapshot](ADR-0003-history-command-snapshot.md)
4. [ADR-0004 — Input / Brush Engine](ADR-0004-input-brush-engine.md)
5. [ADR-0005 — Lineart Region System](ADR-0005-lineart-region.md)
6. [ADR-0006 — Color Pipeline / ICC](ADR-0006-color-pipeline.md)
7. [ADR-0007 — Selection / Transform / Effects](ADR-0007-selection-transform-effects.md)
8. [ADR-0008 — .illustro / Autosave / Recovery](ADR-0008-persistence-recovery.md)
9. [ADR-0009 — Integrated Runtime / Scheduling](ADR-0009-integrated-runtime.md)
10. [ADR-0010 — Device Capability Adaptation](ADR-0010-device-capability-adaptation.md)

## Decision rules

Architecture work must follow:

- [Product Specification](../PRODUCT_SPEC.md)
- [Feature Specification](../FEATURE_SPEC.md)
- [Legacy Reference Policy](../LEGACY_REFERENCE_POLICY.md)

The legacy file `ILLUSTRO_SECTION9_ALGORITHM_REVIEW_DRAFT(2).txt` is a reference, not a Source of Truth.

## What is fixed at v0.1

- stable entity IDs + immutable document revisions
- sparse/tiled raster architecture
- GPU resources are derived caches, not artwork authority
- Revision-based Undo/Redo
- explicit separation of Undo / Snapshot / Layer Comp / Save / Recovery / Timelapse
- normalized Pointer input → reconstructed stroke → brush semantics
- reproducible committed random processing
- Lineart Evidence → Boundary → Topology → Region → Stable Identity
- Selection and Region are separate concepts
- engine-managed color pipeline with ICC-aware architecture
- non-destructive transform/effect model
- OPFS working store separated from portable `.illustro`
- WebGPU is the initial GPU prototype path with lazy compatibility fallback; final runtime/backend remains benchmark-driven
- performance-driven module placement; TypeScript/WASM boundaries are benchmarked, not ideology-fixed
- role-based ownership; physical Main/Worker placement is benchmark-driven
- Offline-first core editing

- inactive features must impose near-zero recurring runtime cost; advanced modules are lazy where practical

## What is deliberately NOT fixed yet

These require prototypes/benchmarks:

- tile size
- worker pool size
- queue sizes/deadlines
- brush resampling/stabilizer constants
- PRNG implementation
- raster sealing numeric strategy
- cache budgets
- ICC engine/library
- exact blend formulas
- Region matching weights/thresholds
- gap thresholds
- persistence block size
- metadata codec/compression/hash
- recovery cadence
- exact .illustro physical layout
- PSD implementation strategy

## Next gate

Before production editor implementation, execute the P0 architecture prototypes listed in [Integration Validation](INTEGRATION_VALIDATION.md).
