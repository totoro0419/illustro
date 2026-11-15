# M10: navigation immediately after a stroke

Status: implementation and automated verification in progress. Physical acceptance remains required. PR #39 stays Draft; M11 is out of scope.

## Starting position and cause

Verified GitHub PR #39 head `4617cdaef94a135752c0fa122741f11c2d7aff55`, base `perf/my-works-open-thumbnails-2026-10-18` / `e510ea18b447a5e6d74721bd23b07acab15c391d`, a clean M10 worktree and ancestry. This change preserves the prior M10 preview optimization, brush management and the accepted PR #37/#38 stack.

The editor's gesture handler admits pan/zoom/rotation before the drawing/history barriers. Controlled GPU completion gates reproduce **B: state updates without a corresponding new presentation**: all twelve real pointer-driven view updates arrive, but GL's view fence and WebGPU's `viewSubmission` hold further GPU presentation. A view submitted behind an unfinished formal stroke also shares that GPU queue. Holding a WebGPU transition capture also reproduces an old failure: a concurrent direct view invalidates the retained screen cache and stops the renderer with `Overlay transition: Retained presentation unavailable`. The new view lane defers that GPU refresh while CSS navigation continues. The baseline failure is recorded explicitly, not filled with successful timings. Input receipt and GPU submission/completion are separate measurements; this does not identify every cause of the user's physical-device stall.

`git log -S` places the presentation fence in `599f876`, affine preview reuse/refinement in `1aefdd8`, and gesture-lifetime deferral in `27d5a39`, before `4708ffe`. The automatic route selection did not introduce those waits. Longer formal queues can expose the existing dependency; we do not attribute the physical incident to the route policy without a device trace.

## Minimal presentation change

The renderer retains one view matrix describing the canvas it submitted. On each view input it changes the existing canvas's CSS affine transform first, then transforms the pending stroke images. This operation has no pixel reads, raster work, history traversal or GPU completion dependency. The input viewport stays fixed: pointer coordinates come from the layout viewport, not the transformed canvas bounds, and input over newly exposed areas is still received.

The latest GPU view remains coalesced in `viewPending`. A GPU refresh is submitted once the outstanding content/capture lane is free; bounded backend presentation requests remain bounded. Submitting that fresh view resets the temporary transform in the same JavaScript turn. An older asynchronous completion cannot reset the latest view. The GPU uses the existing composite, not a replay of strokes.

Pending save exposed a second dependency in CI: wrapping status text resized the viewport and immediately cleared its backing, disabling affine reuse until formal completion. Layout/DPR changes now update the desired view immediately and keep the published backing. Its CSS transform compensates for the browser's layout stretch; backing reallocation occurs only inside an actual replacement GPU presentation, after view backpressure admits it. Pending stroke images also reuse their old grids across viewport resize. A dedicated real-input test forces a resize while save and formal acknowledgement are held, checks the unchanged old backing, then verifies exact saved layer pixels.

This is a transient view of already available pixels. Newly revealed areas and exact resampling can arrive later. It does not reduce the canonical artwork resolution or change the final sampler.

## Removed work

- `viewRefineTimer`, `viewRefineNeeded`, and all navigation-triggered full stroke rerasterization after release.
- Cancellation followed by recreation of pending bitmaps merely because pan/zoom/rotation changed.
- Obsolete private CPU preview work and semantic-taper display jobs when navigation begins; canonical input and strict rendering remain intact.
- The synchronous preview flush before a transition capture.
- Per-stroke layout/style reads on every view change; origin changes remain for actual layout/viewport changes.
- Transition captures for an unrelated stroke's completion: a handoff must match an actually pending CPU image.
- A first-finger gesture stroke with no submitted resources no longer waits for, or scans, an unrelated formal queue. Cancellation that owns strict/preview resources keeps its safety barrier. Only new input arriving during navigation resumes afterward.
- GPU view submissions behind an unfinished content/capture batch. Immediate response uses the already displayed image instead.

## Retained correctness mechanisms

The cropped transition guard remains for a CPU-to-formal publication that really replaces a CPU image. It prevents translucent ink from being displayed twice while independent GPU and DOM surfaces change. A view change invalidates an old capture; navigation never waits for its readback, conversion or completion. A stale GPU map skips CPU pixel conversion entirely. A still-current conversion yields to ordinary tasks after about 3ms, checked every sixteen rows, so its callback cannot consume the whole image in one synchronous task. Keeping this bounded handoff is preferable to removing its protection without an atomic replacement.

Semantic forced taper can still build a corrected private image when idle; a gesture cancels it instead of scheduling refinement on release. GPU resource ownership, TileHistory's 128px before/after images, canonical StrokeRecords, formal shaders, brush reconstruction, persistence, recovery and offline formats are unchanged.

## Verification and measurement

`scripts/m10-navigation-review.mjs` uses trusted Chromium touch, Space-drag and wheel input through the actual editor. It records event timestamps/receipt, every view change, presentation requests, two-rAF opportunities, preview/snapshot work, queue state, long tasks and exact layer hashes. Controlled stages hold the canonical record, formal acknowledgement, view completion or transition capture, and add actual CPU preview work. The original and current production bundles use the same browser, software GPU, viewport and DPR within a run.

Geometric screenshot checks disable forced taper in that fixture to isolate image motion; the separate brush-quality suite retains its taper cases. A changing semantic taper is not used as a frozen-image reference. Portable save/reload and real Undo/Redo after navigation compare every layer hash exactly.

The resize fixture changes the viewport again when its completion gate opens. The final check independently requires unchanged document/navigation coordinates and dimensions matching the actual current viewport/backing. A legitimate status/layout resize is therefore checked as a new size, rather than being misclassified as an old view restoring itself.

History image comparisons also wait for the application's history queue and projection publication, rather than inferring completion from the renderer's current job list. Native Undo/Redo must each be admitted once and reach the expected semantic revision. CI delays the actual history projection by 100ms to reproduce the otherwise timing-dependent gap between those two completion states; the exact pixel comparison remains unchanged.

CI publishes the navigation reports under [M10 evidence](https://totoro0419.github.io/illustro/qa/m10/evidence/navigation/summary.json), alongside the existing brush, M08/M09, TileHistory, pending Undo, persistence and preview quality evidence. The scripts fail on a lost latest view, an old completion restoring stale coordinates, unexpected preview regeneration, runtime errors or a failed exact save/history roundtrip.

Numbers are event receipt, CSS/GPU submission and animation-frame proxies. Neither a GPU submission nor two animation frames establishes physical scanout. Controlled completion delays establish a dependency, not a hardware execution duration. Real phone/tablet pen and touch, physical input-to-light, thermal load and the exact user's incident remain unverified until user review.

**👤 USER REVIEW REQUIRED** after successful publication. Automated success does not accept M10 as a whole.
