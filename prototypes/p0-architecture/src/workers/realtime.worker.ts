import type { PointSample } from '../core/types';

type InitMessage = Readonly<{ type: 'init'; canvas: OffscreenCanvas; width: number; height: number; dpr: number }>;
type BeginMessage = Readonly<{ type: 'begin' }>;
type SamplesMessage = Readonly<{ type: 'samples'; samples: PointSample[]; sentAt: number }>;
type EndMessage = Readonly<{ type: 'end' }>;
type ResizeMessage = Readonly<{ type: 'resize'; width: number; height: number; dpr: number }>;
type Incoming = InitMessage | BeginMessage | SamplesMessage | EndMessage | ResizeMessage;

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let last: PointSample | null = null;
let dpr = 1;

function applyCanvasSize(width: number, height: number, nextDpr: number): void {
  if (!canvas) return;
  dpr = nextDpr;
  canvas.width = width;
  canvas.height = height;
  ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

self.onmessage = (event: MessageEvent<Incoming>) => {
  const message = event.data;
  if (message.type === 'init') {
    canvas = message.canvas;
    applyCanvasSize(message.width, message.height, message.dpr);
    self.postMessage({ type: 'ready' });
    return;
  }
  if (message.type === 'resize') {
    applyCanvasSize(message.width, message.height, message.dpr);
    return;
  }
  if (message.type === 'begin') {
    last = null;
    return;
  }
  if (message.type === 'end') {
    last = null;
    return;
  }
  if (message.type === 'samples' && ctx) {
    const receivedAt = performance.now();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';
    for (const sample of message.samples) {
      if (last) {
        ctx.beginPath();
        ctx.lineWidth = Math.max(1, 2 + sample.pressure * 10);
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(sample.x, sample.y);
        ctx.stroke();
      }
      last = sample;
    }
    self.postMessage({
      type: 'presented',
      sentAt: message.sentAt,
      receivedAt,
      completedAt: performance.now(),
      sampleCount: message.samples.length,
    });
  }
};
