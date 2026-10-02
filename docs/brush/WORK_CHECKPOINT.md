> 再開時の注記 — 2026-10-02：これは中断時点の履歴資料です。現在の実装・測定・未完了事項は [README](README.md) と [VALIDATION](VALIDATION.md) を参照してください。前回の実装本体は回収できず、旧Git成果とこの記録から再構成しました。以前の253件の結果を現在のコードのPASS根拠にはしません。

# Brush Engine work checkpoint — blocked by execution environment disconnection

Status: **WIP / NOT PRACTICALLY COMPLETE / IMPLEMENTATION NOT YET PUBLISHED**

This branch currently records a recovery checkpoint, not a completed Brush Engine implementation.
The local implementation was built and exercised, but the execution environment disconnected before its files could be read for GitHub publication and before the final bounds correction could be applied. Do not interpret tests reported here as tests of this PR's code: the implementation is not in this PR yet.

## Repository baseline and inherited work

- Main examined: `bdc7135b51033982d90ea5dad104bb04fc107df2`.
- Brush branch: `brush/production-engine-2026-10-02`, based on main. No merge into main.
- Open work examined: PR #5 Region/Connectivity, PR #6 UI, PR #7 Raster Region, plus prior Brush validation PRs #2/#3/#4.
- Read-only inherited snapshot: `d71afd6291711ca522048e4525c86e239ee1ab48`.
- Retain Architecture V1, existing Sparse Raster/Transaction/Revision/Undo, ADR-0004 and the Performance Policy.
- Do not import the obsolete full `core/vslice-002` or Region architecture into current main.
- Retain One Euro candidate 4/4/1, Philox4x32-10, preview/canonical separation, mutable tail and the real-device protocol.
- Inherited reference code's page counters do not by themselves prove actual storage delivery or bounded total memory: device `strokeDabs` still accumulates.
- Current local Engine uses actual frozen-page sink delivery. Its active staging can be bounded, while Core/harness retained stroke records still grow with stroke length and have explicit limits.
- Older Xiaomi evidence is historical, not a PASS for the new implementation: 3 strokes, 5727 pen samples, pressure range 0.660115, tilt, 34.499s, pipeline p95 1ms, receive-to-RAF p95 17.8ms. Old user perceptual feedback is retained as historical feedback. New physical stylus, sustained thermal and human quality remain UNVERIFIED.
- Brush/Philox-only inherited tests were rerun: 14 pass. The historical 23-test suite also included Region tests.

## Local implementation created before the disconnection

The following files exist in the working environment; they have not yet been uploaded to this branch.

Workspace: `/workspace/scratch/9ba3e7d038e2/illustro`

- `packages/brush/src/types.ts`: normalized optional sensors, preset, immutable stroke, pages and sink interfaces.
- `input.ts`: actual/coalesced intake, captured document coordinates, explicit capabilities, invalid/order checks, no predicted canonical input.
- `reconstruction.ts`: continuous stabilization with true OFF, inherited 4/4/1 default, independent pressure smoothing and component-wise monotone cubic interpolation.
- `random.ts`: Philox4x32-10, independent BigInt reference and known-vector testing.
- `dynamics.ts`: curves for size/opacity/flow/spacing/rotation/scatter/aspect/grain/HSV, pressure/velocity/tilt/azimuth/twist/direction/distance/time/random, missing-sensor fallback, repeat curves.
- `engine.ts`: real frozen pages, stable prefix and end-taper mutable tail, preview without RNG/index mutation, bounded capacity failures, explicit held-airbrush exposure clock without fabricated sensor points.
- `coverage.ts`: round/ellipse/rect/bristle/star/leaf/alpha-mask tips, dual-tip coverage product, procedural/image grain.
- `raster.ts`: CPU strict sparse-tile accumulation, independent flow and per-stroke opacity cap, normal/multiply/screen/erase, isolated preview, working-budget checks. Opaque interior optimization was tested locally.
- `record.ts`: versioned JSON and geometry validity/order/resource checks.
- `coreSession.ts`: narrow integration into existing Core transactions and history. Changed blocks use existing persistence handoff.
- `presets.ts`: 56 effective definitions, 50 standard and 6 authored signature presets, 13 categories.
- `engine.test.ts`, `raster.test.ts`, fixtures, performance and benchmark utilities.
- Core edits were limited to `history.ts`, `transaction.ts`, `commit.ts` for semantic stroke operations; original root-switch Undo/Redo retained.
- `prototypes/brush-lab`: pen/mouse/touch drawing, search, size/opacity/flow/stabilization/curve/tip/grain/blend controls, JSON editing/import/export, RAW/processed/final comparisons, pressure/velocity displays, Undo/Redo/reset, actual execution metrics, test patterns and three-minute scheduled input.
- Generated single offline HTML: `prototypes/brush-lab/illustro-brush-lab.html`.
- Browser tests for mouse capture/cancel, synthetic pen, mobile sizes, touch/DPR/slow CPU, reproducibility, exact canvas replay, held airbrush, rejected corrupt import, and offline execution.
- Documents locally written: Brush README, AUDIT, COMPETITORS, SPEC, PRESETS; VALIDATION was not finished before the environment failure.
- Local new Brush CI definition exists but is not yet in this remote checkpoint.
- Baseline P0 assets and Region/Connectivity were not changed.

