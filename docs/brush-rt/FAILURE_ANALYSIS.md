# Failure analysis

Baseline source: branch `brush/production-engine-2026-10-02`, commit `dc1f1ffead0c7601b9d23e81ba1eb8dcb643b279`. Uploaded `illustro-brush-lab.html` is a bundled earlier artifact (56,803 bytes); it is used only as failure evidence, not a renderer dependency.

Code inspection independently confirms `StrokeRaster.deposit` computes coverage at every affected pixel, `RasterQueue` is FIFO, raster cloning/forking exists, and the earlier lab contains CPU image transfer/preview construction. A width increase grows footprint area quadratically until document clipping. FIFO display of every historical input can convert insufficient throughput into cumulative lag.

The repository also contains a newer GPU implementation (`immediate.ts`) with instancing, mutable tail textures and GPU fences. It is inaccurate to describe *all* existing code as CPU-only. Nonetheless `main.ts` constructs `active.preview()` before presenting, and the renderer maintains preview/prefix copy and refinement paths. Historical PASS files are not accepted as proof of the new live-tip requirement.

Rejected designs before implementation:
- Simply move the old FIFO to GPU: GPU can accumulate work as well.
- Cancel every full preview rebuild: continuous input can starve presentation.
- Separate GPU contexts and assume hardware priority: the browser provides no such scheduling guarantee.
- Render all active history every live frame: work grows with stroke duration.
- Call submission, a fence or requestAnimationFrame a photon measurement: each observes a different stage.

New-design limits are recorded in VALIDATION.md and measured evidence; failed test iterations will be appended instead of hidden.

New implementation iterations:
- First regression trial reset at every adjacent direction change, so alternating small jitter was not smoothed. The new test exposed this. Immediate resets now require motion >6px as well as a large angle; smaller changes remain bounded by the local window/displacement cap. This tradeoff still needs small-circle/real-pen review.
- Constant-speed test initially required exact binary equality for a floating result (20.000000000000004). The assertion now uses 1e-6 tolerance; this is a numerical test correction, not a behavior claim.
- An initial tail-only preview would disappear on lift before confirmed work caught up. It was replaced with persistent immutable prefix plus a separately cleared mutable tail; ended strokes stay visible until their own confirmed tiles commit. Four unfinished strokes can currently be staged; exceeding this is an explicit candidate limitation, not a production gate pass.

## New candidate failures actually observed

- Run 37032959431: frame lifecycle method missing. Browser initialization alone did not detect it. New frame integration added; the mouse-reference check had passed, while Undo/Redo timed out.
- WGSL rejected an unparenthesized integer hash expression. Parentheses now specify multiplication before XOR; both shaders compile on the second run.
- The first workflow pipeline returned the exit status of `tee`, hiding the browser failure. Explicit `pipefail` now makes the verification job fail. This old CI success is invalid evidence.
- Run 37033518263: WebGL2 preset 13 (tilted pencil) differs at one channel by 6/255. This remains a pixel gate failure; expanded diagnostic output records exact coordinates and RGBA values. Tests continue to collect other failures and benchmarks rather than abort coverage at the first mismatch.
- Undo/Redo test clicked Redo while Undo was still refining. Buttons are now disabled until each history operation completes; the test waits for that visible state.
- Candidate-branch Pages deployment was rejected by the existing github-pages branch protection. Those rules are preserved. The candidate workflow now verifies and retains downloadable artifacts without attempting that deployment.


## Sustained GPU-proxy failure and revised design
Run 37034137600 (headless software GPU, 512 × 384 document) failed: WebGL2 512/240Hz grew from 81.7ms to 952.3ms; 1024/240Hz grew from 79.3ms to 954.0ms. Confirmed replay after the long run timed out. This is a failed candidate, not a successful low-latency result.
Two causes were identified by code inspection: readiness scanned the whole command history each time (quadratic total work), and the confirmed quantum controller compared a RAF-polled fence with sub-frame thresholds, keeping it at one chunk on a 60Hz loop. Wide opaque preview capsules also repeatedly shaded already fully covered areas.
The next candidate uses an incremental publication cursor, starts with four confirmed chunks and adapts using thresholds that account for RAF polling (still a proxy), and adds a depth cache for eligible constant-pigment/flow solid prefixes. Fully covered pixels are skipped by later preview geometry; AA edges remain mutable. Complex strokes and mutable/predicted tails bypass that cache. This is an Illustro optimization, not an assertion about a competitor's internals.
The elapsed-time exposure requirement in two existing airbrush presets was also restored. It is derived from actual input timestamps. The engine identifier advances to illustro-rt-2.1 so older candidate records cannot silently replay with changed command semantics.
Local execution disconnected before these revisions could be validated; new checks must execute in GitHub CI. No unexecuted local test is counted as PASS.
