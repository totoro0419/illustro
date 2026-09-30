export const CONNECTIVITY_SCHEMA = 'illustro.stroke-connectivity.v1';
export const CONNECTIVITY_ALGORITHM_VERSION = 'endpoint-geometry-0.1.0';

const EPS = 1e-9;
const clamp01 = value => Math.max(0, Math.min(1, value));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const sq = value => value * value;
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a, s) => ({ x: a.x * s, y: a.y * s });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const length = a => Math.hypot(a.x, a.y);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const normalize = a => {
  const n = length(a);
  return n > EPS ? { x: a.x / n, y: a.y / n } : { x: 1, y: 0 };
};
const angleBetween = (a, b) => Math.acos(clamp(dot(normalize(a), normalize(b)), -1, 1));
const smoothstep = (edge0, edge1, x) => {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
function median(values) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : 0.5 * (sorted[mid - 1] + sorted[mid]);
}
function quantile(values, q) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const p = clamp01(q) * (sorted.length - 1);
  const lo = Math.floor(p), hi = Math.ceil(p), t = p - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}
function pairKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

function normalizePoint(point, fallbackWidth, index) {
  const x = Number(point?.x ?? point?.[0]);
  const y = Number(point?.y ?? point?.[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError(`stroke point ${index} must contain finite x/y`);
  }
  const width = Number(point?.width ?? fallbackWidth ?? 1);
  const pressureRaw = point?.pressure;
  const timestampRaw = point?.timestamp ?? point?.time ?? point?.t;
  return {
    x,
    y,
    width: Number.isFinite(width) && width > 0 ? width : 1,
    pressure: Number.isFinite(Number(pressureRaw)) ? clamp01(Number(pressureRaw)) : null,
    timestamp: Number.isFinite(Number(timestampRaw)) ? Number(timestampRaw) : null,
  };
}

export function normalizeStroke(stroke, index = 0) {
  if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) {
    throw new TypeError(`stroke ${index} must have points[]`);
  }
  const id = String(stroke.strokeId ?? stroke.id ?? `stroke-${index + 1}`);
  const fallbackWidth = Number(stroke.width ?? 1);
  const raw = stroke.points.map((point, pointIndex) => normalizePoint(point, fallbackWidth, pointIndex));
  const points = [];
  for (const point of raw) {
    const prev = points.at(-1);
    if (!prev || distance(prev, point) > 1e-6) points.push(point);
    else {
      prev.width = 0.5 * (prev.width + point.width);
      if (point.pressure !== null) prev.pressure = point.pressure;
      if (point.timestamp !== null) prev.timestamp = point.timestamp;
    }
  }
  if (points.length === 1) points.push({ ...points[0], x: points[0].x + 1e-6 });
  return {
    strokeId: id,
    points,
    width: Number.isFinite(fallbackWidth) && fallbackWidth > 0 ? fallbackWidth : median(points.map(p => p.width)),
    cap: ['round', 'butt', 'square'].includes(stroke.cap) ? stroke.cap : 'round',
    order: Number.isFinite(Number(stroke.order)) ? Number(stroke.order) : index,
    meta: stroke.meta ?? null,
  };
}

function cumulativeLengths(points) {
  const cumulative = [0];
  for (let i = 1; i < points.length; i += 1) cumulative.push(cumulative[i - 1] + distance(points[i - 1], points[i]));
  return cumulative;
}

function sampleAtArc(stroke, end, arcDistance) {
  const points = stroke.points;
  const cumulative = stroke._cumulative ?? cumulativeLengths(points);
  const total = cumulative.at(-1);
  const d = clamp(arcDistance, 0, total);
  const target = end === 'start' ? d : total - d;
  let hi = 1;
  while (hi < cumulative.length && cumulative[hi] < target) hi += 1;
  if (hi >= cumulative.length) return { ...points.at(-1) };
  const lo = Math.max(0, hi - 1);
  const segment = Math.max(EPS, cumulative[hi] - cumulative[lo]);
  const t = clamp01((target - cumulative[lo]) / segment);
  const a = points[lo], b = points[hi];
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    width: a.width + (b.width - a.width) * t,
    pressure: a.pressure === null || b.pressure === null ? (a.pressure ?? b.pressure) : a.pressure + (b.pressure - a.pressure) * t,
    timestamp: a.timestamp === null || b.timestamp === null ? (a.timestamp ?? b.timestamp) : a.timestamp + (b.timestamp - a.timestamp) * t,
  };
}

