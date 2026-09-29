# Illustro Right UI — Canonical Specification

> Status: **SEMANTIC / INTERACTION / LAYOUT DESIGN COMPLETE — VISUAL STYLE & RUNTIME VALIDATION PENDING**
> Date: 2026-09-29
> Scope: PC / tablet Right UI
> Parent: [UI Gate E](UI_GATE_E.md)
> Left counterpart: [Left UI — Canonical Specification](LEFT_UI_SPEC.md)
> Supporting research/specs:
> - [Right Workspace — Box Taxonomy](RIGHT_WORKSPACE_BOX_TAXONOMY.md)
> - [Right Workspace — Default Layout & Collapse](RIGHT_WORKSPACE_DEFAULT_LAYOUT.md)
> - [Right Workspace — Box Interaction](RIGHT_WORKSPACE_INTERACTION_SPEC.md)
> - [Right UI — Layer Page](RIGHT_LAYER_PAGE_SPEC.md)
> - [Right Workspace — General UI Research](RIGHT_WORKSPACE_GENERAL_UI_RESEARCH.md)

## 1. Product role

The Right UI answers:

> **How is the current operation configured, and how is the artwork/workspace state managed?**

The Left UI remains the universal access/navigation root. The Right UI carries persistent detail density and structure management.

The Right UI consists of:

1. a **scrollable semantic Box stack**;
2. a **fixed five-button bottom command strip**;
3. the special **Layer Page** expanded surface;
4. detached/floating projections of registered Boxes.

Canvas remains the primary content region.

## 2. Non-negotiable structure

All 12 semantic Boxes remain registered in the Right Workspace.

They are not normally hidden/removed to simplify the interface.

Information density is controlled primarily by:

- collapse / expand;
- vertical stack scrolling;
- Box sizing;
- detach / re-dock;
- contextual summaries.

If a Box is detached, its logical position remains represented by a **detached placeholder header** in the Right stack. The placeholder:

- keeps the Box discoverable from the Right side;
- shows the Box title + detached marker;
- activation brings the detached Box to front;
- More offers Dock Back / Move Logical Position / Reset Location.

Therefore detaching does not make a capability disappear from the Right UI.

## 3. Semantic Box registry

Stable IDs:

1. `right.layers` — Layers & Compositing
2. `right.color` — Color
3. `right.brush` — Brush
4. `right.inspector` — Properties / Inspector
5. `right.reference` — Reference
6. `right.assets` — Assets
7. `right.effects` — Effects & Adjustments
8. `right.navigator` — Navigator & View
9. `right.history` — History & Progress
10. `right.automation` — Automation
11. `right.document` — Document
12. `right.workspace` — Workspace

Location, collapse state and presentation never change semantic IDs.

## 4. Default order and expansion

Top -> bottom:

1. Layers & Compositing — **expanded**
2. Color — **expanded**
3. Brush — **expanded**
4. Properties / Inspector — collapsed
5. Reference — collapsed
6. Assets — collapsed
7. Effects & Adjustments — collapsed
8. Navigator & View — collapsed
9. History & Progress — collapsed
10. Automation — collapsed
11. Document — collapsed
12. Workspace — collapsed

All remain present.

Expanding one Box never auto-collapses another.

User changes persist in Workspace state.

## 5. Right UI geometry tokens

These are **Illustro project tokens**, not universal UI standards.

They are chosen using current official platform/accessibility guidance and must be runtime-validated.

### 5.1 Pointer-dominant Expanded profile

- default Right Workspace width: **344 CSS px**
- minimum dock width: **288 CSS px**
- maximum dock width: **440 CSS px**
- Box header / collapsed height: **40 CSS px**
- standard content horizontal padding: **12 CSS px**
- standard control row: **32 CSS px minimum effective height**
- bottom command strip height: **44 CSS px**
- Box icon visual size: **18–20 CSS px**
- minimum ordinary interactive target: **32×32 CSS px effective area**
- fixed-bottom command targets: **40×40 CSS px minimum effective area**

