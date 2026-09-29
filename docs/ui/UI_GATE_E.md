# Illustro UI Gate E — Core UI Surface & Workspace

> Status: **DEFINITION IN REVISION / VISUAL PROTOTYPE PENDING**
> Date: 2026-09-29
> Scope: Core painting UI shell, Workspace, Context Surface, Quick Controller, device layout, Focus Mode and visual acceptance.
> Production effect: **None. This document does not authorize Production implementation.**
> Authority: PRODUCT_SPEC.md → REDESIGN_PRINCIPLES.md / CREATION_PROXIMITY_PRINCIPLES.md → Interaction / Feature specs → this UI gate.
> Important: Visual prototyping must use the dedicated UI Design Skill and must be reviewed by the user before Gate E can be marked PASS.

## 1. Gate purpose

Gate E separates two different decisions:

1. **Core UI structure / interaction architecture** — being refined with the user in this Gate.
2. **Final visual composition / polish** — requires a rendered prototype and user review.

Core V2 already fixes semantic commands and interaction meaning. UI Gate E decides how those capabilities are surfaced without changing their semantics.

The UI must optimize in this priority order:

1. intuitive operation
2. ease of use
3. responsiveness / low recurring cost
4. creation speed
5. feature breadth
6. customization

A simpler appearance may not be achieved by removing required capability.

## 2. Non-negotiable principles

### E-P1 Canvas dominance

Canvas is the primary workspace.

Persistent chrome must not consume space merely because a feature exists.

High-frequency controls are allowed near the Canvas; low-frequency controls are progressively disclosed.

### E-P2 Creation Proximity

For frequently changed information/settings, prefer bringing the control to the user instead of forcing the user to travel to a distant fixed panel.

Applies to:

- Color
- Brush basics/settings
- Layer actions
- Reference
- Transform / Selection / Fill context
- frequently used commands

### E-P3 One semantic command, many surfaces

Toolbar, Context Surface, Command Search, Quick Controller, detachable block, shortcut and gesture call the same Core semantic command.

No Core behavior is encoded around one visual form.

### E-P4 Progressive disclosure without a reduced-function mode

Illustro does not split the product into a permanently feature-reduced “simple mode” and a separate full mode.

Complexity is managed through:

- Context Surface
- detachable blocks
- Quick Controller
- Command Search
- Focus Mode
- collapsible/stacked Workspace blocks
- device-specific layout

Advanced capability remains discoverable.

### E-P5 Device-specific projection

Expanded / Medium / Compact share semantics but not identical geometry.

No device class is a simple scaled copy of another.

### E-P6 Spatial memory is stable

Quick Controller slots never reorder implicitly.

All six slots are user-customizable/reorderable. The default profile places Undo at the leftmost slot and Redo at the rightmost slot, but those assignments and positions are not locked.

### E-P7 Direct manipulation first

When a target has an obvious spatial representation, Canvas manipulation is primary and numeric/property controls are precision supplements.

### E-P8 Inactive UI is cheap

Hidden/detached/inactive UI must not trigger document-wide analysis, full asset scans, brush preloading or other persistent heavy work.

## 3. UI hierarchy

The Core painting UI is divided into six surface classes.

### 3.1 Canvas

Highest-priority surface.

Contains:

- artwork
- tool handles
- selection/transform affordances
- direct reference manipulation where active
- transient contextual overlays
- Canvas-near Quick Controller when summoned

### 3.2 Primary Tool Surface

Stable tool selection.

Contains tool identities, not deep settings, and is **icon-first** rather than text-led.

Canonical option catalog:

- [Left Tool Surface — Option Catalog](LEFT_TOOL_SURFACE_OPTIONS.md)

The default visible set is intentionally not fixed yet. Users may customize which eligible tools/modes appear.

Tool choice and tool settings are separate.

### 3.3 Context Surface

Shows the smallest useful set of parameters for the current tool/selection/target.

Examples:

Brush:
- current brush
- size
- opacity

Fill:
- tolerance
- gap
- source
- region mode

Transform:
- mode
- interpolation
- flip
- Apply / Cancel

Context Surface may expose a drill-down into the corresponding detachable/full block.

### 3.4 Workspace Blocks

Meaningful blocks such as:

- Layers
- Color
- Brush
- Reference
- History
- Navigator
- Properties

Blocks form a **magnetic Workspace/PiP system**. They can be reordered, docked, detached, collapsed or temporarily pinned where the device form permits. Compatible docking zones/neighboring blocks may magnetically accept a dragged block.

Detach/reorder never changes feature meaning.

### 3.5 Quick Controller

Transient spatial-memory command surface.

It is not the only route to any Core command.

### 3.6 Command Search

Global discovery and execution fallback.

Search indexes commands, tools, panels, brushes, macros, settings and selected-context actions.

## 4. Expanded layout baseline

Reference prototype viewport: **1440 × 900**.

This is a prototype reference size, not a fixed product requirement.

### Structure

