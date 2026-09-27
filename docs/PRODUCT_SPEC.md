# Illustro Product Specification

> Status: Canonical product-level specification  
> Scope: Product vision, non-negotiable priorities, design principles, required capabilities, and quality criteria  
> Source of truth: This document governs lower-level feature, UI, architecture, and implementation specifications unless a later explicit product decision supersedes it.

## 0. Product definition

Illustro is a high-functionality, high-responsiveness painting application optimized primarily for creating a single finished illustration.

The product goal is to deliver a better end-to-end experience for single-illustration creation than existing painting applications. Illustro does not pursue unlimited expansion into general-purpose DTP, video editing, 3D production, manga production, or unrelated creative-tool domains.

Illustro actively studies and adopts proven ideas, algorithms, interaction patterns, and UI concepts from leading applications when they are appropriate. Being different from existing products is not itself a goal.

Originality should come from:

- redesigning existing capabilities,
- integrating capabilities that are unnecessarily separated elsewhere,
- reducing interaction steps,
- optimizing workflows specifically for single-illustration production, and
- introducing new capabilities for problems not adequately solved by existing approaches.

## 1. Absolute priority order

The priority order is fixed:

1. Intuitive operation
2. Ease of use
3. Performance and responsiveness
4. Production efficiency
5. Breadth of functionality
6. Advanced customizability

Illustro must not make itself easier merely by removing useful functionality.

The target is:

> **High-functionality, yet simple to use.**

When additional functionality creates UI complexity, the preferred solution is to manage complexity through UI hierarchy, conditional visibility, context UI, Quick Menu, gestures, workspaces, search, and other discoverability mechanisms rather than deleting capability.

## 2. Core design philosophy

### 2.1 Canvas First

The canvas is the primary working surface.

The preferred interaction loop is:

1. See the canvas.
2. Interact directly with the canvas.
3. See the result immediately.

Users should spend more time drawing and manipulating artwork than navigating settings screens.

### 2.2 Direct Manipulation

Prefer direct manipulation of the target itself over indirect parameter entry.

Primary interaction mechanisms include:

- drag,
- pinch,
- rotation,
- handles,
- stylus interaction,
- touch interaction,
- contextual controls on or near the canvas.

Numeric entry remains available where useful, but should not be required for ordinary operations that can be performed naturally and precisely through direct interaction.

### 2.3 Low Friction

High-frequency actions must require as few steps as practical.

Avoid unnecessary interaction chains such as:

menu → category → submenu → command.

The more frequently an action is used, the faster and more directly it should be reachable.

## 3. Signature systems and product-defining capabilities

### 3.1 Lineart Region System

Illustro shall support a region model derived from line art.

The system should be able to represent, at minimum:

- closed regions,
- boundaries,
- adjacency relationships,
- persistent region IDs,
- line connectivity,
- fill targets.

The first implementation does not require full semantic understanding. The primary requirement is reliable identification and persistence of regions enclosed by line art.

Future or higher-level semantics may allow regions such as hair, face, skin, clothing, sleeves, eyes, and background to be organized meaningfully.

Primary goals:

- faster filling,
- reduced repainting after line-art edits,
- easier recoloring,
- faster selection creation,
- support for shading workflows,
- integration with Smart Color Assist.

### 3.2 Lineart-linked Coloring

When line art changes, Illustro should be able to recalculate affected region boundaries and remap existing color information to the new regions where possible.

Example:

- A facial contour is adjusted.
- Region boundaries are recalculated.
- Existing skin color follows the new contour instead of remaining at the previous boundary.

This behavior must remain user-controlled:

- results must be reviewable,
- changes must be undoable,
- tracking strength and conditions should be configurable,
- automatic behavior must not silently destroy intentional artwork.

### 3.3 Smart Color Assist

Smart Color Assist supports the artist rather than generating a finished image for them.

Candidate functions include:

- base-color suggestions,
- harmony suggestions using adjacent colors,
- palette suggestions,
- region-based recoloring,
- shadow candidates,
- highlight candidates,
- color-temperature adjustment,
- overall color adjustment.

Deterministic algorithms should be preferred where practical, using information such as:

- region structure,
- hue,
- value,
- saturation,
- adjacency,
- existing palettes,
- user preferences.

The objective is to reduce repetitive or tedious work, not to replace authorship.

### 3.4 Smart Fill / Advanced Fill

Illustro shall support filling beyond basic flood fill.

The unified fill system should support capabilities such as:

- gap closing,
- configurable gap tolerance,
- boundary expansion,
- boundary contraction,
- multi-layer reference,
- line-art reference,
- color-difference tolerance,
- Region Fill,
- enclose-and-fill,
- trace-and-fill,
- drag fill,
- continuous region fill.

The UI should avoid scattering these capabilities across an excessive number of unrelated tools when they can be coherently accessed through a unified fill workflow.

### 3.5 Procedural Brush System

Brushes should not depend exclusively on large collections of raster stamp textures.

The brush engine should support procedural composition from parameters such as:

- shape,
- spacing,
- scatter,
- rotation,
- pressure,
- speed,
- direction,
- wetness,
- mixing,
- paper texture,
- edge behavior,
- particles,
- noise.

Goals:

- avoid unnecessary brush-library size growth,
- improve editability,
- reduce resolution dependence,
- make user-authored brushes easier to create,
- exploit GPU acceleration where appropriate.

### 3.6 Dynamic Wet Media

Illustro should support illustration-oriented wet media with internal canvas state rather than only watercolor-style stamps.

Candidate state includes:

- wetness,
- pigment,
- flow,
- absorption,
- dryness.

A simplified simulation may model:

water → pigment diffusion → paper absorption → drying → edge formation.

The goal is not maximal physical realism. The goal is visually convincing, controllable, responsive wet-media behavior suitable for illustration.

### 3.7 Reference Workspace

Reference images must be manageable independently of artwork layers.

Capabilities should include:

- multiple references,
- free placement,
- pinning,
- scale,
- rotation,
- horizontal flip,
- grayscale preview,
- always-on-top behavior,
- temporary hide,
- reference groups,
- persistence with the document or workspace as appropriate.

### 3.8 Reference Eyedropper

Users should be able to sample color directly from a reference image without importing the reference into the canvas or changing application context.

Fast access methods should include stylus, modifier, or press-and-hold interactions where appropriate.

### 3.9 Snapshot System

Snapshots represent user-marked production states distinct from linear Undo history.

Use cases include:

- variant A / variant B,
- color variations,
- before / after comparison,
- checkpoints before major changes.

Snapshots should support comparison and may support branching workflows.

### 3.10 Layer Comps

Layer Comps store coordinated layer-state variants.

Candidate stored properties include:

- visibility,
- opacity,
- blend mode,
- optionally transform state.

Use cases include:

- day / night / sunset,
- expression variants,
- background variants.

### 3.11 Seamless Tile Drawing

Illustro should support a seamless drawing mode for texture and pattern creation.

The canvas should repeat horizontally and vertically, with drawing near one edge reflected continuously across opposite edges so seams can be inspected while working.

### 3.12 Work Time

Illustro should measure actual production activity rather than only document-open time.

Relevant activity includes:

- brush operations,
- layer operations,
- transforms,
- selections,
- color changes,
- other meaningful editing commands.

Extended inactivity should be excluded automatically.

Candidate views:

- Total Work Time,
- Today,
- Session,
- Average.

### 3.13 Timelapse

Timelapse should preferably derive from document change history rather than ordinary screen recording.

Goals include:

- lower storage cost,
- UI-free output,
- high-resolution export,
- controllable frame pacing.

### 3.14 Auto Actions / Macros

Repeated workflows should be automatable.

Example:

duplicate layer → Gaussian Blur → change blend mode → set opacity to 40%.

Candidate capabilities:

- action recording,
- parameterized steps,
- presets,
- keyboard shortcut assignment,
- Quick Menu registration.

### 3.15 Quick Menu

Quick Menu is a user-customizable fast-access surface.

Registrable content includes:

- tools,
- commands,
- brushes,
- colors,
- macros,
- layer actions,
- canvas actions.

Items may expose:

- icon,
- label,
- shortcut,
- group.

