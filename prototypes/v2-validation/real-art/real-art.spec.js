import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { REAL_ART_CORPUS } from './manifest.js';
import { resolveRegion } from '../src/region.js';
import { buildRealArtEvidenceV3, evidenceV3LocalSummary } from './evidence-v3.js';

const MAX_SIDE = 256;

async function fetchBytes(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Illustro-Validation/1.0' } });
      if (!response.ok) throw new Error('fetch ' + response.status + ' ' + url);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return { bytes: Buffer.from(await response.arrayBuffer()), contentType };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }
  throw lastError;
}

async function decodeLuma(page, bytes, contentType) {
  const base64 = bytes.toString('base64');
  return page.evaluate(async ({ base64, contentType, maxSide }) => {
    const bin = atob(base64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
    const blob = new Blob([u8], { type: contentType });
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(8, Math.round(bitmap.width * scale));
    const height = Math.max(8, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    const luma = new Array(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
      luma[p] = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    }
    bitmap.close();
    return { width, height, luma };
  }, { base64, contentType, maxSide: MAX_SIDE });
}

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
  const sums = { line: 0, texture: 0, wash: 0, coherence: 0, bridge: 0 };
  for (const i of cells) {
    sums.line += features.line[i]; sums.texture += features.texture[i]; sums.wash += features.wash[i]; sums.coherence += features.coherence[i]; sums.bridge += features.bridge[i];
  }
  const n = cells.size;
  return { line: sums.line / n, texture: sums.texture / n, wash: sums.wash / n, coherence: sums.coherence / n, bridge: sums.bridge / n, samples: n };
}

function dominant3(labels) {
  const counts = { closed: 0, open: 0, ambiguous: 0 };
  for (const label of labels) counts[label] += 1;
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return ranked[0][1] >= 2 ? ranked[0][0] : 'ambiguous';
}

function classify(bundle, query, basePolicy) {
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
      labels.push(label); votes.push(label);
      if (component) areas.push(component.area / (result.gridWidth * result.gridHeight));
      if (dt === 0) central[hypothesis.name] = { result, component, label, boundary: componentBoundaryStats(bundle, result, component) };
    }
    groups[hypothesis.name] = dominant3(labels);
  }

  const counts = { closed: 0, open: 0, ambiguous: 0 };
  for (const vote of votes) counts[vote] += 1;
  const areaRange = areas.length ? Math.max(...areas) - Math.min(...areas) : 1;
  const local = evidenceV3LocalSummary(bundle, query.seed[0], query.seed[1], 5);
  const closure = central.balanced?.label === 'closed' ? central.balanced.boundary : central.permissive?.boundary;
  const artifact = closure ? Math.max(closure.texture, closure.wash) : Math.max(local.texture, local.wash);
  const closureQuality = closure ? (0.50 * closure.line + 0.25 * closure.coherence + 0.25 * closure.bridge - 0.45 * artifact) : -1;

  let label = 'ambiguous';
  if (groups.conservative === groups.balanced && groups.balanced === groups.permissive) {
    label = groups.balanced;
    if (label === 'closed' && closure && artifact > 0.58 && closure.line < 0.52) label = 'ambiguous';
  } else if (groups.balanced === 'closed' && groups.permissive === 'closed' && closureQuality >= 0.24 && areaRange <= 0.18) {
    label = 'closed';
  } else if (groups.conservative === 'open' && groups.balanced === 'open' && groups.permissive !== 'closed' && areaRange <= 0.18) {
    label = 'open';
  } else {
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const [winner, winnerCount] = ranked[0];
    const opposition = winner === 'closed' ? counts.open : winner === 'open' ? counts.closed : Math.max(counts.closed, counts.open);
    if (winnerCount >= 7 && opposition <= 1 && areaRange <= 0.15 && artifact < 0.36) label = winner;
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
  };
}

function candidatePolicies() {
  return [0.42, 0.48, 0.54, 0.60].map(evidenceThreshold => ({ evidenceThreshold }));
}

test('real-art V3 evidence calibrates on training split and passes development holdout', async ({ page }) => {
  test.setTimeout(120000);
  const decoded = new Map();
  for (const item of REAL_ART_CORPUS) {
    const { bytes, contentType } = await fetchBytes(item.imageUrl);
    decoded.set(item.id, buildRealArtEvidenceV3(await decodeLuma(page, bytes, contentType)));
  }

  const train = REAL_ART_CORPUS.filter(x => x.split === 'train');
  const holdout = REAL_ART_CORPUS.filter(x => x.split === 'holdout');
  const scored = candidatePolicies().map(policy => {
    let pass = 0, total = 0;
    const details = [];
    for (const item of train) for (const q of item.queries) {
      const got = classify(decoded.get(item.id), q, policy);
      total += 1;
      pass += got.label === q.expected ? 1 : 0;
      details.push({ item: item.id, query: q.id, expected: q.expected, got: got.label, ...got });
    }
    return { policy, pass, total, details };
  }).sort((a, b) => b.pass - a.pass || b.policy.evidenceThreshold - a.policy.evidenceThreshold);

  const selected = scored[0];
  const holdoutDetails = [];
  let holdoutPass = 0, holdoutTotal = 0;
  for (const item of holdout) for (const q of item.queries) {
    const got = classify(decoded.get(item.id), q, selected.policy);
    holdoutTotal += 1;
    holdoutPass += got.label === q.expected ? 1 : 0;
    holdoutDetails.push({ item: item.id, query: q.id, expected: q.expected, got: got.label, ...got });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    evidenceModel: 'v3-multiscale-oriented-texture-wash',
    note: 'Holdout was exposed by V2 and is development evidence only; it is not a fresh blind final set.',
    selected,
    holdout: { pass: holdoutPass, total: holdoutTotal, details: holdoutDetails },
  };
  await mkdir(new URL('../results/', import.meta.url), { recursive: true });
  await writeFile(new URL('../results/real-art-v3-2026-09-29.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log('REAL_ART_V3_CALIBRATION', JSON.stringify(report, null, 2));

  expect(selected.pass / selected.total).toBeGreaterThanOrEqual(0.90);
  expect(holdoutPass / holdoutTotal).toBeGreaterThanOrEqual(0.80);
  expect(holdoutDetails.some(x => x.expected === 'ambiguous')).toBe(true);
});
