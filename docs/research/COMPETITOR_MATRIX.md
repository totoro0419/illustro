# Illustro Competitor Research Matrix

> Status: First-pass official-source research  
> Checked: 2026-09-27  
> Scope: Painting / illustration workflows relevant to Illustro. This is not a claim that every feature of every competitor has been exhaustively catalogued.

## Research rule

Only features that can be verified from official product documentation are treated as confirmed here. This document is used to identify:

1. conventional capabilities Illustro must not accidentally omit,
2. interaction patterns worth studying,
3. areas where Illustro should intentionally redesign the workflow,
4. dependencies between Illustro's unique systems and established painting workflows.

## 1. Clip Studio Paint

### Confirmed relevant capabilities

Official Clip Studio Paint Ver. 5.0 documentation covers, among other areas:

- pens and brushes,
- layers,
- color,
- selections,
- transforms,
- filters and adjustments,
- fill and gradients,
- figures and shapes,
- text,
- rulers,
- vector layers,
- perspective rulers,
- timelapses,
- materials.

Reference layers can be used by Fill and Selection tools, and brushes can use them as boundaries to avoid overflow.

The Fill tool supports editing-layer or multi-layer reference workflows and exposes detailed parameters including closing gaps between lines.

Vector layers store editable path/control-point information instead of only raster pixels, allowing post-stroke line editing.

Gradient layers remain editable after creation instead of permanently rasterizing the gradient.

### Illustro implications

**Adopt / match**

- reference-source selection for fill and selection,
- configurable gap-closing,
- editable vector stroke representation,
- robust rulers and perspective assistance,
- editable/non-destructive gradient representation,
- strong transform, selection, and layer fundamentals.

**Improve**

Clip Studio exposes many capabilities through tool settings and advanced settings. Illustro should preserve equivalent depth but surface high-frequency controls through a unified Context UI.

**Unique integration opportunity**

The Lineart Region System should sit *above* ordinary reference-layer fill rather than replacing it. Users must still be able to use conventional pixel/reference fill when region analysis is not desired.

### Official sources

- https://help.clip-studio.com/en-us/
- https://help.clip-studio.com/en-us/manual_en/180_layers/Reference_layers.htm
- https://help.clip-studio.com/en-us/manual_en/420_fill/Fill_Tool.htm
- https://help.clip-studio.com/en-us/manual_en/180_layers/Vector_layers.htm
- https://help.clip-studio.com/en-us/manual_en/180_layers/Gradient_layers.htm
- https://help.clip-studio.com/en-us/manual_en/510_ruler/Drawing_while_snapping_to_a_ruler.htm
- https://help.clip-studio.com/en-us/manual_en/360_transform/Liquify_tool.htm

## 2. Procreate

### Confirmed relevant capabilities

Procreate's current handbook documents:

- touch-centric transformation with direct bounding-box manipulation,
- multiple selection modes,
- Drawing Guides including 2D Grid, Isometric, Perspective, and Symmetry,
- Drawing Assist,
- QuickShape for snapping hand-drawn strokes to clean geometric shapes,
- customizable QuickMenu profiles,
- multi-layer selection and direct layer selection from canvas content,
- Reference Companion,
- eyedropper sampling from the Reference Companion,
- color profiles including RGB, Display P3, CMYK options, and imported profiles,
- adjustments including Gradient Map and Clone.

Procreate also supports a Reference Layer that lets fill operations on another layer respect line art stored separately.

### Illustro implications

**Adopt / match**

- gesture-first direct manipulation,
- on-canvas transform handles,
- fast layer selection from canvas content,
- perspective/symmetry assistance,
- quick shape correction,
- floating reference viewing with direct color sampling,
- fast customizable command surface.

**Improve**

Illustro should not inherit Procreate's narrower layer/non-destructive model. Its Quick Menu and direct manipulation should be combined with deeper layer, adjustment, automation, and selection systems.

**Unique integration opportunity**

Quick Menu should be context-aware and able to contain Macros, Region actions, layer actions, colors, brushes, and canvas commands while still remaining user-configurable.

### Official sources

