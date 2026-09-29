import { resolveRegion } from '../src/region.js';
import { evidenceV3LocalSummary } from './evidence-v3.js';

const clamp01 = value => Math.max(0, Math.min(1, value));

export const FIXED_V4_POLICY = Object.freeze({
  evidenceThreshold: 0.42,
  closeConfidence: 0.60,
  likelyCloseConfidence: 0.50,
  maxNetworkRiskForClose: 0.58,
  maxNetworkRiskForLikelyClose: 0.46,
  radialCloseConfidence: 0.72,
  radialAmbiguousConfidence: 0.58,
});

function seedComponent(result, nx, ny) {
  const w = result.gridWidth;
  const h = result.gridHeight;
  const cx = Math.max(0, Math.min(w - 1, Math.round(nx * (w - 1))));
  const cy = Math.max(0, Math.min(h - 1, Math.round(ny * (h - 1))));
  for (let radius = 0; radius <= 5; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const label = result.topology.labels[y * w + x];
        if (label >= 0) return result.topology.components[label];
      }
    }
  }
  return null;
}

function quantile(values, q) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const position = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * q)));
  return sorted[position];
}

function boundaryCellSupport(features, i) {
  return clamp01(
    0.34 * features.line[i] +
    0.22 * features.coherence[i] +
    0.20 * features.bridge[i] +
    0.12 * (features.softEdge?.[i] ?? 0) +
    0.12 * (features.softCoherence?.[i] ?? 0) +
    0.18 -
    0.22 * features.texture[i] -
    0.18 * features.wash[i]
  );
}

function boundaryProfile(bundle, result, component) {
  if (!component) return null;
  const { width: w, height: h, features } = bundle;
  const boundary = new Set();

  for (const i of component.cells) {
    const x = i % w;
    const y = Math.floor(i / w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (result.mask[ni]) boundary.add(ni);
    }
  }
  if (!boundary.size) return null;

  const support = [];
  let line = 0;
  let texture = 0;
  let wash = 0;
  let coherence = 0;
  let bridge = 0;
  let strong = 0;
  let supported = 0;
  const weak = new Set();

  for (const i of boundary) {
    const s = boundaryCellSupport(features, i);
    support.push(s);
    line += features.line[i];
    texture += features.texture[i];
    wash += features.wash[i];
    coherence += features.coherence[i];
    bridge += features.bridge[i];
    if (s >= 0.55) strong += 1;
    if (s >= 0.40) supported += 1;
    if (s < 0.28) weak.add(i);
  }

  let maxWeakComponent = 0;
  const visited = new Set();
  for (const start of weak) {
    if (visited.has(start)) continue;
    const queue = [start];
    visited.add(start);
    let count = 0;
    for (let head = 0; head < queue.length; head += 1) {
      const i = queue[head];
      count += 1;
      const x = i % w;
      const y = Math.floor(i / w);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (weak.has(ni) && !visited.has(ni)) {
          visited.add(ni);
          queue.push(ni);
        }
      }
    }
    maxWeakComponent = Math.max(maxWeakComponent, count);
  }

  const n = boundary.size;
  const mean = values => values / n;
  const lengthScore = clamp01(Math.log2(n + 1) / 9);
  const supportedFraction = supported / n;
  const strongFraction = strong / n;
  const maxWeakFraction = maxWeakComponent / n;
  const q10 = quantile(support, 0.10);
  const q25 = quantile(support, 0.25);
  const median = quantile(support, 0.50);

  const continuityConfidence = clamp01(
    0.24 * supportedFraction +
    0.12 * strongFraction +
    0.18 * (1 - maxWeakFraction) +
    0.12 * q25 +
    0.08 * median +
    0.10 * mean(coherence) +
    0.07 * mean(bridge) +
    0.05 * mean(line) +
    0.04 * lengthScore
  );

  return {
    samples: n,
    line: mean(line),
    texture: mean(texture),
    wash: mean(wash),
    coherence: mean(coherence),
    bridge: mean(bridge),
    supportQ10: q10,
    supportQ25: q25,
    supportMedian: median,
    supportedFraction,
    strongFraction,
    maxWeakComponentFraction: maxWeakFraction,
    lengthScore,
    continuityConfidence,
  };
}

