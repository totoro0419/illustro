# Brush Foundation: primary-source review (2026-10-03)

Research preceded implementation. The user has accepted the existing 2.5 engine's lightness/tracking on their device. Preserve that baseline (source `f20a028aa8c70643910ea27e7ffd97f7153536db`, HTML blob `e4352a885c39e480f8972daaa1e8dda13c34e48e`). The device, pen, browser and photon latency were not supplied. This acceptance does not certify new brush quality.

| Source | Publicly documented fact | Foundation decision | Unknown |
|---|---|---|---|
| [ibisPaint brush parameters](https://ibispaint.com/lecture/index.jsp?lang=en&no=118) | Separate fade, shape, jitter, type, dynamics and texture settings. Pressure/speed affect thickness, opacity and dry expression. Tip spacing, direction, aspect, AA/MSAA, opacity saturation, particle density/deviation and texture scale/invert are exposed. | Separate material opacity from deposited flow; generic mappings; phase envelopes; tip/texture resources; deterministic particles. | Internal accumulation, interpolation, prediction and GPU implementation. |
| [ibisPaint 14.1 release features](https://ibispaint.com/newFeature.jsp?lang=en) | Constant and Fast Strokes can be combined in real-time stabilization; After is separate. Prediction improves tracking/fade; per-brush settings can override common settings. | Retain bounded current-time regression; independent constant/fast and common/per-brush resolution. Post correction is an explicit geometry operation, never automatic pen-up processing. | Proprietary filter/prediction formula and replacement timing. |
| [ibisPaint September 2026 update](https://ibispaint.com/historyAndRights.jsp?newsID=303340270) | Per-brush Disable Prediction setting. | Prediction is versioned per preset; default conservative/off in reference ink brushes. | No claim of replicating its prediction algorithm. |
| [CSP brush size/tip](https://help.clip-studio.com/en-us/manual_en/810_subtools/B.htm) | Per-parameter pressure/speed dynamics, circle/material tips, hardness, angle from pen/line/random, density compensation for narrow spacing. | Ordered source-to-target mappings, sensor fallback, density/flow distinct from stroke opacity, material resource IDs. | Proprietary renderer. |
| [CSP stroke/spray/fade](https://help.clip-studio.com/en-us/manual_en/810_subtools/S.htm) | Gap trades smoothness against cost; continuous spraying; particle size/density/deviation; fade supports several targets and length/percentage/forward fade. | Relative/absolute spacing and exposure; deterministic particles; causal forward fade; known geometry may use known endpoint fade. | Freehand fade implementation. |
| [CSP correction](https://help.clip-studio.com/en-us/manual_en/810_subtools/C.htm) | Speed can reduce stabilization to address lag. Post correction modifies drawn lines. Its Taper may continue after pen release. | Speed mode can increase or reduce correction. Do not adopt post-release extension, because Illustro's requested contract forbids it. | Exact algorithms. |
| [CSP stroke preview](https://support.clip-studio.com/en-us/faq/articles/20250039) | Temporary predicted display is device-dependent; availability changes with size/stabilization/tool; Android has system/S Pen options. | Browser prediction is optional, bounded, discarded on new actual input, never serialized as artwork. | Cannot infer identical browser behavior or physical latency. |
| [Procreate Brush Studio 5.4](https://help.procreate.com/procreate/handbook/5.4/brushes/brush-studio-settings) | Shape, grain, dynamics, rendering, pressure, stabilization, taper and properties are distinct; brush/global stabilization and pressure curves exist. | Device curve followed by brush curve; immutable saved presets plus temporary overrides. | Closed-source execution and scheduling. |
| [Krita sensors](https://docs.krita.org/en/reference_manual/brushes/brush_settings/brush_sensors.html), [opacity/flow](https://docs.krita.org/en/reference_manual/brushes/brush_settings/opacity_and_flow.html) | Sensor curves and separate opacity/flow; some engines/settings use different accumulation models. | Specify accumulation explicitly, do not give every brush one undocumented blend formula. | Performance equivalence on user hardware. |
| [Krita Instant Preview](https://docs.krita.org/en/reference_manual/instant_preview.html) | LOD preview can visibly change on refinement with texture/density/spacing settings. | No LOD quality switch for reference brushes; identical shape/material functions live/final. | Perceptibility on real screens still needs testing. |
| [libmypaint implementation](https://github.com/mypaint/libmypaint/blob/master/mypaint-brush.c) | Settings mappings are separate from stroke state. `count_dabs_to` combines distance relative to actual/basic radius and time. Motion events interpolate dab positions, pressure, tilt and barrel rotation; partial dab distance survives events. | Keep incremental distance/time sampling, deterministic state and angular interpolation. | Illustro is not a port; no claim of pixel compatibility. |
| [Photoshop dynamics](https://helpx.adobe.com/photoshop/using/adding-dynamic-elements-brushes.html), [Fresco pixel brushes](https://helpx.adobe.com/fresco/desktop/draw-paint-animate-and-share/pixel-brushes.html) | Size/roundness/color/opacity/flow controls and jitter are separate; optional pen inputs require compatible hardware. Fresco exposes pressure/velocity curves, hardness, spacing and scatter. | Generic mappings and explicit optional sensor capability profile. | Proprietary brush math. |
| [Pointer Events 3](https://www.w3.org/TR/pointerevents3/) | Raw/coalesced/predicted events are distinct; predicted data is speculative. | Record actual event origin; prediction stays outside journal. | GPU completion is not compositor presentation or photon measurement. |

## Design alternatives evaluated before coding

| Option | Latency/large brushes | Visual consistency | Compatibility/cost | Decision |
|---|---|---|---|---|
| Replace accepted renderer with universal ordered stamps | Small stamps possible; wide ink repeats unnecessary fill and may accumulate work | Exact ordered semantics | Reintroduces performance risk; all backends need changes | Reject |
| Keep legacy variable-opacity MAX preview | Fast | Can change opacity/color at confirmation | Smallest code change | Reject for new Foundation presets |
| Keep capsule path for solid ink, instanced premultiplied density for material stamps | Preserves accepted scheduler and wide solid optimizations | Same coverage/material equations in live and confirmed paths | Small targeted shader change, WebGL2/WebGPU | Adopt |
| Lower-resolution or simplified grain live preview | Less work | Visible texture/edge transition possible | Easy to implement | Reject for reference brushes |

The adopted stamp model is an explicit new material model, not a silent reinterpretation of the original 56 presets. Old preset and record versions retain old behavior. Watercolor/pigment simulation is a separate future renderer provider; no stub setting is advertised as an implemented simulation.

## Continuation review — 2026-10-03

The primary documentation above was read again before the performance change: Krita [opacity/flow](https://docs.krita.org/en/reference_manual/brushes/brush_settings/opacity_and_flow.html), [Instant Preview](https://docs.krita.org/en/reference_manual/instant_preview.html), Procreate [Brush Studio 5.4](https://help.procreate.com/procreate/handbook/5.4/brushes/brush-studio-settings), and CSP [Correction](https://help.clip-studio.com/en-us/manual_en/810_subtools/C.htm). Krita separates whole-stroke opacity from dab flow and documents visible finish changes for some low-resolution preview settings. CSP documents reducing stabilization at high speed and separately documents post-release taper extension. Procreate separates positional/pressure smoothing and global/per-brush settings.

Decision: keep the existing shared pressure/dynamics/settings and full-resolution material path. No proprietary scheduling formula is inferred. The continuation optimization is derived from Illustro's own measured submission work and its existing MAX-coverage algebra: a single solid Foundation overlay, like a sweep overlay, can use the existing direct compositor when its tile has no active formal source or archive. The same new-Foundation union contract can consume the newest notification at WebGPU completion and defer its formal deposits until lift; original commands remain retained. This is a backend optimization, not a special hard-eraser brush implementation. WebGL2 and all 56 compatibility presets retain their existing scheduling.

Further continuation measurement found a duplicated unchanged-work notification: with prediction disabled, each Foundation `accept` already publishes the new real tip, but `frame` published it again before the generator's next RAF input batch. This can occupy the only GPU slot with an unchanged older tip. Decision: real-input-driven notifications for Foundation with prediction disabled, and one coalesced WebGPU idle/completion request. Prediction-enabled time updates and legacy publication remain unchanged. This follows the documented actual/predicted-input distinction; it does not claim any closed-source application's internal method.

Paired testing after implementation exposed a WebGL2 repetition regression, so input-driven RAF suppression is limited to WebGPU and the accepted WebGL2 publication cadence is preserved. Both original and candidate local software-GPU runs can vary; the recorded failed limits remain failures. This conservative backend boundary follows measured evidence, without claiming the new cadence alone explains all variance.


## Issue-specific primary-source review — 2026-10-04

This review was completed before changing the three user-reported brush-quality problems. Closed-source internals are not inferred.

| Problem | CLIP STUDIO PAINT | ibisPaint | Procreate | Krita | Illustro decision |
|---|---|---|---|---|---|
| G-pen start/end | Brush Size dynamics are separate from Starting/Ending; Starting/Ending can change brush size/density to a minimum value. | Brush Fade exposes start/end thickness and opacity plus Force Fade Out; Stabilizer Force Fade is a separate system. | Pressure Size is separate from Pressure Taper; taper exposes Size, Pressure and Tip controls. | Size can be pressure/sensor driven; Distance/Time/Fade sensors are separate controls. | Keep live pressure dynamics separate from brush fade, and model Stabilizer Force Fade as a post-stroke operation using final stroke length. |
| Wide-line tip / round marks | Stroke interval is explicit; tighter intervals are smoother but heavier. | “Max Spacing for 30 px Thick” explicitly reduces visible brush-pattern artifacts on line brushes such as Dip Pen. | Stroke Path spacing controls whether individual Shape stamps are visible or merge into a fluid stroke. | Pixel Brush is dab based; spacing plus Smooth Lines/Auto Spacing are exposed for inking quality. | Do not solve by spacing alone. Continuous ink keeps its accepted path renderer and additionally limits diameter change per travelled pixel so a single large sample cannot appear as an isolated round lobe. |
| Pencil density | Texture and brush density are distinct from opacity/size dynamics. | Pattern/opacity/dynamics are distinct controls. | Pencil library explicitly uses unique paper textures; Apple Pencil pressure can control Size, Opacity and Flow, and Grain is a separate brush component. | Opacity is whole-stroke transparency while Flow is per-dab transparency; Texture is separate and build-up behavior is explicit. | Remove pressure→whole-stroke opacity from the reference pencil. Use pressure→deposit flow plus stronger low-pressure grain modulation so weak pressure is visibly particulate rather than only transparent gray. |

Primary sources:
- CSP: https://help.clip-studio.com/en-us/manual_en/240_brushes/Customizing_brush_tools.htm and https://help.clip-studio.com/en-us/manual_en/810_subtools/S.htm
- ibisPaint: https://ibispaint.com/lecture/index.jsp?lang=en&no=118
- Procreate: https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings and https://help.procreate.com/procreate/handbook/brushes/brush-library
- Krita: https://docs.krita.org/en/reference_manual/brushes/brush_engines/pixel_brush_engine.html, https://docs.krita.org/en/reference_manual/brushes/brush_settings/brush_tips.html and https://docs.krita.org/en/reference_manual/brushes/brush_settings/opacity_and_flow.html

### Why this implementation

The existing continuous G-pen command already interpolates radius between input positions, but a sudden diameter jump can still expose a large round endpoint around a sample. Illustro therefore adds a general preset parameter, `pressure.sizeSlope`, which caps diameter change by travelled distance. The G-pen value is below the geometric threshold where radius can grow faster than path length, while other brushes remain unchanged by the default value `0`.

The previous 64 ms release-tail interpretation was rejected after deeper ibisPaint research. ibisPaint documents brush Fade (start/end thickness/opacity and brush-side Force Fade Out) separately from Stabilizer Force Fade. The latter has start/end length controls and current versions allow it to be stored per brush. Therefore Illustro keeps pressure and brush fade live, but applies Force Fade only after stroke length is known; it may intentionally rewrite a broad part of a stroke on pointer-up. Exact ibis interpolation math is not public and is not claimed.

The reference pencil keeps continuous sweep rendering for the accepted large-brush performance path. Its low-pressure appearance now combines lower deposit flow with stronger deterministic grain. This is intentionally not described as a copy of any proprietary pencil algorithm.


## ibisPaint forced in/out deep review — 2026-10-04

Only public ibisPaint documentation and release notes are treated as authority here. No private interpolation formula is inferred.

- Brush parameters and Stabilizer Force Fade are separate systems. The brush Fade tab exposes start/end thickness and opacity and a brush-side Force Fade Out. The Dynamic tab independently maps speed/pressure to thickness, opacity and blur. Source: https://ibispaint.com/lecture/index.jsp?lang=ja&no=118
- ibisPaint explicitly supports a line-brush option that caps spacing at the value for 30 px thickness to reduce visible brush-pattern units at 30 px and above. This is a spacing rule, not evidence that G-pen maximum selectable thickness is 30 px. Illustro's 30 px G-pen UI maximum is a project choice.
- ibisPaint 6.0.0 raised start/end thickness and opacity upper limits to 200%, allowing endpoint ink-pooling/thickening. Source: https://ibispaint.com/historyAndRights.jsp?lang=ja&newsID=9733003
- ibisPaint release notes document a touch-up bug where, with pre-correction and brush Force Fade Out, most of a stroke could incorrectly become the start thickness. The bug is not copied, but it confirms endpoint finalization can interact with a broad portion of the stroke. Source: https://ibispaint.com/historyAndRights.jsp?lang=ja&newsID=13065392
- ibisPaint 14.1.0 (2026-09-07) added per-brush Stabilizer and Force Fade customization, Constant/Fast Strokes real-time stabilization modes, improved tracking/fade-length consistency, and Fade Start Time / Fade End Time parameters. Source: https://ibispaint.com/historyAndRights.jsp?newsID=303340270
- The exact internal curve, time/distance normalization, prediction filter and rendering schedule are not public. Illustro therefore adopts the documented behavioral contract, not a claimed code-level replica.

Illustro representation:
- `taper`: brush-intrinsic endpoint behavior. Thickness ratios may be 0–200%.
- `forceFade`: separate per-brush/common finalization setting. `start` and `end` are 0–100% fractions of final stroke length and are applied after pointer-up.
- pressure/velocity dynamics remain live and independent.
- G-pen defaults (`start=12%`, `end=40%`) are Illustro defaults, not published ibis defaults.
