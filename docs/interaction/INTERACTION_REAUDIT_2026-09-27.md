# Interaction Precision Re-audit — 2026-09-27

> Stage: after P0 interaction remediation  
> Result: **Core interaction baseline PASS / Full-product interaction INCOMPLETE**  
> Scope: Product, Feature, Architecture, Device, Performance, Interaction, and P0 feature specifications

## 1. What was inspected

- PRODUCT_SPEC
- FEATURE_SPEC
- FEATURE_CATALOG
- Architecture v0.2 + ADRs
- Performance Policy/Audit
- Device Capability ADR/Audit
- Interaction Model
- P0 feature interaction specs including Clipboard
- Keyboard Shortcut detailed spec
- Source-of-truth hierarchy
- Requirement IDs
- persistence classifications
- device access paths
- performance/pay-for-use rules

## 2. Structural checks

### Requirement IDs

FEATURE_SPEC contains **210 requirement IDs**.

Result:
- duplicate IDs: **0**
- unique IDs: **210**

### Source hierarchy

No hard contradiction remains in the documented hierarchy:

PRODUCT_SPEC
→ FEATURE_SPEC
→ INTERACTION_MODEL
→ individual feature interaction spec
→ visual UI spec
→ implementation.

### Old audit state

INTERACTION_GAP_AUDIT_2026-09-27.md is retained as the pre-remediation record.

Its P0 grades should not be treated as current after this re-audit.

## 3. Corrective work completed

### Document / Canvas

Added:
- New/Open/Place distinction
- initial editable Raster Layer
- multiple document behavior
- explicit close Save/Discard/Cancel
- empty layer tree behavior
- default Fit view
- mobile termination/recovery distinction

Current grade: **A-**

### Input / Brush

Added:
- pen/touch arbitration
- stable-prefix behavior on pointer cancellation
- temporary eraser
- temporary eyedropper
- one stroke = one Undo
- no-target auto paint-layer behavior
- device fallback

Current grade: **A-**

### Layers

Added:
- new layer placement
- selection/multiselect
- reorder commit/cancel
- clipping / alpha lock
- mask creation/edit/apply
- grouping
- rename
- empty layer tree
- delete/duplicate/merge
- canvas direct select
- device mapping

Current grade: **A-**

### Color

Added:
- current color behavior
- temporary eyedropper
- reference sampling
- sampling domain
- Workspace Recent Colors
- palette safety
- device mapping

Current grade: **A-**

### Smart Fill

Added:
- unified modes
- default Auto reference source
- gap behavior
- Region Updating/Ambiguous interaction
- long-running cancellation
- stale job handling
- selection interaction
- Undo grouping

Current grade: **A-**

### Selection / Transform

Added:
- Replace default
- Add/Subtract/Intersect
- selection persistence
- transform active state
- Apply/Cancel
- no silent tool-switch commit
- device mapping
- active selection native persistence

Current grade: **A-**

### Region / Linked Coloring

Added:
- explicit source configuration
- user-visible Current/Updating/Ambiguous states
- manual correction
- conservative tracking
- auto-remap causal History grouping
- separate manual resolution Undo
- performance/pay-for-use

Current grade: **A-**

### Reference Workspace

Added:
- add/move/scale/rotate/pin/group
- commit/cancel
- direct eyedropper
- normal Command History undo
- Document persistence vs Workspace panel state
- device mapping

Current grade: **A-**

### History / Snapshot / Layer Comp

Added:
- concept separation
- branch behavior
- Snapshot restore safety
- Layer Comp semantics
- timelapse read-only behavior
- cold history loading constraints

Current grade: **A-**

### Quick Menu / Search

Added:
- explicit discoverable on-screen entry on every device
- activation acceleration paths
- stable user-pinned items
- disabled reason
- customization
- search-driven command/shortcut assignment

Current grade: **A-**

### Keyboard Shortcuts

Press-to-bind, conflicts, multiple bindings, event-derived storage, reserved keys, touch-device alternatives are specified.

Current grade: **A**

### Clipboard / Cross-document

Initial audit missed a conventional core-editing area: Copy/Cut/Paste.

