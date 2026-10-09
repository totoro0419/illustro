import type { CoreDocument, LayerId } from "../../core/src/index";
import { rasterize, RasterQueue, StrokeRaster } from "./raster";
import type { StrokeRecord } from "./types";
import { validateRecord, serialize } from "./record";
/** Existing ownership-transfer transactions and root-switch history are retained. */
export function commitStroke(
  doc: CoreDocument,
  layer: LayerId,
  stroke: StrokeRecord,
) {
  validateRecord(stroke);
  if (doc.root.getLayer(layer).locked) throw new Error("layer locked");
  const raster = rasterize(
    stroke,
    doc.root.width,
    doc.root.height,
    doc.tileSize,
  );
  if (!raster.tiles.size) return null;
  const recordJson = serialize(stroke);
  const tx = doc.begin("Brush: " + stroke.preset.name);
  try {
    for (const tile of raster.tiles.values())
      tx.editTile(layer, tile.x, tile.y, (bytes) =>
        raster.compositeTile(tile, bytes, stroke.preset),
      );
    tx.recordBrushStroke(layer, recordJson);
    return tx.commit();
  } catch (e) {
    tx.cancel();
    throw e;
  }
}

/** Device profile supplies the yield boundary (RAF, worker task, etc.). No full replay on pen-up is required. */
export async function commitStrokeAsync(
  doc: CoreDocument,
  layer: LayerId,
  stroke: StrokeRecord,
  options: {
    yieldWork: () => Promise<void>;
    signal?: AbortSignal;
    pixelsPerSlice?: number;
    millisecondsPerSlice?: number;
  },
) {
  validateRecord(stroke);
  const revision = doc.head;
  const recordJson = serialize(stroke);
  if (recordJson.length > 32 * 1024 * 1024)
    throw new Error("Core semantic record capacity");
  const raster = new StrokeRaster(
      doc.root.width,
      doc.root.height,
      doc.tileSize,
    ),
    queue = new RasterQueue(raster, stroke.preset, 2000000);
  for (const page of stroke.commands) {
    queue.enqueue(page);
    while (queue.remaining) {
      if (options.signal?.aborted) throw new Error("brush commit cancelled");
      queue.run(
        options.pixelsPerSlice ?? 4096,
        options.millisecondsPerSlice ?? 2,
      );
      if (queue.remaining) await options.yieldWork();
    }
  }
  if (doc.head !== revision) throw new Error("stale brush materialization");
  if (options.signal?.aborted) throw new Error("brush commit cancelled");
  if (doc.root.getLayer(layer).locked) throw new Error("layer locked");
  if (!raster.tiles.size) return null;
  const tx = doc.begin("Brush: " + stroke.preset.name);
  try {
    for (const tile of raster.tiles.values())
      tx.editTile(layer, tile.x, tile.y, (b) =>
        raster.compositeTile(tile, b, stroke.preset),
      );
    tx.recordBrushStroke(layer, recordJson);
    return tx.commit();
  } catch (e) {
    tx.cancel();
    throw e;
  }
}