function localSegmentVectors(stroke, end, span) {
  const fractions = [0, 0.08, 0.16, 0.28, 0.42, 0.60, 0.80, 1];
  const samples = fractions.map(f => sampleAtArc(stroke, end, span * f));
  const vectors = [];
  for (let i = 0; i < samples.length - 1; i += 1) {
    const near = samples[i], far = samples[i + 1];
    const v = sub(near, far);
    const n = length(v);
    if (n > EPS) vectors.push({ v: mul(v, 1 / n), arcWeight: Math.exp(-2.0 * fractions[i]), len: n });
  }
  return { samples, vectors };
}

function robustOutwardTangent(stroke, end, span) {
  const { samples, vectors } = localSegmentVectors(stroke, end, span);
  if (!vectors.length) return { tangent: { x: 1, y: 0 }, samples, turning: 0 };
  let direction = vectors[0].v;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    let sx = 0, sy = 0, sw = 0;
    for (const item of vectors) {
      const agreement = Math.abs(dot(item.v, direction));
      const huber = agreement >= 0.5 ? 1 : 0.35 + 1.3 * agreement;
      const w = item.arcWeight * item.len * huber;
      sx += item.v.x * w; sy += item.v.y * w; sw += w;
    }
    if (sw > EPS && Math.hypot(sx, sy) > EPS) direction = normalize({ x: sx / sw, y: sy / sw });
  }
  let turning = 0, weight = 0;
  for (let i = 0; i < vectors.length - 1; i += 1) {
    const w = Math.min(vectors[i].len, vectors[i + 1].len);
    turning += angleBetween(vectors[i].v, vectors[i + 1].v) * w;
    weight += w;
  }
  return { tangent: direction, samples, turning: weight > EPS ? turning / weight : 0 };
}

export function buildEndpointDescriptors(strokes, options = {}) {
  const normalized = strokes.map((stroke, index) => normalizeStroke(stroke, index));
  const endpoints = [];
  for (const stroke of normalized) {
    stroke._cumulative = cumulativeLengths(stroke.points);
    const totalLength = stroke._cumulative.at(-1);
    const globalWidth = Math.max(EPS, median(stroke.points.map(point => point.width)) || stroke.width || 1);
    for (const end of ['start', 'end']) {
      const endpointPosition = end === 'start' ? stroke.points[0] : stroke.points.at(-1);
      const preliminarySpan = clamp(totalLength * (options.localArcFraction ?? 0.22), globalWidth * 3.5, globalWidth * 18);
      const span = Math.min(totalLength, preliminarySpan);
      const local = robustOutwardTangent(stroke, end, Math.max(EPS, span));
      const traceFractions = [0, 0.2, 0.4, 0.6, 0.8, 1];
      const trace = traceFractions.map(f => sampleAtArc(stroke, end, span * f));
      const localWidths = trace.map(point => point.width).filter(Number.isFinite);
      const localPressures = trace.map(point => point.pressure).filter(Number.isFinite);
      const width = Math.max(EPS, median(localWidths) || globalWidth);
      const tangent = local.tangent;
      const lateralOffsets = trace.slice(1).map(point => Math.abs(cross(sub(point, endpointPosition), tangent)));
      const jitterNormalized = median(lateralOffsets) / Math.max(width, EPS);
      const chord = sub(endpointPosition, trace.at(-1));
      const chordAlignment = length(chord) > EPS ? Math.abs(dot(normalize(chord), tangent)) : 1;
      const quality = clamp01(
        0.35 +
        0.30 * smoothstep(1.5 * width, 5 * width, span) +
        0.20 * chordAlignment +
        0.15 * Math.exp(-0.35 * jitterNormalized)
      );
      endpoints.push({
        endpointId: `${stroke.strokeId}:${end}`,
        strokeId: stroke.strokeId,
        end,
        position: { x: endpointPosition.x, y: endpointPosition.y },
        tangent,
        outwardTangent: tangent,
        approachDirection: tangent,
        localCurvature: local.turning,
        localArcLength: span,
        width,
        endpointRadius: width / 2,
        pressure: localPressures.length ? mean(localPressures) : null,
        cap: stroke.cap,
        order: stroke.order,
        jitterNormalized,
        descriptorQuality: quality,
        trace: trace.map((point, i) => ({
          fraction: traceFractions[i], arcDistance: span * traceFractions[i], x: point.x, y: point.y, width: point.width, pressure: point.pressure,
        })),
      });
    }
    delete stroke._cumulative;
  }
  return { strokes: normalized, endpoints };
}

