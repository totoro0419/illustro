# Illustro Right Workspace — Box Interaction Specification

> Status: **SUPPORTING DETAIL / CANONICALIZED**
> Date: 2026-09-29
> Scope: Supporting interaction detail
> Canonical authority: [Right UI — Canonical Specification](RIGHT_UI_SPEC.md)
> Parent:
> - [Right Workspace — Box Taxonomy V2](RIGHT_WORKSPACE_BOX_TAXONOMY.md)
> - [Right Workspace — Default Layout & Collapse](RIGHT_WORKSPACE_DEFAULT_LAYOUT.md)
> Evidence:
> - [Right Workspace — General UI Research](RIGHT_WORKSPACE_GENERAL_UI_RESEARCH.md)

## 1. Evidence-backed decisions

This specification incorporates current official behavior/patterns from professional UIs:

- Adobe Photoshop: vertical panel docks, visible drop zones, floating panels, Esc-to-cancel panel movement, collapse/expand, and Workspace Lock to prevent accidental panel movement.
- JetBrains IDEs: tool-window header/options model, drag and non-drag Move/Resize commands, detached/floating modes, remembered layouts, and default-layout restore.
- Apple HIG: panels/inspectors are supplementary to the main content; inspectors follow current selection and should use short purpose-oriented titles.
- W3C WCAG 2.2: drag operations need a non-drag single-pointer alternative; focus order must preserve meaning; pointer targets need adequate size/spacing.

The UIimprove project guidance remains applicable: task reachability, predictability, recovery and input accessibility take priority over decorative minimalism.

## 2. Box header anatomy

Every normal Right Box uses the same header grammar.

### 2.1 Docked header

Left -> right:

1. **Expand/Collapse control**
2. **Box icon**
3. **Short noun/noun-phrase title**
4. **Context / collapsed summary region**
5. **Box-specific persistent state control only when justified**
6. **More menu**

Baseline examples:

```
[v] [Layers]  Layer: Hair                 [...]
[v] [Color]   ■ #7A5CFF                   [...]
[>] [Inspector] Smart Fill         [Lock] [...]
```

### 2.2 Controls that are always visible

Always:

- Expand/Collapse
- title
- More

Inspector only:

- Lock Context may remain directly visible because it changes the fundamental follow-vs-fixed Inspector behavior.

Other low-frequency controls do **not** receive permanent header buttons by default.

In particular, Detach/Re-dock is not a permanent icon in every header.

Reason:
- direct header drag already supports spatial manipulation;
- More provides a discoverable non-drag route;
- removing permanent low-frequency icons reduces chrome and accidental activation.

### 2.3 Header title

Title is short and stable.

Use the semantic Box name, not a changing sentence.

Examples:

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

Context belongs in the summary/context area, not by renaming the Box itself.

### 2.4 Header click semantics

- Expand/Collapse button: toggles expansion.
- Title/context area: focuses the Box; it does not execute content commands.
- Double-click title/non-control header area may toggle collapse/expand as a pointer accelerator.
- Double-click is never the only collapse path.
- More opens Box operations.

This avoids conflict between single-click activation and drag initiation.

## 3. Header drag area

The non-control portion of the header is the direct-manipulation drag area.

Starting a drag on:

- Expand/Collapse;
- Lock Context;
- More;
- another interactive control

must activate that control, not move the Box.

A small movement threshold distinguishes click/focus from drag. The exact threshold is an input/visual token and must be runtime-tuned rather than hardcoded as a universal UX constant.

## 4. Layout Lock

Right Workspace provides **Lock Workspace Layout**.

Default factory state:
- **Unlocked**.

When enabled:

Disabled:
- drag reorder;
- drag detach;
- drag re-dock;
- Box resize;
- Right Workspace width resize.

Still available:
- expand/collapse;
- Box content interaction;
- Left/Search navigation;
- Layer Page;
- fixed bottom commands.

Layout Lock is Workspace state and persists with the Workspace/Preset.

The command is available from:
- Workspace Box;
- Search;
- relevant top-level workspace command route.

Purpose:
- prevent accidental panel movement during pen/stylus use without removing customization capability.

## 5. Reordering inside the Right stack

### Direct drag

Dragging a docked Box vertically shows **insertion drop zones** between Boxes.

When a valid insertion zone is entered:

- a full-width insertion indicator appears;
- neighboring Boxes preview the resulting gap;
- the dragged Box remains visibly attached to the pointer/pen.

