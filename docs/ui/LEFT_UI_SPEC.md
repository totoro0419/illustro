# Illustro Left UI — Canonical Specification

> Status: **SEMANTIC / INTERACTION DESIGN COMPLETE — VISUAL & RUNTIME VALIDATION PENDING**
> Date: 2026-09-29
> Scope: PC / tablet Left UI
> Authority: PRODUCT_SPEC → REDESIGN / CREATION PROXIMITY → Interaction Model → UI Gate E → this specification
> Coverage appendix: [LEFT_UI_ACCESS_COVERAGE.md](LEFT_UI_ACCESS_COVERAGE.md)
> Supporting detail: [LEFT_PINNED_RAIL_SPEC.md](LEFT_PINNED_RAIL_SPEC.md)
> Tool universe: [LEFT_TOOL_SURFACE_OPTIONS.md](LEFT_TOOL_SURFACE_OPTIONS.md)

## 1. Product role

The Left UI is the **universal access root** for all user-facing Illustro capability.

It is not merely a toolbox.

The Left UI has two simultaneous jobs:

1. **Speed** — frequently used actions remain in stable positions on the Pinned Rail.
2. **Completeness / discovery** — every user-facing capability remains reachable through All Features, category browsing, or the shared search index.

Deep settings are not rendered inside the Rail. A Left UI entry may activate a Canvas Tool/Mode, execute a semantic Command, or open/focus the corresponding right magnetic Workspace/PiP.

Internal engines, automatic behavior and Future features do not receive fake UI entries.

## 2. Canonical anatomy

Default edge: left.

When the existing global Left/Right UI mirror preference is enabled, the entire access surface mirrors to the opposite edge and the Workspace/PiP side mirrors correspondingly. Semantic IDs and logical Pin order do not change.

The PC/tablet structure is:

```
┌────────────────┐
│ Pinned Rail    │
│                │
│ user Pins      │
│                │
│ [Overflow]*    │  *only when needed
│ [All Features] │  fixed, non-removable
└────────────────┘
         │
         ├── Tool Family / Mode chooser
         ├── Custom Stack palette
         ├── Overflow palette
         └── All Features palette
                 │
                 ├── Search
                 └── 12 Categories
                       ├── Tool / Mode -> Canvas
                       ├── Command -> execute
                       └── Workspace / Setting -> Right PiP
```

Only one Left-anchored palette is active at a time.

## 3. Default Pinned Rail

The default is intentionally small and creation-first.

Top → bottom:

1. **Brush**
2. **Eraser**
3. **Smudge / Blend**
4. **Eyedropper**
5. **Smart Fill**
6. **Selection**
7. **Transform**
8. **Move**
9. **All Features** — fixed bottom entry

Overflow is not part of the default visible profile; it appears only when geometry requires it or the user adds more Pins.

Rationale:

- Brush/Eraser/Smudge represent direct mark making.
- Eyedropper/Fill represent high-frequency coloring.
- Selection/Transform/Move represent direct editing.
- advanced/specialized capability remains one explicit All Features action away.
- Undo/Redo are intentionally not default Left Pins because their primary routes are the right UI and optional six-button Quick Controller.

Users may completely replace/reorder the eight user Pins. All Features remains invariant.

## 4. Pin-capable objects

The Rail may contain:

- Tool Family
- individual Tool / Mode
- immediate Command
- Toggle
- Workspace/PiP opener
- Category shortcut
- supported dynamic Brush/Shape preset
- one-level Custom Stack

A Pin stores a stable semantic ID, not a display string.

Examples:

- `tool.brush`
- `tool.selection`
- `tool.selection.region`
- `workspace.layers`
- `category.layers-compositing`
- `command.canvas.flip.horizontal`
- `command.history.undo`
- `brush.preset.<id>`

Display labels remain localizable.

## 5. Rail ordering / overflow

### Stable order

The user-defined Pin sequence never changes due to:

- usage frequency
- current document
- selected layer
- current tool
- device class
- contextual suggestions

This protects spatial memory.

### Overflow

All Features always reserves its bottom slot.