function radialEnclosureProfile(bundle, nx, ny) {
  const { width: w, height: h, features } = bundle;
  const cx = Math.max(0, Math.min(w - 1, Math.round(nx * (w - 1))));
  const cy = Math.max(0, Math.min(h - 1, Math.round(ny * (h - 1))));
  const rayCount = 32;
  const rayBest = [];
  const rayDistances = [];
  const maxRadius = Math.max(8, Math.round(Math.min(w, h) * 0.46));

  for (let r = 0; r < rayCount; r += 1) {
    const angle = (Math.PI * 2 * r) / rayCount;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let best = 0;
    let bestDistance = maxRadius;

    for (let distance = 5; distance <= maxRadius; distance += 1) {
      const x = Math.round(cx + dx * distance);
      const y = Math.round(cy + dy * distance);
      if (x < bundle.edgeMargin || y < bundle.edgeMargin || x >= w - bundle.edgeMargin || y >= h - bundle.edgeMargin) break;
      const i = y * w + x;
      const score = clamp01(
        0.38 * features.line[i] +
        0.20 * features.coherence[i] +
        0.20 * features.bridge[i] +
        0.14 * (features.softEdge?.[i] ?? 0) +
        0.08 * (features.softCoherence?.[i] ?? 0) +
        0.16 -
        0.24 * features.texture[i] -
        0.18 * features.wash[i]
      );
      if (score > best) {
        best = score;
        bestDistance = distance;
      }
    }
    rayBest.push(best);
    rayDistances.push(bestDistance);
  }

  const supported = rayBest.map(v => v >= 0.40);
  const strong = rayBest.filter(v => v >= 0.55).length / rayCount;
  const coverage = supported.filter(Boolean).length / rayCount;
  let longestWeak = 0;
  for (let start = 0; start < rayCount; start += 1) {
    let run = 0;
    while (run < rayCount && !supported[(start + run) % rayCount]) run += 1;
    longestWeak = Math.max(longestWeak, run);
  }
  const weakArcFraction = longestWeak / rayCount;
  const medianSupport = quantile(rayBest, 0.50);
  const q25Support = quantile(rayBest, 0.25);

  const confidence = clamp01(
    0.38 * coverage +
    0.16 * strong +
    0.20 * (1 - weakArcFraction) +
    0.14 * q25Support +
    0.12 * medianSupport
  );

  return {
    rayCount,
    coverage,
    strongFraction: strong,
    weakArcFraction,
    supportQ25: q25Support,
    supportMedian: medianSupport,
    confidence,
    medianHitDistance: quantile(rayDistances, 0.50),
  };
}

function dominant3(labels) {
  const counts = { closed: 0, open: 0, ambiguous: 0 };
  for (const label of labels) counts[label] += 1;
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return ranked[0][1] >= 2 ? ranked[0][0] : 'ambiguous';
}

