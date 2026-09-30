# Stroke Connectivity validation / 2026-09-30

Validation-stage implementation and measured evidence. **Not Production-ready, not merged, not a high-accuracy claim.** GitHub PR #5 was independently read as Draft/unmerged before editing.

## Actual scope and changes

Native endpoints remain explicit IDs; interior targets are now fully implemented peer candidates. T/Y contacts, curves, changing widths, mixed widths and round/butt/square caps are measured. Candidate competition is shared between endpoint and segment targets. Typed edges retain target geometry, scores, reasons and ambiguity; interior anchors split stroke spans for future boundary-graph consumption. Manual connect/cut works for both target kinds, outside normal automatic search.

Repairs include terminal-width contact, actual cap footprint distance, null metadata, no fabricated dot endpoints, unique identity validation, actual-contact-only junction bypass, withholding high-score ties, short forward-ray Corner evidence, competition/connector conflicts, full missed-generation metrics, trusted/untrusted capture provenance, segment label matching, and independent recomputation of exported evaluations. No raster Region code or packages/core implementation changed.

## Measured comparison: 24 combined fixtures

This compares the **current endpoint-only ablation** against the combined resolver on the same declared fixture labels. It is not a measurement of user pen accuracy or a direct A/B test of the inherited c4e29fb commit.

| Condition | TP | FP | FN | Precision | Recall | F1 | Exact graphs |
|---|---:|---:|---:|---:|---:|---:|---:|
| Endpoint-only ablation | 3 | 4 | 25 | 42.86% | 10.71% | 17.14% | 5/24 |
| Endpoint + segment | 28 | 4 | 0 | 87.50% | 100% | 93.33% | 22/24 |

The 864 scale/rotation/input-order/point-reversal variants preserve the same behavior: TP 1008, FP 144, FN 0; 792/864 exact. These are correlated transformations of 24 base scenes, not 864 independent drawings. Full model/condition/calibration diagnostics and failures are retained in `stroke-segment-connectivity-synthetic.json`.

## Remaining measured errors

- `dense-separated-lines`: false `bar:start↔near:start` and `bar:end↔near:end`.
- `dense-contact-and-false-neighbor`: the same two false Cap closures despite the genuine T attachment being correct.
- These locally parallel aligned terminals also fit closed-tip geometry. The prototype logs the open-boundary alternative; it does not hide these false positives or relabel the fixtures to pass. Human global-context evidence is needed to choose a general policy without destroying hair-tip closure recall.
- The separate endpoint-only adversarial corpus retains one missed `corner-turn-150` connection: robust directions explain an acute join, but confidence remains below threshold because the forward-ray intersection extends beyond the preferred local arc. Historical 24 endpoint scenes remain exact; 18 additional scenes have TP 17 / FP 0 / FN 1. The 756 transformed endpoint scenes retain the same missed shape. This failure remains recorded rather than silently adjusting a threshold for one drawing.
- Physical positive-gap segment candidates are withheld with ambiguity by default. This protects near-but-separated T cases; a positive-gap truth label is explicitly verified to count as FN. Actual human recall for natural gaps remains unknown.

## Runtime / regression evidence

- Native validation suite: 9 test files passed, including brush, raster evidence and Region regressions as well as both connectivity target types.
- Existing Core: typecheck passed; 8 test files passed. Production source files unchanged.
- Browser: 9 flows passed on Chromium 134 with Playwright 1.63.0: HTTP and standalone file opening; pointer capture/cancel and mixed IDs; dense-number truth selection; T segment selection by controls and canvas; keyboard scoring; empty truth and score invalidation; storage/export/reload/clear undo; round/butt/square recording; storage-failure recovery; resize and 320/600/900/1100/1440 CSS-pixel overflow checks; no page execution errors in these tests.
- Visual inspection caught a restored-T selector update error that state-only tests missed. It was repaired; DOM-state and page-error assertions were added, rerun, and the Japanese-font screenshot inspected. This does not certify all accessibility/device behaviors.
- `endpoint-connectivity.d.ts` syntax checked with strict TypeScript options; this is a prototype public data contract, not a full JS static typecheck.

## Responsiveness measurements

Three warm CPU wall-time samples per case in this Linux/Node environment, 80 points per stroke. Not Android/stylus latency or frame-rate measurements.

| Layout | Strokes | Without spatial rejection, median | With rejection, median |
|---|---:|---:|---:|
| Spaced | 20 | 12.61ms | 4.00ms |
| Spaced | 100 | 245.94ms | 13.68ms |
| Spaced | 300 | 2013.42ms | 54.21ms |
| Dense | 20 | 11.54ms | 11.37ms |
| Dense | 100 | 289.54ms | 218.88ms |
| Dense | 300 | 2270.13ms | 835.80ms |

Graph output was identical in all six measurements; candidate-score equality is separately regression-tested. Bounding-box rejection reduces distant work. Dense full recomputation is still too costly for an interactive Production design; persistent spatial indexing, incremental invalidation and Worker execution need further design/validation.

## Human gate and next data

**UNVERIFIED: real human finger/pen Connectivity accuracy; actual Xiaomi palm/input/latency behavior; real confidence calibration.** Collected native-stroke truth records: **0**. Existing Fill success/failure records are not reinterpreted as connection truth. Automated pointer events are UI QA and are flagged untrusted in exports.

The standalone evaluator is ready to collect this missing evidence: draw freely, inspect completed strokes, mark endpoint pairs and endpoint-to-interior targets, confirm all labels, score, record multiple drawings, and export JSON. The analysis CLI recomputes geometry and scores from that file, lists FP/FN candidates and separates untrusted input. Human authorship and trusted event provenance still require review; browser isTrusted alone is not proof of a human session.

Do not tune Closed/Open or Fill until connectivity errors are understood. Production integration and PR merge still require explicit user authorization.