function capReach(endpoint, toward) {
  const r = endpoint.width / 2;
  if (endpoint.cap === 'butt') return r * Math.abs(cross(endpoint.outwardTangent, toward));
  if (endpoint.cap === 'square') {
    const t = Math.abs(dot(endpoint.outwardTangent, toward));
    const n = Math.abs(cross(endpoint.outwardTangent, toward));
    return r * (t + n);
  }
  return r;
}

function gapDiagnostics(a, b) {
  const delta = sub(b.position, a.position);
  const centerDistance = length(delta);
  const direction = centerDistance > EPS ? mul(delta, 1 / centerDistance) : normalize(add(a.outwardTangent, mul(b.outwardTangent, -1)));
  const reachA = capReach(a, direction);
  const reachB = capReach(b, mul(direction, -1));
  const effectiveGap = centerDistance - reachA - reachB;
  const widthScale = Math.max(EPS, 0.5 * (a.width + b.width));
  return { centerDistance, direction, endpointReachA: reachA, endpointReachB: reachB, effectiveGap, normalizedGap: effectiveGap / widthScale, widthScale };
}

function modelContact(a, b, gap) {
  const n = gap.normalizedGap;
  const score = n <= 0 ? 1 : 0.96 * Math.exp(-sq(n / 0.55));
  return { model: 'contact', score: clamp01(score), cost: 1 - clamp01(score), diagnostics: { normalizedGap: n, overlapsFootprint: gap.effectiveGap <= 0 } };
}

function facingScores(a, b, gap) {
  const g = gap.direction;
  const rawA = dot(a.outwardTangent, g);
  const rawB = dot(b.outwardTangent, mul(g, -1));
  return { rawA, rawB, a: smoothstep(-0.35, 0.75, rawA), b: smoothstep(-0.35, 0.75, rawB) };
}

function modelContinuation(a, b, gap) {
  const facing = facingScores(a, b, gap);
  const oppositionRaw = -dot(a.outwardTangent, b.outwardTangent);
  const opposition = smoothstep(-0.10, 0.92, oppositionRaw);
  const positiveGap = Math.max(0, gap.normalizedGap);
  const gapScore = Math.exp(-positiveGap / 4.2);
  const curvaturePenalty = Math.exp(-0.45 * (a.localCurvature + b.localCurvature));
  const jitterPenalty = Math.exp(-0.08 * (a.jitterNormalized + b.jitterNormalized));
  const score = gapScore * Math.sqrt(facing.a * facing.b) * (0.50 + 0.50 * opposition) * curvaturePenalty * jitterPenalty;
  return { model: 'continuation', score: clamp01(score), cost: 1 - clamp01(score), diagnostics: { facingA: facing.rawA, facingB: facing.rawB, opposition: oppositionRaw, gapScore, curvaturePenalty, jitterPenalty } };
}

function rayIntersectionDiagnostics(a, b) {
  const p = a.position, q = b.position;
  const r = a.outwardTangent, s = b.outwardTangent;
  const rxs = cross(r, s);
  const qp = sub(q, p);
  if (Math.abs(rxs) < 1e-5) return { exists: false, t: Infinity, u: Infinity, forward: false };
  const t = cross(qp, s) / rxs;
  const u = cross(qp, r) / rxs;
  return { exists: true, t, u, forward: t >= 0 && u >= 0 };
}

