# Illustro Pre-Implementation Design Completion Audit — 2026-09-28

> Status: **HISTORICAL FIRST PASS — superseded by DESIGN_COMPLETION_REEVALUATION_2026-09-28.md; Production remains locked**
> Scope: current Product / Feature / Interaction / Architecture / Vertical Slice 001 vs current redesign doctrine
> Implementation effect: **None. This document does not authorize Vertical Slice 002 or any later Production subsystem.**
> Source hierarchy: `PRODUCT_SPEC.md` → `REDESIGN_PRINCIPLES.md` / `CREATION_PROXIMITY_PRINCIPLES.md` → Feature / Interaction / Architecture specifications → implementation notes.
> Legacy/Library material, including `ILLUSTRO_SECTION9_ALGORITHM_REVIEW_DRAFT(2).txt`, is reference-only.

## Supersession

This file records the first-pass findings. The completed V2 status is [Design Completion Re-evaluation — 2026-09-28](DESIGN_COMPLETION_REEVALUATION_2026-09-28.md). Unresolved items in this historical first pass must not override later V2 decisions.

## 1. Audit conclusion at this pass

Architecture V1 remains useful as a technical feasibility baseline, and Vertical Slice 001 remains useful as a provisional low-level foundation.

However, **Illustro is not yet Design Ready for broad Production continuation**.

The primary reason is not missing feature inventory. The remaining risk is concentrated in a smaller set of cross-cutting contracts whose later change would force expensive rework across Brush, Raster, Renderer, History, Persistence, Region and File Format.

The correct next phase is therefore:

1. finish the cross-cutting contracts listed in section 4;
2. resolve the recorded Architecture V1 / Slice 001 inconsistencies in section 5;
3. pass the subsystem-specific gate for the intended next implementation scope;
4. obtain explicit user authorization before Production implementation resumes.

A completed Architecture benchmark, an existing Slice 001, or this audit alone is **not** implementation authorization.

## 2. Status vocabulary

- **確定** — current product-level decision can be treated as canonical.
- **仮決定** — architecture/semantics have a usable direction, but one or more material contracts remain open.
- **未設計** — no current specification is strong enough to implement without inventing behavior.
- **User UI decision待ち** — interaction/visual form must not be formally adopted without user co-design.
- **Prototype/benchmark待ち** — decision requires measured evidence or adversarial corpus evaluation.
- **実装後に決めてよい** — safely deferable without constraining the current production foundation, provided listed future boundaries are preserved.

Combined labels are intentional.

## 3. 24-area Design Completion Audit

