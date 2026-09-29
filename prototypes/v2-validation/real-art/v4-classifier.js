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
      if (score > best) {
        best = score;
        bestDistance = distance;
      }
    }

    rayBest.push(best);
    rayDistances.push(bestDistance);
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

  const quietRadialRescue =
    legacy.label === 'open' &&
    !legacy.nearFrame &&
    quietInterior &&
    fullRadialEnclosure;

  const label = quietRadialRescue ? 'closed' : legacy.label;

  return {
    ...legacy,
    label,
    decision: quietRadialRescue ? 'quiet-radial-enclosure-rescue' : 'v3-preserved',
    legacyLabel: legacy.label,
    radial,
    quietInterior,
    fullRadialEnclosure,
    quietRadialRescue,
  };
}