If not all Pins fit, Overflow appears directly above All Features.

The Rail itself does not scroll by default.

For ordered Pins `P1 ... Pn`, if only `k` fit:

- Rail shows `P1 ... Pk`
- Overflow contains `P(k+1) ... Pn`

Viewport expansion restores hidden Pins to their original logical positions.

The system never silently evicts or reorders a Pin.

## 6. All Features entry

All Features is:

- always visible
- bottom-fixed
- non-removable
- non-reorderable
- excluded from Artwork History
- keyboard focusable
- pointer/pen/touch reachable

Icon concept is locked to **catalog / collection**, not generic ellipsis. Final artwork is deferred.

All Features opens an anchored palette adjacent to the Rail.

The palette is modeless and dismissible.

## 7. All Features home

The home contains:

1. Search field
2. three semantic groups
3. twelve categories

Exact order:

### CREATE

1. **描画**
2. **塗り・色・Region**
3. **選択・変形**
4. **ベクター・文字・図形**
5. **定規・ガイド**

### STRUCTURE / EDIT

6. **レイヤー・合成**
7. **補正・フィルター・修復**
8. **資料・アセット**
9. **履歴・自動化**

### CANVAS / APP

10. **キャンバス・表示**
11. **ドキュメント・編集・出力**
12. **ワークスペース・設定**

All Features uses text labels as well as icons. The icon-only rule applies to the compact Rail, not to the discovery palette.

On PC/tablet, category order remains the same. Geometry may adapt, but category identity/order does not.

## 8. Category semantic IDs and icon concepts

Final icon drawing is deferred, but icon **meaning** is fixed.

| Category ID | Label | Icon concept |
|---|---|---|
| `category.drawing` | 描画 | brush stroke / brush |
| `category.fill-color-region` | 塗り・色・Region | filled region / droplet |
| `category.selection-transform` | 選択・変形 | selection frame with handles |
| `category.vector-text-shape` | ベクター・文字・図形 | Bézier nodes / path |
| `category.guides-rulers` | 定規・ガイド | ruler / guide intersection |
| `category.layers-compositing` | レイヤー・合成 | stacked layers |
| `category.adjust-filter-retouch` | 補正・フィルター・修復 | adjustment sliders |
| `category.reference-assets` | 資料・アセット | reference image / library |
| `category.history-automation` | 履歴・自動化 | history arc / sequence |
| `category.canvas-view` | キャンバス・表示 | canvas frame / view |
| `category.document-output` | ドキュメント・編集・出力 | document |
| `category.workspace-settings` | ワークスペース・設定 | workspace controls / gear |

Do not use color as the only category differentiator.

## 9. Category catalog

### 9.1 描画

**Direct tools**

- Brush
- Eraser
- Smudge / Blend

**Brush / material workspace**

- Brush Preset
- Brush search / organization
- user-created Brush
- Brush Size / Opacity
- Stabilization / Smoothing
- Pressure / Tilt / Azimuth mapping where user-configurable
- Dynamics Curve / Range / Invert
- Procedural Brush
- Texture-based Brush input
- Dynamic Wet Media
- paper / particle / texture controls

Activation:

- Tools -> Canvas mode
- presets/settings -> Brush Workspace/PiP

### 9.2 塗り・色・Region

**Tools / modes**

- Smart Fill
  - Flood Fill
  - Region Fill
  - Enclose and Fill
  - Trace and Fill
  - Drag Fill
  - Continuous Region Fill
- Gradient
  - Linear
  - Radial
  - Reflected / Bilinear
  - Shape-aware
- Eyedropper
  - Canvas
  - Reference

**Fill / Region properties**

- Gap Closing
- Gap Tolerance
- Boundary Expand / Contract
- Multi-layer Reference Fill
- Lineart Reference Fill
- Color Difference Tolerance
- Lineart Region controls
- Lineart-linked Coloring
- follow strength / conditions

**Color workspace**

