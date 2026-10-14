# Stroke handoff performance review — 2026-10-14

Status: EXPERIMENTAL, device and user acceptance pending. This does not merge PR23/25 or change the M01–M08 acceptance baseline.

## Source and scope

Parent PR26 source tree is exactly `65ef9983486bf2d1d8cc26d7e147dc89f9634447` (commit `03694635db7b529ca60508c03aea3699e94a0d75`). Its application is PR25 `45357428592c0366a90aa4ecac97a1ba72937fc8`, including the later SV drag and Orbit short-tap fixes. Color implementation remains byte identical. Only stroke end → next stroke acceptance, the directly implicated rendering and Recovery path, and isolated QA are changed.

The interrupted environment lost uncommitted source and local evidence. This resumed implementation was reconstructed from that parent and design notes; all results must be regenerated. Earlier local results are not evidence of this source.

## Measured cause and method

`BrushSurface.finishing` previously rejected pointerdown until Worker finalization, Core commit, supplemental seamless work, two GPU drains and notification completed. The matched browser driver wraps the real session, Core transaction and backend without replacing their calculations. Synthetic pointer capture is disabled only in the driver; trusted platform inputs have separate regression tests. First eight isolated lines wait for full completion in both variants; another twelve use a 25ms requested gap. The new acceptance time is recorded synchronously after `session.end`, separately from total completion and first GPU submission/completion proxies.

The first reproduced 3000² sample, Chromium153 with SwiftShader, measured median end→ready WebGL2 1023.0ms / WebGPU 892.7ms; corresponding drain time 1013.9 / 871.7ms. Twelve burst attempts admitted one and refused eleven. Final matched evidence is generated in CI, and supersedes these preliminary samples. Neither command submission, a GPU fence completion nor a persistent viewport readback proves physical screen presentation or pen-to-photon latency. Worker end→record combines scheduling, compute and communication; pure transfer time is not separately measured. GPU timestamp execution and real VRAM remain unmeasured.

## Design

- Input ownership ends at pen up. A new stroke gets its own immutable target, reservation, brush builder, preview ID range and raw input; it never waits for the previous GPU drain.
- `StrokeHandoff` publishes completed records in reservation order. It advances a captured base only across revisions produced by this queue and verifies that the actual head still matches. Core's stale revision guard remains enabled. One stroke, including seamless copies, is one transaction. A wholly off-canvas no-op does not poison subsequent work.
- The canonical Worker still uses the same reconstruction and final record, but suppresses redundant intermediate command messages in handoff mode. The session stages the result until Core publishes it, then adds derived canonical jobs in the same order. Numeric runtime ID ranges reserve seamless copies independently of the semantic seed sequence. Predicted points remain preview only.
- Sparse full-resolution 128px prefix/tail images replace per-stroke full-canvas feedback images. The shaders and coverage/deposit equations are reused. More than four overlapping previews are composed in chronological groups through two small straight-alpha RGBA8 scratch images. The same per-stroke quantization remains intact; premultiplication occurs only at layer display. Completed layer images and existing dirty display caches are reused.
- One GPU submission owns its resources at a time. Adjacent canonical tile jobs are sent together under a bounded estimated pixel-work budget (1M while active, 2M otherwise; at most128 job chunks), rather than small fixed4–8 chunks. Formal work continues during new input. A specific stroke completes after its own dirty presentation submission; it does not await a global empty queue.
- Feedback pool:16MiB; feedback allocation cap256MiB; pre-stroke admission64 pending logical/GPU strokes,100k canonical command-tile incidences,50k pending Worker input points,128 Recovery packets. Exceeding capacity explicitly informs the user before beginning another stroke. Accepted canonical input is never simplified or silently dropped. Existing canonical/history retention is artwork data, not disposable background work.
- Recovery notification follows each Core publication, before GPU-derived work can fail. Already verified journal prefixes are remembered in the Worker, eliminating full rereads of all previous packets after every stroke. New block/frame writes still use verified write/readback and dependency validation; protectedThrough advances only through contiguous verified sequences. Recovery/open/flush retain full integrity scans.
- Undo/Redo wait for earlier reservations and their derived completion under an explicit input barrier; then use the existing Core history/derived patch path. Navigation head publication waits for pending Recovery protection and verifies the latest requested head. Save waits for logical finalization and then snapshots a fixed revision; drawing may continue while its bytes are written. Saved/protected are not GPU states.

## Verification and limits

`stroke-handoff-benchmark.mjs`: same browser, canvas sizes512×384/2048²/3000², same samples, both backends, stage timings and burst rejections. `stroke-handoff-quality.mjs`: four sizes through4096² ×1/3/10 layers ×seven Foundation presets ×two backends, force-fade, erasers, overlapping12 feedback strokes, canonical record identity, strict tile Undo/Redo and rebuild identity. `stroke-handoff-operations.mjs`: trusted input immediately followed by Undo/Redo and a held portable Save while a later stroke commits; reopening must restore the fixed earlier revision. A600-sample long pencil stroke is also checked in every quality profile. `stroke-handoff-stress.mjs`:1100 actual application strokes, five real samples each, requested100ms interval, checkpoints100/500/1000/1100, queue/memory proxies and verified Recovery catch-up. Aggregate report rejects missing or failed evidence.

Existing M09, Orbit, painted-band/SV touch, gesture cancellation, M05 save/recovery/offline, M06 image export, M08 geometry/display, home/works safety regressions are required in CI. UI Implementation Quality review applies to reachable input, truthful errors/pending states, cancellation and data recovery. Existing color layout and UI placement are unchanged. Automated software-GPU tests do not establish Android hardware, physical pen/touch feel, physical screen FPS, one-frame presentation at all loads, GPU timestamp execution, or hardware memory. Those remain UNVERIFIED.

## Public review

Dedicated path `/qa/perf-stroke-handoff/`; retain every existing QA page. Publish only after all required functional, image, performance and stress jobs pass. The report must name its exact source SHA. PR remains Draft and unmerged pending user device review. A URL or a green CI alone is not product acceptance.

## Public technical sources

- [Pointer Events Level3](https://www.w3.org/TR/pointerevents3/): actual/coalesced versus predicted input and pointer cancellation ownership.
- [WebGPU queue completion](https://gpuweb.github.io/gpuweb/#dom-gpuqueue-onsubmittedworkdone): submitted work completion is distinct from actual presentation. No claim of isolated GPU execution timing.
- [WebGL2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/): explicit fence acknowledgement and texture/framebuffer ownership.
- [Krita Instant Preview](https://docs.krita.org/en/reference_manual/instant_preview.html): public example of responsive feedback while final strokes compute. Its lower-resolution feedback is not adopted here; precision and artwork resolution remain unchanged. No private competitor architecture is inferred.
