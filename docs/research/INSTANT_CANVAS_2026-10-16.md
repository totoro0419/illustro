# Screen-area instant canvas — 2026-10-16

Status: EXPERIMENTAL / user acceptance and physical Android performance unverified.

## Authority and handoff

The implementation inherits PR29 `aac68dc3afdd018ebed48d77af8fa160bb2cd05e`, including PR25–28 and the additional Orbit/color-wheel fixes. The integration branch remains `8c698c973c26ceb3528b35cb2fdbb01b69043f6a`. Neither that branch, main, nor any accepted QA page is replaced. The working branch is `perf/instant-canvas-2026-10-16`, PR30.

`IMPLEMENTATION_BASELINE`, `CANONICAL_INDEX`, `IMPLEMENTATION_CHECKLIST`, Architecture V2 / Raster / Identity-History / Persistence-Recovery, `BRUSH_RENDER_CONTRACT_V2`, Foundation `ADOPTION_BASELINE`, and the preceding canvas/handoff/4000px/formal-resource research govern this work. The user's `ILLUSTRO_INSTANT_CANVAS_DESIGN_V1.md` was read from its current stored contents. Proxy pixels remain disposable derived display data.

## Observed bottleneck

`GpuRenderer.setLive` previously reached the same `requestWork` / `frame` / `inflight` gate as formal work. Sparse feedback still rasterized document-space 128px tiles at artwork resolution. A larger document fitted into the same phone screen traversed more of those tiles. Decoupling logical stroke admission had not removed this display wait.

The first C prototype separated feedback, but made formal jobs too small. It also let every intermediate formal coverage update trigger high-resolution scene composition behind an already complete opaque proxy patch. Its input-upload and update-cadence proxies improved while some formal catch-up times regressed. This was rejected as the final scheduling arrangement. C now suppresses intermediate formal feedback only for IDs covered by the independent display lane; all exact tile commits still invalidate the retained scene. Existing pixel work bounds remain, with bounded job counts adjusted using submission-to-completion observations, not alleged GPU execution time.

## Implemented separation

1. **Input/semantics:** the existing Session / CanonicalBuilder / Worker receives every actual sample. Original floating coordinates, pressure, tilt, twist, time, seeds, final commands and forced fade rules remain unchanged. Predicted geometry remains display-only.
2. **ScreenProxy:** an independent CPU rasterizer uses canonical commands and the existing reference shape/texture evaluators. A small Canvas2D receives only changed screen cells. This path does not await the strict GPU fence/Promise. It is still subject to main-thread scheduling and the browser compositor; Canvas2D is not claimed to own a separate physical GPU.
3. **Strict raster/presentation:** the original WebGPU/WebGL2 deposition, 128px strict tiles, exact GPU history snapshots, retained scene, PresentationPyramid and ViewportCache remain. Formal pixels alone feed artwork materialization, persistence and exports.

The proxy has no write API into Core, History, Recovery or Save. No changes are made to Foundation, model reconstruction/strict reference equations, strict shaders, canonical Worker algorithms, Core, or portable/recovery formats.

## Visible area and incremental work

The document quad is transformed in floating point, clipped against the actual CSS canvas viewport with polygon clipping, and measured by polygon area. Zoomed-out paper, rotated corners, flips, pan and offscreen regions are distinguished from the viewport and bounding rectangle. Transparent artwork inside the document remains drawable area. Known canvas clipping is honored; arbitrary overlapping floating UI is not inferred to be opaque.

`P = min(pixelCap, floor(visibleAreaCSS × areaRatio × densityAdjustment))`. Density adjustment is `min(2, max(1, effectiveDPR))`, not unconditional DPR squared. Integer backing allocation never exceeds the budget; the bounding rectangle only determines image shape. Total backing pixels, raster evaluations, changed/uploaded pixels, commands, bytes and pending strokes are recorded separately. The ratio is an **area** ratio.

The selected default is 1/64. Thin brushes (nominal screen diameter below 2 CSS px) use 1/8, plus analytic subpixel coverage in the disposable image. This does not quantize original coordinates or change final brush size. These thresholds are a tested initial profile, not a universal device optimum. Brush-size changes prewarm this profile when idle. A profile does not shrink midway through an outstanding stroke.

