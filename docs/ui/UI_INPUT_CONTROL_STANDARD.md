# Illustro Input Control Standard

> Date: 2026-09-30  
> Status: **INPUT-METHOD SEMANTICS COMPLETE / VISUAL INTEGRATION + RUNTIME VALIDATION PENDING**  
> Scope: PC / tablet / compact input semantics for Illustro UI Gate E  
> Production implementation: **LOCKED**  
> Theme baseline for examples: **Aurora — approved visual direction**

## 1. Decision

Illustro will not use one widget for every numeric value. Input is selected by **task semantics**.

The core rule is:

> **Fast spatial adjustment + exact entry + non-gesture alternative whenever the task benefits from all three.**

This produces controls such as Brush Size = slider + exact numeric field, while Font Size = numeric/spinbutton without a slider, and Transform = direct canvas handles + exact numeric fields.

Every visible route edits the **same semantic value**. Multiple UI representations must never drift into separate state.

## 2. Evidence used

The decisions below are based on:

- Illustro `FEATURE_SPEC.md`, `FEATURE_CATALOG.md`, accepted interaction specs under `docs/features/`, Creation Proximity principles, and current Right UI geometry;
- UI Implementation Quality v0.3 pattern-selection/core rules, particularly semantic pattern selection, `RANGE.01`, `RANGE.02`, `INPUT.01`–`INPUT.06`, focus/state separation, and use of native controls where suitable;
- official interaction evidence from Procreate, Clip Studio Paint, Krita, Photoshop, Affinity, and W3C APG/WCAG.

External products are interaction evidence only. Illustro does not copy their visual styling.

## 3. Global interaction contract

### 3.1 One semantic value, multiple synchronized views

Examples:

- Brush Size: slider, numeric field, shortcut and optional on-canvas scrub all update one `brush.size` value.
- Foreground Color: wheel/SV field, HSV/HSL/RGB/channel values, palette/history and eyedropper all update one current-color state.
- Transform Width: canvas handle and numeric Width field update one transform preview state.

### 3.2 Live preview and commit

For continuous controls:

- pointer/pen down begins an edit transaction;
- movement previews continuously;
- pointer/pen up commits one settings/edit transaction;
- typed value commits on Enter or accepted focus change;
- Escape restores the value at the beginning of the current edit where cancellation is meaningful;
- a slider drag never creates hundreds of Artwork History entries.

For destructive/preview tools such as Transform, Crop, destructive filters and major Region remaps:

- all controls update a preview session;
- **Apply** commits the session;
- **Cancel / Esc** restores the pre-session state;
- switching tools must not silently apply an unresolved preview.

### 3.3 Gesture/direct-manipulation rule

Drag, swipe, wheel, hover, long-press, pen gesture, label-scrub and keyboard shortcut may accelerate work, but an important function must remain reachable without knowing that gesture.

### 3.4 State rule

Selected/current/focus/disabled/error states are not communicated by hue alone. Use border, fill, shape, indicator, text/icon and focus treatment as needed.

### 3.5 Units

A unit is shown inside or immediately adjacent to the numeric value. If a value supports unit conversion, the unit control is a **C2 select/popover** adjacent to the field. Changing display units changes the representation, not the underlying semantic value.

### 3.6 Reset/default

A changed parameter exposes a keyboard/pointer-accessible **Reset** action. Double-click or gesture reset may exist only as an accelerator. Reset is not hover-only.

## 4. Canonical input primitives