### 3.16 Persistent Clipping Control

Clipping is a high-frequency illustration workflow and must not be hidden only inside deep layer menus.

Clipping state should be directly visible and quickly controllable from the layer UI.

### 3.17 Advanced Non-destructive Editing

Illustro should adapt advanced editing capabilities to single-illustration workflows.

Candidate capabilities include:

- Adjustment Layer,
- Filter Layer,
- Mask,
- Clipping Mask,
- Vector Mask,
- Blend If equivalent,
- Live Blur,
- Live Color Adjustment,
- Displacement,
- Warp,
- Liquify,
- Healing,
- Patch.

The default principle is:

> Prefer non-destructive operation where practical.

### 3.18 Blend If equivalent

Layer visibility/compositing should be controllable by luminance or related channel conditions derived from the current layer and/or underlying content.

Use cases include:

- highlights,
- shadows,
- texture compositing,
- glow,
- color correction.

The UI should aim to communicate the behavior more directly than a literal reproduction of complex legacy interfaces.

### 3.19 Healing / Patch

Healing and Patch functionality should be adapted for illustration repair as well as photographic content.

Use cases include:

- removing unwanted marks,
- cleaning small artifacts,
- repairing textures,
- correcting backgrounds.

### 3.20 High Zoom

Target maximum zoom: **64000%**.

Use cases include:

- pixel-level editing,
- anti-aliasing inspection,
- fine correction,
- pixel art.

Coordinate handling must remain stable and precise at extreme zoom levels.

## 4. Layer system

Layers are a core subsystem.

Required layer categories include at minimum:

- Raster Layer,
- Vector Layer,
- Group,
- Mask,
- Clipping,
- Adjustment Layer,
- Filter Layer,
- reference-related entities where appropriate,
- Text.

Large layer counts must not make the layer UI unacceptably slow.

Layer capabilities include:

- multi-select,
- drag reorder,
- search,
- filtering,
- color tags,
- lock types,
- Solo,
- Collapse,
- Duplicate,
- Merge,
- Merge Visible,
- Flatten Copy,
- Layer Comp,
- Quick Clipping.

## 5. UI principles

### 5.1 Primary UI objective

Clarity is more important than visual minimalism.

The intended progression is:

- first-time user: basic operation is understandable,
- experienced user: operation becomes faster,
- advanced user: the interface fades into the background.

### 5.2 Context UI

Controls shown near the user’s current task should change according to selected tool or operation.

Examples:

- Transform: rotation, flip, interpolation, commit/cancel,
- Brush: size, opacity,
- Selection: add, subtract, invert.

Controls that are not relevant should not occupy permanent attention.

### 5.3 Workspace

Desktop-class environments should support flexible workspace management:

- Dock,
- Undock,
- Floating,
- Resize,
- Reorder,
- Hide,
- Workspace Save,
- Workspace Load.

Candidate presets include:

- Drawing,
- Painting,
- Coloring,
- Photo Editing,
- Pixel Art,
- Minimal.

### 5.4 Left/right layout mirroring

Left-handed and right-handed workflows must be supported beyond merely moving a toolbar.

Mirroring may affect:

- panels,
- popups,
- Quick Menu,
- major action locations.

## 6. Device-specific optimization

Illustro must not reuse one identical UI by simply scaling it.

### Desktop / PC

Optimize for:

- keyboard shortcuts,
- mouse,
- pen tablet,
- multiple panels,
- dock/floating layouts,
- hover,
- context click,
- modifier keys.

### Tablet

Optimize for:

- stylus,
- touch gestures,
- one-hand support,
- appropriately sized controls,
- maximum canvas area,
- gesture shortcuts.

### Smartphone

Optimize for:

- small screens,
- one-hand operation,
- thumb reach,
- Quick Menu,
- Context UI,
- minimal screen occupation.

The smartphone experience must not be a reduced copy of the desktop layout.

## 7. Input system

Supported input:

- Mouse,
- Touch,
- Stylus,
- Keyboard.

Where hardware exposes the data, stylus input should support:

- Pressure,
- Tilt,
- Azimuth,
- Eraser,
- Barrel Button.