function modelCorner(a, b, gap) {
  const facing = facingScores(a, b, gap);
  const positiveGap = Math.max(0, gap.normalizedGap);
  const gapScore = Math.exp(-positiveGap / 4.0);
  const directJoin = Math.sqrt(facing.a * facing.b);
  const bendA = angleBetween(a.outwardTangent, gap.direction);
  const bendB = angleBetween(b.outwardTangent, mul(gap.direction, -1));
  const bendSoftness = 0.90 + 0.10 * Math.exp(-0.15 * (bendA + bendB));
  const rays = rayIntersectionDiagnostics(a, b);
  const raySupport = rays.forward ? 1 : 0.94;
  const score = gapScore * directJoin * bendSoftness * raySupport;
  return { model: 'corner', score: clamp01(score), cost: 1 - clamp01(score), diagnostics: { facingA: facing.rawA, facingB: facing.rawB, bendA, bendB, gapScore, rayIntersection: rays } };
}

function tracePointAtArc(endpoint, arcDistance) {
  const trace = endpoint.trace;
  if (!trace.length) return endpoint.position;
  const d = clamp(arcDistance, 0, endpoint.localArcLength);
  let hi = 1;
  while (hi < trace.length && (trace[hi].arcDistance ?? endpoint.localArcLength * trace[hi].fraction) < d) hi += 1;
  if (hi >= trace.length) return trace.at(-1);
  const lo = Math.max(0, hi - 1);
  const da = trace[lo].arcDistance ?? endpoint.localArcLength * trace[lo].fraction;
  const db = trace[hi].arcDistance ?? endpoint.localArcLength * trace[hi].fraction;
  const t = clamp01((d - da) / Math.max(EPS, db - da));
  return { x: trace[lo].x + (trace[hi].x - trace[lo].x) * t, y: trace[lo].y + (trace[hi].y - trace[lo].y) * t };
}

function capTraceDiagnostics(a, b) {
  const sampleCount = Math.max(4, Math.min(a.trace.length, b.trace.length));
  const commonArc = Math.max(EPS, Math.min(a.localArcLength, b.localArcLength));
  const separations = [], alongOffsets = [], signedSides = [];
  let meanOut = add(a.outwardTangent, b.outwardTangent);
  if (length(meanOut) < EPS) meanOut = a.outwardTangent;
  meanOut = normalize(meanOut);
  const normal = { x: -meanOut.y, y: meanOut.x };
  for (let i = 0; i < sampleCount; i += 1) {
    const d = commonArc * i / (sampleCount - 1);
    const pa = tracePointAtArc(a, d), pb = tracePointAtArc(b, d);
    const delta = sub(pb, pa);
    separations.push(length(delta));
    alongOffsets.push(Math.abs(dot(delta, meanOut)));
    signedSides.push(dot(delta, normal));
  }
  const sepMedian = median(separations);
  const sepMad = median(separations.map(value => Math.abs(value - sepMedian)));
  const stability = sepMedian > EPS ? Math.exp(-4 * sepMad / sepMedian) : 1;
  const alongMedian = median(alongOffsets);
  const transverse = sepMedian > EPS ? Math.exp(-2.6 * alongMedian / sepMedian) : 1;
  const sideConsistency = signedSides.every(v => v >= -EPS) || signedSides.every(v => v <= EPS) ? 1 : 0.45;
  const deep = separations.at(-1) ?? sepMedian;
  const tip = separations[0] ?? sepMedian;
  const convergence = deep > EPS ? clamp((deep - tip) / deep, -1, 1) : 0;
  return { separations, sepMedian, sepMad, stability, alongMedian, transverse, sideConsistency, convergence, meanOut };
}