| ID | Semantic task | Illustro standard | Exact / alternative path | Typical use |
|---|---|---|---|---|
| N1 | Bounded continuous scalar | **Slider + numeric field + unit** | Type exact value; keyboard range stepping | Opacity, Flow, Hardness, tolerance, effect strength |
| N2 | Very wide continuous scalar | **Nonlinear/log-like slider + numeric field** | Exact value field | Brush Size, blur radius, very large scale ranges |
| N3 | Precision-first numeric | **Numeric / spinbutton** | Up/Down step; optional +/- buttons on touch | Font size, polygon sides, copy count, DPI |
| N4 | Signed/bipolar scalar | **Centered slider + signed numeric field** | Exact field | Hue shift, temperature/tint, color balance, boundary expand/contract |
| N5 | Min/max interval | **Two-thumb range + two numeric fields** | Min/Max fields; focusable thumbs | tone range, input/output range, Blend If |
| N6 | Linked numeric pair | **Two fields + link/ratio toggle** | Each field independently editable | Width/Height, X/Y scale, texture X/Y scale |
| N7 | Angle | **Spatial dial/handle + degree field** | Exact degree field; keyboard step | Brush rotation, gradient angle, reference rotation |
| N8 | 2D continuous plane | **2D pad/plane + two exact fields** | X/Y or S/V fields | SV picker, texture offset, vector coordinate pair |
| N9 | Small discrete count | **Spinbutton + numeric field** | Type value | polygon sides, symmetry count, grid subdivisions |
| N10 | Desktop rapid adjustment | **Label scrub** as optional accelerator | Slider/field remains primary/alternative | scalar/angle fields on PC |
| C1 | One of 2–5 visible choices | **Segmented/radio group** | keyboard selection | Replace/Add/Subtract/Intersect, alignment, small mode sets |
| C2 | One of a medium fixed list | **Select-only popover/list** | keyboard/type-ahead where useful | interpolation, units, reference source |
| C3 | Large/searchable list | **Searchable combobox / picker** | browse categories | font family, blend mode, assets, color profiles |
| C4 | Independent multiple options | **Checkbox group** | keyboard toggle | export metadata, independent feature flags |
| C5 | Immediate labeled binary state | **Switch** | keyboard/tap | snapping, reduced motion, soft proof, global setting |
| C6 | Compact immediate mode state | **Toggle button (`pressed` state)** | same command in menus/search | Alpha Lock, clipping, visibility, pin, flip-view |
| C7 | One-shot operation | **Button / menu command** | shortcut/search alternative | Reset, Reverse gradient, Rasterize, Merge |
| C8 | Visual single selection | **Selectable swatch/card/grid** | text label / search where needed | palette color, brush preset, workspace/theme preset |
| C9 | Spatial reference point | **3×3 anchor grid + textual/numeric semantics** | keyboard grid / coordinates | resize anchor, transform origin |
| T1 | Short text | **Text field** | — | layer name, preset name, document name |
| T2 | Search/filter | **Search field + suggestions/filter results** | category browsing remains available | commands, brushes, assets, fonts |
| T3 | Keyboard shortcut | **Chord capture field** | Clear / Reset / conflict resolver | shortcut settings |
| D1 | Spatial transform | **Direct canvas manipulation + exact property fields** | numeric fields, nudge commands | move/scale/rotate/crop/vector/reference |
| D2 | Reorder | **Drag + explicit move commands** | Earlier/Later/Start/End/Move To | layers, palettes, workspace pages, gradient stops where applicable |
| F1 | File/resource choice | **System/file picker or asset browser** | explicit Import/Open button; drag-drop accelerator | open/place/reference/LUT/texture/palette |
| E1 | Multi-point response | **Curve editor + exact selected-point fields + presets/reset** | point list/fields | pressure curves, Curves adjustment |
| E2 | Gradient definition | **Gradient bar + stops + midpoint + exact position + color** | Add/Delete/Reverse buttons; stop list/fields | Gradient tool, Gradient Map, overlays |
| E3 | Histogram range edit | **Histogram + spatial handles + numeric fields** | exact fields / eyedropper actions | Levels, tone limits |

### 4.1 Why slider + numeric is the default for many art parameters

A slider is efficient for visual/relative exploration; a numeric field is efficient for precision. The UI Implementation Quality rules explicitly reject slider-only precision workflows. Procreate exposes sliders plus numeric entry for brush pressure-related values and precise color values; Clip Studio Paint exposes color sliders with numeric values and provides fast Brush Size/Opacity sliders. This combination matches Illustro's repeated-adjustment use case.

### 4.2 When Illustro deliberately does **not** add a slider

Do not add a slider when exact/discrete entry is the primary job or the range has no useful spatial meaning.

Examples:

- canvas width/height;
- DPI;
- font size;
- polygon side count;
- symmetry count;
- numeric X/Y coordinates when direct manipulation already supplies the spatial path.

These use numeric/spinbutton controls instead.

### 4.3 Surface-resolution rule — no semantic ambiguity

The same semantic state may be represented differently only when the surface role is different, and that mapping is fixed:

- **C5 Switch** = labeled preference/setting row whose job is to persist an on/off state.
- **C6 Toggle button** = compact immediate tool/view state in Context UI, Box headers or tool property rows.
- When both surfaces expose the same state (for example Gamut Warning or a guide visibility preference), they are synchronized views of one value.
- **C1** is used only when 2–5 choices should remain simultaneously visible for comparison.
- **C2** is used for a fixed list that should not occupy permanent space.
- **C3** is used once search/filtering materially improves a long list.
- A feature does not switch between these arbitrarily based on aesthetics or available pixels.


## 5. Numeric-control details

### 5.1 Slider row anatomy

Standard scalar row:

`Label | Slider | Numeric value | Unit`

For a modulatable Brush property in the full Brush editor, a compact **C6 Dynamics toggle button** follows the value. The near-Canvas basic Context Surface omits this advanced button and keeps Size/Opacity fast.

Rules:

- current value always visible;
- min/max are available to semantics and shown when needed for comprehension;
- low-value brush-size precision uses a nonlinear mapping, while the stored value remains linear/meaningful;
- keyboard stepping and endpoints follow the platform/native control contract;
- touch/pen can use a visually compact slider with a larger effective hit area;
- scrolling the page/panel must not accidentally change a hovered value.

### 5.2 Fine/coarse adjustment

Illustro defines abstract **fine** and **coarse** stepping. Concrete modifier keys are platform-mapped and configurable rather than hardcoded globally.

- normal step: parameter-defined;
- fine step: smaller than normal where the value supports it;
- coarse step: larger than normal;
- exact field always remains available.

### 5.3 Label scrubbing

On pointer-oriented PC UI, dragging a numeric parameter label horizontally may scrub the value. The pointer/cursor must visibly indicate this capability. It is an accelerator only; the visible slider/field or field/stepper remains usable.

## 6. Color input standard

### 6.1 Current foreground color — default Color Box

The default Color Box has four peer pages:

1. **Picker** — outer Hue ring + inner Saturation/Value square; Current/Previous swatches.
2. **Values** — synchronized channel sliders + numeric fields.
3. **Palette** — persistent swatches / palette organization.
4. **History** — bounded recent colors.

A small model selector inside **Values** exposes:

- HSV;
- HSL;
- RGB;
- working-space channels when the active document/color model requires them (for example Lab/CMYK in supported workflows).

HEX is an additional exact code field only when an RGB/encoding representation is meaningful. It must not pretend to be the lossless canonical representation of arbitrary wide-gamut/float document colors.

This combines Procreate's spatial picker + precision Value concept, Clip Studio Paint's wheel/slider/numeric model switching, and Krita's model/bit-depth-aware Specific Color Selector without cloning their visual styling.

### 6.2 Eyedropper

Primary:

- Canvas eyedropper tool / temporary hold action;
- Reference eyedropper uses the same current-color destination.

Alternative:

- explicit Eyedropper button in Color surfaces where appropriate.

Long-press may exist on touch only as an optional shortcut, never the only route.

### 6.3 Color history and palette

- one tap/click chooses a swatch;
- palette editing requires explicit edit mode;
- reorder uses drag plus move commands;
- swatch state uses border/check/indicator in addition to color.

### 6.4 Color-management inputs

- working/display profile: searchable profile picker;
- bit depth: segmented/radio for the small supported set;
- rendering intent: fixed select;
- Black Point Compensation: switch;
- Soft Proof: switch;
- Gamut Warning: **C6 toggle button** in Canvas/View surfaces; the same state is exposed as a **C5 switch** only inside Settings. Both edit one view-state value.

## 7. Brush input standard

