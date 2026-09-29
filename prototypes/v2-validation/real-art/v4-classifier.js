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
});

function quantile(values, q) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const position = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * q)));
  return sorted[position];
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
  // V3 already protects Open and Ambiguous well on the exposed corpus. V4 does
  // not replace those guards. It adds one independently measurable enclosure
  // signal for V3's known false-open mode: a quiet interior surrounded in every
  // angular sector by strong boundary evidence.
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

  // V3 can report Open when all threshold hypotheses leak through a faint frame.
  // If every angular sector sees strong enclosing evidence, the topology is not
  // genuinely exterior-connected. Broad wash with almost no texture is kept
  // Ambiguous rather than force-closed because it often represents scene content
  // rather than one intended fill face.
  const radialWashAmbiguity =
    legacy.label === 'open' &&
    !legacy.nearFrame &&
    fullRadialEnclosure &&
    legacy.local.texture <= 0.10 &&
    legacy.local.wash >= 0.20;

  const radialEnclosureRescue =
    legacy.label === 'open' &&
    !legacy.nearFrame &&
    fullRadialEnclosure &&
    !radialWashAmbiguity;

  // When V3 is already Ambiguous but the balanced/permissive topology is Closed,
  // combine radial support, closed-vote share, and low local texture into one
  // continuous confidence score. This covers both pale panels and strongly
  // washed framed fields without per-artwork thresholds.
  const ambiguousClosureScore =
    radial.confidence +
    legacy.counts.closed / 9 +
    0.5 * (1 - legacy.local.texture);

  const ambiguousClosureRescue =
    legacy.label === 'ambiguous' &&
    !legacy.nearFrame &&
    fullRadialEnclosure &&
    legacy.groups.balanced === 'closed' &&
    legacy.groups.permissive === 'closed' &&
    ambiguousClosureScore >= 2.08;

  // Dense, low-wash line networks can create a closed topology even when the
  // local stroke field is only moderately strong and directionally mixed. Keep
  // those cases Ambiguous instead of trusting the accidental cell.
  const denseNetworkAmbiguity =
    legacy.label === 'closed' &&
    legacy.local.texture >= 0.60 &&
    legacy.local.wash < 0.30 &&
    legacy.local.line < 0.60 &&
    legacy.local.coherence > 0.48;

  let label = legacy.label;
  let decision = 'v3-preserved';
  if (radialWashAmbiguity) {
    label = 'ambiguous';
    decision = 'radial-wash-ambiguity';
  } else if (radialEnclosureRescue) {
    label = 'closed';
    decision = 'radial-enclosure-rescue';
  } else if (ambiguousClosureRescue) {
    label = 'closed';
    decision = 'radial-topology-confidence-rescue';
  } else if (denseNetworkAmbiguity) {
    label = 'ambiguous';
    decision = 'dense-network-ambiguity';
  }

  return {
    ...legacy,
    label,
    decision,
    legacyLabel: legacy.label,
    radial,
    quietInterior,
    fullRadialEnclosure,
    quietRadialRescue: radialEnclosureRescue,
    radialWashAmbiguity,
    radialEnclosureRescue,
    ambiguousClosureScore,
    ambiguousClosureRescue,
    denseNetworkAmbiguity,
  };
}
