export type RasterTileKey = `${number},${number}`;

type TileBlock = Readonly<{
  id: number;
  bytes: Uint8Array;
}>;

type RasterRevision = Readonly<{
  id: number;
  parentId: number | null;
  changes: ReadonlyMap<RasterTileKey, number | null>;
  checkpoint: ReadonlyMap<RasterTileKey, number> | null;
}>;

export type SealMetrics = Readonly<{
  changedTiles: number;
  canonicalReadBytes: number;
  workingAllocatedBytes: number;
  transferredBytes: number;
  avoidableSealCopyBytes: number;
  newBlocks: number;
  revisionId: number;
}>;

export class CanonicalTileStore {
  #nextId = 1;
  readonly #blocks = new Map<number, TileBlock>();

  get blockCount(): number {
    return this.#blocks.size;
  }

  get allocatedBytes(): number {
    let total = 0;
    for (const block of this.#blocks.values()) total += block.bytes.byteLength;
    return total;
  }

  putTransferred(bytes: Uint8Array): number {
    if (typeof structuredClone !== 'function') throw new Error('structuredClone transfer is required for ownership sealing');
    const buffer = bytes.buffer as ArrayBuffer;
    const owned = structuredClone(bytes, { transfer: [buffer] });
    const id = this.#nextId++;
    this.#blocks.set(id, { id, bytes: owned });
    return id;
  }

  copyForEdit(id: number): Uint8Array {
    const block = this.#blocks.get(id);
    if (!block) throw new Error(`missing canonical tile block ${id}`);
    return block.bytes.slice();
  }

  readCopy(id: number): Uint8Array {
    return this.copyForEdit(id);
  }
}

export class RasterSealingDocument {
  readonly tileBytes: number;
  readonly checkpointInterval: number;
  readonly store = new CanonicalTileStore();
  readonly #revisions = new Map<number, RasterRevision>();
  #headId = 0;
  #nextRevisionId = 1;
  #redoStack: number[] = [];

  constructor(tileBytes: number, checkpointInterval = 0) {
    if (!Number.isInteger(tileBytes) || tileBytes <= 0) throw new Error('tileBytes must be a positive integer');
    if (!Number.isInteger(checkpointInterval) || checkpointInterval < 0) throw new Error('checkpointInterval must be >= 0');
    this.tileBytes = tileBytes;
    this.checkpointInterval = checkpointInterval;
    this.#revisions.set(0, { id: 0, parentId: null, changes: new Map(), checkpoint: new Map() });
  }

  get headId(): number {
    return this.#headId;
  }

  get revisionCount(): number {
    return this.#revisions.size;
  }

