# Stroke-native Connectivity validation

Prototype only; no Production integration or merge. Both endpoint↔endpoint and endpoint↔stroke-interior are implemented. No Closed/Open or Fill grading is performed here.

## Quick human review (default)

Open `interactive-connectivity-standalone.html` in a browser. No server is required.

1. Draw several strokes. Connection sites automatically share a color and group number. Endpoint numbers remain readable; an interior attachment has a diamond, target line number and position. Distinct junctions on one stroke retain different colors. Dashed `?` connectors retain ambiguity.
2. Type unacceptable false joins, missed joins, incorrect junction positions, or other defects into the memo below. Endpoint/group/line numbers are useful, but no structured pair selection is required.
3. Press **記録して次の試験**. The strokes, displayed groups, connection geometry, model scores, input provenance and memo are saved together; the next canvas is empty. **前の絵を戻す** recovers the previous drawing and its memo. Recording an edited previous trial updates that trial rather than duplicating it.
4. Repeat, then **全試験を書き出す**. Send the JSON for defect analysis.

Interrupted drawings and notes are locally preserved on normal reload. A saving error keeps the current work on screen and offers JSON export. Memo-only feedback is a blocking-defect report; blank memos do not mean the automatic graph is correct. Quick review produces no fabricated Precision/Recall/F1.

Optional complete-truth scoring remains under **詳しく採点する（必要な場合のみ）**. It supports endpoint pairs and endpoint-to-interior targets and only computes accuracy after explicit complete post-drawing labels. Default automatic color preview is exposed before annotation and is recorded as such. This is not blind labeling.

## Connection-point rule

For an accepted endpoint pair, if one robust outward extension meets actual original segments near the other endpoint, that intersection is the join point. Collinear continuation attaches to the first actual ink point. If neither single extension reaches the other stroke, the endpoints are linked directly; a crossing of two hypothetical extensions is not the join point. The actual connector is used in crossing-conflict checks, and interior intersection anchors split the target stroke spans. This geometry policy does not by itself infer a new accepted connection.

The current implementation report is `CONNECTIVITY_QUICK_REVIEW_REPORT_2026-10-01.md`. Actual finger/pen precision and the latest UI's browser rendering remain unverified; use the report's explicit evidence scopes.

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