- Color Picker
- Color History
- Palette
- Palette Import / Export
- HSV / HSL / RGB controls
- Color Harmony
- Smart Color Assist
- Base Color candidates
- Palette candidates
- adjacent color harmony
- Region Recolor
- Shadow / Highlight assist
- Color Temperature
- overall color adjustment

### 9.3 選択・変形

**Selection modes**

- Rectangle
- Ellipse
- Freehand
- Polygonal
- Color / Similarity
- Region
- Luminance / Color Range
- Select from Layer Content

**Selection operations**

- Add
- Subtract
- Intersect
- Invert
- Feather
- Expand / Contract
- Saved Selection / Selection Mask

**Transform**

- Move / Scale / Rotate
- Free Transform
- Perspective / Distort
- Warp
- Liquify
- Flip
- interpolation

Tool/mode activation occurs on Canvas. Operations/properties use Context UI and/or Transform/Selection PiP.

### 9.4 ベクター・文字・図形

**Vector tools**

- vector/object select
- Path / Anchor / Bezier Handle editing
- node add/delete/convert
- Vector Eraser / Line Erase
- variable-width stroke edit

**Path / shape**

- Pen / Path
- Line
- Rectangle
- Ellipse
- Polygon
- post-stroke shape correction
- vector-backed Shape
- Shape Presets

**Vector commands/properties**

- stroke width / fill / stroke
- simplify / smooth
- Boolean operations
- Rasterize Vector
- Brush-like Rendering on Vector Path where available

**Text**

- Text
- Horizontal / Vertical mode
- font family / style / size
- tracking / line height / baseline
- font import / missing-font handling
- Text -> Vector / Path
- Text on Path / Area Text when available

### 9.5 定規・ガイド

- Straight / Parallel Ruler
- 2D Grid
- Isometric Grid
- Perspective Guide
- Symmetry / Mirror
- Radial Symmetry
- Guide Snapping
- Guide Visibility / Lock
- Guide Preset / Save

Guide creation/edit modes act on Canvas; persistent configuration routes to Guide/Properties PiP.

### 9.6 レイヤー・合成

**Layer types / creation**

- Raster Layer
- Vector Layer
- Group
- Mask
- Vector Mask when available
- Adjustment Layer
- Filter Layer
- Text Layer

**Organization**

- Multi-select
- Drag Reorder
- Search
- Filter
- Color Tag
- Lock types
- Solo / Isolate
- Collapse
- Canvas direct Layer selection

**Commands**

- Duplicate
- Merge
- Merge Visible
- Flatten Copy
- Rasterize Vector

**Compositing**

- Clipping
- Alpha Lock / Lock Transparency
- Alpha inheritance / clipping-equivalent
- Blend Mode
- Painting Blend Modes
- Layer Style / Effect
- Layer Comps

The canonical destination is Layers/Compositing Workspace/PiP; individual commands may be pinned or executed directly.

### 9.7 補正・フィルター・修復

**Direct retouch tools**

- Healing
- Patch
- Clone

**Non-destructive editing**

- Adjustment Layer
- Filter Layer
- Live Blur
- Live Color Adjustment
- Blend If equivalent
- Displacement
- Core Adjustment Set
- Core Live Filter Set
- Filter masking / reorder / opacity / blend
- Layer Style effects

**Commit path**

- destructive Apply remains an explicit command, not the default path.

### 9.8 資料・アセット

**Reference Workspace**

- multiple References
- free placement
- Pin
- Scale / Rotate
- Horizontal Flip
- Grayscale
- Always on Top
- Temporary Hide
- Reference Group
- persistence
- Reference Eyedropper cross-link

**Asset Library**

- Brush Asset
- Brush Tip / Texture
- Paper Texture
- Pattern
- Gradient Preset
- Color Palette
- Macro
- Workspace
- Reference Set
- Shape Preset
- Folder / Collection / Tag
- Search / Favorite / Recent
- Import / Export

### 9.9 履歴・自動化

**History**

- Undo
- Redo
- History Panel

**Snapshot**

- create
- compare
- branch

**Timelapse / Work Time**

- Timelapse
- high-resolution export
- frame pace
- Work Time / Session / Today / Total / Average

**Automation**

