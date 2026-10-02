# Validation and promotion gates

Status: **production incomplete**. Old brush-lab PASS reports are not evidence for this engine.

## Executed evidence

- Local original candidate:15 new Node tests passed. Later local additions also ran before the execution environment disconnected; the preserved local log is not treated as evidence for unexecuted revisions.
- CI run37040087180:20 Node tests passed. Both shader backends, mouse input, canonical Undo/Redo and all56 final reference cases executed. The GPU latency/drain gate failed.
- CI run37043019906, tree2ed147bfc7ffee1be96b1a28f24d0d86ec507add:24 Node tests passed. Both backends compiled and exercised all56 presets and blends. Hard-ellipse/reference transparency fixes removed earlier failures. Confetti had alpha0↔1 numerical quantization with large straight-RGB difference under alpha1. Ten WebGL2 live-before-confirmed cases were within the original pixel gate. WebGPU Canvas2D readback observed a discarded presentation buffer, so that diagnostic is replaced with explicitly labeled persistent GPU viewport readback.
- The same run failed wide-brush sustained proxy gates and final-drain timeouts. Neither a narrow-brush proxy pass nor successful shader compilation establishes low physical latency.
- Latest archive/scissor/persistent-readback revision is being tested in a new CI run. Do not infer its verdict from the preceding24 tests.

Evidence summaries in `evidence/run-*-summary.json` retain failed results. Full artifacts include samples, console logs and screenshots. Check the commit/tree and document dimensions before comparing iterations.

## What the measurements mean

`inputAge`: completion time minus the actual timestamp represented by the completed preview tip. `rawDistance`: current raw input versus that preview centerline. `previewQueueAge`: age of the latest pending feedback snapshot. `oldestQueueAge`: oldest non-elided confirmed work. `confirmedLag`: latest preview input versus the older of known canonical time and unfinished confirmed time. Obsolete feedback is counted separately; it need not be zero.

These are GPU completion/geometry **proxies**, not proof of compositor presentation or the optically visible outline. Viewport readback validates pixels copied for display, not photons. Screenshots and input synthesis cannot establish a real stylus's prediction behavior.

Final reference comparison retains raw RGBA errors. Alpha always keeps the3-unit gate. RGB with either alpha<8 uses a premultiplied visual comparison; other RGB keeps the original straight3-unit gate. This distinguishes low-alpha numerical quantization from meaningful density/shape/color errors without raising the threshold. Preview viewport comparison uses premultiplied RGBA.

## Production requirements still open

| Gate | State / limit |
|---|---|
| 512/1024px cumulative live latency | Earlier full-size software runs FAIL. Latest targeted revision requires new evidence; physical hardware is unverified. |
| Actual pen-to-visible-tip | UNVERIFIED. Requires GPU + pen trials, ideally filmed initial/final seconds. |
| All-preset live→confirmed fidelity | Constant-opacity/pigment density path has new coverage; variable opacity/pigment remains approximate. No all-preset human transition PASS. |
| Many ended strokes behind formal stall | New bounded GPU archive replaces the old four-stroke hard error. Twelve-stroke stalled-formal pixel/record test added; GPU outcome pending. |
| All final pixels | New v2.2 reference comparison is implemented. Eligible capsules and hard-ellipse AA are intentional semantic/AA changes; old v1 visual identity is not asserted. |
| Long GPU run |180s real-wall-clock test exists; earlier attempts failed preceding drain gates. Completion/result must be inspected, not inferred from synthetic180s Node tests. |
| 4K, 4096px brushes, many layers, memory pressure | Full-resolution sparse tiles + bounded viewport exist. Multi-layer adapter, eviction/spill and hardware pressure tests remain open;1024 confirmed tile cap. |
| Device/context loss | Error surfaced and canonical data retained; automatic renderer recreation/replay not yet wired. |
| Core integration | Buildable typed package surface exists; product layer/history/save adapter still required. |
| ibis/CSP advantage | No matched-device comparison; no superiority claim. |

Human checks on the page use ordinary Japanese: does the tip separate, does lag grow, does a512px line start chasing, does a direction change leave a strange line, does lifting jump? Record device/stylus/browser/settings and observations separately from software proxies.