| # | Area | Current status | Verified basis | Remaining decision before relevant Production implementation |
|---|---|---|---|---|
| 1 | Product理念 | **確定** | `PRODUCT_SPEC.md`, redesign and Creation-Proximity doctrine are canonical | Continue traceability; no new product doctrine needed before Core re-entry |
| 2 | User workflow | **仮決定** | Core creation flows and feature-specific interactions exist | Advanced end-to-end workflows still need feature-local consolidation; concrete UI flow requires user review |
| 3 | Interaction model | **仮決定** | `INTERACTION_MODEL.md` defines entry, preview, commit, cancel, error, context and device principles | Concrete surface/layout choices remain UI decisions; unresolved P1/P2 interactions stay feature-local |
| 4 | Document model | **仮決定** | Stable entity identity + immutable published root + mutable Active Transaction are established | Final ID taxonomy, durable identity exposure, entity schema boundaries and scalable persistent-structure contract |
| 5 | Raster | **仮決定** | Sparse raster, canonical/working separation, dirty/partial work and 256 standard runtime profile have evidence | Canonical pixel descriptor/precision, hidden RGB/alpha policy, coordinate domain, and whether logical tile size can affect durable semantics |
| 6 | Brush Engine | **Prototype/benchmark待ち — design-critical** | ADR-0004 + Brush Engine First define the pipeline and quality goals | Semantic Stroke/Dab contract, reconstruction ownership, deterministic random/resource/version contract, long-stroke bounding, Preview/Commit identity; exact calibration after benchmark |
| 7 | Renderer | **仮決定 / Prototype/benchmark待ち** | Backend fallback, GPU-derived-state rule, dirty rendering and device-loss principles are established | Production Brush↔Renderer contract, precision/tolerance/reference semantics, retained presentation and final materialization boundary |
| 8 | Layer system | **仮決定** | Required layer kinds, tree model, masks/effects/clipping direction are specified | Full canonical schemas and ordering semantics for Group/Mask/Effect/Adjustment/Text/Vector before those feature implementations |
| 9 | Selection / Transform | **仮決定 / Prototype/benchmark待ち** | Selection Coverage is separate from Region; transform/effect architecture exists | Final resampling/reference rules, Shared Resolver boundary, live/frozen dependency behavior and adversarial transform corpus |
| 10 | Color | **仮決定 / Prototype/benchmark待ち / User UI decision待ち** | Managed color pipeline, straight-alpha direction, ICC ownership and wide-gamut requirements exist | Canonical precision policy, ICC implementation/fallback contract, blend compatibility/reference tests; picker/panel visual design remains user-owned |
| 11 | Fill / Region / Lineart | **Prototype/benchmark待ち — design-critical** | Evidence→Boundary→Topology→Stable Identity and confidence/ambiguity direction are established | Shared Region Resolver API/data contract, generation/state semantics, stable matching rules, resolver↔Selection/Fill freeze/live rules; thresholds/weights require corpus benchmark |
| 12 | Reference | **仮決定 / User UI decision待ち** | Artwork separation, persistence class, multiple references and direct eyedropper requirements exist | Detach/floating/dock concrete interaction and device layouts require user co-design |
| 13 | History / Snapshot | **仮決定** | Revision/Transaction/Snapshot/Recovery separation and root-switch Undo are established | Durable operation semantics, hot/cold materialization/GC policies and branch navigation details; thresholds may remain benchmark-gated |
| 14 | Persistence / Recovery | **仮決定 — design-critical** | OPFS/worker/journal feasibility and Recovery separation have Architecture evidence | Production commit sequence, dependency closure, Protection acknowledgement, packet/handoff schema, concurrent-session identity and error/state contract |
| 15 | File format | **未設計 as canonical / strong reference draft exists** | Current Architecture deliberately leaves physical `.illustro` encoding open; Section 9 Library draft is not integrated | Portable logical identity contract, versioning/unknown-data policy, block/content identity and physical encoding before file-format Production work |
| 16 | Non-destructive effects | **仮決定** | Effect graph, tile+halo, adjustment/live-filter direction exists | Feature-specific parameter/canonical schemas, global-analysis behavior, compatibility semantics and UI before implementation |
| 17 | Automation | **仮決定** | Macro/Auto Action capability and command-system direction exist | Recording/editing/parameterization interaction and safety/failure semantics may remain feature-local |
| 18 | Input / Shortcut / Gesture | **仮決定 / User UI decision待ち** | Pointer normalization direction, shortcut capture/conflict requirements and pen/touch arbitration exist | Gesture customization and non-keyboard binding interaction; Brush sample canonical contract is part of Brush gate |
| 19 | Device adaptation | **仮決定 / User UI decision待ち** | Capability-based runtime adaptation is defined | Concrete Desktop/Tablet/Smartphone layouts require user co-design; supported-device validation occurs after relevant implementation |
| 20 | Workspace / PiP | **User UI decision待ち / Prototype比較待ち** | Creation-Proximity objective and required properties are canonical | Compare Dock/Detach/Floating/Popover/Overlay/Split mechanisms; user selects concrete interaction and visual form |
| 21 | Quick Controller | **User UI decision待ち / Prototype比較待ち** | Spatial-memory objective, customization and command-surface requirements are canonical | Compare radial/pie/arc/edge/floating/gesture candidates for speed, errors, occupancy, pen/touch and handedness; user selects concrete form |
| 22 | Performance | **Prototype/benchmark待ち, with confirmed policy** | Pay-for-use, bounded work, sparse/partial update and Architecture benchmark framework are established | Brush/Region/Color/Persistence-specific budgets and production workloads; do not turn provisional numbers into product guarantees |
| 23 | Extensibility / future collaboration | **実装後に決めてよい, with boundary constraints now** | Stable identity, typed operations and no mandatory network dependency preserve a future path | Full plugin/collaboration protocol can wait; current ID/operation/state design must not assume mutable global indexes or network authority |
| 24 | UI-dependent unresolved decisions | **User UI decision待ち** | UI generation gate and user co-design rule are explicit | PiP, Quick Controller, panel layout, Color UI, Brush settings UI, per-device layout, icons, hierarchy, theme and canvas presentation remain unapproved |

