# M10 legacy display deletion — independent audit (2026-10-23)

**Judgment: PARTIAL ONLY / NOT COMPLETE / NOT READY TO BUILD THE NEW CANVAS DIRECTLY ON THIS CLAIM.**

Baseline: PR #42 commit `73f9465b022cb29b1e3f9462b3d51aca3756ba6d`.
Audited implementation: PR #46 commit `768aa431933a3a6caef01064fbd26cf0101218b6`.
The successful CI at https://github.com/totoro0419/illustro/actions/runs/39973892532 validates repository assertions, source lock, builds and existing regressions **plus a real Chromium data-path smoke**: in both WebGL2 and WebGPU at 512×512, one G-pen stroke modified 18,956 RGBA channel values, Undo reproduced the initial buffer byte-for-byte, Redo reproduced the committed buffer byte-for-byte, and no browser page errors were recorded. This is software Chrome, not physical Android. **It does not validate visible canvas presentation, genuine two-finger navigation while formal drawing is pending, save/reopen, 4000px behavior, or Android GPU contention.**

## Verified deletion

- `packages/brush-rt/src/document-presentation.mjs`, `presentation.worker.mjs`, and `presentation-tiles.mjs` are absent.
- `drawing-host.mjs`: the old DOM canvas/ImageBitmap transport and picture acknowledgement were removed.
- `drawing.worker.mjs`: `publish`, `requestPublish`, `coherent`, `settlePictures`, `pictureAck` and display-image transport were removed.
- `worker-stroke-sink.mjs`: ImageBitmap snapshot/publication and notification were removed, but the CPU preview raster calculation remains.
- Brush Foundation, strict shaders, `CanvasView`, formal GPU renderer, tile-history code, persistence and brush settings are retained in this branch.

## Remaining code requiring explicit treatment before a new architecture

1. **Legacy presentation control remains in the shared renderer (HIGH).**
   `packages/brush-rt/src/renderer.mjs` still includes `presentView`, `reprojectView`, `recordPresentation`, `viewPending` handling in `frame`, and presentation-dependent `presentedStrokes` / `onContentReady` callbacks. The formal GPU renderer was deliberately left unchanged to protect quality/history and its existing source lock. In this deletion branch, `drawing.worker.mjs` overrides backend `presentView` / `presentCurrent` to do no visible presentation, **but that does not delete the old renderer control flow**. Do not assume the old scheme has been fully eliminated.

2. **Preview destruction is still coupled to formal completion (HIGH).**
   In `renderer.mjs` the formal-completion path calls `this.proxy?.presented(id,...)`. In `stroke-overlay.mjs`, `presented` calls `removeState`, and `removeState` calls `this.sink?.retireStroke?.(id)`. In `worker-stroke-sink.mjs`, `retireStroke` destroys the retained raster surface. There is no new displayed-image-accepted acknowledgment. The newly designed display cannot safely inherit this retirement contract as-is; decide ownership and lifetime *before* reconnecting any presentation. Do not simply disable cleanup without a bounded-memory design.

3. **Editor input still uses the drawing-only pointer route (HIGH for new functionality, expected in deletion phase).**
   `apps/editor/src/brushSurface.ts` discards a second touch when `this.pointer!==null`. The local view calculation `CanvasView` is preserved, but a new independent pan/zoom/rotate input-to-display path **does not yet exist**. Removing the existing handler without replacement during this deletion-only phase would harm canonical stroke input; isolate it in the next design.

4. **Other old visualization code remains (MEDIUM).**
   `packages/brush-rt/src/stroke-overlay.mjs` still contains DOM `StrokeSink` and presentation guard logic; `renderer.mjs` still imports `PresentationPyramid` / `ViewportCache` from `minification.mjs`. Distinguish dead legacy UI code from calculations needed by brush/standalone runtime before deleting any of it. These are **not evidence of a currently displayed canvas** in this branch.

5. **The zero-added-stall goal remains UNPROVEN.**
   The background formal renderer still uses WebGL2/WebGPU. New compositor and formal drawing may contend for GPU/CPU/browser composition resources. No low-end-device acceptance or matched idle/loaded screen-motion evidence exists for the future architecture. Passing Node tests cannot establish this.

## Pass/fail conclusion

- Legacy *transport* removal: **PASS** (source presence/absence).
- Full legacy *presentation lifecycle* removal: **FAIL / INCOMPLETE** (items 1–2).
- Existing source regression/build: **PASS** for tested commands.
- Operational live canvas: **NOT IMPLEMENTED** by design.
- Actual browser formal-raster and Undo/Redo pixel equivalence: **PASS** at 512×512, one G-pen stroke, WebGL2 and WebGPU, software Chrome. No claims beyond this test's coverage.
- Exact .illustro save/reopen behavior and 4000px high-load browser work: **NOT VERIFIED** by this CI run.
- User's zero-added-wait requirement: **NOT VERIFIED**.

Keep PR #46 **Draft, unmerged, and un-deployed**. Additional removal must be done without replacing systems or changing canonical brush, formal pixels, history, save, or canvas geometry. Once removal scope is truly clean, separately prototype and measure a new display route under genuine GPU/CPU load before integration.