- Auto Actions / Macros
- recording
- parameterized action
- Macro Preset
- shortcut assignment
- Quick Controller registration

### 9.10 キャンバス・表示

- Pan
- Zoom
- Rotate View
- maximum zoom path
- Canvas Flip
- Seamless Tile Drawing
- Canvas Focus Mode
- Navigator
- Multi-view
- Grayscale Preview cross-link
- Soft Proof cross-link
- Out-of-Gamut Warning cross-link

Canvas Resize / Image Resize / Crop live canonically under Document, though Crop may also be a directly pinnable Tool.

### 9.11 ドキュメント・編集・出力

**Document**

- multiple documents
- metadata
- Crop
- Canvas Resize
- Image Resize

**Clipboard / cross-document**

- Copy / Cut / Paste
- Copy Merged
- Paste in Place
- supported system clipboard bridge
- Desktop Drag & Drop

**Save / recovery status/settings**

- native .illustro
- save / incremental save status
- recovery status/settings
- offline behavior/settings where exposed

**Import / Export**

- PNG
- JPEG
- WebP
- PSD
- OpenRaster
- TIFF
- SVG
- OpenEXR
- AVIF / HEIF where supported

**Color Management**

- Color Management / ICC
- bit depth
- embedded profile
- profile conversion / display transform
- wide gamut
- CMYK policy/editing where supported
- Soft Proof
- Out-of-Gamut Warning
- Rendering Intent / Black Point Compensation

Top bar may provide faster routes to Home/Save/document commands, but the Left UI remains a complete alternate route.

### 9.12 ワークスペース・設定

**Workspace**

- magnetic Dock/PiP layout
- panel resize / reorder / hide
- Workspace Save / Load
- Workspace Preset
- Left/Right UI mirror
- Left UI customization

**Quick Controller**

- enable/disable
- six-slot assignment / reorder
- relevant controller preferences

**Input / shortcuts**

- Keyboard Shortcut
- Custom Shortcut
- Shortcut Capture
- Gesture
- Custom Gesture
- hover/context behavior where configurable
- stylus input options

**Accessibility / feedback**

- UI / Text scaling
- Single-pointer alternatives
- Color-independent state support
- Color Description assistance
- Reduced Motion
- feedback sound / haptic where supported

**Language / extensions**

- locale / shipping language controls where exposed
- Plugin / Extension management when implemented

Performance engines, internal module boundaries and device adaptation logic are not represented as normal user commands. Diagnostics may be exposed here when implemented.

## 10. Cross-links and canonical identity

A capability may appear in more than one category when users reasonably search for it in multiple mental models.

Examples:

- Reference Eyedropper: canonical Color/Eyedropper; cross-linked from Reference.
- Soft Proof: canonical Document/Color Management; cross-linked from Canvas/View.
- Layer Style: canonical Layers/Compositing; cross-linked from Adjust/Filter.
- Crop: canonical Document; directly pinnable as a Tool.
- Undo/Redo: canonical History; may be pinned and are also exposed in the right UI / Quick Controller.

Cross-links must resolve to the same semantic ID. No duplicate state/command implementations.

## 11. Tool Family semantics

### Rail activation

Inactive Family Pin:
- activate remembered last-used mode.

Active Family Pin selected again:
- open its anchored Mode chooser.

### All Features activation

Inside All Features, selecting a Family row opens/expands the Family; it does **not** silently activate its remembered mode. This surface is optimized for discovery.

Selecting a specific mode then activates it.

### Exact vs family active indication

If both a Family and one of its modes are pinned:

- exact Mode Pin receives the primary selected indicator;
- Family Pin receives a secondary “contains active mode” indicator.

A Custom Stack containing the active item may show a small active-child marker but is not itself “selected”.

## 12. Workspace/PiP routing

Workspace/PiP Pins and category items use **open/focus** semantics.

1. closed -> open in remembered/default magnetic position;
2. open/docked -> focus;
3. open/detached -> bring/focus that instance;
4. collapsed -> focus; if the chosen target is a specific property, expand enough to reveal it;
5. off-screen after viewport/display change -> restore into visible safe area;
6. do not create duplicate instances unless that Workspace type explicitly supports them.

