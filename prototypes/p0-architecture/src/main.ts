import './style.css';
import { PointerNormalizer } from './core/input';
import { ActivePointerGate } from './core/activePointer';
import { MetricSeries } from './core/metrics';
import { runHistoryBenchmark, runTileBenchmark } from './bench/api';
import type { PointSample } from './core/types';

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
let worker: Worker | null = null;
let mainCtx: CanvasRenderingContext2D | null = null;
let lastMainSample: PointSample | null = null;
const pointerGate = new ActivePointerGate();
let canvasRect = canvas.getBoundingClientRect();
let canvasDpr = Math.min(devicePixelRatio || 1, 2);
let persistenceSequence = 0;
const persistenceWorker = new Worker(new URL('./workers/persistence.worker.ts', import.meta.url), { type: 'module' });

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
    metrics.push({ name: 'input-to-raf', value: performance.now() - eventStart, unit: 'ms', timestamp: performance.now() });
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
      metrics.push({
        name: 'worker-roundtrip',
        value: now - Number(event.data.sentAt),
        unit: 'ms',
        timestamp: now,
      });
      requestAnimationFrame(() => {
        metrics.push({
          name: 'worker-to-next-raf',
          value: performance.now() - Number(event.data.sentAt),
          unit: 'ms',
          timestamp: performance.now(),
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

persistenceWorker.onmessage = (event) => {
  if (event.data?.type === 'append-done') {
    metrics.push({ name: 'journal-write', value: Number(event.data.duration), unit: 'ms', timestamp: performance.now() });
    renderStatus();
  }
};

async function runPersistenceBenchmark(records = 64, bytesPerRecord = 16_384): Promise<void> {
  const pending: Promise<void>[] = [];
  for (let i = 0; i < records; i += 1) {
    const bytes = new Uint8Array(bytesPerRecord);
    crypto.getRandomValues(bytes);
    const sequence = persistenceSequence++;
    pending.push(new Promise((resolve, reject) => {
      const listener = (event: MessageEvent) => {
        if (event.data?.sequence !== sequence) return;
        persistenceWorker.removeEventListener('message', listener);
        if (event.data?.type === 'append-error') reject(new Error(event.data.message));
        else resolve();
      };
      persistenceWorker.addEventListener('message', listener);
      persistenceWorker.postMessage({ type: 'append', bytes, sequence }, [bytes.buffer]);
    }));
  }
  await Promise.all(pending);
  renderStatus();
}

function renderStatus(): void {
  const mainInput = metrics.summary('input-to-raf');
  const workerRoundtrip = metrics.summary('worker-roundtrip');
  const workerRaf = metrics.summary('worker-to-next-raf');
  const persistence = metrics.summary('journal-write');
  const inputLine = mode === 'main'
    ? `input→next RAF ${mainInput.count} | p50 ${mainInput.p50.toFixed(2)}ms | p95 ${mainInput.p95.toFixed(2)}ms | p99 ${mainInput.p99.toFixed(2)}ms | max ${mainInput.max.toFixed(2)}ms`
    : `worker roundtrip ${workerRoundtrip.count} | p50 ${workerRoundtrip.p50.toFixed(2)}ms | p95 ${workerRoundtrip.p95.toFixed(2)}ms; input→next RAF p50 ${workerRaf.p50.toFixed(2)}ms | p95 ${workerRaf.p95.toFixed(2)}ms`;
  status.textContent = [
    'Illustro P0 prototype',
    `input path: ${mode}`,
    inputLine,
    `journal ${persistence.count} writes | p50 ${persistence.p50.toFixed(2)}ms | p95 ${persistence.p95.toFixed(2)}ms`,
    'console API: window.illustroPrototype',
  ].join('\n');
}

const api = {
  mode,
  metrics,
  runTileBenchmark,
  runHistoryBenchmark,
  runPersistenceBenchmark,
  tileSweep: (operations = 20_000) => [64, 128, 256, 512, 1024].map((size) => runTileBenchmark(size, operations)),
};

Object.assign(window, { illustroPrototype: api });
renderStatus();

declare global {
  interface Window {
    illustroPrototype: typeof api;
  }
}
