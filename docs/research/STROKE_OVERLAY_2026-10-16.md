# Stroke-only display feedback — 2026-10-16

Status: EXPERIMENTAL. Physical Android performance and user acceptance are unverified.

PR31 inherits the exact current PR30 head `d9f52391bb2eeed4750e571262c8a089171d011e`. PR25–30 color, layer, history, navigation and persistence work remains in its ancestry. Main, production integration and previous QA directories are not changed.

## Audit and design

The preceding `ScreenProxy` reconstructed semantic history into a screen-resolution `bases` image for every completed surface. A new view replayed all previous commands; `finishCommit` replayed the just-ended record again and `fold` accumulated another low-resolution completed picture. Opaque replacement cells then substituted that coarse picture for the high-quality completed GPU image. DPR was not represented as a full physical pixel grid. Thus moving a fine line across existing artwork could visibly blur the artwork around the line. This was reproduced in PR30 fit-view screenshots; it is separate from the unchanged final artwork pixels.

The replacement has three owners:

- Existing strict 128px tiles, PresentationPyramid and ViewportCache retain completed artwork. Their area-average/bilinear display rules remain the final display authority.
- StrokeOverlay owns only current/unpresented command coverage. A clipped transformed document polygon determines visible area. Brush screen diameter and effective backing/CSS density determine the proxy sampling grid. Fine lines and material brushes initially retain full physical density. Broad lines can use lower area ratios; manual 1/2 through 1/128 profiles exist only for comparison.
- GpuRenderer owns formal work, stroke IDs and presentation acknowledgment. Stable input prefixes are consumed once, mutable tails replace only their prior touched cells. Notifications coalesce; actual canonical samples and formal work are never dropped.

A 32px sparse raster cell stores only touched coverage. Saturated stable coverage supplies a conservative alpha lower bound, so later commands with no possible coverage increase skip that cell. Mutable tails never become formal authority. A single output canvas grows in reusable 128px allocation bands around pending stroke bounds. A separate temporary guard keeps its physical pixel grid while the line keeps its own grid, preventing resampling at handoff. Changed cells replace output pixels directly with putImageData, removing the intermediate upload canvas and cell resampling; a resize redraws cached coverage, not semantic history. Geometry remains floating point. No completed low-resolution base, historical source callback, `rebuild`, `fold`, or final-record proxy replay remains.

Top, visible, full-opacity, normal Foundation paint can directly overlay the completed image. Erase, lower layers, source-dependent/unsupported semantics, seamless/reference modes and external raster projections retain the existing exact sparse GPU feedback route. B and C use the same fast code for qualifying paint; C denotes the correctness fallback conditions, not a second duplicate overlay algorithm. Core layer visibility and opacity are now explicitly passed to the retained scene compositor and direct-path qualification. Layer opacity scales only the final premultiplied layer contribution, including the >8-overlay scratch path; strict layer pixels and brush calculations remain unchanged. Hidden upper layers do not block qualifying top-visible paint. Masks/clipping and future layer blend controls are not implemented by this task; they must provide complete compositor metadata and an exact supported route before enabling direct feedback.

## Handoff and contention

A transparent CPU line cannot remain above its own newly published formal image. Formal intermediate coverage for independent IDs therefore stays out of presentation. The existing strict layer ping-pong predecessor retains the preceding image during partial commit; no additional full artwork texture is allocated. Once an entire stroke is ready, its dirty keys are published.

A short-lived, full-density **cropped transition guard** preserves the old completed appearance under pending CPU lines until the formal presentation is acknowledged. WebGL2 can snapshot its preserved drawing buffer. WebGPU automatically expires presented canvas textures; its guard copies only the relevant region of the already-retained ViewportCache texture into a mapped buffer. This is a per-handoff cropped readback, not an input/frame-wide artwork readback. It has a real synchronization/copy cost and is included in formal catch-up measurements. Guard and matching stroke removal happen in one event-loop update. Newer IDs survive an older acknowledgment; stale view epochs cannot retire transformed feedback. A fallback requested during an in-flight normal submission cannot clear strokes absent from that submission.

Independent Canvas2D updates do not pass through the formal `inflight` gate. They still share the main thread and browser compositor and may contend for hardware. No GPU preemption or physical independence is assumed. Formal batches retain the PR30 bounded/adaptive work limits. Existing save checkpoints defer while input/history is active, and thumbnails run only while the home screen is idle.

## Comparison and limits

A is immutable PR30. B is qualifying direct one-stroke paint. C uses B for normal paint and the exact GPU route where direct compositing is incorrect. Same-runner input, browser, view/DPR, samples, brushes and sizes are used. Quality uses deterministic sample times and actual compositor PNG screenshots; reading an expired WebGPU canvas is explicitly invalid as a quality measurement. The first prototype caught a fallback scheduling omission, which was corrected before publication.