function modelCap(a, b, gap) {
  const trace = capTraceDiagnostics(a, b);
  const sameDirectionRaw = dot(a.outwardTangent, b.outwardTangent);
  const parallel = smoothstep(0.15, 0.94, sameDirectionRaw);
  const direction = gap.centerDistance > EPS ? gap.direction : { x: -trace.meanOut.y, y: trace.meanOut.x };
  const axial = Math.abs(dot(direction, trace.meanOut));
  const lateral = Math.exp(-sq(axial / 0.42));
  const availableRun = Math.max(EPS, Math.min(a.localArcLength, b.localArcLength));
  const aspect = gap.centerDistance / availableRun;
  const aspectScore = Math.exp(-1.8 * Math.max(0, aspect - 0.90));
  const positiveGap = Math.max(0, gap.normalizedGap);
  const gapSoft = 1 / (1 + positiveGap / 6.0);
  const convergenceBoost = 0.96 + 0.04 * smoothstep(-0.10, 0.45, trace.convergence);
  const structure = parallel * lateral * trace.stability * trace.transverse * trace.sideConsistency * aspectScore;
  const score = structure * (0.48 + 0.52 * gapSoft) * convergenceBoost;
  return {
    model: 'cap', score: clamp01(score), cost: 1 - clamp01(score),
    diagnostics: { sameDirection: sameDirectionRaw, axialFraction: axial, spacingMedian: trace.sepMedian, spacingMad: trace.sepMad, spacingStability: trace.stability, transverse: trace.transverse, sideConsistency: trace.sideConsistency, convergence: trace.convergence, aspect, gapSoft },
  };
}

function candidateRadius(endpoint, options) {
  const widthReach = endpoint.width * (options.candidateWidthMultiplier ?? 8);
  const shapeReach = endpoint.localArcLength * (options.candidateArcMultiplier ?? 0.75);
  return Math.max(widthReach, shapeReach);
}

export function scoreEndpointPair(a, b, options = {}) {
  const gap = gapDiagnostics(a, b);
  const modelScores = [modelContact(a, b, gap), modelContinuation(a, b, gap), modelCorner(a, b, gap), modelCap(a, b, gap)].sort((x, y) => y.score - x.score);
  const best = modelScores[0], second = modelScores[1];
  const quality = Math.sqrt(a.descriptorQuality * b.descriptorQuality);
  const modelMargin = best.score - second.score;
  const confidence = clamp01(best.score * (0.86 + 0.14 * quality));
  return {
    candidateId: `candidate:${pairKey(a.endpointId, b.endpointId)}`,
    endpointA: a.endpointId,
    endpointB: b.endpointId,
    target: { kind: 'endpoint', endpointId: b.endpointId },
    centerDistance: gap.centerDistance,
    effectiveGap: gap.effectiveGap,
    normalizedGap: gap.normalizedGap,
    widthScale: gap.widthScale,
    connectionModel: best.model,
    modelScores,
    modelMargin,
    confidence,
    descriptorQuality: quality,
    competingCandidates: { endpointA: [], endpointB: [] },
    connected: false,
    decisionReason: 'not-resolved',
  };
}

function normalizeManualPairs(pairs = []) {
  const set = new Set();
  for (const pair of pairs) {
    if (Array.isArray(pair) && pair.length >= 2) set.add(pairKey(String(pair[0]), String(pair[1])));
    else if (pair && pair.endpointA && pair.endpointB) set.add(pairKey(String(pair.endpointA), String(pair.endpointB)));
    else if (typeof pair === 'string' && pair.includes('|')) set.add(pair);
  }
  return set;
}

function annotateCompetition(candidates) {
  const byEndpoint = new Map();
  for (const candidate of candidates) {
    for (const endpointId of [candidate.endpointA, candidate.endpointB]) {
      if (!byEndpoint.has(endpointId)) byEndpoint.set(endpointId, []);
      byEndpoint.get(endpointId).push(candidate);
    }
  }
  for (const [endpointId, list] of byEndpoint) {
    list.sort((a, b) => b.confidence - a.confidence);
    for (const candidate of list) {
      const rivals = list.filter(item => item !== candidate).slice(0, 3).map(item => ({
        candidateId: item.candidateId,
        otherEndpoint: item.endpointA === endpointId ? item.endpointB : item.endpointA,
        confidence: item.confidence,
        model: item.connectionModel,
      }));
      if (candidate.endpointA === endpointId) candidate.competingCandidates.endpointA = rivals;
      else candidate.competingCandidates.endpointB = rivals;
    }
  }
  return byEndpoint;
}