Added:
- Internal Clipboard independent of System Clipboard
- Copy / Cut / Paste / Copy Merged / Paste in Place
- Native cross-document payload
- System Clipboard optional bridge
- Desktop Drag & Drop semantics
- Device-independent access
- Cut/Paste Undo behavior

Current grade: **A-**

### Localization / Internationalization

Initial audit found no explicit localization architecture.

Added:
- localizable UI resources
- Japanese/CJK layout and IME assumptions
- stable locale-independent command/schema IDs
- locale-aware display formatting separated from canonical values

Current grade: **A-**

### Save / Recovery

Added:
- Autosave/Recovery default ON
- working-protection state
- Save vs Save As vs Recovery distinction
- save/export cancellation
- latest unambiguous recovery default restore
- conflict choice
- corruption/storage pressure behavior
- mobile background safety

Current grade: **A-**

## 4. Cross-spec contradictions found and corrected

### Reference entity placement

Old ambiguity:
- Layer list could be read as Reference being a normal artwork layer.

Correction:
- Reference is Document-persistent but independent from normal composited artwork Layer tree.

### Workspace metadata in .illustro

Old ambiguity:
- could imply global shortcuts/layout must be embedded in every document.

Correction:
- only document-specific Workspace/View metadata may be stored.
- global shortcuts/global layout remain user/workspace settings.

### Active Selection persistence

Clarified:
- active selection can be restored in native .illustro/recovery
- it does not affect normal image export.

### Empty layer tree

Clarified:
- empty tree is valid
- first Raster Brush stroke creates a Raster Layer in the same user-intent group.

### Region automatic remap history

Clarified:
- high-confidence automatic remap is causally grouped with the source Lineart edit.
- later manual ambiguity resolution is separate.

## 5. Interaction decisions intentionally left to visual UI design

These are not semantic gaps.

Examples:

- radial vs grid Quick Menu appearance
- exact iconography
- panel dimensions
- bottom sheet vs popover visual composition
- colors/typography
- exact animation
- location of Context UI within safe ergonomic constraints
- exact factory canvas preset numeric dimensions
- exact default Quick Menu keyboard key

These must be decided using the dedicated UI design skill.

## 6. Decisions intentionally left to prototype/benchmark

These are not UI gaps.

- tile size
- worker placement
- TypeScript/WASM split
- pointerrawupdate profile
- cache budgets
- region thresholds
- exact brush stabilization coefficients
- exact default brush preset tuning
- exact performance numeric targets
- ICC implementation library
- transform kernels

They must be decided from measurements/current official specifications, not UI intuition.

## 7. Remaining interaction gaps

Not blocking the core painting shell, but blocking final UI for those features:

- Dynamic Wet Media
- Vector editing
- Text editing
- Guides/Rulers/Shapes/Gradients
- Blend If detailed interaction
- Adjustment/Live Filter editing
- Healing/Patch/Clone
- Macro/Automation
- Asset Library
- Navigator/Multi-view
- Work Time
- Gesture customization
- advanced Workspace layout
- per-feature Accessibility QA
- file compatibility/loss-report UI

Tracked in REMAINING_INTERACTION_BACKLOG.md.

## 8. UI readiness judgment

### Core painting UI

**READY FOR DEDICATED UI DESIGN**

Meaning:
- interaction semantics are sufficiently constrained
- UI designer should not need to invent core behavior

### Full advanced product UI

**NOT YET READY FOR FINAL DESIGN**

Reason:
- P1/P2 advanced feature interaction backlog remains.

### Implementation

**NOT YET PRODUCTION-READY**

Reason:
- architecture performance prototype/benchmark remains required
- UI visual design is not yet generated/validated

## 9. Precision conclusion

The previous state was strong at product/architecture level but uneven at interaction level.

After remediation, the core workflow now has a coherent chain:

Product intent
→ capability requirement
→ architecture
→ interaction semantics
→ device behavior
→ persistence
→ performance policy.

The remaining unknowns are now explicitly classified as one of:

- Visual UI decision
- Prototype/benchmark decision
- P1/P2 feature interaction backlog
- Future scope

No major known P0 interaction uncertainty remains after the current audit. Exact visual choices and benchmark-derived constants remain intentionally open.
