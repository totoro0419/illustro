# Illustro Left Tool Surface — Option Catalog

> Status: **CANDIDATE UNIVERSE V1 / DEFAULT NOT DECIDED**
> Date: 2026-09-29
> Scope: Tool/Mode option catalog used by the PC / tablet Left Access Surface
> Parent: [UI Gate E](UI_GATE_E.md)
> Rule: This document defines what may be added to the left tool surface. It does **not** define the default visible set or final order.

## 1. Purpose

The left surface is now a **universal feature access surface**. This document covers only the Tool/Mode subset of that larger system.

For the full navigation model and non-tool capability, see [Left UI Access Architecture](LEFT_UI_ACCESS_ARCHITECTURE.md).

It is not the primary home for:

- file/document commands
- Undo / Redo
- deep tool settings
- Layers / Color / Brush settings panels
- Filters / Adjustments catalogs
- Macro execution
- global application preferences

Those belong to the top application/document surface, the right magnetic Workspace/PiP system, the Quick Controller, Command Search, shortcuts, or context UI as appropriate.

The left surface is icon-first. Labels may appear as tooltip, accessibility name, customization/search text, or optional supplementary UI, but persistent text labels are not the primary representation.

## 2. External design evidence

The candidate model was derived from current official documentation, not from memory alone.

### Adobe Photoshop

Photoshop allows toolbar tools/groups to be added, removed, rearranged, grouped, or moved to Extra Tools. This supports separating the **complete tool universe** from the **visible default toolbar**.

Official references:

- https://helpx.adobe.com/photoshop/desktop/get-started/set-up-toolbars-panels/customize-the-toolbar.html
- https://helpx.adobe.com/photoshop/desktop/apply-painting-techniques/fill-objects-selections-layers/painting-tools-overview.html

### CLIP STUDIO PAINT

CLIP STUDIO PAINT groups tools into drawing, select/fill, and general tool families. Tools and sub tools can be moved between groups, and sub tools can be promoted to their own tool group. This is the strongest precedent for Illustro's **Tool Family + directly pinnable mode** model.

Official references:

- https://help.clip-studio.com/en-us/manual_en/150_tools/The_Tool_palette.htm
- https://help.clip-studio.com/en-us/manual_en/150_tools/Customizing_the_Tool_and_Sub_Tool_palettes.htm
- https://help.clip-studio.com/en-us/manual_en/690_interface/Quick_Access_Palette.htm

### Procreate

Procreate exposes a deliberately small high-frequency set: Paint, Smudge, Erase, Selection, Transform, with other editing capability routed through other surfaces. This is evidence that the default set should remain small even when the capability set is broad.

Official references:

- https://help.procreate.com/jp/procreate/handbook/interface-gestures/interface
- https://help.procreate.com/procreate/handbook/brushes/paint-smudge-erase
- https://help.procreate.com/procreate/handbook/selections/selections-interface
- https://help.procreate.com/procreate/handbook/transform/transform-interface-gestures

### Krita

Krita's toolbox explicitly exposes a broad set of painting, shape, path, fill, guide, reference, selection, navigation and measurement tools.

Official reference:

- https://docs.krita.org/en/reference_manual/tools.html

### ibisPaint

ibisPaint separates a compact main toolbar from a larger Tool Select window. Its Tool Select window includes Transform, Magic Wand, Lasso, Filter, Brush, Eraser, Smudge, Blur, Special Pen, Bucket, Vector, Text, Frame Divider, Eyedropper and Canvas tools.

Official reference:

- https://ibispaint.com/lecture/index.jsp?no=4

### Affinity Photo 2

Affinity Photo 2 exposes a wide tool taxonomy spanning Move/View, selections, fill, paint, erase, retouch, vector shapes, text, warp and navigation.

Official reference:

- https://affinity.help/photo2/English.lproj

## 3. Illustro model: Tool Family + pinnable mode

Illustro should not require one permanent button for every mode.

The customization model has two levels:

1. **Tool Family**
   - one compact icon represents a coherent family;
   - selecting it enters that tool family using its current/last mode.

2. **Direct-pinnable Mode**
   - a user may optionally expose a specific mode as its own left-surface button;
   - this is useful when a mode is repeatedly used;
   - direct pinning does not create a new Core semantic command.

Example:

- Family: Selection
- Pinnable modes: Rectangle, Ellipse, Freehand, Polygon, Magnetic, Contiguous, Region, Brush Selection.

This follows the useful parts of Photoshop grouping and CLIP STUDIO PAINT's tool/sub-tool customization without requiring every mode to remain visible.

## 4. Canonical candidate families

Legend:

- **Required** — already supported by Illustro product requirements and appropriate for the left surface.
- **Investigate** — supported by major competitors and plausibly useful, but not yet a locked Illustro product requirement.
- **Mode only** — should normally live inside a family, but may be directly pinned.
- **Not left** — intentionally belongs elsewhere.

