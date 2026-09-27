# Illustro Feature Catalog

> Status: Initial catalog derived from the canonical product specification.  
> Purpose: Master index of planned capabilities. Detailed behavior belongs in `docs/features/*.md`.  
> Important: Presence here means “part of the intended product scope or an explicit investigation target,” not “already implemented.”

## Status vocabulary

- **Core** — foundational or product-defining; architecture must account for it early.
- **Required** — intended final product capability.
- **Investigate** — intended direction, but exact technical/product form requires validation.
- **Future** — intentionally postponed beyond the core painting application.
- **Out of scope** — intentionally not part of the product direction.

## A. Canvas and document

| Capability | Status | Notes |
|---|---|---|
| Raster canvas | Core | Primary drawing surface |
| Tile-based large-canvas architecture | Core / Investigate | Architecture candidate to meet scalability requirements |
| Pan / Zoom / Rotate | Core | Must feel immediate |
| Zoom up to 64000% | Required | Coordinate precision must remain stable |
| Canvas flip | Required | Horizontal/vertical as appropriate |
| Crop | Required | Detailed interaction TBD |
| Canvas resize | Required | Detailed resampling options TBD |
| Image resize | Required | Interpolation modes TBD |
| Seamless Tile Drawing | Required | Live repeated-edge editing |
| Multiple documents | Required | UX TBD |
| Document metadata | Required | Native format support |

## B. Drawing and brush engine

| Capability | Status | Notes |
|---|---|---|
| Brush tool | Core | Low-latency input |
| Eraser | Core | Brush-compatible behavior preferred |
| Smudge / blend tool | Required | Detailed model TBD |
| Brush size / opacity | Core | Fast-access controls |
| Pressure | Core where hardware supports it | |
| Tilt | Required where hardware supports it | |
| Azimuth | Required where hardware supports it | |
| Stylus eraser | Required where hardware supports it | |
| Barrel button | Required where hardware supports it | |
| Stabilization / smoothing | Required | Algorithms TBD |
| Procedural Brush System | Core differentiator | Shape, spacing, scatter, dynamics, noise, etc. |
| Texture-based brush inputs | Required | Procedural does not prohibit raster textures |
| Brush presets | Required | |
| Brush organization/search | Required | |
| User-authored brushes | Required | |
| Dynamic Wet Media | Core differentiator / Investigate | Illustration-oriented simulation |
| Pigment / wetness state | Investigate | Wet-media subsystem |
| Paper / grain interaction | Required / Investigate | Brush and wet-media integration |

## C. Line art and region intelligence

| Capability | Status | Notes |
|---|---|---|
| Lineart Region System | Core differentiator | Foundational document concept |
| Closed-region detection | Core | First-stage requirement |
| Persistent Region IDs | Core | Persistence/remapping rules TBD |
| Region adjacency graph | Core | Supports coloring assistance |
| Boundary tracking | Core | |
| Line connectivity analysis | Core | |
| Region selection | Required | |
| Region Fill | Required | |
| Lineart-linked Coloring | Core differentiator | Re-map color after line edits |
| Configurable remapping strength/conditions | Required | |
| Region change preview/confirmation | Required | Must remain user-controlled |
| Semantic region labels | Investigate | Not required for first implementation |

## D. Fill and coloring

| Capability | Status | Notes |
|---|---|---|
| Flood Fill | Core | |
| Gap closing | Required | |
| Gap tolerance | Required | |
| Boundary expand/shrink | Required | |
| Multi-layer reference fill | Required | |
| Line-art reference fill | Required | |
| Color-difference tolerance | Required | |
| Enclose and Fill | Required | |
| Trace and Fill | Required | |
| Drag Fill | Required | |
| Continuous-area fill | Required | |
| Smart Fill unified workflow | Core differentiator | Avoid needless tool fragmentation |
| Smart Color Assist | Core differentiator | Artist-assistive, not generative-first |
| Base-color suggestions | Required / Investigate | Deterministic methods preferred |
| Palette suggestions | Required / Investigate | |
| Adjacent-color harmony assistance | Required / Investigate | |
| Region recoloring | Required | |
| Shadow/highlight candidates | Investigate | |
| Color-temperature adjustment | Required | |
| Global color adjustment | Required | |

## E. Color system

