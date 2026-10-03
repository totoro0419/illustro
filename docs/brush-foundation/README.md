# Illustro Brush Foundation candidate

最終目標と完成条件は [COMPLETION_CONTRACT.md](COMPLETION_CONTRACT.md)。7本の起動やCI合格だけで完成としない。実機で合格した描画方式を保ち、共通機能と将来の追加経路を検査する。

Build: `node prototypes/brush-rt/build.mjs`. Unit/replay checks: `node --test packages/brush-rt/test/*.test.mjs`. GPU checks: install Playwright/Chromium and run `RT_LONG_TEST=1 RT_BACKEND=webgl2 node prototypes/brush-rt/browser-check.mjs` (repeat for webgpu). GitHub Actions runs both backends and saves actual evidence.

The self-contained `prototypes/brush-rt/dist/illustro-brush-rt.html` can be opened directly; no server or external package is needed. The page offers seven Foundation brushes plus 56 preserved compatibility presets, size/pressure smoothing/entry/stabilization/prediction, preset import/export, document save/load/undo/redo and repeatable workload generation. Entry length, ending mode/length and Flow have explicit controls. GPU APIs still require a compatible browser/device; the browser reports failure rather than falling back to the rejected CPU raster path.

Read RESEARCH.md, ARCHITECTURE.md, SPEC.md, FAILURE_ANALYSIS.md, REQUIREMENT_COVERAGE.md and VALIDATION.md. HUMAN_CHECKS.md gives a short Japanese pen-test procedure. Baseline lightness/tracking is user-accepted. New natural entry/exit, pressure response and imperceptible transitions require the human checks in the page; automated readback is not physical presentation evidence.
