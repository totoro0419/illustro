import type { PointSample } from '../core/types';

type InitMessage = Readonly<{ type: 'init'; canvas: OffscreenCanvas; width: number; height: number }>;
type SamplesMessage = Readonly<{ type: 'samples'; samples: PointSample[]; sentAt: number }>;
type ResizeMessage = Readonly<{ type: 'resize'; width: number; height: number }>;
type Incoming = InitMessage | SamplesMessage | ResizeMessage;

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let last: PointSample | null = null;

self.onmessage = (event: MessageEvent<Incoming>) => {
  const message = event.data;
  if (message.type === 'init') {
    canvas = message.canvas;
    canvas.width = message.width;
    canvas.height = message.height;
    ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    ctx?.setTransform(1, 0, 0, 1, 0, 0);
    self.postMessage({ type: 'ready' });
    return;
  }
  if (message.type === 'resize' && canvas) {
    canvas.width = message.width;
    canvas.height = message.height;
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