Stable command prefixes are append-only and are rasterized once. Mutable tails clear only their previous cells. Cells are 16 proxy pixels; a stroke allocates only touched cells. Completed records fold into per-surface screen caches in logical order. Final record reconstruction and view/history rebuilding yield after approximately 3ms between commands; one exceptionally large command can exceed that target. View changes debounce reconstruction, reproject the last complete proxy while rebuilding, and never reuse old screen coordinates as new authority. The existing strict feedback path is available while a new view cache warms.

The proxy pixel cap is 131072 and its modeled working-memory limit is 32MiB. Bytes are an allocation model, not RSS/VRAM. Browser-owned Canvas/compositor buffers and GC behavior are not measured by this counter. Pressure stops optional proxy work, retains its last complete display until strict feedback is ready, and preserves all accepted canonical input. The pre-existing canonical admission/resource limits remain.

## Layers, erase and transition

Per-surface caches use straight alpha. Each pending stroke retains its own stable/tail coverage and blend rule; chronological stroke composition precedes ordered layer composition. The proxy produces **opaque replacement patches of the completed appearance**, with paper behind transparency. It does not place a colored stroke indiscriminately above all layers. Erase multiplies selected-layer alpha; it never paints white into that layer. Lower paint stays under upper paint; upper erase reveals lower color. Proxy tests also exercise layer opacity and multiply/screen operations.

Each live/finalized entry has its existing stroke ID and surface ID. The proxy adds view epoch and presentation generation; the strict renderer retains submission IDs and per-stroke presentation fences. A finished local preview stays visible while the exact Worker record is processed in bounded tasks. Only a corresponding strict presentation retires its footprint. Overlap with newer pending strokes stays opaque and is recomposited from the latest base, preventing double paint or an old result overwriting a newer one. A view rebuild catches records accepted during its yielded tasks before publishing its base, even if their GPU feedback has already retired. Exact fallback/offscreen completion discards only obsolete display notifications. History invalidates/rebuilds display caches at the final logical head; it does not mutate semantic input.

Seamless view, reference-pattern mode, unsupported brush/provider semantics, and document geometry with an external raster base use the existing exact GPU feedback route. They are explicit capability fallbacks, not approximations with wrong layer/source meanings. They retain the earlier performance characteristics. Normal seven-Foundation-brush drawing uses the new lane. The editor currently exposes normal layer stacks; future layer blend/style controls require connecting their complete presentation metadata before enabling this lane for those states.

## Replaced and retained code

- Normal editor feedback no longer allocates high-resolution sparse prefix/tail images or waits for formal GPU completion. Sparse feedback remains solely for the explicit correctness fallbacks and comparison B/legacy QA capability.
- Non-commit formal scratch coverage covered by C no longer repeatedly recomposites the high-resolution scene. Every exact tile commit remains visible through the retained scene/pyramid/cache.
- Product startup no longer allocates a full-document archive texture only to destroy and replace it with a 1px placeholder.
- Full-document reference feedback is isolated in `reference-feedback.mjs`; it is retained for Foundation prototype consumers and the zero-preview compositor used by existing export-only strict replay. The normal drawing UI does not select it.
- No new full-artwork GPU→CPU readback, full-canvas per-frame copy, artwork cache multiplier or altered strict precision is introduced.

## Comparison and measurements

The immutable A source is `aac68dc…`. B uses the same screen proxy but its updates remain behind formal `inflight`. C updates independently and avoids redundant formal feedback. Comparisons use identical browser, CSS viewport/DPR, brush/profile, document size, view, sample count, pen timing and final queue checks. First-stroke input/initial preparation, subsequent strokes, short bursts, long strokes and catch-up are recorded separately. Wall-clock timer/GPU jitter is preserved; input/records are not silently dropped to improve numbers.

