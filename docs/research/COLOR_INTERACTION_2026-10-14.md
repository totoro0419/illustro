# Color interaction repair — 2026-10-14

The user confirmed that the canvas replay defect was resolved in 719dbe4, then reported earlier hue-wheel problems returning. Inspection found that the M09 color source/CSS and all its prior corrective commits were still present; no color-source rollback from M09 e04d3e2 to the performance branch occurred. That does not prove correct interaction. The earlier Orbit smoke sampled the average ellipse and four interior SV points, leaving the painted band's edges and overlapping SV boundary untested.

## Observed defect and repair

In the actual published UI, opaque pixels at both horizontal outer ends returned `colorOrbitPicker`, rather than a hue target. A drag starting at the visible right edge left red and hue 0 unchanged. Fully visible SV points above the upper colored arc returned `colorOrbitTopArc`. The rendered band used outer ellipse 146×51 and inner ellipse 97×31, while its hit targets used 40/44-wide strokes around a separate 121.5×41 ellipse. A constant stroke cannot match the varying thickness between those ellipses. It also missed the painted front depth.

The SVG hit geometry uses filled annular half-paths derived from the same ellipse as the Canvas2D renderer; the front path includes the 13px near-side depth. Only the filled paths receive pointer events; blank margins still permit workspace scrolling. Both SVG overlays use `touch-action:none` on painted targets, while blank space retains `pan-y`.

**2026-10-14 structural 3D correction (do not regress):** Merely moving the SV diamond under one whole-wheel canvas is wrong: it hides the diamond tip behind the far rim and cannot express real 3D front/back layering. The rendering MUST be `back wheel (z=0) < back upper-ring touch path (z=1) < SV diamond (z=2) < copied near wheel (z=3) < near-ring touch path (z=4)`. Paint the full wheel once, and copy only its nearer half into the transparent foreground canvas. Both canvases MUST remain transparent and noninteractive; the SVG paths are the only painted hue targets. An upper rim portion covered by the visible diamond belongs to SV, while an exposed upper rim is hue; the near rim always owns its visible colored pixels. Once a hue gesture begins, pointer capture retains hue ownership even as the finger crosses the diamond.

The SV stays a true rotated square, here `width:46.5%`, `left:26.75%`, `top:28.5%`: visibly large, seated through the back rim and tucked slightly behind the near rim. These are layout values for this specific 306px control, not universal tokens. Keep Classic and Orbit modes, shared foreground state, numerical input and keyboard controls intact.

References: [SVG pointer-events](https://www.w3.org/TR/SVG/interact.html#PointerEventsProperty), [Pointer Events recommendation](https://www.w3.org/TR/pointerevents3/#the-touch-action-css-property). These explain filled geometry hit testing and ancestor touch-action negotiation; browser behavior is tested, not inferred from a specification alone.

## UI Implementation Quality applicability

- `MOTOR.01`: observable colored targets must receive coarse/fine input. The dead visible band is a task defect.
- `PATTERN.SLIDER`, `RANGE.01`, `KEY.01`, `FOCUS.01`: hue stays a bounded color value with existing keyboard stepping, readable values and HSB/HEX numeric alternatives. No new control or platform pattern is introduced.
- `STATE.01`: capture keeps the selected hue/SV operation until release; cancellation restores the previous color, mode changes preserve the shared color.
- `DATA.01`: color interaction must not change artwork revisions or discard completed strokes; existing M09 drawing/save checks and actual canvas gesture cancellation are rerun.
- Task reachability and truthful feedback: Classic, Orbit, palette and precise values remain reachable. Automated emulation is not physical Android acceptance.

## Verification and publication scope

Browser coverage samples 123 positions across the wheel, including inner/outer edges and near-side depth. Hit expectations follow the **visible stack**, excluding far-rim paint covered by SV and checking the exposed SV on top of it. Test at 390/600/900/1440 CSS-pixel widths and DPR1/2/3, plus an immutable old-source reproduction. The integrated Orbit test MUST prove z-order, the SV lower tip tucked behind the near rim, and that the upper SV-covered ring has SV ownership but exposed rear arcs do not. It traces a complete ellipse and crosses the diamond and the near rim without changing the held tool, tests beginning on the near rim as a circular gesture separately from its straight horizontal slide, and checks hue wrap and reversal. Trusted Chromium touch tests a full circular trace, cancellation and real blank-space scrolling. Existing M09, both GPU backends, and actual canvas gesture cancellation remain mandatory. Sample trusted CDP moves only after the page has processed them (frame synchronization): a CDP send acknowledgment alone is not an event-delivery barrier.

This is a color-only source change. The focused workflow rejects any change to Brush RT, canonical brush geometry, Core, main input wiring, BrushSurface or persistence relative to the user-confirmed 719dbe4. Source checks, typechecks and regression tests still run. Previous GPU/FPS/latency evidence retains its measured source through `measurementSourceCommit`; no old measurements are relabeled as new. The prior long WebGPU pencil latency failure remains visible. QA stays experimental, old QA m01–m09 stays unchanged, and publication checks the current branch head before replacing only qa/perf-canvas. Physical Android and assistive touch behavior remain unverified.

On code commit `a1baf11adf3414f37115e3ded2d362e795bae81f`, the color-focused GitHub Actions run `38566064786` finished verify/publish successfully, including the above browser cases and canvas cancellation. The published `qa-status.json` and screen captures retain `EXPERIMENTAL_NOT_ACCEPTED`: automated checks and screenshots do not substitute for the user's physical Android acceptance. Any later change must repeat these checks and verify the deployed JS/CSS build SHA and the immutable older QA pages.