function rankInfo(candidate, endpointId, byEndpoint) {
  const list = byEndpoint.get(endpointId) ?? [];
  const index = list.indexOf(candidate);
  const second = list.find(item => item !== candidate);
  return { rank: index >= 0 ? index + 1 : Infinity, best: index === 0, margin: index === 0 ? candidate.confidence - (second?.confidence ?? 0) : candidate.confidence - (list[0]?.confidence ?? 0) };
}

function resolveDecisions(candidates, byEndpoint, options) {
  const threshold = options.connectionThreshold ?? 0.70;
  const highThreshold = options.highConfidenceThreshold ?? 0.90;
  const competitionMargin = options.competitionMargin ?? 0.075;
  const manualConnect = normalizeManualPairs(options.manualConnections);
  const manualDisconnect = normalizeManualPairs(options.manualDisconnections);

  for (const candidate of candidates) {
    const key = pairKey(candidate.endpointA, candidate.endpointB);
    const rankA = rankInfo(candidate, candidate.endpointA, byEndpoint);
    const rankB = rankInfo(candidate, candidate.endpointB, byEndpoint);
    candidate.competition = { endpointA: rankA, endpointB: rankB };
    if (manualDisconnect.has(key)) { candidate.connected = false; candidate.decisionReason = 'manual-disconnect'; continue; }
    if (manualConnect.has(key)) { candidate.connected = true; candidate.decisionReason = 'manual-connect'; continue; }
    const contactScore = candidate.modelScores.find(score => score.model === 'contact')?.score ?? 0;
    if (contactScore >= (options.junctionContactThreshold ?? 0.90)) { candidate.connected = true; candidate.decisionReason = 'contact-junction-compatible'; continue; }
    if (candidate.confidence < threshold) { candidate.connected = false; candidate.decisionReason = 'below-confidence-threshold'; continue; }
    const mutualBest = rankA.best && rankB.best;
    const clearA = rankA.margin >= competitionMargin || (byEndpoint.get(candidate.endpointA)?.length ?? 0) <= 1;
    const clearB = rankB.margin >= competitionMargin || (byEndpoint.get(candidate.endpointB)?.length ?? 0) <= 1;
    if (mutualBest && clearA && clearB) { candidate.connected = true; candidate.decisionReason = 'mutual-best-clear-margin'; }
    else if (candidate.confidence >= highThreshold && mutualBest) { candidate.connected = true; candidate.decisionReason = 'mutual-best-high-confidence'; }
    else { candidate.connected = false; candidate.decisionReason = 'competition-ambiguous'; }
  }
}

export function resolveStrokeConnectivity(strokes, options = {}) {
  const built = buildEndpointDescriptors(strokes, options);
  const endpoints = built.endpoints;
  const candidates = [];
  for (let i = 0; i < endpoints.length; i += 1) {
    for (let j = i + 1; j < endpoints.length; j += 1) {
      const a = endpoints[i], b = endpoints[j];
      const dist = distance(a.position, b.position);
      const searchRadius = Math.max(candidateRadius(a, options), candidateRadius(b, options));
      if (dist > searchRadius) continue;
      candidates.push(scoreEndpointPair(a, b, options));
    }
  }
  const byEndpoint = annotateCompetition(candidates);
  resolveDecisions(candidates, byEndpoint, options);
  candidates.sort((a, b) => b.confidence - a.confidence);
  const edges = candidates.filter(candidate => candidate.connected).map((candidate, index) => ({
    edgeId: `edge-${index + 1}`,
    from: { kind: 'endpoint', endpointId: candidate.endpointA },
    to: { kind: 'endpoint', endpointId: candidate.endpointB },
    candidateId: candidate.candidateId,
    model: candidate.connectionModel,
    confidence: candidate.confidence,
    decisionReason: candidate.decisionReason,
  }));
  return {
    schema: CONNECTIVITY_SCHEMA,
    algorithmVersion: CONNECTIVITY_ALGORITHM_VERSION,
    generatedAt: new Date().toISOString(),
    supportsTargetKinds: ['endpoint', 'segment'],
    strokes: built.strokes.map(stroke => ({ ...stroke, points: stroke.points.map(point => ({ ...point })) })),
    endpoints,
    candidates,
    edges,
    diagnostics: {
      endpointCount: endpoints.length,
      candidateCount: candidates.length,
      connectedEdgeCount: edges.length,
      thresholds: { connection: options.connectionThreshold ?? 0.70, highConfidence: options.highConfidenceThreshold ?? 0.90, competitionMargin: options.competitionMargin ?? 0.075 },
    },
  };
}

