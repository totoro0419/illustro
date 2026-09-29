# Illustro Right Workspace — Box Taxonomy Candidate V2

> Status: **CANDIDATE TAXONOMY V2 / GENERAL-UI RESEARCH APPLIED / USER REVIEW PENDING**
> Date: 2026-09-29
> Scope: PC / tablet right magnetic Workspace/PiP
> Related: [Left UI — Canonical Specification](LEFT_UI_SPEC.md)
> General UI research: [Right Workspace — General UI Research](RIGHT_WORKSPACE_GENERAL_UI_RESEARCH.md)
> Default layout: [Right Workspace — Default Layout & Collapse](RIGHT_WORKSPACE_DEFAULT_LAYOUT.md)
> Parent: [UI Gate E](UI_GATE_E.md)

## 1. Role

The right side is the **Workspace / Inspector side**.

It is responsible for:

- detailed properties/settings;
- artwork structure/state management;
- persistent auxiliary workspaces;
- deep editing systems that should not crowd the Left UI.

All semantic Right Boxes are represented in the Right Workspace. Information density is reduced primarily by **collapsing Boxes**, not by removing capability from the workspace.

The Left UI remains the universal navigation root. A Left entry may deep-link to a specific Right Box and section.

The right side must not become one giant miscellaneous inspector. Boxes are grouped by coherent work purpose.

Undo / Redo are fixed right-side commands (and may also exist in the enabled Quick Controller). They are **not a detachable Box**.

## 2. External interaction evidence

Major applications commonly separate tools from dockable property/workspace panels.

Relevant official evidence includes:

- Photoshop panels can dock, undock, group, stack, resize and be saved as a workspace.
- Krita Dockers include Layers, color selectors, Brush Presets, Reference Images, Snapshot and Undo History, and their arrangements can be saved as Workspaces.
- Illustro uses this as interaction evidence only; its magnetic PiP model is its own design.

## 3. Proposed Box set

### R1 — Layers & Compositing

Primary purpose:

> Manage document structure and layer-level compositing.

Contains:

- Raster / Vector / Text / Adjustment / Filter layer creation
- Group
- Mask / Vector Mask
- layer tree
- Multi-select
- Drag Reorder
- Search
- Filter
- Color Tag
- Lock types
- Solo / Isolate
- Collapse
- Clipping
- Alpha Lock / Lock Transparency
- Alpha inheritance / clipping-equivalent
- Blend Mode
- Painting Blend Modes where layer-relevant
- Duplicate
- Merge
- Merge Visible
- Flatten Copy
- Rasterize Vector
- Layer Comps
- Layer Style / Effect attachment summary
- Canvas-direct Layer selection state / reveal

Does not contain:

- full Vector node editing -> Properties / Inspector
- full Text typography -> Properties / Inspector
- full Adjustment/Filter editor -> Effects & Adjustments

### R2 — Color

Primary purpose:

> Choose, organize and reason about color while painting.

Contains:

- Color Picker
- HSV / HSL / RGB controls
- Color History
- Palette
- Palette Import / Export
- Color Harmony
- Smart Color Assist
- Base Color candidates
- Palette candidates
- adjacent-color harmony assistance
- Region Recolor entry/results
- Shadow / Highlight suggestions
- Color Temperature controls where used as painting assistance

Cross-links:

- Reference Eyedropper
- Grayscale Preview
- Soft Proof
- Out-of-Gamut Warning

The canonical advanced color-management configuration remains in Document.

### R3 — Brush

Primary purpose:

> Select and configure the current mark-making engine/preset.

Contains:

- Brush Presets
- Brush search / organization
- user-created Brush
- Brush Size / Opacity
- Stabilization / Smoothing
- Pressure / Tilt / Azimuth mappings
- Brush Dynamics
- Dynamics Curve / Range / Invert
- Procedural Brush
- Texture-based Brush Input
- Dynamic Wet Media controls
- paper / grain / particle / texture
- relevant Smudge / Blend parameters
- relevant Eraser parameters when using shared Brush Engine

The same Brush assets may also appear in Asset Library. They reference the same asset IDs.

### R4 — Properties / Inspector

Primary purpose:

> Show detailed controls for the current Tool, selection or Canvas entity without creating a separate Box for every tool.

This is the main load absorber for the Left UI.

Context sections include:

#### Smart Fill / Region

- Fill mode
- Gap Closing
- Gap Tolerance
- Boundary Expand / Contract
- reference source
- Multi-layer / Lineart Reference
- Color Difference Tolerance
- Region follow strength / conditions
- Lineart-linked Coloring parameters

#### Selection