  beginTransaction(): RasterSealTransaction {
    return new RasterSealTransaction(this, this.#headId);
  }

  resolveBlockId(key: RasterTileKey, revisionId = this.#headId): number | null {
    let current: RasterRevision | undefined = this.#revisions.get(revisionId);
    while (current) {
      if (current.changes.has(key)) return current.changes.get(key) ?? null;
      if (current.checkpoint) return current.checkpoint.get(key) ?? null;
      current = current.parentId === null ? undefined : this.#revisions.get(current.parentId);
    }
    return null;
  }

  readTileCopy(key: RasterTileKey, revisionId = this.#headId): Uint8Array {
    const blockId = this.resolveBlockId(key, revisionId);
    return blockId === null ? new Uint8Array(this.tileBytes) : this.store.readCopy(blockId);
  }

  assertPublishable(baseRevisionId: number): void {
    if (baseRevisionId !== this.#headId) throw new Error('stale raster transaction');
  }

  publish(baseRevisionId: number, changes: ReadonlyMap<RasterTileKey, number | null>): number {
    this.assertPublishable(baseRevisionId);
    const id = this.#nextRevisionId++;
    const shouldCheckpoint = this.checkpointInterval > 0 && id % this.checkpointInterval === 0;
    const revision: RasterRevision = {
      id,
      parentId: this.#headId,
      changes: new Map(changes),
      checkpoint: shouldCheckpoint ? this.materializeMap(this.#headId, changes) : null,
    };
    this.#revisions.set(id, revision);
    this.#headId = id;
    this.#redoStack = [];
    return id;
  }

  undo(): number {
    const current = this.#revisions.get(this.#headId);
    if (!current || current.parentId === null) return this.#headId;
    this.#redoStack.push(current.id);
    this.#headId = current.parentId;
    return this.#headId;
  }

  redo(): number {
    const next = this.#redoStack.pop();
    if (next === undefined || !this.#revisions.has(next)) return this.#headId;
    this.#headId = next;
    return this.#headId;
  }

  private materializeMap(baseRevisionId: number, changes: ReadonlyMap<RasterTileKey, number | null>): ReadonlyMap<RasterTileKey, number> {
    const chain: RasterRevision[] = [];
    let current: RasterRevision | undefined = this.#revisions.get(baseRevisionId);
    let result = new Map<RasterTileKey, number>();
    while (current) {
      if (current.checkpoint) {
        result = new Map(current.checkpoint);
        break;
      }
      chain.push(current);
      current = current.parentId === null ? undefined : this.#revisions.get(current.parentId);
    }
    for (let index = chain.length - 1; index >= 0; index -= 1) {
      const revision = chain[index];
      if (!revision) continue;
      applyChanges(result, revision.changes);
    }
    applyChanges(result, changes);
    return result;
  }
}

export class RasterSealTransaction {
  readonly #document: RasterSealingDocument;
  readonly #baseRevisionId: number;
  readonly #working = new Map<RasterTileKey, Uint8Array>();
  #closed = false;
  #canonicalReadBytes = 0;
  #workingAllocatedBytes = 0;

  constructor(document: RasterSealingDocument, baseRevisionId: number) {
    this.#document = document;
    this.#baseRevisionId = baseRevisionId;
  }

  editTile(key: RasterTileKey, edit: (bytes: Uint8Array) => void): void {
    this.assertOpen();
    let bytes = this.#working.get(key);
    if (!bytes) {
      const blockId = this.#document.resolveBlockId(key, this.#baseRevisionId);
      if (blockId === null) {
        bytes = new Uint8Array(this.#document.tileBytes);
      } else {
        bytes = this.#document.store.copyForEdit(blockId);
        this.#canonicalReadBytes += bytes.byteLength;
      }
      this.#workingAllocatedBytes += bytes.byteLength;
      this.#working.set(key, bytes);
    }
    edit(bytes);
  }

  cancel(): void {
    this.assertOpen();
    this.#working.clear();
    this.#closed = true;
  }

  seal(): SealMetrics {
    this.assertOpen();
    this.#document.assertPublishable(this.#baseRevisionId);
    const changes = new Map<RasterTileKey, number | null>();
    let transferredBytes = 0;

    for (const [key, bytes] of this.#working) {
      const byteLength = bytes.byteLength;
      const blockId = this.#document.store.putTransferred(bytes);
      changes.set(key, blockId);
      transferredBytes += byteLength;
    }

    const revisionId = this.#document.publish(this.#baseRevisionId, changes);
    this.#working.clear();
    this.#closed = true;
    return {
      changedTiles: changes.size,
      canonicalReadBytes: this.#canonicalReadBytes,
      workingAllocatedBytes: this.#workingAllocatedBytes,
      transferredBytes,
      avoidableSealCopyBytes: 0,
      newBlocks: changes.size,
      revisionId,
    };
  }

  private assertOpen(): void {
    if (this.#closed) throw new Error('raster transaction is closed');
  }
}

function applyChanges(target: Map<RasterTileKey, number>, changes: ReadonlyMap<RasterTileKey, number | null>): void {
  for (const [key, blockId] of changes) {
    if (blockId === null) target.delete(key);
    else target.set(key, blockId);
  }
}