- minimal top document/app strip for non-drawing application/document operations such as Home and Save; Undo/Redo do not live here
- stable icon-first left Primary Tool Surface
- central Canvas
- right magnetic Workspace/PiP stack
- transient Context Surface inside the Canvas working region
- optional detached Workspace Blocks over/near unused Canvas margin
- bottom status information only when it has persistent value

### Default behavior

- Canvas is visually dominant.
- Right Dock defaults to Layers as the primary visible block.
- Color and Brush are available in the Dock but may detach independently.
- Context Surface is tool-specific and substantially smaller than a full settings panel.
- Detached blocks float only when requested; the default state is not a field of floating windows.
- Command Search is keyboard-fast but always has an on-screen path.
- Focus Mode hides top strip, tool rail and dock while preserving summonable Context / Quick Controller and critical recovery/error state.

### Pointer/pen travel rule

A setting changed repeatedly during painting should not require travel from a central Canvas position to the far right Dock on every adjustment.

It must be eligible for Context Surface, Quick Controller or detach/pin.

## 5. Medium layout baseline

Reference prototype viewport: **1024 × 768**.

Designed for tablet-class stylus + touch use, but capability-driven.

### Structure

- Canvas-first full working area
- compact Primary Tool Surface at one edge
- persistent full-height right Dock is not the default
- Workspace Blocks open as anchored overlay / drawer / detachable card
- Context Surface appears near a reachable Canvas edge
- Quick Controller is pen/touch summonable
- touch gestures retain Pan / Zoom / Rotate while the pen tool remains selected

### Default behavior

- Layers opens as an anchored workspace panel and can remain pinned while useful.
- Color/Brush basics are closer to the drawing hand than a desktop-style distant inspector.
- External keyboard/trackpad may add shortcuts without changing semantic layout.
- Split-screen and orientation changes reflow the shell without resetting the Canvas view transform.
- Focus Mode preserves a touch-visible exit.

## 6. Compact layout baseline

Reference prototype viewport: **390 × 844** portrait, with landscape reflow required.

### Structure

- Canvas occupies nearly the entire viewport
- no permanent desktop-style side panel
- compact top document/status strip
- thumb-reachable primary tool/command surface at the lower edge
- Workspace Blocks open as bottom/edge sheets or temporary cards
- Context Surface is compact and collapsible
- Quick Controller is anchored to a reachable corner/edge when cursor-centered radial space is insufficient

### Default behavior

- Core painting is touch-only completable.
- Common non-drawing commands are reachable one-handed.
- Layers, Brush settings, Color and Reference never require tiny controls.
- Reference can enter a temporary overlay/fullscreen comparison form while preserving a fast return to painting.
- Numeric precision remains available but is never the only path.
- virtual keyboard and safe areas may not cover required Apply/Cancel/Search controls.

## 7. Quick Controller concrete baseline

For the current PC/tablet design pass, Gate E adopts an optional **pen-following six-button donut controller** for high-frequency shortcuts.

### Expanded / Medium

When the controller is enabled:

- its anchor follows the current pen position;
- while a pen stroke is actively being drawn, the controller is hidden;
- after pen-up, a semi-transparent donut/ring appears near the pen position;
- six buttons are arranged evenly at the vertices of a flat-top hexagonal layout (the six-point layout with distinct leftmost and rightmost positions);
- the donut/ring whitespace is draggable for repositioning;
- button treatment should minimize artwork obstruction; outline-led buttons are a visual candidate, not yet a locked visual rule.

Default profile:

- leftmost slot: Undo;
- rightmost slot: Redo;
- remaining four slots: user-chosen.

All six slots, including the default Undo/Redo slots, are user-customizable and may be reordered. The left/right Undo/Redo mapping is a default, not a permanent restriction.

Open question:

- how manual ring dragging interacts with subsequent pen-position following (temporary offset, pinned mode, reset condition, etc.) is not yet locked.

### Compact

Smartphone geometry/behavior is not yet derived from the PC/tablet controller. Do not assume a scaled copy or an edge-arc substitute until Compact is designed explicitly.

### Required invariants

- no implicit slot reordering;
- all six slot assignments are explicitly customizable;
- controller is hidden during an active drawing stroke;
- opening/closing/repositioning the controller is not Artwork History;
- customization mode is explicit;
- no document-wide scan is allowed merely to show the controller;
- it remains an additional command route, not the only route to a Core command.

## 8. Detachable Workspace concrete baseline

Gate E adopts **meaningful detachable blocks** rather than arbitrary window fragmentation.

Initial detachable candidates:

1. Color
2. Brush basics/settings
3. Layers subset
4. Reference
5. target-specific Properties

Rules:

- block can detach only as a coherent semantic unit
- dock ↔ detach does not change command semantics
- position/size/pin state is Workspace-persistent where appropriate
- temporary open/close is Session state
- direct re-dock/dismiss is required
- detached block must avoid covering the active pen contact area where possible
- Compact may project the same block as sheet/card rather than free-floating window

## 9. Context Surface rules

Context Surface is the preferred location for high-frequency per-tool controls.

Rules:

- maximum useful controls, not maximum available controls
- no duplicate deep panel in miniature
- advanced settings reachable by one clear drill-down
- Apply/Cancel remain explicit for preview-before-commit tools
- state is not communicated by color alone
- tool switching follows Interaction Model commit/cancel policy

## 10. Focus Mode

Focus Mode is Core.

Enter:

- explicit on-screen command
- shortcut/gesture may accelerate

Behavior:

- hide non-essential shell
- preserve Tool, Selection and Canvas view
- preserve summonable Context Surface
- preserve summonable Quick Controller
- permit critical recovery/storage/error state to surface
- do not place toggle in Artwork Undo

Exit:

- same command
- keyboard path
- touch-visible path

## 11. Discovery

No Core feature is allowed to be discoverable only through tutorial memory, hover or undocumented gesture.

Discovery stack:

1. visible tool/context entry for Tier 1
2. Context Surface / overflow for Tier 2
3. Command Search for full capability
4. Quick Controller customization browser
5. tooltip/help/first-use hint as supplement only

Unavailable commands should explain why when useful instead of disappearing indiscriminately.

## 12. Visual-system constraints

Exact brand polish remains a rendered-prototype decision, but the following are fixed:

- Canvas and artwork receive visual priority over chrome
- chrome must use a low-distraction neutral hierarchy
- selected/active state is indicated by more than hue alone
- actual current Color remains continuously identifiable
- hover affordances have touch equivalents
- labels/accessibility names exist even where compact UI primarily uses icons
- hit targets expand appropriately for touch capability
- reduced-motion mode is supported
- destructive or commit-bearing controls must not be visually confusable with passive view controls

Theme/accent/iconography are not marked final until the rendered Gate E prototype is reviewed.

## 13. Persistence classes

Document-persistent:

- only UI state that is part of document meaning/workflow, as defined by feature specs

Workspace-persistent:

- dock layout
- detached block placement where appropriate
- Quick Controller profiles
- shortcut/binding configuration
- current brush/color selections where already specified

Session-only:

- transient popovers
- current Quick Controller open state
- temporary Focus state
- hover state

Artwork History must not include pure Workspace/session rearrangement.

## 14. Performance contract

UI Gate E requires:

- no full document scan to open Quick Controller or Command Search
- no all-brush preload when opening Brush UI
- lazy thumbnails/assets
- hidden large Reference reduces/releases GPU residency where safe
- inactive advanced panels near-zero recurring work
- responsive layout changes are coalesced and do not reset Document semantics
- device layout adaptation is capability/viewport driven, not UA-only

## 15. Gate E prototype package

Canonical generation brief:

- [UI Gate E — Visual Prototype Brief](UI_GATE_E_VISUAL_BRIEF.md)

A PASS candidate must contain all three in one visual comparison set:

1. **Expanded** — 1440×900 reference
2. **Medium** — 1024×768 reference
3. **Compact** — 390×844 reference

Each must visibly demonstrate:

- Canvas dominance
- Primary Tool Surface
- Context Surface
- Layers access
- Color access
- Brush access
- Quick Controller entry and open state
- one detachable/pinned Workspace example
- Focus Mode access
- Command Search access
- Apply/Cancel example for a preview tool
- recovery/error indicator placement

The prototype must use the dedicated UI Design Skill.

## 16. Gate E acceptance criteria

Gate E may be marked **PASS / UI BASELINE APPROVED** only when all are true:

- user reviews the rendered Expanded / Medium / Compact set
- no required P0 command becomes keyboard-only, hover-only or right-click-only
- Tier 1 operations are not buried in deep settings
- pinned Quick Controller slots remain spatially stable
- Compact is touch-only completable
- no layout depends on a fixed device brand/UA
- Focus Mode has a discoverable touch exit
- Context Surface preserves common commit/cancel semantics
- detachable blocks preserve semantic meaning
- Canvas remains the dominant workspace in all three projections
- no visual decision contradicts Architecture V2 / Interaction Model
- UI generation was performed with the dedicated UI Design Skill

## 17. Current Gate E state

### Gate definition: **IN REVISION**

Gate E is currently being refined with the user. Confirmed decisions are recorded above, but unresolved UI semantics must not be treated as locked.

### Visual prototype: **NOT GENERATED / UNVERIFIED**

The required prototype path is the dedicated UI Design Skill (Superdesign). Figma is optional and is not part of Gate E acceptance.

On 2026-09-29, Superdesign CLI startup/registry access timed out in the current execution environment, so no rendered screen could be produced or independently inspected in this session.

A failed optional Figma attempt does not block Gate E.

### Gate result: **NOT YET PASS**

Do not label Gate E complete merely because the specification exists.

`UI_GATE_E_VISUAL_BRIEF.md` is a working brief and must track the ongoing Gate E decisions.

Remaining Gate E work is:

1. finish unresolved structural/UI decisions with the user;
2. update the visual brief so it contains no stale assumptions;
3. render the reference layouts with the dedicated UI Design Skill;
4. inspect them for structural/visual defects;
5. obtain user review and record accepted visual decisions;
6. then change Gate E to PASS / UI BASELINE APPROVED.

Production Gate F remains independently locked.