### A. Painting / direct stroke tools

| Family | Status | Direct-pinnable modes / notes |
|---|---|---|
| Brush | Required | Core painting tool. Pencil, ink, airbrush, wet-media and decorative behavior are primarily **brush presets/engines**, not separate top-level tool identities. |
| Eraser | Required | Raster Eraser; Vector Eraser may be directly pinned when editing vector content. |
| Smudge / Blend | Required | Smudge / blend family. Wet mixing may share Brush Engine primitives but remains a distinct direct-manipulation tool identity. |

Do **not** create separate permanent families merely for Pencil, Airbrush, Decoration Brush, Wet Brush, etc. Those are better represented by brush presets unless interaction semantics differ materially.

### B. Fill / color application

| Family | Status | Direct-pinnable modes / notes |
|---|---|---|
| Smart Fill | Required | Flood Fill, Region Fill, Enclose & Fill, Trace & Fill, Drag Fill, Continuous Region Fill. |
| Gradient | Required | Linear, Radial, Reflected/Bilinear, Shape-aware; Freeform Gradient remains Investigate. |
| Eyedropper | Required | Canvas Eyedropper; Reference Eyedropper may be directly pinned. |

Fill settings such as tolerance, gap closing, reference source, boundary expansion/contraction and color difference are **properties**, not separate left buttons.

### C. Selection

| Family | Status | Direct-pinnable modes / notes |
|---|---|---|
| Selection | Required | Rectangle, Ellipse, Freehand/Lasso, Polygonal, Magnetic/edge-following, Brush Selection, Contiguous/Auto Select, Similar Color/Color Range, Region Selection. |

Selection operations such as Add / Subtract / Intersect, Feather, Expand / Contract and Invert belong to Context UI or commands, not permanent tool identities.

Saved Selection / Selection Mask and Select from Layer Content are commands/data operations and should not be canonical left-tool families.

### D. Move / transform / crop

| Family | Status | Direct-pinnable modes / notes |
|---|---|---|
| Move | Required | Move current target; Canvas-direct Layer/Object Pick may be exposed as a mode or modifier. |
| Transform | Required | Free Transform, Perspective/Distort, Warp; Liquify may be directly pinned. |
| Crop | Required | Canvas crop/direct crop tool. |

Scale, rotate and flip are Transform operations, not separate default families.

### E. Vector / path / shape

| Family | Status | Direct-pinnable modes / notes |
|---|---|---|
| Object / Vector Select | Required | Select vector/object entities on Canvas. |
| Node Edit | Required | Anchor/node/Bezier handle editing. |
| Pen / Path | Required | Bezier Pen, Polyline, Freehand Path. |
| Shape | Required | Line, Rectangle, Ellipse, Polygon; additional Shape Presets are dynamic assets rather than fixed canonical families. |
| Stroke Width | Investigate | Direct variable-width editing. Supported as a dedicated tool in Affinity Designer and compatible with Illustro's variable-width vector requirement. |
| Vector Eraser | Mode only | Normally under Eraser; direct pin allowed. |

Boolean operations, node conversion, simplify/smooth and rasterize-vector are commands/context actions, not separate left tools.

### F. Text

| Family | Status | Direct-pinnable modes / notes |
|---|---|---|
| Text | Required | Horizontal / Vertical text are modes/properties. Area/path text remains dependent on final Text scope. |

Font, size, tracking, line height, baseline and other typography parameters belong in right Workspace/PiP or Context UI.

### G. Guides / rulers / drawing assistance

| Family | Status | Direct-pinnable modes / notes |
|---|---|---|
| Guide / Ruler | Required | Straight/Parallel Ruler, Perspective Guide, Symmetry/Mirror, Radial Symmetry, 2D Grid, Isometric Grid, guide edit/manipulation. |

Guide visibility, lock, snap and presets are properties/commands. The family button should enter guide creation/editing rather than becoming a collection of unrelated toggles.

### H. Reference interaction

| Family | Status | Direct-pinnable modes / notes |
|---|---|---|
| Reference Manipulate | Required | Select/move/scale/rotate Reference entities. |
| Reference Eyedropper | Mode only | Direct-pin option under Eyedropper. |

Opening/closing the Reference Workspace belongs to the right Workspace/PiP system or commands, not to the left tool role.

### I. Retouch / local correction

Existing Illustro requirements already include Clone, Healing and Patch. Major tools such as Photoshop, Affinity and Krita additionally demonstrate that direct retouch tools can reasonably coexist with painting tools.

| Family | Status | Direct-pinnable modes / notes |
|---|---|---|
| Clone | Required | Canvas source → target painting. |
| Healing | Required | Local repair while respecting surrounding appearance. |
| Patch | Required | Region-based repair. |
| Smart Patch / Inpaint | Investigate | Krita Smart Patch / Affinity Inpainting precedent. Must remain user-directed and must not make generative AI a product dependency. |
| Blur Brush | Investigate | Common in ibisPaint / Photoshop / Affinity. |
| Sharpen Brush | Investigate | Common in Photoshop / Affinity. |
| Dodge / Burn / Sponge family | Investigate | Common photo-retouch convention; useful for illustration is plausible but not yet established as an Illustro requirement. |

