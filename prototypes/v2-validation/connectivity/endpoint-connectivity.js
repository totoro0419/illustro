export const CONNECTIVITY_SCHEMA = 'illustro.stroke-connectivity.v1';
export const CONNECTIVITY_ALGORITHM_VERSION = 'stroke-geometry-0.3.0';

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
export function targetKey(target) { return target.kind === 'endpoint' ? target.endpointId : `@${target.strokeId}:${target.arcFraction.toFixed(6)}`; }
export function connectionKey(endpointA, target) { return target.kind === 'endpoint' ? pairKey(endpointA,target.endpointId) : `${endpointA}|${targetKey(target)}`; }
function pairKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

// Explicit validation adapter: width must come from the renderer's known
// pressure/brush policy. Predicted samples must never become canonical ends.
export function strokeFromSemanticRecord(record, { strokeId, widthAtPoint, cap='round', order=0 }={}) {
  if(!record || !Array.isArray(record.reconstructed) || !record.reconstructed.length) throw new TypeError('semantic record requires reconstructed samples');
  if(!strokeId || typeof widthAtPoint!=='function') throw new TypeError('strokeId and renderer widthAtPoint are required');
  return normalizeStroke({strokeId,cap,order,source:{kind:'semantic-reconstructed',schemaVersion:record.schemaVersion,reconstructionProfile:record.reconstructionProfile},points:record.reconstructed.map((p,i)=>{
    const width=widthAtPoint(p,i);
    if(!Number.isFinite(width) || width<=0) throw new TypeError('renderer width must be finite and positive');
    return {...p,width};
  })});
}

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
    pressure: pressureRaw != null && Number.isFinite(Number(pressureRaw)) ? clamp01(Number(pressureRaw)) : null,
    timestamp: timestampRaw != null && Number.isFinite(Number(timestampRaw)) ? Number(timestampRaw) : null,
    tiltX: point?.tiltX ?? null,
    tiltY: point?.tiltY ?? null,
    twist: point?.twist ?? null,
    pointerType: point?.pointerType ?? null,
  };
}

export function normalizeStroke(stroke, index = 0) {
  if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) {
    throw new TypeError(`stroke ${index} must have points[]`);
  }
  const id = String(stroke.strokeId ?? stroke.id ?? `stroke-${index + 1}`);
  if (!id || id.includes('|')) throw new TypeError('strokeId must be nonempty and cannot contain |');
  const fallbackWidth = Number(stroke.width ?? 1);
  const raw = stroke.points.map((point, pointIndex) => normalizePoint(point, fallbackWidth, pointIndex));
  const points = [];
  for (const point of raw) {
    const prev = points.at(-1);
    if (!prev || distance(prev, point) > 1e-6) points.push(point);
    else {
      prev.width = point.width;
      if (point.pressure !== null) prev.pressure = point.pressure;
      if (point.timestamp !== null) prev.timestamp = point.timestamp;
    }
  }
  return {
    strokeId: id,
    points,
    width: Number.isFinite(fallbackWidth) && fallbackWidth > 0 ? fallbackWidth : median(points.map(p => p.width)),
    cap: ['round', 'butt', 'square'].includes(stroke.cap) ? stroke.cap : 'round',
    order: Number.isFinite(Number(stroke.order)) ? Number(stroke.order) : index,
    meta: stroke.meta ?? null,
    pointerType: stroke.pointerType ?? null,
    source: stroke.source ?? null,
    geometryRevision: stroke.geometryRevision ?? null,
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
  if (points.length === 1) return { ...points[0] };
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
  const ids = new Set();
  for (const stroke of normalized) {
    if (ids.has(stroke.strokeId)) throw new TypeError(`duplicate strokeId: ${stroke.strokeId}`);
    ids.add(stroke.strokeId);
  }
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
      const neighborhoodWidth = Math.max(EPS, median(localWidths) || globalWidth);
      const width = endpointPosition.width;
      const adjacent = end === 'start' ? stroke.points[1] : stroke.points.at(-2);
      const capTangent = adjacent ? normalize(sub(endpointPosition, adjacent)) : local.tangent;
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
        neighborhoodWidth,
        capTangent,
        terminalPressure: endpointPosition.pressure,
        timestamp: endpointPosition.timestamp,
        degenerate: totalLength <= EPS,
        strokeLength: totalLength,
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
  if (endpoint.cap === 'butt') return r * Math.abs(cross(endpoint.capTangent ?? endpoint.outwardTangent, toward));
  if (endpoint.cap === 'square') {
    const t = Math.abs(dot(endpoint.capTangent ?? endpoint.outwardTangent, toward));
    const n = Math.abs(cross(endpoint.capTangent ?? endpoint.outwardTangent, toward));
    return r * (t + n);
  }
  return r;
}

