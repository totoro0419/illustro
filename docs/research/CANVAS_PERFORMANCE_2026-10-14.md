# Canvas performance review — 2026-10-14

Base: M09 `e04d3e29ab162d487d0c774524323bf49c684a4d`. PR #24 is draft and unmerged; its presentation-only intent was independently reimplemented, not cherry-picked.

## Verified code causes

- View transforms previously requested the ordinary raster frame even with no document change. This is not evidence of replaying all strokes during pan.
- WebGL fence polling resolved a Promise, but `frame()` checked `inflight` before its microtask ran. A finished submission could therefore consume one extra animation callback.
- First checkpoints enumerated every tile in every layer and called `backend.tile()`, allocating empty GPU tiles. 3000×3000 × 3 layers enumerates 1728 tiles; this count is arithmetic, not a hardware measurement.
- WebGPU readbacks mapped one buffer per tile sequentially. WebGL readPixels read directly into JavaScript, synchronously.
- `syncLayerStack()` called the same renderer twice and dirtied the entire occupied stack even when layer order was unchanged.
- View changes invoked full button / diagnostic refreshes. Saving swallowed capture exceptions. Checkpoint acknowledgement could clear newly queued operations while awaiting the worker.

The reported stroke-by-stroke appearance during canvas movement has not yet been reproduced. Restoration holds presentation until the complete image is ready. No claim that this symptom has been completely eliminated is made before runtime and device evidence.

## Official comparisons and adopted decisions

| Source | Public evidence | Decision |
|---|---|---|
| [Photoshop performance](https://helpx.adobe.com/photoshop/kb/optimize-photoshop-cc-performance.html) | Image cache levels accelerate high-resolution redraw; changed pixel area determines history cost. | Reuse composed image, derive bounded minification levels, retain local history patches. |
| [Krita display](https://docs.krita.org/en/reference_manual/preferences/display_settings.html) | GPU canvas acceleration and bilinear/trilinear/high-quality display options. | Preserve full-resolution source and GPU presentation; use area-average levels for minification. No low-resolution committed artwork. |
| [CLIP STUDIO information](https://help.clip-studio.com/en-us/manual_en/210_file/Information_Palette.htm) | Memory usage is visible and application memory allocation affects performance. | Record occupied tiles, history reservations and derived display bytes; do not equate browser heap with total GPU memory. |
| [Procreate preferences](https://help.procreate.com/procreate/handbook/actions/actions-preferences) | Pinch zoom can include rotation; finger gesture and drawing controls are separate. | Preserve existing combined gestures and input coordinate mapping. No new gesture design. |
| [ibisPaint introduction](https://ibispaint.com/lecture/index.jsp?lang=en&no=01) | Official manual covers canvas gestures, artwork and image/movie export separately. | Preserve edit history and finished image roles. Unpublished renderer/cache internals are unknown. |
| Affinity settings | Official help fetch failed in this environment. | No internal algorithm attributed to Affinity; existing interaction is retained. |
| [WebGL2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/) | `readPixels` into PBO plus fence before `getBufferSubData` can avoid synchronous framebuffer readback. | Bounded PBO transfers, nonblocking fence polling, one completion can advance rendering in the same animation callback. |
| [GPUWeb queue reference](https://gpuweb.github.io/types/interfaces/GPUQueue.html) | `onSubmittedWorkDone()` reports completion of previously submitted work. | Retain formal completion/resource lifetime fences, separate a single outstanding view presentation; newest unsent view wins. |

## Architecture and limits

Original stroke records and canonical input are unchanged. Presentation does not append jobs or create revisions. A separate bounded presentation request may run while formal work finishes; atomic history/restoration holds still block it. WebGL formal completion has an idempotent synchronous acknowledgement to avoid the extra RAF.

Minification levels average 2×2 premultiplied source pixels and are created only when needed; occupied dirty rectangles update derived levels. Source artwork, export pixels, DPR backing size and input transforms are unchanged. Nearest/100% and the M08 reference pattern keep their existing sampler. Display cache storage is approximately one third of the source RGBA8 image, plus edge rounding. Runtime quality must still be verified on both backends.

Checkpoint reads never allocate missing tiles. A complete sparse seed replaces the previous checkpoint tile index; dirty deltas include zero pixels to remove erased regions. Transfers contain at most 16×128×128×4 = 1 MiB, with an input opportunity between batches. A changed revision or active stroke cancels the capture; the protected operation journal is unaffected. Checkpoint acknowledgements remove only the captured operation prefix. Cached images ahead of Undo or on another history branch are rejected; exact geometry checkpoints take priority over an older materialized geometry base. Thumbnail transfers also use bounded batches. The existing 12-operation / 800ms policy remains: no measurement yet justifies changing it. View gestures defer starting checkpoint work.

Current checkpoint load still expands saved layers to dense CPU arrays. Very large documents with many layers may have significant restore memory cost; the new readback batching does not solve that existing limitation. GPU execution timestamps and total GPU allocation are not yet measured. Unused preview slots, which the existing shader loop never reads beyond its actual overlay count, now share a 1×1 zero image instead of a full-document zero image: nominal RGBA16F storage saved at 3000×3000 is 71,999,992 bytes. Transparent pixels with nonzero RGB are retained in sparse save and upload; only all-zero RGBA may be omitted.

## Measurement scope

The benchmark uses real Chromium WebGL2/WebGPU with SwiftShader software GPU. It exercises 512×384, 2048×2048 and 3000×3000; 0/50/500/2000 rasterized strokes; 1/3/10 surface stacks. The fixture uses short strokes in a reproducible occupied area; it is not equivalent to a densely painted whole document.

The first benchmark counter missed WebGPU inline presentation encoding. Corrected measurements count WebGPU queue submissions containing presentation and WebGL flushes after presentation; zero observed submissions cannot pass.

Measured: canvas presentation submission cadence, frame-interval p95, handler-to-submission proxy, JavaScript submission duration, occupied tile count and history bytes. Actual physical display refresh, input-to-photon latency, GPU timer-query duration and Android hardware performance are unmeasured. Initial benchmark fixture construction timed out; fixture settling now uses the same 256-job restoration quantum on both versions, outside the measured manipulation window. The report must preserve these distinctions.

## Local evidence before browser CI

- Core typecheck + 31 tests passed.
- Editor + geometry: 68 tests passed, including sparse-readback and checkpoint history-prefix cases.
- Brush Foundation + scheduler regression: 104 tests passed (93 original + 11 new).
- Editor typecheck and production build passed.
- Canonical index / source lock check passed after updating only changed display sources and generated artifact hashes.
- Local Chromium install failed (invalid/truncated download). Browser execution is delegated to the repository's CI environment, not claimed as locally verified.
- Android phone/tablet and physical stylus/120Hz tests remain unverified.
- First CI run: M09/Orbit, M05 Save/Recovery/Offline, M06 export completed; M08 failed because throttled QA state was stale immediately after a discrete 100% command. Discrete view commands now refresh their state immediately; continuous gestures remain throttled. All gates must rerun on the final commit.