| Capability | Status | Notes |
|---|---|---|
| Color picker | Core | |
| Canvas eyedropper | Core | |
| Reference Eyedropper | Core differentiator | Directly sample reference assets |
| Color history | Required | |
| Palettes | Required | |
| Palette import/export | Required | Format support TBD |
| HSV/HSL/RGB style controls | Required | Exact models TBD |
| Color harmony assistance | Required / Investigate | |
| Grayscale preview | Required | Also useful in references |
| Color management / ICC | Investigate | Must be researched before architecture freeze |

## F. Layers

| Capability | Status | Notes |
|---|---|---|
| Raster Layer | Core | |
| Vector Layer | Required | Detailed vector model TBD |
| Group | Core | |
| Mask | Required | |
| Clipping | Core | High-frequency workflow |
| Persistent Clipping Control | Core UX requirement | Directly visible/controllable |
| Adjustment Layer | Required | |
| Filter Layer | Required | |
| Text layer/entity | Required | |
| Multi-select layers | Required | |
| Drag reorder | Core | |
| Search | Required | |
| Filter | Required | |
| Color tags | Required | |
| Lock types | Required | |
| Solo | Required | |
| Collapse | Required | |
| Duplicate | Required | |
| Merge | Required | |
| Merge Visible | Required | |
| Flatten Copy | Required | |
| Layer Comps | Core differentiator | Store coordinated layer states |
| Large-layer-count performance | Core quality requirement | Virtualization/caching approach TBD |

## G. Selection and transform

| Capability | Status | Notes |
|---|---|---|
| Rectangular / elliptical selection | Required | |
| Freehand selection | Required | |
| Polygonal selection | Required | |
| Color / similarity selection | Required | Detailed algorithms TBD |
| Region selection | Required | Region-system integration |
| Add / subtract / intersect | Required | |
| Invert selection | Required | |
| Feather | Required | |
| Expand / contract | Required | |
| Transform scale / rotate / move | Core | |
| Flip | Required | |
| Free transform | Required | |
| Perspective / distortion | Required | |
| Warp | Required | Prefer non-destructive where practical |
| Liquify | Required | Prefer non-destructive where practical |
| Transform interpolation options | Required | |

## H. Non-destructive editing and compositing

| Capability | Status | Notes |
|---|---|---|
| Adjustment Layer | Required | |
| Filter Layer | Required | |
| Live Blur | Required | |
| Live Color Adjustment | Required | |
| Masks | Required | |
| Vector Mask | Required / Investigate | |
| Clipping Mask | Required | |
| Blend modes | Core | Exact mode list TBD |
| Blend If equivalent | Core differentiator | More visual/intuitive interaction desired |
| Displacement | Required / Investigate | |
| Healing | Required | Illustration-friendly workflow |
| Patch | Required | Illustration-friendly workflow |

## I. Reference system

| Capability | Status | Notes |
|---|---|---|
| Reference Workspace | Core differentiator | Independent of artwork layers |
| Multiple references | Required | |
| Free placement | Required | |
| Pinning | Required | |
| Reference scale/rotate | Required | |
| Horizontal flip | Required | |
| Grayscale | Required | |
| Always on top | Required | |
| Temporary hide | Required | |
| Reference Groups | Required | |
| Reference persistence | Required | |
| Reference Eyedropper | Core differentiator | |

## J. History, snapshots, and branching

| Capability | Status | Notes |
|---|---|---|
| Undo | Core | Deep, fast, stable |
| Redo | Core | |
| Command-level history where practical | Core architecture direction | |
| Snapshot System | Core differentiator | Explicit checkpoints |
| Snapshot comparison | Required | |
| Snapshot branching | Required / Investigate | |
| History panel | Required | Detailed UX TBD |

## K. Timelapse and work analytics

| Capability | Status | Notes |
|---|---|---|
| History-based Timelapse | Core differentiator | Prefer document changes over screen recording |
| UI-free output | Required | |
| High-resolution export | Required | |
| Frame pacing controls | Required | |
| Work Time | Core differentiator | Measure active production time |
| Session time | Required | |
| Daily time | Required | |
| Total work time | Required | |
| Inactivity filtering | Required | |

## L. Automation

| Capability | Status | Notes |
|---|---|---|
| Auto Actions / Macros | Core differentiator | |
| Action recording | Required | |
| Parameterized actions | Required / Investigate | |
| Macro presets | Required | |
| Shortcut assignment | Required | |
| Quick Menu registration | Required | |