## 4. Production re-entry Design Gate

The design does **not** need every future feature to be fully fixed before code resumes. It does need the cross-cutting decisions below because they affect multiple foundational subsystems.

### Gate A — required before any broad Production continuation

#### A1. Specification / phase-state coherence

- Architecture V1 must be described as an accepted **technical baseline**, not as standing permission to continue Production.
- No canonical/architecture document may say `implementation active` in a way that conflicts with the open Design Completion Gate.
- This audit and `DESIGN_COMPLETION_GATE.md` must remain explicit that user authorization is required after design review.

#### A2. Identity taxonomy

Define and separate:

- stable Entity ID;
- Transaction ID;
- Revision/logical-root identity;
- runtime/local Block handle;
- durable Content/Block identity;
- future Actor/Operation identity where needed.

Slice 001 numeric Revision/Block IDs may remain internal provisional handles only if the contract explicitly says so. They must not silently become portable-file or collaboration identity.

#### A3. Canonical Raster contract

Decide:

- canonical pixel descriptor and supported encodings/precision;
- straight/premultiplied boundary and hidden-RGB behavior;
- whether precision promotion is per-document, per-surface or per-block;
- logical Tile's relationship to portable semantics;
- coordinate domain, including explicit decision on outside-canvas/overscan artwork retention;
- sparse default and materialization rules.

Exact GPU formats and microtile sizes may remain Runtime Profile details.

#### A4. Operation / Transaction / Revision contract

Define:

- what semantic operation data must survive Commit;
- how Raster materialization relates to semantic records;
- whether Brush/Fill/Region use semantic records + strict raster materialization, strict deltas, or a bounded hybrid;
- deterministic resource/algorithm/version dependencies;
- branch/redo semantics independent of GC;
- how command identity is shared across Toolbar, Search, Quick Controller, Context UI and detached surfaces.

#### A5. Logical Persistence / Recovery contract

Before physical container details, define:

- monotonic commit/order identity independent of Revision numeric ordering;
- transitive dependency closure;
- Protected / Saved / Recovered / dirty meanings;
- durable acknowledgement rule;
- recovery handoff/packet logical schema;
- concurrent open/session identity and destination conflict behavior.

The current Slice 001 `RecoveryState` is a placeholder, not a production contract.

#### A6. UI ↔ Core dependency boundary

Identify UI choices that may alter Core contracts, while leaving purely visual choices to user co-design.

Core must expose the same semantic commands regardless of whether invoked by:

- normal Toolbar/Menu;
- Command Search;
- Quick Controller;
- Context UI;
- detached/PiP surface;
- Shortcut/Gesture.

Concrete PiP and Quick Controller forms are **not** required to be visually finalized to implement UI-independent Core, but no Core API may assume one unapproved form.

#### A7. Slice 001 disposition record

Every Slice 001 foundation item must be explicitly marked Retain / Modify / Replace under section 5 before the next Production slice is authorized.

#### A8. Explicit user authorization

Passing the technical/design gates does **not** automatically resume implementation.

Production Slice 002 or any later Production change begins only after the user explicitly authorizes the intended scope.

### Gate B — required before Brush Production implementation

Because Brush is the likely next high-coupling subsystem, it additionally requires:

- normalized sample schema and validity semantics;
- coordinate/view-generation capture;
- reconstruction/stabilization ownership and finite-tail model;
- Dynamics composition semantics;
- deterministic PRNG/stream indexing contract;
- Tip/Texture resource versioning;
- spacing/continuous-coverage rules;
- Flow/Opacity/Density/Accumulation separation;
- Mixing/Wet dependency model or explicit deferred subset;
- selection/source snapshot semantics;
- Preview/Commit identity and canonical reference evaluator/tolerance;
- long-stroke admission/backpressure/recovery streaming rules;
- adversarial benchmark corpus and acceptance metrics.

Calibration constants may remain benchmark outputs; the semantic equations and fallback behavior must not be invented during implementation.

### Gate C — required before Region/Fill Production implementation

- Shared Region Resolver request/result types;
- fixed-source vs live-source semantics;
- confidence/ambiguity/error model;
- Evidence/Boundary/Topology generation states;
- stable identity, split/merge lineage and user override semantics;
- Region→Selection freezing and Selection≠Region rule;
- Fill/Selection/Lineart shared resolver boundaries;
- incremental dirty dependency and bounded-work contract;
- corpus-based threshold/weight calibration.

