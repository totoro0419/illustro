import { classifyV3, FIXED_V3_POLICY } from './v3-classifier.js';

const clamp01 = value => Math.max(0, Math.min(1, value));

export const FIXED_V4_POLICY = Object.freeze({
  evidenceThreshold: FIXED_V3_POLICY.evidenceThreshold,
  quietRadialMinimum: 0.90,
  quietRadialMinimumCoverage: 1.0,
  quietRadialMinimumStrongFraction: 0.90,
  quietRadialMaximumWeakArcFraction: 0.0,
  quietInteriorMaximumLine: 0.30,
  quietInteriorMaximumTexture: 0.10,
  quietInteriorMaximumWash: 0.11,

  // General V4 confidence gates. These operate on image/topology evidence only;
  // no artwork IDs, query names, or corpus-specific identifiers are consulted.
  openEnclosureAmbiguityRiskMinimum: 0.20,
  ambiguousClosureConfidenceMinimum: 0.832,
  ambiguousContinuityMinimum: 0.35,
  closedTextureNetworkRiskMinimum: 0.50,
  boundaryDiscontinuityRiskScale: 0.65,
});

function quantile(values, q) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const position = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * q)));
  return sorted[position];
}

function ramp01(value, low, high) {
  if (high <= low) return value >= high ? 1 : 0;
  return clamp01((value - low) / (high - low));
}

function radialEnclosureProfile(bundle, nx, ny) {
  const { width: w, height: h, features } = bundle;
  const cx = Math.max(0, Math.min(w - 1, Math.round(nx * (w - 1))));
  const cy = Math.max(0, Math.min(h - 1, Math.round(ny * (h - 1))));
  const rayCount = 32;
  const rayBest = [];
  const rayDistances = [];
  const firstSupportDistances = [];
  const firstSupportScores = [];
  const maxRadius = Math.max(8, Math.round(Math.min(w, h) * 0.46));

  for (let r = 0; r < rayCount; r += 1) {
    const angle = (Math.PI * 2 * r) / rayCount;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let best = 0;
    let bestDistance = maxRadius;
    let firstSupportDistance = null;
    let firstSupportScore = 0;

    for (let distance = 5; distance <= maxRadius; distance += 1) {
      const x = Math.round(cx + dx * distance);
      const y = Math.round(cy + dy * distance);
      if (
        x < bundle.edgeMargin ||
        y < bundle.edgeMargin ||
        x >= w - bundle.edgeMargin ||
        y >= h - bundle.edgeMargin
      ) break;

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
      if (firstSupportDistance === null && score >= 0.40) {
        firstSupportDistance = distance;
        firstSupportScore = score;
      }
      if (score > best) {
        best = score;
        bestDistance = distance;
      }
    }

    rayBest.push(best);
    rayDistances.push(bestDistance);
    firstSupportDistances.push(firstSupportDistance);
    firstSupportScores.push(firstSupportScore);
  }

  const supported = rayBest.map(value => value >= 0.40);
  const coverage = supported.filter(Boolean).length / rayCount;
  const strongFraction = rayBest.filter(value => value >= 0.55).length / rayCount;

  let longestWeak = 0;
  for (let start = 0; start < rayCount; start += 1) {
    let run = 0;
    while (run < rayCount && !supported[(start + run) % rayCount]) run += 1;
    longestWeak = Math.max(longestWeak, run);
  }

  const weakArcFraction = longestWeak / rayCount;
  const supportQ25 = quantile(rayBest, 0.25);
  const supportMedian = quantile(rayBest, 0.50);

  // A ray hitting some strong line anywhere is not sufficient evidence of one
  // enclosing contour: dense drawings can satisfy that accidentally. Track the
  // nearest supported hit and require neighboring rays to meet the boundary at
  // geometrically compatible distances. These diagnostics are intentionally
  // classification-neutral until their behavior is audited on the full exposed
  // corpus.
  const finiteFirstDistances = firstSupportDistances.filter(Number.isFinite);
  const firstHitCoverage = finiteFirstDistances.length / rayCount;
  const firstHitDistanceMedian = quantile(finiteFirstDistances, 0.50);
  const firstHitDistanceQ25 = quantile(finiteFirstDistances, 0.25);
  const firstHitDistanceQ75 = quantile(finiteFirstDistances, 0.75);
  const firstHitDistanceIqrNormalized = firstHitDistanceMedian > 0
    ? (firstHitDistanceQ75 - firstHitDistanceQ25) / firstHitDistanceMedian
    : 1;
  const firstHitDistanceMadNormalized = firstHitDistanceMedian > 0
    ? quantile(
        finiteFirstDistances.map(distance => Math.abs(distance - firstHitDistanceMedian)),
        0.50,
      ) / firstHitDistanceMedian
    : 1;

  const adjacentJumps = [];
  let adjacentComparable = 0;
  let adjacentContinuous = 0;
  for (let r = 0; r < rayCount; r += 1) {
    const a = firstSupportDistances[r];
    const b = firstSupportDistances[(r + 1) % rayCount];
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    adjacentComparable += 1;
    const normalizedJump = Math.abs(a - b) / Math.max(1, Math.min(a, b));
    adjacentJumps.push(normalizedJump);
    if (normalizedJump <= 0.35) adjacentContinuous += 1;
  }
  const adjacentDistanceContinuity = adjacentComparable
    ? adjacentContinuous / adjacentComparable
    : 0;
  const adjacentJumpQ75 = quantile(adjacentJumps, 0.75);
  const firstHitStrongFraction = firstSupportScores.filter(score => score >= 0.55).length / rayCount;

  const confidence = clamp01(
    0.38 * coverage +
    0.16 * strongFraction +
    0.20 * (1 - weakArcFraction) +
    0.14 * supportQ25 +
    0.12 * supportMedian
  );

  return {
    rayCount,
    coverage,
    strongFraction,
    weakArcFraction,
    supportQ25,
    supportMedian,
    confidence,
    medianHitDistance: quantile(rayDistances, 0.50),
    firstHitCoverage,
    firstHitStrongFraction,
    firstHitDistanceMedian,
    firstHitDistanceIqrNormalized,
    firstHitDistanceMadNormalized,
    adjacentDistanceContinuity,
    adjacentJumpQ75,
  };
}

