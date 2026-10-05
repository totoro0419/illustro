# 現在保持する未解決FAIL — 2026-10-04 JST

受入候補固定時点で削除してはいけない未解決結果は次の1件。

- CI run `37131153403`
- WebGL2 targeted repeat
- Foundation pencil
- 512px / 240Hz
- 1回目: start 152.73ms / middle 169.67ms / end 185.07ms
- total growth: +32.33ms → FAIL（既存基準 +20ms）
- steady growth: +15.40ms → PASS
- 2回目・3回目: PASS
- 960/960入力保持
- ローカル交互比較: 最新版3/3 PASS、直前版3/3 PASS
- 原因: 未確定
- 再現性: 未確定

この結果だけを消すための基準緩和、同一試験の無期限反復、大規模Renderer変更は行わない。実機で具体的な問題が確認された場合にのみ、その問題へ戻る。

# Failure analysis

Past failures remain relevant regression cases, not design templates: CPU pixel scanning scales with brush area; full raster clones and image transfers delay presentation; a raster or GPU preview FIFO makes latest position wait behind obsolete work; truncated stamp publication makes thin pencil dotted until later catch-up. The accepted engine already removed those causes. Foundation preserves its capacity-one display notification and append-only scene geometry.

Inspection found two quality hazards in the accepted baseline: (1) distance-to-end taper changes width only after lift; (2) MAX preview cannot reproduce ordered cap accumulation with varying opacity/pigment. New Foundation presets use causal envelopes and an explicit normalized material algebra common to live and confirmed drawing. The old 56 presets are preserved rather than secretly changing their saved appearance. Their legacy variable-opacity/pigment preview limitation is not a claim of Foundation visual PASS.

Universal stamp replacement and LOD preview were rejected before implementation because they risk accepted speed or visible refinement. A full future endpoint cannot be inferred causally: pressure release is used live; known-end fade requires geometry supplied in advance. The implementation deliberately does not extend a stroke after pointerup merely to manufacture a point.

Software GPU test failures and subsequent fixes are recorded in VALIDATION.md with run IDs. Do not infer pen-to-photon improvement from API submission, handler time or a software rendering PASS.

An initial Foundation draft incorrectly reused the material opacity factor for solid capsules, which would apply marker opacity twice at confirmation. Review caught this before publication; solid caps now apply opacity once, with a dedicated regression and actual transition readback. Color-varying material tails also required chronological source-over order instead of the legacy constant-color equivalent. Continuous build-up/limited-flow settings are sent to the material path, because MAX capsules cannot implement additive deposition.

