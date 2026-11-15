# M04 Eraser formal integration

Status: M04 implementation record. CANONICAL owner documents remain authoritative.

## Confirmed owners read
- docs/IMPLEMENTATION_BASELINE.md
- docs/CANONICAL_INDEX.md
- docs/PRODUCT_SPEC.md
- docs/FEATURE_SPEC.md
- docs/FEATURE_SYSTEM_INTEGRATION_2026-10-04.md
- docs/architecture/ARCHITECTURE_V2.md
- docs/architecture/CANONICAL_RASTER_V2.md
- docs/architecture/BRUSH_RENDER_CONTRACT_V2.md
- docs/architecture/IDENTITY_OPERATION_REVISION_V2.md
- docs/architecture/FEATURE_PERFORMANCE_RESOLUTION_2026-10-04.md
- docs/brush-foundation/ADOPTION_BASELINE.md
- docs/ui/LEFT_UI_SPEC.md
- docs/ui/RIGHT_UI_SPEC.md
- docs/ui/COMPACT_IMPLEMENTATION_BASELINE.md

No M04-blocking contradiction was found among these owners.

## Formal meaning
Eraser remains brush.stroke. A StrokeRecord whose preset has blend:'erase' is recorded with parameters.action='erase'. No eraser.stroke History system is introduced.

One completed Eraser Stroke = one Transaction = one Revision. Tool/preset switching and Layer selection do not create artwork revisions.

## Raster alpha / hidden RGB
Canonical Raster is straight/unassociated RGBA. Erase changes alpha while preserving the stored RGB, including when alpha becomes zero.

The pre-M04 Brush Foundation compose path zeroed RGB when erase reached alpha=0. That is a verified conflict with CANONICAL_RASTER_V2.md. M04 therefore makes the minimum CPU reference + WebGL2 + WebGPU correction so erase preserves destination RGB.

Visible white paper remains presentation-only. It is not burned into artwork Raster data.

## Layer isolation
Before M04, the formal Document already had stable LayerId/SurfaceId, but the runtime Foundation renderer stored confirmed artwork in one flattened tile map. That is insufficient for a product Eraser because erasing a flattened result can visually remove lower Layer contributions.

M04 extends the existing renderer with a SurfaceId key:
- pointer-down captures LayerId / SurfaceId / Revision as before;
- each stroke keeps that SurfaceId through preview, commit and History;
- each GPU tile belongs to exactly one Raster Surface;
- erase composes only into that Surface tile;
- final visible artwork composites Raster surfaces bottom-to-top;
- no Eraser-only Canvas, CPU renderer, Offscreen bridge or separate Eraser engine is introduced.

The default single-surface Foundation path remains supported so existing Brush regression remains applicable.

## History
Recent Eraser Undo/Redo uses the same bounded 16 MiB GPU history patch cache as paint strokes. Patch entries are qualified by SurfaceId + tile key. Cache-miss fallback rebuilds only dirty tiles of the affected Surface from active formal StrokeRecords, using M03 atomic presentation.

Redo branch invalidation is unchanged.

## Tool state
The QA Editor no longer uses preset array position such as index>=5. It uses:
- stable preset ID to remember previous Brush and Eraser;
- blend:'erase' to determine semantic tool type.

Full Brush UI remains outside M04.

## Hard / Soft
- Hard: foundation-hard-eraser, round hard edge, continuous Foundation path.
- Soft: foundation-soft-eraser, sweep renderer, low hardness, flow≈0.65.

No replacement Eraser algorithm is introduced.

## no-op
A completed Eraser Stroke with canonical commands remains a Revision even when it happens to touch only already-transparent pixels. M04 does not add readback solely to suppress that History entry. Pointercancel remains no-Revision.

## Performance
- dirty tiles only
- no normal-path full Canvas readback
- no full Document serialization per stroke
- no all-Layer rebuild for Eraser
- latest preview remains prioritized
- canonical input remains retained
- existing 16 MiB History cache cap remains unchanged
- Workspace open/close never changes Renderer ownership/backend