export function classifyV4(bundle, query, policy = FIXED_V4_POLICY) {
  // V3 remains the topology prior. V4 converts independent enclosure,
  // persistence, boundary-continuity and texture-network evidence into compact
  // confidence/risk scores. It only overrides V3 when the corresponding gate is
  // strong enough; otherwise the safer legacy label is preserved.
  const legacy = classifyV3(bundle, query, {
    evidenceThreshold: policy.evidenceThreshold,
  });
  const radial = radialEnclosureProfile(bundle, query.seed[0], query.seed[1]);

  const quietInterior =
    legacy.local.line <= policy.quietInteriorMaximumLine &&
    legacy.local.texture <= policy.quietInteriorMaximumTexture &&
    legacy.local.wash <= policy.quietInteriorMaximumWash;

  const fullRadialEnclosure =
    radial.confidence >= policy.quietRadialMinimum &&
    radial.coverage >= policy.quietRadialMinimumCoverage &&
    radial.strongFraction >= policy.quietRadialMinimumStrongFraction &&
    radial.weakArcFraction <= policy.quietRadialMaximumWeakArcFraction;

  const persistence = legacy.topologyPersistence ?? {};
  const closedVoteFraction =
    persistence.closedVoteFraction ?? (legacy.counts.closed / 9);
  const stableClosedRatio = closedVoteFraction > 0
    ? clamp01((persistence.stableClosedVoteFraction ?? 0) / closedVoteFraction)
    : 0;
  const areaStability = 1 - clamp01(persistence.closedAreaMadNormalized ?? 1);
  const topologyIdentityConfidence = clamp01(
    0.45 * (persistence.closedIouQ25 ?? 0) +
    0.30 * stableClosedRatio +
    0.25 * areaStability
  );

  const boundaryConfidence = legacy.boundary?.confidence ?? 0;
  const componentReliability = clamp01(
    0.65 * topologyIdentityConfidence +
    0.35 * boundaryConfidence
  );

  // Broad wash can make "a line somewhere on every ray" look enclosed even
  // when those hits do not describe one intended fill face. Stable component
  // identity discounts that ambiguity instead of using a raw wash cutoff.
  const openEnclosureAmbiguityRisk =
    ramp01(legacy.local.wash, 0.18, 0.35) *
    (1 - componentReliability);

  // For V3 Ambiguous results, require several independent closure cues:
  // radial enclosure, closed topology vote share, low local texture, and either
  // persistent component identity or a continuous observed boundary.
  const closureConfidence = clamp01(
    (
      radial.confidence +
      closedVoteFraction +
      0.5 * (1 - legacy.local.texture)
    ) / 2.5
  );
  const continuityConfidence = Math.max(
    boundaryConfidence,
    persistence.closedIouQ25 ?? 0
  );

  // Dense line networks are risky in two different ways:
  //  1) moderately strong strokes can form accidental cells in textured fields;
  //  2) the inferred component can have a long weak boundary arc even when a
  //     radial scan finds unrelated strong edges farther away.
  // The first term is an AND-like soft conjunction (min); the second is a
  // boundary-discontinuity score deliberately capped below the dense-network
  // term so only severe discontinuity can independently force Ambiguous.
  const denseNetworkRisk = Math.min(
    ramp01(legacy.local.texture, 0.55, 0.70),
    1 - ramp01(legacy.local.line, 0.58, 0.62),
    1 - ramp01(legacy.local.wash, 0.30, 0.40),
    ramp01(legacy.local.coherence, 0.45, 0.55)
  );
  const boundaryDiscontinuityRiskRaw = clamp01(
    0.45 * ramp01(legacy.local.texture, 0.60, 0.90) +
    0.30 * ramp01(legacy.boundary?.weakArcFraction ?? 0, 0.35, 0.70) +
    0.25 * (1 - (legacy.boundary?.supportCoverage ?? 0))
  );
  const boundaryDiscontinuityRisk = clamp01(
    policy.boundaryDiscontinuityRiskScale * boundaryDiscontinuityRiskRaw
  );
  const textureNetworkRisk = Math.max(
    denseNetworkRisk,
    boundaryDiscontinuityRisk
  );

  const enclosedOpenCandidate =
    legacy.label === 'open' &&
    !legacy.nearFrame &&
    fullRadialEnclosure;

  const confidentAmbiguousClosure =
    legacy.label === 'ambiguous' &&
    !legacy.nearFrame &&
    fullRadialEnclosure &&
    legacy.groups.balanced === 'closed' &&
    legacy.groups.permissive === 'closed' &&
    closureConfidence >= policy.ambiguousClosureConfidenceMinimum &&
    continuityConfidence >= policy.ambiguousContinuityMinimum;

  const riskyClosedNetwork =
    legacy.label === 'closed' &&
    textureNetworkRisk >= policy.closedTextureNetworkRiskMinimum;

  let label = legacy.label;
  let decision = 'v3-preserved';
  if (enclosedOpenCandidate) {
    if (
      openEnclosureAmbiguityRisk >=
      policy.openEnclosureAmbiguityRiskMinimum
    ) {
      label = 'ambiguous';
      decision = 'confidence-enclosure-ambiguous';
    } else {
      label = 'closed';
      decision = 'confidence-enclosure-closed';
    }
  } else if (confidentAmbiguousClosure) {
    label = 'closed';
    decision = 'confidence-topology-closed';
  } else if (riskyClosedNetwork) {
    label = 'ambiguous';
    decision = 'confidence-network-ambiguous';
  }

  return {
    ...legacy,
    label,
    decision,
    legacyLabel: legacy.label,
    radial,
    quietInterior,
    fullRadialEnclosure,
    topologyIdentityConfidence,
    componentReliability,
    boundaryConfidence,
    openEnclosureAmbiguityRisk,
    closureConfidence,
    continuityConfidence,
    denseNetworkRisk,
    boundaryDiscontinuityRisk,
    textureNetworkRisk,
    enclosedOpenCandidate,
    confidentAmbiguousClosure,
    riskyClosedNetwork,
  };
}