Do not add a generic **Filter Tool** to the left merely because ibisPaint exposes one. Illustro's filter/adjustment system is primarily non-destructive and belongs in Workspace/PiP + direct Canvas preview.

### J. Canvas navigation

| Family | Status | Direct-pinnable modes / notes |
|---|---|---|
| Pan / Hand | Required | Optional left button; gestures/temporary modifiers may be faster on supported devices. |
| Zoom | Required | Optional left button. |
| Rotate View | Required | Optional left button. |

These remain available because PC/tablet input capabilities differ. Their presence in the default toolbar is a separate decision.

Canvas Flip is an instant command, not a continuous tool, so it should normally live in Quick Controller / Canvas commands rather than the left tool surface.

### K. Measurement

| Family | Status | Direct-pinnable modes / notes |
|---|---|---|
| Measure | Investigate | Distance/angle measurement. Dedicated tool exists in Krita, Affinity and Photoshop-class workflows, but Illustro product need is not yet locked. |

## 5. Candidate universe summary

### Required Tool Families

1. Brush
2. Eraser
3. Smudge / Blend
4. Smart Fill
5. Gradient
6. Eyedropper
7. Selection
8. Move
9. Transform
10. Crop
11. Object / Vector Select
12. Node Edit
13. Pen / Path
14. Shape
15. Text
16. Guide / Ruler
17. Reference Manipulate
18. Clone
19. Healing
20. Patch
21. Pan / Hand
22. Zoom
23. Rotate View

### Investigate before product lock

24. Stroke Width
25. Smart Patch / Inpaint
26. Blur Brush
27. Sharpen Brush
28. Dodge / Burn / Sponge
29. Measure
30. Freeform Gradient mode

This is the **complete V1 candidate set**, not the default toolbar.

## 6. Explicitly excluded from the left tool universe

The following are useful capabilities but should not be canonical left-tool buttons because they violate the agreed role separation.

| Capability | Primary home |
|---|---|
| Undo / Redo | Right UI and optional Quick Controller |
| Home / Save / Export / document management | Top application/document bar |
| Layers | Right magnetic Workspace/PiP |
| Color panel | Right magnetic Workspace/PiP |
| Brush settings | Right magnetic Workspace/PiP |
| Brush size / opacity / stabilization | Context UI and/or right Brush block |
| Filter / Adjustment catalog | Right Workspace/PiP + Canvas preview |
| History / Snapshot | Right Workspace/PiP |
| Navigator | Right Workspace/PiP |
| Asset / Material browser | Right Workspace/PiP |
| Macro / Auto Action | Quick Controller / Search / shortcut / appropriate workspace |
| Focus Mode | global/Canvas command |
| Canvas Flip | Quick Controller / Canvas command |
| Selection Add/Subtract/Intersect | Context UI / modifier |
| Apply / Cancel | Context UI for preview-bearing operation |
| Layer operations | Layer Workspace / Quick Controller / Context UI |

## 7. Dynamic custom entries

Two dynamic entry types are worth supporting without turning them into canonical families:

### 7.1 Specific brush preset

A user may optionally pin a specific Brush Preset as a left button.

Selecting it:

- selects Brush;
- selects that preset;
- does not create a distinct Core tool type.

This follows CLIP STUDIO PAINT's useful ability to promote a sub tool while keeping Illustro's Brush Engine unified.

### 7.2 Specific shape preset

A user may optionally pin a frequently used Shape Preset.

Selecting it:

- selects Shape;
- selects that shape preset.

Do not create dozens of fixed Rectangle/Star/Arrow/etc. tool families merely to mirror another application's toolbar.

## 8. Open decisions

The candidate universe is not the final interaction spec. The following still require explicit decisions:

1. whether tapping the currently active family opens its mode chooser;
2. whether long-press is used for family mode selection on touch;
3. whether drag-and-drop customization is always enabled or only in edit mode;
4. whether dynamic Brush/Shape presets are permitted in the first release;
5. final disposition of Investigate candidates;
6. default visible set and order for PC;
7. default visible set and order for tablet;
8. whether PC and tablet share one saved profile or separate profiles.

## 9. Decision rule for new future tools

A new feature becomes eligible for the left Tool Surface only when all are true:

1. it represents a Canvas interaction mode, not merely a command;
2. selecting it changes how pointer/pen/touch input acts on Canvas;
3. its identity can be represented by a stable icon;
4. deep settings can remain outside the left surface;
5. it is useful enough that direct selection can reduce workflow friction.

If these are false, prefer Workspace/PiP, Context UI, Quick Controller, Search or shortcut instead.