## M. UI, workspace, and interaction

| Capability | Status | Notes |
|---|---|---|
| Canvas First UI | Core principle | |
| Direct Manipulation | Core principle | |
| Context UI | Core | |
| Quick Menu | Core differentiator | User-customizable |
| Command/tool search | Required | Discoverability mechanism |
| Dock panels | Required on desktop-class UI | |
| Undock / floating panels | Required on desktop-class UI | |
| Panel resize/reorder/hide | Required | |
| Workspace Save/Load | Required | |
| Workspace presets | Required | Drawing, Painting, Coloring, Photo Editing, Pixel Art, Minimal candidates |
| Left/right UI mirroring | Required | More than toolbar relocation |
| Keyboard shortcuts | Core on desktop | |
| Gestures | Core on touch devices | |
| Hover behavior | Required where hardware supports it | |
| Context click | Required on desktop | Important actions must not exist only here |
| Custom toolbar | Required | |
| Custom shortcuts | Required | |
| Custom gestures | Required | |

## N. Device adaptation

| Capability | Status | Notes |
|---|---|---|
| Desktop-specific UI | Core requirement | Keyboard/mouse/pen/panels/hover |
| Tablet-specific UI | Core requirement | Pen/touch/one-hand/canvas area |
| Smartphone-specific UI | Core requirement | Thumb reach/Quick Menu/compact context UI |
| Shared capabilities across device classes | Core principle | Do not remove advanced features solely due to form factor |

## O. File, persistence, recovery, and offline behavior

| Capability | Status | Notes |
|---|---|---|
| .illustro native format | Core | Preserve native document state |
| PNG export | Required | |
| JPEG export | Required | |
| WebP export | Required | |
| PSD import/export | Investigate | Information-preservation limits must be documented |
| Auto Save | Core | |
| Crash Recovery | Core | |
| Recovery Snapshot | Core | |
| Incremental Save | Core | |
| Saving without blocking drawing | Core quality requirement | |
| Offline First | Core principle | |
| No mandatory login for normal editing | Core principle | |
| PWA installation | Investigate | Depends on final runtime architecture |

## P. Performance and rendering

| Capability / Requirement | Status | Notes |
|---|---|---|
| Perceived-zero-lag goal | Core quality target | |
| Low input latency | Core | |
| Stable frame time | Core | |
| Worst-frame monitoring | Core engineering metric | |
| Memory scaling | Core engineering metric | |
| Canvas-size scaling | Core engineering metric | |
| GPU brush compositing | Investigate / likely required | |
| GPU filters | Investigate / likely required | |
| GPU transforms | Investigate / likely required | |
| WebGPU | Investigate | Architecture candidate, not yet fixed |
| GPU fallback path | Required where compatibility demands it | |

## Q. AI-assisted functionality

| Capability | Status | Notes |
|---|---|---|
| Generative AI as central product workflow | Out of scope | Explicit product decision |
| Assistive color suggestions | Investigate | Prefer deterministic algorithms where practical |
| Region assistance | Investigate | |
| Selection assistance | Investigate | |
| Organization assistance | Investigate | |
| Repair/correction assistance | Investigate | Must remain artist-controlled |
| Offline-capable non-AI alternatives | Core principle | |

## R. Future collaboration

| Capability | Status | Notes |
|---|---|---|
| Collaborative drawing / 絵チャ | Future | Consider only after core application completion |
| Realtime multi-user document editing | Future / Investigate | Architecture should not make it needlessly impossible |

## S. Areas still requiring systematic competitor research

The catalog is intentionally incomplete in several conventional painting-app areas. These must be researched and specified before the feature set is considered complete:

- rulers and drawing guides,
- symmetry and radial drawing,
- perspective guides,
- shape tools,
- gradient tools,
- vector path editing,
- text editing details,
- brush import/export/interchange,
- material/asset libraries,
- navigator,
- color-management details,
- ICC behavior,
- bit depth and HDR policy,
- blend-mode coverage,
- selection algorithms,
- transform interpolation,
- filters and adjustment inventory,
- canvas creation and resize options,
- export controls and metadata,
- keyboard/gesture defaults,
- accessibility,
- plugin/extensibility policy,
- PSD compatibility boundaries,
- platform/runtime-specific file access,
- print-related support only insofar as it benefits single-illustration production.

These items are not assumed absent. They are **unresolved** until competitor research and product decisions are completed.