| Brush parameter | Input |
|---|---|
| Size | **N2 nonlinear slider + px field**, near-Canvas fast control and full Brush Box |
| Opacity | **N1 slider + % field** |
| Flow | **N1 slider + % field** |
| Stabilization / smoothing | **N1 slider + numeric field**; advanced algorithm choice uses C2 |
| Hardness / density / wetness / mix / pull / strength | **N1 slider + numeric field** |
| Spacing | **N1 slider + numeric field**, live stroke preview |
| Rotation | **N7 angle + degree field** |
| Scatter / jitter / noise amount | **N1**, or **N4** when signed |
| Brush-tip ratio X/Y | **N6 linked pair** when two-axis; otherwise scalar |
| Texture scale X/Y | **N6 linked pair** |
| Texture offset | **N8 2D + X/Y fields** |
| Texture rotation | **N7** |
| Random seed when exposed | **N3 numeric + Randomize command** |
| Preset | **C8 searchable preset grid/list** |
| Dynamics enable per property | compact **C6 toggle button** beside the property |

### 7.1 Dynamics Mapping

Each modulatable target uses one shared mapping editor:

- source picker: Pressure / Tilt / Azimuth / Speed / Direction / Distance / Time / Stroke phase / Random / supported custom sources;
- response curve: **E1**;
- input range: **N5**;
- output range: **N5**;
- Invert: **C5 switch** in the labeled mapping editor row;
- influence amount, if the engine exposes it: **N4**;
- multiple-source combination mode, if enabled by the brush engine: **C2**.

Curve rules:

- tap/click line or Add Point creates a point;
- drag moves a point;
- selected point exposes exact Input/Output values;
- Delete Point button/key removes it;
- preset curves and Reset are explicit;
- drag is never the only way to create/move/delete a control point.

## 8. Gradient input standard

Gradient uses both canvas-direct and panel controls.

### On Canvas

- start/end handles define placement;
- center/focal handle appears for radial/shape modes as needed;
- direct manipulation previews live.

### Gradient Box

- gradient bar with selected stop;
- click/tap an empty position or Add Stop creates a stop;
- stop position: numeric `%` field;
- stop color: swatch opens Color Picker;
- midpoint: visual handle + numeric `%` field;
- Delete Stop explicit button; dragging a stop off the bar may be an accelerator only;
- Reverse = command button;
- gradient type = small segmented/radio when only a few common types are exposed, otherwise select;
- repeat/edge behavior = select;
- angle = N7 when it is not already fully determined by canvas handles;
- dithering = switch.

## 9. Transform / geometry input standard

### 9.1 Transform

Primary: bounding box and handles on Canvas.

Context fields:

- X, Y: numeric fields;
- W, H: linked N6 fields with aspect-lock toggle;
- Rotation: N7 / numeric degree field;
- transform mode: **C2 labeled mode picker** (Move / Scale / Rotate / Free Transform / Perspective-Distort / Warp);
- interpolation: C2;
- Snap: C5;
- Flip H / Flip V inside a Transform preview: **C7 command buttons**; Canvas view flips outside Transform use **C6 toggle buttons** because they are persistent view state;
- reference point: C9 anchor grid plus direct canvas origin handle;
- **Apply / Cancel** always visible in preview state.

Direct manipulation is primary, but Procreate and Clip Studio Paint both provide precise numeric transform paths; Illustro keeps both.

### 9.2 Crop

- canvas crop handles = primary;
- width/height = N6 exact fields;
- aspect ratio = preset picker + custom ratio fields;
- rotation/straighten = N7;
- anchor = **C9** whenever the crop/resize operation exposes an anchor or transform origin;
- Apply/Cancel.

### 9.3 Canvas Size / Image Size

Precision-first; no decorative slider.

- Width / Height: N6;
- unit: C2;
- resolution/DPI: N3;
- anchor: C9 for Canvas Size;
- interpolation: C2 for Image Size;
- aspect link: **C6 compact toggle button** placed between/adjacent to Width and Height;
- preview where relevant.

## 10. Selection and Fill inputs

### Selection

- Replace / Add / Subtract / Intersect: **C1 segmented**;
- Feather: N1 + numeric;
- Expand/Contract: signed N4 + numeric;
- Color/Similarity or Luminance range: scalar/range controls plus exact values;
- saved selections: searchable C8/list.

