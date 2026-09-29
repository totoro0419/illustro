import { StreamingBrushPipeline, BRUSH_PROFILE, percentile } from './brush-core.js';

const params = new URLSearchParams(location.search);
const ciMode = params.get('ci') === '1';
const CONFIG = ciMode
  ? { bucketMs: 1000, baselineMs: 2000, minMs: 6000, maxMs: 10000, strokeMs: 500, realisticRate: 240, stressDuty: 0.50 }
  : { bucketMs: 30000, baselineMs: 60000, minMs: 180000, maxMs: 360000, strokeMs: 5000, realisticRate: 240, stressDuty: 0.50 };

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
const status = document.querySelector('#status');
const result = document.querySelector('#result');
const phaseEl = document.querySelector('#phase');
const instruction = document.querySelector('#instruction');
const progress = document.querySelector('#progress');
const startButton = document.querySelector('#start');
const stopButton = document.querySelector('#stop');
const copyButton = document.querySelector('#copy');
const heatSelect = document.querySelector('#heat');

let pipeline = new StreamingBrushPipeline();
let phase = 'idle';
let runStart = 0;
let autoEnd = 0;
let stopReason = null;
let generatedSamples = 0;
let acceptedAtStart = 0;
let wakeLock = null;
let wakeLockState = 'not-requested';
let visibilityInterruptions = 0;
let lastRaf = null;
let nextBucketAt = 0;
let bucketStartAt = 0;
let bucketGeneratedStart = 0;
let bucketAcceptedStart = 0;
let bucketBackpressureStart = 0;
let bucketFrameIntervals = [];
let bucketWorkTimes = [];
let bucketMaxPending = 0;
let buckets = [];
let lastStrokeIndex = -1;
let lastDrainAt = 0;
let realisticProcessed = 0;
let framePeriodEstimate = 16.67;
let postPen = {
  startedAt: null, strokes: 0, trustedPenSamples: 0, cpuTimes: [], rafTimes: [], pressureMin: 1, pressureMax: 0, tiltSeen: false,
};
let activePointer = null;

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 3);
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}
resize();
window.addEventListener('resize', resize, { passive: true });

function median(values) { return percentile(values, 0.5); }
function mad(values) {
  if (!values.length) return 0;
  const m = median(values);
  return median(values.map(v => Math.abs(v - m)));
}

