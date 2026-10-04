# Illustro 1–12 Feature System Integration — 2026-10-04

> Status: **CANONICAL CROSS-FEATURE INTEGRATION BASELINE**
> Branch: `design/feature-integration-2026-10-04`
> Scope: user-facing feature families 1–12, reachability, cross-feature semantics, completion gate
> Authority: PRODUCT_SPEC > REDESIGN_PRINCIPLES / CREATION_PROXIMITY_PRINCIPLES > accepted Architecture V2 / Interaction specs / UI Gate E > this integration baseline > older draft proposals
> Important: this document integrates existing accepted decisions. It does not authorize Production implementation by itself.

## 0. Purpose

This document closes the 2026-10-04 pass over the following twelve feature families:

1. Brush / Eraser / Smudge / drawing
2. Fill / coloring
3. Selection
4. Transform / Liquify
5. Layers / Groups / Masks / compositing
6. Lineart Region / persistent region
7. Color
8. Rulers / guides / snapping
9. Vector / shape / text
10. Adjustments / filters / retouch
11. Canvas / view
12. History / save / recovery / import / export

The goal is not to declare every algorithm implemented. The goal is to make the product specification internally consistent so that a capability cannot be considered product-complete while the user has no reliable route to use it.

## 1. Conflict-resolution rules

When earlier 1–12 discussion conflicts with accepted Illustro specifications:

1. Preserve the higher-authority accepted behavior.
2. Keep the useful intent of the newer proposal when it can be expressed without violating the accepted model.
3. Do not add a new permanent panel or sidebar merely because a feature needs settings.
4. Do not silently promote an uncatalogued idea to Required/Core.
5. Prefer one shared semantic command/value over duplicate states in separate UI surfaces.
6. Prefer non-destructive/group-level semantics over destructive per-child baking when the visible result and editability can both be preserved.
7. Keep advanced/inactive capability pay-for-use; it must not tax the normal brush hot path.

## 2. Canonical interaction shell

### 2.1 Left = universal access root

The accepted Left UI remains the universal route to all user-facing capability.

Default pinned rail:

1. Brush
2. Eraser
3. Smudge / Blend
4. Eyedropper
5. Smart Fill
6. Selection
7. Transform
8. Move
9. All Features — fixed bottom entry

Pins 1–8 are customizable/reorderable. All Features is always present and does not move.

All Features category order remains:

CREATE:
1. 描画
2. 塗り・色・Region
3. 選択・変形
4. ベクター・文字・図形
5. 定規・ガイド

STRUCTURE / EDIT:
6. レイヤー・合成
7. 補正・フィルター・修復
8. 資料・アセット
9. 履歴・自動化

CANVAS / APP:
10. キャンバス・表示
11. ドキュメント・編集・出力
12. ワークスペース・設定

No new feature family introduced by this document creates a thirteenth discovery category.

### 2.2 Canvas = primary manipulation surface

Spatial operations are manipulated on Canvas first:

- Transform handles
- crop frame
- guide / vanishing-point handles
- gradient handles
- shape handles
- Region correction strokes
- Liquify brush
- selection gestures
- reference manipulation

Numeric controls remain precision supplements.

### 2.3 Context Surface = smallest current-operation controls

The current Tool/Mode exposes only the smallest useful set. Examples:

- Brush: preset / size / opacity
- Fill: mode / source / tolerance / gap / region mode
- Selection: selection method / Replace-Add-Subtract-Intersect / edge controls
- Transform: mode / interpolation / flip / Apply / Cancel
- Liquify: mode / size / strength / Apply / Cancel

Context Surface is not a duplicate full settings panel.

### 2.4 Right Workspace = settings and state

The accepted twelve Right Boxes remain:

1. Layers & Compositing
2. Color
3. Brush
4. Properties / Inspector
5. Reference
6. Assets
7. Effects & Adjustments
8. Navigator & View
9. History & Progress
10. Automation
11. Document
12. Workspace

New functionality is projected into these existing Boxes or Context Surface. A dedicated permanent “Region”, “Transform”, “Guide”, “Text”, etc. thirteenth Box is not created.

The Right Workspace remains directly width-resizable from its Canvas-facing edge, with Box resize/reorder/detach behavior preserved.

### 2.5 Fixed right-bottom command strip

The accepted fixed order remains:

1. Layer Page
2. Undo
3. Redo
4. Horizontal Flip
5. Vertical Flip

It never scrolls, never reorders, and view flips are not Artwork History.

### 2.6 Layer Page

Layer Page remains the expanded presentation of the same Layer model, not a second layer system.

It owns the high-density layer tree and high-frequency layer controls while synchronizing immediately with Layers Box, Inspector and Canvas-direct layer selection.

### 2.7 Quick Controller / Hex presentation

Core semantics remain a six-slot stable spatial command surface. The semantic command model must not depend on a geometric shape.

Current Illustro product presentation target is the previously selected **donut/hex-style six-button controller**:

- appears when summoned / after pen-up according to the active interaction profile;
- stays out of the way during active drawing;
- supports the current 30-degree presentation orientation;
- factory profile places Undo on the leftmost slot and Redo on the rightmost slot;
- six user slots are customizable/reorderable;
- a user-set slot never silently moves because context changed.

If a future measured interaction test replaces the visual shape, that requires an explicit UI spec revision; implementation must not silently substitute another form.

## 3. Product-completion gate

A user-facing feature is **not product-complete** merely because its engine or algorithm passes tests.

All of the following are required:

1. **Engine/semantic correctness** — underlying operation is correct.
2. **Reachability** — a documented user route exists from Left/Canvas/Right/Search/Quick Controller as appropriate.
3. **Complete interaction** — start, configure, preview where needed, commit, cancel/back are defined.
4. **State integration** — target layer/group/selection/Region semantics are defined.
5. **Undo/Redo** — one meaningful user action maps to understandable history behavior.
6. **Persistence** — native save/recovery restores the promised state.
7. **Device completeness** — no keyboard/hover/right-click is the only essential route on touch devices.
8. **Performance** — inactive feature cost is bounded and active use meets the feature's latency budget.
9. **Error behavior** — stale/ambiguous/unsupported/resource-limit states do not silently corrupt artwork.
10. **Validation** — automated checks plus real-device/user-visible validation where the feature is visual or interaction-sensitive.

Internal foundations may be labeled “Foundation complete” while their product-facing integration remains incomplete. These labels must never be conflated.

---

# 4. Integrated feature family 1 — Drawing / Brush

## Canonical user routes

- Left Pinned Rail: Brush / Eraser / Smudge
- Left All Features → 描画: complete drawing capability
- Context Surface: current preset, size, opacity and immediate controls
- Right Brush Box: presets, search/organization, stabilization, dynamics and deep editing
- Assets Box: Brush Tip / Texture / Paper resources
- Quick Controller: user-pinned high-frequency brush commands

## Required behavior retained

- Brush Foundation is the shared basis for Brush and Eraser where meaningful.
- Pressure / tilt / azimuth / twist / velocity / direction / time / random may feed brush parameters according to supported device capability.
- Tip, grain/texture, spacing, rotation, scatter, flow, opacity, taper and dynamics remain part of the brush model.
- Brush presets are searchable and user-creatable.
- Stabilization offers simple everyday levels while deep configuration remains available.
- Smudge / Blend is a first-class drawing family, not an afterthought.
- Transparent-color style erase may be exposed as a drawing accelerator, but it does not replace the Eraser family.
- Clone / Healing / Patch belong to the accepted repair/drawing tool universe where cataloged; they are reached through All Features and may be pinned.

## Corrections to the earlier draft

- Do not create a standalone permanent “Brush Studio” outside the accepted UI architecture. Deep Brush editing opens/focuses the Brush Workspace/PiP or an editor projected from it.
- “Blur brush” is not automatically a new default Left pin. It may live as Smudge/Blend mode or repair/effect capability depending on semantics.
- Brush settings shown in normal painting UI stay minimal; advanced values remain progressive disclosure.

## Completion evidence

Brush Foundation pass is necessary but not sufficient. At least G-pen, round/nib pen, technical pen, pencil, marker, hard eraser and soft eraser must be reachable from product UI and pass real drawing tasks before the corresponding product feature set is complete.

---

# 5. Integrated feature family 2 — Fill / Coloring

## Canonical user routes

- Left Pinned Rail: Smart Fill
- Left All Features → 塗り・色・Region
- Context Surface: Fill mode, source, tolerance, gap, boundary expansion, Region mode
- Right Color / Inspector as deeper configuration surfaces
- Region model is shared through Shared Region Resolver; no separate incompatible flood-fill engine

