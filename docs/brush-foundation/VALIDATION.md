> Classification: EXPERIMENTAL / historical research and validation. Current authority: `docs/IMPLEMENTATION_BASELINE.md` and `docs/CANONICAL_INDEX.json`. Old stop/PASS/candidate declarations below apply to their recorded version only.

# 実機受入候補の判定 — 2026-10-04 JST

## 機械検査で確認済み

- Node 78/78 PASS
- WebGL2 full: 229比較・38性能条件 PASS
- WebGPU full: 229比較・38性能条件 PASS
- 3分間試験: 43,200 / 43,200入力保持
- WebGPU反復: 18/18 PASS
- WebGL2反復: 17/18 PASS

## 既知の未解決結果

WebGL2反復の鉛筆512px / 240Hzで、最初の1回のみ total growth +32.33ms が既存の+20ms基準を超えた。後2回はPASS。ローカルの直前版/最新版交互比較では再現しなかった。原因と再現性は未確定であり、このFAILは保持する。

## 実機で未確認

- ペン先から実画面の線までの追従
- 実ペン筆圧の自然さ
- Gペンの入り・抜き
- 表示中の線から正式線への切替が見えないこと
- 512px / 1024pxで以前の軽さを維持すること
- 7基準ブラシの描き味
- Undo / Redo / 保存 / 読み込み後の見た目

したがって現在の結論は **実機受入候補・ユーザー確認待ち**。Brush Foundation完成ではない。

# Current Foundation contract validation — 2026-10-03 UTC

Current implementation source: `6bfc95f5e8451074234b3b8a79a423833b825153`. Git tree `207aab925161989d016f113b1398d32f4733a28c` exactly matches the tested local02a5957 implementation; only commit metadata differs. Canonical HTML:526,008bytes, Git blob `036b69675d9016eafb04bac3573731d9069267fb`.

