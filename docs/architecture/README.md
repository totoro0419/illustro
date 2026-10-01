# Illustro Architecture

> Current baseline: **v1 — Confirmed for Core implementation**  
> Date: 2026-09-28

## Read first

1. [Architecture V1](ARCHITECTURE_V1.md)
2. [V1 Promotion Gate](V1_PROMOTION_GATE.md)
3. [V1 Second Audit Evidence](V1_SECOND_AUDIT_EVIDENCE.md)
4. [Architecture Overview](ARCHITECTURE_OVERVIEW.md)
5. [Integration Validation](INTEGRATION_VALIDATION.md)
6. [Performance-First Policy](PERFORMANCE_POLICY.md)
7. [Device Capability Adaptation](ADR-0010-device-capability-adaptation.md)

Historical prototype/audit records remain available:

- [V1 First PASS Evidence](V1_FIRST_PASS_EVIDENCE.md)
- [P0 Architecture Prototype](../prototypes/P0_ARCHITECTURE_PROTOTYPE.md)
- [Performance Audit 2026-09-27](PERFORMANCE_AUDIT_2026-09-27.md)
- [Device Compatibility Audit](DEVICE_COMPATIBILITY_AUDIT_2026-09-27.md)
- [Device Test Matrix](DEVICE_TEST_MATRIX.md)

## Architecture decisions

1. [ADR-0001 — Document / Layer Data Model](ADR-0001-document-layer-model.md)
2. [ADR-0002 — Tile Canvas / Render Pipeline](ADR-0002-tile-render-pipeline.md)
3. [ADR-0003 — Command / Undo / Redo / Snapshot](ADR-0003-history-command-snapshot.md)
4. [ADR-0004 — Input / Brush Engine](ADR-0004-input-brush-engine.md)
5. Lineart Layer — **no active ADR; design reset / pending redesign**
6. [ADR-0006 — Color Pipeline / ICC](ADR-0006-color-pipeline.md)
7. [ADR-0007 — Selection / Transform / Effects](ADR-0007-selection-transform-effects.md)
8. [ADR-0008 — .illustro / Autosave / Recovery](ADR-0008-persistence-recovery.md)
9. [ADR-0009 — Integrated Runtime / Scheduling](ADR-0009-integrated-runtime.md)
10. [ADR-0010 — Device Capability Adaptation](ADR-0010-device-capability-adaptation.md)

## Decision rules

Architecture work follows:

- [Product Specification](../PRODUCT_SPEC.md)
- [Feature Specification](../FEATURE_SPEC.md)
- [Performance-First Policy](PERFORMANCE_POLICY.md)
- [Legacy Reference Policy](../LEGACY_REFERENCE_POLICY.md)

The legacy file \`ILLUSTRO_SECTION9_ALGORITHM_REVIEW_DRAFT(2).txt\` is reference material, not a Source of Truth.

## Fixed in Architecture V1

- stable entity IDs + immutable published revisions
- mutable active interaction / immutable published state
- sparse/tiled Raster architecture
- **256 logical-pixel standard Tile profile**
- **128 logical-pixel memory-constrained candidate**
- local dirty-subrect propagation
- ownership-transfer Canonical Raster sealing without avoidable second full-tile copy
- Revision-based Undo/Redo
- GPU resources are Derived state, never artwork authority
- render backend order: WebGPU → WebGL2 → Canvas2D/CPU compatibility
- Main Thread default for pointer/stroke coordination
- Dedicated Persistence Worker
- bounded utility Worker lanes for heavy/background work
- OPFS working store + framed/batched Recovery journal
- invalid/torn journal tail truncation before resumed append
- first-draw critical path excludes inactive advanced modules
- TypeScript default; WASM only where representative heavy-kernel measurement justifies it
- Offline-first Core editing
- inactive advanced features should have near-zero recurring cost

## Deliberately not fixed yet

These do **not** block Core implementation.

- final per-device memory/cache budgets
- 128↔256 Tile profile switch threshold
- worker pool size / queue deadlines
- brush resampling/stabilizer constants
- PRNG implementation
- Lineart Layer extraction / connection / representation decisions
- ICC engine/library
- exact blend compatibility formulas
- persistence batch timing/size calibration
- portable .illustro physical encoding/compression/hash
- PSD mapping
- representative heavy-kernel TS/WASM placement
- advanced-feature interaction details
- visual UI design

## Implementation gate

The five pre-implementation Architecture gates passed and were then re-audited.

- First PASS: GitHub Actions run \`36334997832\`
- Second PASS after corrective audit: run \`36335428192\`
- Second PASS: **29 unit tests / 12 files + 4 served-browser tests**
- strict TypeScript and production build: PASS

**Core implementation may begin under Architecture V1.**

This is not a claim that final product performance, all-device support, or visual UI design is complete.