A Left action does not toggle a PiP closed.

When a specific setting is selected:

- open/focus the owning block;
- navigate to/scroll the relevant section;
- briefly identify the target section without relying on color alone.

This route does not enter Artwork History.

## 13. Immediate commands

Commands execute through the shared semantic command system.

Rules:

- safe immediate commands execute immediately;
- preview-bearing commands enter preview with explicit Apply/Cancel;
- destructive commands retain their confirmation/recovery contract;
- failures show actionable feedback;
- executing a command closes the Left palette unless the command opens a preview/confirmation flow.

## 14. Toggle Pins

Toggle state is shown with shape/icon/state treatment, not hue alone.

Examples:

- Guide visibility
- Alpha Lock
- Focus Mode

Disabled state remains discoverable where useful, with a reason.

## 15. Custom Stack

A Custom Stack may contain heterogeneous Pin-capable items.

Rules:

- one level only;
- Stack-inside-Stack prohibited;
- Stack activation always opens its palette;
- never auto-execute last-used child;
- stable user-defined child order;
- duplicate presence on Rail and in Stack is allowed;
- palette may scroll if needed;
- editing only in explicit customization mode.

## 16. Customization mode

Primary entry:

`All Features -> ワークスペース・設定 -> 左UIをカスタマイズ`

Accelerators may include context click / pen hold / shortcut, but are never required.

On entry:

- capture the current layout as a temporary snapshot;
- Rail remains visible as live preview.

Available operations:

- add Pin
- remove Pin
- reorder Pin
- create/edit/delete Stack
- add Category shortcut
- add supported dynamic preset
- reset default
- inspect unavailable/broken Pin

Commit model:

- **Done** persists the current preview.
- **Cancel** restores the entry snapshot.
- Reset Default requires an explicit confirmation inside customization flow.
- none of these actions enter Artwork History.

If a previously pinned dynamic object disappears (e.g. deleted Brush preset), the Pin becomes an unavailable placeholder with repair/remove options; it is not silently repointed to another object.

## 17. All Features interaction

### Opening

- opens adjacent to the Rail;
- only one Left-anchored palette at a time;
- focus moves into the palette for keyboard invocation;
- pointer/pen invocation does not steal Canvas semantics beyond the open UI.

### Navigation

- Home -> Category -> item
- Family modes expand inline
- avoid cascaded nested popup menus
- category view has Back and Search available
- category content may scroll; the Rail does not

### Dismiss

- Escape closes the topmost Left palette and restores focus to its trigger;
- Canvas click/tap/pen-down outside dismisses a non-modal palette before Canvas action proceeds;
- choosing Tool/Mode closes the palette;
- choosing Workspace/Setting closes the palette then focuses Right PiP;
- switching to another Left palette replaces the previous one.

## 18. Search

Search is integrated into All Features and shares the global Command/Tool index.

Searches:

- categories
- Tool Families
- modes
- commands
- Workspaces/PiPs
- settings
- presets
- macros
- assets

Result activation follows the same routing rules as browsing.

### Alias policy

Aliases improve migration/discovery without creating duplicate tools.

Examples:

| Search alias | Resolves to |
|---|---|
| Bucket / バケツ | Smart Fill |
| Magic Wand / 自動選択 | Color / Similarity Selection |
| Lasso / 投げ縄 | Freehand Selection |
| Hand / 手のひら | Pan |
| Color Pick / カラーピック | Eyedropper |
| Finger / 指先 | Smudge / Blend |
| Quick Menu / Quick Access | Quick Controller / relevant shortcut surface |
| Minimap | Navigator |

Aliases may include Japanese, English and established competitor terminology. Search/display labels remain separate from semantic IDs.

Search ranking may use textual relevance and recent use as tie-breakers, but **never changes Rail/category spatial order**.

## 19. Category shortcut Pins

All 12 categories can be pinned.

Activation opens that Category view directly.

A Category Pin never activates the last-used child.