export function classifyV4(bundle, query, policy = FIXED_V4_POLICY) {
  const hypotheses = [
    { name: 'conservative', thresholdBias: 0.02 },
    { name: 'balanced', thresholdBias: 0 },
    { name: 'permissive', thresholdBias: -0.02 },
  ];
  const perturbations = [-0.035, 0, 0.035];
  const votes = [];
  const areas = [];
  const groups = {};
  const central = {};

  for (const hypothesis of hypotheses) {
    const labels = [];
    for (const dt of perturbations) {
      const regionPolicy = {
        evidenceThreshold: Math.max(0.15, Math.min(0.90, policy.evidenceThreshold + hypothesis.thresholdBias + dt)),
        gapMax: 0,
        confidenceThreshold: 0,
        retainIou: 0.8,
        identityMargin: 0.2,
        ambiguousIouFloor: 0.3,
        lineageOverlapFraction: 0.18,
        candidateSearchPx: 4,
      };
      const result = resolveRegion(bundle.grids[hypothesis.name], regionPolicy);
      const component = seedComponent(result, query.seed[0], query.seed[1]);
      const label = component ? (component.touchesEdge ? 'open' : 'closed') : 'ambiguous';
      labels.push(label);
      votes.push(label);
      if (component) areas.push(component.area / (result.gridWidth * result.gridHeight));
      if (dt === 0) central[hypothesis.name] = { result, component, label };
    }
    groups[hypothesis.name] = dominant3(labels);
  }

  const counts = { closed: 0, open: 0, ambiguous: 0 };
  for (const vote of votes) counts[vote] += 1;
  const closedVoteFraction = counts.closed / votes.length;
  const openVoteFraction = counts.open / votes.length;
  const areaRange = areas.length ? Math.max(...areas) - Math.min(...areas) : 1;
  const local = evidenceV3LocalSummary(bundle, query.seed[0], query.seed[1], 5);

  const closedCentral =
    central.balanced?.label === 'closed' ? central.balanced :
    central.permissive?.label === 'closed' ? central.permissive :
    central.conservative?.label === 'closed' ? central.conservative :
    null;

  const boundary = closedCentral
    ? boundaryProfile(bundle, closedCentral.result, closedCentral.component)
    : null;
  const radial = radialEnclosureProfile(bundle, query.seed[0], query.seed[1]);

  const sx = Math.max(0, Math.min(bundle.width - 1, Math.round(query.seed[0] * (bundle.width - 1))));
  const sy = Math.max(0, Math.min(bundle.height - 1, Math.round(query.seed[1] * (bundle.height - 1))));
  const nearFrame =
    sx < bundle.edgeMargin + 2 ||
    sy < bundle.edgeMargin + 2 ||
    sx >= bundle.width - bundle.edgeMargin - 2 ||
    sy >= bundle.height - bundle.edgeMargin - 2;

  const boundaryArtifact = boundary ? Math.max(boundary.texture, boundary.wash) : 1;
  const textureNetworkRisk = boundary
    ? clamp01(
        0.42 * Math.max(local.texture, boundary.texture) +
        0.18 * Math.max(0, boundary.texture - 0.45) +
        0.12 * Math.max(0, local.line - 0.55) +
        0.16 * areaRange +
        0.12 * (1 - boundary.coherence)
      )
    : clamp01(0.50 * local.texture + 0.20 * local.line + 0.20 * areaRange + 0.10 * local.wash);

  const washPenalty = boundary
    ? clamp01(Math.max(0, boundary.wash - 0.30) * 1.25)
    : clamp01(Math.max(0, local.wash - 0.30));

  const boundaryConfidence = boundary
    ? clamp01(
        0.72 * boundary.continuityConfidence +
        0.14 * closedVoteFraction +
        0.08 * radial.confidence +
        0.06 * boundary.lengthScore -
        0.10 * washPenalty
      )
    : 0;

  const quietInterior = local.line < 0.18 && local.texture < 0.12 && local.wash < 0.16;
  const radialConfidence = clamp01(
    radial.confidence +
    (quietInterior ? 0.08 : 0) -
    0.18 * local.texture -
    0.08 * local.wash
  );

  let label = 'ambiguous';
  let decision = 'ambiguous-default';

  if (nearFrame && openVoteFraction >= 2 / 3) {
    label = 'open';
    decision = 'frame-connected-open';
  } else if (counts.closed === 0) {
    if (
      radialConfidence >= policy.radialCloseConfidence &&
      radial.coverage >= 0.78 &&
      radial.weakArcFraction <= 0.19 &&
      local.texture < 0.22
    ) {
      label = 'closed';
      decision = 'radial-enclosure';
    } else if (
      radialConfidence >= policy.radialAmbiguousConfidence &&
      radial.coverage >= 0.62
    ) {
      label = 'ambiguous';
      decision = 'radial-uncertain';
    } else if (openVoteFraction >= 2 / 3) {
      label = 'open';
      decision = 'stable-open';
    }
  } else if (
    boundaryConfidence >= policy.closeConfidence &&
    textureNetworkRisk <= policy.maxNetworkRiskForClose
  ) {
    label = 'closed';
    decision = 'boundary-confidence';
  } else if (
    closedVoteFraction >= 2 / 3 &&
    boundaryConfidence >= policy.likelyCloseConfidence &&
    textureNetworkRisk <= policy.maxNetworkRiskForLikelyClose
  ) {
    label = 'closed';
    decision = 'topology-plus-boundary-confidence';
  } else if (
    openVoteFraction >= 7 / 9 &&
    boundaryConfidence < 0.44 &&
    radialConfidence < policy.radialAmbiguousConfidence
  ) {
    label = 'open';
    decision = 'dominant-open-low-enclosure';
  }

  return {
    label,
    decision,
    policy,
    groups,
    counts,
    closedVoteFraction,
    openVoteFraction,
    areaRange,
    nearFrame,
    local,
    boundary,
    radial,
    boundaryConfidence,
    radialConfidence,
    textureNetworkRisk,
    boundaryArtifact,
  };
}