Commit:
- pointer/pen release inside the valid zone.

Cancel:
- Esc;
- explicit pointer cancel;
- loss/cancel event.

Invalid release:
- Box returns to its origin.

No document/artwork state is changed.

### Non-drag alternatives

More -> Move contains:

- Move Up
- Move Down
- Move to Top
- Move to Bottom
- Move To...

Move To opens the ordered Box list and lets the user choose the insertion destination with a simple click/tap.

Keyboard command routing can invoke the same Move actions.

This is required because dragging is an accelerator, not the only reordering path.

## 6. Detach

### Direct drag detach

Dragging a docked Box laterally out of the Right stack:

1. Box crosses out of the active dock region.
2. A floating outline preview appears.
3. Existing Right stack insertion preview disappears.
4. Release in a valid Canvas/workspace region -> Box becomes detached PiP.
5. Esc/cancel -> origin restored.

There is no invisible “tear-off” side effect merely from small horizontal jitter.

### Explicit detach

More -> **Detach**

This detaches without requiring drag.

Default detached location:
- adjacent to the Right Workspace near the source Box;
- clamped to visible safe workspace;
- does not intentionally cover the current pen contact point when that location is known and avoidance is practical.

## 7. Detached Box chrome

Detached Box keeps the same semantic header.

It adds no second title bar.

Its More menu changes contextually:

- Dock to Right Workspace
- Move...
- Reset Location
- Resize / size presets where applicable
- other Box-specific actions

The same Expand/Collapse behavior remains.

Collapsed detached Box becomes a compact floating header; it does not automatically re-dock.

## 8. Magnetic behavior

Illustro uses **previewed magnetic docking**, not surprise pointer attraction.

### 8.1 Dock targets

A detached Box can magnetically target:

1. the Right Workspace stack;
2. insertion positions between Right Boxes;
3. top/bottom alignment edges of another detached Box.

### 8.2 Docking to Right Workspace

When the dragged Box enters a valid Right-stack drop zone:

- the destination highlights;
- an insertion placeholder shows the exact final position;
- the Box is not committed until release.

Release:
- Box re-docks at the previewed position.

### 8.3 Magnetic alignment between detached Boxes

A detached Box may align its top/bottom edge and side edge with another detached Box.

This is **spatial alignment only**.

It does **not**:

- create a new semantic Box;
- create tabs;
- merge content;
- create shared selection/state;
- force the Boxes to move as one persistent group.

Moving either Box away breaks the alignment naturally.

This gives tidy PiP placement without introducing another grouping model.

### 8.4 No arbitrary semantic tab grouping

Baseline does not let users merge unrelated Boxes into arbitrary tab containers.

Examples:
- Color + History do not become a new combined semantic panel.
- Brush + Assets remain independent even when adjacent.

This may be revisited only if visual/runtime testing demonstrates a concrete need.

## 9. Re-dock without drag

Detached Box More -> **Dock to Right Workspace**

Default explicit Dock command:
- returns to its remembered logical Right-stack position when still valid;
- otherwise returns to the nearest valid position based on its stored order.

More -> Move To may choose another exact insertion destination.

## 10. Reset / recovery

Every Box supports:

- **Reset Location**

Effects:

- detached -> restore to its canonical/default Right-stack location;
- reordered -> restore that Box to canonical default order position;
- off-screen -> restore visibly.

Workspace supports:

- **Reset Workspace Layout**

Reset Workspace Layout restores:

- canonical Box order;
- canonical expanded/collapsed defaults;
- canonical docking state;
- canonical right-side placement;
- factory Right Workspace width/sizing profile.

It does not alter artwork/document state.

Reset requires confirmation when it would discard a customized saved workspace arrangement.

## 11. Resize behavior

### 11.1 Right Workspace width

The docked Right Workspace has one shared width.

Resize:
- drag its Canvas-facing edge;
- or use Workspace / Resize commands.

The shared width is Workspace-persistent.

A Box does not have an independent docked width.

### 11.2 Docked Box height

Expanded Boxes may have remembered heights where their content benefits from it.

Resize:
- drag the Box's lower boundary/divider;
- or More -> Resize.

Supported non-drag actions:

- Increase Height
- Decrease Height
- Fit Content
- Reset Size

The visual increments are runtime/input tokens.

Collapsed Box height is fixed by the header profile.