This exceeds WCAG 2.2's 24 CSS px minimum target baseline while retaining desktop density.

### 5.2 Touch / pen-capable Medium profile

- default Right Workspace width: **360 CSS px**
- minimum: **320 CSS px**
- maximum: **440 CSS px**
- Box header / collapsed height: **48 CSS px**
- standard content horizontal padding: **16 CSS px**
- standard control row: **44 CSS px minimum effective height**
- bottom command strip height: **52 CSS px**
- Box icon visual size: **20–22 CSS px**
- primary interactive targets: **44×44 CSS px minimum effective area**

This adopts the stronger 44-class target baseline for touch/pen use.

### 5.3 Inline vs overlay projection

Right Workspace uses **inline** presentation when both are true:

- input/layout conditions favor persistent side-by-side work;
- after allocating Left UI + Right UI, the Canvas keeps at least **720 CSS px usable horizontal workspace**.

Otherwise it uses an **anchored overlay** projection.

This 720px value is an Illustro creation-workspace token, not a platform standard.

The user may override with a Workspace Preset if the resulting layout remains operable.

## 6. Right Workspace width resize

Dock width is shared by all docked Boxes.

Resize from the Canvas-facing edge.

Rules:

- width clamps to profile min/max;
- layout does not horizontally scroll;
- labels may truncate with full accessible name;
- internal controls reflow before clipping;
- resize state persists in Workspace state;
- resize never changes document zoom/view transform.

Non-drag alternatives:

- Narrower
- Wider
- Reset Width

available through Workspace commands.

## 7. Scroll architecture

### 7.1 Outer stack

The Box stack scrolls vertically as one workspace.

The bottom five-button strip never scrolls.

### 7.2 Internal scrolling

Avoid nested scrolling unless data scale requires it.

Internal scrolling is allowed for collection-heavy Boxes:

- Layers
- Brush preset collection
- Reference list
- Assets
- History
- Automation

Other Boxes normally grow to their remembered height and rely on outer-stack scrolling.

### 7.3 Scroll chaining

When an internal list reaches its boundary, wheel/touch continuation may propagate to the outer stack rather than trapping the user.

No horizontal scrolling in the normal Right Workspace.

## 8. Box header grammar

Docked header left -> right:

1. Expand/Collapse button
2. Box icon
3. short stable title
4. one-line context/summary region
5. Box-specific persistent control only when semantically necessary
6. More menu

Permanent header controls:

- Expand/Collapse
- More

Inspector exception:

- Lock Context may be directly visible.

Detach/Re-dock is not permanently visible on every Box.

### Header text

Title remains stable:

- Layers
- Color
- Brush
- Inspector
- Reference
- Assets
- Effects
- Navigator
- History
- Automation
- Document
- Workspace

Context changes belong in the summary area.

### Header semantics

- Expand button toggles expansion.
- Title/summary click focuses the Box.
- Non-control header region is the drag area.
- Double-click title/empty header may toggle collapse as a pointer accelerator.
- More opens Box operations.

No essential operation depends on double-click, hover or right-click.

## 9. Collapsed summaries

Collapsed Boxes retain useful state.

### Layers

- selected layer thumbnail/type
- selected layer name
- multi-select count when >1
- warning/lock marker when relevant

### Color

- current foreground color swatch
- compact value/model indicator
- proof/gamut warning if enabled

### Brush

- current preset icon
- preset name
- size
- important temporary state marker when relevant

### Inspector

- current context target/type
- Lock Context marker

### Reference

- reference count
- active reference name/thumbnail
- hidden/pinned marker when relevant

### Assets

- current asset category
- current collection
- active filter/search marker

### Effects

- current target effect count
- selected effect name
- disabled/error marker

### Navigator

- zoom percentage
- Soft Proof / Grayscale / Gamut state markers

### History