// Contact is evaluated on terminal vector footprints, never on pixels.
// Round = disc; square/butt = an oriented terminal patch using the rendered
// final segment, while connection explanations retain the robust tangent.
function terminalFootprint(endpoint) {
  const r = endpoint.width / 2, p = endpoint.position;
  if (endpoint.cap === 'round') return { kind: 'circle', center: p, radius: r };
  const t = endpoint.capTangent ?? endpoint.outwardTangent;
  const n = { x: -t.y, y: t.x };
  const outward = endpoint.cap === 'square' ? r : 0;
  return { kind: 'polygon', vertices: [[-r,-r],[outward,-r],[outward,r],[-r,r]].map(([u,v]) => add(p,add(mul(t,u),mul(n,v)))) };
}
function pointSegmentDistance(p,a,b) {
  const v = sub(b,a), u = clamp(dot(sub(p,a),v) / Math.max(EPS,dot(v,v)),0,1);
  return distance(p,add(a,mul(v,u)));
}
function polygonEdges(vertices) { return vertices.map((v,i)=>[v,vertices[(i+1)%vertices.length]]); }
function insidePolygon(p,vertices) {
  const signs = polygonEdges(vertices).map(([a,b])=>cross(sub(b,a),sub(p,a)));
  return signs.every(v=>v>=-EPS) || signs.every(v=>v<=EPS);
}
function footprintGap(a,b) {
  if (a.kind === 'circle' && b.kind === 'circle') return distance(a.center,b.center)-a.radius-b.radius;
  if (a.kind === 'circle' || b.kind === 'circle') {
    const c = a.kind === 'circle' ? a : b, p = a.kind === 'polygon' ? a : b;
    const d = Math.min(...polygonEdges(p.vertices).map(([u,v])=>pointSegmentDistance(c.center,u,v)));
    return insidePolygon(c.center,p.vertices) ? -d-c.radius : d-c.radius;
  }
  let maxSeparation = -Infinity;
  for (const [u,v] of [...polygonEdges(a.vertices),...polygonEdges(b.vertices)]) {
    const side = sub(v,u), axis = normalize({x:-side.y,y:side.x});
    const pa=a.vertices.map(p=>dot(p,axis)), pb=b.vertices.map(p=>dot(p,axis));
    maxSeparation=Math.max(maxSeparation,Math.min(...pb)-Math.max(...pa),Math.min(...pa)-Math.max(...pb));
  }
  if (maxSeparation <= EPS) return Math.min(0,maxSeparation);
  const distances=[];
  for (const [p,q] of [[a,b],[b,a]]) for (const v of p.vertices) for(const [u,w] of polygonEdges(q.vertices)) distances.push(pointSegmentDistance(v,u,w));
  return Math.min(...distances);
}
function gapDiagnostics(a, b) {
  const delta = sub(b.position, a.position);
  const centerDistance = length(delta);
  const direction = centerDistance > EPS ? mul(delta, 1 / centerDistance) : normalize(add(a.outwardTangent, mul(b.outwardTangent, -1)));
  const reachA = capReach(a, direction), reachB = capReach(b, mul(direction, -1));
  const effectiveGap = footprintGap(terminalFootprint(a),terminalFootprint(b));
  const widthScale = Math.max(EPS, 0.5 * (a.width + b.width));
  return { centerDistance, direction, endpointReachA: reachA, endpointReachB: reachB, supportGap: centerDistance-reachA-reachB, effectiveGap, normalizedGap: effectiveGap / widthScale, widthScale };
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
  const bendA = angleBetween(a.outwardTangent, gap.direction);
  const bendB = angleBetween(b.outwardTangent, mul(gap.direction, -1));
  const bendSoftness = 0.90 + 0.10 * Math.exp(-0.15 * (bendA + bendB));
  const rays = rayIntersectionDiagnostics(a, b);
  // An acute corner can face the connector weakly while both short outward
  // extensions meet naturally. Judge the extension relative to observed local
  // arc, rather than rejecting a tangent angle. Distant intersections decay.
  const extensionRatio = rays.forward ? Math.max(rays.t/Math.max(EPS,a.localArcLength),rays.u/Math.max(EPS,b.localArcLength)) : Infinity;
  const rayExplanation = rays.forward ? Math.exp(-2.4*Math.max(0,extensionRatio-0.55)) : 0;
  const directJoin = Math.max(Math.sqrt(facing.a * facing.b),rayExplanation);
  const raySupport = rays.forward ? 1 : 0.94;
  const score = gapScore * directJoin * bendSoftness * raySupport;
  return { model: 'corner', score: clamp01(score), cost: 1 - clamp01(score), diagnostics: { facingA: facing.rawA, facingB: facing.rawB, bendA, bendB, gapScore, rayIntersection: rays, extensionRatio, rayExplanation } };
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
    supportGap: gap.supportGap,
    footprintOverlap: gap.effectiveGap <= 0,
    confidenceStatus: 'uncalibrated-geometry-score',
    endpointWidthA: a.width,
    endpointWidthB: b.width,
    localCurvatureA: a.localCurvature,
    localCurvatureB: b.localCurvature,
    endpointJitterA: a.jitterNormalized,
    endpointJitterB: b.jitterNormalized,
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

export function projectPointToStroke(stroke,point) {
  const normalized=normalizeStroke(stroke), cumulative=cumulativeLengths(normalized.points), total=cumulative.at(-1);
  const targets=[];
  for(let i=1;i<normalized.points.length;i++) {
    const a=normalized.points[i-1],b=normalized.points[i],v=sub(b,a);
    const t=clamp(dot(sub(point,a),v)/Math.max(EPS,dot(v,v)),0,1);
    const position=add(a,mul(v,t)),arcLength=cumulative[i-1]+distance(a,b)*t;
    targets.push({kind:'segment',strokeId:normalized.strokeId,segmentIndex:i-1,t,arcLength,arcFraction:total>EPS?arcLength/total:0,position,width:a.width+(b.width-a.width)*t,tangent:normalize(v),distance:distance(point,position)});
  }
  return targets.sort((a,b)=>a.distance-b.distance)[0]??null;
}
export function segmentTargetAtFraction(stroke,arcFraction) {
  const normalized=normalizeStroke(stroke),cumulative=cumulativeLengths(normalized.points),total=cumulative.at(-1);
  if(!Number.isFinite(arcFraction)||arcFraction<=0||arcFraction>=1||total<=EPS) throw new TypeError('segment arcFraction must be inside (0,1)');
  const arcLength=arcFraction*total;let i=1;while(i<cumulative.length-1&&cumulative[i]<arcLength)i++;
  const a=normalized.points[i-1],b=normalized.points[i],t=(arcLength-cumulative[i-1])/Math.max(EPS,cumulative[i]-cumulative[i-1]);
  return {kind:'segment',strokeId:normalized.strokeId,segmentIndex:i-1,t,arcFraction,arcLength,position:add(a,mul(sub(b,a),t)),width:a.width+(b.width-a.width)*t,tangent:normalize(sub(b,a))};
}
function scoreEndpointSegment(endpoint,stroke,target) {
  const total=cumulativeLengths(stroke.points).at(-1),span=Math.min(target.arcLength,total-target.arcLength,Math.max(target.width,endpoint.width)*3.5);
  const near=sampleAtArc(stroke,'start',target.arcLength-span),far=sampleAtArc(stroke,'start',target.arcLength+span);
  const robustTangent=normalize(sub(far,near));
  const localCurvature=span>EPS?angleBetween(sub(target.position,near),sub(far,target.position)):0;
  target={...target,geometryRevision:stroke.geometryRevision,robustTangent,localCurvature,localArcLength:2*span,trace:[near,target.position,far]};
  const a=stroke.points[target.segmentIndex],b=stroke.points[target.segmentIndex+1],v=normalize(sub(b,a)),n={x:-v.y,y:v.x};
  const vertices=[add(a,mul(n,a.width/2)),add(b,mul(n,b.width/2)),add(b,mul(n,-b.width/2)),add(a,mul(n,-a.width/2))];
  let effectiveGap=footprintGap(terminalFootprint(endpoint),{kind:'polygon',vertices});
  // Round interior joins in this vector-tube prototype; no raster endpoint inference.
  if(target.segmentIndex>0)effectiveGap=Math.min(effectiveGap,footprintGap(terminalFootprint(endpoint),{kind:'circle',center:a,radius:a.width/2}));
  if(target.segmentIndex+1<stroke.points.length-1)effectiveGap=Math.min(effectiveGap,footprintGap(terminalFootprint(endpoint),{kind:'circle',center:b,radius:b.width/2}));
  const delta=sub(target.position,endpoint.position),centerDistance=length(delta),direction=normalize(delta);
  const widthScale=(endpoint.width+target.width)/2,normalizedGap=effectiveGap/widthScale;
  const contact=effectiveGap<=EPS?1:0.96*Math.exp(-sq(normalizedGap/0.55));
  const facing=dot(endpoint.outwardTangent,direction);
  const termination=Math.exp(-Math.max(0,normalizedGap)/1.1)*smoothstep(-.2,.7,facing)*Math.exp(-.25*endpoint.localCurvature);
  const modelScores=[{model:'contact',score:contact,cost:1-contact,diagnostics:{overlapsFootprint:effectiveGap<=EPS,normalizedGap}},{model:'termination',score:termination,cost:1-termination,diagnostics:{facing,normalizedGap,joinAngle:angleBetween(endpoint.outwardTangent,target.tangent)}}].sort((a,b)=>b.score-a.score);
  const best=modelScores[0];
  return {candidateId:`candidate:${connectionKey(endpoint.endpointId,target)}`,endpointA:endpoint.endpointId,endpointB:null,target,targetDescriptor:{...target,shapePolicy:'variable-width-polyline-round-interior-joins'},centerDistance,effectiveGap,normalizedGap,widthScale,endpointWidthA:endpoint.width,endpointWidthB:target.width,localCurvatureA:endpoint.localCurvature,localCurvatureB:localCurvature,endpointJitterA:endpoint.jitterNormalized,endpointJitterB:0,connectionModel:best.model,modelScores,modelMargin:best.score-modelScores[1].score,confidence:best.score*(.86+.14*endpoint.descriptorQuality),confidenceStatus:'uncalibrated-geometry-score',descriptorQuality:endpoint.descriptorQuality,footprintOverlap:effectiveGap<=EPS,competingCandidates:{endpointA:[],endpointB:[]},connected:false,decisionReason:'not-resolved'};
}
function buildSegmentCandidates(endpoints,strokes,options) {
  const out=[];
  const geometry=new Map(strokes.map(stroke=>{
    const cumulative=cumulativeLengths(stroke.points);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,maxWidth=0;
    for(const p of stroke.points){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);maxWidth=Math.max(maxWidth,p.width);}
    return [stroke.strokeId,{cumulative,total:cumulative.at(-1),minX,maxX,minY,maxY,maxWidth}];
  }));
  for(const endpoint of endpoints)for(const stroke of strokes) {
    if(endpoint.strokeId===stroke.strokeId)continue;
    const g=geometry.get(stroke.strokeId),radius=Math.max(candidateRadius(endpoint,options),g.maxWidth*(options.candidateWidthMultiplier??8));
    const dx=Math.max(g.minX-endpoint.position.x,0,endpoint.position.x-g.maxX),dy=Math.max(g.minY-endpoint.position.y,0,endpoint.position.y-g.maxY);
    // Broad-phase only: this changes work, never the gap/model decision.
    if(!options.disableSpatialFilter&&Math.hypot(dx,dy)>radius)continue;
    const cumulative=g.cumulative,total=g.total,projections=[];
    for(let i=1;i<stroke.points.length;i++) {
      const a=stroke.points[i-1],b=stroke.points[i],v=sub(b,a),t=clamp(dot(sub(endpoint.position,a),v)/Math.max(EPS,dot(v,v)),0,1),position=add(a,mul(v,t)),arcLength=cumulative[i-1]+distance(a,b)*t;
      projections.push({kind:'segment',strokeId:stroke.strokeId,segmentIndex:i-1,t,position,arcLength,arcFraction:total>EPS?arcLength/total:0,width:a.width+(b.width-a.width)*t,tangent:normalize(v),distance:distance(endpoint.position,position)});
    }
    const seen=new Set();
    for(let i=0;i<projections.length;i++) {
      const target=projections[i];
      if(target.distance>(projections[i-1]?.distance??Infinity)+EPS||target.distance>(projections[i+1]?.distance??Infinity)+EPS)continue;
      if(target.arcLength<=stroke.points[0].width/2||total-target.arcLength<=stroke.points.at(-1).width/2)continue;
      if(target.distance>Math.max(candidateRadius(endpoint,options),target.width*(options.candidateWidthMultiplier??8)))continue;
      const key=targetKey(target);if(seen.has(key))continue;seen.add(key);
      out.push(scoreEndpointSegment(endpoint,stroke,target));
    }
  }
  return out;
}