## 5. Vertical Slice 001 disposition — first-pass

| Slice 001 item | First-pass disposition | Reason / required follow-up |
|---|---|---|
| Stable ID policy | **MODIFY / clarify** | UUID-like Document/Layer/Transaction identity direction is compatible, but Entity/Revision/runtime Block/durable Content identities are not yet explicitly separated |
| Revision / Transaction model | **RETAIN principle, MODIFY metadata contract** | One user-intent Transaction → one published Revision and root switching are compatible; durable commit order/dependencies and richer semantic records are still required |
| Sparse Raster / Tile | **RETAIN sparse foundation, MODIFY canonical contract** | Sparse allocation and partial work are correct; hardcoded RGBA8, coordinate domain, Tile portability and precision semantics are not final |
| Canonical block ownership | **RETAIN ownership invariant, MODIFY block model** | Single-owner immutable published bytes are sound; block descriptor/content identity and typed payloads remain unresolved |
| History branching | **RETAIN principle** | Alternate revisions survive branch; UI redo navigation, retention, GC and future multi-parent semantics remain separate design work |
| Persistence handoff | **REPLACE before Production Persistence** | Current changed-Block summary lacks dependency closure, commit sequence, resources/algorithm/profile dependencies and durable acknowledgement semantics |
| Layer model | **RETAIN only as minimal Raster subset; EXTEND** | Current Raster metadata does not represent final multi-kind Layer/Mask/Effect/Region architecture |
| Command model | **RETAIN typed/versioned envelope, REPLACE/EXTEND operation schema before Brush** | `raster.tiles + tileCount` and `layer.metadata` are summaries, not sufficient semantic records for Brush/Fill/Region/Recovery/Timelapse |

No item is retained merely because code exists.

## 6. Verified inconsistencies / decisions requiring reconciliation

### C-01 — Governance wording drift

Current `README.md` and `FEATURE_SPEC.md` correctly state that Production is paused and Design Completion Gate is open.

However, `ARCHITECTURE_V1.md`, ADR-0001 and ADR-0003 still contain earlier `Confirmed for Core implementation` / `implementation active` wording.

**Action:** normalize these status strings without changing the technical Architecture decisions.

### C-02 — Logical Tile semantics

Current ADR-0002 / Architecture V1 treat Tile size as a Runtime Profile detail and explicitly state that portable `.illustro` semantics must not depend on it.

The Library Section 9 draft instead proposes 256×256 as a v1 structural/canonical tile baseline and treats 128/512 changes as explicit format/migration concerns.

These are not the same contract.

**Action:** independently decide the portable-vs-runtime Tile boundary before integrating any Section 9 file-format/raster proposal.

### C-03 — Canonical Raster representation

Slice 001 currently uses a 4-byte-per-pixel `Uint8Array` tile representation.

The Library Section 9 draft proposes typed straight-alpha planes supporting UNORM8/UNORM16/F32 and preserving hidden RGB.

**Action:** choose the current Illustro canonical raster contract from present Product/Color/Brush requirements. Do not adopt either merely because it already exists.

### C-04 — Coordinate domain

Slice 001 rejects negative pixel/tile coordinates.

The Library Section 9 draft proposes signed coordinates and overscan.

Current Product/Feature/Interaction specifications do not establish outside-canvas artwork retention as a required semantic.

**Action:** make an explicit Product/Document decision. Until then, this is an open design question, not a proven Slice 001 bug.

### C-05 — Recovery protection identity

Slice 001's internal `RecoveryState` advances by maximum Revision ID and is already documented as a placeholder.

A dependency-closed recovery system cannot equate largest Revision ID with durable protection, especially across Undo/branching or missing dependencies.

**Action:** define commit sequence + dependency-closure semantics before Production Persistence.

### C-06 — Command semantic depth

Slice 001 records only changed raster tile count / layer metadata summaries.

Brush Engine First, Region, Macro, Timelapse and robust Recovery require versioned semantic dependencies beyond that summary.

**Action:** decide the operation-record architecture before Brush Production implementation.

### C-07 — Persistent structure implementation

ADR-0001 keeps HAMT/RRB/etc. open to measured comparison. Slice 001 uses a fixed-page COW `PagedMap`; the Library Section 9 draft proposes persistent HAMT/B-tree/RRB/sparse trees.

