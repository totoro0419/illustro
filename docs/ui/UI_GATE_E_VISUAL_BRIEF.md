> Classification: EXPERIMENTAL / supporting historical UI detail. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# Illustro UI Gate E — Visual Prototype Brief

> Status: **WORKING BRIEF / STRUCTURE IN REVISION**
> Date: 2026-09-29
> Parent: [UI Gate E](UI_GATE_E.md)
> Purpose: remove generation-time ambiguity so the dedicated UI Design Skill can produce the Gate E comparison set without inventing product semantics.

## 1. Prototype objective

Generate one coherent Illustro Core painting workspace in three device projections:

1. Expanded — 1440 × 900
2. Medium — 1024 × 768
3. Compact — 390 × 844 portrait

These are comparison/reference sizes, not hardcoded runtime breakpoints.

All three screens must look like the same product and expose the same semantic capabilities, while changing geometry to fit the input/viewport class.

The prototype is an interaction-architecture validation artifact. It is not a marketing mockup.

## 2. Design priority

Order of optimization:

1. Canvas dominance
2. immediate comprehension
3. low pointer/pen/thumb travel
4. low visual interference while drawing
5. discoverability
6. advanced capability access
7. customization

Do not solve complexity by deleting feature access.

## 3. Required shared scenario

Use the same representative document in all three screens so device layouts are directly comparable.

Document state:

- one illustration document open
- Brush tool active
- current brush: generic inking brush
- current color: dark neutral
- three visible artwork layers plus background
- Canvas zoom: approximately 75–100%
- no modal dialog blocking the artwork
- storage state healthy/saved
- one subtle recovery/status indicator present in the shell

The artwork itself should be visually quiet and generic. UI evaluation must not depend on the illustration.

## 4. Shared information architecture

Every projection must provide a visible or clearly discoverable Left-UI-rooted path to:

- Brush
- Eraser
- Fill
- Selection
- Transform
- Eyedropper
- Color
- Layers
- Brush settings
- Reference
- Undo / Redo
- Quick Controller
- Command Search
- Focus Mode
- document/save/recovery status

No Core action may be represented as keyboard-only, hover-only, or right-click-only.

## 5. Visual hierarchy

Hierarchy from strongest to weakest:

1. artwork / Canvas
2. current tool state and direct manipulation affordances
3. current context controls
4. primary tool selection
5. workspace blocks
6. global/document chrome
7. passive status/help

Chrome should be neutral and low-distraction.

Do not make the interface visually louder than the Canvas.

## 5.1 Left UI visual acceptance

The rendered prototype must visibly validate:

- eight default Pins + fixed All Features
- All Features anchored palette with text-labeled category entries
- the exact 12-category order from `LEFT_UI_SPEC.md`
- one Tool Family chooser state
- one Workspace/PiP routing state from Left UI
- one Overflow state
- one customization state
- selected/focus/disabled/open-workspace state distinctions without relying on color alone
- pointer-density Expanded projection
- touch/pen-density Medium projection
- Canvas remains visually dominant

Left UI visual validation may adjust visual tokens but must not silently change semantic behavior.

## 6. Expanded screen — 1440 × 900

### 6.1 Shell

Use:

- top application/document strip: visually minimal; Home/Save and similar non-drawing document/app operations live here; Undo/Redo do not
- icon-first left Left Access Surface
- central Canvas
- right magnetic Workspace/PiP stack
- Context Surface attached to the Canvas working region
- optional detached block over a low-risk Canvas margin
- no mandatory bottom bar unless persistent information genuinely needs it

### 6.2 Left Left Access Surface

Target visual width: approximately 48–64 px.

The default PC/tablet visible Pin set is **locked semantically**.

Use:

- `LEFT_UI_SPEC.md` as canonical Left UI semantics;
- `LEFT_UI_ACCESS_ARCHITECTURE.md` as supporting navigation notes;
- `LEFT_PINNED_RAIL_SPEC.md` for Rail/All Features/Overflow/Stack behavior;
- `LEFT_UI_ACCESS_COVERAGE.md` for complete feature reachability;
- `LEFT_TOOL_SURFACE_OPTIONS.md` for tool-family candidates.
- `RIGHT_UI_SPEC.md` as canonical Right UI semantics/layout/geometry;
- `RIGHT_WORKSPACE_DEFAULT_LAYOUT.md` as supporting order/collapse detail.
- `RIGHT_WORKSPACE_INTERACTION_SPEC.md` for Box header/reorder/detach/magnetic/resize behavior.
- `RIGHT_LAYER_PAGE_SPEC.md` for the expanded ibisPaint-like Layer Page.

The visible Rail is icon-first. Prototype the default order:

1. Brush
2. Eraser
3. Smudge / Blend
4. Eyedropper
5. Smart Fill
6. Selection
7. Transform
8. Move

Then reserve:
- conditional Overflow directly above the final fixed entry;
- All Features as the permanent bottom-fixed entry.

Do not make the Rail itself vertically scroll.

Do not place deep settings inside the Rail. Selecting a settings/workspace item from the Left UI opens/focuses the corresponding right magnetic PiP.

### 6.3 Right Workspace Dock

Target starting width: approximately 280–340 px.

Show the right side as a magnetic Workspace/PiP system. Layers, Color, Brush and Reference are coherent blocks that can be reordered and, where applicable, detached and magnetically re-docked.

The workspace is not a settings dump.

Use `RIGHT_UI_SPEC.md` exactly for Right UI geometry, density and states.

Expanded pointer prototype uses the 344px default dock target; Medium touch/pen uses the 360px target when inline/overlay conditions permit.

Default order remains Layers / Color / Brush expanded, all remaining Boxes collapsed. All 12 Boxes remain represented. The fixed bottom strip remains visible and contains Layer Page / Undo / Redo / Horizontal Flip / Vertical Flip.

The visual prototype must include a detached-placeholder state as well as the detached Box itself.

### 6.4 Brush Context Surface

Place close enough to the Canvas to minimize repeated pointer travel.

Show only:

- current brush
- size
- opacity
- button/affordance to open full Brush block

It must read as contextual controls, not a second toolbar full of unrelated commands.

### 6.5 Detached block example

Show **Color** detached/pinned near an unused Canvas margin.

It must visibly retain a relationship to the dock system and expose a clear re-dock/dismiss affordance.

Avoid covering the active central drawing region.

### 6.6 Quick Controller

Show one open-state inset or side-by-side state in the Expanded composition.

Baseline:

- optional pen-following controller;
- hidden during an active pen stroke;
- shown after pen-up near the current pen position;
- semi-transparent donut/ring;
- six buttons evenly distributed on a flat-top hexagonal six-point layout, including distinct leftmost/rightmost slots;
- ring whitespace is draggable;
- default leftmost = Undo, default rightmost = Redo;
- all six assignments/positions remain user-customizable;
- outline-led low-obstruction button styling may be explored, but is not locked.

Do not add an eighth slot or a center action unless the user later specifies one.

### 6.7 Expanded Focus Mode access

Focus Mode must have an explicit visible entry, even if a keyboard shortcut also exists.

## 7. Medium screen — 1024 × 768

### 7.1 Shell

Prioritize Canvas over permanent dock width.

Use:

- compact edge Tool Surface
- large Canvas
- Context Surface near a reachable edge
- anchored workspace overlay/drawer instead of a permanent desktop-width right dock
- visible Quick Controller entry
- touch-visible Focus Mode exit path

### 7.2 Layers state

Show Layers as an anchored workspace panel that can remain pinned temporarily.

It should feel lighter than the Expanded right dock.

### 7.3 Color / Brush access

Color and Brush basics must be reachable without traversing to a desktop-style far-right inspector.

### 7.4 Input implication

The composition must make sense for stylus + touch:

- pen draws
- touch remains available for Canvas navigation
- no hover requirement
- controls have touch-capable target sizes

### 7.5 Quick Controller

Use the same six-slot pen-following semantics as Expanded for the current tablet design pass. Touch target sizing may adapt, but do not alter slot count or silently reorder assignments.

## 8. Compact screen — 390 × 844

### 8.1 Shell

Canvas should occupy nearly the entire viewport.

Use:

- compact top document/status strip
- lower-edge thumb-reachable primary command/tool surface
- no permanent desktop-style right panel
- transient sheet/card for workspace blocks
- compact collapsible Context Surface
- clear Quick Controller entry
- clear Focus Mode access/exit

### 8.2 Bottom/edge primary surface

Must keep high-frequency non-drawing actions reachable with one hand.

Avoid a dense row of tiny icons.

The currently selected tool must be unmistakable without relying only on color.

### 8.3 Layers

Show Layers in a bottom/edge sheet state.

Required properties:

- large enough touch rows
- active layer clear
- add layer visible
- dismiss/return path obvious
- Canvas still contextually visible where practical

### 8.4 Brush Context Surface

Expose:

- brush
- size
- opacity

Do not force users into the full Brush settings sheet for these frequent controls.

### 8.5 Quick Controller

**Pending.** Smartphone-specific geometry/behavior has not yet been designed. Do not derive it by simply scaling the PC/tablet six-button controller.

### 8.6 Command Search

Compact may use a full-width/bottom-sheet search surface.

