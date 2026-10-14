# Color interaction repair — 2026-10-14

The user confirmed that the canvas replay defect was resolved in 719dbe4, then reported earlier hue-wheel problems returning. Inspection found that the M09 color source/CSS and all its prior corrective commits were still present; no color-source rollback from M09 e04d3e2 to the performance branch occurred. That does not prove correct interaction. The earlier Orbit smoke sampled the average ellipse and four interior SV points, leaving the painted band's edges and overlapping SV boundary untested.

## Observed defect and repair

In the actual published UI, opaque pixels at both horizontal outer ends returned `colorOrbitPicker`, rather than a hue target. A drag starting at the visible right edge left red and hue 0 unchanged. Fully visible SV points above the upper colored arc returned `colorOrbitTopArc`. The rendered band used outer ellipse 146×51 and inner ellipse 97×31, while its hit targets used 40/44-wide strokes around a separate 121.5×41 ellipse. A constant stroke cannot match the varying thickness between those ellipses. It also missed the painted front depth.

The existing SVG overlay now uses filled annular half-paths generated from the same geometry imported by the Canvas2D renderer. The front path includes the existing 13px visible side face. Transparency, the large genuine square rotated into the SV diamond, the compact Classic/Orbit selector, upper clockwise arc tracing, lower horizontal slide, initial pointer ownership and keyboard/numeric alternatives are retained. Only the filled paths receive pointer events; blank SVG space still falls through to SV or the scrollable parent. `touch-action:none` is also set on the replaced SVG container, so hue manipulation does not depend solely on CSS applied to a graphics path. Since blank space does not hit an SVG descendant, it retains the parent scroll action.

References: [SVG pointer-events](https://www.w3.org/TR/SVG/interact.html#PointerEventsProperty), [Pointer Events recommendation](https://www.w3.org/TR/pointerevents3/#the-touch-action-css-property). These explain filled geometry hit testing and ancestor touch-action negotiation; browser behavior is tested, not inferred from a specification alone.

## UI Implementation Quality applicability

- `MOTOR.01`: observable colored targets must receive coarse/fine input. The dead visible band is a task defect.
- `PATTERN.SLIDER`, `RANGE.01`, `KEY.01`, `FOCUS.01`: hue stays a bounded color value with existing keyboard stepping, readable values and HSB/HEX numeric alternatives. No new control or platform pattern is introduced.
- `STATE.01`: capture keeps the selected hue/SV operation until release; cancellation restores the previous color, mode changes preserve the shared color.
- `DATA.01`: color interaction must not change artwork revisions or discard completed strokes; existing M09 drawing/save checks and actual canvas gesture cancellation are rerun.
- Task reachability and truthful feedback: Classic, Orbit, palette and precise values remain reachable. Automated emulation is not physical Android acceptance.

## Verification and publication scope

New browser coverage samples 123 locations across the actual painted wheel, including inner/outer edges and front depth, and checks transparent wheel pixels over dense visible SV samples. It reproduces the ignored outer-edge drag on immutable 719dbe4, then checks the repair at 390/600/900/1440 CSS-pixel widths and DPR1/2/3. Trusted Chromium touch checks continuous clockwise tracing, front slide, capture across SV, cancellation and actual blank-space scrolling after an intermediate viewport resize. Existing integrated Orbit/M09 behavior and six canvas-cancellation cases on both GPU backends are required.

This is a color-only source change. The focused workflow rejects any change to Brush RT, canonical brush geometry, Core, main input wiring, BrushSurface or persistence relative to the user-confirmed 719dbe4. Source checks, typechecks and regression tests still run. Previous GPU/FPS/latency evidence retains its measured source through `measurementSourceCommit`; no old measurements are relabeled as new. The prior long WebGPU pencil latency failure remains visible. QA stays experimental, old QA m01–m09 stays unchanged, and publication checks the current branch head before replacing only qa/perf-canvas. Physical Android and assistive touch behavior remain unverified.

At the implementation stage, Editor/geometry 74 tests and typecheck pass. Browser checks and final public source equality are pending the candidate CI; final results belong in the public color-interaction reports and PR25.