**Action:** preserve the abstract structural-sharing contract now; benchmark/replace the concrete data structure when realistic scale requires it. Do not expose the current `PagedMap` shape as file/API semantics.

## 6.1 Current competitor revalidation — 2026-09-28

A focused official-document re-check was performed for the three high-coupling themes in this audit. This is not a visual-design adoption decision.

Verified current patterns:

- Procreate QuickMenu remains a customizable near-canvas command surface, while Brush Studio separates Stroke Path, Stabilization, Wet Mix, Color Dynamics, Dynamics and Pencil inputs with live preview.
- CLIP STUDIO PAINT Quick Access can register tools, commands, Auto Actions and drawing colors and includes search; advanced brush settings can choose which parameters are promoted into the normal Tool Settings surface.
- Krita 5.3 provides configurable Dockers and an On-Canvas Brush Editor / brush HUD; its brush system keeps explicit Sensor, Texture, Opacity/Flow and engine-level capabilities.
- Photoshop desktop's current Contextual Task Bar is a floating on-canvas interface that surfaces task-relevant actions; current Actions can also be reached from that contextual surface.
- ibisPaint continues to expose brush Shape/Spacing, Jitter, Texture and speed/pressure-dependent Dynamics.

Official references:

- https://help.procreate.com/procreate/handbook/5.3/interface-gestures/quickmenu
- https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings
- https://help.clip-studio.com/en-us/manual_en/690_interface/Quick_Access_Palette.htm
- https://help.clip-studio.com/en-us/manual_en/240_brushes/Customizing_brush_tools.htm
- https://docs.krita.org/en/reference_manual/dockers/oncanvas_brush_editor.html
- https://docs.krita.org/en/reference_manual/brushes/brush_settings.html
- https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/boost-workflows-with-the-contextual-task-bar.html
- https://helpx.adobe.com/photoshop/desktop/automate-tasks/automation-settings-and-presets/apply-actions-in-the-actions-panel.html
- https://ibispaint.com/lecture/index.jsp?lang=en&no=118

**Audit effect:** these current products reinforce the value of customizable command access, context/Canvas-near controls and deep Brush Dynamics. They do not establish a preferred Illustro PiP shape, Quick Controller geometry or Brush UI layout. Those remain independent Illustro design decisions and, where visual, user-owned decisions.

## 7. What does not need to block Production re-entry

Provided Gate A and the intended subsystem gate pass, the following can remain feature-local:

- Dynamic Wet Media final simulation model;
- Vector deep editing details;
- Text advanced typography beyond required baseline;
- Guides/Rulers/Shapes/Gradient detailed UI;
- Blend If concrete UI;
- full Adjustment/Filter catalog and advanced kernels;
- Healing/Patch/Clone detailed algorithms;
- Macro editor UI;
- Asset Library management UI;
- Navigator/Multi-view;
- Work Time UI;
- advanced export/interchange mappings;
- plugin runtime;
- realtime collaboration protocol;
- visual theme/iconography;
- exact cache/worker/benchmark constants that do not alter semantics.

These items must still pass their subsystem gate before their own implementation.

## 8. UI ownership

This audit does not approve a concrete visual design for:

- PiP / Detachable Workspace;
- Quick Controller;
- Panel layout;
- Color UI;
- Brush settings UI;
- Desktop / Tablet / Smartphone layout;
- icons, hierarchy, theme or canvas presentation.

When these move to visual prototyping, the dedicated UI Design Skill is mandatory and user review is required before formal adoption.

## 9. Next design work order

To minimize rework, continue design in this dependency order:

1. Identity taxonomy + Canonical Raster contract;
2. Operation/Transaction/Revision + Persistence logical contract;
3. Brush semantic/reference contract + benchmark plan;
4. Renderer boundary;
5. Shared Region Resolver + Selection/Fill contract;
6. File-format logical model, then physical encoding;
7. UI-core action/surface contract;
8. user-facing UI prototypes and user decisions.

This order is a design dependency order, not permission to implement.

## 10. Current gate state

**OPEN. Production implementation remains stopped after Vertical Slice 001.**

A future audit may mark a specific implementation scope as **DESIGN READY FOR USER REVIEW**, but only an explicit user instruction may unlock Production implementation.
