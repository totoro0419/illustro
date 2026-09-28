export const BRUSH_PROFILE = Object.freeze({ kind: 'one-euro', minCutoff: 4, beta: 4, dCutoff: 1 });
export const PAGE_SAMPLES = 256;
export const MUTABLE_TAIL_SAMPLES = 16;
export const MAX_PENDING_PAGES = 8;
export const SPACING = 1.75;

function alphaForCutoff(cutoff, dt) {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

class LowPass {
  constructor() { this.ready = false; this.y = 0; }
  next(x, a) {
    if (!this.ready) { this.ready = true; this.y = x; return x; }
    this.y = a * x + (1 - a) * this.y;
    return this.y;
  }
}

class OneEuro1D {
  constructor({ minCutoff, beta, dCutoff }) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xFilter = new LowPass();
    this.dxFilter = new LowPass();
    this.prevX = null;
  }
  next(x, dt) {
    const dx = this.prevX === null ? 0 : (x - this.prevX) / dt;
    this.prevX = x;
    const edx = this.dxFilter.next(dx, alphaForCutoff(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.next(x, alphaForCutoff(cutoff, dt));
  }
}

function mulHiLo(a, b) {
  const mask = 0xffffffffn;
  const p = BigInt(a >>> 0) * BigInt(b >>> 0);
  return [Number((p >> 32n) & mask) >>> 0, Number(p & mask) >>> 0];
}

export function philox4x32_10(counter, key) {
  const M0 = 0xD2511F53n, M1 = 0xCD9E8D57n;
  const W0 = 0x9E3779B9, W1 = 0xBB67AE85;
  let [x0, x1, x2, x3] = counter.map(v => v >>> 0);
  let [k0, k1] = key.map(v => v >>> 0);
  for (let round = 0; round < 10; round++) {
    const [hi0, lo0] = mulHiLo(Number(M0), x0);
    const [hi1, lo1] = mulHiLo(Number(M1), x2);
    [x0, x1, x2, x3] = [(hi1 ^ x1 ^ k0) >>> 0, lo1, (hi0 ^ x3 ^ k1) >>> 0, lo0];
    if (round !== 9) { k0 = (k0 + W0) >>> 0; k1 = (k1 + W1) >>> 0; }
  }
  return [x0, x1, x2, x3];
}

function uniform01(seedLo, seedHi, index, stream) {
  const lo = Number(BigInt(index) & 0xffffffffn) >>> 0;
  const hi = Number((BigInt(index) >> 32n) & 0xffffffffn) >>> 0;
  return philox4x32_10([lo, hi, stream >>> 0, 0], [seedLo >>> 0, seedHi >>> 0])[0] / 0x100000000;
}

export class StreamingBrushPipeline {
  constructor({ profile = BRUSH_PROFILE, spacing = SPACING, seedLo = 0x12345678, seedHi = 0x9abcdef0 } = {}) {
    this.profile = profile;
    this.spacing = spacing;
    this.seedLo = seedLo >>> 0;
    this.seedHi = seedHi >>> 0;
    this.resetStroke();
    this.totalAccepted = 0;
    this.totalPredicted = 0;
    this.totalDabs = 0;
    this.sealedPages = 0;
    this.pendingPages = 0;
    this.maxPendingObserved = 0;
    this.backpressureEvents = 0;
  }

  resetStroke() {
    this.fx = new OneEuro1D(this.profile);
    this.fy = new OneEuro1D(this.profile);
    this.prevT = null;
    this.prevPoint = null;
    this.spacingCarry = 0;
    this.dabIndex = 0;
    this.pageSamples = 0;
    this.tailSamples = 0;
    this.strokeAccepted = 0;
    this.strokeDabs = [];
  }

  beginStroke() { this.resetStroke(); }
  notePredicted(count) { this.totalPredicted += count; }

  processActual(sample) {
    const dt = this.prevT === null ? 1 / 120 : Math.max(1e-6, (sample.t - this.prevT) / 1000);
    this.prevT = sample.t;
    const p = { ...sample, x: this.fx.next(sample.x, dt), y: this.fy.next(sample.y, dt) };
    this.totalAccepted += 1;
    this.strokeAccepted += 1;
    this.tailSamples += 1;
    if (this.tailSamples > MUTABLE_TAIL_SAMPLES) {
      this.tailSamples -= 1;
      this.pageSamples += 1;
      if (this.pageSamples >= PAGE_SAMPLES) {
        if (this.pendingPages >= MAX_PENDING_PAGES) { this.backpressureEvents += 1; this.pendingPages -= 1; }
        this.pageSamples = 0;
        this.sealedPages += 1;
        this.pendingPages += 1;
        this.maxPendingObserved = Math.max(this.maxPendingObserved, this.pendingPages);
      }
    }
    const dabs = this.#emitBetween(this.prevPoint, p);
    this.prevPoint = p;
    this.totalDabs += dabs.length;
    this.strokeDabs.push(...dabs);
    return { point: p, dabs };
  }

  drainOnePage() { if (this.pendingPages > 0) this.pendingPages -= 1; }

  endStroke() {
    const releaseWork = this.pageSamples + this.tailSamples;
    if (releaseWork > 0) {
      if (this.pendingPages >= MAX_PENDING_PAGES) { this.backpressureEvents += 1; this.pendingPages -= 1; }
      this.sealedPages += 1;
      this.pendingPages += 1;
      this.maxPendingObserved = Math.max(this.maxPendingObserved, this.pendingPages);
    }
    return { releaseWork, accepted: this.strokeAccepted, dabs: this.strokeDabs.length };
  }

  #emit(x, y, pressure, t) {
    const i = this.dabIndex++;
    const jitterX = (uniform01(this.seedLo, this.seedHi, i, 1) - 0.5) * 0.2;
    const jitterY = (uniform01(this.seedLo, this.seedHi, i, 2) - 0.5) * 0.2;
    return { index: i, x: x + jitterX, y: y + jitterY, pressure, t };
  }

  #emitBetween(prev, cur) {
    if (!prev) return [this.#emit(cur.x, cur.y, cur.pressure, cur.t)];
    const dx = cur.x - prev.x, dy = cur.y - prev.y, dist = Math.hypot(dx, dy);
    if (dist <= 0) return [];
    const out = [];
    let at = this.spacing - this.spacingCarry;
    while (at <= dist + 1e-12) {
      const u = at / dist;
      out.push(this.#emit(prev.x + dx * u, prev.y + dy * u, prev.pressure + (cur.pressure - prev.pressure) * u, prev.t + (cur.t - prev.t) * u));
      at += this.spacing;
    }
    this.spacingCarry = (this.spacingCarry + dist) % this.spacing;
    return out;
  }
}

export function syntheticSamples(count, hz = 240) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const u = count <= 1 ? 0 : i / (count - 1);
    out.push({ x: 24 + 720 * u, y: 220 + 130 * Math.sin(u * Math.PI * 8), pressure: 0.1 + 0.85 * (0.5 + 0.5 * Math.sin(u * Math.PI * 3)), t: i * 1000 / hz, tiltX: 20 * Math.sin(u * Math.PI * 2), tiltY: 15 * Math.cos(u * Math.PI * 2) });
  }
  return out;
}

export function percentile(values, p) {
  if (!values.length) return 0;
  const a = [...values].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor((a.length - 1) * p))];
}

export function runSyntheticBrowserBenchmark({ samples = 100000, batch = 32 } = {}) {
  const source = syntheticSamples(samples);
  const pipeline = new StreamingBrushPipeline();
  pipeline.beginStroke();
  const batchTimes = [];
  for (let i = 0; i < source.length; i += batch) {
    const t0 = performance.now();
    const end = Math.min(source.length, i + batch);
    for (let j = i; j < end; j += 1) pipeline.processActual(source[j]);
    if ((i / batch) % 32 === 31) pipeline.drainOnePage();
    batchTimes.push(performance.now() - t0);
  }
  const release = pipeline.endStroke();
  return { accepted: pipeline.totalAccepted, dabs: pipeline.totalDabs, releaseWork: release.releaseWork, sealedPages: pipeline.sealedPages, maxPendingObserved: pipeline.maxPendingObserved, backpressureEvents: pipeline.backpressureEvents, batch, p50Ms: percentile(batchTimes, 0.50), p95Ms: percentile(batchTimes, 0.95), p99Ms: percentile(batchTimes, 0.99), maxMs: Math.max(...batchTimes) };
}