Initial selection run: [38886097617](https://github.com/totoro0419/illustro/actions/runs/38886097617), source `8785704…`, 24 A/B/C cases plus 36 ratio/transport cases. For broad 4000px fitted strokes, C Canvas2D input-to-upload p95 at 1/16 → 1/32 → 1/64 was 3.2 → 2.6 → 1.6ms (WebGL2 formal) and 3.2 → 2.3 → 1.5ms (WebGPU formal). These are CPU-raster/upload proxies on SwiftShader, not physical input-to-photon. Thin rescue used the same 32400-pixel image at all three nominal ratios. Canvas2D was selected because direct CPU uploads avoided the second WebGL context and were at least competitive with the extra OffscreenCanvas copy in these observed cases. OffscreenCanvas was tested on the main thread; worker transport overhead remains unmeasured.

The initial A observer timestamp was taken at backend entry. The final comparison observer uses the end of command encoding/upload for A, matching the end-of-upload meaning of B/C. These runs must not be combined as if the timestamp definitions were identical. Final-source comparison and regression evidence is generated by the workflow and linked from the dedicated QA page.

Neither upload FPS nor `requestAnimationFrame` invocation count is physical display FPS. The QA browser test separately captures changed compositor screencast images; capture overhead and delivery limits prevent treating its cadence as unobstructed device FPS. GPU command counts/allocation volumes and queue-completion proxies are recorded; isolated GPU execution, peak VRAM/RSS, physical scanout, heat/power and physical Android stylus/finger performance are unmeasured. User acceptance remains false until explicit approval.

## Primary sources and applicability

| Source | Verified public behavior/specification | Applied / limits |
|---|---|---|
| [Krita Instant Preview](https://docs.krita.org/en/reference_manual/instant_preview.html) | Smaller feedback while the real stroke is calculated; paint-op limitations and final popping are documented | Separate transient resolution from final data; do not copy Krita's zoom-derived policy or assume every brush is compatible |
| [Krita brush editor](https://docs.krita.org/en/user_manual/loading_saving_brushes.html) | Instant Preview size threshold; small brushes can be slower with it | Thin rescue and per-brush capability; actual threshold is measured locally |
| [Photoshop performance preferences](https://helpx.adobe.com/photoshop/desktop/get-started/settings-and-preferences/configure-photoshop-performance-preferences.html) | Image caches improve redraw; tile-size tradeoffs depend on workflow | Retain display caches and bounded work; Photoshop internal queue/brush algorithms are not inferred |
| [CSP Preferences, Tools](https://help.clip-studio.com/en-us/manual_en/720_preferences/Preferences.htm) | Temporary stroke/cursor preview reduces perceived lag; fast view while navigating | Distinguish temporary feedback, exact stroke and view navigation; proprietary implementation is unknown |
| [ibisPaint Stabilizer](https://ibispaint.com/lecture/index.jsp?lang=en&no=50) | Real-time/after correction and per-brush Force Fade options | Preserve existing stabilization/final fade and raw input; no assumption about ibisPaint's internal rasterization |
| [WebGPU GPUQueue](https://gpuweb.github.io/types/interfaces/GPUQueue.html) | `submit` schedules work; `onSubmittedWorkDone` resolves after previously queued work | Bound work before submission; completion does not measure physical display or imply arbitrary preemption |
| [WebGL2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/) | Fence/sync and framebuffer/readback semantics | Retain exact backend and acknowledgment; no cross-context texture-sharing assumption |
| [HTML Canvas / OffscreenCanvas](https://html.spec.whatwg.org/multipage/canvas.html) | `willReadFrequently` readback optimization; desynchronized is a latency hint with potential tearing; OffscreenCanvas presentation semantics | Compare direct CPU/second GL/Offscreen uploads; do not promise independent hardware or worker speedups |

## QA and scope of acceptance

Dedicated page: `https://totoro0419.github.io/illustro/qa/perf-instant-canvas/`. It offers A/B/C, size/view/backend/ratio choices, an optional measurement display and identical test strokes. Test controls are confined to this page and URL-selected review behavior. Normal editor navigation/UI is retained.

CI gates cover source lock, unchanged color/Foundation/Core code, unit/type checks, immutable strict pixel/record/history/replay comparison, saved work, Recovery, export, Orbit/color hit tests, transform/geometry, gesture cancellation, touch, continuous history, memory pressure and public-build verification. Unsupported physical-device gates are explicitly unverified. Passing generated tests/builds is not user acceptance.