### Smart Fill

- Fill mode: labeled C2 popover/list because six modes exceed a comfortable tiny segmented row;
- tolerance: N1 + numeric;
- Gap Closing: N1 + numeric, with visual preview of bridged gaps when possible;
- Boundary Expand/Contract: N4 + numeric;
- reference source: C2;
- Ignore/Use Selection and similar tool-session states: **C6 toggle button**;
- long computation: progress + Cancel; stale result never silently applies.

## 11. Layer / compositing inputs

- Layer opacity: N1 + numeric;
- Blend Mode: **searchable C3 picker** with categories/recent choices; typing optional but useful for long list;
- Visibility, lock, alpha lock, clipping: compact C6 toggle buttons with state text/tooltips where needed;
- layer name: T1 inline rename;
- color tag: C8 swatch grid;
- reorder: D2 drag + Move Earlier/Later/Start/End/Move To;
- multi-select: standard selectable list semantics; selection and focus remain distinct.

## 12. Vector / shape / guide inputs

### Vector nodes / Bézier

- node and handles on Canvas: D1;
- selected node X/Y: numeric fields;
- handle angle: **N7 + degree field**; handle length: **N1 slider + exact numeric/unit field**;
- node type: **C1 segmented/radio group** for the small fixed set (corner / smooth / symmetric or equivalent);
- Add/Delete/Convert node: C7 commands.

### Shapes

- shape type: **C8 visual preset grid** for common shapes, with **C3 searchable picker** for the full shape library;
- fill/stroke: Color swatches;
- stroke width: **N2 nonlinear slider + numeric field** when the range spans sub-pixel to very large strokes;
- polygon sides: N9;
- corner radius: N1 + numeric;
- cap/join: C1 icon+label choices;
- dimensions: D1 + N6 fields.

### Guides / rulers / symmetry

- direct guide position on Canvas + exact position field;
- angle: N7;
- grid spacing: **N2 nonlinear slider + exact numeric/unit field** because practical spacing spans a wide range;
- row/column/subdivision count: N9;
- symmetry count: N9;
- visibility / lock / snap in the active guide tool: **C6 toggle buttons**; equivalent long-lived preferences in Settings use **C5 switches** but edit the same states;
- presets: C8.

## 13. Text input standard

- font family: searchable C3 combobox;
- font style/weight: C2;
- font size: **N3 numeric/spinbutton**, no slider by default;
- tracking / line height / baseline: N3 exact fields with optional PC label scrub;
- paragraph alignment: C1 segmented icon+accessible labels;
- horizontal/vertical text: C1;
- fill/stroke color: Color swatches;
- text content: Canvas/text editor with ordinary text semantics.

## 14. Adjustment / filter input standard

All filters use the semantic primitive that fits the parameter; they do not invent per-filter widgets.

| Adjustment | Standard inputs |
|---|---|
| Brightness / Contrast / Exposure / Vibrance | **Brightness/Contrast/Exposure = N4 centered slider + signed numeric; Vibrance = N4 centered slider + signed numeric** |
| Hue / Saturation / Lightness | Hue=N4 angle-like signed value; Saturation/Lightness=N4 + numeric |
| Temperature / Tint | two N4 sliders + numeric |
| Color Balance | Shadows/Midtones/Highlights C1 + three N4 axes |
| Levels | **E3 histogram + exact input/output fields + eyedropper commands** |
| Curves | **E1 curve + selected-point Input/Output fields + channel selector** |
| Posterize | N9 discrete level count |
| Threshold | N1 + numeric |
| Selective Color | target-color C2 + signed channel sliders/numerics + mode C1 |
| Gradient Map | E2 gradient editor |
| LUT / Color Lookup | F1/C3 asset/file picker |
| Blur radius / sharpening amount | **Blur radius = N2 nonlinear slider + numeric; sharpening amount = N1 slider + numeric** |
| Blend If / tone range | N5 multi-thumb range + exact endpoints; split handles get numeric alternatives |