### 11.3 Detached size

Detached Boxes may resize in both axes subject to:

- content-specific minimum;
- visible safe workspace;
- required control target sizes.

Resize state persists as Workspace state.

### 11.4 Internal scrolling

If content exceeds the Box's expanded size, content scrolls inside the Box.

Resizing a Box does not resize the Canvas document or change artwork zoom.

## 12. Expand / collapse behavior

Primary path:
- explicit Expand/Collapse control.

Accelerators:
- double-click non-control header region on pointer systems;
- commands/search where useful.

Rules:

- expanding one Box never auto-collapses another;
- collapse preserves the Box's internal selection/state;
- re-expansion restores internal scroll/section state where useful;
- collapsed metadata summary continues updating cheaply;
- collapsed Boxes stay in logical keyboard order.

## 13. Deep-link behavior

Left/Search -> Right Box:

### Box-level target

- bring Box into view;
- if detached, bring forward;
- if collapsed and the user requested the Box itself, focus/reveal without necessarily forcing expansion unless content access requires it.

### Specific section/property target

- bring Box into view;
- expand it;
- reveal/scroll to section;
- briefly identify target without relying only on color;
- move keyboard focus to the target only when the invocation flow is keyboard-oriented or editing requires it;
- pointer invocation must not unexpectedly steal keyboard focus.

Other Boxes are not auto-collapsed.

## 14. Inspector-specific header

Inspector follows the standard header plus:

- context path/target summary;
- **Lock Context** direct control.

Unlocked:
- follows current Tool/entity/selection.

Locked:
- keeps current target until unlocked or target becomes invalid.

If the locked target becomes invalid/deleted:

- show unavailable context state;
- offer Unlock / Follow Current;
- do not silently retarget.

## 15. Fixed bottom command strip interaction

The fixed five-button strip remains outside Box layout manipulation.

Order is fixed:

1. Layer Page
2. Undo
3. Redo
4. Horizontal Flip
5. Vertical Flip

It cannot:
- reorder with Boxes;
- detach;
- collapse;
- scroll away with the Box stack.

Visual glyphs may be compact, but effective hit areas must satisfy applicable pointer-target requirements and expand for touch-capable profiles.

Horizontal/Vertical Flip are view commands, not destructive artwork transforms.

## 16. Focus / keyboard order

Docked Box focus order follows current visual/logical stack order.

Within each Box:

1. header controls;
2. Box content in logical order.

Detached Boxes enter the focus model after the main dock in a stable z/order policy defined by implementation; bringing one forward does not mutate artwork state.

Focus alone never:
- changes Tool;
- commits an edit;
- reorders a Box;
- changes document selection.

## 17. Tablet projection

Tablet keeps identical semantics.

Adaptation:

- larger effective header/control targets;
- More menu remains visible/reachable;
- drag reorder/detach remains available with pen/touch;
- Move/Detach/Dock menu paths remain available without drag;
- Right Workspace may use more overlay-oriented presentation to protect Canvas;
- magnetic target regions increase appropriately for touch/pen capability.

Do not require hover.

## 18. Performance

During drag:

- render only lightweight Box shell/preview;
- do not rerender heavy thumbnails/effects merely because the Box moves.

Collapsed:
- metadata summary only;
- no full list/grid rendering.

Detached inactive:
- near-zero recurring work except necessary state updates.

Reordering/detaching/resizing never triggers document-wide analysis.

## 19. Visual tokens still pending

The following are intentionally visual/runtime calibration, not unresolved interaction semantics:

- exact header height;
- exact icon size;
- exact spacing;
- exact magnetic target thickness;
- drag threshold;
- animation duration/easing;
- final color/outline/shadow;
- precise resize increments.

They must be tuned in the dedicated visual/runtime prototype while preserving this contract.

## 20. Interaction design completion statement

For PC/tablet Right Box manipulation, the following are fixed:

- header information architecture;
- which controls are permanently visible;
- collapse semantics;
- title-area semantics;
- direct drag area;
- Workspace Layout Lock;
- reorder behavior;
- detach behavior;
- floating behavior;
- magnetic target types;
- re-dock behavior;
- non-drag movement alternatives;
- reset/recovery;
- docked/detached resize model;
- deep-link behavior;
- Inspector header specialization;
- fixed-bottom strip interaction;
- keyboard/focus invariants;
- tablet semantic projection.

Visual/runtime validation remains pending.