- current subsection
- recording/export/progress marker
- optional current session time if enabled

### Automation

- current macro or idle
- recording marker

### Document

- canvas dimensions
- compact color/profile indicator
- recovery/error warning only when needed

### Workspace

- active Workspace Preset
- modified-layout marker
- Layout Lock marker

Summary is single-line and ellipsizes visually; full accessible text remains available.

## 10. Default expanded Box sizes

Pointer profile default heights:

- Layers: **240 px**
- Color: **216 px**
- Brush: **240 px**

Touch/pen profile default heights:

- Layers: **288 px**
- Color: **248 px**
- Brush: **288 px**

These are starting Workspace values, not hard maxima.

Expanded remembered height range:

- generic minimum: **144 px pointer / 176 px touch**
- generic maximum while docked: **560 px** or available stack height, whichever is smaller

Collection-heavy Boxes may use the maximum.

## 11. Box resize

Docked Box height can be resized by its lower divider.

Visual divider may be thin, but effective hit region is larger:

- pointer: **10 px effective vertical grab zone**
- touch/pen: **16 px effective grab zone**

Non-drag More -> Resize:

- Increase height
- Decrease height
- Fit content
- Reset size

Collapsed header height is fixed by density profile.

Detached Boxes may resize in both axes.

## 12. Workspace Layout Lock

Command: **Lock Workspace Layout**

Default factory state: off.

When enabled:

Disabled:

- drag reorder
- drag detach
- drag re-dock
- Box resize
- Right Workspace width resize

Still allowed:

- expand/collapse
- Box content interaction
- Layer Page
- fixed bottom commands
- Left/Search navigation

The lock state is visible in Workspace summary and persists with Workspace state/preset.

This follows the proven stylus-safety pattern used by professional creative applications.

## 13. Reorder

Direct drag:

- drag non-control header region;
- insertion zones appear between registered Box positions;
- placeholder shows exact result;
- commit only on release;
- Esc/cancel restores origin;
- invalid drop restores origin.

Non-drag alternatives in More -> Move:

- Up
- Down
- To top
- To bottom
- Move to...

`Move to...` presents an ordered list of Box destinations.

Dragging is never the only path.

## 14. Detach / floating Box

### Detach

Direct:
- drag Box laterally beyond dock activation zone;
- floating outline appears before commit;
- release in valid workspace -> detached.

Explicit:
- More -> Detach.

No detach occurs from minor horizontal jitter.

### Detached placeholder

The Right stack keeps a collapsed logical placeholder at the Box's ordered position.

It shows:

- icon
- title
- detached marker

Activation brings the floating Box forward.

### Detached Box

- same semantic Box, not a copy;
- same header grammar;
- same selected state/content;
- position/size persist;
- collapse becomes compact floating header;
- no second title bar.

## 15. Magnetic behavior

Magnetism is **previewed snapping**, not sudden attraction.

Valid targets:

1. Right Workspace insertion positions
2. top/bottom alignment with detached Boxes
3. side-edge alignment with detached Boxes

When target becomes valid:

- snap guide/placeholder appears;
- dragged Box remains under direct pointer/pen control;
- commit occurs on release only.

Detached-to-detached alignment is geometric only.

It does not create:

- semantic grouping
- tabs
- shared selection
- persistent move-as-one groups

Baseline has no arbitrary tab merging of unrelated Boxes.

## 16. Re-dock

Detached More -> Dock to Right Workspace.

Default destination:

- its current logical placeholder position.

Dragging to the Right Workspace uses the same insertion preview.

If viewport changes made the floating location invalid, invoking it restores the Box to visible safe area.

## 17. Reset / recovery

Every Box:

- Reset Location
- Reset Size

Workspace:

- Reset Workspace Layout

Reset Workspace Layout restores:

- canonical Box order
- default expand/collapse profile
- default docked state
- default Right width
- default Box heights
- detached positions removed
- Layout Lock off unless preset explicitly stores otherwise

