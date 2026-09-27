import { SparseTileSurface, type TileKey } from '../core/sparseTile';

export type BrushPoint = Readonly<{ x: number; y: number; radius: number }>;
export type BrushStroke = ReadonlyArray<BrushPoint>;

export type PaintWorkload = Readonly<{
  name: 'fine' | 'medium' | 'large' | 'long';
  canvasSize: number;
  strokes: ReadonlyArray<BrushStroke>;
}>;

export type TileWorkloadMetrics = Readonly<{
  workload: PaintWorkload['name'];
  tileSize: number;
  strokeCount: number;
  pointCount: number;
  tileTouches: number;
  uniqueTiles: number;
  allocatedBytes: number;
  dirtyAreaPixels: number;
  dirtyUploadBytes: number;
  touchedKeysByStroke: ReadonlyArray<ReadonlyArray<TileKey>>;
}>;

export function createPaintWorkloads(canvasSize = 8192): PaintWorkload[] {
  return [
    makeWorkload('fine', canvasSize, 72, 44, [2, 8], [5, 18], 0x1a2b3c4d),
    makeWorkload('medium', canvasSize, 48, 36, [12, 48], [10, 30], 0x2b3c4d5e),
    makeWorkload('large', canvasSize, 18, 28, [96, 320], [30, 96], 0x3c4d5e6f),
    makeWorkload('long', canvasSize, 8, 420, [8, 24], [5, 16], 0x4d5e6f70),
  ];
}

export function runTileWorkload(tileSize: number, workload: PaintWorkload): TileWorkloadMetrics {
  const surface = new SparseTileSurface(tileSize);
  let tileTouches = 0;
  let pointCount = 0;
  let dirtyAreaPixels = 0;
  const touchedKeysByStroke: TileKey[][] = [];

  for (const stroke of workload.strokes) {
    const strokeKeys = new Set<TileKey>();
    for (const point of stroke) {
      pointCount += 1;
      const diameter = Math.max(1, Math.ceil(point.radius * 2));
      const x = Math.floor(point.x - point.radius);
      const y = Math.floor(point.y - point.radius);
      tileTouches += surface.markRect({ x, y, width: diameter, height: diameter });
      for (const key of keysForRect(tileSize, x, y, diameter, diameter)) strokeKeys.add(key);
    }
    const dirtyTiles = surface.consumeDirty();
    for (const tile of dirtyTiles) {
      if (!tile.dirty) continue;
      dirtyAreaPixels += tile.dirty.width * tile.dirty.height;
    }
    // consumeDirty clears dirty state; recompute dirty area from the exact stroke bounds below.
    dirtyAreaPixels += strokeDirtyArea(tileSize, stroke);
    touchedKeysByStroke.push([...strokeKeys]);
  }

  return {
    workload: workload.name,
    tileSize,
    strokeCount: workload.strokes.length,
    pointCount,
    tileTouches,
    uniqueTiles: surface.tileCount,
    allocatedBytes: surface.allocatedBytes,
    dirtyAreaPixels,
    dirtyUploadBytes: dirtyAreaPixels * 4,
    touchedKeysByStroke,
  };
}

function strokeDirtyArea(tileSize: number, stroke: BrushStroke): number {
  const byTile = new Map<TileKey, { minX: number; minY: number; maxX: number; maxY: number }>();
  for (const point of stroke) {
    const diameter = Math.max(1, Math.ceil(point.radius * 2));
    const x = Math.floor(point.x - point.radius);
    const y = Math.floor(point.y - point.radius);
    const minTx = Math.floor(x / tileSize);
    const minTy = Math.floor(y / tileSize);
    const maxTx = Math.floor((x + diameter - 1) / tileSize);
    const maxTy = Math.floor((y + diameter - 1) / tileSize);
    for (let ty = minTy; ty <= maxTy; ty += 1) {
      for (let tx = minTx; tx <= maxTx; tx += 1) {
        const key = `${tx},${ty}` as TileKey;
        const tileX = tx * tileSize;
        const tileY = ty * tileSize;
        const localMinX = Math.max(0, x - tileX);
        const localMinY = Math.max(0, y - tileY);
        const localMaxX = Math.min(tileSize, x + diameter - tileX);
        const localMaxY = Math.min(tileSize, y + diameter - tileY);
        const existing = byTile.get(key);
        if (!existing) {
          byTile.set(key, { minX: localMinX, minY: localMinY, maxX: localMaxX, maxY: localMaxY });
        } else {
          existing.minX = Math.min(existing.minX, localMinX);
          existing.minY = Math.min(existing.minY, localMinY);
          existing.maxX = Math.max(existing.maxX, localMaxX);
          existing.maxY = Math.max(existing.maxY, localMaxY);
        }
      }
    }
  }
  let area = 0;
  for (const rect of byTile.values()) area += Math.max(0, rect.maxX - rect.minX) * Math.max(0, rect.maxY - rect.minY);
  return area;
}

function keysForRect(tileSize: number, x: number, y: number, width: number, height: number): TileKey[] {
  const keys: TileKey[] = [];
  const minTx = Math.floor(x / tileSize);
  const minTy = Math.floor(y / tileSize);
  const maxTx = Math.floor((x + width - 1) / tileSize);
  const maxTy = Math.floor((y + height - 1) / tileSize);
  for (let ty = minTy; ty <= maxTy; ty += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) keys.push(`${tx},${ty}` as TileKey);
  }
  return keys;
}

function makeWorkload(
  name: PaintWorkload['name'],
  canvasSize: number,
  strokeCount: number,
  pointsPerStroke: number,
  radiusRange: readonly [number, number],
  stepRange: readonly [number, number],
  seed: number,
): PaintWorkload {
  const random = lcg(seed);
  const strokes: BrushStroke[] = [];
  const margin = Math.min(512, Math.floor(canvasSize / 8));

  for (let strokeIndex = 0; strokeIndex < strokeCount; strokeIndex += 1) {
    let x = margin + random() * Math.max(1, canvasSize - margin * 2);
    let y = margin + random() * Math.max(1, canvasSize - margin * 2);
    let angle = random() * Math.PI * 2;
    const points: BrushPoint[] = [];

    for (let pointIndex = 0; pointIndex < pointsPerStroke; pointIndex += 1) {
      angle += (random() - 0.5) * 0.45;
      const step = lerp(stepRange[0], stepRange[1], random());
      x = clamp(x + Math.cos(angle) * step, 0, canvasSize - 1);
      y = clamp(y + Math.sin(angle) * step, 0, canvasSize - 1);
      points.push({ x, y, radius: lerp(radiusRange[0], radiusRange[1], random()) });
    }
    strokes.push(points);
  }

  return { name, canvasSize, strokes };
}

function lcg(initial: number): () => number {
  let state = initial >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
