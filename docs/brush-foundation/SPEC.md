# Preset, dynamics and stroke formats

Preset: `{format:"illustro-brush-preset", version:2, engine:"illustro-foundation-1", ...}`. `createPreset` supplies a complete validated default. `exportPresets`/`importPresets` use version-1 `illustro-brush-pack` with embedded resources; reject unknown major versions, duplicate IDs, missing resources, invalid ranges and unsupported fields.

| Group | Implemented fields / semantics |
|---|---|
| identity | id/name/category/purpose; brush kind and renderer provider ID; extensions namespace |
| material | size, stroke opacity, deposit flow, RGB color, normal/erase/multiply/screen; saturated or build-up; continuous single-color coverage union via sweep renderer |
| tip | round/ellipse/rect/mask/bristle/star/leaf, resource reference, hardness/aspect; fixed + line + optional azimuth + optional twist rotation |
| spacing | relative diameter or absolute px; minimum/maximum px; optional time exposure |
| pressure | device curve, brush curve, independent smoothing, unsupported-device fallback; optional sizeSlope limits diameter change per travelled pixel for continuous ink |
| stabilization | brush/common scope, constant, fast, increase/reduce speed mode; post amount reserved for explicit geometry edit |
| prediction | enabled, auto/browser/linear, horizon ms, maximum px, turn cosine |
| dynamics | ordered source/target/min/max/curve/multiply-add-replace; physical input range and explicit repeat; optional sensor fallback |
| limits | size/opacity/flow output intervals |
| taper | size/opacity/flow/grain; start/end mode, distance/time, length, minimum and curve. start ramp; end pressure/forward fade/known endpoint; size-only release tail for bounded freehand ending |
| texture | independent tip/paper/stroke slots; paper/hatch/noise/image, resource, strength/floor, absolute/relative scale, paper/tip space, angle, direction, invert, image AA |
| scatter | disk radius, absolute/relative radius and particle size, particles per spacing location 1–64, center/outer bias, tip/line/center rotation |
| random | reproducible per-deposit changes to position, size, opacity, flow, spacing, rotation, aspect, scatter, density, grain, hue/saturation/value |
| resources | mask/texture kind, dimensions, normalized alpha; GPU resource quantization is fixed to 8-bit at compile time |

Mapping sources: pressure, velocity in px/s, tilt 0..1, azimuth/twist/direction radians, accumulated distance px, elapsed ms, Philox random. Default ranges are 0..1, velocity 0..1500, angle 0..2π, distance 0..500, time 0..1000; explicit `input:[min,max]` overrides. Inputs clamp unless `repeat:true`. Curve control-point x/y are normalized 0..1. The ordered result replaces/adds/multiplies the current target. Missing pressure uses the device/brush fallback; optional rotation inputs have no effect when unavailable.

Randomness is counter based (`philox4x32-10`), indexed by saved two-u32 seed, deposit and fixed stream. It does not depend on worker/GPU/display timing. Particle count consumes deterministic consecutive indices. Mappings and pressure output apply before spacing selection. Thickness changes retain the previous continuous endpoint radius.

New stroke record: version 3, Foundation engine ID, immutable source preset, resolved context, compiled renderer preset, seed, fast correction, actual raw samples, optional release lifecycle sample, derived geometry and exact canonical commands. Replay regenerates and verifies geometry, material and commands; prediction is never accepted into this record. Version 2 engine 2.4/2.5 records and version-1 original presets remain loadable with their original semantics. Documents retain `illustro-rt-document-2`; each stroke carries its own independently checked version, allowing mixed legacy/Foundation undo/redo/save/load.

Reference presets are exported to `reference-brushes.json`, generated from the same module used in the interactive page. No G-pen-specific branch exists in stroke generation.

Current builtin limitations are explicit: one active texture layer, mono material, 8-bit final layer storage, no color-stamp/pigment/mixing simulation, no automatic hardware capability inference for optional sensors. Those are extension/resource/backend contracts, not completed effects.

`renderer:"sweep"` requires round, aspect-one, saturated, single-color settings without scatter/random color. They use a coverage-union field (local flow × mapped opacity, stroke opacity at composition), not ordered additive paint. For build-up/particles/image/color variation use `stamp`. Swept pencil and soft eraser always reach the latest contact; spacing is retained as a future deposit setting but does not punctuate continuous coverage. Raw/stabilized samples are exact; render geometry has at most 0.05px reduction error before freezing, with a 64-point bound.

Save compatibility: the original `soft` renderer keeps its ordered stamp semantics. Continuous soft/pencil fields use the newly added `sweep` ID, so existing version-3 presets/strokes are not reinterpreted. The archived seven-brush fixture comes from source b18e2b0 and must regenerate exactly.


Brush fade and forced in/out are separate contracts.

- Brush fade lives in `taper`. It can affect size/opacity/flow/grain during ordinary stroke generation. For size and opacity, endpoint ratios may extend to 200% so an endpoint may be thinner or thicker than the base value. The legacy `end.mode:"release"` remains readable for old presets and can coexist with the new force-fade finalizer.
- Stabilizer-style forced in/out lives in `forceFade`. `start` and `end` are fractions of the final stroke length from 0 to 1. It is evaluated only after pointer-up, because the final stroke length is then known. A 100% ending is allowed to alter a broad portion of the visible stroke; that change at pointer-up is intentional.
- Live pressure/speed dynamics remain live while drawing and are not replaced by forced in/out.
- A single-point tap is never rewritten by forced in/out. Very short marks keep a non-zero minimum so they remain visible.
- Legacy records that do not contain `forceFade` keep their exact prior preset shape and replay semantics; compilation must not inject a default field into them.
- The G-pen reference uses Illustro defaults of 12% forced-in and 40% forced-out. These are project defaults, not asserted ibisPaint defaults.

## Brush-specific thickness range

Each Foundation preset may own `uiSizeRange = [minPx, maxPx]`. This range controls the thickness slider, direct numeric entry, quick-size buttons, and base brush size selection only. It must not clamp the pressure/taper result after dynamics are evaluated. `limits.size` remains a renderer/dynamics safety range. `uiSizeRange` is UI metadata and must not be stored in `extensions`, because `extensions` is reserved for renderer-provider features.

Reference UI defaults: G pen 0.75–30 px; Round pen 0.3–60 px; Technical pen 0.3–60 px; Marker 1–500 px; Pencil 0.3–120 px; Hard/Soft Eraser 1–1000 px.

### Range source note

The engine-wide maximum is not the same thing as a sensible per-brush UI range. ibisPaint documents per-brush Min Thickness / Max Thickness controls. Its official history records Dip Pen minimum thickness being reduced to 0.3 px, and Dip Pen (Soft) plus Pencil #1/#2 maximum thickness being set to 120 px. Current exact default limits for every ibis built-in preset are not published in the official manual, so Illustro does not claim to copy them. Illustro uses those verified values as anchors, then chooses narrower line-art defaults by intended use. Global renderer capability remains separate from these UI defaults.

### 30 px spacing cap reference

ibisPaint documents a separate line-brush option that caps spacing behavior at the value used for 30 px thickness, specifically to reduce visible brush-pattern repetition on line brushes such as Dip Pen when drawing at 30 px or thicker. This is not the same as a documented global maximum brush thickness. Illustro's continuous G-pen geometry does not depend on repeated round stamps, but the same design principle applies: increasing nominal thickness must not reveal circular brush units.