function annotateCompetition(candidates) {
  const byEndpoint = new Map();
  for (const candidate of candidates) {
    for (const endpointId of [candidate.endpointA, candidate.endpointB].filter(Boolean)) {
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
        target: item.target,
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
    const key = connectionKey(candidate.endpointA, candidate.target);
    const rankA = rankInfo(candidate, candidate.endpointA, byEndpoint);
    const rankB = candidate.endpointB ? rankInfo(candidate, candidate.endpointB, byEndpoint) : {rank:null,best:true,margin:1};
    candidate.competition = { endpointA: rankA, endpointB: rankB };
    if(candidate.manualOverride){candidate.connected=candidate.manualOverride==='manual-connect';candidate.decisionReason=candidate.manualOverride;continue;}
    if (manualDisconnect.has(key)) { candidate.connected = false; candidate.decisionReason = 'manual-disconnect'; continue; }
    if (manualConnect.has(key)) { candidate.connected = true; candidate.decisionReason = 'manual-connect'; continue; }
    const contactScore = candidate.modelScores.find(score => score.model === 'contact')?.score ?? 0;
    if (candidate.footprintOverlap && contactScore >= (options.junctionContactThreshold ?? 0.90)) { candidate.connected = true; candidate.decisionReason = 'contact-junction-compatible'; continue; }
    if(candidate.target.kind==='segment' && !candidate.footprintOverlap && !options.inferSegmentGaps) {candidate.connected=false;candidate.decisionReason='segment-gap-unconfirmed';candidate.ambiguous=candidate.confidence>=threshold;continue;}
    if (candidate.confidence < threshold) { candidate.connected = false; candidate.decisionReason = 'below-confidence-threshold'; continue; }
    const mutualBest = rankA.best && rankB.best;
    const clearA = rankA.margin >= competitionMargin || (byEndpoint.get(candidate.endpointA)?.length ?? 0) <= 1;
    const clearB = rankB.margin >= competitionMargin || (byEndpoint.get(candidate.endpointB)?.length ?? 0) <= 1;
    if (mutualBest && clearA && clearB) { candidate.connected = true; candidate.decisionReason = 'mutual-best-clear-margin'; }
    else if (candidate.confidence >= highThreshold && mutualBest && Math.min(rankA.margin, rankB.margin) >= (options.highConfidenceMargin ?? 0.02)) { candidate.connected = true; candidate.decisionReason = 'mutual-best-high-confidence'; }
    else { candidate.connected = false; candidate.decisionReason = 'competition-ambiguous'; }
  }
}

function properIntersection(a,b,c,d) {
  const ab=sub(b,a), cd=sub(d,c), den=cross(ab,cd);
  if(Math.abs(den)<=EPS) return false;
  const t=cross(sub(c,a),cd)/den, u=cross(sub(c,a),ab)/den;
  return t>EPS && t<1-EPS && u>=-EPS && u<=1+EPS;
}

// A guessed connector cannot silently pass through a third stroke or another
// guessed connector. Actual contact junctions and explicit manual edits remain.
function enforceGraphConsistency(candidates,endpoints,strokes) {
  const byId=new Map(endpoints.map(e=>[e.endpointId,e]));
  const accepted=[];
  for(const c of [...candidates].sort((a,b)=>b.confidence-a.confidence)) {
    c.graphConflicts=[];
    if(!c.connected || c.footprintOverlap || c.decisionReason==='manual-connect') continue;
    const a=byId.get(c.endpointA), b=c.endpointB?byId.get(c.endpointB):{position:c.target.position,strokeId:c.target.strokeId};
    for(const s of strokes) {
      if(s.strokeId===a.strokeId || s.strokeId===b.strokeId) continue;
      for(let i=1;i<s.points.length;i++) if(properIntersection(a.position,b.position,s.points[i-1],s.points[i])) {
        c.graphConflicts.push({kind:'segment-crossing',strokeId:s.strokeId,segmentIndex:i-1});
      }
    }
    for(const previous of accepted) {
      if([previous.endpointA,previous.endpointB].filter(Boolean).some(id=>id===c.endpointA || id===c.endpointB)) continue;
      if(properIntersection(a.position,b.position,byId.get(previous.endpointA).position,(previous.endpointB?byId.get(previous.endpointB).position:previous.target.position))) {
        c.graphConflicts.push({kind:'connector-crossing',candidateId:previous.candidateId});
        if(Math.abs(previous.confidence-c.confidence)<0.075) {
          previous.connected=false;previous.decisionReason='graph-conflict';
          previous.graphConflicts.push({kind:'connector-crossing',candidateId:c.candidateId});
        }
      }
    }
    if(c.graphConflicts.length) {c.connected=false;c.decisionReason='graph-conflict';}
    else accepted.push(c);
  }
}

export function resolveStrokeConnectivity(strokes, options = {}) {
  const built = buildEndpointDescriptors(strokes, options);
  const endpoints = built.endpoints;
  const candidates = [];
  const manualPairs = new Set([...normalizeManualPairs(options.manualConnections), ...normalizeManualPairs(options.manualDisconnections)]);
  validatePairs(manualPairs, endpoints);
  for (let i = 0; i < endpoints.length; i += 1) {
    for (let j = i + 1; j < endpoints.length; j += 1) {
      const a = endpoints[i], b = endpoints[j];
      const dist = distance(a.position, b.position);
      const searchRadius = Math.max(candidateRadius(a, options), candidateRadius(b, options));
      if ((dist > searchRadius || (a.strokeId === b.strokeId && a.degenerate)) && !manualPairs.has(pairKey(a.endpointId,b.endpointId))) continue;
      candidates.push(scoreEndpointPair(a, b, options));
    }
  }
  if(options.endpointToSegment !== false)candidates.push(...buildSegmentCandidates(endpoints,built.strokes,options));
  for(const [rows,action] of [[options.manualConnections??[],'manual-connect'],[options.manualDisconnections??[],'manual-disconnect']])for(const row of rows) {
    if(row?.target?.kind!=='segment')continue;
    const endpoint=endpoints.find(e=>e.endpointId===row.endpointA),stroke=built.strokes.find(s=>s.strokeId===row.target.strokeId);
    if(!endpoint||!stroke||endpoint.strokeId===stroke.strokeId)throw new TypeError('invalid endpoint segment override');
    const target=segmentTargetAtFraction(stroke,row.target.arcFraction);
    let candidate=candidates.filter(c=>c.endpointA===endpoint.endpointId&&c.target.kind==='segment'&&c.target.strokeId===stroke.strokeId&&Math.abs(c.target.arcLength-target.arcLength)<=target.width*.5).sort((a,b)=>Math.abs(a.target.arcLength-target.arcLength)-Math.abs(b.target.arcLength-target.arcLength))[0];
    if(!candidate){candidate=scoreEndpointSegment(endpoint,stroke,target);candidates.push(candidate);}
    candidate.manualOverride=action;
  }
  const byEndpoint = annotateCompetition(candidates);
  resolveDecisions(candidates, byEndpoint, options);
  enforceGraphConsistency(candidates,endpoints,built.strokes);
  for(const c of candidates){c.ambiguous??=!c.connected&&['competition-ambiguous','graph-conflict'].includes(c.decisionReason);c.decision=c.connected?'connected':c.ambiguous?'ambiguous':'disconnected';c.alternativeExplanations=c.connectionModel==='cap'?['parallel-open-boundaries-geometrically-indistinguishable']:[];}
  candidates.sort((a, b) => b.confidence - a.confidence);
  const edges = candidates.filter(candidate => candidate.connected).map((candidate, index) => ({
    edgeId: `edge:${connectionKey(candidate.endpointA,candidate.target)}`,
    from: { kind: 'endpoint', endpointId: candidate.endpointA },
    to: { ...candidate.target },
    candidateId: candidate.candidateId,
    model: candidate.connectionModel,
    confidence: candidate.confidence,
    decisionReason: candidate.decisionReason,
  }));
  const anchors=new Map();
  for(const edge of edges)if(edge.to.kind==='segment')anchors.set(targetKey(edge.to),{anchorId:targetKey(edge.to),...edge.to});
  const strokeSpans=[];
  for(const stroke of built.strokes){const nodes=[{nodeId:`${stroke.strokeId}:start`,arcFraction:0},...[...anchors.values()].filter(a=>a.strokeId===stroke.strokeId).map(a=>({nodeId:a.anchorId,arcFraction:a.arcFraction})),{nodeId:`${stroke.strokeId}:end`,arcFraction:1}].sort((a,b)=>a.arcFraction-b.arcFraction);for(let i=1;i<nodes.length;i++)strokeSpans.push({kind:'stroke-span',strokeId:stroke.strokeId,fromNode:nodes[i-1].nodeId,toNode:nodes[i].nodeId,startArcFraction:nodes[i-1].arcFraction,endArcFraction:nodes[i].arcFraction});}
  return {
    schema: CONNECTIVITY_SCHEMA,
    algorithmVersion: CONNECTIVITY_ALGORITHM_VERSION,
    generatedAt: new Date().toISOString(),
    supportsTargetKinds: ['endpoint', 'segment'],
    implementedTargetKinds: options.endpointToSegment===false?['endpoint']:['endpoint','segment'],
    unresolvedTargetKinds: ['segment-crossing-without-endpoint'],
    policy: { ...options },
    strokes: built.strokes.map(stroke => ({ ...stroke, points: stroke.points.map(point => ({ ...point })) })),
    endpoints,
    candidates,
    edges,
    anchors:[...anchors.values()],
    strokeSpans,
    diagnostics: {
      endpointCount: endpoints.length,
      candidateCount: candidates.length,
      connectedEdgeCount: edges.length,
      thresholds: { connection: options.connectionThreshold ?? 0.70, highConfidence: options.highConfidenceThreshold ?? 0.90, competitionMargin: options.competitionMargin ?? 0.075 },
    },
  };
}

export function connectionSet(graph) {
  return new Set((graph.edges ?? []).map(edge => connectionKey(edge.from.endpointId, edge.to)));
}

function conditionBucket(candidate) {
  const gap = candidate.normalizedGap;
  const width = candidate.widthScale;
  const curvature = 0.5 * ((candidate.localCurvatureA ?? 0) + (candidate.localCurvatureB ?? 0));
  return {
    gap: gap <= 0 ? 'contact' : gap <= 1 ? 'gap<=1w' : gap <= 3 ? 'gap<=3w' : 'gap>3w',
    width: width <= 1.5 ? 'thin<=1.5px' : width <= 6 ? 'medium<=6px' : 'thick>6px',
    curvature: curvature <= 0.05 ? 'curvature<=0.05rad' : curvature <= 0.18 ? 'curvature<=0.18rad' : 'curvature>0.18rad',
    model: candidate.connectionModel,
  };
}

function validatePairs(pairs, endpoints) {
  const ids = new Set(endpoints.map(e=>e.endpointId));
  for(const key of pairs) {
    const [a,b,...extra]=key.split('|');
    if(extra.length || a===b || !ids.has(a) || !ids.has(b)) throw new TypeError(`invalid endpoint pair: ${key}`);
  }
}

export function evaluateConnectivity(graph, truthPairs, options = {}) {
  const endpointTruth=normalizeManualPairs(truthPairs.filter(p=>!(p?.target?.kind==='segment')));
  validatePairs(endpointTruth,graph.endpoints);
  const truth=new Set(endpointTruth);
  for(const row of truthPairs.filter(p=>p?.target?.kind==='segment')) {
    const endpoint=graph.endpoints.find(e=>e.endpointId===row.endpointA),stroke=graph.strokes.find(s=>s.strokeId===row.target.strokeId);
    if(!endpoint||!stroke||endpoint.strokeId===stroke.strokeId)throw new TypeError('invalid endpoint segment truth');
    const target=segmentTargetAtFraction(stroke,row.target.arcFraction);
    const matches=graph.candidates.filter(c=>c.endpointA===row.endpointA&&c.target.kind==='segment'&&c.target.strokeId===target.strokeId&&Math.abs(c.target.arcLength-target.arcLength)<=Math.max(target.width*.5,stroke.points.length*EPS)).sort((a,b)=>Math.abs(a.target.arcLength-target.arcLength)-Math.abs(b.target.arcLength-target.arcLength));
    truth.add(matches.length?connectionKey(matches[0].endpointA,matches[0].target):connectionKey(row.endpointA,target));
  }
  const predicted = connectionSet(graph);
  let tp = 0, fp = 0, fn = 0;
  for (const key of predicted) truth.has(key) ? tp++ : fp++;
  for (const key of truth) if (!predicted.has(key)) fn++;
  const precision = tp + fp ? tp / (tp + fp) : (truth.size === 0 ? 1 : 0);
  const recall = tp + fn ? tp / (tp + fn) : 1;
  const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
  const exactMatch = fp === 0 && fn === 0;
  const labeledCandidates = (graph.candidates ?? []).map(candidate => ({ candidate, y: truth.has(connectionKey(candidate.endpointA,candidate.target)) ? 1 : 0 }));
  const generatedKeys = new Set(labeledCandidates.map(({candidate})=>connectionKey(candidate.endpointA,candidate.target)));
  const missedGeneration = [...truth].filter(key=>!generatedKeys.has(key));
  const candidateOnlyBrier = labeledCandidates.length ? mean(labeledCandidates.map(({candidate,y})=>sq(candidate.confidence-y))) : null;
  for(const key of missedGeneration) { const [endpointA,endpointB]=key.split('|'); labeledCandidates.push({candidate:{endpointA,endpointB,confidence:0,connected:false,connectionModel:'not-generated',normalizedGap:Infinity,widthScale:0},y:1}); }
  const brier = labeledCandidates.length ? mean(labeledCandidates.map(({candidate,y})=>sq(candidate.confidence-y))) : null;
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
    const conditionKey = `${bucket.model}/${bucket.gap}/${bucket.width}/${bucket.curvature}`;
    for (const [key, target] of [[model, modelStats], [conditionKey, conditionStats]]) {
      target[key] ??= { total: 0, trueConnection: 0, predictedConnection: 0, tp: 0, fp: 0, fn: 0 };
      const row = target[key];
      row.total += 1; row.trueConnection += y; row.predictedConnection += predictedPositive;
      if (predictedPositive && y) row.tp += 1;
      else if (predictedPositive && !y) row.fp += 1;
      else if (!predictedPositive && y) row.fn += 1;
    }
  }
  for(const stats of [modelStats,conditionStats]) for(const row of Object.values(stats)) {
    row.precision=row.tp+row.fp ? row.tp/(row.tp+row.fp) : (row.fn ? 0 : 1);
    row.recall=row.tp+row.fn ? row.tp/(row.tp+row.fn) : 1;
    row.f1=row.precision+row.recall ? 2*row.precision*row.recall/(row.precision+row.recall) : 0;
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
    candidateGenerationMisses: missedGeneration.length,
    candidateGenerationRecall: truth.size ? (truth.size-missedGeneration.length)/truth.size : null,
    confidenceCalibration: { status:'uncalibrated', scope:'generated-candidates-plus-missed-truth', candidateOnlyBrier, brier, bins, expectedCalibrationError: labeledCandidates.length ? bins.reduce((s,b)=>s+b.count*Math.abs((b.meanConfidence??0)-(b.observedRate??0)),0)/labeledCandidates.length : null },
    falseConnectionPairs: [...predicted].filter(key=>!truth.has(key)),
    missedConnectionPairs: [...truth].filter(key=>!predicted.has(key)),
    modelStats,
    conditionStats,
  };
}

