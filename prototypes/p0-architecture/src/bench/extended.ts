import { ByteBudgetLru } from '../core/byteBudgetCache';
import { RasterSealingDocument } from '../core/rasterSeal';

export type RasterSealBenchmarkResult = Readonly<{
  revisions: number;
  editsPerRevision: number;
  tileBytes: number;
  checkpointInterval: number;
  durationMs: number;
  canonicalBlocks: number;
  canonicalBytes: number;
  finalRevision: number;
}>;

export function runRasterSealBenchmark(
  revisions = 5000,
  editsPerRevision = 2,
  tileBytes = 256 * 256 * 4,
  checkpointInterval = 128,
): RasterSealBenchmarkResult {
  const document = new RasterSealingDocument(tileBytes, checkpointInterval);
  const start = performance.now();
  for (let revision = 0; revision < revisions; revision += 1) {
    const tx = document.beginTransaction();
    for (let edit = 0; edit < editsPerRevision; edit += 1) {
      const txCoord = (revision * 7 + edit * 13) % 64;
      const tyCoord = (revision * 11 + edit * 17) % 64;
      tx.editTile(`${txCoord},${tyCoord}`, (bytes) => {
        bytes[(revision + edit) % bytes.byteLength] = (revision + edit) & 0xff;
      });
    }
    tx.seal();
  }
  return {
    revisions,
    editsPerRevision,
    tileBytes,
    checkpointInterval,
    durationMs: performance.now() - start,
    canonicalBlocks: document.store.blockCount,
    canonicalBytes: document.store.allocatedBytes,
    finalRevision: document.headId,
  };
}

export function runCachePressureBenchmark(
  budgetBytes = 64 * 1024 * 1024,
  entries = 1000,
  entryBytes = 256 * 1024,
): Readonly<{ budgetBytes: number; entries: number; survivingEntries: number; usedBytes: number; durationMs: number }> {
  const cache = new ByteBudgetLru<number, Uint8Array>(budgetBytes);
  const start = performance.now();
  for (let i = 0; i < entries; i += 1) {
    cache.set(i, new Uint8Array(entryBytes), entryBytes, i % 251 === 0);
  }
  return {
    budgetBytes,
    entries,
    survivingEntries: cache.size,
    usedBytes: cache.usedBytes,
    durationMs: performance.now() - start,
  };
}
