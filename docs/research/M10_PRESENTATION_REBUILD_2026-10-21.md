# M10: presentation correctness rebuild (2026-10-21)

Status: implementation and automated verification. **Physical device acceptance and M10 completion remain UNVERIFIED.** No merge is authorized.

## Immutable development position

GitHub PR #39 was independently checked open/Draft at `34a24724499c69b3867338e5a37fca36c9f117a8`, base PR38 `e510ea18b447a5e6d74721bd23b07acab15c391d`. The user-designated `rebuild/M10-presentation-correctness-2026-10-21` branch was independently checked at `8fa3857b5ce8deb4dadacce45f06e121a16e8d85`, also the head of `snapshot/pre-drawing-worker-2026-10-20`. Work starts there, not by accepting the broken Worker's tree. The reviewed session/token, gesture, history and restore adapters are reused selectively; its viewport transport is replaced. PR39 is not moved or merged. The old Worker commit is retained for comparison.

Required canonical implementation, index, M01–M47 checklist, brush adoption, Architecture V2 and Brush/Render contract, performance owner, M08/M10 preview/navigation records were read. No brush algorithm, shader deposition, semantic record, forced-taper length law, TileHistory size, color behavior or persistence format is replaced.

## Evidence and cause

1. **Original freeze dependency:** the start version creates formal GPU commands, CPU preview evaluation, GPU copy/readback and window view submission on the same window execution role. Its view fence/inflight and navigation suppression also delay fresh presentations. Main task duration and GPU queue completion are distinct; they are measured separately, not equated with hardware occupancy.
2. **Reproduced Worker reveal defect:** its `DrawingHost.setNavigationActive` suppresses `forwardView` throughout navigation. The window retains a viewport crop and affinely transforms it, so offscreen content is unavailable in the newly revealed region. In the native rapid-shrink fixture, the broken Worker's existing blue line has **0 of 1546 reference blue screen pixels** during the gesture, reappearing after release. The starting version and the first document-tile rebuild each retain all 1546 pixels under that same fixture. The final CI reruns all versions on both backends/routes.
3. **Destructive presentation lifetime:** `transferToImageBitmap` replaces the default canvas bitmap. A new picture must be completely populated independently of an old viewport cache's validity. The new atlas transport always initializes and writes every used slot; display snapshots always explicitly refresh the default framebuffer. This removes reliance on mutable/default buffer contents. This is a correctness requirement, **not a claim that every user's black frame was independently reproduced**.
4. **A rejected intermediate design:** tile transport with GPU upload/presentation still on window produced a 297ms main long task in a heavily concurrent software-GPU run. A twelve-stroke test also timed out. These are failures, not evidence of success. All display GPU API calls were moved out of window into a dedicated display role. A following native twelve-stroke case completed, including 1664 history versions spilled, with no observed main long task in that case. These exploratory observations are not the final isolated performance comparison.
5. **Save adapter omission found during regression:** the original Worker adapter exposes a remote `readTiles`, while the existing checkpoint reader expects local GPU resources. The new reader delegates its existing <=16 tile/1MiB batch through that port, validates the entire reply and its revision, and preserves local backend behavior. This is needed to retain PR38's finished-image cache, not merely its stroke replay fallback.

The cause of every physical phone incident cannot be inferred from a software GPU or source inspection. Direct hardware GPU duration, scanout, power/thermal behavior and complete device-loss recovery remain unmeasured.

## Final responsibilities

- **Window / BrushSurface / DrawingHost:** native input, receive-time document coordinates, Core transactions, semantic Undo admission, current view, bitmap ownership, atomic visible base/CPU-overlay retirement. It creates no GL/WebGPU context, raster commands or pixel readbacks. Preview bitmap layers share the latest view, and the fixed input viewport is retained.
- **Drawing worker:** the existing Session/Canonical worker, brush quality/forced taper/prediction, formal sparse 128px tiles, layer composition, TileHistory and bounded dirty tile export. At most one formal submission remains outstanding. It does not stop formal progress because a gesture is active.
- **Display worker:** a distinct retained document image using the accepted M08 presentation shader and pyramid. Only changed document tiles are uploaded. It continually accepts the latest view during navigation, produces complete immutable display snapshots, and has no dependency on a canonical record, formal-stroke completion or history archive. It shares the physical GPU; no dedicated-hardware or hardware-preemption claim is made.
- **CPU preview:** existing coverage evaluator/slicing, with a stable sparse document grid for each stroke instead of a clipped screen crop. Navigation transforms existing images and cancels no pending samples/geometry. A newly started stroke may choose the current density; older grids are preserved.