Actual run [37095147652](https://github.com/totoro0419/illustro/actions/runs/37095147652), source b18e2b0: WebGL2 recorded 159 visual checks without pixel/transition failures, but the cumulative proxy Gate failed. Soft erase 512px/240Hz start→end was 348.4→658.9ms; pencil also failed the steady-window check. A last stamp timestamp may age while spatial spacing is not due, so sparse stamp centers are not acceptable as the continuous-brush tip. New sweep/soft coverage updates the latest contact every input, bounds its geometric reduction to 0.05px, and retains all artwork input. Performance is rerun rather than excusing the failure. Pressure-step workloads also change actual brush width midway; sustained growth comparisons now use fixed-pressure geometry, while abrupt pressure remains in visual regressions. The old failed results remain evidence, not PASS.

The prior WebGL2 failure artifact (11264386714) was independently downloaded during continuation. Its 159 visual checks, zero transition/pixel failures and three failing cumulative proxy workloads were verified from the raw report. A summary retaining every check and benchmark except per-frame samples/full preset copies is stored in `evidence/run-37095147652-webgl2-summary.json`; original samples remain in the GitHub artifact.


Second full run [37101405455](https://github.com/totoro0419/illustro/actions/runs/37101405455), source `25cebb3745024122129c14f0cb07630846c94768`: both backends completed 208 visual checks without detected pixel/transition failures and 38 performance workloads. Performance Gate failed. WebGL2 512px pencil grew 379.2→1852.5ms; soft erase had too few completed frames. WebGPU pencil grew 418.8→4398.8ms and soft erase 453.6→8209.9ms. These are severe accumulation failures, not an acceptable software-GPU exception. Both downloaded raw artifacts are summarized in `evidence/run-37101405455-*-summary.json`; per-frame samples remain in artifacts 11266052970/11266018331.

The sweep continuity fix preserved every segment but still repeatedly rasterized complete, highly overlapping wide capsule bounds. The follow-up uses exact-coverage strip/outside-wedge meshes for constant paper-fixed sweep sections and postpones formal work during the active union stroke. A new streaming GPU test exercises mutable endpoints, acute joins, reversals and caps; no simplified material or lower-resolution preview is substituted. Shader warm-up runs tiny strokes through actual live/formal pipelines before input is enabled, then clears all document/history/raw-input/measurement state. Accepted baseline shader code remains byte-for-byte preserved.

Long-test reporting now also records its comparison window. A recurring path has a 4-second period, so workloads of at least 8 seconds compare complete 4-second periods (initial, next, final) rather than different one-second path phases. Short tests retain one-second windows, the +20ms growth limits and minimum sample counts remain unchanged, and the earlier failure is retained. This measurement correction is distinct from the overdraw fix and is not evidence of improved physical latency. First-use shader startup is prevented by explicit warm-up, not discarded from an already-running stroke.


Targeted feedback in run 37103598301 stopped after 29 comparisons because its new reversal assertion incorrectly required more than one stable segment. A straight reversal legitimately retains one published segment and one mutable endpoint; both GPU images agreed with independent reference (maximum 1/255 difference, no channel error above 3/255). The assertion now requires a nonempty prefix and still verifies all 96 retained inputs and the full image. The run was cancelled and the same engine artifact is rerun in 37103851111. This test defect is not a performance PASS.


Run 37103851111 targeted feedback: both backends passed 31 visual comparisons, including streaming 512px pencil/soft erase. WebGL2 passed all four proxy workloads; pencil start→end grew only 1.6ms and soft erase decreased 1.7ms. WebGPU still failed: pencil growth 282.3ms, soft erase 493.2ms. Prefix joint tessellation allocated the same number of sectors to a tiny bend as to a half-circle. The next candidate bounds each batch's sectors by its actual maximum joint angle and the conservative chord radius (r+2px must remain outside r+0.5px). Straight/smooth joins use one sector; acute joins still receive the required subdivisions. Coverage, resolution, texture and canonical inputs are unchanged.

Subsequent targeted runs remained diagnostic, not full certifications. Adaptive sectors (37104490796) passed WebGL2 but WebGPU pencil/soft erase still grew 351.2/379.0ms. Dedicated sweep coverage (37105009007) reduced WebGPU pencil growth to −2.6ms; soft erase still failed at 23.1ms. A texture-free sweep fragment (37105342912) left soft erase growth at 31.7ms; CPU submission was around 1ms while GPU work was around 150–230ms. This pointed to GPU composition and submission cadence rather than discarded canonical input.

The direct union compositor and completion-driven preview pump (37106185836) passed the four WebGPU targeted proxies, with pencil/soft erase growth 14.1/−45.8ms. Applying the pump to WebGL2 regressed pencil growth to 52.1ms, so the current source restricts it to WebGPU. A new asynchronous backend test checks newest-notification consumption, no overlapping submissions and unchanged formal geometry.

Current source `1f7cc3e1cd6558fdcfba75e8374702ae266d01a8`, run [37107164670](https://github.com/totoro0419/illustro/actions/runs/37107164670): all four WebGL2 targeted proxies passed. WebGPU soft erase, marker and preserved ink passed; pencil grew 142.3→163.5ms (21.17ms), exceeding the unchanged +20ms gate. Its middle→end growth was −1.13ms. This is still recorded as a failed gate, not rounded into PASS. Full visual/sustained validation is required separately. Exact built HTML is blob `bab16d11586e5d163a3f774935f0250d7b112589`, independently identical in both targeted jobs and the local build.

Full attempt 1: WebGL2 passed 220 checks/38 proxy workloads. WebGPU completed 207 checks and 17 Foundation proxy workloads (all passed) before cancellation. A delayed older-source push started run 37108395593 at 08:03:09 UTC, and the workflow's shared concurrency group cancelled the newer-source job at 08:03:23. This was execution interruption, not a shader failure or full PASS. The checkpoint and source identity are retained; only the cancelled WebGPU job was re-run, without an engine or threshold change.

Attempt 2 completed WebGPU's 220 checks and 38 proxies. Pixel/transition/input-generator/console errors were zero. One proxy still failed: Foundation hard eraser 512px/240Hz, start/middle/end p95 140.37/105.07/146.37ms. Total growth was 6.00ms, but the unchanged middle→end gate failed at 41.30ms. Both 180-second workloads passed with all 43,200 inputs retained. The targeted pencil failure (21.17ms total growth) remains a separate retained observation. These two unresolved cases, repeatability and real-device verification are the next performance work; no threshold was loosened to obtain PASS.


## Continuation on 2026-10-03

Raw previous failure artifact 11268459992 was independently downloaded again: hard eraser 512px/240Hz had 41.30ms middle→end growth with correct canonical inputs. CPU submission was around 0.7–1.2ms while GPU work was roughly 52–65ms. The existing direct MAX union compositor applied only to sweep; solid Foundation ink/marker/hard erase still passed through additional composition and could submit formal work while active. Source 26a5f86 expands that existing exact compositor and completion-driven newest-preview scheduling by Foundation capabilities, with no brush-name branch, material downgrade, accepted-shader change or threshold change.

Run 37111369583 on 26a5f86: both targeted backends passed all 15 workloads (five conditions × three repeats), including hard erase and pencil 512px/240Hz. Full WebGL2 passed 220 checks/38 proxies. Full WebGPU passed all 220 checks and 37/38 proxies; preserved fine-ink 1024px/240Hz/reversal grew 43.77ms start→end, so the overall gate still failed. The complete failure is retained in evidence/run-37111369583-webgpu-summary.json and raw artifact 11270610951 (download SHA-256 independently matched). A later PASS must not erase it.

The local Chromium 153 software-GPU run differs from CI Chromium 151. Baseline and candidate repetitions also had failures outside the two original brush conditions. Local source 26a5f86 full retained 220 passing visual checks but five failed proxies, including hard erase (89.37ms total / 102.23ms steady growth). These are recorded as failures, not explained away as physical-GPU performance or certified PASS. One initial local run crashed with missing FontConfig configuration; its incomplete checkpoint is retained separately and the successful execution used system FontConfig.

Foundation without prediction re-published identical actual geometry on every RAF. That can occupy the one GPU slot just before fresh input arrives. Source 65e1937 publishes actual changes immediately and coalesces idle WebGPU submission after the input batch, while retaining the existing time update for prediction. Node scheduling tests verify every canonical command, newest notification and single in-flight submission; legacy input update cadence is unchanged.

An independent 1:1 viewport check found an existing restoration defect in both backends: undo/redo and save/load preserved canonical data, but the canvas had zero painted pixels although the reference had 2,349. Both GPU compositors ran inside previewBatches, which returned no batch when a rebuilt document had no live strokes. Source 65e1937 emits one empty non-archive batch, allowing dirty committed tiles to be composed. The same independent check now has 2,349 visible pixels and zero channels above 3/255 error after redo and load on both backends. Before/after evidence is retained. Full regression now checks restored GPU viewport pixels for all seven brushes at all five sizes; JSON equality alone no longer establishes visible restoration.


Source 65e1937 local three-repeat WebGPU targeted run passed 12/15 gates and failed two pencil steady-growth observations (48.23ms, 22.33ms) and one hard-erase total/steady observation (92.53ms / 94.97ms). A separate local visual run passed 31 comparisons but its pencil steady growth failed at 20.83ms. Input count remained 960/960 and the latest display had one submission in flight. Raw failing frames show CPU submission around 0.5–3.6ms, while completion-work elapsed times sometimes spike above 100ms. This excludes dropped input and overlapping application submissions as explanations for these specific observations; it does not establish the reason for the runtime variance or a physical-device PASS. Both summaries are retained.

Run 37117836111 targeted feedback on the same source passed WebGPU 15/15, including three repetitions of the original hard-erase and pencil conditions. WebGL2 passed 14/15; first pencil grew 32.27ms total and 33.37ms steady, later repetitions passed. This is an unresolved repeatability gate, not rounded or removed. The local runtime and CI differ, and successful CI is reported separately from local failures.


Paired local WebGL2 diagnostic alternated original handoff and source65 pencil512/240 runs, with no concurrent local GPU task. Original handoff passed 3/3; source65 passed 2/3 and failed one at 35.50ms total / 24.03ms steady. This does not by itself prove causation, but combined with the CI first-repeat regression, preserving WebGL2's accepted notification cadence is the smaller and more conservative change. The subsequent source restricts unchanged-RAF suppression to immediatePreview WebGPU, and adds a Node assertion for unchanged WebGL2 cadence. Prediction and original 56-preset cadence remain unchanged. The viewport restoration fix remains enabled for both backends.

After restoring WebGL2 cadence, the paired local test passed candidate 3/3; original handoff passed 2/3 and failed once at 20.43ms total / 34.73ms steady. This confirms runtime repeatability remains unresolved, and prevents attributing every short-run failure exclusively to the notification change. The conservative restoration still minimizes scope and preserves the previously accepted cadence. Node now passes 72/72 and both restoration viewports remain exact within 3/255.

Final conservative source 7ecdf9b4283e0d8f2b850845a7f6675f11e818f4 preserves WebGL2 cadence and passed local WebGPU 15/15 targeted gates (five workloads × three repetitions), including hard erase and pencil512/240. All 960 inputs per workload were retained; gate arithmetic and minimum samples were independently recomputed. The earlier failures remain recorded, so this is a latest-run targeted PASS, not evidence that software-runtime repeatability or physical latency is fully solved.

Run37117836111 full source65e1937 passed222 checks on each backend, including every restored viewport. WebGL2 passed38/38 proxies. WebGPU passed37/38; legacy fine-ink1024/240/reversal again failed total growth56.30ms, with steady growth−193.70ms. The handoff raw report for the same condition had total−35.13ms/steady−55.87ms PASS. The compatibility branch itself retains legacy scheduling/material math; paired same-runtime comparison is required before attributing this changed performance to a specific source edit. Both raw artifacts and the failure are retained.

The local Chromium153/SwiftShader paired legacy reversal diagnostic used the same1024px/240Hz/5s/predictionON/confirmDelay100 condition, alternating original handoff and source7ec. Both passed3/3 with1200/1200 canonical inputs each; no source-dependent regression was reproduced there. This does not erase the two CI Chromium151 failures or establish their cause. A broad compatibility-renderer redesign is not justified by this evidence; the final full source test and physical GPU check remain necessary.


## Reference G-pen tap visibility

A new independent intent check found a missed quality defect despite matching CPU/GPU images: source25ac91e G-pen at4px, pressure0.7, integer position20/20 retained one canonical command but painted zero pixels. The default artificial entry multiplied its first diameter by0.15, producing0.403575px; the existing capsule coverage yielded zero at all neighboring pixel centers. Command retention and CPU/GPU equality did not prove visible tap behavior.

The reference G-pen now defaults to actual pressure for entry as well as ending. Artificial distance entry remains an explicit user-selectable shared setting. No coverage function, GPU shader, scheduling, command schema, or stored preset semantics changed. The same case now paints visible pixels immediately and finish does not alter its commands. `evidence/g-pen-tap-before-after.json` retains the prior failure and current result. The new Node check covers ordinary pressures0.5/0.7/0.9 and four subpixel offsets, and both GPU checks independently assert a visible4px tap. Very faint/subpixel settings and physical perception still need human evaluation; this change does not claim arbitrary microscopic marks are always perceptible.


## Latest repeatability observation

Run37131153403 source6bfc95f targeted WebGPU passed18/18. WebGL2 passed17/18; first Foundation pencil512px/240Hz repetition had p95 start152.73/middle169.67/end185.07ms: total growth32.33ms FAIL, steady15.40ms PASS. Subsequent pencil repetitions passed. All960 inputs survived and every completed sample had one submission in flight. Both raw artifact ZIP digests and arithmetic were independently checked; `run-37131153403-webgl2-targeted-audit.json` retains the failed case. GPU work in that observation rose from roughly117–134ms in its first samples to150–169ms in its last samples. This does not identify a cause.

A fresh local Chromium153/SwiftShader paired diagnostic alternated source25ac91e and latest6bfc95f. Both passed3/3, with960/960 retained inputs each, unchanged gates and no page errors. The source difference changes only reference G-pen entry and adds independent visible-tap tests; pencil settings and rendering/scheduling are unchanged. A source-dependent pencil regression was not reproduced in that local comparison. The CI failure and earlier software-runtime variance remain unresolved; neither warm-up exclusions nor threshold changes were used to turn it into PASS.


Completed full jobs of the same latest source37131153403 passed229 image/behavior comparisons and38/38 performance conditions on both backends, with78/78 Node tests and43,200/43,200 inputs in each three-minute workload. All four latest raw ZIP digests, gate arithmetic, retention and single submissions were audited. The overall workflow still concludes FAILURE from the retained WebGL2 targeted pencil repetition. Full-job PASS does not resolve that repeatability observation or establish physical-device acceptance.
