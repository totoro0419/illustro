import { resolveRegion } from '../src/region.js';
import { evidenceV3LocalSummary } from './evidence-v3.js';

export const FIXED_V3_POLICY = Object.freeze({ evidenceThreshold: 0.42 });

function seedComponent(result, nx, ny) {
  const w = result.gridWidth, h = result.gridHeight;
  const cx = Math.max(0, Math.min(w - 1, Math.round(nx * (w - 1))));
  const cy = Math.max(0, Math.min(h - 1, Math.round(ny * (h - 1))));
  for (let radius = 0; radius <= 5; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const label = result.topology.labels[y * w + x];
      if (label >= 0) return result.topology.components[label];
    }
  }
  return null;
}

function componentBoundaryStats(bundle, result, component) {
  if (!component) return null;
  const { width: w, height: h, features } = bundle;
  const cells = new Set();
  for (const i of component.cells) {
    const x = i % w, y = Math.floor(i / w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (result.mask[ni]) cells.add(ni);
    }
  }
  if (!cells.size) return null;
  const sums = { line: 0, texture: 0, wash: 0, coherence: 0, bridge: 0, softEdge: 0, softCoherence: 0 };
  for (const i of cells) {
    sums.line += features.line[i];
    sums.texture += features.texture[i];
    sums.wash += features.wash[i];
    sums.coherence += features.coherence[i];
    sums.bridge += features.bridge[i];
    sums.softEdge += features.softEdge?.[i] ?? 0;
    sums.softCoherence += features.softCoherence?.[i] ?? 0;
  }
  const n = cells.size;
  return {
    line: sums.line / n,
    texture: sums.texture / n,
    wash: sums.wash / n,
    coherence: sums.coherence / n,
    bridge: sums.bridge / n,
    softEdge: sums.softEdge / n,
    softCoherence: sums.softCoherence / n,
    samples: n,
  };
}

function dominant3(labels) {
  const counts = { closed: 0, open: 0, ambiguous: 0 };
  for (const label of labels) counts[label] += 1;
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return ranked[0][1] >= 2 ? ranked[0][0] : 'ambiguous';
}

