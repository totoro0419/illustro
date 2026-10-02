import type {
  CoreDocument,
  LayerId,
  CommitReceipt,
} from "../../core/src/index";
import type { StrokeRecord } from "./types";
import { StrokeRaster, RasterQueue } from "./raster";
import { validateRecord, deserialize, serialize } from "./record";
export class CoreBrushCommit {
  readonly raster: StrokeRaster;
  readonly queue: RasterQueue;
  private readonly transaction;
  private closed = false;
  private readonly record: StrokeRecord;
  constructor(
    private readonly document: CoreDocument,
    record: StrokeRecord,
    private readonly layer: LayerId = document.defaultRasterLayerId,
  ) {
    validateRecord(record);
    this.record = deserialize(serialize(record));
    this.transaction = document.begin(record.preset.name);
    this.raster = new StrokeRaster(
      document.root.width,
      document.root.height,
      document.tileSize,
    );
    this.queue = new RasterQueue(this.raster, this.record.preset, 2000000);
    for (const page of this.record.commands) this.queue.enqueue(page);
  }
  finish(): CommitReceipt {
    if (this.closed) throw new Error("commit closed");
    if (this.queue.remaining) throw new Error("materialization pending");
    try {
      for (const tile of this.raster.tiles.values())
        this.transaction.editTile(this.layer, tile.x, tile.y, (b) =>
          this.raster.compositeTile(tile, b, this.record.preset),
        );
      this.transaction.recordBrushStroke(this.layer, serialize(this.record));
      const result = this.transaction.commit();
      this.closed = true;
      return result;
    } catch (e) {
      this.closed = true;
      this.transaction.cancel();
      throw e;
    }
  }
  cancel() {
    if (this.closed) throw new Error("commit closed");
    this.transaction.cancel();
    this.closed = true;
  }
}

// Live path keeps strict stable-prefix work across frames; release does not replay it.
import { BrushEngine } from "./engine";
import type { Preset, Sample } from "./types";
export class CoreBrushSession {
  readonly engine: BrushEngine;
  readonly raster: StrokeRaster;
  readonly queue: RasterQueue;
  private readonly tx;
  private ending = false;
  private closed = false;
  constructor(
    document: CoreDocument,
    preset: Preset,
    private readonly layer: LayerId = document.defaultRasterLayerId,
  ) {
    this.tx = document.begin(preset.name);
    this.raster = new StrokeRaster(
      document.root.width,
      document.root.height,
      document.tileSize,
    );
    this.queue = new RasterQueue(this.raster, preset);
    this.engine = new BrushEngine(preset, {
      sink: (p) => this.queue.enqueue(p),
    });
  }
  accept(sample: Sample) {
    if (this.ending || this.closed)
      throw new Error("stroke no longer accepts input");
    this.engine.accept(sample);
  }
  release() {
    if (this.ending || this.closed) throw new Error("stroke already released");
    this.engine.finish();
    this.ending = true;
  }
  commit(): CommitReceipt {
    if (!this.ending || this.closed) throw new Error("stroke not ready");
    if (this.queue.remaining) throw new Error("materialization pending");
    try {
      const record = this.engine.record();
      for (const tile of this.raster.tiles.values())
        this.tx.editTile(this.layer, tile.x, tile.y, (b) =>
          this.raster.compositeTile(tile, b, record.preset),
        );
      this.tx.recordBrushStroke(this.layer, serialize(record));
      const result = this.tx.commit();
      this.closed = true;
      return result;
    } catch (e) {
      this.closed = true;
      this.tx.cancel();
      throw e;
    }
  }
  cancel() {
    if (this.closed) throw new Error("stroke closed");
    if (!this.ending) this.engine.cancel();
    this.tx.cancel();
    this.closed = true;
  }
}
