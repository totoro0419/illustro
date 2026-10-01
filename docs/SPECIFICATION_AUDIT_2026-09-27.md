# Illustro Specification Precision Audit — 2026-09-27

> **Lineart Layer reset notice (2026-10-01):** この監査内の旧 Region / Lineart-linked Coloring に関する達成度・解決済み判定は現在の進捗として扱わない。該当設計は破棄され、線画レイヤーとしてゼロから再設計する。

> Scope: 現時点の新Illustro全仕様・Architecture・Interaction・Device/Performance policy  
> Result: **Core specification baseline is coherent and interaction-ready; advanced features and runtime performance remain incomplete/unverified.**  
> Important: 本報告は実装動作PASSではない。

## 1. Audit dimensions

今回、次を別々に検査した。

1. Product intent consistency
2. Feature completeness
3. Interaction completeness
4. Architecture consistency
5. Performance-first compliance
6. PC / Tablet / Smartphone adaptability
7. Persistence / recovery / data-loss risk
8. Cross-document editing
9. Accessibility / localization
10. Requirement traceability
11. UI readiness
12. Implementation / benchmark readiness

## 2. Current status summary

| Area | Status | Meaning |
|---|---|---|
| Product definition | PASS | 一枚絵・Canvas First・Low Friction・高機能方針が一貫 |
| Feature breadth | PASS with tracked backlog | Core抜けを補修。Advanced detailsは明示追跡 |
| Core interaction | PASS | P0詳細Interaction仕様あり |
| Advanced interaction | INCOMPLETE | P1/P2 backlogあり |
| Architecture | PASS for prototype | v0.2 performance-first baseline |
| Runtime performance | UNVERIFIED | Prototype/実機Benchmark未実施 |
| PC adaptability | DESIGN PASS | Runtime未検証 |
| Tablet adaptability | DESIGN PASS | Runtime未検証 |
| Smartphone adaptability | DESIGN PASS | Runtime未検証 |
| Persistence/recovery design | PASS for prototype | Fault tests未実施 |
| Full UI readiness | PARTIAL | Core UI ready、Advanced final UI未ready |
| Production implementation readiness | NOT YET | Architecture Prototype + UI designが必要 |

## 3. Structural integrity checks

### Requirement identity

FEATURE_SPEC requirement IDs:

- total: **222**
- unique: **222**
- duplicate: **0**

### P0 Interaction completeness

P0 detailed specs are checked against:

- Entry
- Default
- Active state
- Commit
- Cancel
- Undo
- Error/conflict
- Device mapping
- Persistence
- Performance
- Acceptance

Current P0 set:

- Document Lifecycle
- Keyboard Shortcuts
- Canvas / Navigation
- Brush / Eraser
- Layers
- Color / Eyedropper
- Smart Fill
- Selection / Transform
- Lineart Layer / Area Fill — design reset
- Reference Workspace
- History / Snapshot / Layer Comp
- Quick Menu / Command Search
- Save / Recovery
- Clipboard

Result after remediation:

> **No known missing rubric category in P0 detailed specs.**

This is a semantic completeness check, not a usability test.

## 4. High-severity findings discovered and corrected

### H-01 Clipboard missing from original feature baseline

Risk:
Basic creative editing would lack formally specified Copy/Cut/Paste.

Corrected:

- Internal Clipboard
- Copy / Cut / Paste
- Copy Merged
- Paste in Place
- native cross-document payload
- optional System Clipboard bridge
- Drag & Drop semantics
- Undo/commit behavior

Status: **FIXED**

### H-02 Document lifecycle under-specified

Risk:
New/Open/Place/Close/last layer behavior would be invented during UI implementation.

Corrected:

- New Document
- Open vs Place
- initial Raster Layer
- multiple documents
- explicit Save/Discard/Cancel on in-app close
- empty Layer tree behavior
- first-stroke auto paint layer
- recent/recovery behavior

Status: **FIXED**

### H-03 Lineart Layer — historical Region finding superseded

Risk:
Architecture had Current/Updating/Ambiguous, but UX response was undefined.

Corrected:

- source configuration
- visible states
- manual correction
- conservative auto follow
- conflict/ambiguity behavior
- linked-coloring History grouping

Status: **FIXED**

### H-04 Save concurrency / external modification

Risk:
Same file/session could be overwritten or multiple OPFS writers could conflict.

Corrected:

- per-session mutable working namespace
- no shared mutable journal between duplicate opens
- external destination change detection where available
- no silent overwrite on detected conflict
- recovery preserved during conflict

Status: **FIXED**

### H-05 Reference semantics ambiguity

Risk:
Reference could be implemented as ordinary composited Layer despite product intent.

Corrected:

- Reference is Document-persistent
- not ordinary Artwork Layer tree content
- panel layout remains Workspace-persistent

Status: **FIXED**

### H-06 Workspace metadata ambiguity

Risk:
Global shortcuts/layout could be embedded in every .illustro document.

Corrected:

- document-specific View/Workspace metadata may be stored
- global shortcut/layout remains user/workspace state

Status: **FIXED**

### H-07 Localization architecture missing

Risk:
UI/Command IDs could become tied to Japanese/English display strings and require later refactor.

Corrected:

- localizable resources
- Japanese/CJK/IME layout assumption
- locale-independent command/schema IDs
- locale-aware display formatting

Status: **FIXED**

### H-08 Canvas First lacked explicit Focus Mode

Risk:
Canvas First remained a philosophy without a direct UI mechanism.

Corrected:

- Canvas Focus Mode is Core
- one-action hide/show nonessential UI
- current tool/view preserved
- touch-accessible exit

Status: **FIXED**

## 5. Important medium findings corrected

- Selection default mode fixed to Replace
- Fill default source fixed to Auto: Reference Layers when designated, otherwise Current Layer
- Autosave / Recovery default fixed to ON
- Reference manipulation Cancel/Undo defined
- 旧Region automatic remapのUndo設計は撤回。Lineart Layer固有のUndoは未設計
- Layer visibility Undo defined
- Layer inline rename fixed as Primary
- Recent Color History scope fixed to Workspace/local
- Pointer interruption stable-prefix rule defined
- Brush cursor behavior defined
- Mask interaction added
- Select All / Deselect / Reselect added
- System Clipboard made optional rather than mandatory
- Quick Menu guaranteed visible on-screen entry
- Shortcut setting Undo explicitly separated from Artwork History

## 6. Product-priority consistency

### Intuitive operation

Aligned:

- direct manipulation
- context UI
- visible Quick Menu entry
- press-to-bind shortcuts
- Fill modes unified
- selection/transform Apply/Cancel
- reference direct manipulation
- device-specific access paths

No current P0 rule requires deep settings for high-frequency operation.

### Ease of use

Aligned:

- strong defaults
- New Document immediately drawable
- first stroke can recover from empty Layer tree
- keyboard not required on touch devices
- optional high-end APIs have fallbacks

### Lightness / responsiveness

Aligned at design level:

- pay-for-use
- inactive advanced features near-zero recurring cost goal
- mutable active transactions / immutable published revisions
- lazy Lineart Layer analysis/ICC/codec/effects
- hot/cold History
- adaptive workers/language/backend
- GPU cache not canonical

Still **not benchmark-verified**.

### Feature richness

Broad feature catalog exists and conventional core omission audit added Clipboard, Focus Mode, localization and selection commands.

Advanced behavior remains deliberately tracked rather than silently assumed.

## 7. Architecture / Interaction consistency

No known P0 hard contradiction remains between:

- PRODUCT_SPEC
- FEATURE_SPEC
- Architecture v0.2
- Performance Policy
- Device Capability ADR
- Interaction Model
- P0 feature interaction specs

Important consistent boundaries:

### Canonical vs Derived

Artwork meaning is not defined by GPU cache or UI preview.

### Undo vs Save vs Recovery

Remain separate concepts.

### Selection vs Lineart Layer — design reset

Remain separate concepts.

### Reference vs Artwork Layer

Remain separate.

### Workspace vs Document

Global preferences are not accidentally document semantics.

### Visual UI vs Interaction

