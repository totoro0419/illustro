import './style.css';
import { PointerNormalizer } from './core/input';
import { ActivePointerGate } from './core/activePointer';
import { MetricSeries } from './core/metrics';
import type { PointSample } from './core/types';

const moduleStart = performance.now();

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`prototype DOM missing: ${selector}`);
  return element;
}

const canvas = requireElement<HTMLCanvasElement>('#surface');
const status = requireElement<HTMLPreElement>('#status');
const mode = new URLSearchParams(location.search).get('input') === 'worker' ? 'worker' : 'main';
const normalizer = new PointerNormalizer();
const metrics = new MetricSeries();
const pointerGate = new ActivePointerGate();

const advancedLoads = {
  benchmarkCore: false,
  benchmarkExtended: false,
  graphics: false,
  wasm: false,
  persistence: false,
};

const startup = {
  bootStart: window.__ILLUSTRO_BOOT_START__ ?? moduleStart,
  moduleStart,
  canvasReady: 0,
  firstStrokeStart: null as number | null,
  firstStrokeRaf: null as number | null,
};

let worker: Worker | null = null;
let mainCtx: CanvasRenderingContext2D | null = null;
let lastMainSample: PointSample | null = null;
let canvasRect = canvas.getBoundingClientRect();
let canvasDpr = Math.min(devicePixelRatio || 1, 2);

let persistenceSequence = 0;
let persistenceRequestId = 1;
let persistenceWorker: Worker | null = null;
let lastPersistenceBackend: string | null = null;
const journalPending = new Map<number, { resolve: () => void; reject: (error: Error) => void }>();
const controlPending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

function refreshGeometry(): void {
  canvasRect = canvas.getBoundingClientRect();
  canvasDpr = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(canvasRect.width * canvasDpr));
  const height = Math.max(1, Math.round(canvasRect.height * canvasDpr));

  if (mode === 'main') {
    canvas.width = width;
    canvas.height = height;
    mainCtx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    mainCtx?.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
  } else if (worker) {
    worker.postMessage({ type: 'resize', width, height, dpr: canvasDpr });
  }
}

function drawMain(samples: PointSample[], eventStart: number): void {
  if (!mainCtx) return;
  mainCtx.lineCap = 'round';
  mainCtx.lineJoin = 'round';
  mainCtx.strokeStyle = '#111';

  for (const sample of samples) {
    if (lastMainSample) {
      mainCtx.beginPath();
      mainCtx.lineWidth = Math.max(1, 2 + sample.pressure * 10);
      mainCtx.moveTo(lastMainSample.x, lastMainSample.y);
      mainCtx.lineTo(sample.x, sample.y);
      mainCtx.stroke();
    }
    lastMainSample = sample;
  }

  requestAnimationFrame(() => {
    const now = performance.now();
    if (startup.firstStrokeStart !== null && startup.firstStrokeRaf === null) startup.firstStrokeRaf = now;
    metrics.push({ name: 'input-to-raf', value: now - eventStart, unit: 'ms', timestamp: now });
    renderStatus();
  });
}

function handleActivePointer(event: PointerEvent): void {
  if (!pointerGate.accepts(event.pointerId)) return;
  const start = performance.now();
  const samples = normalizer.fromEvent(event, canvasRect);
  if (samples.length === 0) return;
  if (mode === 'main') drawMain(samples, start);
  else worker?.postMessage({ type: 'samples', samples, sentAt: start });
}

function endStroke(event: PointerEvent): void {
  if (!pointerGate.accepts(event.pointerId)) return;
  worker?.postMessage({ type: 'end' });
  lastMainSample = null;
  pointerGate.end(event.pointerId);
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
}