function drawDabs(dabs) {
  for (const d of dabs) {
    const r = 1.4 + d.pressure * 3.0;
    ctx.beginPath();
    ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(20,20,24,${0.18 + 0.55 * d.pressure})`;
    ctx.fill();
  }
}

function syntheticSample(index, t) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, rect.width), height = Math.max(240, rect.height);
  const u = (index % 2400) / 2399;
  const cycle = Math.floor(index / 2400) % 4;
  const x = 18 + u * (width - 36);
  const y0 = height * (0.25 + cycle * 0.16);
  return {
    x,
    y: y0 + Math.sin(u * Math.PI * 10) * Math.min(70, height * 0.12),
    pressure: 0.15 + 0.75 * (0.5 + 0.5 * Math.sin(u * Math.PI * 3)),
    tiltX: 25 * Math.sin(u * Math.PI * 2),
    tiltY: 18 * Math.cos(u * Math.PI * 2),
    t,
  };
}

function processSyntheticOne(t) {
  const s = syntheticSample(generatedSamples, t);
  generatedSamples += 1;
  const out = pipeline.processActual(s);
  drawDabs(out.dabs);
}

function maybeRotateStroke(elapsed) {
  const strokeIndex = Math.floor(elapsed / CONFIG.strokeMs);
  if (strokeIndex === lastStrokeIndex) return;
  if (lastStrokeIndex >= 0) pipeline.endStroke();
  pipeline.beginStroke();
  lastStrokeIndex = strokeIndex;
  if (strokeIndex % 2 === 0) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function closeBucket(now) {
  const elapsed = now - runStart;
  const accepted = pipeline.totalAccepted - acceptedAtStart;
  const generatedDelta = generatedSamples - bucketGeneratedStart;
  const acceptedDelta = accepted - bucketAcceptedStart;
  const heap = performance.memory ? {
    usedJSHeapSize: performance.memory.usedJSHeapSize,
    totalJSHeapSize: performance.memory.totalJSHeapSize,
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
  } : null;
  const duration = Math.max(1, now - bucketStartAt);
  const bucket = {
    index: buckets.length,
    startMs: bucketStartAt - runStart,
    endMs: elapsed,
    mode: bucketStartAt - runStart < CONFIG.baselineMs ? 'realistic-baseline' : 'stress',
    generatedSamples: generatedDelta,
    acceptedSamples: acceptedDelta,
    samplesPerSecond: generatedDelta * 1000 / duration,
    workP50Ms: percentile(bucketWorkTimes, .50),
    workP95Ms: percentile(bucketWorkTimes, .95),
    workP99Ms: percentile(bucketWorkTimes, .99),
    frameIntervalP50Ms: percentile(bucketFrameIntervals, .50),
    frameIntervalP95Ms: percentile(bucketFrameIntervals, .95),
    frameIntervalsOver25ms: bucketFrameIntervals.filter(v => v > 25).length,
    frameCount: bucketFrameIntervals.length,
    maxPendingPages: bucketMaxPending,
    backpressureEvents: pipeline.backpressureEvents - bucketBackpressureStart,
    heap,
  };
  buckets.push(bucket);
  bucketStartAt = now;
  bucketGeneratedStart = generatedSamples;
  bucketAcceptedStart = accepted;
  bucketBackpressureStart = pipeline.backpressureEvents;
  bucketFrameIntervals = [];
  bucketWorkTimes = [];
  bucketMaxPending = pipeline.pendingPages;
  return bucket;
}

function stabilityScreen() {
  const stress = buckets.filter(b => b.mode === 'stress');
  if (stress.length < 4) return { ready: false, stable: false };
  const first = stress.slice(0, 2);
  const recent = stress.slice(-2);
  const initialThroughput = median(first.map(b => b.samplesPerSecond));
  const recentThroughput = median(recent.map(b => b.samplesPerSecond));
  const initialFrame = median(first.map(b => b.frameIntervalP95Ms));
  const recentFrame = median(recent.map(b => b.frameIntervalP95Ms));
  const throughputs = stress.map(b => b.samplesPerSecond);
  const frames = stress.map(b => b.frameIntervalP95Ms);
  const throughputNoiseFrac = initialThroughput > 0 ? 3 * mad(throughputs) / initialThroughput : 1;
  const frameNoiseFrac = initialFrame > 0 ? 3 * mad(frames) / initialFrame : 1;
  const allowedThroughputDrop = Math.max(0.15, throughputNoiseFrac);
  const allowedFrameRise = Math.max(0.15, frameNoiseFrac);
  const throughputDrop = initialThroughput > 0 ? (initialThroughput - recentThroughput) / initialThroughput : 0;
  const frameRise = initialFrame > 0 ? (recentFrame - initialFrame) / initialFrame : 0;
  const bounded = pipeline.maxPendingObserved <= 8;
  const stable = bounded && throughputDrop <= allowedThroughputDrop && frameRise <= allowedFrameRise;
  return {
    ready: true, stable, bounded,
    initialThroughput, recentThroughput, throughputDrop, allowedThroughputDrop,
    initialFrameP95Ms: initialFrame, recentFrameP95Ms: recentFrame, frameRise, allowedFrameRise,
  };
}

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) { wakeLockState = 'unavailable'; return; }
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLockState = 'active';
    wakeLock.addEventListener('release', () => { wakeLockState = 'released'; });
  } catch {
    wakeLockState = 'denied-or-unavailable';
  }
}

function startRun() {
  if (phase !== 'idle') return;
  pipeline = new StreamingBrushPipeline();
  pipeline.beginStroke();
  phase = 'auto';
  startButton.disabled = true;
  stopButton.disabled = false;
  copyButton.disabled = true;
  heatSelect.value = '';
  runStart = performance.now();
  acceptedAtStart = pipeline.totalAccepted;
  nextBucketAt = runStart + CONFIG.bucketMs;
  bucketStartAt = runStart;
  bucketGeneratedStart = 0;
  bucketAcceptedStart = 0;
  bucketBackpressureStart = 0;
  buckets = [];
  generatedSamples = 0;
  lastStrokeIndex = -1;
  lastDrainAt = runStart;
  realisticProcessed = 0;
  stopReason = null;
  visibilityInterruptions = 0;
  postPen = { startedAt:null, strokes:0, trustedPenSamples:0, cpuTimes:[], rafTimes:[], pressureMin:1, pressureMax:0, tiltSeen:false };
  requestWakeLock();
  render();
}

function finishAuto(reason) {
  if (phase !== 'auto') return;
  const now = performance.now();
  if (now - bucketStartAt > CONFIG.bucketMs * 0.5) closeBucket(now);
  pipeline.endStroke();
  autoEnd = now;
  stopReason = reason;
  phase = 'post-pen';
  stopButton.disabled = true;
  phaseEl.textContent = '最終Penチェック';
  instruction.textContent = '10〜20秒ほど普通に描いてください。500 Pen samples以上になれば十分です。';
  render();
}

function finalize() {
  if (phase !== 'post-pen') return;
  phase = 'done';
  if (wakeLock && !wakeLock.released) wakeLock.release();
  copyButton.disabled = false;
  render();
}

function autoWork(now) {
  const elapsed = now - runStart;
  maybeRotateStroke(elapsed);
  const t0 = performance.now();
  if (elapsed < CONFIG.baselineMs) {
    const shouldHave = Math.floor(elapsed * CONFIG.realisticRate / 1000);
    let due = Math.min(32, shouldHave - realisticProcessed);
    while (due-- > 0) {
      processSyntheticOne(elapsed);
      realisticProcessed += 1;
    }
  } else {
    const frameBudget = Math.min(8, Math.max(2, framePeriodEstimate * CONFIG.stressDuty));
    let guard = 0;
    while (performance.now() - t0 < frameBudget && guard < 10000) {
      processSyntheticOne(elapsed + guard / CONFIG.realisticRate * 1000);
      guard += 1;
    }
  }
  bucketWorkTimes.push(performance.now() - t0);
  bucketMaxPending = Math.max(bucketMaxPending, pipeline.pendingPages);
  if (now - lastDrainAt >= 250) {
    pipeline.drainOnePage();
    lastDrainAt = now;
  }
  if (now >= nextBucketAt) {
    closeBucket(now);
    nextBucketAt += CONFIG.bucketMs;
  }
  const screen = stabilityScreen();
  if (elapsed >= CONFIG.minMs && screen.ready && screen.stable) {
    finishAuto('stable-screening-criterion');
  } else if (elapsed >= CONFIG.maxMs) {
    finishAuto('max-duration');
  }
}

function loop(now) {
  if (lastRaf !== null) {
    const dt = now - lastRaf;
    if (phase === 'auto') {
      bucketFrameIntervals.push(dt);
      if (buckets.length < 2 && dt > 4 && dt < 50) {
        framePeriodEstimate = framePeriodEstimate * 0.9 + dt * 0.1;
      }
    }
  }
  lastRaf = now;
  if (phase === 'auto') autoWork(now);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

document.addEventListener('visibilitychange', () => {
  if (phase === 'auto' && document.visibilityState !== 'visible') visibilityInterruptions += 1;
});

function normalize(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left, y: e.clientY - rect.top,
    pressure: Number.isFinite(e.pressure) ? e.pressure : 0.5,
    tiltX: Number.isFinite(e.tiltX) ? e.tiltX : 0,
    tiltY: Number.isFinite(e.tiltY) ? e.tiltY : 0,
    t: Number.isFinite(e.timeStamp) ? e.timeStamp : performance.now(),
    pointerType: e.pointerType || 'unknown', trusted: e.isTrusted === true,
  };
}

function processPostPenEvent(event) {
  if (phase !== 'post-pen') return;
  const received = performance.now();
  const events = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
  const actual = events.length ? events : [event];
  for (const raw of actual) {
    const s = normalize(raw);
    if (!s.trusted || s.pointerType !== 'pen') continue;
    postPen.trustedPenSamples += 1;
    postPen.pressureMin = Math.min(postPen.pressureMin, s.pressure);
    postPen.pressureMax = Math.max(postPen.pressureMax, s.pressure);
    postPen.tiltSeen ||= Math.abs(s.tiltX) > 0 || Math.abs(s.tiltY) > 0;
    const out = pipeline.processActual(s);
    drawDabs(out.dabs);
  }
  postPen.cpuTimes.push(performance.now() - received);
  requestAnimationFrame(() => postPen.rafTimes.push(performance.now() - received));
  if (postPen.trustedPenSamples >= 500) finalize();
}

canvas.addEventListener('pointerdown', event => {
  if (phase !== 'post-pen' || activePointer !== null) return;
  activePointer = event.pointerId;
  postPen.strokes += 1;
  if (postPen.startedAt === null) postPen.startedAt = performance.now();
  pipeline.beginStroke();
  canvas.setPointerCapture(event.pointerId);
  processPostPenEvent(event);
});
canvas.addEventListener('pointermove', event => {
  if (event.pointerId === activePointer) processPostPenEvent(event);
});
function endPointer(event) {
  if (event.pointerId !== activePointer) return;
  processPostPenEvent(event);
  pipeline.endStroke();
  activePointer = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

function report() {
  const elapsedAuto = runStart ? (autoEnd || performance.now()) - runStart : 0;
  const stable = stabilityScreen();
  return {
    schema: 'illustro.brush-sustained-benchmark.v1',
    generatedAt: new Date().toISOString(),
    ciMode,
    profile: BRUSH_PROFILE,
    config: CONFIG,
    environment: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      deviceMemory: navigator.deviceMemory ?? null,
      dpr: devicePixelRatio,
      viewport: [innerWidth, innerHeight],
    },
    auto: {
      phase, elapsedMs: elapsedAuto, stopReason,
      generatedSamples, acceptedSamples: pipeline.totalAccepted - acceptedAtStart,
      maxPendingObserved: pipeline.maxPendingObserved,
      backpressureEvents: pipeline.backpressureEvents,
      visibilityInterruptions, wakeLockState,
      framePeriodEstimateMs: framePeriodEstimate,
      stabilityScreen: stable,
      buckets,
    },
    postPen: {
      strokes: postPen.strokes,
      trustedPenSamples: postPen.trustedPenSamples,
      pressureMin: Number.isFinite(postPen.pressureMin) ? postPen.pressureMin : null,
      pressureMax: postPen.pressureMax,
      pressureRange: Number.isFinite(postPen.pressureMin) ? postPen.pressureMax - postPen.pressureMin : null,
      tiltSeen: postPen.tiltSeen,
      pipelineP50Ms: percentile(postPen.cpuTimes, .50),
      pipelineP95Ms: percentile(postPen.cpuTimes, .95),
      pipelineP99Ms: percentile(postPen.cpuTimes, .99),
      receiveToNextRafP50Ms: percentile(postPen.rafTimes, .50),
      receiveToNextRafP95Ms: percentile(postPen.rafTimes, .95),
      receiveToNextRafP99Ms: percentile(postPen.rafTimes, .99),
    },
    userObservation: { heat: heatSelect.value || null },
    reviewEligibility: {
      autoCompleted: phase === 'post-pen' || phase === 'done',
      minimumElapsedReached: elapsedAuto >= CONFIG.minMs,
      foregroundContinuous: visibilityInterruptions === 0,
      acceptedEqualsGenerated: (pipeline.totalAccepted - acceptedAtStart) >= generatedSamples,
      pendingBounded: pipeline.maxPendingObserved <= 8,
      postPenComplete: postPen.trustedPenSamples >= 500,
    },
  };
}

function render() {
  const r = report();
  if (phase === 'idle') {
    phaseEl.textContent = '開始前';
    instruction.textContent = '開始すると自動負荷が走ります。途中はPen操作不要です。';
  } else if (phase === 'auto') {
    const sec = r.auto.elapsedMs / 1000;
    phaseEl.textContent = '自動負荷';
    instruction.textContent = `${sec.toFixed(0)}秒 / 最短${(CONFIG.minMs/60000).toFixed(0)}分・最大${(CONFIG.maxMs/60000).toFixed(0)}分。画面は開いたままにしてください。`;
  } else if (phase === 'done') {
    phaseEl.textContent = '測定完了';
    instruction.textContent = '端末の熱さを選び、JSONをコピーしてチャットへ貼ってください。';
  }
  const pct = phase === 'auto' ? Math.min(100, r.auto.elapsedMs / CONFIG.maxMs * 100) : phase === 'idle' ? 0 : 100;
  progress.style.width = pct + '%';
  status.textContent = [
    `phase: ${phase}`,
    `elapsed: ${(r.auto.elapsedMs/1000).toFixed(0)}s`,
    `buckets: ${buckets.length}`,
    `generated: ${generatedSamples}`,
    `pending max: ${pipeline.maxPendingObserved}`,
    `post Pen: ${postPen.trustedPenSamples}/500`,
  ].join('\n');
  result.value = JSON.stringify(r, null, 2);
}

startButton.addEventListener('click', startRun);
stopButton.addEventListener('click', () => finishAuto('user-stop'));
copyButton.addEventListener('click', async () => {
  result.value = JSON.stringify(report(), null, 2);
  try { await navigator.clipboard.writeText(result.value); copyButton.textContent = 'コピー済み'; }
  catch { result.focus(); result.select(); copyButton.textContent = '選択しました'; }
  setTimeout(() => copyButton.textContent = 'JSONをコピー', 1200);
});
heatSelect.addEventListener('change', render);

window.illustroSustained = { report, startRun, finishAuto, stabilityScreen };
render();