This preserves predictability because a category can contain Tools, Commands and Workspaces with different consequences.

## 20. Rail geometry / density baseline

These are project UI targets for prototyping, not claims of universal platform standards.

### Pointer-dominant

- narrow vertical Rail
- target slot pitch approximately 44–52 CSS px
- icon artwork approximately 20–24 CSS px within the larger hit area
- tooltip available after hover

### Touch/pen-capable

- target slot pitch approximately 52–60 CSS px
- larger hit area without proportionally enlarging icon artwork
- no hover dependence

The implementation should select density using actual input capability / workspace preference, not viewport width alone.

All Features and Overflow reserve full-sized action targets.

Exact final dimensions are validated during the visual/runtime prototype.

## 21. PC projection

- persistent Left Rail
- All Features anchored palette
- hover tooltip supplements icons
- keyboard navigation supported
- category/tool chooser appears adjacent to Rail
- drag-to-reorder only in customization mode
- optional drag from customization catalog to Rail
- context click is accelerator only

## 22. Tablet projection

Same semantic model and logical Pin order.

Differences:

- larger targets
- no hover requirement
- category/Stack/chooser palette may widen into an anchored card/drawer
- explicit visible Pin action in All Features
- pen-hold may accelerate chooser/customization but is not the only route
- touch remains available for Canvas navigation according to Interaction Model
- Left/Right mirror supports handedness

PC/tablet do not maintain separate automatic ordering. A user-created Workspace Preset may intentionally store a different Pin profile if they choose.

## 23. State model

Every Rail entry supports relevant states:

- default
- hover (where available)
- pressed
- keyboard focus
- exact selected Tool/Mode
- family contains active Mode
- toggle on/off
- Workspace open/focused
- disabled/unavailable
- attention/warning
- customization drag source
- customization drop target

State cannot rely on color alone.

Default visual semantics before color is chosen:

- selection: shape/background/border change + positional indicator
- keyboard focus: explicit focus outline
- toggle-on: persistent glyph/state mark
- Workspace open: subtle open-state marker
- unavailable: reduced emphasis + disabled glyph/reason
- warning: icon/state mark independent of hue

## 24. Labels / discoverability

Rail:
- icon-first
- no permanent text requirement
- accessible name mandatory
- tooltip on hover-capable PC
- shortcut may appear in tooltip

All Features / choosers:
- icon + text label
- mode/command names are always textual
- optional shortcut hints
- Pin action visible/touch-reachable

No Core function depends solely on remembering an icon.

## 25. Keyboard / focus contract

Physical default shortcut mapping remains owned by the shortcut specification, not this visual spec.

The Left UI must nevertheless support:

- keyboard focus entry
- sequential navigation
- activation
- opening/closing All Features
- category traversal
- Search
- Pin customization actions where practical
- Escape/back behavior

Custom web widgets must implement correct focus/state semantics rather than emulating buttons without keyboard behavior.

## 26. Error / unavailable behavior

Examples:

- tool unavailable for current layer type;
- deleted dynamic preset Pin;
- feature unavailable due document state;
- missing font;
- unsupported export capability.

Rules:

- do not silently disappear if visibility helps discovery;
- show disabled/unavailable state;
- provide reason and a useful recovery path when practical;
- never redirect the user to a different command without explicit choice.

## 27. Persistence

Workspace-persistent:

- Pin IDs/order
- Custom Stacks and child order
- Category Pins
- supported dynamic preset Pins
- access-surface side/mirroring
- selected density preference if user-overridable

Session/transient:

- All Features open state
- Overflow open state
- active chooser
- search query
- customization preview before Done

Not document/artwork state:

- Left UI layout
- palette open/closed state
- Rail reorder
- Stack organization

These never enter Artwork Undo.

## 28. Performance contract

Opening Left UI surfaces must not:

- scan the entire document;
- trigger Region recomputation;
- preload all Brush assets;
- decode all Asset Library thumbnails;
- regenerate all Layer thumbnails;
- perform heavy filter/preview work.

The command/tool index is metadata-driven.