canvas.addEventListener('pointerdown', (event) => {
  if (!pointerGate.begin(event.pointerId)) return;
  if (startup.firstStrokeStart === null) startup.firstStrokeStart = performance.now();
  lastMainSample = null;
  worker?.postMessage({ type: 'begin' });
  canvas.setPointerCapture(event.pointerId);
  handleActivePointer(event);
});
canvas.addEventListener('pointermove', handleActivePointer);
canvas.addEventListener('pointerup', (event) => {
  handleActivePointer(event);
  endStroke(event);
});
canvas.addEventListener('pointercancel', endStroke);
canvas.addEventListener('lostpointercapture', (event) => {
  if (pointerGate.accepts(event.pointerId)) {
    worker?.postMessage({ type: 'end' });
    lastMainSample = null;
    pointerGate.end(event.pointerId);
  }
});

if (mode === 'worker' && 'transferControlToOffscreen' in canvas) {
  const offscreen = canvas.transferControlToOffscreen();
  worker = new Worker(new URL('./workers/realtime.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event) => {
    if (event.data?.type === 'presented') {
      const now = performance.now();
      if (startup.firstStrokeStart !== null && startup.firstStrokeRaf === null) {
        requestAnimationFrame(() => {
          if (startup.firstStrokeRaf === null) startup.firstStrokeRaf = performance.now();
        });
      }
      metrics.push({
        name: 'worker-roundtrip',
        value: now - Number(event.data.sentAt),
        unit: 'ms',
        timestamp: now,
      });
      requestAnimationFrame(() => {
        const frameNow = performance.now();
        metrics.push({
          name: 'worker-to-next-raf',
          value: frameNow - Number(event.data.sentAt),
          unit: 'ms',
          timestamp: frameNow,
        });
        renderStatus();
      });
    }
  };

  canvasRect = canvas.getBoundingClientRect();
  canvasDpr = Math.min(devicePixelRatio || 1, 2);
  worker.postMessage(
    {
      type: 'init',
      canvas: offscreen,
      width: Math.max(1, Math.round(canvasRect.width * canvasDpr)),
      height: Math.max(1, Math.round(canvasRect.height * canvasDpr)),
      dpr: canvasDpr,
    },
    [offscreen],
  );
} else if (mode === 'worker') {
  status.textContent = 'OffscreenCanvas transfer unavailable; reload with ?input=main';
} else {
  refreshGeometry();
}

window.addEventListener('resize', refreshGeometry, { passive: true });
window.addEventListener('scroll', () => { canvasRect = canvas.getBoundingClientRect(); }, { passive: true });
window.visualViewport?.addEventListener('resize', refreshGeometry, { passive: true });

startup.canvasReady = performance.now();

function getPersistenceWorker(): Worker {
  if (persistenceWorker) return persistenceWorker;
  advancedLoads.persistence = true;
  persistenceWorker = new Worker(new URL('./workers/persistence.worker.ts', import.meta.url), { type: 'module' });
  persistenceWorker.onmessage = onPersistenceMessage;
  return persistenceWorker;
}

function onPersistenceMessage(event: MessageEvent): void {
  const data = event.data;
  if (data?.type === 'batch-done') {
    const now = performance.now();
    lastPersistenceBackend = String(data.backend);
    metrics.push({ name: 'journal-batch-flush', value: Number(data.duration), unit: 'ms', timestamp: now });
    metrics.push({ name: 'journal-batch-bytes', value: Number(data.bytes), unit: 'bytes', timestamp: now });
    metrics.push({ name: 'journal-batch-records', value: Number(data.records), unit: 'count', timestamp: now });
    for (const sequence of data.sequences as number[]) journalPending.get(sequence)?.resolve();
    for (const sequence of data.sequences as number[]) journalPending.delete(sequence);
    renderStatus();
    return;
  }

  if (data?.type === 'batch-error') {
    const error = new Error(String(data.message));
    for (const sequence of data.sequences as number[]) journalPending.get(sequence)?.reject(error);
    for (const sequence of data.sequences as number[]) journalPending.delete(sequence);
    return;
  }

  if (typeof data?.requestId === 'number') {
    const pending = controlPending.get(data.requestId);
    if (!pending) return;
    controlPending.delete(data.requestId);
    if (data.type === 'control-error') pending.reject(new Error(String(data.message)));
    else pending.resolve(data);
  }
}

type PersistenceBenchmarkOptions = Readonly<{ maxBatchBytes?: number; batchDelayMs?: number }>;

async function runPersistenceBenchmark(
  records = 64,
  bytesPerRecord = 16_384,
  options: PersistenceBenchmarkOptions = {},
): Promise<Readonly<{ backend: string | null; batches: number }>> {
  const maxBatchBytes = options.maxBatchBytes ?? 128 * 1024;
  const batchDelayMs = options.batchDelayMs ?? 16;
  const persistence = getPersistenceWorker();
  const beforeBatches = metrics.summary('journal-batch-flush').count;
  persistence.postMessage({ type: 'configure', maxBatchBytes, batchDelayMs });

  const pending: Promise<void>[] = [];
  for (let i = 0; i < records; i += 1) {
    const bytes = new Uint8Array(bytesPerRecord);
    crypto.getRandomValues(bytes);
    const sequence = persistenceSequence++;
    pending.push(new Promise((resolve, reject) => {
      journalPending.set(sequence, { resolve, reject });
      persistence.postMessage({ type: 'append', bytes, sequence }, [bytes.buffer]);
    }));
  }

  persistence.postMessage({ type: 'flush' });
  await Promise.all(pending);
  renderStatus();
  return {
    backend: lastPersistenceBackend,
    batches: metrics.summary('journal-batch-flush').count - beforeBatches,
  };
}

async function resetPersistence(): Promise<unknown> {
  return persistenceControl({ type: 'reset' });
}

async function inspectPersistence(): Promise<unknown> {
  return persistenceControl({ type: 'inspect' });
}

async function injectTornPersistence(sequence = 0xffff_fffe, payloadBytes = 64, keepBytes = 11): Promise<unknown> {
  return persistenceControl({ type: 'inject-torn-frame', sequence, payloadBytes, keepBytes });
}

async function closePersistence(): Promise<unknown> {
  if (!persistenceWorker) return { type: 'closed', backend: null };
  const result = await persistenceControl({ type: 'close' });
  persistenceWorker.terminate();
  persistenceWorker = null;
  return result;
}

async function persistenceControl(message: Readonly<Record<string, unknown>>): Promise<unknown> {
  const persistence = getPersistenceWorker();
  const requestId = persistenceRequestId++;
  return new Promise((resolve, reject) => {
    controlPending.set(requestId, { resolve, reject });
    persistence.postMessage({ ...message, requestId });
  });
}

async function runTileBenchmark(tileSize = 256, operations = 20_000): Promise<unknown> {
  advancedLoads.benchmarkCore = true;
  const module = await import('./bench/api');
  return module.runTileBenchmark(tileSize, operations);
}

async function runHistoryBenchmark(commits = 100_000): Promise<unknown> {
  advancedLoads.benchmarkCore = true;
  const module = await import('./bench/api');
  return module.runHistoryBenchmark(commits);
}

async function runRasterSealBenchmark(
  revisions = 5000,
  editsPerRevision = 2,
  tileBytes = 256 * 256 * 4,
  checkpointInterval = 128,
): Promise<unknown> {
  advancedLoads.benchmarkExtended = true;
  const module = await import('./bench/extended');
  return module.runRasterSealBenchmark(revisions, editsPerRevision, tileBytes, checkpointInterval);
}

async function runCachePressureBenchmark(
  budgetBytes = 64 * 1024 * 1024,
  entries = 1000,
  entryBytes = 256 * 1024,
): Promise<unknown> {
  advancedLoads.benchmarkExtended = true;
  const module = await import('./bench/extended');
  return module.runCachePressureBenchmark(budgetBytes, entries, entryBytes);
}

async function probeGraphicsCapabilities(): Promise<unknown> {
  advancedLoads.graphics = true;
  const module = await import('./core/graphicsProbe');
  return module.probeGraphicsCapabilities();
}

async function runGraphicsBackendSmoke(): Promise<unknown> {
  advancedLoads.graphics = true;
  const module = await import('./core/renderBackend');
  const probeCanvas = document.createElement('canvas');
  probeCanvas.width = 4;
  probeCanvas.height = 4;
  return module.selectRenderBackend(probeCanvas);
}

async function runWasmBoundaryBenchmark(iterations = 1_000_000): Promise<unknown> {
  advancedLoads.wasm = true;
  const module = await import('./core/wasmBoundary');
  return module.runWasmBoundaryBenchmark(iterations);
}

async function tileSweep(operations = 20_000): Promise<unknown[]> {
  advancedLoads.benchmarkCore = true;
  const module = await import('./bench/api');
  return [64, 128, 256, 512, 1024].map((size) => module.runTileBenchmark(size, operations));
}

function getStartupMetrics(): Readonly<{
  bootToModuleMs: number;
  bootToCanvasReadyMs: number;
  firstStrokeToNextRafMs: number | null;
  advancedLoads: Readonly<typeof advancedLoads>;
}> {
  return {
    bootToModuleMs: startup.moduleStart - startup.bootStart,
    bootToCanvasReadyMs: startup.canvasReady - startup.bootStart,
    firstStrokeToNextRafMs: startup.firstStrokeStart !== null && startup.firstStrokeRaf !== null
      ? startup.firstStrokeRaf - startup.firstStrokeStart
      : null,
    advancedLoads: { ...advancedLoads },
  };
}

function renderStatus(): void {
  const mainInput = metrics.summary('input-to-raf');
  const workerRoundtrip = metrics.summary('worker-roundtrip');
  const workerRaf = metrics.summary('worker-to-next-raf');
  const persistence = metrics.summary('journal-batch-flush');
  const batchRecords = metrics.summary('journal-batch-records');
  const inputLine = mode === 'main'
    ? `input→next RAF ${mainInput.count} | p50 ${mainInput.p50.toFixed(2)}ms | p95 ${mainInput.p95.toFixed(2)}ms | p99 ${mainInput.p99.toFixed(2)}ms | max ${mainInput.max.toFixed(2)}ms`
    : `worker roundtrip ${workerRoundtrip.count} | p50 ${workerRoundtrip.p50.toFixed(2)}ms | p95 ${workerRoundtrip.p95.toFixed(2)}ms; input→next RAF p50 ${workerRaf.p50.toFixed(2)}ms | p95 ${workerRaf.p95.toFixed(2)}ms`;
  status.textContent = [
    'Illustro P0 prototype',
    `input path: ${mode}`,
    inputLine,
    `journal ${persistence.count} batches | flush p50 ${persistence.p50.toFixed(2)}ms | p95 ${persistence.p95.toFixed(2)}ms | records/batch p50 ${batchRecords.p50.toFixed(0)}`,
    'console API: window.illustroPrototype',
  ].join('\n');
}

const api = {
  mode,
  metrics,
  getStartupMetrics,
  runTileBenchmark,
  runHistoryBenchmark,
  runRasterSealBenchmark,
  runCachePressureBenchmark,
  probeGraphicsCapabilities,
  runGraphicsBackendSmoke,
  runWasmBoundaryBenchmark,
  runPersistenceBenchmark,
  resetPersistence,
  inspectPersistence,
  injectTornPersistence,
  closePersistence,
  tileSweep,
};

Object.assign(window, { illustroPrototype: api });
renderStatus();

declare global {
  interface Window {
    __ILLUSTRO_BOOT_START__?: number;
    illustroPrototype: typeof api;
  }
}