If the current layout is an explicitly saved custom preset with unsaved changes, reset presents a concise confirmation.

Artwork state is never affected.

## 18. Fixed bottom command strip

Always fixed below the scrollable Box stack.

Order left -> right:

1. **Layer Page**
2. **Undo**
3. **Redo**
4. **Horizontal Flip**
5. **Vertical Flip**

The strip:

- cannot reorder
- cannot detach
- cannot collapse
- never scrolls away

### Button states

Layer Page:
- inactive / active-open / floating-open.

Undo:
- enabled if an undoable artwork command exists;
- otherwise disabled with accessible reason.

Redo:
- same for redo.

Horizontal Flip:
- toggle state reflects current view transform.

Vertical Flip:
- same.

Horizontal/Vertical Flip are view state, not Artwork History.

Both may be active simultaneously.

## 19. Layer Page — final geometry

Layer Page is the expanded ibisPaint-inspired layer-management surface.

It is a **single instance** sharing the exact Layer model/commands with Layers Box.

### Pointer profile

- default width: **480 CSS px**
- minimum: **400 CSS px**
- maximum: **600 CSS px**

### Touch/pen profile

- default width: **440 CSS px**
- minimum: **360 CSS px**
- maximum: **min(520 CSS px, 62vw)**

Layer Page is an anchored right overlay by default.

Canvas remains visible and interactive outside it.

It does not auto-close when the user draws.

### Layer Page sections

Top -> bottom:

1. Header
2. Selected-layer quick properties
3. Search / Filter row
4. Layer tree/list — flexible dominant region
5. Layer action strip

This ordering keeps high-frequency layer properties stable while the layer list scrolls.

## 20. Layer Page header

Pointer height: **44 px**
Touch/pen height: **52 px**

Contains:

- Layers title
- multi-selection count when applicable
- floating/dock state indicator
- More
- Close

Search is in the dedicated row below, not crammed into the title bar.

Close is explicit.

Same fixed Layer Page button also toggles/recalls the page:

- closed -> open;
- anchored open -> close;
- floating open -> bring to front.

Escape closes anchored Layer Page when no deeper interaction owns Escape.

## 21. Layer Page selected-layer quick properties

Height target:

- pointer: **72–88 px**
- touch: **88–104 px**

Always relevant controls:

- Blend Mode
- Opacity
- Clipping
- Alpha Lock / Lock Transparency
- compact lock state
- color tag

Controls unavailable for current layer type remain visible when discovery benefits, but disabled with reason.

Type-specific deep properties remain in Inspector.

## 22. Layer Page search/filter row

Pointer height: **40 px**
Touch height: **48 px**

Contains:

- search field
- filter button
- clear-filter state when active

Search:
- name
- type
- tag

Filters:
- Raster
- Vector
- Text
- Group
- Mask
- Adjustment
- Filter
- visible/hidden
- locked/unlocked
- tag

Search/filter never mutates artwork.

## 23. Layer Page row anatomy

Pointer row height: **40 px**
Touch/pen row height: **48 px**

Row left -> right:

1. hierarchy indent/disclosure
2. visibility
3. thumbnail/type
4. layer name
5. relation/status markers
6. lock state
7. reorder affordance/drag area

Project tokens:

- thumbnail: **28 px pointer / 36 px touch**
- hierarchy indent step: **16 px pointer / 20 px touch**
- primary row icon effective target: **32 px pointer / 44 px touch**

Selected state is not indicated by color alone.

Group disclosure and row selection have separate hit regions.

## 24. Layer Page layer tree behavior

- single select
- range/multi-select where supported
- group expand/collapse
- direct reorder
- nesting insertion preview
- non-drag Move alternatives
- visibility direct control
- lock state direct/readable
- masks/clipping shown as relationships

No apply/sync step.

Layers Box, Layer Page, Canvas selection and Inspector synchronize immediately.

## 25. Layer Page action strip