- Add / Subtract / Intersect
- Feather
- Expand / Contract
- selection/mask properties

#### Transform

- transform mode
- Flip
- interpolation
- Warp / Perspective / Liquify relevant parameters
- preview Apply / Cancel state

#### Vector

- Stroke Width
- Fill / Stroke
- node / path properties
- variable-width stroke controls
- relevant Boolean/Simplify/Smooth actions

#### Text

- Horizontal / Vertical
- Font Family / Style / Size
- Tracking
- Line Height
- Baseline
- missing font status
- path/area-text properties when supported

#### Gradient

- gradient type
- Editable Stops
- dithering
- non-destructive state

#### Guide / Ruler

- Snap
- Visibility / Lock
- guide-specific properties
- preset/save controls

#### Reference item

- position/state properties for the selected Reference entity

Inspector behavior:

- default mode: **Follow Context**;
- optional mode: **Lock Context** to keep the current target while Canvas/tool selection changes;
- header shows the current target/context path;
- local property search/filter is available;
- selection/tool changes update an open unlocked Inspector, but never auto-open a closed Inspector;
- context changes never steal keyboard focus;
- deep-links from Left/Search reveal the exact section predictably.

Lock Context is Workspace state, not Artwork state.

### R5 — Effects & Adjustments

Primary purpose:

> Build and edit non-destructive image/layer processing.

Owns the **non-destructive effect/adjustment stack**, including:

- Adjustment Layer creation/list
- Filter Layer creation/list
- Live Blur
- Live Color Adjustment
- Core Adjustment Set
- Core Live Filter Set
- Blend If equivalent
- Displacement
- Filter enable/disable
- Filter masking
- Filter reorder
- Filter opacity / blend
- Layer Style stack:
  - Stroke
  - Drop / Inner Shadow
  - Outer / Inner Glow
  - Color / Gradient / Pattern Overlay
  - Bevel / Emboss
- destructive Apply entry only as an explicit alternative

Detailed parameters of the currently selected effect/adjustment are shown primarily in **Properties / Inspector**. This avoids two competing parameter editors.

Healing / Patch / Clone remain Canvas Tools; their current Tool options also belong in Inspector.

### R6 — Reference

Primary purpose:

> Manage live visual references used while drawing.

Contains:

- Reference list
- multiple References
- Reference Groups
- Pin
- Scale / Rotate
- Horizontal Flip
- Grayscale
- Always on Top
- Temporary Hide
- persistence state
- Reference Eyedropper affordance/status

Direct manipulation on Canvas remains primary where spatial.

### R7 — Assets

Primary purpose:

> Browse and organize reusable resources.

Contains:

- 2D Asset Library
- Brush Assets
- Brush Tip / Texture
- Paper Texture
- Pattern
- Gradient Preset
- Color Palette Asset
- Macro Asset
- Workspace Asset
- Reference Set
- Shape Preset
- Folder / Collection / Tag
- Search / Favorite / Recent
- Asset Import / Export

Asset-type-specific editing routes to the owning Box, e.g. Brush asset -> Brush.

### R8 — History & Progress

Primary purpose:

> Inspect and manage the evolution of the current artwork.

Use distinct tabs/sections; do not merge the concepts semantically.

#### Undo History

- command history
- Undo / Redo history inspection

#### Snapshots

- Snapshot create
- compare
- branch

#### Timelapse

- creation-history-based Timelapse
- UI-free output
- high-resolution export
- frame pace

#### Work Time

- Session
- Today
- Total
- Average

Layer Comps remain in Layers because they are layer-state sets, not document-history checkpoints.

### R9 — Automation

Primary purpose:

> Create and manage reusable command sequences.

Contains:

- Auto Actions / Macros
- Action Recording
- Parameterized Action
- Macro Presets

Cross-actions:

- assign shortcut -> dedicated Settings surface
- add/register to Quick Controller -> Quick Controller customization surface

Macro assets are browsable from Assets but edited/recorded here.

### R10 — Navigator & View

Primary purpose:

> Observe and navigate the artwork without changing its semantic content.

Contains:

- Navigator thumbnail
- current viewport indicator
- Zoom / Pan navigation affordances
- Multi-view entry/state
- Seamless Tile preview entry/state
- Grayscale Preview
- Soft Proof
- Out-of-Gamut Warning

Canvas Flip / Rotate View remain commands/tools that can be invoked from Left/Quick Controller; this Box may reflect their view state where useful.

### R11 — Document

Primary purpose:

> Manage current-document properties that are deeper than normal painting workflow.

Contains:

- Document Metadata
- Canvas Resize
- Image Resize
- Crop properties when relevant
- native document status
- save/recovery status and applicable settings
- Color Management / ICC
- bit depth
- Embedded ICC Profile
- Profile Conversion / Display Transform
- Wide Gamut
- CMYK policy/editing where supported
- Rendering Intent / Black Point Compensation
- format/export configuration entry

File pickers and OS-level import/export flows are not forced into a PiP Box.

### R12 — Workspace

Primary purpose:

> Configure the **current workspace layout**, not global application preferences.

Contains:

- magnetic Box layout controls
- Box resize / reorder / hide controls
- Workspace Save / Load
- Workspace Presets
- Left / Right UI mirror
- Reset Workspace Layout
- Left UI layout/customization entry
- Quick Controller profile/layout entry

Application-global settings such as:

- keyboard shortcut editor;
- custom gestures;
- stylus/input defaults;
- UI/text accessibility defaults;
- Reduced Motion;
- language/locale;
- extension/plugin management

belong to a dedicated **Settings surface**, reachable from Left/Search/top-level application controls.

This Box is secondary and should not be part of the default always-open painting workspace.

## 4. Fixed bottom command strip

A compact fixed strip lives at the **bottom of the Right UI**.

It contains exactly five primary buttons:

1. **Layer Page**
2. **Undo**
3. **Redo**
4. **Horizontal Flip** (左右反転)
5. **Vertical Flip** (上下反転)

These five controls are outside the collapsible/magnetic Box stack and remain visible independently of Box expansion state.

Undo / Redo call the same semantic commands used by History and the optional six-slot Quick Controller.

Horizontal / Vertical Flip are Canvas-view commands and do not create duplicate command semantics.

### Layer Page

Layer Page is a special surface and is **not the same UI container as the Layers & Compositing Box**.

However, both operate on the same Layer model and the same semantic layer commands.

Baseline distinction:

- **Layers Box** — compact, always-present workspace representation suitable for normal painting;
- **Layer Page** — expanded layer-management surface opened by the fixed bottom Layer Page button.

The two surfaces may expose substantially the same layer capabilities. They must share:

- selection;
- ordering;
- visibility/lock state;
- groups/masks/clipping;
- blend/compositing state;
- search/filter/tag state where applicable;
- layer commands and history semantics.

No separate Layer Page data model or duplicate layer-command implementation is allowed.

The exact geometry of Layer Page is a later Right-UI design decision.

## 5. Box ownership summary

| Box | Primary ownership |
|---|---|
| Layers & Compositing | artwork structure, masks, blend, layer states |
| Color | picking, palettes, harmony, coloring assistance |
| Brush | presets and brush-engine configuration |
| Properties / Inspector | current tool/entity parameters |
| Effects & Adjustments | non-destructive corrections, filters, styles |
| Reference | live reference images |
| Assets | reusable resources |
| History & Progress | undo history, snapshots, timelapse, work time |
| Automation | macros/actions |
| Navigator & View | viewport/navigation/diagnostic views |
| Document | document properties/color management/save state |
| Workspace | workspace layout/preset/reset configuration |

## 6. Left UI load transfer

The Left UI remains the universal route, but it should **not duplicate every Right-side property as a browsable standalone row**.

Recommended transfer:

### Move the detailed browsing burden to Right Boxes

Instead of showing every property in the Left category tree, Left may expose the owning destination.

Examples:

- `描画 -> Brush Settings` -> R3 Brush
- `塗り・色・Region -> Fill Settings` -> R4 Inspector / Fill section
- `選択・変形 -> Transform Settings` -> R4 Inspector / Transform section
- `ベクター・文字・図形 -> Text Properties` -> R4 Inspector / Text section
- `定規・ガイド -> Guide Properties` -> R4 Inspector / Guide section
- `レイヤー・合成 -> Layers` -> R1
- `補正・フィルター・修復 -> Effects & Adjustments` -> R5
- `資料・アセット -> Reference` -> R6
- `資料・アセット -> Assets` -> R7
- `履歴・自動化 -> History / Snapshot / Timelapse` -> R8
- `履歴・自動化 -> Automation` -> R9
- `キャンバス・表示 -> Navigator` -> R10
- `ドキュメント・編集・出力 -> Document Properties` -> R11
- `ワークスペース・設定 -> Workspace` -> R12
- global input/accessibility/language/shortcut settings -> dedicated Settings surface

### Exact-setting search remains available

The shared Left/Search index may still find exact properties such as:

- Gap Tolerance
- Transform Interpolation
- Tracking
- Rendering Intent

Selecting such a search result deep-links to the owning Right Box and reveals the exact section.

Therefore:

> **Left keeps reachability; Right carries detail density.**