- https://help.procreate.com/procreate/handbook/transform/transform-interface-gestures
- https://help.procreate.com/procreate/handbook/5.4/selections
- https://help.procreate.com/procreate/handbook/guides/guide-create
- https://help.procreate.com/procreate/handbook/guides/guides-symmetry
- https://help.procreate.com/jp/procreate/handbook/guides/quickshape
- https://help.procreate.com/procreate/handbook/5.3/interface-gestures/quickmenu
- https://help.procreate.com/procreate/handbook/layers/layers-organize
- https://help.procreate.com/procreate/handbook/5.3/actions/actions-canvas
- https://help.procreate.com/procreate/handbook/colors/colors-profiles
- https://help.procreate.com/procreate/handbook/5.1/adjustments/adjustments-color
- https://help.procreate.com/procreate/handbook/adjustments/adjustments-clone

## 3. ibisPaint

### Confirmed relevant capabilities

Official ibisPaint materials document:

- a large customizable brush library,
- a large material library,
- a broad filter inventory,
- Adjustment Layers,
- PSD export with layers preserved or merged,
- clipping and alpha lock,
- perspective and mesh transforms,
- interpolation settings for transforms,
- mirror and other ruler systems,
- Perspective Array Ruler for one-, two-, and three-point perspective workflows,
- layer/folder transforms.

### Illustro implications

**Adopt / match**

- dense feature availability on touch devices,
- clear access to common layer operations such as clipping,
- usable perspective and ruler workflows on mobile,
- adjustment-layer availability in an illustration-first app,
- transform interpolation controls,
- practical materials/preset management.

**Improve**

Illustro should avoid feature density becoming tool-window density. Common functions should remain reachable through Context UI, Quick Menu, gestures, and search.

**Unique integration opportunity**

Region Fill, Smart Fill, Quick Clipping, and Reference Eyedropper can make coloring workflows substantially shorter than conventional mobile painting workflows.

### Official sources

- https://ibispaint.com/about.jsp
- https://ibispaint.com/newFeature.jsp
- https://ibispaint.com/lecture/index.jsp?no=173
- https://ibispaint.com/lecture/index.jsp?lang=en&no=154
- https://ibispaint.com/lecture/index.jsp?no=156
- https://ibispaint.com/lecture/index.jsp?lang=en&no=47
- https://ibispaint.com/lecture/index.jsp?lang=en&no=90

## 4. Krita

### Confirmed relevant capabilities

Krita's official manual documents:

- multiple brush engines and detailed brush settings,
- sensors, texture, opacity and flow controls,
- color-smudge workflows,
- masked brushes,
- paint, group, vector, file, fill, clone, filter and other layer/mask types,
- selection masks,
- freehand/shape selections,
- advanced transforms including Perspective, Warp, Cage, and Liquify,
- drawing assistants,
- symmetry/mirror and wrap-around workflows,
- robust color management using Little CMS,
- ICC-oriented workflows,
- vector layers,
- multiple gradient types.

### Illustro implications

**Adopt / match**

- brush-engine depth and sensor mapping,
- selection-as-mask workflows,
- transform variety,
- reusable drawing assistants,
- serious color management,
- vector capability,
- broad gradient behavior.

**Improve**

Krita's depth should inform engine capability, but Illustro should expose it through better progressive disclosure and task-centered UI.

**Unique integration opportunity**

Procedural Brush and Dynamic Wet Media should be designed as one coherent engine family rather than an accumulation of independent brush engines that feel unrelated to users.

### Official sources

- https://docs.krita.org/en/reference_manual/brushes/brush_settings.html
- https://docs.krita.org/ja/reference_manual/brushes/brush_engines/color_smudge_engine.html
- https://docs.krita.org/en/reference_manual/brushes/brush_settings/masked_brush.html
- https://docs.krita.org/en/reference_manual/layers_and_masks.html
- https://docs.krita.org/en/user_manual/selections.html
- https://docs.krita.org/en/reference_manual/tools/transform.html
- https://docs.krita.org/en/reference_manual/tools/assistant.html
- https://docs.krita.org/en/reference_manual/preferences/color_management_settings.html
- https://docs.krita.org/en/reference_manual/layers_and_masks/vector_layers.html
- https://docs.krita.org/en/reference_manual/tools/gradient_draw.html