Fixed at Layer Page bottom.

Pointer height: **44 px**
Touch/pen height: **52 px**

Primary actions:

1. Add Raster Layer
2. Add / Choose Layer Type
3. Add Group
4. Add Mask
5. Duplicate
6. Merge Down / Merge action
7. Delete
8. More

At narrow width, More absorbs lower-priority actions before reducing hit targets.

Delete does not require a modal if the deletion is reliably covered by Artwork Undo; failures or irreversible external actions use their normal confirmation contract.

## 26. Add Layer flow

Add Raster Layer:
- immediate.

Add / Choose Layer Type opens a compact chooser:

- Raster
- Vector
- Group
- Mask
- Vector Mask when supported
- Adjustment
- Filter
- Text
- other canonical Layer types

This keeps common creation one action away while preserving full capability.

## 27. Floating Layer Page

More -> Float Layer Page.

Floating instance:

- remains single-instance;
- width/height resize;
- position persists;
- anchored Layer Page disappears because the same view moved;
- fixed Layer Page button shows floating-open state;
- button activation brings floating page forward;
- More -> Dock restores anchored right presentation.

It remains non-modal.

## 28. Box internal layouts

### R1 Layers

Purpose: compact daily layer management.

Expanded order:

1. quick Blend Mode + Opacity row
2. compact layer list
3. minimal quick actions: Add / Group / Mask / More

Full management remains available in Layer Page.

### R2 Color

Expanded order:

1. persistent current foreground swatch/value
2. internal mode switch: Picker / Palette / Harmony
3. active mode content
4. recent colors row

Picker is default.

Advanced color management does not live here.

### R3 Brush

Expanded order:

1. current preset + search
2. preset collection
3. Size / Opacity
4. Stabilization
5. advanced sections as inline disclosures:
   - Dynamics
   - Texture
   - Wet Media
   - other engine-specific groups

Do not create a second Brush settings window for the same parameters.

### R4 Inspector

Expanded order:

1. context path
2. local property search/filter
3. context-specific property sections
4. preview Apply/Cancel area when the active operation requires commit

Follow Context by default.

Lock Context direct header control.

### R5 Reference

Expanded order:

1. Add Reference
2. reference list
3. selected reference quick controls
4. group/visibility controls

Spatial Move/Scale/Rotate remains Canvas-direct where appropriate.

### R6 Assets

Expanded order:

1. search
2. category/filter
3. collection/favorite/recent controls
4. virtualized asset grid/list

Opening an asset-specific editor routes to its owning Box.

### R7 Effects

Expanded order:

1. Add Adjustment / Filter / Style
2. current effect stack
3. enable/mask/blend/opacity summary
4. selected effect -> Inspector for detailed parameters

Avoid duplicate parameter editors.

### R8 Navigator

Expanded order:

1. Navigator preview
2. viewport rectangle/direct navigation
3. zoom field/slider
4. view-state toggles:
   - Grayscale
   - Soft Proof
   - Gamut Warning
   - Multi-view / Seamless state as applicable

### R9 History

Uses coherent internal tabs:

- History
- Snapshots
- Timelapse
- Work Time

Default tab: History.

Tabs preserve their local scroll/state.

### R10 Automation

Expanded order:

1. macro/action search
2. action list
3. Run
4. Record
5. parameters/recording status

Shortcut/Quick Controller assignment deep-links to their owning configuration surface.

### R11 Document

Uses inline disclosure sections:

1. Canvas / Image
2. Color Management
3. Save / Recovery
4. Import / Export configuration

Do not force OS file pickers inside the Box.

### R12 Workspace

Expanded order:

1. active Workspace Preset
2. Save / Update / Duplicate Preset
3. Lock Workspace Layout
4. mirror side
5. Left UI customization
6. Quick Controller profile
7. Reset Workspace Layout

Global application settings such as language/accessibility/global shortcuts remain in the dedicated Settings surface.

## 29. Loading / empty / error / disabled states