Visual design may choose layout/appearance but may not redefine Commit/Cancel/Undo/default semantics.

## 8. Device consistency

Core P0 interactions have non-keyboard/non-hover paths.

Optional capabilities that are not allowed to be a single point of failure:

- WebGPU
- SharedArrayBuffer
- direct file picker
- stylus
- pressure
- tilt
- hover
- physical keyboard
- PWA install

Same .illustro semantics are intended across PC/Tablet/Phone.

Actual device runtime remains **UNVERIFIED**.

## 9. Persistence and data-loss review

Design protections currently include:

- recovery journal
- verified generation activation
- partial write not treated as valid generation
- published revision save snapshot
- continuous recovery rather than unload-only
- mobile hidden/process-kill assumptions
- storage pressure prioritizes canonical data over cache
- concurrent working session isolation
- external file modification conflict handling where detectable
- Clipboard Cut copies successfully before source removal

Still requires fault-injection tests.

## 10. Conventional feature omission review

Core omissions found and fixed:

- Clipboard
- Drag & Drop semantics
- Select All / Deselect / Reselect
- Canvas Focus Mode
- Brush Cursor
- Localization infrastructure
- Document close/open/place behavior

Remaining conventional/specialized areas are explicitly tracked:

- Pixel Art exact workflow
- export/metadata details
- physical print scope
- gesture/mouse/pen binding customization
- Vector/Text advanced interaction
- advanced filters
- asset conflict/versioning
- Navigator multi-view

No claim of exhaustive final-feature completeness is made until these backlog areas are resolved.

## 11. Remaining P1/P2 interaction work

Tracked in:

`docs/interaction/REMAINING_INTERACTION_BACKLOG.md`

Main P1:

- Dynamic Wet Media
- Vector
- Text
- Guides/Rulers/Shapes/Gradients
- Blend If
- Adjustment/Live Filters
- Healing/Patch/Clone
- Macro/Automation
- Asset Library
- Gesture/Input bindings
- Workspace layout details
- export compatibility UI
- Pixel Art specialized behavior

P2:

- Navigator/Multi-view details
- Work Time UI
- physical print scope
- selected presentation/theme details

## 12. Prototype/benchmark blockers

Still intentionally unresolved:

- Tile Size
- Main vs Worker realtime placement
- TS vs WASM kernel placement
- WebGPU/compat crossover
- cache budgets
- Lineart Layer extraction / connection decisions
- Brush stabilizer coefficients
- PRNG implementation
- ICC library
- exact Blend math/compatibility
- journal batching cadence
- .illustro physical encoding/compression

These are not documentation defects; they require evidence.

## 13. UI readiness gate

### Core painting UI

**PASS for dedicated UI design/prototype.**

Reason:
Interaction designer no longer needs to invent major core behavior.

### Full advanced-product UI

**NOT PASS for finalization.**

Reason:
P1 advanced feature interaction specs are still open.

### UI generation constraint

When UI generation starts, the dedicated UI design skill must be used.

The UI design must consume:

1. PRODUCT_SPEC
2. FEATURE_SPEC
3. INTERACTION_MODEL
4. relevant docs/features specification
5. Device Capability ADR
6. Performance Policy

and must not fill semantic gaps silently.

## 14. Implementation readiness gate

### Architecture prototype

**READY**

### Production implementation

**NOT READY**

Required first:

- P0 architecture benchmarks
- representative PC/Tablet/Phone tests
- UI design/interaction validation
- fault tests for persistence/recovery
- performance measurements

## 15. Audit conclusion

The specification set is now materially stronger than before the audit.

The most important change is not document volume; it is that unknowns are now separated into four explicit classes:

1. **Defined core behavior**
2. **Visual UI decision**
3. **Prototype/benchmark decision**
4. **P1/P2/Future backlog**

This prevents implementation or UI generation from silently inventing product behavior.

Current judgement:

> **Core product/architecture/interaction design is sufficiently precise to proceed to measured architecture prototypes and dedicated core-UI design.**

But:

> **The full Illustro specification is not yet “finished”; advanced feature interaction and real runtime performance remain open by design.**
