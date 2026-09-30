# Stroke-native Connectivity validation

Prototype only; no Production integration or merge. Both endpoint↔endpoint and endpoint↔stroke-interior are implemented. No Closed/Open or Fill grading is performed here.

## Human evaluation

Open `interactive-connectivity-standalone.html` in a browser (no server/module dependencies). Choose width and round/butt/square cap; draw with pen/finger/mouse. Endpoint numbers appear. After looking at the completed linework:

1. Choose **正解を指定**.
2. For endpoint pairs, tap two endpoints or choose their numbers.
3. For a T junction or similar, tap an endpoint and the other line's interior; overlapping targets can instead be specified with source endpoint, target line and position from its start in percent.
4. Confirm all actual connections have been reviewed, then **この正解で採点**. Unselected pairs/attachments are absent connections.
5. **この絵の採点を記録**; clear the canvas and repeat. Export JSON after several independent drawings. Records survive normal reload when browser local storage is available. If saving fails, export is still possible.

Include T/Y/crossing vicinity, curve attachments, variable widths, near-but-separated targets, dense linework, short gaps, continuation/corners, parallel closed tips and deliberately open parallel boundaries, fast/rough/jittery endpoints. Use actual finger and pen sessions separately. The current report contains **zero actual human native-stroke truth records**; automated pointer events only verify the UI.

## Recompute evidence

From `prototypes/v2-validation`:

```sh
npm test
node connectivity/synthetic-connectivity-benchmark.mjs
node connectivity/expanded-connectivity-benchmark.mjs
node connectivity/segment-connectivity-benchmark.mjs
node connectivity/benchmark-connectivity-performance.mjs
node connectivity/build-connectivity-standalone.mjs
npm run test:browser -- connectivity/interactive-connectivity.spec.js
node connectivity/evaluate-connectivity-records.mjs user-records.json
```

The first two endpoint fixture sets deliberately use `endpointToSegment:false` to preserve their historical endpoint-only ground truth. The new segment corpus and evaluator use both kinds by default. This distinction prevents treating unlabelled T attachments as a silent endpoint-only accuracy success.

`ILLUSTRO_TEST_BROWSER=/absolute/path/to/chrome` can supply a validation browser executable if the package's default Chromium download is unavailable. Browser evidence in this run uses Playwright 1.63.0 with Chromium 134 via this override. This is not a test of the latest browser or Android.

See `ENDPOINT_CONNECTIVITY_SPEC.md`, `STROKE_DATA_AUDIT_2026-09-30.md`, `CONNECTIVITY_VALIDATION_REPORT_2026-09-30.md`, and `../results/stroke-segment-connectivity-synthetic.json`. Generated confidence is not a calibrated probability. Passing regression tests includes **preserving and reporting known accuracy failures**, not declaring them solved.
