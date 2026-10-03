# Foundation architecture and invariants

The accepted 2.5 renderer, 128px sparse tiles, capacity-one latest mailbox, append-only published geometry, one GPU submission in flight, bounded confirmed quantum, instanced stamps and optimized continuous capsules remain in place. This change adds settings and material semantics; it does not replace the scheduling architecture.

`captureInput` identifies actual raw/coalesced input. `CanonicalBuilder` retains actual samples independently of stabilized geometry and derived commands. Geometry exposes velocity (px/s), direction (radians), distance (px), elapsed time (ms), pointer type and input origin. Release is a lifecycle sample, saved separately when supplied; it never deposits paint at an off-surface coordinate.

Device pressure curve → brush pressure curve → independent short pressure smoother → stabilized geometry → common ordered mappings → causal phase envelopes → deterministic dab/continuous segment generation. The current-time regression is bounded and has no constant-velocity phase lag. Constant and fast correction are independent; the fast mode may increase or reduce correction. Common settings are resolved into the stroke at begin, so later UI changes cannot alter replay.

Live publication retains every necessary shape; only obsolete display notifications are replaced. Predicted commands belong exclusively to the replaceable tail. Browser prediction passes the same direction/deceleration/release/idle gate as linear prediction. The conservative default is OFF, 6ms horizon and 0.75px maximum extension. End-of-stroke never invents a future endpoint. The formal worker uses identical canonical generation; it may lag without blocking live publication.

Continuous round hard size-only materials retain the accepted capsule/MAX/depth/band path. Stamp materials use ordered source-over premultiplied density: `k = coverage * flow * mappedOpacity; S = S*(1-k) + (color,1)*k`. Saturated paint applies the preset's stroke opacity once when compositing; build-up paint applies preset opacity per deposit. Normal/multiply/screen/erase use the same layer compositor. Variable opacity/color now has the same algebra in live and confirmed Foundation materials. The original 56 version-1 presets keep their old cap model; no silent migration.

Round single-color `sweep` materials use a continuous soft capsule field with MAX coverage, multiplied by stroke opacity once; flow controls local deposited coverage. This is an explicit coverage-union model, not additive airbrush paint. Colored/build-up/image materials retain ordered stamps. Pencil grain is evaluated immediately along the swept field. The current mutable capsule ends at the latest real contact. An online reducer merges only constant-radius/opacity/flow/grain/color sections with paper-fixed texture, at most 64 actual points and maximum 0.05px spatial deviation; raw input and stabilized geometry retain every point. The last capsule is displayed as a replaceable tail and is frozen unchanged at finish. There is no stamp-center wait or deferred gap filling.

No pointerup-only taper. Start distance/time ramp, pressure ending and forward distance/time fade are causal. Known-end fade requires known geometry length/duration at stroke begin. A tap cannot be given an arbitrary future taper without changing its earlier appearance: unsupported freehand known-end requests fail explicitly. Post correction is an explicit bounded geometry edit, not automatic finalization.

Texture tip/paper/stroke slots are separate in the format. The builtin material currently evaluates one active texture layer; simultaneous layers require a material provider. Sampling supports procedural paper/noise/hatch and embedded image resources, absolute/diameter-relative scale, paper/tip coordinates, rotation/direction, strength floor, inversion, optional image bilinear sampling. Live and final use the same sampling functions; no texture suddenly appears on confirmation.

## Integration boundaries

- `RealtimeSession.begin(preset, fast?, context?)`, `accept(actual)`, `predictions(displayOnly)`, `end(release?)`, `geometry(preset, actualGeometrySamples)`.
- `compilePreset` validates/version-resolves settings before live input starts. A custom material requires an explicitly registered provider; unknown simulation flags never silently fall back to ink.
- `RendererRegistry` is a compile dispatch boundary. Builtin-compatible providers return the compiled Foundation material contract. A future wet/pigment renderer also supplies a backend implementing the existing `render(snapshot,jobs,states)`, `poll`, `read`, `readViewport`, `retirePreview`, `clear`, `destroy` contract to `GpuRenderer` and a canonical worker module. Preset extension namespaces/resources and canonical commands remain independent from that backend. Watercolor is not implemented by this change.
- `geometryContext` supplies known length/duration for shape/ruler samples. Ruler generation itself is outside this package.
- `cursorState` returns size/shape/resource/rotation/color/opacity/barrel angle without advancing stroke randomness. UI owns cursor drawing.
- `PresetState` owns immutable saved settings, per-brush or shared temporary values and explicit commit. Brush switching policies are restore/per-brush/shared.
- External images are imported as embedded mask/texture resources referenced by preset IDs. No external URL fetch occurs while drawing; custom pattern UI and sharing transport remain future work.

## AA and resource budget

Reference ink uses the accepted one-pixel analytic coverage. Other shapes retain four-sample coverage; hard ellipses/stars retain analytic edge handling. Image grain can use bilinear sampling. Extra MSAA targets and live/final quality switches were rejected for this increment because they add work/memory and can reveal transitions. Large soft/material brushes remain fill-rate-sensitive and must pass separate proxy and human tests; GPU use alone proves nothing. Multiple simultaneous textures, extreme particle density and custom simulation need separate validation.