## Tests actually completed locally

These are results for the retained local candidate before the pending bounds correction.

| Check | Result and scope |
|---|---|
| Brush TypeScript / tests | PASS; 253 tests |
| Existing Core TypeScript / tests | PASS; 8 tests |
| Existing P0 architecture | PASS; 29 tests, typecheck and build |
| Browser workflow suite | PASS; 17 tests including the real 180-second scheduled-input run |
| Offline single HTML | PASS; one additional browser test, no HTTP requests |
| JSON reopen / different tile sizes / independent tile traversal | strict byte equality in the tested corpus |
| All 56 presets | finite/reproducible commands, size 0.15/1/4 and line/S/small-loop/long/dot patterns, pressure trajectory, 30/120/240Hz workloads |
| Human drawings with new physical pen | UNVERIFIED |
| Physical input-to-display latency | UNVERIFIED |
| Current Xiaomi/Android hardware and thermal | UNVERIFIED |
| Competitor installed-device performance/feel comparison | UNVERIFIED |
| Product GPU, OPFS, crash recovery integration | UNVERIFIED / not implemented in current main |

Playwright used actual headless Chromium 133.0.6943.0. Standard browser download failed in this environment; a packaged Chromium executable was used. The agent-browser daemon also failed, and Playwright provided executable browser verification. Japanese screenshots used Noto Sans JP installed only for inspection, not as a shipped app dependency.

The browser software mobile check used 390×844, DPR 2.75, touch and CPU throttle 4. This is not physical Android certification.

## Current measured performance

Local JSONs and screenshots remain in `docs/brush/evidence` in the disconnected workspace. Numbers below are transcribed checkpoint summaries, not replacement raw sample distributions.

100000 input samples: all accepted. Node's five measured 32-sample batch p95s were approximately 0.093 / 0.056 / 0.059 / 0.073 / 0.083 ms; their largest observed batch was approximately 2.599 ms. Chromium p95 was approximately 0.1 ms, max 5.3 ms, release 1.5 ms. These measure reconstruction/deposition, not physical pen latency and not total rendering.

CPU strict materialization for a whole synthetic 100-point stroke on 512×320:

| Case | Node whole-stroke p95 ms | Chromium whole-stroke p95 ms | Chromium per-dab p95 ms |
|---|---:|---:|---:|
| Round 2px | 9.59 | 13.2 | timer resolution limited |
| Round 16px | 4.15 | 4.8 | 0.1 |
| Round 128px | 21.27 | 20.7 | 1.3 |
| Round 512px | 38.29 | 51.6 | 10.3 |
| Dry texture 48px | 26.81 | 25.3 | 0.4 |
| Dense star stamp 32px | 88.11 | 81.3 | 0.3 |
| Pressure line 12px | 5.40 | 8.0 | 0.1 |
| Signature hair 32px | 15.85 | 15.4 | 0.2 |

Whole-stroke replay cost is not a per-frame cost. Conversely, a 10.3ms per-dab p95 for a very large brush is already concerning for 120Hz before UI/renderer work. These are not a broad performance PASS. Frame/pixel-budget-aware scheduling and GPU evaluation remain necessary.

Three-minute scheduled browser input: 180007ms, 43197 samples, 36 strokes, zero recorded errors; processing p95 about 0.1ms, preview/render callback p95 about 0.6ms, release p95 about 0.3ms, active raster peak 4243456 bytes. No frame intervals over25ms in the retained 4096-frame telemetry ring. This is a simulated regular 240Hz source and approximately 60Hz browser scheduling, not physical 240Hz display testing.

Browser heap reporting was coarse and stayed at 10000000 in snapshots; it cannot establish precise allocation or absence of leaks. Node forced-GC retained heap was about 10.24MB versus initial 12.73MB for a sink-discard workload. Automatic-GC observer events reached about 9.73ms across the entire benchmark. Saved history growth and preview copies are separate from active staging. There is no allocation-free or GC-free claim.

Stabilization synthetic 120Hz stationary noise: RMS error approximately 0.300 / 0.232 / 0.166 / 0.128 / 0.117px for strengths 0 / 0.15 / 0.5 / 0.85 / 1. Small-loop RMS error was 0.300 / 0.283 / 0.279 / 0.299 / 0.312px. Stronger correction improves stationary jitter but can worsen small shapes; it is not universally preferable.