## Canonical Fill Family

Required accepted modes remain:

- Flood Fill
- Region Fill
- Enclose and Fill
- Trace and Fill
- Drag Fill
- Continuous Fill

These are modes of one Fill family, not unrelated top-level tools.

## Reference-source semantics

Accepted Auto behavior remains authoritative:

- if designated Reference Layer(s) exist, Auto uses them;
- otherwise Auto uses Current Layer.

Auto must show what it is using. The earlier idea of silently guessing “the most lineart-like layer above” is rejected as default behavior.

Explicit sources include:

- Current Layer
- Visible Composite
- Selected Layers
- Reference Layers
- Region Model

Folder/Group reference is supported through the same selected/reference source semantics; the group is not flattened destructively.

## Gap / boundary handling

- Gap Closing never rewrites source lineart.
- virtual bridges retain provenance.
- conservative default; strong closure is never silently forced.
- boundary Expand/Contract remains available.
- Lineart Region may bypass repeated color-tolerance topology search when a valid current Region exists.

## Interaction accelerators

- drag/continuous fill = one meaningful Undo step per gesture.
- on-canvas threshold/tolerance scrub may be provided as an accelerator, but the value must also be reachable through ordinary controls.
- “paint vs erase result” may be exposed as a Fill output variant; it does not create a separate incompatible region engine.

---

# 6. Integrated feature family 3 — Selection

## Canonical routes

- Left Pinned Rail: Selection
- Left All Features → 選択・変形
- Context Surface: selection method, Replace/Add/Subtract/Intersect, edge controls
- Inspector: deep selection properties
- Canvas: direct selection gestures

## Required selection methods

Accepted baseline:

- Rectangle
- Ellipse
- Freehand
- Polygon
- Color / Similarity
- Luminance / Color Range
- Region
- Layer Content

Required operations:

- Replace
- Add
- Subtract
- Intersect
- Invert
- Feather
- Expand
- Contract
- save/load named selection mask

Selection persists through ordinary Tool switches until explicit Deselect.

## Shared resolver

Region/Color-based selection shares Region Resolver source/boundary semantics with Fill, then freezes the result into selection coverage. Selection coverage and Persistent Region identity remain separate concepts.

## Additional candidates kept non-canonical for now

The 2026-10-04 discussion identified:

- Selection Brush
- Magnetic / edge-following lasso

They remain **Investigate candidates** until added to FEATURE_CATALOG/FEATURE_SPEC with acceptance requirements. They are not silently promoted to Required by this integration.

---

# 7. Integrated feature family 4 — Transform / Liquify

## Canonical routes

- Left Pinned Rail: Transform and Move
- Left All Features → 選択・変形
- Canvas: handles / direct manipulation
- Context Surface: mode, interpolation, snap, Apply, Cancel
- Inspector: precise numeric controls / target properties

## Required modes

- Move
- Scale
- Rotate
- Flip
- Free Transform
- Perspective / Distort
- Warp
- Liquify
- interpolation selection

Puppet deformation remains **Investigate**, because it was not in the accepted catalog at this integration point.

## Folder/Group semantics — corrected

A selected Group/Folder is a first-class transform target.

Default semantics for Group Transform / Group Liquify:

- preserve child layers, masks, clipping relations and type information;
- attach/use a group-level transform/effect operation over the group's composed result where semantics permit;
- child edits remain possible and continue to feed the group-level result;
- avoid applying a destructive resample independently to every child as the default.

This directly satisfies the “select a folder and apply to everything inside” requirement while retaining editability and visual consistency.

Explicit bake/rasterize remains available when required by an unsupported effect, but is a separate destructive action and must not occur silently.

## Selection × Group

An active selection may limit the transformed portion of a Group. The group structure still remains intact unless the user explicitly bakes the result.

## Session contract

- pointer-up does not end the entire Transform session;
- multiple adjustments may occur before Apply;
- Cancel restores the pre-session Revision exactly;
- one committed session = one meaningful Undo step;
- repeated preview drag never cumulatively resamples the previous preview.

## Liquify

At minimum retain Push / Expand / Pinch / Twirl-style operations plus local smooth/reconstruct behavior where supported by the final Liquify implementation.