Destructive variants use Apply/Cancel preview. Live/Adjustment Layer variants update non-destructive parameters immediately and retain ordinary Undo/history semantics.

## 15. Document / export inputs

### New Document

- preset: C8 searchable preset grid;
- width/height: N6;
- unit: C2;
- DPI: N3;
- color profile: searchable C3;
- bit depth: C1 (small supported set);
- background at creation: **C1 radio/segmented choice** = Transparent / White / Current Background Color; choosing the color opens the standard Color Picker;
- advanced color settings: disclosure, not a separate hidden-only path.

### Export

- format: C2;
- quality/compression when perceptual continuous control makes sense: N1 + numeric;
- output width/height: N6;
- resampling: C2;
- color profile: C3;
- metadata choices: C4 checkboxes;
- destination: F1/system destination picker.

## 16. Reference / navigator / workspace inputs

### Reference

- move/scale/rotate: D1 + exact X/Y/scale/angle fields in Inspector;
- opacity: N1 + numeric;
- grayscale display: **C6 toggle button** in Reference controls; any default-behavior preference in Settings uses C5 but does not create a second state;
- pin: C6;
- hide: C6;
- flip: C7 command;
- grouping: ordinary multi-select + command.

### Navigator

- Zoom: slider + numeric `%` because both exploration and exact views matter;
- rotation: N7 + numeric;
- Fit / 100% / Reset Rotation / Flip: C7 commands.

### Workspace / settings

- panel sizing: direct splitter; exact numeric width is not a primary user task and is omitted unless an advanced use case appears;
- workspace preset: **C8 visual preset cards** for built-in/recent presets plus **C3 searchable picker** when the library exceeds the visible set;
- Left/Right mirror: C5;
- UI scale: N1 + numeric `%`;
- theme: C8 radio-card selection;
- Reduced Motion and accessibility toggles: C5;
- feedback sound/haptic: C5 plus scalar volume where applicable.

## 17. Assets, presets, search, shortcuts and automation

### Assets / Brush presets

- search: T2;
- category/tag filters: **C4 checkbox semantics rendered as filter chips with explicit selected state**;
- single asset/preset choice: C8;
- long resource lists: virtualized list/grid;
- import: F1;
- reorder/organization: D2 + move commands.

### Command Search

- text/search field + result list;
- keyboard navigation is accelerator, not the only route;
- running a command closes/updates according to that command's own transaction contract.

### Shortcut editor

- command search C3/T2;
- shortcut capture T3;
- conflict state lists both commands and offers Replace / Keep existing / Cancel as explicit choices;
- Clear and Restore Default commands are explicit.

### Quick Controller customization

- each slot opens searchable command/tool picker;
- reorder by drag plus move commands;
- Undo/Redo defaults remain customizable.

### Automation / Macros

- Record/Stop/Play are commands;
- macro parameter editors reuse the same primitives above;
- no separate “automation-only” input widget set.

## 18. Device adaptation

Semantics stay constant; geometry adapts.

### PC / pointer

- compact visible controls are allowed;
- effective hit areas remain adequate;
- label scrub and wheel/shortcut accelerators may exist;
- hover only supplements visible/focusable routes.

### Tablet / pen + touch

- slider/thumb and small buttons use touch-capable effective targets;
- pen drawing and touch navigation remain distinguishable;
- numeric field opens appropriate software keyboard;
- direct Canvas manipulation is favored when it reduces travel.

### Smartphone / compact

- controls may stack vertically or open a focused sheet;
- Color Picker may use a larger dedicated workspace page;
- numerical precision remains reachable by tapping the visible current value;
- no hover dependency;
- virtual keyboard must not cover the focused field or required Apply/Cancel actions.

## 19. Accessibility and implementation constraints

- use standard/native controls when they meet the semantic requirement;
- custom sliders/curves/color fields must recreate keyboard/focus/value semantics and be manually tested;
- sliders expose min/max/current and human-readable units;
- focus is visually distinct from selected/current state;
- selected/current state never relies only on color;
- touch assistive technology must be tested for custom slider-like widgets before production;
- dragging functionality gets a single-pointer non-drag alternative where applicable;
- pointer success does not imply keyboard/touch/stylus/AT success;
- target-size values are platform/standard scoped, not one universal pixel token.