export function aggregateConnectivityEvaluations(evaluations) {
  const sum=key=>evaluations.reduce((s,m)=>s+(m[key]??0),0);
  const tp=sum('trueConnection'),fp=sum('falseConnection'),fn=sum('missedConnection');
  const precision=tp+fp ? tp/(tp+fp) : (fn?0:1), recall=tp+fn ? tp/(tp+fn) : 1;
  const bins=Array.from({length:5},(_,i)=>({low:i/5,high:(i+1)/5,count:0,confidenceSum:0,positiveSum:0}));
  const modelStats={},conditionStats={};
  for(const m of evaluations) {
    for(let i=0;i<5;i++) {const b=m.confidenceCalibration.bins[i];if(!b)continue;bins[i].count+=b.count;bins[i].confidenceSum+=b.count*(b.meanConfidence??0);bins[i].positiveSum+=b.count*(b.observedRate??0);}
    for(const [key,target] of [['modelStats',modelStats],['conditionStats',conditionStats]]) for(const [name,row] of Object.entries(m[key])) {
      target[name]??={total:0,tp:0,fp:0,fn:0};for(const field of ['total','tp','fp','fn'])target[name][field]+=row[field];
    }
  }
  for(const stats of [modelStats,conditionStats])for(const row of Object.values(stats)) {
    row.precision=row.tp+row.fp?row.tp/(row.tp+row.fp):(row.fn?0:1);row.recall=row.tp+row.fn?row.tp/(row.tp+row.fn):1;
    row.f1=row.precision+row.recall?2*row.precision*row.recall/(row.precision+row.recall):0;
  }
  let weight=0,brierSum=0;
  for(const m of evaluations) {const n=m.confidenceCalibration.bins.reduce((s,b)=>s+b.count,0);if(n && m.confidenceCalibration.brier!==null){weight+=n;brierSum+=n*m.confidenceCalibration.brier;}}
  for(const b of bins){b.meanConfidence=b.count?b.confidenceSum/b.count:null;b.observedRate=b.count?b.positiveSum/b.count:null;delete b.confidenceSum;delete b.positiveSum;}
  return {sceneCount:evaluations.length,trueConnection:tp,falseConnection:fp,missedConnection:fn,precision:evaluations.length?precision:null,recall:evaluations.length?recall:null,f1:evaluations.length?(precision+recall?2*precision*recall/(precision+recall):0):null,graphExactMatchRate:evaluations.length?evaluations.filter(m=>m.graphExactMatch).length/evaluations.length:null,candidateGenerationMisses:sum('candidateGenerationMisses'),modelStats,conditionStats,confidenceCalibration:{status:'uncalibrated',scope:'generated-candidates-plus-missed-truth',brier:weight?brierSum/weight:null,bins,expectedCalibrationError:weight?bins.reduce((s,b)=>s+b.count*Math.abs((b.meanConfidence??0)-(b.observedRate??0)),0)/weight:null}};
}

export const __test = { pairKey, gapDiagnostics, capTraceDiagnostics, conditionBucket, quantile };
