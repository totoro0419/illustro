# Illustro Stroke-native Endpoint Connectivity Resolver — Prototype Contract

Status: validation prototype only. This document does **not** authorize Production integration or merge.

## Responsibility boundary

The resolver consumes Illustro stroke geometry directly. It does not rasterize a stroke and then rediscover endpoints from pixels.

Input responsibility:
- stroke identity and ordered `points[]`
- point coordinates
- stroke/point width
- optional pressure and timestamp/order
- brush cap when known

Output responsibility:
- explicit endpoint descriptors for every stroke start/end
- endpoint-to-endpoint connection candidates
- per-model costs/scores and diagnostics
- competition information around each endpoint
- final endpoint graph edges
- manual connect/disconnect overrides without destroying automatic diagnostics

The existing Region V3/V4 pipeline remains responsible for raster-derived line/boundary evidence and Region classification. Endpoint Connectivity is upstream structure, not a replacement name for V3/V4 image bridging.

## Endpoint descriptor

Each endpoint is a local stroke shape, not one `(x,y)` sample. The prototype records:
- `endpointId`, `strokeId`, `start|end`
- position
- robust outward tangent estimated from a width-scaled local arc
- local curvature diagnostic
- local arc length
- local median width and endpoint radius
- pressure summary when present
- brush cap
- normalized endpoint jitter
- descriptor quality
- an inward trace sampled at multiple arc fractions

The local arc length is derived from stroke length and line width. Direction is not taken from only the last two input points.

## Effective gap

For endpoint pair A/B:

`effectiveGap = centerDistance - endpointReachA - endpointReachB`

`normalizedGap = effectiveGap / meanEndpointWidth`

Endpoint reach depends on the cap model. Connection decisions therefore do not use a fixed-pixel gap cutoff.

## Connection models

Every candidate is evaluated by multiple independent explanations and the strongest explanation is retained.

### Contact

High score when rendered endpoint footprints already touch/overlap. Contact edges are junction-compatible: more than one contact edge may share an endpoint.

### Continuation

High score for a small normalized gap where both local outward tangents face the gap and the two tangent directions support one continuing stroke. Curvature and endpoint jitter soften confidence rather than acting as absolute rejection rules.

### Corner

High score when a short connector falls naturally in the forward side of both endpoints. Tangent angle difference is diagnostic only; 45°, 90°, and other corners are not rejected because of angle mismatch.

### Cap / Closure

Intended for geometries such as hair tips, ribbons, and narrow strips. It evaluates:
- same-direction local tangents
- connector being mostly transverse to those tangents
- stable separation while tracing backward along both strokes
- limited longitudinal offset
- non-crossing side consistency
- endpoint separation relative to the observed local run
- optional convergence toward the terminal pair

It uses geometry only; there is no `hair` semantic class.

## Candidate competition and graph decision

Pair scores are not independently thresholded into edges.

For each endpoint the resolver stores top competing candidates. A non-contact edge normally needs:
- confidence above the policy threshold
- mutual-best status
- a sufficient margin over competing alternatives

Very high confidence can relax the margin, but does not impose a global one-edge-per-endpoint rule. Contact junctions explicitly allow multiple edges.

## Graph extensibility

Current prototype edges are:

```text
{ kind: "endpoint", endpointId } -> { kind: "endpoint", endpointId }
```

The graph schema advertises both `endpoint` and `segment` target kinds. Endpoint-to-segment resolution is intentionally not implemented in this first prototype; T-junction/crossing tests instead verify that the endpoint-only stage does not invent endpoint-endpoint links merely because a segment interior is nearby.

A future segment target should use a stable segment reference plus parametric position, e.g. `{ kind: "segment", strokeId, segmentIndex, t }`, without changing endpoint identity.

## Evaluation contract

Human ground truth is assigned **after drawing**, from the visible result rather than pre-draw intent.

The interactive evaluator:
1. records pointer/touch/pen strokes with point coordinates, width, pressure when available, pointer type, and timestamps;
2. labels every endpoint on canvas;
3. visualizes automatic connections and optional candidate links;
4. lets the evaluator choose true endpoint pairs by tapping two endpoint labels;
5. treats unselected pairs as disconnected when the evaluator confirms the truth set;
6. reports true connection, false connection, missed connection, Precision, Recall, F1, exact graph match, and confidence calibration diagnostics;
7. exports strokes, descriptors, all candidate/model diagnostics, truth pairs, and metrics as JSON.

## Known limits of this prototype

- Endpoint-to-segment T-junction resolution is schema-ready but not implemented.
- Cap/Closure has a fundamental geometry ambiguity: two parallel strokes that terminate together can be geometrically indistinguishable from an intended closed tip without semantic/contextual evidence. The prototype preserves confidence and competition diagnostics so human-data calibration can quantify this case instead of hiding it.
- Confidence values are **not yet claimed to be calibrated**. Calibration is measured by the evaluator after human labels exist.
- Synthetic tests verify invariants and regression behavior only. Human pointer/pen evaluation is required before any claim of production-level accuracy.
