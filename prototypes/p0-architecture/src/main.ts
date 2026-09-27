import './style.css';
import { PointerNormalizer } from './core/input';
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
let persistenceSequence = 0;
const persistenceWorker = new Worker(new URL('./workers/persistence.worker.ts', import.meta.url), { type: 'module' });

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (mode === 'main') {
    canvas.width = width;
    canvas.height = height;
    mainCtx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    mainCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  } else if (worker) {
    worker.postMessage({ type: 'resize', width, height });
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

function onPointerMove(event: PointerEvent): void {
  if (event.buttons === 0 && event.pointerType !== 'pen') return;
  const start = performance.now();
  const samples = normalizer.fromEvent(event, canvas.getBoundingClientRect());
  if (samples.length === 0) return;
  if (mode === 'main') drawMain(samples, start);
  else worker?.postMessage({ type: 'samples', samples, sentAt: start });
}

canvas.addEventListener('pointerdown', (event) => {
  canvas.setPointerCapture(event.pointerId);
  onPointerMove(event);
});
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', (event) => {
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener('pointercancel', (event) => {
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});

if (mode === 'worker' && 'transferControlToOffscreen' in canvas) {
  const offscreen = canvas.transferControlToOffscreen();
  worker = new Worker(new URL('./workers/realtime.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event) => {
    if (event.data?.type === 'presented') {
      metrics.push({
        name: 'main-to-worker-complete',
        value: performance.now() - Number(event.data.sentAt),
        unit: 'ms',
        timestamp: performance.now(),
      });
      renderStatus();
    }
  };
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  worker.postMessage(
    { type: 'init', canvas: offscreen, width: Math.round(rect.width * dpr), height: Math.round(rect.height * dpr) },
    [offscreen],
  );
} else if (mode === 'worker') {
  status.textContent = 'OffscreenCanvas transfer unavailable; reload with ?input=main';
} else {
  resize();
}

window.addEventListener('resize', resize, { passive: true });

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
  const key = mode === 'main' ? 'input-to-raf' : 'main-to-worker-complete';
  const input = metrics.summary(key);
  const persistence = metrics.summary('journal-write');
  status.textContent = [
    'Illustro P0 prototype',
    `input path: ${mode}`,
    `input ${input.count} samples | p50 ${input.p50.toFixed(2)}ms | p95 ${input.p95.toFixed(2)}ms | p99 ${input.p99.toFixed(2)}ms | max ${input.max.toFixed(2)}ms`,
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