export function classifyV3(bundle, query, basePolicy = FIXED_V3_POLICY) {
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
      const policy = {
        evidenceThreshold: Math.max(0.15, Math.min(0.90, basePolicy.evidenceThreshold + hypothesis.thresholdBias + dt)),
        gapMax: 0,
        confidenceThreshold: 0,
        retainIou: 0.8,
        identityMargin: 0.2,
        ambiguousIouFloor: 0.3,
        lineageOverlapFraction: 0.18,
        candidateSearchPx: 4,
      };
      const result = resolveRegion(bundle.grids[hypothesis.name], policy);
      const component = seedComponent(result, query.seed[0], query.seed[1]);
      const label = component ? (component.touchesEdge ? 'open' : 'closed') : 'ambiguous';
      labels.push(label);
      votes.push(label);
      if (component) areas.push(component.area / (result.gridWidth * result.gridHeight));
      if (dt === 0) {
        central[hypothesis.name] = {
          result,
          component,
          label,
          boundary: componentBoundaryStats(bundle, result, component),
        };
      }
    }
    groups[hypothesis.name] = dominant3(labels);
  }

  const counts = { closed: 0, open: 0, ambiguous: 0 };
  for (const vote of votes) counts[vote] += 1;
  const areaRange = areas.length ? Math.max(...areas) - Math.min(...areas) : 1;
  const local = evidenceV3LocalSummary(bundle, query.seed[0], query.seed[1], 5);
  const closedCentral =
    central.balanced?.label === 'closed' ? central.balanced :
    central.permissive?.label === 'closed' ? central.permissive :
    null;
  const closure = closedCentral?.boundary ?? null;
  const artifact = closure ? Math.max(closure.texture, closure.wash) : Math.max(local.texture, local.wash);
  const closureQuality = closure
    ? (0.50 * closure.line + 0.25 * closure.coherence + 0.25 * closure.bridge - 0.45 * artifact)
    : -1;

  const sx = Math.max(0, Math.min(bundle.width - 1, Math.round(query.seed[0] * (bundle.width - 1))));
  const sy = Math.max(0, Math.min(bundle.height - 1, Math.round(query.seed[1] * (bundle.height - 1))));
  const nearFrame =
    sx < bundle.edgeMargin + 2 ||
    sy < bundle.edgeMargin + 2 ||
    sx >= bundle.width - bundle.edgeMargin - 2 ||
    sy >= bundle.height - bundle.edgeMargin - 2;

  const cleanCoherentClosure = !!closure &&
    closure.line >= 0.50 &&
    closure.coherence >= 0.65 &&
    closure.texture < 0.35 &&
    closure.wash < 0.30;

  const strongCoherentClosure = !!closure &&
    closure.line >= 0.68 &&
    closure.coherence >= 0.42 &&
    local.wash < 0.45 &&
    (closure.texture < 0.75 || closure.coherence >= 0.70 || (closure.line >= 0.80 && local.coherence >= 0.60));

  // Weak/faint ink should still close when independent orientation evidence agrees:
  // strong directional continuity + low texture/wash is a boundary cue even when
  // mean line amplitude is modest after downsampling.
  const bridgeSupportedClosure = !!closure &&
    closure.coherence >= 0.70 &&
    closure.bridge >= 0.35 &&
    closure.texture < 0.20 &&
    closure.wash < 0.20 &&
    closure.samples >= 8;

  // Dense ornament must not be rejected merely because both the region and its
  // enclosing linework contain texture. Accept it when the boundary is strong,
  // remains no more textured than its local context, and is not wash-dominated.
  const denseOutlinedClosure = !!closure &&
    closure.line >= 0.80 &&
    closure.wash <= 0.32 &&
    closure.samples >= 12 &&
    local.texture >= 0.70 &&
    closure.texture <= local.texture + 0.08;

  const softBoundaryClosure = !!closure &&
    closure.softEdge >= 0.34 &&
    closure.softCoherence >= 0.60 &&
    closure.texture < 0.45 &&
    closure.wash < 0.32 &&
    closure.samples >= 8;

  // Dense line networks can accidentally form small closed cells. Treat a
  // closure as clutter-driven when the inferred boundary is far more textured
  // than its seed neighborhood and the topology is highly perturbation-sensitive.
  const clutterEnclosure = !!closure &&
    areaRange > 0.50 &&
    local.line >= 0.60 &&
    local.coherence >= 0.75 &&
    closure.texture >= 0.65 &&
    closure.texture - local.texture >= 0.30;

  // Tiny cells created inside textured perspective/hatching are unreliable when
  // the inferred boundary is not more directionally coherent than the local
  // field. Genuine small ornaments in the corpus show the opposite relation.
  const microTextureAccidentalClosure = !!closure &&
    areaRange > 0.70 &&
    closure.samples <= 12 &&
    local.line >= 0.60 &&
    local.texture >= 0.45 &&
    closure.texture >= 0.45 &&
    closure.coherence <= local.coherence + 0.02;

  const coherentClosure =
    cleanCoherentClosure ||
    strongCoherentClosure ||
    bridgeSupportedClosure ||
    denseOutlinedClosure;

  let label = 'ambiguous';
  if (nearFrame && groups.conservative === 'open' && groups.balanced === 'open' && groups.permissive === 'open') {
    label = 'open';
  } else if (groups.conservative === groups.balanced && groups.balanced === groups.permissive) {
    label = groups.balanced;
    if (label === 'open') {
      const interiorUncertain = areaRange > 0.20 && local.line >= 0.33 && (local.texture >= 0.15 || local.wash >= 0.18);
      if (interiorUncertain) label = 'ambiguous';
    }
  } else if (groups.balanced === 'closed' && groups.permissive === 'closed') {
    label = (clutterEnclosure || microTextureAccidentalClosure)
      ? 'ambiguous'
      : (coherentClosure ? 'closed' : 'ambiguous');
  } else if (groups.conservative === 'open' && groups.balanced === 'open' && groups.permissive === 'closed') {
    if (coherentClosure) label = 'closed';
    else if (closure && closure.coherence < 0.40 && local.wash < 0.35) label = 'open';
    else label = 'ambiguous';
  } else if (groups.conservative === 'open' && groups.balanced === 'open') {
    label = 'open';
  } else {
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const [winner, winnerCount] = ranked[0];
    const opposition =
      winner === 'closed' ? counts.open :
      winner === 'open' ? counts.closed :
      Math.max(counts.closed, counts.open);
    if (winnerCount >= 7 && opposition <= 1 && artifact < 0.36) label = winner;
  }

  // A fourth, isolated hypothesis handles smooth low-contrast filled objects.
  // It never changes the normal three topology masks; it may only promote an
  // otherwise-unanimous Open result when a compact, coherent soft boundary is
  // independently observed around a low-artifact seed.
  let softHypothesis = null;
  const softInteriorCandidate =
    !nearFrame &&
    groups.conservative === 'open' &&
    groups.balanced === 'open' &&
    groups.permissive === 'open' &&
    local.line < 0.30 &&
    local.texture < 0.18 &&
    local.wash < 0.18 &&
    local.coherence >= 0.45;

  if (softInteriorCandidate && bundle.grids.soft) {
    const softLabels = [];
    const softResults = [];
    for (const dt of [-0.035, 0, 0.035]) {
      const policy = {
        evidenceThreshold: Math.max(0.15, Math.min(0.90, basePolicy.evidenceThreshold + dt)),
        gapMax: 0,
        confidenceThreshold: 0,
        retainIou: 0.8,
        identityMargin: 0.2,
        ambiguousIouFloor: 0.3,
        lineageOverlapFraction: 0.18,
        candidateSearchPx: 4,
      };
      const result = resolveRegion(bundle.grids.soft, policy);
      const component = seedComponent(result, query.seed[0], query.seed[1]);
      const softLabel = component ? (component.touchesEdge ? 'open' : 'closed') : 'ambiguous';
      softLabels.push(softLabel);
      softResults.push({ result, component, label: softLabel });
    }
    const softGroup = dominant3(softLabels);
    const centralSoft = softResults[1];
    const softBoundary = centralSoft?.component && centralSoft.label === 'closed'
      ? componentBoundaryStats(bundle, centralSoft.result, centralSoft.component)
      : null;
    const areaFraction = centralSoft?.component
      ? centralSoft.component.area / (bundle.width * bundle.height)
      : 1;
    const credibleSoftClosure = softGroup === 'closed' &&
      !!softBoundary &&
      softBoundary.softEdge >= 0.18 &&
      softBoundary.softCoherence >= 0.65 &&
      softBoundary.texture < 0.45 &&
      softBoundary.wash < 0.32 &&
      areaFraction <= 0.20;

    softHypothesis = {
      labels: softLabels,
      group: softGroup,
      boundary: softBoundary,
      areaFraction,
      credible: credibleSoftClosure,
    };
    if (label === 'open' && credibleSoftClosure) label = 'closed';
  }

  return {
    label,
    stability: Math.max(counts.closed, counts.open, counts.ambiguous) / votes.length,
    votes,
    groups,
    counts,
    areaRange,
    local,
    closure,
    closureQuality,
    artifact,
    nearFrame,
    coherentClosure,
    cleanCoherentClosure,
    strongCoherentClosure,
    bridgeSupportedClosure,
    denseOutlinedClosure,
    softBoundaryClosure,
    clutterEnclosure,
    microTextureAccidentalClosure,
    softHypothesis,
  };
}