The exact public mode set is calibrated during implementation; no uncatalogued mode is declared Required solely by this document.

---

# 8. Integrated feature family 5 — Layers / Groups / Masks / Compositing

## Canonical routes

- Right Layers Box = persistent compact view
- fixed bottom Layer Page button = expanded layer-management page
- Left All Features → レイヤー・合成
- Canvas-direct layer selection
- Inspector for type-specific deep properties

## Required model

Layer types include at least:

- Raster
- Vector
- Group
- Mask
- Adjustment
- Filter
- Text

Lineart/Region data may be represented/associated according to Region architecture without creating a second incompatible layer tree.

## Required operations

- multi-select
- reorder
- search/filter
- color tags
- lock types
- Solo / Isolate
- collapse
- duplicate
- merge / merge visible
- Flatten Copy
- clipping / alpha lock
- layer/group mask
- direct Canvas selection

## Group = first-class target

A Group may be the target of:

- Move / Transform / Liquify
- visibility / opacity / blend
- mask
- non-destructive adjustment/filter
- reference participation
- selection from visible content
- duplicate
- export
- supported layer styles/effects

Operations act at Group level where possible rather than destructively rewriting every child.

## Drawing while non-drawable target is selected

Do not silently paint into an arbitrary child.

Integration policy:

- if an already-defined valid “last drawable target” is available in the current context, product UI may offer/restore it explicitly;
- otherwise starting a Raster Brush in a context with no valid drawable target creates a new Raster Layer at the nearest valid insertion point as one user-intent transaction, consistent with Document Lifecycle;
- implementation must make the active draw target visible.

The exact no-prompt accelerator may be calibrated during runtime validation, but arbitrary hidden child selection is prohibited.

---

# 9. Integrated feature family 6 — Lineart Region

## Core definition retained

Lineart Region is not a vector-line display layer.

The system models:

Evidence → Boundary → Gap/Virtual Boundary → Topology → Region → Stable Identity → Assignment

The source visible lineart remains separate from persistent region/topology data.

## User routes

- Left All Features → 塗り・色・Region → Lineart Region
- Region-related Fill/Selection routes from Smart Fill / Selection
- Context Surface during Region correction
- Inspector/Color projections for Region properties and coloring
- no permanent thirteenth Right Box

## Required behavior

- closed-region detection
- gap tolerance using non-destructive virtual boundaries
- stable opaque Region identity where possible
- adjacency
- Region Selection / Fill
- user overrides
- Updating / Ambiguous / Unresolved states
- persistent assignment / lineart-linked coloring
- user correction preserved across recalculation where reconcilable
- demand-driven/incremental work; normal Brush hot path never waits for topology analysis

## Human correction

The simple normal correction interaction remains:

- connect
- separate/suppress

More structural merge/split/identity repair may exist in advanced controls.

The implementation must retain provenance so automatic recalculation cannot silently erase manual decisions.

## Transform integration

Affine/group transforms propagate Region lineage/geometry without unnecessary full re-analysis.

Warp/Liquify may require reconciliation; invalid/ambiguous topology is surfaced rather than treated as silently valid current data.

---

# 10. Integrated feature family 7 — Color

## Canonical routes

- Right Color Box = primary color workspace
- Left Pinned Rail: Eyedropper
- Left All Features → 塗り・色・Region
- Context/Quick Controller accelerators where configured

## Required baseline

- Color Picker
- Canvas Eyedropper
- Reference Eyedropper
- Color History
- Palette
- Palette import/export
- practical HSV/HSL/RGB controls
- color management architecture / ICC readiness
- soft proof and gamut warning per FEATURE_SPEC

Existing input-control standard remains authoritative: fast spatial adjustment + exact entry where both are useful.

## Palette organization

Project palette and reusable library palette may be presented separately while both remain the same semantic asset/value model where practical.

Region- or layer-scoped recent/used-color views are accepted as a productivity enhancement if implemented without making Region analysis a permanent background cost.

## Additional candidate status

- Color Harmony remains Required/Investigate per catalog.
- Color Match to a reference image remains Investigate; it is not promoted to Required here.

---

# 11. Integrated feature family 8 — Rulers / Guides / Snapping

## Routes

- Left All Features → 定規・ガイド
- user may pin frequently used guide/ruler tools
- Canvas = guide creation/manipulation
- Inspector = precise guide properties
- Navigator/Document may expose view-related guide state where appropriate

