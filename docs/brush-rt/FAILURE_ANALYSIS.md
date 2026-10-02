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
