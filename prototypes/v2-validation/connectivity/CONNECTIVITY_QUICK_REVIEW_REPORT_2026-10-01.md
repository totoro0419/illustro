# Connectivity quick review / 2026-10-01

Validation-only UI and accepted-connection geometry changes. No Production integration or PR merge. Audited remote parent: `fe0eee332f67b7ef63fa974ef6ee0b60322acb4c`, Draft PR #5. Resolver version: `stroke-geometry-0.3.1`.

## User flow

Draw multiple strokes; connected sites immediately share a color and group number. Endpoint numbers remain visible. Actual interior attachment sites have diamonds, line numbers and positions. Independent junctions along the same stroke retain independent colors; whole strokes are not conflated into one color component. Dashed question marks show undecided candidates. Leader labels are placed away from their actual sites to reduce close-point overlap. Extremely dense labels still need physical browser validation.

Type unacceptable pairs, missed connections, bad junction positions or other defects into the memo beneath the canvas. **記録して次の試験** stores the current strokes, graph, exact displayed group/number map, scores, geometry, capture provenance and note, then begins an empty trial. **前の絵を戻す** recovers the previous drawing and memo. Re-recording that trial updates the existing record. **全試験を書き出す** exports all saved trials plus the current work. Completed strokes and typed notes survive ordinary reload using local drafts; storage errors retain the current work and provide export.

Complete-truth entry and scoring remain an optional disclosure, outside the primary loop. Automatic preview exposure is explicitly recorded. Free-form notes are qualitative blocking-defect reports: they do not become complete truth labels, blank notes do not mean correctness, and unlabelled records never enter Precision/Recall/F1. The analysis CLI exposes these notes separately as `qualitativeFeedback`.

## Connection geometry

For an already accepted nearby endpoint pair, test each robust outward ray against actual native segments near the other endpoint. If one extension meets actual ink, its intersection is the join point; if multiple explanations exist, use the shortest valid extension with a deterministic tie break. Collinear gaps attach at actual ink, not an invented midpoint. Reject distant body intersections beyond the local/gap bound.

If neither single extension reaches the other stroke, connect the endpoints directly. An intersection that exists only after extending both lines is not used. This does not replace connectivity acceptance with an intersection-only criterion or reject 90-degree/cap joins. Use the chosen path in third-stroke/connector conflict checks. Retain interior intersections as anchors and stroke-span splits, while preserving original endpoint identities, candidate scores and decisions for diagnostics.

## Verification and limits

- Executed: 73 native regression/contract tests passed. This includes 9 new geometry/group/feedback tests and 5 Node DOM/event contract tests for notes, next/previous trial, deduplication, export, reload, saving failure and mid-stroke guards. These simulated events are not human input or visual-browser evidence.
- Executed: declaration syntax, JavaScript syntax, standalone bootstrap syntax, unique HTML IDs and primary/disclosure placement, source-built standalone equality and whitespace checks.
- Recomputed: combined 24-scene synthetic corpus remains TP 28 / FP 4 / FN 0; 22/24 exact. Its 864 correlated variants retain TP 1008 / FP 144 / FN 0. Historical 24 endpoint scenes remain exact; 18 endpoint adversarial scenes retain TP 17 / FP 0 / FN 1. These are geometry fixtures, not human accuracy.
- UNVERIFIED: browser rendering and browser event flows for this revision. The cloud browser rejected local HTTP access and explicitly blocked file URLs. No workaround was attempted. Updated browser tests are present but were not executed. Previous revision's Chromium screenshots/logs do not certify this UI revision.
- UNVERIFIED: real Android finger/pen latency, palm behavior, narrow/text-scaled layouts, assistive technology and real confidence calibration. Human native-stroke truth records remain 0.
- Known resolver failures remain: 4 false parallel-boundary Cap closures and one missed acute endpoint corner. Dense full recomputation and same-stroke/interior-only crossings remain unresolved as documented in the prior report.

Evidence: `../results/connectivity-quick-review-node-tests.txt` and `../results/connectivity-quick-review-verification.json`. Source code under `packages/core` is unchanged.
