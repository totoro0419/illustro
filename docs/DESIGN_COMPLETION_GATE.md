# Illustro Design Completion Gate

> Status: **CORE V2 DESIGN READY FOR USER REVIEW — PRODUCTION LOCKED**
> Date: 2026-09-28
> Purpose: Architecture readiness, feature benchmark readiness, UI approval and Production authorizationを混同しないためのGate。

## 1. Current interpretation

Architecture V1は技術基盤の実現可能性を検証した。

Architecture V2は、その後に残ったCross-cutting Core semanticsを設計完了させた現在のBaseline。

しかし以下は別状態として扱う。

- Architecture / semantic design complete
- feature-specific benchmark complete
- visual UI approved
- Production implementation authorized

Production Vertical Slice 001は既存の暫定実装基盤。

Vertical Slice 002以降は、ユーザーが明示的に許可するまで開始しない。

## 2. Canonical V2 design package

Current Core design authority:

- [Architecture V2](architecture/ARCHITECTURE_V2.md)
- [Identity / Operation / Revision V2](architecture/IDENTITY_OPERATION_REVISION_V2.md)
- [Canonical Raster V2](architecture/CANONICAL_RASTER_V2.md)
- [Brush ↔ Raster ↔ Renderer V2](architecture/BRUSH_RENDER_CONTRACT_V2.md)
- [Persistence / Recovery Logical V2](architecture/PERSISTENCE_RECOVERY_LOGICAL_V2.md)
- [Shared Region Resolver V2](architecture/REGION_RESOLVER_V2.md)
- [Core Slice 001 Final Disposition](implementation/CORE_SLICE_001_FINAL_DISPOSITION.md)
- [Design Completion Re-evaluation](DESIGN_COMPLETION_REEVALUATION_2026-09-28.md)

Architecture V1 and its prototype/CI evidence remain technical evidence. Where V1 semantics conflict with V2, V2 wins.

## 3. Global principles

- Canvas First / Direct Manipulation
- Creation Proximity
- PiP / Detachable Workspace
- Brush Engine First
- Quick Controller / Spatial Memory
- Lineart / Region as a core differentiator
- Shared Region Resolver
- Confidence / Ambiguity
- Live Preview / Non-destructive
- Undo / History / Save / Recovery separation
- Canonical State / Cache separation
- Tile / Partial Update / Bounded Work
- Offline First
- Device-specific UI
- Existing-app research before needless reinvention
- Legacy reference as Reference Only

Canonical doctrine: `REDESIGN_PRINCIPLES.md`.

## 4. Subsystem readiness rule

A Production subsystem may move from design to implementation only when all items material to that subsystem are complete:

1. Problem statement
2. User-facing semantics
3. Interaction lifecycle
4. Data / canonical semantics
5. Undo / History boundary
6. Save / Recovery implications
7. Failure / conflict / ambiguity behavior
8. Performance hot-path contract
9. Device behavior
10. Creation-Proximity implications
11. Legacy reference comparison where applicable
12. Competitor research where materially useful
13. Acceptance criteria
14. Required Prototype/Benchmark gate
15. Explicit user authorization

UI-bearing subsystems additionally require user co-design and dedicated UI Design Skill.

## 5. Cross-cutting Core Gate A

### Status: **COMPLETE**

Resolved:

- Identity taxonomy
- Canonical Raster pixel/alpha/precision/Tile/coordinate model
- Semantic Operation / Transaction / Revision contract
- Persistence / Recovery dependency-closure and acknowledgement model
- UI-to-Core semantic Command boundary
- Slice 001 Retain/Modify/Replace disposition
- Architecture V1/V2 authority relationship

These no longer need to be invented during Production implementation.

## 6. Brush Gate B

### Semantic design: **COMPLETE**
### Prototype/benchmark calibration: **PENDING**

Before Brush Production implementation, the benchmark harness must select/verify:

- default stabilization/reconstruction coefficients
- mutable-tail budgets
- preview tolerance
- materialization admission limits
- supported-device latency/memory profile

Mandatory properties and corpus are defined in `architecture/BRUSH_RENDER_CONTRACT_V2.md`.

## 7. Region / Fill Gate C

### Semantic design: **COMPLETE**
### Corpus calibration: **PENDING**

Before Region/Fill Production implementation, benchmark:

- evidence thresholds
- gap/bridge thresholds
- confidence/margin thresholds
- candidate/update budgets

Mandatory corpus and semantic pass properties are defined in `architecture/REGION_RESOLVER_V2.md`.

## 8. Persistence / native-file Gate D

### Logical semantics: **COMPLETE**
### Physical encoding: **PENDING BEFORE PRODUCTION PERSISTENCE/NATIVE FILE**

Before Production portable `.illustro` / final Recovery storage:

- metadata encoding
- block/chunk layout
- physical integrity framing
- compression
- index/directory
- unknown-field preservation
- compatibility/salvage encoding

must be reviewed independently.

The Library Section 9 draft is reference-only.

## 9. UI Gate E

### Status: **USER DECISION PENDING**

Not formally adopted yet:

- PiP / Detachable Workspace concrete form
- Quick Controller geometry/form
- Panel layout
- Color UI
- Brush Settings UI
- Desktop / Tablet / Smartphone concrete layout
- icons / hierarchy / theme / Canvas presentation

Core V2 only fixes the capabilities these UIs may call.

Visual prototyping must use the dedicated UI Design Skill.

## 10. Production authorization Gate F

### Status: **LOCKED**

> **Production implementation remains stopped after Vertical Slice 001. Vertical Slice 002 and later Production changes are not authorized.**

Passing Gate A or a feature benchmark does not automatically unlock Production.

Production resumes only after the user explicitly authorizes the intended implementation scope.

## 11. Safe deferral rule

The following may remain feature-local and do not block unrelated Core work:

- Wet Media final simulation
- deep Vector/Text details
- advanced Effect/Filter catalog
- Healing/Patch/Clone details
- Macro editor
- Asset/Navigator/Work Time UI
- PSD mapping
- plugin runtime
- collaboration protocol
- exact cache/worker/scheduler numeric budgets
- visual theme/iconography

They still require their own subsystem gate before implementation.

## 12. Current label

The correct project phase is:

> **CORE V2 DESIGN READY FOR USER REVIEW / BENCHMARK PHASE AVAILABLE / PRODUCTION LOCKED**