## Initial and signature pens

Standard uses cover rough/draft, fine/dynamic/comic/soft line, pencil/mechanical/colored/side pencil, marker/felt, round/flat/rake/dry brushes, opaque/transparent painting, airbrush, soft-paint blur appearance, shadow/light/skin/hair/background, texture, effects, dots/patterns and erasers.

Signature pens:
- 絹糸: nonlinear pressure changes both width and ellipse aspect to move between line and area.
- 束ね: bristle + secondary ellipse + taper for multiple hair strands.
- 芽吹き: pressure reduces paper grain while increasing rough-line density.
- 影織り: pressure moves hatching toward a denser multiply shadow.
- 彩層: bristle, paper grain and small deterministic HSV variations.
- 星脈: repeating distance curve changes the star size along a decorative stroke.

Distinct effective parameter definitions and deterministic replay passed; artist usefulness and natural feel remain UNVERIFIED. Watercolor/oil/blur labels refer to appearances; no wet physics, actual existing-pixel blur, smudge or paint mixing is claimed.

## Official competitor research

- [Clip Studio Paint](https://help.clip-studio.com/en-us/manual_en/240_brushes/Customizing_brush_tools.htm)
- [Procreate settings](https://help.procreate.com/procreate/handbook/brushes/brush-studio-settings) and [library](https://help.procreate.com/procreate/handbook/brushes/brush-library)
- [ibisPaint parameters](https://ibispaint.com/lecture/index.jsp?lang=en&no=118)
- [Photoshop dynamics](https://helpx.adobe.com/photoshop/using/adding-dynamic-elements-brushes.html) and [texture/dual](https://helpx.adobe.com/photoshop/using/creating-textured-brushes.html)
- [Krita brush engines](https://docs.krita.org/en/reference_manual/brushes/brush_engines.html), [smoothing](https://docs.krita.org/en/reference_manual/tools/freehand_brush.html), [sensors](https://docs.krita.org/en/reference_manual/brushes/brush_settings/options.html)
- [Affinity Photo 2 brush modification](https://affinity.help/photo2/English.lproj/pages/Painting/pixel_modify.html)
- [1 Euro author source](https://gery.casiez.net/1euro/)

The local candidate shares many basic parameter categories with these products. It has not demonstrated superior drawing feel, speed or stability versus them. Feature-category overlap is not output-quality equivalence. Its weaker areas include CPU large-footprint drawing, product brush-editing/resource management, independent dual engines/mixing and device validation. Current exact default brush counts across all six applications were not independently installed and counted.

## Pending correction discovered during final inspection

**Rotated rect/bristle/mask tip bounds can be clipped.** The local `dabBounds` still used radius+1. A rotated rectangular corner may extend beyond this. Extremely narrow-tip normalized antialiasing support also needs conservative bounds.

Required correction:
1. Compute rotated support extents for rectangular tips; retain efficient ellipse bounds for circular/elliptic tips.
2. Include antialiasing support and fractional-dot support conservatively.
3. Add an independent regression: a 40px square rotated45 degrees must cover a pixel around 26px along the horizontal axis, beyond the old21px radius bound.
4. Rebuild, rerun Brush/Core and browser regressions, regenerate atlas and performance evidence.
5. Do not call this pending fix complete based on the earlier tests.

## Recovery and next actions

The execution service returned:
`environment registry request failed (409 Conflict, environment_offline): Environment is not connected.`
An older exec session also reported transport disconnected and recovery timeout. This is not an automatic approval rejection.

When the workspace is reachable:
1. Recover the existing implementation; do not redesign it from scratch.
2. Inspect any queued/partially applied VALIDATION patch and remove the unrelated generated P0 lockfile from the staged set.
3. Apply and test the bounds fix above.
4. Finish VALIDATION with 20 completion-condition statuses, known limits and a new-device protocol.
5. Recheck the last source/standalone output and baseline main/head before publication.
6. Read changed UTF-8 files and binary evidence, then publish them atomically using GitHub tree/commit/ref tools. CLI git push had no credentials; GitHub connector branch creation worked.
7. Update this Draft PR from checkpoint-only to the actual implementation diff. Keep main unmerged and leave Region/Connectivity branches independent.
8. Run current physical pen/sustained/human comparisons before claiming practical completion. The old Xiaomi PASS must not substitute for this.
9. Renderer follow-up: GPU/CPU conformance, bounded per-frame deposition scheduling, large brush/texture throughput, preview-cache cost, and product UI integration.
10. Persistence follow-up: packed stroke resources, disk spill/checkpoint policy, OPFS/.illustro integration and real crash/recovery tests.

Until these steps are done, the user's requested completion conditions are not satisfied.