Initial prototype run [38921385450](https://github.com/totoro0419/illustro/actions/runs/38921385450) verified exact same-backend formal brush pixels, 12 overlapping records, history and replay, with equal command/job/strict-target/compute-pass counts. Its WebGL2 images demonstrate the PR30 background-blur defect and its removal. Its original WebGPU image-readback quality numbers are invalid (expired canvas), and are not acceptance evidence. Final-source workflows separately generate real screenshots and corrected fallback evidence.

CPU upload latency/cadence, rAF, compositor screencast delivery and GPU queue completion are distinct. None measures physical input-to-photon, unobstructed physical FPS, isolated GPU execution or Android device behavior. Memory counters model explicitly owned arrays/canvases/guards, not browser RSS or VRAM. User acceptance remains false until explicitly approved.

## Official research and applicability

| Primary source | Publicly documented behavior | Application and boundary |
|---|---|---|
| [Krita Instant Preview](https://docs.krita.org/en/reference_manual/instant_preview.html) | Reduced feedback while exact work continues; brush limitations and popping | Separate disposable feedback from final pixels, qualify brush semantics; do not copy an unconditional coarse-grid policy |
| [Photoshop performance preferences](https://helpx.adobe.com/photoshop/desktop/get-started/settings-and-preferences/configure-photoshop-performance-preferences.html) | Image caches improve redraw; brush changes benefit from smaller tile work | Retain completed display caches and bounded changes; Photoshop's proprietary brush/queue internals are unknown |
| [CSP stroke preview](https://support.clip-studio.com/en-us/faq/articles/20250039) and [coarse display guidance](https://support.clip-studio.com/en-us/faq/articles/20190027) | Optional lag-reduction preview; high-quality display improves low-scale preview | Evaluate live and final display independently at fit view; no claim about its internal renderer |
| [ibisPaint Stabilizer](https://ibispaint.com/lecture/index.jsp?no=50) | Real-time versus after-input correction; per-brush Force Fade | Preserve exact existing input/final-taper semantics; do not infer a proprietary raster algorithm |
| [HTML Canvas / OffscreenCanvas](https://html.spec.whatwg.org/multipage/canvas.html) | Bitmap/CSS resolution, smoothing, software-friendly read hints, worker presentation | Full effective DPR for fine strokes; Canvas2D selected from earlier transport comparison; a worker or extra canvas does not guarantee independent hardware or fast output |
| [WebGPU GPUQueue reference](https://gpuweb.github.io/types/interfaces/GPUQueue.html) | Submission schedules work; completion waits for preceding queue work | Bound jobs before submit, distinguish completion from scanout; no assumed interruption of running GPU work |
| [WebGL2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/) | Fence synchronization/readback, context-specific sync objects | Preserve exact backend and fence handling; no cross-context texture sharing assumption |

Earlier PR30 compared direct Canvas2D, a second WebGL2 upload context and main-thread OffscreenCanvas. This iteration removes completed-proxy work and spends the saved work on line quality; worker transport has not been measured anew. The dedicated comparison page is `/qa/perf-stroke-overlay/`; old QA remains immutable.

## Measured quality profile selection

Run [38924478643](https://github.com/totoro0419/illustro/actions/runs/38924478643), source `428acde...`, compared area ratios 1, 1/2, 1/4, 1/8, 1/16, 1/32, 1/64 and 1/128 on identical 4000px phone-fit fine, broad, pencil and subpixel lines. The 32 CSS px broad line at DPR3 used about 7.2ms active CPU p95 at full density, 2.0ms at 1/4 and 1.1ms at 1/8. Its full-screen summed error increased from 168858 to 286075 to 394482; the 1/8 and coarser images visibly softened/jagged the edge. Therefore broad flat paint keeps at least 1.4 samples per CSS pixel (one for very wide paint); fine (<12 CSS px) and grain use full physical density. At DPR3 the 32px line selects 1/4, while lower-DPR screens select a finer area ratio. These measurements precede removal of the extra upload copy; final-source measurements include that optimization.

The original subpixel kernel lost coverage mass: a 1-document-pixel fitted line became too faint even at full physical density. The revised display-only tent preserves the integrated 2r line coverage at every pixel phase. Larger hard capsules use their analytic edge coverage. Canonical coordinates, pressure, final dab/capsule rules and saved pixels are unchanged. Coarse manual comparison profiles are not quality-approved defaults.

## Formal submission work

The quality-first candidate `be6a1af...` did not demonstrate sufficient improvement in formal catch-up. Its same-runner 4000px repeated GL broad case still needed about 37 submissions and 968 jobs, with long CPU encoding/queue-completion tails. A new submission-packing comparison therefore replaces per-job WebGPU uniform/storage allocations with two aligned per-submission buffers. GL solid vertex uploads share the same packed batch; deposited commands upload only the active uniform range, and zero-command commits no longer upload an unused command array. Dispatch/draw boundaries, job order, shader programs, exact input bytes and strict texture ownership remain unchanged. The measured effect must pass the final-source comparison gate; fewer API calls alone are not a speed claim.

The output keeps a cleared 128px allocation while idle (64KiB), reuses unchanged backing dimensions, and reads layout origin/z-order only on view changes. This replaces repeated first-stroke surface creation and synchronous style reads with a bounded scratch surface; no completed artwork is retained in it. Larger idle output images are released. The three allocation variants are measured separately, with equal output pixels and explicit CPU/memory tradeoffs.

The next comparison also evaluates a constant startup preparation: three transparent 4px Foundation probes exercise solid, textured and soft programs before accepting input. They bypass Session/Core entirely and all temporary tiles, history patches and preview surfaces are freed before renderer creation returns. Browser checks require empty user/input/history/tile state afterward. This moves first-dispatch driver work into startup, so initialization/preparation wall time is reported separately from drawing latency; it does not reduce total work by definition and is retained only if the comparison justifies that tradeoff.