## 5. Adobe Photoshop

### Confirmed relevant capabilities

Current Adobe documentation confirms:

- Adjustment Layers,
- broad transform operations including Scale, Rotate, Skew, Distort, Perspective and Warp,
- mesh/control-point based Transform Warp,
- Liquify,
- Healing Brush,
- Patch Tool,
- Actions for recorded automation,
- ICC-based color management and embedded color profiles,
- tonal-range controlled layer compositing through Blend If,
- broad layer masking and retouching workflows.

Photoshop also documents non-destructive Liquify when applied through a Smart Object.

### Illustro implications

**Adopt / match**

- deep non-destructive editing,
- tone-dependent compositing,
- recorded actions/macros,
- robust ICC/profile behavior,
- high-quality transform/warp,
- healing/patch repair.

**Improve**

Illustro should avoid forcing illustration users through photo-editor-oriented dialogs. Blend If, adjustment controls, Warp, Healing and Patch should be surfaced as direct, previewable painting workflows.

**Unique integration opportunity**

Blend If can be redesigned as an on-canvas tonal-range visualization, and macros can integrate directly into Quick Menu and Context UI.

### Official sources

- https://helpx.adobe.com/photoshop/web/get-set-up/learn-the-basics/compare-photoshop-web-and-desktop-features.html
- https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/transform-manipulate-reshape/transformation-options-in-adobe-photoshop.html
- https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/transform-manipulate-reshape/reshape-and-distort-images-with-transform-warp.html
- https://helpx.adobe.com/photoshop/desktop/effects-filters/artistic-stylize-filters/overview-of-liquify-filter.html
- https://helpx.adobe.com/photoshop/desktop/automate-tasks/automation-settings-and-presets/actions-overview.html
- https://helpx.adobe.com/photoshop/desktop/adjust-color/color-profiles/about-color-profiles.html
- https://helpx.adobe.com/photoshop/desktop/adjust-color/color-profiles/embed-color-profiles.html
- https://helpx.adobe.com/photoshop/using/layer-opacity-blending.html

## 6. Affinity Photo 2

### Confirmed relevant capabilities

Affinity Photo 2 official help documents:

- adjustment layers,
- Live Filters,
- layer masks,
- live layer masks,
- blend ranges,
- layer states,
- snapshots,
- macro recording and batch jobs,
- Liquify,
- custom brushes and paint mixing,
- symmetry/mirror painting,
- snapping and grids,
- dockable/floating panels and customizable workspace behavior,
- layer tags, finding, isolation and locking,
- broad color-management functionality,
- non-destructive live filters including displacement and lighting effects.

Affinity's feature documentation also shows substantial vector/text tooling and customizable UI/workspace support.

### Illustro implications

**Adopt / match**

- live non-destructive effects,
- snapshots,
- layer-state concepts,
- macro workflows,
- flexible workspace behavior,
- blend-range control,
- layer search/tagging/isolation.

**Improve**

Illustro should consolidate Snapshot and Layer Comp concepts so users understand whether they are saving document content state or only layer presentation state.

**Unique integration opportunity**

Snapshot, Layer Comp, history, Timelapse and Macro should share a common Command/History foundation but remain separate concepts in the UI.

### Official sources

- https://affinity.help/photo2/English.lproj
- https://affinity.help/photo2ipad/en-US.lproj/pages/Layers/layerBlendModes.html
- https://affinity.help/photo2ipad/en-US.lproj/pages/Channels/maskingChannels.html
- https://affinity.help/photo2ipad/English.lproj/pages/Filters/lighting_effects.html
- https://affinity.help/photo2ipad/en-US.lproj/pages/Filters/filter_displace.html
- https://affinity.help/photo2ipad/English.lproj/pages/Workspace/shortcuts.html

## 7. Cross-product capability matrix

Legend:

- **✓**: directly verified in official documentation reviewed in this pass
- **—**: not verified in this pass; this does **not** mean the product lacks it