The keyboard may not cover the action/result needed to execute or dismiss the command.

## 9. Preview-before-commit state

The comparison package must include a Transform or Fill state showing explicit:

- Apply
- Cancel

These actions must be visually distinct from passive/view-only controls.

The state should demonstrate that tool switching cannot silently hide an unresolved preview.

## 10. Focus Mode state

Provide a small secondary state/example for each projection, not necessarily a full extra screen.

Focus Mode hides:

- top chrome that is not critical
- tool rail/surface where appropriate
- dock/workspace panels

Focus Mode retains:

- Canvas
- summonable Context Surface
- summonable Quick Controller
- visible/touch-discoverable exit
- critical recovery/error state

## 11. State styling requirements

Must distinguish at least:

- default
- hover where available
- pressed
- selected
- disabled
- destructive
- preview pending
- warning/recovery

Selected state cannot rely on hue alone.

Disabled actions may remain discoverable with an availability reason.

## 12. Color and theme direction

For first Gate E prototype:

- dark-neutral working chrome
- neutral Canvas surround
- restrained single accent
- high legibility
- no decorative gradients unless they convey state
- no glassmorphism that reduces text/control contrast
- no oversized ornamental shadows
- artwork color must not be contaminated by strong surrounding chrome

Exact accent color is intentionally not product-final at this gate.

## 13. Typography direction

Use a highly legible UI sans-serif.

Requirements:

- clear hierarchy between document/title, tool/context label, value, hint/status
- compact but not cramped desktop density
- touch layouts increase target size without proportionally inflating all text
- numeric values remain easy to scan

Exact product font remains a visual-system decision unless already established elsewhere.

## 14. Icon direction

- consistent stroke/fill family
- tool identity should be recognizable at compact size
- ambiguous icon-only actions require accessible labels/tooltips and touch-equivalent discoverability
- do not use emoji as UI icons
- do not invent brand marks
- destructive actions must not visually resemble benign navigation actions

## 15. Quick Controller prototype profile

Use a six-slot profile. Current default mapping locks only the initial suggestion, not the user's final arrangement:

- leftmost: Undo
- rightmost: Redo
- other four: not yet selected

All six slots, including Undo/Redo, can be reassigned and reordered by the user. No context system may implicitly replace or move a user's chosen assignments.

## 16. Workspace block behavior to communicate visually

The prototype should make this model understandable:

- Docked
- Collapsed
- Detached
- Pinned
- Re-docked
- Dismissed

Do not turn every block into an arbitrary free-floating window.

Detachment applies to coherent blocks such as Color, Brush, Layers subset, Reference, Properties.

## 17. Creation-proximity checks

The generated design must be inspected for:

- how far the pointer/pen travels from central Canvas to change Brush size
- how far it travels to change Color
- how many UI layers are needed to reach Layers
- Canvas occlusion caused by transient UI
- whether the same repeated action forces alternating attention between far edges
- whether Compact keeps common non-drawing controls within thumb reach

If a high-frequency operation repeatedly requires crossing the workspace, revise the design.

## 18. External product evidence to respect, not clone

Use these only as interaction evidence:

### Procreate

Official QuickMenu documentation confirms the value of a customizable radial menu and learned directional/muscle-memory interaction.

Reference:
https://help.procreate.com/procreate/handbook/interface-gestures/quickmenu

Procreate is relevant evidence for spatial shortcut/muscle-memory behavior. Illustro's current controller is independently defined by pen-position following, stroke-time hiding, a draggable semi-transparent donut, and an explicitly customizable flat-top six-slot layout.

### Krita

Official Krita documentation confirms the usefulness of an on-Canvas Brush Editor/HUD for changing a small set of brush parameters near the work, including configurable visible settings/order.

Reference:
https://docs.krita.org/en/reference_manual/dockers/oncanvas_brush_editor.html

Illustro uses this only as evidence for Creation Proximity; the Illustro Context Surface remains its own interaction model.

## 19. Reject conditions

Reject a generated draft if any is true:

- Canvas is visually secondary to panels
- all devices are scaled copies of one layout
- Compact contains desktop-style permanent side columns
- frequent Brush controls exist only in a deep panel
- Quick Controller pinned slots move due to context
- Core action is shortcut/hover/right-click only
- Context Surface duplicates an entire settings panel
- too many detached windows obscure the Canvas
- Apply/Cancel is ambiguous or missing for preview state
- Focus Mode has no discoverable touch exit
- design removes advanced capability instead of progressively disclosing it
- strong decorative styling competes with artwork

## 20. Dedicated UI Design Skill generation request

When Superdesign is available, use this document and `UI_GATE_E.md` as canonical generation context.