Pointer processing should minimize latency.

## 8. Undo / Redo

Undo is a primary creative capability, not merely error recovery.

Requirements:

- fast,
- deep history,
- memory-efficient,
- immediate,
- stable.

Where practical, history should operate at meaningful Command granularity rather than only opaque pixel snapshots.

Snapshot is a separate concept from Undo history.

## 9. Performance principles

Target experience:

> **Perceived zero lag.**

Critical operations include:

- Stroke,
- Undo,
- Redo,
- Zoom,
- Pan,
- Rotate,
- Layer Switch,
- Visibility Toggle,
- Transform,
- Selection,
- Color Pick.

Performance evaluation must not rely only on average FPS.

Important metrics include:

- input latency,
- frame time,
- worst-frame behavior,
- memory usage,
- scaling with canvas size.

## 10. Large-canvas architecture requirement

Illustro should avoid designs that repeatedly process the entire canvas as one monolithic bitmap.

A tile-based canvas architecture is a primary candidate.

Expected benefits:

- support for very large images,
- efficient Undo,
- reduced GPU transfer,
- lower memory pressure,
- partial redraw.

The exact implementation remains an architecture-level decision, but large-canvas scalability is a product requirement.

## 11. GPU usage

GPU acceleration should be used aggressively where it materially improves responsiveness.

Candidate technologies and resources include:

- WebGPU,
- GPU textures,
- compute shaders.

Candidate accelerated operations include:

- brush compositing,
- filters,
- blur,
- transforms,
- color adjustments,
- blending,
- previews.

Where GPU dependency would materially reduce compatibility, a fallback path should be considered.

## 12. File formats

Native format:

- **.illustro**

The native format must be capable of retaining, as applicable:

- canvas state,
- layers,
- masks,
- vectors,
- brush information,
- region information,
- references,
- snapshots,
- layer comps,
- workspace metadata,
- timelapse data,
- document settings.

Standard image export targets include:

- PNG,
- JPEG,
- WebP.

Advanced interchange:

- PSD support should be investigated.

Priority:

> Preserve as much information as practical during import and export.

## 13. Autosave and recovery

Illustro must minimize risk of lost work.

Required design goals include:

- Auto Save,
- Crash Recovery,
- Recovery Snapshot,
- Incremental Save.

Saving must not unnecessarily stall drawing.

## 14. Offline First

Normal production must not require an internet connection.

Offline-capable operations include:

- drawing,
- saving,
- editing,
- brushes,
- layers,
- Undo,
- references,
- filters.

Cloud dependency and mandatory login should be avoided.

PWA installation is an important candidate, subject to architecture validation.

## 15. AI policy

Generative AI is not the central value proposition.

Illustro’s AI direction is:

- AI completes the artwork: **No**
- AI assists the artist’s work: **Yes**

Potential assistive use cases:

- color suggestions,
- region assistance,
- selection assistance,
- organization assistance,
- correction assistance.

When practical, deterministic non-AI algorithms should be preferred for:

- reproducibility,
- speed,
- offline operation,
- privacy,
- cost,
- user control.

## 16. Customization

User-dependent preferences should be configurable rather than removed.

Candidate configurable areas include:

- gestures,
- toolbars,
- Quick Menu,
- shortcuts,
- workspace,
- brush UI,
- left/right layout,
- canvas controls,
- hover behavior.

Defaults must remain strong enough that users are not forced to configure the application before it becomes usable.

## 17. Beginner and advanced-user coexistence

Illustro should not assume that beginner and advanced modes must be completely separate applications.

The same core functionality should remain available.

Beginners should be able to use the application naturally.

Advanced users should be able to accelerate workflows through:

- shortcuts,
- macros,
- workspaces,
- advanced settings.

Advanced capability must not be removed merely to make the product appear beginner-friendly.

## 18. Existing applications: study direction

Illustro should actively research established products.

### Clip Studio Paint

Study:

- brush flexibility,
- layers,
- selection,
- transform,
- shortcuts,
- production assistance.

Areas Illustro aims to improve:

- UI complexity,
- depth of settings,
- operation count.

### ibisPaint

Study:

- feature density,
- smartphone interaction,
- accessibility,
- filters,
- beginner approachability.

A broad feature set at least comparable in practical illustration workflows is an important reference point, not an automatic parity checklist.

### Procreate

Study:

- canvas-centered UI,
- gestures,
- low-friction operation,
- drawing experience,
- intuitiveness.

Illustro should additionally support more advanced layer, selection, adjustment, and automation workflows.

### Photoshop

Study:

- blending,
- adjustments,
- masks,
- Blend If,
- healing,
- patch,
- advanced transforms.

Avoid directly copying photo-editor complexity where a clearer illustration-oriented interaction can be designed.

### Krita

Study:

- brush engine,
- flexibility,
- advanced painting capabilities,
- open design ideas where technically and legally appropriate.

### Affinity

Study:

- non-destructive editing,
- UI organization,
- performance,
- adjustments.

## 19. Designs to avoid

Illustro should avoid, where practical:

- reducing functionality merely to appear simple,
- excessively deep menus,
- excessive modal dialogs,
- dependence on settings screens,
- requiring numeric entry for routine direct-manipulation tasks,
- mandatory cloud dependence,
- mandatory login,
- perceptible brush-switch delays,
- slow Undo,
- severe high-resolution performance collapse,
- forcing identical UI across device classes,
- shrinking the desktop UI for smartphone use,
- removing advanced features in the name of beginner-friendliness,
- rejecting good established UI patterns merely for originality,
- making generative AI the product’s central value,
- frequent context-switching away from the canvas,
- hiding important functionality exclusively behind context click,
- interfaces in which useful capabilities are difficult to discover.

## 20. Target end state

Illustro is not intended to win merely by doing everything.

The target is:

> **All advanced capabilities needed for single-illustration production should be available in a form that feels natural to use.**

Conceptually, the desired combination is:

- Clip Studio Paint-class production capability,
- Procreate-class intuitiveness,
- ibisPaint-class accessibility and density,
- Krita-class flexibility,
- Photoshop / Affinity-class non-destructive editing,
- Illustro-specific production assistance,

reconstructed from the beginning around single-illustration creation.

These comparisons are design references, not claims of current parity.

## 21. Product-defining differentiators

The strongest differentiating elements are:

1. Lineart Region System
2. Lineart-linked Coloring
3. Smart Color Assist
4. Advanced Smart Fill
5. Procedural Brush
6. Dynamic Wet Media
7. Reference Workspace
8. Snapshot
9. Layer Comps
10. Quick Menu / Direct Manipulation
11. Work Time
12. History-based Timelapse
13. Auto Actions / Macros
14. Device-adaptive UI
15. A UI system that makes advanced capability intuitive

## 22. Quality gate for new features

Every proposed feature should be evaluated in this order:

1. Does it materially help single-illustration production?
2. Can it reduce operation count or friction?
3. Can a first-time user understand its purpose?
4. Does it preserve creative focus?
5. Can it run fast enough?
6. Can it be undone?
7. Can it be non-destructive where appropriate?
8. Can it integrate meaningfully with other systems?
9. Does it account for PC, tablet, and smartphone interaction differences?
10. Can Illustro make it clearly better for its intended workflow than existing approaches?

Technical implementability alone is not sufficient justification for adoption.

## 23. One-sentence design principle

> **Not “an app with many features,” but “an app where the feature needed at that moment is available immediately, naturally, and with the fewest practical steps.”**

This principle is the primary tie-breaker for product-level design decisions.

## 24. Future collaborative drawing

A collaborative drawing / 絵チャ capability is desired only after the core Illustro painting application is complete.

It is not part of the current core design scope.

However, avoid unnecessary architectural assumptions that would make future collaborative editing impossible without major redesign.

## 25. Specification governance

This file defines product-level intent and non-negotiable direction.

Lower-level specifications may refine behavior but must not silently contradict this document.

When a conflict is discovered:

1. identify the conflict explicitly,
2. determine whether the lower-level design or this product requirement should change,
3. record the decision,
4. update all affected specifications together.

Implementation phases may defer features, but deferral does not remove them from the target product unless an explicit product decision changes this specification.
