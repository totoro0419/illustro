# Validation / promotion gates

This is a new candidate, not a production completion claim. Prior brush test reports are not evidence for it.

## Independently executed locally

- New Node suite: 15 tests passed (see `evidence/node-tests.txt`). All 56 preset objects preserve their settings; raw input, sensors, deterministic replay, prediction isolation, timestamp validation and tamper rejection were checked.
- Same constant-speed input at 60/120/240/480Hz checks bounded local fitting without positional phase lag. Alternating jitter test verifies smoothing, not just function execution.
- 180-second **simulated** input at 16/128/512/1024px and 60/120/240/480Hz retains all input and verifies the capacity-one mailbox. This is not a GPU benchmark or real 3-minute wall-clock pen test.
- Stalled fake GPU test confirms only one outstanding live submission and next submission uses input 999 rather than 1…998. This validates scheduling logic only.
- Syntax checks / self-contained HTML build executed with Node 24, using its TypeScript stripping for evaluated legacy requirements (preset validation/dynamics/coverage); old engine, One-Euro, raster and queue are not imported by realtime code.

## Browser execution

Local browser installation failed with a truncated download; the cloud browser disallows local HTTP/file navigation. No local GPU PASS is claimed. A separate GitHub workflow runs new shader, pixel, mouse, undo, all-preset, blend, mobile, 4-second and 180-second tests and preserves results even on failure. Evidence from that run must be inspected before promoting these statuses.

GPU completion metrics are named `gpu-complete-proxy`. They do not assert that the compositor presented that content, or that the user saw it. `rawDistance` compares current real input with the submitted/completed preview's centerline. It is **not** an optical measurement of the visible outline. Software tests/screenshot checks complement, never replace, the real stylus gate.

## Still required for production

| Gate | Current requirement / limit |
|---|---|
| Physical pen-to-visible-tip at 512/1024px | UNVERIFIED until matched real GPU + pen tests; measure initial/final seconds with camera if possible. |
| GPU shader / final pixel equivalence | GitHub browser run pending. Float32 math and 8-bit image masks allow small numeric differences; >3 channel units is flagged. |
| Preview-to-confirmed transition | UNVERIFIED for all 56 presets; MAX preview accumulation approximates flow and varying pigment. It must be reviewed for visible shape/density changes. |
| Many quick strokes while confirmed work is stalled | Four unfinished preview strokes currently staged. Beyond that the candidate reports capacity failure and keeps canonical data; this does NOT meet production's continuous-operation requirement. |
| Canonical reference fidelity | New v2 reference is independently compared to GPU. Eligible hard round strokes intentionally use continuous capsules rather than legacy stamp union. V1 visual identity is not claimed; complete per-preset visual review remains open. |
| 4K full-coverage / many layers / VRAM | Sparse confirmed tiles and viewport feedback are implemented; no multi-layer adapter or memory-pressure eviction/spill yet. 1024 tile cap; transient float stroke tiles can be expensive. |
| Device/context loss | Error surfaced; canonical records are exportable. Automatic renderer recreation/replay is not yet wired to product lifecycle. |
| Illustro core integration | Integration interfaces exist; layer/history/save adapter to the current core package remains required. |
| ibis/CSP superiority | No matched-device comparison; no speed superiority claim. |

The page uses ordinary Japanese for device checks. Record device, stylus, browser, brush/width/opacity/correction and test duration. Review tip separation, growing lag, direction reversal, pen lift and final shape/density. Keep those observations separate from numerical software proxies.