## Required baseline from catalog

- Straight / Parallel Ruler
- 2D Grid
- Isometric Grid
- Perspective Guide with 1/2/3-point support
- Symmetry / Mirror
- Radial Symmetry
- Guide Snapping

## Unified rule

“Show guide” and “snap/assist drawing” are independent states.

Snapping is shared across compatible Brush / Shape / Transform operations; each tool does not invent a separate incompatible perspective model.

A temporary snap bypass/invert accelerator may exist, but the standard toggle must remain reachable without keyboard-only input.

## Advanced candidates

Curvilinear/fisheye perspective and other specialist rulers remain Investigate unless already promoted in the catalog.

---

# 12. Integrated feature family 9 — Vector / Shape / Text

## Routes

- Left All Features → ベクター・文字・図形
- direct Canvas creation and node/handle editing
- Inspector for precise properties and typography
- Layers/Layer Page for entity/layer organization
- Brush rendering may be reused on vector paths where supported

## Vector / Shape required baseline

- Path / anchor / Bezier handle
- open/closed path
- fill / stroke
- node add/delete/convert
- smooth/simplify
- Boolean operations
- variable-width illustration-oriented stroke
- Vector Eraser
- Rasterize
- Region-boundary integration
- Line / Rectangle / Ellipse / Polygon / post-stroke shape correction
- vector-backed editable Shape

QuickShape-style post-stroke correction is represented by the accepted “post-stroke shape correction” capability and does not need a separate parallel shape engine.

## Text required baseline

- editable Text entity until explicit conversion/rasterization
- horizontal and vertical Japanese text
- family/style/weight/size
- alignment
- tracking
- line height
- baseline
- color
- font import where platform permits
- missing-font state
- Text → Vector/Path

Ruby/furigana and path-text are valuable candidates but are **Investigate** unless separately added to the canonical catalog. This integration does not silently make them Required.

---

# 13. Integrated feature family 10 — Adjustments / Filters / Retouch

## Routes

- Left All Features → 補正・フィルター・修復
- Right Effects & Adjustments Box = persistent stack/editor
- Inspector = target-specific properties
- Layers = Adjustment/Filter entities and masks
- Canvas = spatial handles for effects that have spatial meaning

## Required non-destructive model

- Adjustment Layer
- Filter Layer
- live/re-editable parameters where applicable
- enable/bypass
- mask
- reorder where semantics permit
- opacity/blend where supported
- compare/preview
- explicit bake/rasterize as a separate destructive action

## Required core adjustment/filter sets

Use FEATURE_CATALOG as authority, including the accepted core set such as:

- Brightness/Contrast
- Levels
- Curves
- Hue/Saturation
- Color Balance
- B&W / Invert / Posterize / Threshold
- Gradient Map
- Gaussian/Motion/Radial Blur
- Sharpen / Unsharp Mask
- Noise
- Median-family
- Pixelate/Mosaic
- Halftone
- Offset / displacement where cataloged

Clone / Healing / Patch remain repair tools in this family/tool universe.

## Group semantics

Effects applied to a Group affect the group result while preserving children. Per-child baking is not the default.

## Performance

Live filters may cache derived results. Heavy inactive filters must not run continuously merely because their UI exists.

---

# 14. Integrated feature family 11 — Canvas / View

## Routes

- gesture/direct Canvas navigation
- Right Navigator & View Box
- Right Document Box for document/canvas properties
- Left All Features → キャンバス・表示
- fixed bottom Horizontal / Vertical Flip
- current top-level Home/Save shell remains a separate document-level route where present

## View state

Must remain distinct from artwork:

- Pan
- Zoom
- Rotate View
- Horizontal Flip View
- Vertical Flip View
- Fit to Screen
- 100% / pixel-equivalent inspection
- Navigator
- focused/canvas-dominant mode
- reference workspace

View flip/rotation do not create Artwork History steps.

## Document-changing canvas operations

Remain explicit and separate:

- Canvas Resize
- Image Resize
- Crop
- resolution/print metadata where supported

Canvas frame and stored Raster extent remain separate in Architecture V2. Off-canvas/overscan artwork is preserved until an explicit destructive operation.

