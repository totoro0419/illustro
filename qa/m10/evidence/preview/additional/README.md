# M10 supplemental verification

Source commit: `4617cdaef94a135752c0fa122741f11c2d7aff55`.
Baseline: `4708ffe5136ad1fa47be5909c129bb5f8fcb7869`.

`matched-sustained.json` uses the unchanged repository script `scripts/m10-preview-review.mjs`: 4000x4000, 6400%, thin G-pen / pencil, A/B/C/D, WebGL2/WebGPU, twelve strokes and seventeen inputs per stroke. Browser: Chromium 141.0.7390.37, SwiftShader, 390x644 CSS, DPR3. The same browser and GPU configuration was used within every baseline/current pair. This is a separate environment from GitHub CI; do not mix their timings. The two baseline pencil cases reached the existing overlay memory limit and remain recorded as failures.

Reproduce with `M10_SIZES=4000 M10_ZOOMS=64 M10_BRUSHES=thin,pencil M10_STROKES=12 M10_POINTS=17`, `M10_BEFORE_ROOT` pointing to the compiled immutable baseline, and `EXPECTED_COMMIT_SHA` set to the source commit. Set `RT_PLAYWRIGHT_PATH` to Playwright 1.56.1, then run `node scripts/m10-preview-review.mjs`.

CPU upload and GPU completion are different latency proxies. Formal completion includes animation-frame acknowledgement polling. First display without a live timing sample is explicitly an upper bound. No physical display latency or VRAM claim is made. Some pointer-up-to-formal intervals grow while input tracking improves; the complete twelve-stroke duration must also be considered.

`published-mirror-review.json` tests the HTML, manifest, service worker and all seven assets downloaded from the published M10 app. They were served locally with the original `/qa/m10/app/` path. The DOM commit and requested backend were asserted; brush CRUD, settings reload, export, drawing, Undo and Redo passed on both software GPU backends. This verifies the published artifact, not a live original-origin session.

`public-origin-check.json` records the original-origin limits separately: the cloud browser lacks required GPU features, and the worker browser could not validate the proxy certificate. TLS validation was not bypassed. The original page, twenty QA items and source commit were observed. Actual public-origin drawing on a physical smartphone/tablet remains USER REVIEW REQUIRED.

These records do not accept all of M10 and do not authorize M11.
