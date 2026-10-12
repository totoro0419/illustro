> Classification: EXPERIMENTAL / supporting historical UI detail. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Illustro Input Design Completion Report — 2026-09-30

> Status: **IMPLEMENTATION-PREPARATION INPUT SEMANTICS COMPLETE**  
> Production implementation: **LOCKED**  
> PR #6 remains Draft.  
> This is **not** a production runtime/accessibility PASS.

## 1. Result

The input-method design phase is closed for the current Illustro feature scope.

The closure was checked against:

- `docs/FEATURE_CATALOG.md`;
- `docs/FEATURE_SPEC.md`;
- all 14 accepted specifications under `docs/features/*.md`;
- `docs/ui/UI_INPUT_CONTROL_STANDARD.md`;
- the UI Implementation Quality semantic audit already performed on 2026-09-30.

## 2. Catalog-wide coverage

- Feature Catalog rows checked: **326**
- Coverage Matrix rows: **326**
- Missing rows: **0**
- Extra rows: **0**
- Duplicate row mappings: **0**
- **UNMAPPED: 0**

Classification:

- INPUT: 196
- DIRECT: 43
- COMMAND: 27
- SENSOR: 3
- STATUS: 5
- SYSTEM: 34
- POLICY: 13
- PRODUCT: 1
- DEFERRED-FEATURE: 4

Every current-scope input-bearing feature therefore has either a canonical primitive, a documented composite, or an explicit direct-manipulation/command contract.

## 3. Primitive integrity

Every primitive identifier referenced by the coverage matrix exists in the Input Control Standard.

New closure primitives added during this pass:

- **C10** — selectable collection / tree / timeline;
- **T4** — custom gesture binding capture;
- **T5** — hardware/stylus input binding.

Undefined primitive references: **0**.

## 4. FEATURE_SPEC cross-check

`FEATURE_SPEC.md` contains **220** requirement headings.

All requirement domain prefixes are recognized by the input/system coverage model.

Unknown requirement domains: **0**.

This is a domain-level cross-check in addition to the feature-by-feature Catalog matrix.

## 5. Accepted interaction-spec cross-check

All 14 current `docs/features/*.md` specifications were inspected.

The lines most likely to look like unresolved input semantics were concentrated in:

- Brush stroke-cancel gesture;
- touch long-press eyedropper;
- multi-document tabs/windows presentation;
- Quick Menu default gesture/button;
- Reference grayscale sampling and fullscreen/overlay presentation;
- Recovery candidate choice.

These are now explicitly closed:

- Gesture/long-press/default button questions are optional accelerator or device-prototype decisions, not missing Core routes.
- Multi-document switching uses **C10 + explicit New/Open/Close commands** regardless of tabs/list/sheet presentation.
- Reference grayscale sampling, if exposed, uses an explicit two-choice control.
- Reference presentation mode uses a small exclusive choice while the set remains small.
- Recovery uses **C10 candidate selection + explicit consequence commands**.
- Custom gesture and hardware assignments use **T4 / T5**.

Remaining wording such as “candidate”, “prototype”, or “検証” in those documents refers to presentation/default gestures/algorithm behavior, not an unidentified input method.

## 6. What is fixed now

The implementation team no longer needs to invent the interaction pattern for:

- continuous, wide-range, signed, interval, discrete and linked numeric values;
- Brush Size/Opacity/Flow/Stabilization and Dynamics;
- physical sensor mapping;
- Color Picker and exact color models;
- Selection / Transform / Crop;
- Gradient / Curves / Levels;
- Layers / Documents / History / Recovery collections;
- Region / Linked Coloring;
- Smart Fill and candidate-based Assist;
- Vector / Text / Shape / Guide controls;
- Adjustment / Filter / Layer Style;
- References;
- Timelapse / Work Time;
- Assets / Search / Reorder / Import;
- Keyboard shortcut, custom gesture and pen-button binding;
- Workspace / accessibility settings;
- Save / Export / conflict resolution.

## 7. What remains intentionally unfixed

Only evidence-dependent **values, capability sets, or future-feature scope** remain open.

Examples:

- Brush Size min/max/default and nonlinear transfer curve;
- normal/fine/coarse step sizes;
- stabilization coefficients/algorithm set;
- Region confidence thresholds;
- Gap Closing/tolerance numeric ranges;
- final color-space/profile capability set;
- transform interpolation algorithm set;
- filter-specific parameter ranges;
- Timelapse preset values;
- device-specific hit-area/layout metrics;
- Quick Menu default accelerator;
- codec/export-specific limits.

The authoritative list is `docs/ui/UI_INPUT_DEFERRED_VALUES.md`.

These do **not** represent missing input methods.

## 8. Change-control rule

Before Production UI implementation:

1. a new Feature Catalog item must receive a coverage mapping;
2. a new input primitive requires UI Implementation Quality review;
3. changing a numeric bound/default does not reopen semantic input design;
4. semantic input design is reopened only if prototype/runtime evidence finds a concrete usability, accessibility, reachability, precision or performance defect.

## 9. Verification boundary

This completion statement applies to **implementation-preparation design and traceability**.

Still UNVERIFIED until implementation/runtime work:

- real screen-reader behavior;
- touch assistive technology;
- real stylus/coarse-pointer behavior;
- software-keyboard occlusion;
- final PC/tablet/compact responsive surfaces;
- live-preview latency/performance;
- application-level history/transaction integration.


## 10. Post-closure visual customization requirement

A later user requirement clarified that Workspace customization must be **visually obvious and directly manipulable**, not merely semantically reachable through commands.

The input-design closure was therefore re-opened for this narrow requirement and re-closed without introducing a new semantic primitive.

Resolved in:

- `WORKSPACE_VISUAL_CUSTOMIZATION_SPEC.md`;
- `RIGHT_WORKSPACE_INTERACTION_SPEC.md`;
- `RIGHT_UI_SPEC.md`;
- `UI_INPUT_CONTROL_STANDARD.md`.

The Right Workspace width now explicitly requires a visible/direct resize affordance, live preview, a touch/pen-safe grip, and a non-drag Resize route. Structural customization uses an explicit Customize Workspace mode with temporary handles, Done/Cancel and Workspace-only layout Undo/Redo.

This does not change the Production-lock or runtime-verification boundary.
