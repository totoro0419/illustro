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

Continuous solid capsules now use coverage union, including AA, rather than repeated stamp-flow accumulation. Their constant pigment/opacity/flow eligibility makes MAX union the appropriate geometry operation. This intentionally removes input-frequency-dependent AA darkening. Complex stamp brushes retain flow accumulation. A cross-frequency pixel test covers the new semantics.


The revised confirmed path also proves full coverage from the four corners of a tile for constant-radius capsules, with a one-pixel safety margin. Only eligible constant-pigment, constant-opacity, flow=1 strokes can elide later GPU deposits on a saturated tile. Canonical commands remain intact. Other tiles/stamps retain ordered deposition. This reduces redundant *exact* work, rather than enlarging the queue budget or lowering final quality. A new test rejects this shortcut for flow<1.
Image mask cache keys are now computed once per mask object; worker command batches reuse a main-thread frozen preset instead of repeatedly serializing brush image data. An unused record-ID map that retained undone/cleared records was removed.

Capsule dirty bounds now use the actual circular radius, while rotated complex stamps retain conservative diagonal bounds. Scattered stamps no longer pretend to span from the original unscattered pointer point. Live footprint quads use the same distinction. Stationary airbrush time deposits hold the last measured pressure/tilt until the next actual sample; pen-up pressure does not retroactively fade the whole stationary interval.

A second exact saturation optimization removes later proven no-op deposits during tile-job construction as well as during GPU submission. This prevents a growing CPU list of jobs that the GPU would subsequently skip. The all-real-input canonical journal is unaffected. A new test verifies that 999 later inputs on a fully covered tile add no formal jobs and still advance the known canonical timestamp.
The synthetic wall-clock input generator now emits any final scheduled samples missed when its last RAF crossed the requested duration, and reports the maximum scheduling lateness. A sample-count success is not evidence of a physical 240Hz device or a timely input generator.

MAX accumulation understated repeated low-flow complex stamps. For complex presets with constant stroke opacity and pigment, live accumulation now stores normalized source-over density and applies stroke opacity during display composition. Variable flow, grain, masks and shape dynamics remain supported. Prefix and mutable tail merge by source-over in this mode. Presets with varying opacity/pigment retain an explicitly approximate path and remain an open fidelity gate; this change is tested against the visible GPU canvas before formal refinement.

The display shader now visits each prefix/tail pair directly instead of nesting an eight-item search for each overlay. It performs the same coverage/color composition with fewer texture reads and branches. The browser validation runs the two backends as independent CI matrix jobs, so one failed/slow backend does not erase evidence for the other.

Run 37040087180 also failed on the full 2048 ×1536 document: growth occurred even with a narrow brush, and confirmed drains timed out before the wide matrix completed. All 56 preset final comparisons executed on both backends: preset 50 had one alpha-channel mismatch of18/255; all others were within1. Blend checks exposed nonzero RGB beneath zero alpha in the CPU reference. The broad GPU-proxy gate remains failed.
Inspection showed the confirmed solid path still iterated up to16 capsules at every pixel of each entire tile. Eligible solids now use instanced capsule geometry for confirmed tiles too, with coverage MAX into blendable RGBA16F; complex accumulation remains RGBA32F. RGBA16F is bounded numerical storage, not a lower-resolution final image; CPU comparisons and opacity/blend gates cover its quantization. Canonical data is still Float64.

The viewport compositor is now persistent. It recomposes only tiles changed by new prefix geometry, the old/new mutable tail, confirmed deposition or preview retirement, then performs a GPU viewport copy for presentation. Solid full-coverage proofs also elide unchanged live-composition tiles. A viewport copy is a GPU presentation transfer, not a cloned CPU document raster or a full-document brush calculation. This directly removes display shader work that previously grew as more tiles were touched.

Pixel failure classification: the fixed-timestamp silk mismatch is consistent with discontinuous four-sample hard-ellipse AA crossing a Float32 boundary; this is an inference from the equations and identical two-backend result, not a captured per-command trace (same18-alpha-unit error on both APIs). The v2.2 renderer intentionally changes eligible hard-ellipse AA to a continuous one-pixel signed-distance approximation in GPU and Float64 reference; texture/grain is retained. This is a documented AA change, not a relaxed pixel threshold. Dual tips keep their original coverage path. Engine identity advances to illustro-rt-2.2. A rounding-continuity regression accompanies the GPU pixel test.
The zero-alpha RGB differences in blend tests are a reference normalization bug: almost-zero alpha rounded to0 after leaving pigment in straight RGB. CPU and both GPU composition paths now normalize zero-alpha pixels to zero RGBA. An explicit tiny-opacity test checks this invariant. Those differences were invisible colors under full transparency; the normalization improves serialized image consistency.
