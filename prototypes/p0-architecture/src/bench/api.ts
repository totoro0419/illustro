import { SparseTileSurface } from '../core/sparseTile';
import { RevisionHistory } from '../core/history';

export type TileBenchmarkResult = Readonly<{
  tileSize: number;
  operations: number;
  touchedTiles: number;
  allocatedTiles: number;
  allocatedBytes: number;
  durationMs: number;
}>;

export function runTileBenchmark(tileSize: number, operations = 20_000): TileBenchmarkResult {
  const surface = new SparseTileSurface(tileSize);
  let touchedTiles = 0;
  const start = performance.now();
  for (let i = 0; i < operations; i += 1) {
    const x = (i * 97) % 16_384;
    const y = (i * 193) % 16_384;
    const size = 4 + (i % 128);
    touchedTiles += surface.markRect({ x, y, width: size, height: size });
  }
  surface.consumeDirty();
  return {
    tileSize,
    operations,
    touchedTiles,
    allocatedTiles: surface.tileCount,
    allocatedBytes: surface.allocatedBytes,
    durationMs: performance.now() - start,
  };
}

export function runHistoryBenchmark(commits = 100_000): Readonly<{ commits: number; durationMs: number; head: number }> {
  const history = new RevisionHistory({ value: 0 });
  const start = performance.now();
  for (let i = 1; i <= commits; i += 1) history.commit({ value: i });
  for (let i = 0; i < 1000; i += 1) history.undo();
  for (let i = 0; i < 1000; i += 1) history.redo();
  return { commits, durationMs: performance.now() - start, head: history.head.id };
}