The earlier “non-destructive crop” idea is therefore represented through this existing frame/extent separation; no second crop subsystem is added.

## Display performance

Visible tiles/viewport work is prioritized. High-cost hidden UI and offscreen analysis may not steal the Brush realtime budget.

---

# 15. Integrated feature family 12 — History / Save / Recovery / Import / Export

## Routes

- fixed bottom Undo / Redo
- Right History & Progress
- Right Document
- Left All Features → 履歴・自動化
- Left All Features → ドキュメント・編集・出力
- existing top Save/Home shell remains valid as a high-frequency document route
- Command Search/shortcuts call the same semantic commands

## Required conceptual separation

Never conflate:

- logical commit
- Artwork History
- recovery protection
- Autosave
- explicit Save
- Save As / portable project output
- image Export

“Protected” is not the same as “Saved”.

## Required save/recovery behavior

- Autosave/recovery protection default ON
- immutable/fixed Revision snapshot used for Save/Export
- drawing may continue while encoding
- cancel/failure never destroys current Document or last successful Save
- no full-project rewrite for every stroke
- crash recovery keeps session streams separate
- recovered state does not immediately overwrite Last Good save
- external/concurrent modification is never silently overwritten when detectable
- corruption never becomes zero-filled “normal” artwork
- storage pressure is surfaced before protection becomes impossible where detectable

## History

- one meaningful action = one understandable history unit
- view navigation is not Artwork History
- Undo/Redo navigate Revision roots
- undo then edit may form a branch internally
- Snapshot/Checkpoint is Core per catalog
- History Panel is Required
- Snapshot compare is Required
- Snapshot branch is Required/Investigate
- session-spanning history is allowed where persistence cost and correctness remain bounded; it is not promised merely by keeping RAM state

## Import / Export

Required/candidate status follows FEATURE_CATALOG:

- native .illustro
- PNG / JPEG / WebP
- OpenRaster (.ora)
- TIFF
- PSD Import/Export = high-priority Investigate
- SVG / OpenEXR = Required/Investigate
- AVIF/HEIF = Investigate

Export is from a fixed Revision and does not mutate the Document unless explicitly requested.

Folder/Group may be exported as a first-class target where the output format supports the requested result.

Compatibility loss must be reported; Illustro-specific Region/History/Effect semantics are never silently claimed to survive formats that cannot represent them.

---

# 16. Cross-feature invariants

## 16.1 Group-first semantics

Single layer, multi-selection and Group are all normal operation targets where mathematically/semantically valid.

Group support is not implemented as “flatten first”.

## 16.2 Shared Region Resolver

Fill, Region-based Selection, lineart-linked coloring and compatible brush constraints share resolver semantics so the same artwork does not produce contradictory boundaries in different tools.

## 16.3 Selection != Region

Selection is editable coverage/mask state. Region is persistent topology identity. They may interoperate but are not the same entity.

## 16.4 One semantic value

Slider, numeric field, on-canvas scrub, shortcut, Context control and detached Box all manipulate one value/state, never divergent copies.

## 16.5 Non-destructive first, bake explicit

Transform, Filter, Adjustment, Gradient and compatible group effects prefer re-editable state when feasible. Bake/rasterize is explicit and undoable.

## 16.6 Preview sessions

Destructive/preview-heavy tools use a session:

Start → live preview → Apply or Cancel.

Cancel restores the pre-session state exactly. Tool switch does not silently Apply unless explicitly specified by that tool.

## 16.7 Pay-for-use

Inactive Region analysis, PSD codecs, advanced filters, Wet Media, ICC transforms, asset scans and other advanced systems do not run continuously without need.

## 16.8 No hidden-only feature

A product-facing Required/Core feature must have:

- Left/Canvas/Right/Search/Quick route;
- touch-accessible operation;
- error/disabled reason when unavailable.

A capability with no user route is implementation substrate, not a completed product feature.

---

# 17. Corrections made to the 2026-10-04 1–12 drafts

The following earlier draft ideas are explicitly corrected:

1. **Standalone per-feature panels** → removed; use canonical Left/Context/Right Box/Layer Page architecture.
2. **Folder Liquify by destructively warping every child** → replaced by first-class Group-level operation preserving children.
3. **Fill Auto silently guesses likely lineart layer** → rejected; accepted Reference Layer → Current Layer Auto policy retained.
4. **Hex geometry hard-coded into Core** → rejected; Core stays six-slot semantic controller, current UI presentation remains the selected hex/donut profile.
5. **Every advanced option shown in normal UI** → rejected; progressive disclosure and Right Box/PiP retained.
6. **Lineart Layer treated as visible vector linework** → rejected; Region topology remains structural data separate from visible lineart.
7. **New dedicated Region Right panel** → rejected; Region controls project into Context / Inspector / Color.
8. **Every speculative competitor feature made Required** → rejected; uncatalogued Magnetic Lasso, Puppet, Ruby, Color Match remain Investigate.
9. **Save = Autosave = Recovery** → rejected; existing Persistence V2 separation retained.
10. **Crop implemented by immediately deleting off-canvas pixels** → rejected as default; Architecture V2 frame/extent separation retained until explicit destructive trim.
11. **UI flip treated as image transform** → rejected; fixed bottom flip controls are View state.
12. **Brush Foundation pass implies brush product completion** → rejected; product-completion gate requires reachable presets, real interaction and persistence integration.

---

# 18. Competitor-reference policy for implementation

Every major feature implementation/revision must consult current official documentation for at least the relevant subset of:

- CLIP STUDIO PAINT
- ibisPaint
- Procreate
- Krita
- Adobe Photoshop when relevant

Rules:

- copy proven interaction ideas/parameter structure when they are better;
- do not invent a different workflow merely for originality;
- do not claim unpublished internal algorithms;
- distinguish documented behavior from Illustro implementation choice;
- if a major competitor has a materially better workflow, Illustro must either adopt/improve it or document why not.

---

# 19. 1–12 reachability matrix

| Family | Primary entry | Immediate controls | Deep controls/state | Canvas role |
|---|---|---|---|---|
| 1 Drawing | Left Brush/Eraser/Smudge | Context | Right Brush / Assets | draw |
| 2 Fill | Left Smart Fill | Context | Color / Inspector | tap/drag/enclose |
| 3 Selection | Left Selection | Context | Inspector | select gesture |
| 4 Transform | Left Transform/Move | Context | Inspector | handles/liquify |
| 5 Layers | Right Layers + Layer Page | layer quick properties | Layer Page / Inspector | direct select |
| 6 Region | All Features / Fill/Selection | Context | Inspector / Color | inspect/correct |
| 7 Color | Right Color + Eyedropper | Color Context | Right Color | eyedropper |
| 8 Guides | All Features / pin | Context | Inspector | place/edit guides |
| 9 Vector/Text/Shape | All Features | Context | Inspector / Layers | create/edit |
| 10 Effects | All Features | effect Context | Right Effects / Layers | spatial handles |
| 11 Canvas/View | gestures + fixed flips | transient | Navigator / Document | navigation |
| 12 History/Save | fixed Undo/Redo + Save route | status | History / Document | none/direct status |

Command Search remains the complete discovery fallback for all user-facing capability.

---

# 20. Integration acceptance checklist

The 1–12 specification pass is considered integrated only if:

- all Required/Core catalog items map to a discovery category or system/internal designation;
- no new permanent Right Box is required;
- Layer Page and bottom five-button strip remain unchanged;
- Right Workspace width-resize/customization remains intact;
- current Hex Quick Controller presentation does not alter command semantics;
- group/folder target semantics are defined for Transform, Effects, selection-from-content, reference and export;
- Fill/Selection/Region share resolver semantics;
- selection and Region identity remain separate;
- view-state commands never enter Artwork History;
- save/recovery labels never overstate durability;
- unsupported interchange features produce explicit compatibility reporting;
- speculative 2026-10-04 additions are marked Investigate rather than silently promoted;
- every feature family has a complete user route.

## 21. Remaining validation status

This document completes the **cross-feature semantic integration pass**.

It does **not** claim:

- runtime implementation complete;
- UI Gate E visual/runtime PASS;
- Region benchmark complete;
- Brush Foundation product integration complete;
- PSD compatibility complete;
- real-device interaction validation complete.

Those remain separate implementation/validation gates.

What is now closed is the specification-level question:

> “If Illustro implements the accepted feature set, where does it live, how does it interact with the rest of the app, and what prevents an engine from being called complete while the user cannot use it?”

The answer is defined by this integration baseline plus the higher-authority canonical documents.