export function connectionSet(graph) {
  return new Set((graph.edges ?? []).map(edge => pairKey(edge.from.endpointId, edge.to.endpointId)));
}

function conditionBucket(candidate) {
  const gap = candidate.normalizedGap;
  const curvature = candidate.modelScores.find(m => m.model === 'corner')?.diagnostics ?? {};
  const bend = (curvature.bendA ?? 0) + (curvature.bendB ?? 0);
  return {
    gap: gap <= 0 ? 'contact' : gap <= 1 ? 'gap<=1w' : gap <= 3 ? 'gap<=3w' : 'gap>3w',
    bend: bend <= Math.PI / 6 ? 'near-straight' : bend <= Math.PI * 2 / 3 ? 'moderate-bend' : 'strong-bend',
    model: candidate.connectionModel,
  };
}

export function evaluateConnectivity(graph, truthPairs, options = {}) {
  const truth = normalizeManualPairs(truthPairs);
  const predicted = connectionSet(graph);
  let tp = 0, fp = 0, fn = 0;
  for (const key of predicted) truth.has(key) ? tp++ : fp++;
  for (const key of truth) if (!predicted.has(key)) fn++;
  const precision = tp + fp ? tp / (tp + fp) : (truth.size === 0 ? 1 : 0);
  const recall = tp + fn ? tp / (tp + fn) : 1;
  const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
  const exactMatch = fp === 0 && fn === 0;
  const labeledCandidates = (graph.candidates ?? []).map(candidate => ({ candidate, y: truth.has(pairKey(candidate.endpointA, candidate.endpointB)) ? 1 : 0 }));
  const brier = labeledCandidates.length ? mean(labeledCandidates.map(({ candidate, y }) => sq(candidate.confidence - y))) : 0;
  const bins = [];
  const binCount = options.calibrationBins ?? 5;
  for (let i = 0; i < binCount; i += 1) {
    const low = i / binCount, high = (i + 1) / binCount;
    const rows = labeledCandidates.filter(({ candidate }) => candidate.confidence >= low && (i === binCount - 1 ? candidate.confidence <= high : candidate.confidence < high));
    bins.push({ low, high, count: rows.length, meanConfidence: rows.length ? mean(rows.map(row => row.candidate.confidence)) : null, observedRate: rows.length ? mean(rows.map(row => row.y)) : null });
  }
  const modelStats = {}, conditionStats = {};
  for (const { candidate, y } of labeledCandidates) {
    const predictedPositive = candidate.connected ? 1 : 0;
    const model = candidate.connectionModel;
    const bucket = conditionBucket(candidate);
    const conditionKey = `${bucket.model}/${bucket.gap}/${bucket.bend}`;
    for (const [key, target] of [[model, modelStats], [conditionKey, conditionStats]]) {
      target[key] ??= { total: 0, trueConnection: 0, predictedConnection: 0, tp: 0, fp: 0, fn: 0 };
      const row = target[key];
      row.total += 1; row.trueConnection += y; row.predictedConnection += predictedPositive;
      if (predictedPositive && y) row.tp += 1;
      else if (predictedPositive && !y) row.fp += 1;
      else if (!predictedPositive && y) row.fn += 1;
    }
  }
  return {
    schema: 'illustro.stroke-connectivity-evaluation.v1',
    truthConnectionCount: truth.size,
    predictedConnectionCount: predicted.size,
    trueConnection: tp,
    falseConnection: fp,
    missedConnection: fn,
    precision,
    recall,
    f1,
    graphExactMatch: exactMatch,
    confidenceCalibration: { brier, bins },
    modelStats,
    conditionStats,
  };
}

export const __test = { pairKey, gapDiagnostics, capTraceDiagnostics, conditionBucket, quantile };