- Latest Node:78/78 PASS. Includes atomic temporary settings, symmetric pack validation, resource kinds, composed image/time/scatter examples, and an actual separate canonical worker with a registered material provider. The newest test independently asserts visible G-pen4px dots at pressures.5/.7/.9 and four subpixel offsets, unchanged finish commands and exact replay.
- Latest-source local Chromium153/SwiftShader: both backends PASS34 Foundation image/behavior comparisons and four performance conditions. New visible tap assertions pass (max alpha255), independently of CPU/GPU equality. Live/lift/confirmed/restored images remain within the existing3/255 tolerance. Evidence: `local-tap-default-*.json`, `node-tap-default.txt`.
- Independent intent check: old source25ac91e retained a4px/.7/integer-position command but painted zero pixels because its artificial entry produced diameter.403575. Actual-pressure entry now produces diameter2.6905 and12 visible CPU pixels. Finish commands remain unchanged. Archived before/after: `g-pen-tap-before-after.json`. Artificial entry remains selectable; stored presets and old records preserve their exact semantics. No coverage, shader, scheduling or command-schema edit was made for this correction.
- Latest CI [37131153403](https://github.com/totoro0419/illustro/actions/runs/37131153403) is COMPLETED. Both full jobs PASS:229 image/behavior comparisons,38/38 performance conditions and78/78 Node tests per backend. Both three-minute workloads retain43,200/43,200 inputs. Targeted WebGPU18/18 PASS; WebGL2 17/18 PASS, first pencil512/240 repetition FAIL at32.33ms total growth (15.40ms steady). Later pencil repetitions pass. The workflow overall conclusion is FAILURE because that repeat failed; the full PASS and repeat FAIL are separate results.
- All four latest raw ZIP SHA-256 digests matched GitHub. Gate arithmetic, unchanged limits, retained inputs, required samples and single submissions were independently audited; `run-37131153403-*-audit.json`. Time-window boundaries still use recorded phase counts, not independent boundary timestamps.
- Paired local WebGL2 diagnostic alternated previous25ac91e and latest6bfc95f with identical pencil512/240 inputs. Both passed3/3, all960 samples retained. The only Foundation source diff is the G-pen entry default; pencil settings/rendering/scheduling are unchanged. This diagnostic does not establish the cause of the CI variance or erase its failure. Evidence: `run-37131153403-*-targeted-audit.json`, `local-paired-webgl2-latest.json`. Repeatability remains unresolved.

## Completed full validation of source25ac91e

Source `25ac91eaf8bd741cdff8007abe268e12b88960e2`, [run37128925258](https://github.com/totoro0419/illustro/actions/runs/37128925258): SUCCESS. Both backends passed228 image/behavior comparisons,38/38 full performance conditions and18/18 targeted repeated conditions. Both three-minute workloads retained43,200/43,200 inputs. Node77/77 PASS in both CI jobs. The latest source only changes the reference G-pen entry default and adds independent visibility checks.

All four raw ZIPs were independently downloaded and SHA-256 matched GitHub. p95 values, both unchanged+20ms growth gates, required sample counts, input retention and single-submission limits were independently recomputed. Calculations use chronological sample arrays and recorded phase counts; capture-window timestamps themselves are not independently stored. Audit summaries retain this limitation in `run-37128925258-*-audit.json`.

Source25 also passed browser interaction on both backends: failed unsupported pack leaves all original settings intact, loaded names/size update, drawing recovers from invalid size, save/undo/redo/load restores pixels and canonical data, and exported packs load. Widths320/800/1200 have no horizontal overflow. Additional common-compositor audit passed16 cases per backend: solid/stamp/sweep, saturated/build-up where supported, normal/erase/multiply/screen over partially transparent colored underpaint; live/lift/confirmed/load match the reference within3/255 and replay is exact. `foundation-blend-check.mjs` is reproducible with `RT_PLAYWRIGHT_PATH`.

Previous complete source `6f72a2c19b8a1c20f4017fb6e5bf0579cee9d8b6`, [run37121144408](https://github.com/totoro0419/illustro/actions/runs/37121144408): both backends passed226 comparisons,38 full conditions and18 targeted repeats. Its raw artifacts and gate audit are retained separately.

The initially failing eraser/pencil/legacy reversal observations remain historical failures. A passing run does not erase them or certify every future runtime. Accepted baseline shader blob remains `e40effdb2802d9a3df70f928351fb389ed9d25f5`; comparison page SHA-256 remains `4886168f381fb832b3c38900e8b8ce2350bfeb52a679b648e01e4999b5bf679e`.

Static latest-source seven-brush canvas was also visually inspected after synthetic pressure curves: G/round/technical lines are continuous, marker density is uniform, pencil grain is present, and both erasers affect colored underpaint. This does not verify physical tracking or switching. The local screenshot runtime lacks Japanese glyph fonts, so Japanese text rendering is not visually certified by that capture.

Overall physical acceptance remains UNVERIFIED: natural pressure/entry/exit, imperceptible switching, and preservation of accepted tracking on the user's device. Very faint/subpixel marks, real GPU/display latency, screen reader, optional hardware sensors, device loss and memory pressure remain unverified. See `COMPLETION_CONTRACT.md` and `HUMAN_CHECKS.md`. PR10 remains Draft; no merge or overall completion is declared.

# Earlier continuation validation (historical)

Current source: `7ecdf9b4283e0d8f2b850845a7f6675f11e818f4`. Canonical HTML: `prototypes/brush-rt/dist/illustro-brush-rt.html`, 523,272 bytes, Git blob `925804bf751b4a6b9066cb5c89f59849dc89091e`. Node 72/72 PASS locally. Latest-source full CI [37119396194](https://github.com/totoro0419/illustro/actions/runs/37119396194) is IN_PROGRESS; no full PASS is declared yet.

Latest-source local Chromium 153/SwiftShader: WebGPU targeted 15/15 PASS (five conditions × three repetitions), including pencil and hard erase512/240; input counts and unchanged +20ms growth limits were recomputed. Paired WebGL2 pencil check passed candidate3/3; the handoff engine passed2/3, with one retained failure. Both restore-view checks have zero channels above3/255 after Undo/Redo and load, with exact canonical data. These local runs are not physical GPU/pen certification.

Previous complete source65e1937, [run37117836111](https://github.com/totoro0419/illustro/actions/runs/37117836111): both full backends passed222 image/behavior checks, including two additional visible-restoration checks and seven brushes × five sizes with restored viewport comparisons. WebGL2 passed38/38 proxies. WebGPU passed37/38, failing legacy fine-ink1024/240/reversal at56.30ms total growth (steady−193.70ms). Targeted WebGPU15/15 passed; WebGL2 failed first pencil repetition at32.27ms total/33.37ms steady, later two repetitions passed. Both full raw artifacts were downloaded, SHA-256 matched, and counters/gate arithmetic independently verified. No pixel/transition/input-generator/console failure occurred. This failed repetition prompted restoring accepted WebGL2 RAF cadence in the latest source; WebGPU notification suppression remains.

Earlier source26a5f86 full WebGL2 passed220/38; WebGPU passed220/37 with legacy reversal growth43.77ms FAIL. Targeted both backends15/15 passed. Local failures on original, source26 and source65 remain in evidence, including interruption from missing FontConfig. The initial hard-erase41.30ms steady failure and pencil21.17ms total failure are retained below and in the historical evidence. No threshold was relaxed.

UNVERIFIED: real stylus pressure and entry/exit feel, visible switching on the physical screen, physical GPU/display latency, high-DPI/compositor effects, optional stylus sensors, device loss and VRAM pressure. Current software-runtime repeatability also remains a separate concern; passing the latest repetition does not erase prior failures. Keep PR10 Draft and do not declare the overall Foundation accepted until these gates are resolved.

## Historical pre-continuation record

### Validation state

Accepted baseline: user-confirmed lightness/tracking, as stated in this request. No device or physical latency number was supplied. Preserve the previous branch/HTML/source for comparison.

Local Node run: 65 tests pass (42 legacy regression + 23 new Foundation tests). Covers seven brushes, deterministic replay, pressure curves, causal finish invariance, 200 taps/short strokes, absolute spacing, particles/random/texture, version/resource validation, conservative prediction, known geometry, strong stabilization, temporary settings and asynchronous newest-notification scheduling. This is not a visual/performance certification.

Current tested source: `1f7cc3e1cd6558fdcfba75e8374702ae266d01a8`. Exact built HTML blob: `bab16d11586e5d163a3f774935f0250d7b112589` (521,668 bytes), identical in both targeted CI builds and local build. Full GPU validation [37107164670](https://github.com/totoro0419/illustro/actions/runs/37107164670), attempt 1: WebGL2 passed 220 checks and all 38 performance workloads, including 180-second marker and preserved ink at 1024px/240Hz (43,200/43,200 inputs each). No recorded pixel, transition, input-generator or cumulative-proxy failures. Raw artifact 11268353070 was independently downloaded and agrees with the saved summary.

WebGPU attempt 1 was cancelled by a delayed push event for older source `582a830d1605da5f50b2aa4587617eebe76ce58d`, starting run 37108395593 at 08:03:09 UTC. Before cancellation it had completed 207 checks without recorded pixel/transition failures and all 17 Foundation proxy workloads passed, including the 180-second marker. Its raw checkpoint artifact 11268184803 and an explicitly interrupted summary are retained. Only the WebGPU full job was re-run as attempt 2 on the same source, without changing the engine or gate.

WebGPU attempt 2 completed all 220 checks without pixel/transition/input-generator/console failures and all 38 performance workloads. It remains GATE_FAIL: 37/38 proxies passed; Foundation hard eraser 512px/240Hz had start/middle/end p95 140.37/105.07/146.37ms, total growth 6.00ms but middle→end growth 41.30ms exceeding +20ms. Both 180-second workloads passed with 43,200/43,200 retained inputs. Raw artifact 11268459992 was downloaded and independently verified; `evidence/run-37107164670-attempt2-webgpu-summary.json` preserves the final report. The Foundation engine is not accepted as fully performance-complete.

Targeted feedback in attempt 1 passed four WebGL2 proxy workloads; WebGPU passed three and failed pencil at 21.17ms start→end growth against the unchanged +20ms limit. The full Foundation pencil workload instead passed at −19.13ms. Both observations are retained; a single later PASS does not erase the targeted failure. No overall GPU acceptance has yet been declared.

Earlier run 37095147652 failed cumulative proxy gates; see FAILURE_ANALYSIS.md. Run 37101405455 also failed wide pencil/soft-erase performance on both backends despite 208 passing visual comparisons each. Intermediate full runs were cancelled while targeted fixes were iterated and are not certifications. New full tests compare actual GPU viewport during input, after lift, after confirmation and CPU reference, for all seven brushes at 4/16/128/512/1024. Erase tests include real colored underpaint. Additional material tests exercise masks, image texture/filtering, scatter, variable color/opacity and phase envelopes. Each case checks undo/redo/save/load equality. Streaming wide sweep tests cover curved mutable endpoints, acute joins and reversals. Existing 56-preset and sustained tests are rerun, not copied as proof.

Human checks: compare the accepted baseline and new page on the same device. Test G-pen/round pen with weak→strong→weak pressure, small circles, S curves, reversal, taps and 2–5px strokes. Test marker/hard/soft erase at 512/1024 for at least 4 seconds. Try prediction off/on and weak/strong correction. Watch for later extension, thinning, texture appearance, tip jump or visible replacement. Use the page's Japanese checklist and export observations/results.

UNVERIFIED: new real-pen pressure/entry/exit feel, natural prediction misses, screen-level visibility of transitions, real-GPU performance regression, high-DPI/compositor latency, optional tilt/azimuth/twist hardware, device-loss recovery, temporary VRAM pressure with many unconfirmed strokes. New quality is not declared complete merely because code exists.

Pre-handoff review fixes: prevent double multiplication of solid marker opacity at final commit; select material accumulation for build-up/limited flow; shortest-arc stylus rotation; normalized material tail composites over its prefix; reject invalid browser prediction coordinates; retain release metadata without depositing paint. The final run must execute these source fixes.

Continuation audit: sweep is a new explicit renderer ID. The existing soft renderer retains ordered stamp semantics, so records saved by source b18e2b0 continue to replay. Seven actual version-3 records generated by that source are checked against the new implementation; unchanged metadata fields retain their serialization. The accepted shader file is unchanged (Git blob e40effdb2802d9a3df70f928351fb389ed9d25f5).