## 20. Major-app interaction evidence

### Procreate

- Brush Studio exposes sliders plus numeric entry for pressure-related Size/Opacity/Flow and a pressure graph.
- Color provides spatial Disc/Classic modes and precision HSB/RGB/HEX value entry.
- Transform combines direct bounding-box manipulation with numeric width/height/rotation input.

Official references:

- https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings
- https://help.procreate.com/procreate/handbook/colors/colors-interface
- https://help.procreate.com/procreate/handbook/colors/colors-value
- https://help.procreate.com/procreate/handbook/transform/transform-interface-gestures

### Clip Studio Paint

- Tool Slider provides fast Brush Size/Opacity slider access.
- Color Slider supports slider + numeric values and RGB/HSV/HLS/CMYK modes.
- Color Settings supports wheel/field plus HSV/HLS, RGB, HEX, Lab and CMYK exact values where available.
- Brush dynamics links values to pressure/tilt/velocity/random and exposes minimum/maximum plus pressure graph.
- Transform Tool Property exposes explicit scale/rotation and Apply/Cancel controls.
- Gradient editing combines on-canvas drag with gradient-bar nodes and explicit advanced controls.

Official references:

- https://help.clip-studio.com/en-us/manual_en/240_brushes/Tool_Slider_palette.htm
- https://help.clip-studio.com/en-us/manual_en/300_color/Color_Slider_palette.htm
- https://help.clip-studio.com/en-us/manual_en/300_color/Color_Settings_Dialog.htm
- https://help.clip-studio.com/en-us/manual_en/240_brushes/Customizing_brush_tools.htm
- https://help.clip-studio.com/en-us/manual_en/360_transform/Transform_using_the_Tool_Property_palette.htm
- https://help.clip-studio.com/en-us/manual_en/420_fill/Gradient_Tool.htm

### Krita

- Specific Color Selector adapts sliders to color space/bit depth and supports HSV-family and HEX where meaningful.
- Brush settings use sensor curves for pressure and other dynamic sources and provide live brush preview.

Official references:

- https://docs.krita.org/en/reference_manual/dockers/specific_color_selector.html
- https://docs.krita.org/en/user_manual/loading_saving_brushes.html
- https://docs.krita.org/en/reference_manual/brushes/brush_settings/opacity_and_flow.html

### Photoshop / Affinity

- Photoshop exposes brush size/hardness, opacity and flow in painting controls; professional desktop creative tools also use direct adjustment/keyboard accelerators in addition to explicit controls.
- Affinity exposes direct brush-property adjustment and keyboard percentage entry as accelerators; Illustro retains visible controls instead of requiring those accelerators.

Official references:

- https://helpx.adobe.com/photoshop/using/painting-tools.html
- https://helpx.adobe.com/photoshop/using/tool-techniques/brush-tool.html
- https://affinity.help/photo2ipad/en-US.lproj/pages/Workspace/shortcuts.html

### W3C / UI Implementation Quality

- Slider is for bounded range exploration; exact values need an exact input route when precision matters.
- Spinbutton is appropriate for bounded/discrete values and direct typing.
- custom slider/drag interactions require keyboard/focus/value semantics and appropriate alternatives.

Official references:

- https://www.w3.org/WAI/ARIA/apg/patterns/slider/
- https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/
- https://www.w3.org/TR/WCAG22/#dragging-movements
- https://www.w3.org/TR/WCAG22/#target-size-minimum

## 21. Design status

The **choice of input method for each semantic class is complete** in this document.

Still pending before production:

- exact parameter ranges, increments and nonlinear curves that depend on engine/device testing;
- final component pixel metrics for each device/input capability;
- full visual integration into every Right/Context/Compact surface;
- stylus/touch/keyboard/assistive-technology runtime testing;
- performance validation of live previews;
- user visual/interaction review of the Input Atlas.

Those pending items do not reopen the semantic decision unless testing reveals a concrete usability or accessibility defect.