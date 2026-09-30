# Stroke data audit / 2026-09-30

Read from GitHub PR #5 before edits: open, Draft, unmerged; branch `region/v3-evidence-redesign-2026-09-29`, head `c4e29fbb7efde54e3b7531cef24c373040dcfd1d`, base `validation/gate-bc-final-2026-09-29` at `824abbb3b9ce3692a633d0c6a3a61bca5fd3692f`.

## Observed implementation

| Location | Verified data / lifetime | Consequence |
|---|---|---|
| `packages/core/src/model.ts` | DocumentRoot stores raster layer manifests, not canonical strokes or endpoint IDs. | Do not claim native stroke geometry is already durable throughout Production. A future storage design must preserve stroke identity, geometry, brush policy, layer/transform and revisions. |
| `prototypes/p0-architecture/src/core/input.ts` | Ordered actual/coalesced PointerEvent samples with sequence, time, x/y, pressure and pointer type. | Appropriate input basis; sample capture alone is not persistent stroke storage. |
| `prototypes/p0-architecture/src/main.ts`, `workers/realtime.worker.ts` | Transient stroke state and canvas/worker rendering; width policy uses pressure. | Resolver width must reflect the renderer, not a guessed generic pressure conversion. |
| `prototypes/v2-validation/src/brush.js` | `makeSemanticStrokeRecord()` retains reconstructed x/y/t/pressure/tilt/azimuth and reconstruction profile/seeds; `processWithPrediction()` separates canonical and predicted preview data. | Reuse canonical reconstructed samples through the validation adapter; never include predicted preview endpoints. Width mapping and stable strokeId must be supplied explicitly. |
| Same file `StreamingStrokeRecorder` | Seals/counts sample pages and drains transient queues for validation. | Not evidence of a persisted, queryable native stroke archive. |
| `connectivity/endpoint-connectivity.js` at inherited head | Explicit native start/end descriptors, four endpoint models, mutual candidate competition; no segment resolver. | Reuse these concepts, repair measured defects, and add segment contact/termination as a peer target. |
| Region V3/V4 `real-art` evidence pipeline | Raster line evidence, image orientation, gap evidence and Region classification. | Remains separate; no import or dependency from the connectivity resolver. |

No `AGENTS.md` was found in the checked-out repository. Production files under `packages/` and P0 architecture are audited but not modified. All resolver implementation stays in `prototypes/v2-validation/connectivity/`.

## Input contract and unresolved integration

The validation adapter `strokeFromSemanticRecord(record, {strokeId, widthAtPoint, cap, order})` rejects a missing renderer width policy. It maps canonical reconstructed samples, preserving timestamp/pressure and source metadata. The evaluator directly records its own rendered polyline width, cap and raw input metadata.

Before future Production integration, design durable stroke IDs, geometry revisions, layer ownership, transforms, undo/redo, erase/split operations, reconstruction/dab footprints and incremental invalidation. This audit does not change those systems or authorize their implementation.
