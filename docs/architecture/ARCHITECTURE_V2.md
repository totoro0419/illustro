# Illustro Architecture V2

> Status: **DESIGN COMPLETE FOR REVIEW — Production implementation remains locked**
> Date: 2026-09-28
> Scope: Core semantic architecture after Design Completion Audit
> Supersedes: Architecture V1 as the current design baseline. V1 remains technical/prototype evidence.
> UI: concrete visual/layout decisions remain user-owned and are not fixed here.

## 1. What V2 means

Architecture V2 closes the cross-cutting design contracts that were still open after Vertical Slice 001.

V2 is the authoritative Core design baseline for:

- Identity / Operation / Revision
- Canonical Raster
- Brush ↔ Raster ↔ Renderer boundary
- Persistence / Recovery logical semantics
- Shared Region Resolver boundary
- Slice 001 disposition

It does **not** authorize Production implementation.

Production remains stopped until the user explicitly authorizes a concrete scope.

## 2. Canonical documents

V2 is composed of:

- [Identity / Operation / Revision Contract V2](IDENTITY_OPERATION_REVISION_V2.md)
- [Canonical Raster Contract V2](CANONICAL_RASTER_V2.md)
- [Brush ↔ Raster ↔ Renderer Contract V2](BRUSH_RENDER_CONTRACT_V2.md)
- [Persistence / Recovery Logical Contract V2](PERSISTENCE_RECOVERY_LOGICAL_V2.md)
- [Shared Region Resolver Contract V2](REGION_RESOLVER_V2.md)
- [Core Slice 001 Final V2 Disposition](../implementation/CORE_SLICE_001_FINAL_DISPOSITION.md)
- [Design Completion Gate](../DESIGN_COMPLETION_GATE.md)

If an older ADR conflicts with these V2 contracts, V2 wins until the ADR is revised.

## 3. Core state classes

### 3.1 Canonical Persistent State

Artwork/project meaning:

- Project/Document metadata
- canvas frame
- entity/layer tree
- Raster logical values
- Vector/Text
- Masks/Effects
- Region identity/assignments
- color/profile references
- guides/reference metadata where document-persistent
- resource table
- explicit user overrides

### 3.2 Canonical Semantic Operations

Versioned user operations:

- Brush stroke
- Fill
- Selection freeze/expression
- Transform
- Raster import/delta
- Layer/entity structure
- Effect parameter
- Region identity/reconciliation
- Color conversion

### 3.3 Active Mutable State

Bounded pre-commit scratch:

- active Stroke tail
- mutable working Raster
- transform drag
- parameter drag
- transient selection operation

### 3.4 Derived State

Recomputable but useful:

- GPU textures
- composited tiles
- mips
- Region evidence/spatial indexes
- effect caches
- ICC LUT/cache
- Brush generated dab cache

### 3.5 Preview-only State

Never durable truth:

- predicted pointer tail
- provisional transform frame
- provisional Region diagnostics
- UI overlays

## 4. Identity and ordering

Stable logical identities are offline-capable UUIDv4 values.

Separate:

- Entity identity
- Transaction identity
- Revision identity
- Block/resource identity
- runtime handles
- content digest
- persistence commit order

Persistence order is `(WriterEpochId, CommitSequence)`, never “largest Revision ID”.

## 5. Document / Revision architecture

A user Transaction starts from one base Revision.

During interaction it may mutate bounded scratch.

Commit atomically publishes:

- one immutable Revision;
- one immutable Document Root;
- versioned Semantic Operations;
- a logical Persistence handoff.

Normal local Revision has one parent.

Undo/Redo navigates Revision roots.

Undo then edit forms a branch; retained old branch is independent of redo UI and GC policy.

## 6. Canonical Raster

V2 Raster:

- signed Document-space sparse domain;
- canvas frame separate from stored Raster extent;
- off-canvas/overscan artwork preserved until explicit destructive operation;
- fixed 256×256 canonical logical address grid;
- adaptive subrect/microtile/physical subdivision;
- Surface-level UNORM8 / UNORM16 / FLOAT32 precision;
- straight alpha and hidden RGB preservation;
- absent color tile = transparent black;
- immutable published values;
- bounded semantic/materialization chain;
- GPU/working premultiplied form allowed only as non-authoritative state.

Tile boundaries must not change Brush results.

## 7. Brush Engine

Canonical Brush path:

```text
actual platform input
→ normalized sample
→ receive-time Document coordinate
→ versioned reconstruction
→ dynamics
→ coverage/deposition
→ tip/texture/resources
→ color/mixing
→ semantic stroke operation
→ realtime derived rendering
→ strict Raster materialization
```

Predicted input affects Preview only.

Brush random uses counter-based Philox4x32-10 with semantic index/stream namespace.

Long strokes seal stable prefix pages and retain only bounded mutable tail/dependency state.

Raw pointer data is not the sole durable meaning.

## 8. Renderer

Renderer is demand-driven and Derived.

Logical rendering flow:

```text
Revision + active preview
→ visible demand
→ dependency evaluation
→ source Raster/Vector/Text/Effect
→ dirty composite
→ display transform
→ presentation
```

Backend may be WebGPU, WebGL2 or CPU/Canvas-compatible.

Backend/device loss invalidates Derived resources, not artwork.

Strict materialization and display presentation are separate.

## 9. Region / Fill / Selection

Shared Region Resolver pipeline:

```text
fixed/live source snapshot
→ Evidence
→ Boundary
→ Topology generation
→ query
→ confidence/ambiguity
→ feature-specific result
```

Rules:

- Selection coverage != Region identity.
- Normal Fill/Selection uses fixed source snapshots.
- Persistent Region/linked coloring uses explicit live bindings.
- Ambiguous results are not silently promoted to Current.
- split/merge creates lineage rather than arbitrary ID inheritance.
- user-pinned decisions are not silently overwritten.
- Region analysis is not on the normal Brush synchronous path.

## 10. Persistence / Recovery

Logical Commit and durable Protection are separate.

Recovery packet closure includes all transitive dependencies needed to reconstruct the Revision.

`ProtectedThrough` advances only across contiguous, verified CommitSequence closure.

Save is a fixed Revision generation.

Recovered, Saved, Protected and Dirty are distinct user/system states.

Physical `.illustro` encoding is still a later feature gate; logical persistence semantics are already fixed.

## 11. Runtime role separation

Logical roles:

### UI / Platform Adapter

- input collection
- DOM/accessibility
- command invocation
- user-visible state
- no artwork authority

### Realtime Engine

- active Transaction
- Brush reconstruction/dynamics
- visible work orchestration
- semantic Commit
- may run mainly on Main Thread under current evidence

### Renderer/GPU

- Derived working/presentation
- visible tile/effect evaluation
- no sole canonical authority

### Persistence role

- bounded queue
- hashing/integrity
- Recovery closure
- Save generations
- working-store I/O

### Bounded compute role

Pay-for-use:

- Region
- strict CPU kernels
- codecs
- ICC
- large filters
- future heavy geometry

Physical Main/Worker/WASM placement remains benchmark-adaptive as long as semantics stay identical.

## 12. Scheduling priority contract

Priority order:

1. actual input / direct manipulation
2. correct visible presentation
3. logical Commit
4. recovery dependency closure needed for safety
5. strict materialization needed for bounded replay
6. user-requested Region/analysis
7. cache/maintenance
8. export/background optional work

No background feature may consume unbounded Foreground latency/memory.

## 13. Color boundary

Document owns an explicit working color descriptor/profile.

Editable Raster data is not hard-wired to sRGB.

Canonical Raster is straight alpha; renderer may derive premultiplied linear working data.

ICC transforms are Engine-owned and pay-for-use.

Current ICC.1 v4 specification remains the baseline external profile standard.

