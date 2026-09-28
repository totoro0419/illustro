# Illustro Architecture

> Current semantic baseline: **Architecture V2 — Design Complete for Review**  
> Production status: **Locked after Vertical Slice 001**  
> Date: 2026-09-28

## Read first

1. [Architecture V2](ARCHITECTURE_V2.md)
2. [Identity / Operation / Revision V2](IDENTITY_OPERATION_REVISION_V2.md)
3. [Canonical Raster V2](CANONICAL_RASTER_V2.md)
4. [Brush ↔ Raster ↔ Renderer V2](BRUSH_RENDER_CONTRACT_V2.md)
5. [Persistence / Recovery Logical V2](PERSISTENCE_RECOVERY_LOGICAL_V2.md)
6. [Shared Region Resolver V2](REGION_RESOLVER_V2.md)
7. [Design Completion Gate](../DESIGN_COMPLETION_GATE.md)
8. [Performance-First Policy](PERFORMANCE_POLICY.md)
9. [Device Capability Adaptation](ADR-0010-device-capability-adaptation.md)

## V1 evidence

Architecture V1 remains technical/prototype evidence:

- [Architecture V1](ARCHITECTURE_V1.md)
- [V1 Promotion Gate](V1_PROMOTION_GATE.md)
- [V1 Second Audit Evidence](V1_SECOND_AUDIT_EVIDENCE.md)
- [Integration Validation](INTEGRATION_VALIDATION.md)
- [P0 Architecture Prototype](../prototypes/P0_ARCHITECTURE_PROTOTYPE.md)

Where V1 design semantics conflict with Architecture V2, **V2 is authoritative**.

## Existing ADRs

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

These ADRs remain useful detail/evidence. V2 contracts supersede conflicting older details.

## V2 fixed cross-cutting decisions

- UUID stable Entity/Transaction/Revision/Block identity
- runtime handles separated from durable identity
- SHA-256 content digest separated from operation identity
- one Transaction → one immutable Revision
- semantic versioned operations
- signed sparse Raster / off-canvas retention
- canonical logical Tile = 256
- adaptive sub-tile execution/physical subdivision
- Raster Surface precision = UNORM8 / UNORM16 / FLOAT32
- canonical straight alpha + hidden RGB
- Brush actual/predicted separation
- semantic Brush stroke record
- counter-based Philox4x32-10 Brush random
- bounded Stable Prefix / Mutable Tail
- GPU/Renderer as Derived state
- WriterEpoch + CommitSequence Recovery ordering
- transitive dependency-closed Protection
- fixed-source Fill/Selection vs explicit Live Region binding
- Shared Region Resolver confidence/ambiguity and lineage rules
- Slice 001 final Retain/Modify/Replace disposition

## Still benchmark/feature/UI gated

These are not missing Cross-cutting semantics:

- Brush stabilizer/tail/preview numerical calibration
- Region threshold/margin calibration
- ICC implementation/library and exact compatibility formulas
- runtime cache/worker/deadline values
- physical .illustro encoding
- advanced feature details
- PiP / Quick Controller / Panel / Color / Brush Settings visual design
- per-device concrete layout
- plugin/collaboration protocol

## Production rule

Architecture V2 completion does not authorize implementation.

Vertical Slice 002 and later Production changes require explicit user authorization.