Generation goal:

> Design the Illustro Core painting workspace as a single coherent product across Expanded 1440×900, Medium 1024×768 and Compact 390×844. Prioritize Canvas dominance and Creation Proximity. Use progressive disclosure rather than feature removal. Show the required tool/context/workspace/search/focus/Quick Controller paths, one detached workspace example, and an explicit Apply/Cancel preview state. Device layouts must be structurally adapted rather than scaled copies. Keep chrome dark-neutral, low-distraction and production-oriented. Do not clone a named competitor's visual language.

First-generation output must be treated as a draft, not as Gate E approval.

## 21. Review sequence

Review generated drafts in this order:

1. semantic completeness
2. device-fit correctness
3. Canvas dominance
4. creation proximity
5. discoverability
6. touch/pointer target quality
7. visual hierarchy
8. aesthetic polish

Do not polish a structurally invalid draft.

## 22. Definition of ready-to-generate

This brief is ready when:

- no new product semantics must be invented by the design model
- each projection has a defined shell and required states
- rejection conditions are explicit
- remaining choices are legitimately visual/compositional

Current status: **EXPANDED / MEDIUM GENERATED, CORRECTED AND USER-APPROVED. COMPACT / SMARTPHONE VISUAL GENERATION AND REVIEW REMAIN PENDING.**


## Right Box interaction states to render

The visual prototype must include:

- normal expanded header;
- collapsed header with summary;
- Inspector header with Lock Context;
- Box More menu;
- docked reorder drop-zone preview;
- detach preview;
- detached Box;
- magnetic re-dock insertion preview;
- Reset Location / Reset Workspace Layout affordance;
- Layout Lock state;
- fixed five-button bottom strip.

Do not add a permanent Detach icon to every Box header unless visual testing demonstrates a concrete need and the semantic spec is explicitly revised.


## Layer Page visual state

Render the Layer Page as an expanded right-side layer-management surface inspired by ibisPaint's Layer Window interaction model, without copying its visual style.

Must show:
- Canvas still visible on the left;
- wide layer-management page on the right;
- layer tree/list as the dominant area;
- visibility/reorder/folder hierarchy;
- selected-layer high-frequency properties including opacity/blend/clipping/alpha-lock class controls;
- compact structural action strip including Add Layer and special layer creation;
- local search/filter;
- close/back;
- synchronization relationship with the compact Layers Box;
- optional detached/floating state for PC/tablet comparison.

Do not invent Layer Page-only layer state or commands.


## Visual correction rules from user review

These are acceptance requirements, not optional polish:

- **Anchored Layer Page width must equal the current Right Workspace width.** It must not appear as a second, arbitrarily wider sidebar.
- **Tablet keeps the PC visual grammar by default.** Do not enlarge headers, rows, controls and the bottom strip wholesale. Adapt only what is needed for touch hit areas and vertical fit.
- At the tablet review size, the initial Layers / Color / Brush presentation must not leave controls visibly protruding behind the fixed five-button bottom strip.
- The six Quick Controller buttons must have centers on an even flat-top regular-hexagon arrangement.
- Each Quick Controller button disc must be fully contained inside the donut's outer boundary **and** remain outside the central draggable hole. Buttons may occupy the donut band, but may not hang outside it or intrude into the blank center.
- Do not fix these issues by redesigning unrelated Left/Right/Canvas structure.


### Tablet right-stack clipping defect — corrected rule

The visual prototype exposed a failure mode: proportionally shrinking Layers / Color / Brush bodies to fit the tablet viewport can make fixed-size children overflow their Box, visually collide with the next header/fixed strip, and make the panel look corrupted.

Required behavior:

- keep the PC Box geometry/content density unless a specific control requires touch adaptation;
- never shrink an expanded Box body below the intrinsic height needed by its visible children;
- let the outer Right Box stack scroll vertically instead;
- keep the five-button bottom strip fixed;
- collection sublists may scroll internally, but must not show accidental partial rows solely because of an arbitrary viewport height.

For the current Layers compact list, the review prototype shows **three complete rows** rather than a clipped partial fourth row.

### Quick Controller review-size correction

The previous 150px visual controller was too large relative to the Canvas.

Current visual-review candidate:

- controller footprint: **112×112 CSS px**
- donut outer diameter: **100 px**
- donut inner diameter: **44 px**
- six button discs: **28 px**
- button centers: regular flat-top hexagon, radius **36 px**

Geometry invariant:
- every button disc is fully inside the donut outer boundary;
- every button disc remains outside the center hole.

This visual token was accepted by the user as part of the Expanded / Medium visual review on 2026-09-29. It does not change Quick Controller semantics.
