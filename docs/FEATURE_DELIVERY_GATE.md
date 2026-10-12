# Illustro Feature Delivery Gate

> Status: **CANONICAL FEATURE-COMPLETION CONTRACT**
> Date: 2026-10-04
> Applies to: every user-facing Illustro feature
> Related: FEATURE_SYSTEM_INTEGRATION_2026-10-04.md, DESIGN_COMPLETION_GATE.md, UI_GATE_E.md

## 1. Why this gate exists

A feature is not complete merely because an algorithm, engine, test page or internal API works.

Illustro must prevent this failure:

> “The implementation passed, but the user has no practical way to reach or use the feature.”

Therefore every user-facing feature carries two independent completion dimensions:

- **Foundation/Engine completion**
- **Product Feature completion**

A foundation may pass while the product feature remains incomplete.

## 2. State model

### F0 — Defined

Purpose, target, operation semantics and dependencies are specified.

### F1 — Engine verified

Underlying operation is implemented and verified against its technical acceptance criteria.

This state does not imply a user route exists.

### F2 — Reachable

At least one canonical route exists and is documented through the accepted Illustro interaction shell:

- Left Pinned Rail / All Features
- Canvas direct manipulation
- Context Surface
- Right Workspace Box / Layer Page
- Quick Controller
- Command Search / shortcut as an accelerator

Keyboard/hover/right-click alone is never sufficient for touch-targeted functionality.

### F3 — Interaction complete

The complete user sequence exists:

1. enter
2. identify/choose target
3. configure
4. preview where needed
5. apply/commit
6. cancel/back
7. understand success/error state

No dead-end UI is allowed.

### F4 — Document integrated

The feature has defined and verified behavior for relevant:

- Layer / Group / multi-selection
- Selection / Region
- mask / clipping
- Undo / Redo
- native save / recovery
- import/export loss reporting where relevant

### F5 — Runtime validated

The feature passes:

- automated correctness checks;
- performance/resource checks, including the applicable Feature Cost Contract and the cross-feature performance resolution;
- device-appropriate interaction checks;
- visual/user-visible verification where result quality is visual;
- regression checks against affected subsystems.

### COMPLETE — Product feature complete

Only F0–F5 may be called “complete” for a user-facing product feature.

## 3. Required completion record

Every completed feature must have a short record containing:

- Feature name / semantic ID
- Feature family
- engine evidence
- primary user entry
- alternate discovery route
- target semantics
- Context controls
- deep settings location
- Apply/Cancel behavior
- Undo unit
- save/recovery state
- error states
- tested devices/input types
- regression scope
- unresolved limitations

If any item is not applicable, record “N/A” with reason rather than omitting it.

## 4. Reachability rules

### 4.1 No hidden-only Required/Core capability

If FEATURE_CATALOG marks a user-facing capability Core/Required, one of the canonical visible/discoverable routes must exist.

Internal engines may remain route-less only when explicitly classified System/Internal.

### 4.2 Search is fallback, not an excuse

Command Search may provide complete discovery, but a very high-frequency operation must also have an appropriately short route.

### 4.3 No duplicate semantics

If the same value appears in Context, Right Box and detached PiP, all controls edit one semantic value.

### 4.4 No accidental new permanent panel

A feature must use the accepted Right Box taxonomy unless the taxonomy itself is explicitly revised.

## 5. Cross-feature target gate

Before a feature is Product Complete, define behavior for the targets that logically apply:

- single Raster layer
- Vector/Text/object when supported
- multiple selected layers
- Group/Folder
- active Selection
- Region
- mask
- clipping stack

Unsupported targets must show a reason; silent no-op is a failure.

## 6. Preview / destructive-operation gate

Transform, Crop, Liquify, destructive Filter, major Region remap and similar tools require:

- immutable/pre-session starting state;
- live preview that does not cumulatively degrade from previous preview frames;
- explicit Apply;
- explicit Cancel;
- exact Cancel restore;
- one meaningful committed history action.

Tool switching must not silently commit unless the specific tool contract explicitly states so.

## 7. Group/Folder gate

Where an operation conceptually applies to a Group:

- Group is treated as a first-class target;
- child structure is preserved by default;
- destructive “flatten then edit” is not the default implementation;
- mask/clipping/child editability is retained where semantics permit;
- Bake/Rasterize is explicit.

This specifically applies to Transform/Liquify and non-destructive Effects/Adjustments.

## 8. Region gate

Fill / Region Selection / lineart-linked coloring / compatible constraints must use shared Region Resolver semantics.

The feature fails the gate if:

- it silently uses stale Region generation as current;
- it collapses Selection and Region identity into one concept;
- it overwrites manual Region correction during auto-reanalysis without reconciliation;
- it blocks ordinary Brush latency while unused.

## 9. Save / Recovery gate

A feature that changes persistent document state is not Product Complete until native save/recovery can reconstruct the promised state.

Do not claim persistence merely because pixels look correct before reload.

Test reopen/recovery for:

- layer/group hierarchy
- parameters
- masks
- Region identity/assignment
- Text/Vector editability
- effect stack
- transform metadata
- asset/resource dependencies

where applicable.

## 10. User-visible quality gate

Visual features require human-visible validation.

Examples:

- brush feel and tip quality
- Fill leakage / gap behavior
- Liquify quality
- Region closure/correction
- Filter result
- guide/snapping predictability
- text layout
- transform interpolation

Automated PASS alone is insufficient for a final visual quality claim.

## 11. Performance gate

Validation uses realistic worst cases, not only minimal demos.

Feature-specific examples:

- large brush / long stroke
- large Canvas
- many layers
- Group effect
- large-radius blur
- dense Region topology
- large selection
- save during editing
- undo spill
- high-DPI and pen input

Inactive advanced features must remain near-zero persistent cost.

## 12. Completion wording policy

Allowed precise wording:

- “Brush Foundation F1: engine verified”
- “Smart Fill F3: interaction complete; persistence not yet verified”
- “Liquify F5/Product Complete”

Disallowed ambiguous wording:

- “Fill complete” when there is no UI route
- “Save safe” when crash recovery was not tested
- “PSD supported” when compatibility loss is unknown
- “Region fixed” based only on one fixture

## 13. 1–12 application

This gate applies uniformly to:

1. Drawing
2. Fill
3. Selection
4. Transform/Liquify
5. Layers
6. Lineart Region
7. Color
8. Guides
9. Vector/Shape/Text
10. Adjustments/Filters
11. Canvas/View
12. History/Save/Recovery/Import/Export

No family is exempt.