Exact ICC implementation/library and blend-compatibility formulas remain feature benchmark decisions, not Core architecture ambiguity.

## 14. Performance invariants

V2 must preserve:

- sparse allocation;
- partial dirty propagation;
- bounded replay/materialization;
- no full Canvas copy for normal Stroke;
- no full Tile copy per dab;
- no synchronous whole-document hash on Pen Up;
- no general serialization/compression in Realtime hot path;
- no mandatory Region/ICC/Wet/codec load before first Brush;
- bounded persistence queue;
- GPU Derived state reconstructible after device loss;
- inactive advanced features near-zero recurring work.

## 15. UI/Core boundary

Concrete UI is not fixed here.

Core must expose semantic commands independent of surface:

- toolbar/menu
- context UI
- command search
- Quick Controller
- detached/PiP workspace
- shortcut
- gesture

No Core schema may encode an unapproved hex/radial/panel form.

UI-bearing features require dedicated UI Design Skill and user approval.

## 16. Device adaptation

PC/Tablet/Smartphone share:

- Document semantics
- Raster semantics
- Brush semantic record
- History
- Recovery states
- Region meanings

They may vary:

- UI layout
- cache budget
- execution subdivision
- worker count
- backend
- preview quality within certified tolerance
- scheduling budget

Canonical logical Tile size does not vary by device in V2.

## 17. Extensibility boundary

Plugin/collaboration protocol remains future work.

V2 already avoids blockers through:

- UUID stable identities
- typed semantic operations
- parent-capable revisions
- no network dependency
- no local runtime handles in durable schemas
- versioned algorithms/resources

## 18. What remains benchmark-gated

Architecture V2 semantics are complete, but the following measured values/algorithms must pass their feature gate before Production implementation of that feature:

### Brush

- selected default stabilizer/reconstruction coefficients
- mutable-tail budget
- preview tolerance
- materialization admission limits
- supported-device latency/memory profile

### Region

- evidence thresholds
- gap/bridge thresholds
- confidence/margin thresholds
- candidate/update budgets

### Color/ICC

- implementation/library
- LUT/cache choices
- compatibility formulas
- performance profile

### Runtime

- worker/WASM split for real heavy kernels
- cache byte budgets
- scheduler numeric deadlines

These are calibration decisions, not missing cross-cutting semantics.

## 19. What remains feature/UI-gated

May be decided before the relevant feature, not before unrelated Core work:

- Wet Media final simulation
- Vector deep editing representation details
- advanced Text typography
- Guides/Rulers/Shapes/Gradient detailed interaction
- Blend If UI
- complete effect/filter catalog
- Healing/Patch/Clone algorithms
- Macro editor UI
- Asset Library UI
- Navigator/Multi-view
- Work Time
- PSD detailed mappings
- physical .illustro container encoding
- plugin runtime
- realtime collaboration protocol
- PiP concrete visual form
- Quick Controller geometry
- panel/color/brush settings layouts
- final device visual layouts/icons/theme

## 20. Architecture V1 status

Architecture V1 remains valid evidence for:

- sparse/dirty feasibility;
- ownership transfer;
- WebGL2 fallback;
- OPFS SyncAccessHandle path;
- lazy first-stroke architecture;
- initial Main-vs-Worker measurement.

It is no longer the current semantic design authority where V2 differs.

Notable V2 changes:

- canonical logical Tile is fixed at 256 instead of runtime 128/256 switching;
- Raster may retain signed overscan;
- Raster precision is explicit multi-format;
- durable Revision/Block identities are no longer numeric runtime counters;
- Persistence ordering uses WriterEpoch + CommitSequence;
- Brush semantic record and Region Resolver boundaries are specified.

## 21. Production implementation lock

Architecture V2 being design-complete does **not** resume Production.

The next allowed actions are design review, benchmark prototypes, and UI prototypes under their rules.

Any Production code change after Slice 001 requires explicit user authorization.

