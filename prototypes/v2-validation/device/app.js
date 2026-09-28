import { StreamingBrushPipeline, BRUSH_PROFILE, runSyntheticBrowserBenchmark, percentile } from './brush-core.js';

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
const status = document.querySelector('#status');
const result = document.querySelector('#result');
const resetButton = document.querySelector('#reset');
const copyButton = document.querySelector('#copy');
const syntheticButton = document.querySelector('#synthetic');

const pipeline = new StreamingBrushPipeline();
let activePointer = null;
let strokeCount = 0;
const cpuTimes = [];
const rafTimes = [];
const frameIntervals = [];
const releaseWorks = [];
let penSamples = 0;
let touchSamples = 0;
let mouseSamples = 0;
let coalescedSamples = 0;
let predictedSamples = 0;
let pressureMin = 1, pressureMax = 0;
let tiltSeen = false;
let lastRaf = null;
let sessionStartedAt = performance.now();

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }
}

function rafLoop(ts) {
  if (lastRaf !== null) frameIntervals.push(ts - lastRaf);
  lastRaf = ts;
  requestAnimationFrame(rafLoop);
}
requestAnimationFrame(rafLoop);
window.addEventListener('resize', resize, { passive: true });
resize();

function normalize(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    pressure: Number.isFinite(e.pressure) ? e.pressure : 0.5,
    tiltX: Number.isFinite(e.tiltX) ? e.tiltX : 0,
    tiltY: Number.isFinite(e.tiltY) ? e.tiltY : 0,
    t: Number.isFinite(e.timeStamp) ? e.timeStamp : performance.now(),
    pointerType: e.pointerType || 'unknown',
  };
}

function noteSensor(s) {
  if (s.pointerType === 'pen') penSamples += 1;
  else if (s.pointerType === 'touch') touchSamples += 1;
  else if (s.pointerType === 'mouse') mouseSamples += 1;
  pressureMin = Math.min(pressureMin, s.pressure);
  pressureMax = Math.max(pressureMax, s.pressure);
  tiltSeen ||= Math.abs(s.tiltX) > 0 || Math.abs(s.tiltY) > 0;
}

function drawDabs(dabs) {
  for (const d of dabs) {
    const radius = 1.4 + d.pressure * 3.0;
    ctx.beginPath();
    ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(20, 20, 24, ${0.18 + 0.55 * d.pressure})`;
    ctx.fill();
  }
}

function processPointerEvent(event) {
  const received = performance.now();
  const actualEvents = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
  const actual = actualEvents.length ? actualEvents : [event];
  coalescedSamples += Math.max(0, actual.length - 1);
  const predictions = typeof event.getPredictedEvents === 'function' ? event.getPredictedEvents() : [];
  predictedSamples += predictions.length;
  pipeline.notePredicted(predictions.length);
  for (const raw of actual) {
    const s = normalize(raw);
    noteSensor(s);
    const out = pipeline.processActual(s);
    drawDabs(out.dabs);
  }
  cpuTimes.push(performance.now() - received);
  requestAnimationFrame(() => rafTimes.push(performance.now() - received));
  renderStatus();
}

canvas.addEventListener('pointerdown', event => {
  if (activePointer !== null) return;
  activePointer = event.pointerId;
  pipeline.beginStroke();
  strokeCount += 1;
  canvas.setPointerCapture(event.pointerId);
  processPointerEvent(event);
});
canvas.addEventListener('pointermove', event => {
  if (event.pointerId !== activePointer) return;
  processPointerEvent(event);
});
function endStroke(event) {
  if (event.pointerId !== activePointer) return;
  processPointerEvent(event);
  releaseWorks.push(pipeline.endStroke().releaseWork);
  activePointer = null;
  renderStatus();
}
canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);
canvas.addEventListener('lostpointercapture', event => {
  if (event.pointerId === activePointer) {
    releaseWorks.push(pipeline.endStroke().releaseWork);
    activePointer = null;
    renderStatus();
  }
});

function summary() {
  const frameMissThreshold = 25;
  const memory = performance.memory ? {
    usedJSHeapSize: performance.memory.usedJSHeapSize,
    totalJSHeapSize: performance.memory.totalJSHeapSize,
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
  } : null;
  const deviceGate = penSamples >= 500 && strokeCount >= 3 && pressureMax - pressureMin >= 0.15;
  return {
    schema: 'illustro.brush-device-benchmark.v1',
    generatedAt: new Date().toISOString(),
    profile: BRUSH_PROFILE,
    environment: { userAgent: navigator.userAgent, platform: navigator.platform, hardwareConcurrency: navigator.hardwareConcurrency ?? null, deviceMemory: navigator.deviceMemory ?? null, dpr: window.devicePixelRatio, viewport: [window.innerWidth, window.innerHeight] },
    session: { durationMs: performance.now() - sessionStartedAt, strokeCount, acceptedActualSamples: pipeline.totalAccepted, penSamples, touchSamples, mouseSamples, coalescedSamples, predictedSamples, pressureMin: Number.isFinite(pressureMin) ? pressureMin : null, pressureMax, tiltSeen, totalDabs: pipeline.totalDabs, sealedPages: pipeline.sealedPages, maxPendingObserved: pipeline.maxPendingObserved, backpressureEvents: pipeline.backpressureEvents, maxReleaseWork: releaseWorks.length ? Math.max(...releaseWorks) : 0 },
    timing: { pipelineP50Ms: percentile(cpuTimes, .50), pipelineP95Ms: percentile(cpuTimes, .95), pipelineP99Ms: percentile(cpuTimes, .99), pipelineMaxMs: cpuTimes.length ? Math.max(...cpuTimes) : 0, receiveToNextRafP50Ms: percentile(rafTimes, .50), receiveToNextRafP95Ms: percentile(rafTimes, .95), receiveToNextRafP99Ms: percentile(rafTimes, .99), frameIntervalP95Ms: percentile(frameIntervals, .95), frameIntervalsOver25ms: frameIntervals.filter(x => x > frameMissThreshold).length },
    memory,
    gateEvidence: { actualSampleLossObservable: 0, penProtocolComplete: deviceGate, requiredPenSamples: 500, requiredStrokes: 3, requiredPressureRange: 0.15 },
  };
}

function renderStatus() {
  const s = summary();
  const pass = s.gateEvidence.penProtocolComplete;
  status.textContent = [
    `実機プロトコル: ${pass ? 'COMPLETE' : 'INCOMPLETE'}`,
    `strokes ${strokeCount}/3 | pen samples ${penSamples}/500`,
    `pressure range ${(pressureMax - pressureMin).toFixed(3)} / 0.150`,
    `pipeline p95 ${s.timing.pipelineP95Ms.toFixed(3)} ms`,
    `receive→RAF p95 ${s.timing.receiveToNextRafP95Ms.toFixed(3)} ms`,
    `max release work ${s.session.maxReleaseWork} samples`,
  ].join('\n');
  result.value = JSON.stringify(s, null, 2);
}

resetButton.addEventListener('click', () => { ctx.clearRect(0, 0, canvas.width, canvas.height); location.reload(); });
copyButton.addEventListener('click', async () => { await navigator.clipboard.writeText(result.value); copyButton.textContent = 'コピー済み'; setTimeout(() => copyButton.textContent = 'JSONをコピー', 1200); });
syntheticButton.addEventListener('click', () => { const b = runSyntheticBrowserBenchmark({ samples: 100000, batch: 32 }); result.value = JSON.stringify({ manual: summary(), synthetic100k: b }, null, 2); });
window.illustroBrushDevice = { summary, runSyntheticBrowserBenchmark };
renderStatus();