Large lists use lazy/virtualized presentation where required.

Search remains responsive independent of document pixel size.

## 29. Accessibility / adaptive constraints

The Left UI must:

- expose accessible names for icon-only entries;
- preserve visible keyboard focus;
- not rely on color alone;
- provide non-hover access to every action;
- provide non-long-press access to every action;
- adapt hit areas to input capability;
- support UI/text scale without making All Features unreachable;
- preserve functionality under localization/long labels;
- support reduced motion;
- maintain a single-pointer path for required actions.

## 30. Motion behavior

Motion communicates relation, not decoration.

- All Features/chooser opens from the Rail edge.
- Category change replaces the palette body rather than spawning a cascading window.
- Right PiP target may use a brief focus/reveal motion if Reduced Motion permits.
- Rail reorder feedback only appears in customization mode.
- Reduced Motion uses immediate/short state changes without loss of information.

No motion changes command timing or blocks drawing.

## 31. Visual direction fixed vs deferred

### Fixed now

- icon-first Rail
- text-labeled discovery palettes
- compact low-obstruction chrome
- stable spatial order
- state communicated by shape/line/glyph as well as any future color
- no decorative UI that competes with artwork

### Deferred to visual design

- color palette/theme
- final icon artwork
- exact corner radius
- exact shadow
- exact typography family
- final pixel dimensions within the interaction targets
- animation timing/easing

Those are visual-system decisions, not unresolved Left UI semantics.

## 32. Coverage rule

`LEFT_UI_ACCESS_COVERAGE.md` is the auditable coverage source for the current `FEATURE_CATALOG.md`.

Every catalog row is one of:

1. Left -> Canvas Tool/Mode
2. Left -> Right Workspace/PiP
3. Left -> Command/Feature
4. System/Internal/automatic
5. Future

A new user-facing feature is not considered UI-designed until it receives:

- category
- semantic type
- Left route
- destination behavior
- state/error behavior
- Pin eligibility decision

## 33. UIimprove design review result

Using the project-provided UI implementation quality guidance:

### Task reachability — DESIGN PASS

All current user-facing catalog capability is routed through the Left UI or explicitly marked internal/future in the coverage appendix.

### Discoverability — DESIGN PASS

All Features is invariant, labeled category browsing exists, Search shares one semantic index, and hidden accelerators are never the only route.

### Predictability — DESIGN PASS

Rail order is stable; category Pins/Stacks do not auto-run unpredictable children; Right PiP entries use open/focus semantics.

### Recoverability — DESIGN PASS

Customization has Done/Cancel snapshot behavior; broken dynamic Pins remain repairable; destructive/preview commands keep their normal recovery contracts.

### Input / accessibility — DESIGN-CONSTRAINED

Keyboard, pointer, pen and touch paths are specified. Runtime semantics/hit testing remain to be verified in implementation.

### Performance — DESIGN-CONSTRAINED

No-heavy-work invariants are specified. Runtime latency remains unverified.

### Visual quality — UNVERIFIED

Color, final icon art and rendered prototype remain outside semantic completion.

## 34. Completion statement

For PC/tablet, the **Left UI semantic and interaction design is complete** at this Gate.

The following are no longer open Left-UI product semantics:

- role of the Left UI
- default Pin set/order
- All Features position/behavior
- category taxonomy/order
- category content ownership
- Pin eligibility model
- Family behavior
- Stack behavior
- Overflow behavior
- customization transaction
- Search/alias behavior
- Canvas vs Command vs Right-PiP routing
- PC/tablet projection
- state model
- persistence
- error behavior
- accessibility/input constraints
- performance constraints

Remaining work is **visual/runtime validation**, not semantic invention:

1. generate the PC/tablet visual prototype with the dedicated UI design path;
2. inspect interaction density/occlusion;
3. runtime-test pointer/pen/touch/keyboard behavior once implemented;
4. adjust visual tokens without changing the semantic contract unless a concrete defect is found.

Smartphone/Compact is a separate device projection and is not defined here as a “left rail” because the product explicitly avoids scaling the PC/tablet shell onto small screens.
