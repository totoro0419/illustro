# Illustro Design Completion Re-evaluation — 2026-09-28

> Status: **COMPLETE — Core V2 design package ready for user review**
> Production state: **LOCKED after Vertical Slice 001**
> Purpose: re-evaluate the 24 design areas after completing the V2 cross-cutting contracts.

## 1. Result

The eight-item design-completion work package is complete:

1. Core Semantic Foundation — complete
2. Canonical Raster — complete
3. Brush / Renderer connecting contract — semantic design complete
4. Persistence / Recovery logical model — complete
5. Shared Region Resolver boundary — semantic design complete
6. Slice 001 final re-audit — complete
7. Architecture V2 integration — complete
8. Design Gate re-evaluation — this document

This does not mean every future feature is fully designed.

It means the cross-cutting decisions that would otherwise force expensive Core rework are now explicit and internally coherent.

## 2. 24-area status after V2

| # | Area | Re-evaluated status | Remaining gate |
|---|---|---|---|
| 1 | Product理念 | **確定** | none for Core re-entry |
| 2 | User workflow | **仮決定** | advanced feature workflows remain feature-local; concrete UI requires user review |
| 3 | Interaction model | **仮決定** | concrete visual surfaces/layout remain user-owned |
| 4 | Document model | **確定 for Core V2** | feature-specific entity payloads before those features |
| 5 | Raster | **確定 for Core V2** | performance verification during V2 implementation; semantics closed |
| 6 | Brush Engine | **Semantic contract確定 / Prototype benchmark待ち** | select/calibrate stabilizer, tail budgets, preview tolerance before Brush Production |
| 7 | Renderer | **Core contract確定 / backend performance validation待ち** | production backend measurements; semantic boundary closed |
| 8 | Layer system | **仮決定** | full schemas for Group/Vector/Text/Mask/Adjustment/Filter before those feature implementations |
| 9 | Selection / Transform | **仮決定, shared boundaries確定** | resampler/advanced transform feature benchmark and detailed interaction |
| 10 | Color | **Core boundary確定 / ICC implementation待ち / UI判断待ち** | ICC library/formulas + color UI before relevant implementation |
| 11 | Fill / Region / Lineart | **Semantic contract確定 / corpus benchmark待ち** | resolver thresholds/weights before Region/Fill Production |
| 12 | Reference | **仮決定 / UI判断待ち** | concrete detachable/workspace behavior |
| 13 | History / Snapshot | **Core semantics確定** | retention numeric policy and advanced branch UI can be later |
| 14 | Persistence / Recovery | **Logical contract確定** | physical journal/container encoding before Production persistence/file implementation |
| 15 | File format | **Logical boundary確定 / physical encoding未確定** | physical .illustro container before native-file Production |
| 16 | Non-destructive effects | **仮決定** | feature schemas/kernels/UI before feature implementation |
| 17 | Automation | **仮決定** | Macro editor/record interaction before feature implementation |
| 18 | Input / Shortcut / Gesture | **Core input semantics確定 / UI customization待ち** | gesture/binding UI; Brush benchmark |
| 19 | Device adaptation | **Core semantics確定 / UI判断待ち / device validation待ち** | concrete layouts and support validation |
| 20 | Workspace / PiP | **User UI decision待ち / Prototype比較待ち** | visual/interaction prototype + user decision |
| 21 | Quick Controller | **User UI decision待ち / Prototype比較待ち** | visual/interaction prototype + user decision |
| 22 | Performance | **Policy確定 / feature benchmark待ち** | measured values, not architecture semantics |
| 23 | Extensibility / future collaboration | **Boundary確定 / full protocolは実装後でよい** | plugin/collaboration design later |
| 24 | UI-dependent unresolved | **User UI decision待ち** | user co-design with dedicated UI Design Skill |

## 3. Global cross-cutting gate status

The previous Gate A items are now resolved as follows.

### A1 Specification/phase coherence — COMPLETE

Architecture V2 is the current semantic design baseline.

Architecture V1 is retained as feasibility/prototype evidence.

Production authorization is explicitly separate.

### A2 Identity taxonomy — COMPLETE

Defined in `architecture/IDENTITY_OPERATION_REVISION_V2.md`.

Stable identity, runtime handles, content digests and commit ordering are separated.

### A3 Canonical Raster — COMPLETE

Defined in `architecture/CANONICAL_RASTER_V2.md`.

Resolved:

- signed overscan;
- fixed canonical 256 tile;
- adaptive execution subdivision;
- UNORM8/UNORM16/FLOAT32 Surface precision;
- straight alpha/hidden RGB;
- sparse defaults;
- bounded materialization.

### A4 Operation / Transaction / Revision — COMPLETE