Dirty document tile atlases are wholly initialized, transferred once, uploaded to the private display context, then closed. Base publication and its matching CPU-image retirement occur in the same window task. A visibility epoch rejects stale Undo images; rejected dirty keys are requeued, not lost. Reset also clears formerly occupied regions of the retained display document. Display results carry content generation, visibility epoch and their actual source view; old asynchronous views cannot own the user's latest view.

## Removed from the new editor path

- window-side brush reconstruction, raster evaluation, GPU rendering and checkpoint readback;
- viewport-only base transport as the sole retained source;
- view forwarding suppression during a gesture;
- 120ms post-stroke and 80ms navigation quiet delays in the drawing role;
- CPU-to-formal guard snapshots and protection waits;
- one-tile-per-round-trip serialization used in the broken Worker;
- repeated DOM reordering and per-layer layout reads for every preview picture;
- synchronous exceptions escaping the worker protocol without replying to requests.

The directly embedded brush prototype keeps its accepted local display path. It does not require the editor's workers. No whole-canvas readback/copy per stroke, full-layer history bitmap, extra semantic authority or new save schema is introduced. A retained display composite costs one additional RGBA8 document texture (64MB at 4000px), plus bounded atlases and viewport resources; exact device memory and VRAM remain to be checked physically.

## Verification and publication

- `m10-presentation-transport.mjs`: two independent GPU contexts; all 64,000,000 document RGBA bytes, alpha, row direction, repeated transfer, untouched regions and partial 4000px edge tiles.
- `m10-rebuild-correctness.mjs`: trusted native three-stroke input and rapid pinch/rotation exposing an offscreen colored seed; same-gesture screenshot vs completed screenshot, and final whole-document retained/raster equality; real editor Undo/Redo layer hashes. The two full-document reads are test-only, not the drawing path.
- `m10-rebuild-history.mjs`: actual touch Undo/Redo while record/formal/picture publication is gated, multiple strokes, finger/pen-to-gesture, portable save/reopen. Old epoch packets cannot restore canceled ink.
- `m10-rebuild-response.mjs`: start/current matched browser, 4000px, G/pencil 128/256/512px, 0/16/50/100/250/500ms requested gaps, both backends; native motion, composed PNGs/screencast, event receipt, rAF, main long tasks, formal command CPU and formal completion. The requested 0ms is an immediate next CDP command, not physical simultaneous contacts; measured event gaps are recorded. Device-memory hint is set to 4 for the CI response matrix to exercise the existing 32MB history budget.
- twelve long consecutive strokes, four-times CPU slowdown and a single gesture that continues through actual formal completion;
- unchanged formal brushes/records/layer pixels/history/replay vs immutable start;
- Core, Brush and editor tests/types; M05 Save/Recovery/Offline, M08 sampling/DPR, M09 color, PR38 My Works/cold ten-layer reopen.

The response matrix runs sequentially on its own CI runner. Exploratory concurrent browser runs are not substituted for that matched comparison. The summary publishes all regressions and outliers and checks exact expected case counts. rAF is not scanout; a queue-completion proxy is not GPU execution time. Moving existing dark pixels alone does not establish whole-image correctness.

Isolated QA: [M10 rebuild](https://totoro0419.github.io/illustro/qa/m10-rebuild/). Existing `/qa/m10/`, M01–M09 and PR39 are preserved. A generated URL or CI success does not constitute physical acceptance. After the user accepts all three conditions, integrate the verified tree into PR39 while retaining both old comparison snapshots; do not force-replace or merge PR39 beforehand.

## Platform references

- [HTML: transferToImageBitmap](https://html.spec.whatwg.org/multipage/canvas.html#dom-offscreencanvas-transfertoimagebitmap): transfer creates a new default bitmap, initialized black/transparent according to context alpha.
- [WebGPU: image copy and color encoding](https://www.w3.org/TR/webgpu/): external-image alpha/color encoding and device-owned GPU state. The transport checks premultiplied RGBA bytes on each backend rather than inferring correct color from API success.
- Existing major-app public behavior and adoption reasons remain in the canonical performance owner and M10 brush/preview research. This repair does not assert unpublished competitor internals.