UI Implementation Quality plugin rules are applied explicitly.

### Loading

- show existing stable content when possible;
- collection Boxes may use lightweight skeleton placeholders;
- don't blank the entire Right UI for one Box load;
- known-duration operations use determinate progress where practical.

### Empty

Each collection Box gives a direct next action:

- Reference -> Add Reference
- Assets -> Import / browse category
- Effects -> Add Adjustment/Filter
- Automation -> Create/Record Macro
- History/Snapshots -> explanatory empty state when none exist

### Error

Errors stay scoped to the owning Box unless app/document-wide.

Provide:

- concise reason
- Retry when meaningful
- recovery/action path

### Disabled

Do not silently remove controls when discoverability matters.

Disabled controls expose a reason on accessible description / tooltip / inline helper.

### Stale/offline

Local-first artwork functions continue where possible.

Remote/plugin-backed resources, if any, show stale/offline state without blocking local painting.

## 30. Focus / keyboard semantics

Focus order follows current visual/logical Box order.

Within Box:

1. header controls
2. content in logical order

Collapsed content is not focusable.

Detached placeholder is focusable and brings the Box forward.

Focus alone never:

- changes Tool
- changes layer selection
- commits artwork
- moves Box
- expands content unless the focused control is explicitly activated

Fixed bottom strip is keyboard reachable after the Box stack in logical DOM/focus order.

Focused controls must not be obscured by the fixed strip or Layer Page.

## 31. Web accessibility implementation contract

If implemented with custom web widgets:

- collapse button exposes expanded state programmatically;
- controlled region has a stable accessible label;
- icon-only controls have accessible names;
- selection/toggle state is programmatically exposed;
- focus appearance remains clearly visible;
- Drag actions have click/tap alternatives;
- don't assign ARIA tree/grid roles merely because the Layer list looks hierarchical unless the complete keyboard/semantic contract is implemented.

## 32. Pointer / pen / touch adaptation

Never infer input modality from width alone.

Use actual capabilities/preferences.

Pointer profile prioritizes density.

Touch/pen profile:

- 44-class primary targets;
- larger reorder/snap zones;
- no hover-only information;
- long-press only as accelerator;
- explicit More/Move/Dock controls remain available.

On iPad-class use, pen and touch may coexist.

## 33. State communication

No important state relies on color alone.

Use combinations of:

- shape/background change
- border/line
- icon/glyph
- label
- position marker
- accessible state

Required distinguishable states:

- collapsed/expanded
- focused
- selected
- disabled
- warning/error
- loading/progress
- detached
- layout locked
- Inspector locked
- recording
- Layer Page active
- Undo/Redo availability
- horizontal/vertical view flip active

## 34. Motion

Motion is short, informative and non-blocking.

Project animation tokens:

- press/state feedback: **80 ms**
- collapse/expand: **120 ms**
- Box snap/re-dock settle: **100 ms**
- Layer Page open/close: **160 ms**
- target reveal highlight: **240 ms max**, non-looping

During direct drag there is no spring/inertial lag between pointer and Box.

Reduced Motion:

- remove spatial travel where practical;
- use immediate state change or short opacity transition;
- preserve all information.

No animation blocks drawing input.

## 35. Localization / text scaling

- titles use short localizable nouns;
- summary text truncates visually but keeps full accessible value;
- Japanese/English labels are first-class;
- no fixed width assumes English text;
- text scaling may increase Box height/reflow controls;
- All functions remain reachable at supported text scaling;
- no horizontal scrolling for ordinary property forms.

## 36. Performance

Opening/collapsing/moving Right UI must not trigger:

- full document scan
- Region recomputation
- all-brush preload
- full asset thumbnail decoding
- full layer thumbnail regeneration
- expensive effect recomputation unrelated to changed state

Collapsed Boxes:

- metadata summary only;
- near-zero recurring UI work.

Detached inactive Boxes:

- near-zero recurring work except necessary state subscription.

Layer/Asset/History collections:

- virtualization/lazy rendering;
- stable IDs;
- incremental thumbnail loading.

Drag:

- lightweight shell/placeholder;
- no heavyweight content rerender per pointer sample.

## 37. Persistence

Workspace-persistent:

- Box order
- expanded/collapsed
- Box heights
- Right width
- dock/detach state
- detached position/size
- logical detached placeholder position
- Layout Lock
- Workspace Preset
- Inspector Lock state
- Layer Page floating/anchored preference
- Layer Page size/position
- Right/Left mirroring

Transient:

- hover
- pressed
- drag preview
- reveal highlight
- active More menu
- current Layer Page open/closed state unless explicitly restored by session policy

Not Artwork History:

- all Right UI arrangement/state above.

## 38. Recovery after viewport/display change

If window size, monitor, orientation or split-screen changes:

- detached Boxes are clamped into visible safe workspace;
- focused item remains revealable;
- Right width clamps to allowed range;
- Layer Page width clamps;
- Box order/collapse state is preserved;
- Canvas view transform is not reset solely due UI reflow.

## 39. Left/Search routing

Left UI remains universal route.

Examples:

- Brush Settings -> R3 Brush
- Fill tolerance -> R4 Inspector exact section
- Layers -> R1 Layers
- full layer management -> Layer Page
- Effects -> R7 Effects
- Reference -> R5 Reference
- Assets -> R6 Assets
- History -> R9 History
- Navigator -> R8 Navigator
- Document Color Management -> R11 Document exact section

Exact property search deep-links to the owner and reveals the target.

No duplicate semantic command/state is created.

## 40. Source-backed design rationale

Official evidence applied:

- Apple HIG Panels: inspector follows selected context; supplementary panels should stay secondary to primary content.
- Apple HIG Layout: progressive disclosure reduces overload.
- Apple HIG iPadOS: content creation should support mixed touch/pen/pointer/keyboard input and adapt density.
- Apple HIG Buttons: 44×44pt general hit-region guidance.
- Fluent Accordion: collapse is useful for reducing cognitive load, but task-required information should not be buried.
- Fluent Drawer: inline vs overlay secondary surfaces should be selected based on relationship to main content and obstruction.
- Fluent Layout: proximity/spacing communicates grouping/hierarchy.
- Carbon Accordion: side-panel disclosure is appropriate under space constraints; header state must be explicit and keyboard operable.
- Photoshop: professional panel docking, highlighted drop zones, floating panels, collapse, Esc cancel, Workspace Lock.
- JetBrains: draggable and menu/keyboard Move/Resize, remembered layouts, default restore.
- WCAG 2.2: pointer targets, visible focus, focus not obscured, and non-drag alternatives.
- ibisPaint: dense Layer Window with direct layer operations and floating Layer Window on PC/tablet.

These are evidence inputs, not visual templates to clone.

## 41. Design completion status

For PC/tablet, Right UI **semantic, interaction and layout design is complete**.

No open product-semantic decisions remain for:

- Box taxonomy
- all-Box presence
- default order
- default collapse profile
- collapsed summaries
- header anatomy
- dock sizing
- Box sizing
- outer/internal scrolling policy
- reorder
- detach
- detached discoverability
- magnetic snapping
- layout lock
- recovery/reset
- fixed five-button strip
- Layer Page role/geometry/anatomy
- per-Box internal information architecture
- loading/empty/error/disabled states
- focus/input/accessibility constraints
- motion semantics
- persistence
- performance constraints
- PC/tablet projection logic

Still intentionally outside this semantic/layout completion:

- final color/theme (explicitly deferred by product design);
- final icon artwork;
- final font family;
- pixel-polish/corner/shadow styling;
- runtime-tuned drag threshold and magnetic activation thickness;
- empirical usability/performance validation.

Those are visual/runtime validation tasks, not missing Right-UI architecture.
