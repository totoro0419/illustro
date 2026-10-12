# Illustro Workspace Visual Customization Specification

> Date: 2026-09-30  
> Status: **SEMANTIC / INTERACTION DESIGN COMPLETE — VISUAL/RUNTIME CALIBRATION PENDING**  
> Scope: PC / tablet Workspace customization; Compact projection rules where relevant  
> Production implementation: Core Drawing Slice may start under `../IMPLEMENTATION_BASELINE.md`

## 1. Requirement

Illustro Workspace customization must be **visually understandable and directly manipulable**.

A user should not have to open a deep Settings screen to discover that the Right Workspace can be resized or rearranged.

The default principle is:

> **See the thing -> manipulate the thing -> immediately preview the result.**

Settings, More menus and commands remain alternative routes, not the primary explanation of layout customization.

This specification specializes the general direct-manipulation and non-drag rules in `UI_INPUT_CONTROL_STANDARD.md`.

## 2. Two-layer customization model

Illustro uses two complementary layers.

### 2.1 Normal workspace — safe direct manipulation

Common low-risk layout changes are directly available in the normal painting workspace:

- Right Workspace width resize;
- expanded Box height resize;
- Box expand/collapse;
- Box reorder by header drag;
- detach / re-dock;
- floating Box move/resize;
- Quick Controller repositioning where supported.

Normal painting remains the primary mode. Extra customization chrome stays restrained until the pointer/focus/touch target indicates intent.

### 2.2 Customize Workspace mode — explicit structural editing

A dedicated **Customize Workspace** mode exposes all structural editing affordances at once.

It is the preferred route for:

- showing / parking Boxes;
- reordering many Boxes;
- inspecting which surfaces are movable/resizable;
- changing dock side;
- managing detached/floating Boxes;
- Quick Controller slot/layout customization;
- saving/updating a Workspace Preset;
- reset/recovery of layout changes.

Entering this mode must make the editable structure visually obvious without requiring the user to know hidden drag gestures.

## 3. Right Workspace width — direct visual resize

### 3.1 Primary path

The Canvas-facing edge of the Right Workspace is the resize boundary.

Pointer:

- moving into the effective boundary changes the cursor to a horizontal resize cursor;
- the boundary becomes visibly emphasized;
- a small centered grip appears or strengthens;
- drag horizontally to resize continuously.

Touch/pen:

- the boundary exposes a dedicated visible resize grip with a touch-capable effective target;
- dragging the grip resizes the Workspace;
- the entire Canvas-adjacent strip must not become an accidental resize surface that steals painting strokes.

### 3.2 Live feedback

During width drag:

- Right Workspace reflows live;
- Canvas allocation previews live;
- a compact transient width readout may show the current CSS-pixel width for precision;
- the default-width crossing may show a subtle snap/reference marker;
- there is no inertial lag between pointer/pen and the edge.

Release commits one Workspace-layout change.

Esc / pointer cancel restores the pre-drag width.

### 3.3 Bounds and projection

Existing geometry remains authoritative:

Pointer profile:
- default 344 CSS px;
- min 288;
- max 440.

Touch/pen profile:
- default 360 CSS px;
- min 320;
- max 440.

If the inline Canvas would fall below the existing usable-width threshold, the Right Workspace follows its existing inline/overlay projection rules rather than creating page-level horizontal scrolling.

### 3.4 Non-drag alternative

Workspace -> Resize Right Workspace provides:

- Narrower;
- Wider;
- Default Width;
- a width slider/preset control where useful.

Exact numeric width may be exposed in advanced/customization UI but is not required to occupy normal painting UI.

## 4. Box height resize

Expanded Boxes that support remembered height expose a lower-edge resize affordance.

Normal mode:

- divider remains visually quiet;
- pointer/focus proximity reveals the resize state;
- touch uses a deliberate grip, not an invisible thin line.

Customize mode:

- resizable lower edges are persistently indicated;
- non-resizable/collapsed Boxes do not pretend to be draggable.

Live Box content reflows during resize.

Non-drag route:

- Increase Height;
- Decrease Height;
- Fit Content;
- Reset Size.

## 5. Visual reorder

### Normal mode

The non-control header region remains the drag area.

When drag starts:

- the source Box visibly lifts/separates from the stack;
- insertion zones appear;
- the destination gap previews at its exact final position;
- neighboring Boxes move only as preview;
- invalid destinations visibly reject the drop.

### Customize mode

Every movable Box shows an explicit reorder handle.

This removes the need to infer that the title/header can be dragged.

Alternative actions remain:

- Move Up;
- Move Down;
- Move to Top;
- Move to Bottom;
- Move To....

## 6. Show / park Boxes

Factory/default Workspace still contains all 12 semantic Right Boxes.

A user may explicitly **Park** a Box from the active stack in Customize Workspace.

Parked does not mean deleted.

A parked Box:

- remains registered;
- appears in the Customize Workspace **Available Boxes** section;
- remains reachable from Command Search / feature deep-link;
- can be restored with one click/tap;
- preserves its internal state unless that state is session-only by another specification.

This resolves the tension between a complete feature registry and user-controlled visual density.

Ordinary painting mode does not show permanent eye/hide buttons on every Box header. Show/Park controls appear in Customize Workspace or Box More.

## 7. Detach / floating customization

Existing drag-detach and explicit Detach remain valid.

Customize mode makes detachment visibly discoverable by showing a temporary detach control/target.

Detached Boxes show:

- move region;
- resize affordance;
- Dock Back;
- Reset Location;
- collapse state;
- pin/always-on-top only where the Box semantics support it.

Magnetic docking remains preview-first. The Box never jumps docks before release.

## 8. Customize Workspace mode UI

Entry points:

- Workspace Box -> **Customize Workspace**;
- Command Search;
- Workspace top-level command route.

When active:

- a compact customization bar is shown;
- editable UI surfaces receive temporary handles/outline cues;
- Right Workspace remains visible in its real position;
- Canvas remains visible so the user can judge usable art space.

Customization bar contains:

- **Done**;
- **Cancel**;
- Workspace Layout Undo;
- Workspace Layout Redo;
- Save/Update Preset where appropriate;
- Reset Workspace Layout.

Do not bury Done/Cancel below a long settings page.

## 9. Customization transaction and recovery

Entering Customize Workspace captures the current layout snapshot.

While active:

- changes apply as live preview;
- Workspace Layout Undo/Redo affect only customization/layout state;
- Artwork Undo/Redo are untouched.

Done:
- persists the resulting Workspace state according to the existing persistence model.

Cancel / Esc:
- restores the entry snapshot.

Outside Customize mode, a direct resize/reorder/detach commits on release and is recoverable through the session-level Workspace Layout Undo command and existing Reset controls.

Workspace layout operations never create Artwork History entries.

## 10. Layout Lock

Lock Workspace Layout remains the protection against accidental structural changes.

When locked:

- resize/reorder/detach/re-dock direct manipulation is disabled;
- the visual resize/reorder affordances are suppressed or shown as locked;
- content controls still work.

Customize Workspace remains discoverable.

Entering customization while locked presents an explicit **Unlock Layout** action; it does not silently bypass the lock.

## 11. Left UI and Quick Controller

The same visual customization principle applies, but not every dimension becomes freely resizable.

### Left Pinned Rail

Customize Workspace may expose:

- pinned tool order;
- add/remove pinned entries;
- handedness / side;
- profile/preset selection.

Free arbitrary rail-width dragging is not introduced merely for symmetry. Rail density/scale remains controlled by the defined UI-scale/density system unless later evidence shows a concrete need.

### Quick Controller

Customize mode exposes:

- slot assignment;
- slot order;
- controller position;
- reset to default profile.

Direct repositioning remains available through the controller's safe drag region where specified.

## 12. Workspace presets

A Workspace Preset stores the existing Workspace-persistent layout state, including:

- Right Workspace width;
- Box order;
- expanded/collapsed state;
- remembered Box heights;
- parked/active Box state;
- dock/detach state;
- floating location/size;
- mirror side;
- relevant Left UI customization;
- Quick Controller profile/position as defined by its own persistence rules;
- Layout Lock state.

Changing the current layout marks the active preset as modified.

The Workspace summary must expose that modified state.

Save / Update / Duplicate Preset remain explicit commands.

## 13. Visual language

Customization affordances must look interactive before the user commits.

Use:

- resize cursor/grip;
- reorder handle;
- insertion line/gap;
- dock target highlight;
- temporary outline for movable surfaces;
- visible locked state;
- lightweight live preview.

Do not rely only on:

- color;
- hover;
- hidden context menus;
- long-press;
- tiny one-pixel boundaries.

Aurora theme may accent active customization handles with its approved blue -> blue-violet range, but the semantic affordance must remain understandable in Simple/Mono themes as well.

## 14. Device adaptation

### PC

- pointer resize/reorder is fast and direct;
- hover can strengthen affordances but cannot be the only discovery path;
- keyboard/command alternatives remain available.

### Tablet

- customize mode is especially important because permanent resize/reorder handles would compete with pen drawing;
- touch/pen grips use larger effective targets;
- structural changes do not require hover;
- pen drawing contact on Canvas must not be reinterpreted as Workspace resize unless started on the explicit grip.

### Compact

Compact does not reproduce desktop free-form docking.

It projects the same customization intent through:

- Workspace Page order edit;
- show/park pages;
- explicit PiP;
- preset management;
- non-drag reorder controls.

The Compact Workspace specification remains authoritative for exact presentation.

## 15. UI Implementation Quality constraints

This design follows the project UI Implementation Quality rules:

- direct manipulation is an accelerator, not the only route;
- drag operations have click/tap alternatives;
- custom splitter/resize surfaces either expose complete interaction semantics or defer to adjacent standard controls;
- focus, selected, locked and disabled states are distinct;
- target metrics remain platform/input scoped;
- layout changes are recoverable;
- responsive intermediate states must be tested, not only default widths.

## 16. Runtime validation still required

Before Production PASS, verify:

- pointer acquisition of resize edges;
- stylus/touch false-positive resize rate;
- intermediate widths, not only min/default/max;
- Box reflow at every supported width;
- text scaling and localization;
- screen-reader semantics for any custom splitter;
- keyboard resize path;
- Customize mode focus order;
- Done/Cancel/Undo/Redo recovery;
- layout persistence across restart/preset switch;
- performance during live resize/reorder;
- detached Box clamping after viewport changes.

## 17. Completion boundary

The **interaction semantics** of visual Workspace customization are fixed by this specification.

Still pending:

- exact grip artwork;
- exact hover/focus animation;
- exact effective resize-zone thickness where not already fixed;
- magnetic thresholds;
- motion timing;
- final rendered validation on PC/tablet/compact.

Those are runtime/visual calibration, not open interaction-method design.