| Capability | CSP | Procreate | ibisPaint | Krita | Photoshop | Affinity |
|---|---:|---:|---:|---:|---:|---:|
| Reference-based fill | ✓ | ✓ | — | — | — | — |
| Gap-aware fill | ✓ | — | — | — | — | — |
| Vector layer / editable vector content | ✓ | — | ✓* | ✓ | ✓* | ✓ |
| Perspective / drawing guides | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Symmetry / mirrored drawing | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Advanced transform / warp | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Adjustment / non-destructive effect layers | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| Tone-dependent blend ranges | — | — | — | — | ✓ | ✓ |
| Snapshot/checkpoint concept | — | — | — | — | — | ✓ |
| Recorded macros/actions | — | — | — | — | ✓ | ✓ |
| Reference image + direct color pick | — | ✓ | — | — | — | — |
| ICC/profile color management | — | ✓ | — | ✓ | ✓ | ✓ |
| Customizable fast command surface | — | ✓ | — | — | — | — |

\* Verified only at a broad capability level in this pass; exact semantics differ from Illustro's intended vector model.

## 8. Immediate specification consequences

The following areas should be promoted from “unresolved conventional feature” to explicit Illustro requirements or architecture investigations:

### 8.1 Drawing guides and rulers — Required

Illustro should include:

- straight ruler,
- parallel ruler,
- ellipse/circle assistance where useful,
- symmetry/mirror,
- radial symmetry,
- 2D grid,
- isometric grid,
- one-/two-/three-point perspective assistance,
- snapping of supported drawing tools to guides,
- editable on-canvas guide handles,
- guide visibility/locking,
- saved guide setups.

Exact inventory remains to be specified.

### 8.2 Shape correction and shape tools — Required

Illustro should investigate a unified approach combining:

- direct line/rectangle/ellipse/polygon tools,
- post-stroke shape correction,
- shape snapping similar in spirit to QuickShape,
- vector-backed shapes where appropriate.

### 8.3 Gradient system — Required

Illustro should support at least:

- linear,
- radial,
- reflected/bilinear,
- shape-aware gradients where technically appropriate,
- editable gradient stops,
- non-destructive gradient representation,
- dithering for low-bit-depth output where useful,
- Gradient Map adjustment.

### 8.4 Color management — Core architecture requirement

Before the rendering architecture is frozen, Illustro must explicitly decide:

- supported color models,
- bit depths,
- document color space representation,
- ICC profile embedding,
- display conversion,
- import profile policy,
- export profile policy,
- wide-gamut support,
- whether CMYK document editing is in core scope or import/export-only scope,
- HDR/linear-light policy.

This cannot be safely bolted on after the document and compositing model are fixed.

### 8.5 Selection as reusable data — Required

Selections should not exist only as temporary marching ants.

Illustro should support:

- selection masks / saved selections,
- feathered grayscale selections,
- region-to-selection,
- layer-content selection,
- luminance/color-based selection,
- boolean selection operations.

### 8.6 Layer navigation for large documents — Required

High-layer-count workflows require:

- search,
- tags,
- filtering,
- isolation/solo,
- direct layer selection from canvas content,
- fast group collapse/expand,
- virtualization so the panel remains responsive.

### 8.7 Macro / History / Snapshot separation — Required conceptual model

These concepts must be distinct:

- **Undo History**: reversible sequence of actual document commands.
- **Snapshot**: named checkpoint of document state.
- **Layer Comp**: saved presentation/configuration state for layers.
- **Macro**: reusable sequence of commands.
- **Timelapse**: visual reconstruction/export derived from production history.

They may share storage primitives internally but must not be conflated in user-facing behavior.

## 9. Research still required before “complete feature specification”

A second pass is still needed for:

- exact brush dynamics and sensor inventories,
- vector editing models,
- text feature scope,
- complete blend-mode coverage,
- filter/adjustment inventory,
- file-format compatibility boundaries,
- bit-depth/HDR behavior,
- selection edge algorithms,
- interpolation algorithms,
- canvas creation presets and limits,
- materials/assets management,
- navigator and multi-view workflows,
- accessibility,
- plugin/extensibility model,
- platform-specific file-system behavior.

No claim of complete competitive parity should be made until these are reviewed.
