# Illustro Stroke-native Connectivity — prototype contract 0.3

Validation only. No Production integration or merge authorization. Scope: **endpoint↔endpoint and endpoint↔another stroke interior**. Closed/Open/Fill metrics are not the objective.

## Canonical input

Ordered `strokeId`, `points[]`, known rendered width per point, cap (`round|butt|square`), optional pressure/time/order/input metadata and geometryRevision. A stroke ID must be unique, nonempty and not contain `|`. A single-point stroke keeps its real coordinate; no fabricated second point. Unknown telemetry remains null.

Reconstructed semantic records can enter through `strokeFromSemanticRecord()`, requiring an explicit renderer width mapping. Predicted preview samples are excluded by the caller's canonical-record contract. The resolver itself never searches raster pixels for endpoints. Production does not yet have a verified durable canonical stroke store; see the audit.

## Endpoint and target descriptors

Start and end get stable `{strokeId}:start|end` identities. Position is the actual endpoint. Arc-length neighborhoods produce robust outward direction, local turning, jitter, sampled trace, neighborhood width, quality, pressure summary and terminal pressure/time. **Terminal width**, rather than neighborhood median width, determines its footprint. Terminal cap orientation uses the actual final segment; geometric explanations use the robust neighborhood tangent.

Segment targets retain `strokeId`, `segmentIndex`, `t`, arcLength/arcFraction, position, interpolated width, actual segment tangent, neighborhood robust tangent/curvature/trace, and geometryRevision when supplied. Target identity is stroke ID + arc fraction; segmentIndex is a current-geometry lookup, not a persistent revision-independent identity. Editing a stroke requires recomputation.

## Vector footprints and models

Prototype shape contract: variable-width polyline tube; round internal joins. Terminal round disc / oriented butt patch / square patch. Segment body is a width-interpolated trapezoid with adjacent round interior join discs. Actual vector footprint separation is used for contact; directional support projections remain diagnostics, not collision proof. Width-normalized gap is used for explanations. Textured, elliptical, nonround joins or custom dab brushes require renderer footprint support before integration; this prototype does not claim universal rendered-brush contact.

Endpoint models are Contact, Continuation, Corner, Cap/Closure. Their scores remain separate and the strongest explanation supplies the pair cost. Corner can use short forward tangent extensions relative to observed local arc, so acute and 90° corners do not fail an angle-equality condition. Cap uses parallelism, spacing stability, transverse join, side consistency, run length and convergence without semantic hair recognition. Angle difference alone never rejects a connection.

Interior models are Contact and Termination. Termination evaluates endpoint approach toward the actual target; it does not require matching the target tangent. **Default interior policy accepts physical footprint contact. A positive-gap segment candidate retains ambiguity and diagnostics instead of silently inventing contact.** `inferSegmentGaps:true` is an experimental policy, not the human-validated default.

## Candidate generation, competition and graph

Both target types compete in each endpoint's candidate list. Interior targets are projected local minima along the target stroke; adjacent segment samples at the same arc are deduplicated. The terminal half-width zone canonicalizes proximity through endpoint candidates rather than duplicate interior nodes. Same-stroke interior attachment is out of this first implemented contract; same-stroke start/end closure is included.

Contact is junction-compatible; there is no universal one-connection-per-endpoint constraint. Inferred endpoint connections require a mutual best candidate and sufficient competing margin. High score never permits an exact score tie. Endpoint↔segment gap inference, when enabled, competes at its source endpoint. Guessed connectors crossing a third stroke or another connector retain graph-conflict diagnostics. Interior-only crossings are not automatically resolved.

Manual endpoint pairs and `{endpointA,target:{kind:'segment',strokeId,arcFraction}}` may force a connection/disconnection, including outside automatic search. Disconnect has precedence; raw scores/competition stay available.

Output includes typed connection edges, descriptors, every generated candidate, scores/costs, uncalibrated confidence, final `connected|disconnected|ambiguous`, reasons, competition, graph conflicts, and alternative Cap explanations. Connected interior targets become anchors; `strokeSpans` split each source stroke's arc at anchors so a later boundary graph can consume connectivity without rediscovering it from a bitmap. No region or fill is calculated here.

## Evaluation

Human truth is entered **after drawing and observing the visible result**, using endpoint IDs or endpoint + target stroke + arc position. The evaluator accepts touch/pen/mouse, preserves actual/coalesced sample timestamps, supports dense-label selection by native controls, and keeps logical geometry stable on resize. Automatic overlays are hidden by default until scoring; earlier exposure is recorded. Pointer cancel retains received data without inventing a terminal sample; wrong pointer IDs cannot modify a stroke.

Confirmation means all unselected connections are labeled absent. Blank/unfinished work is not a perfect score. The JSON export includes strokes, caps, telemetry provenance, graph, truth, candidate scores and per-scene/cumulative metrics. Saved scenes are unique by record ID; exported data can be independently recomputed with `evaluate-connectivity-records.mjs`, which ignores reported scores and excludes unfinished/unconfirmed/duplicate records. Untrusted generated pointer events are UI evidence, not actual human device accuracy. Trusted browser events alone also do not prove human authorship.

Metrics: TP/FP/FN, Precision/Recall/F1, exact graph match, model and normalized gap/width/curvature strata, candidate generation misses, Brier and calibration bins/ECE. Missing generated truth contributes FN and score-zero calibration errors. Calibration is explicitly scoped to generated candidates plus missed positive truth, not the infinite set of possible segment locations. Values remain uncalibrated geometric scores. Segment labels match source endpoint + target stroke + half-target-width arc tolerance, not just any location on the same stroke.

## Known unresolved quality

- Two locally parallel boundaries with aligned terminals can represent a closed tip or an open pair. The current Cap model still produces measured false positives on open parallel lines; do not declare it high precision from passing contact tests.
- Default segment gap withholding can miss genuine intended near-contact junctions. Both FP and FN are measured; manual correction does not remove the need for human-data calibration.
- Whole-graph full recomputation and endpoint pair enumeration remain costly for dense drawings. Spatial bounding-box rejection is an optimization, not a changed decision policy. Incremental indexing/updates, Workers and device latency checks remain required.
- Interior-only crossings, same-stroke interior intersections, brush footprint generalization, actual device/palm behavior and confidence calibration are unverified or unimplemented as specified.

Pointer input reference: [W3C Pointer Events Level 3, coalesced events](https://www.w3.org/TR/pointerevents3/#coalesced-events). This is input API guidance, not evidence for resolver accuracy.
