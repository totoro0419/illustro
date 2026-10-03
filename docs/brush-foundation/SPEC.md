# Preset, dynamics and stroke formats

Preset: `{format:"illustro-brush-preset", version:2, engine:"illustro-foundation-1", ...}`. `createPreset` supplies a complete validated default. `exportPresets`/`importPresets` use version-1 `illustro-brush-pack` with embedded resources; reject unknown major versions, duplicate IDs, missing resources, invalid ranges and unsupported fields.

| Group | Implemented fields / semantics |
|---|---|
| identity | id/name/category/purpose; brush kind and renderer provider ID; extensions namespace |
| material | size, stroke opacity, deposit flow, RGB color, normal/erase/multiply/screen; saturated or build-up; continuous single-color coverage union via sweep renderer |
| tip | round/ellipse/rect/mask/bristle/star/leaf, resource reference, hardness/aspect; fixed + line + optional azimuth + optional twist rotation |
| spacing | relative diameter or absolute px; minimum/maximum px; optional time exposure |
| pressure | device curve, brush curve, independent smoothing, unsupported-device fallback |
| stabilization | brush/common scope, constant, fast, increase/reduce speed mode; post amount reserved for explicit geometry edit |
| prediction | enabled, auto/browser/linear, horizon ms, maximum px, turn cosine |
| dynamics | ordered source/target/min/max/curve/multiply-add-replace; physical input range and explicit repeat; optional sensor fallback |
| limits | size/opacity/flow output intervals |
| taper | size/opacity/flow/grain; start/end mode, distance/time, length, minimum and curve. start ramp; end pressure/forward fade/known endpoint |
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