Defined in `architecture/IDENTITY_OPERATION_REVISION_V2.md`.

Typed semantic operations replace low-information tile-count summaries as the future canonical operation direction.

### A5 Persistence / Recovery logical contract — COMPLETE

Defined in `architecture/PERSISTENCE_RECOVERY_LOGICAL_V2.md`.

Resolved:

- WriterEpoch;
- CommitSequence;
- dependency closure;
- Protected/Saved/Recovered/Dirty;
- handoff vs acknowledgement;
- concurrent writer isolation.

### A6 UI ↔ Core boundary — COMPLETE

Architecture V2 requires the same semantic Command regardless of Toolbar, Search, Quick Controller, Context UI, PiP/detached UI, Shortcut or Gesture.

Concrete UI form is intentionally not fixed.

### A7 Slice 001 disposition — COMPLETE

Defined in `implementation/CORE_SLICE_001_FINAL_DISPOSITION.md`.

Each requested foundation item has a final Retain/Modify/Replace decision.

### A8 Explicit user authorization — PENDING BY DESIGN

This cannot be auto-completed by documentation.

Only the user can authorize Production implementation.

## 4. Brush Gate B status

### Semantic design — COMPLETE

Closed by `architecture/BRUSH_RENDER_CONTRACT_V2.md`:

- normalized sample schema;
- receive-time coordinate capture;
- actual/predicted separation;
- stable prefix / mutable tail;
- semantic stroke record;
- counter-based Philox4x32-10;
- resource/version dependency;
- coverage/deposition separation;
- long-stroke boundedness;
- preview/strict authority boundary;
- renderer/device-loss boundary.

### Measured calibration — PENDING

Must be completed before Brush Production implementation:

- default stabilizer/reconstruction coefficients;
- mutable tail budgets;
- preview tolerance;
- materialization limits;
- supported-device latency/memory profile.

This is a Prototype/Benchmark Gate, not missing semantic design.

## 5. Region Gate C status

### Semantic design — COMPLETE

Closed by `architecture/REGION_RESOLVER_V2.md`:

- resolver request/result;
- fixed/live source;
- evidence/boundary/topology state;
- confidence/ambiguity;
- split/merge lineage;
- user override;
- Selection/Fill/Persistent Region separation;
- incremental bounded update.

### Measured calibration — PENDING

Before Region/Fill Production:

- evidence thresholds;
- gap thresholds;
- confidence/margin thresholds;
- update budgets.

Again, this is benchmark calibration, not missing subsystem semantics.

## 6. Architecture V1 / Library conflict resolution

### Tile

Resolved in favor of:

- fixed 256 canonical V2 address grid;
- adaptive sub-tile execution/physical subdivision.

This keeps stable Revision/recovery addressing while retaining device adaptation below the canonical grid.

### Raster precision

Resolved in favor of Surface-level explicit:

- UNORM8;
- UNORM16;
- FLOAT32.

Slice 001 RGBA8-only is not retained.

The Library draft's per-block mixed precision is **not adopted in V2** because Surface-level precision is simpler and avoids cross-tile format heterogeneity while satisfying current Product requirements.

### Coordinate domain

Resolved in favor of signed outside-canvas Raster retention.

Canvas frame and Raster content bounds are separate.

### Recovery identity

Resolved in favor of WriterEpoch + monotonic CommitSequence + dependency closure.

Largest Revision ID is rejected as a protection model.

### Command depth

Resolved in favor of V2 SemanticOperation records.

Raw pointer input and changed-tile summaries are insufficient canonical meaning.

### Persistent data structure

Concrete HAMT/RRB/PagedMap choice remains implementation-benchmark-local.

The semantic requirement is structural sharing and bounded updates, not one container implementation.

## 7. What can be deferred safely

The following do not block unrelated Core work:

- final Wet Media simulation;
- deep Vector/Text details;
- advanced effects catalog;
- Macro editor UI;
- Asset UI;
- Navigator/Work Time;
- PSD mappings;
- physical .illustro encoding;
- full plugin/collaboration protocol;
- exact worker/WASM split;
- numeric cache/scheduler budgets;
- concrete PiP;
- concrete Quick Controller;
- visual panel/color/brush layouts.

Each is still gated before its own Production implementation.

## 8. Re-entry decision

**Technical cross-cutting Core design is now complete enough for user review.**

However Production must remain stopped because:

1. explicit user authorization has not been given;
2. if the intended next Production subsystem is Brush, its benchmark gate must run first;
3. if the intended next subsystem is Region/Fill, its corpus calibration must run first;
4. visual UI remains user-owned.

Therefore the correct current label is:

> **DESIGN READY FOR USER REVIEW — PRODUCTION LOCKED**