This preserves the user's requirement that all capability has a Left route while preventing All Features from becoming a 300-row settings tree.

## 7. Box interaction baseline

All Boxes are coherent semantic units.

All 12 semantic Boxes have a persistent presence in the Right Workspace registry and are available from the Right side.

Primary density control is **collapse / expand**.

Where applicable Boxes may also be:

- reordered;
- magnetically docked;
- detached;
- re-docked;
- resized;
- pinned.

A detached Box remains the same registered Box; detach does not create another semantic instance.

Do not use ordinary hide/remove as the primary way to manage normal Right-UI density.

### Magnetic movement contract

Dragging a Box header:

- shows the intended insertion/snap destination before commit;
- commits only on release;
- Escape cancels;
- invalid drops return to the previous position;
- keyboard **Move Box...** provides an equivalent non-drag path.

Baseline docking is a vertical stack. Magnetic movement does **not** semantically merge unrelated Boxes into arbitrary user-created tab groups.

### Recovery

Each Box provides **Reset Location**.

The Workspace provides **Reset Workspace Layout**.

### Open/focus semantics

Invoking a Box from Left/Search:

- closed -> open;
- docked/open -> focus/reveal;
- detached/open -> bring forward;
- off-screen -> restore into a visible safe area.

Repeated invocation does not toggle the Box closed.

### Header baseline

Keep permanent header chrome sparse:

- short title;
- current context indicator where relevant;
- collapse/expand;
- detach/re-dock;
- More.

Low-frequency actions such as Reset Location, Hide, and Inspector Lock Context live under More unless later testing justifies promotion.

Do not fragment individual sliders or tiny property groups into separate PiP windows.

A Box may contain tabs/sections only when they share one clear work purpose.

## 8. Recommended distinction: persistent vs contextual

### Default expansion profile

Canonical baseline is fixed in [RIGHT_WORKSPACE_DEFAULT_LAYOUT.md](RIGHT_WORKSPACE_DEFAULT_LAYOUT.md).

Expanded by default:

- Layers & Compositing
- Color
- Brush

Collapsed by default:

- Properties / Inspector
- Reference
- Assets
- Effects & Adjustments
- Navigator & View
- History & Progress
- Automation
- Document
- Workspace

All Boxes remain present. This is an expansion-density distinction, not a visibility/removal distinction. User changes persist as Workspace state.

## 9. General professional-UI rules now applied

- Canvas remains the primary content region.
- Each Box has one clear work purpose.
- Inspector follows context by default but can be locked.
- Selected effect/layer/reference detail may flow into Inspector rather than duplicating editors.
- flexible layout always has Reset Location / Reset Workspace recovery.
- Box relocation has a keyboard path and visible drop preview.
- focus order follows logical Box order; focus alone never changes document/tool context.
- tablet may use a more overlay-oriented projection while preserving Box identity.
- collapsed/hidden Boxes must be near-zero recurring work.

## 10. UIimprove checks

Applied design constraints:

- high-frequency work is not hidden solely to make the UI minimal;
- each Box has one comprehensible work purpose;
- contextual settings use Inspector rather than creating many small panels;
- exact settings remain searchable/deep-linkable;
- pointer/pen/touch/keyboard entry cannot depend solely on hover/right click;
- detached/docked state does not change command semantics;
- closing a Box does not make its capability undiscoverable because Left/Search can restore it;
- runtime/visual validation remains pending.

## 11. Current recommendation

Proceed with these **12 semantic Box types** as the Right Workspace candidate taxonomy.

The twelfth Box is now **Workspace**, not a catch-all Workspace & Input panel. Global application settings use a dedicated Settings surface.

The most important architectural decisions are:

1. keep Layers, Color and Brush independent;
2. introduce one contextual Properties / Inspector Box;
3. keep Effects separate from generic Properties;
4. keep Reference separate from the generic Asset Library;
5. group Undo History / Snapshot / Timelapse / Work Time in one History & Progress Box using distinct tabs;
6. keep Automation separate from History;
7. move detailed setting density from Left browsing into Right Boxes while preserving Left deep links/search;
8. use Inspector context-path + Follow/Lock Context;
9. require Reset Location / Reset Workspace Layout;
10. keep Box headers sparse and drag operations previewable/reversible;
11. avoid arbitrary semantic tab-merging of unrelated Boxes.

Default vertical order and default expanded/collapsed state are now fixed by `RIGHT_WORKSPACE_DEFAULT_LAYOUT.md`.

Remaining Right-UI design work:

- Layer Page geometry/behavior;
- Box header/control anatomy;
- magnetic detach/reorder behavior;
- minimum/maximum sizing;
- tablet projection details beyond the shared semantic order.
