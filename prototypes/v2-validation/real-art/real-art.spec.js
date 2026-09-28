import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { REAL_ART_CORPUS } from './manifest.js';
import { EvidenceGrid, resolveRegion } from '../src/region.js';

const MAX_SIDE = 256;

async function fetchBytes(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Illustro-Validation/1.0' } });
      if (!response.ok) throw new Error(`fetch ${response.status} ${url}`);
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
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
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

function percentile(a, p) {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))];
}

function evidenceFromLuma(decoded) {
  const { width, height, luma } = decoded;
  const paper = percentile(luma, 0.90);
  const dark = percentile(luma, 0.10);
  const range = Math.max(0.06, paper - dark);
  const raw = new Float32Array(width * height);
  const radius = 2;
  const at = (x, y) => luma[Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0, n = 0;
      for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy += 1) {
        for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx += 1) {
          sum += luma[yy * width + xx]; n += 1;
        }
      }
      const center = at(x, y);
      const local = sum / n;
      const globalInk = Math.max(0, (paper - center) / range);
      const localInk = Math.max(0, (local - center) / 0.12);

      const gx =
        -at(x - 1, y - 1) + at(x + 1, y - 1) +
        -2 * at(x - 1, y) + 2 * at(x + 1, y) +
        -at(x - 1, y + 1) + at(x + 1, y + 1);
      const gy =
        -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) +
         at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
      const gradient = Math.min(1, Math.hypot(gx, gy) / 1.15);

      raw[y * width + x] = Math.min(1, Math.max(
        0.45 * globalInk,
        0.92 * localInk,
        0.98 * gradient,
      ));
    }
  }

  // One-pixel max filter compensates for antialiasing/downsampling of thin real ink.
  // This is evidence thickening, not a semantic gap-close decision.
  const grid = new EvidenceGrid(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let v = 0;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy += 1) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx += 1) {
          v = Math.max(v, raw[yy * width + xx]);
        }
      }
      grid.set(x, y, v);
    }
  }
  return grid;
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

function classify(grid, query, basePolicy) {
  const votes = [];
  const areas = [];
  for (const dt of [-0.06, 0, 0.06]) {
    for (const dg of [-1, 0, 1]) {
      const policy = {
        evidenceThreshold: Math.max(0.15, Math.min(0.9, basePolicy.evidenceThreshold + dt)),
        gapMax: Math.max(0, Math.min(4, basePolicy.gapMax + dg)),
        confidenceThreshold: 0,
        retainIou: 0.8,
        identityMargin: 0.2,
        ambiguousIouFloor: 0.3,
        lineageOverlapFraction: 0.18,
        candidateSearchPx: 4,
      };
      const r = resolveRegion(grid, policy);
      const component = seedComponent(r, query.seed[0], query.seed[1]);
      votes.push(component ? (component.touchesEdge ? 'open' : 'closed') : 'ambiguous');
      if (component) areas.push(component.area / (grid.width * grid.height));
    }
  }

  const closed = votes.filter(v => v === 'closed').length;
  const open = votes.filter(v => v === 'open').length;
  const dominant = Math.max(closed, open);
  const areaRange = areas.length ? Math.max(...areas) - Math.min(...areas) : 1;

  const cx = Math.max(0, Math.min(grid.width - 1, Math.round(query.seed[0] * (grid.width - 1))));
  const cy = Math.max(0, Math.min(grid.height - 1, Math.round(query.seed[1] * (grid.height - 1))));
  let strong = 0, localN = 0;
  const localRadius = 10;
  const localThreshold = Math.max(0.15, basePolicy.evidenceThreshold * 0.80);
  for (let y = Math.max(0, cy - localRadius); y <= Math.min(grid.height - 1, cy + localRadius); y += 1) {
    for (let x = Math.max(0, cx - localRadius); x <= Math.min(grid.width - 1, cx + localRadius); x += 1) {
      localN += 1;
      if (grid.get(x, y) >= localThreshold) strong += 1;
    }
  }
  const localStrongFraction = localN ? strong / localN : 0;

  // Ambiguity is a confidence property, not merely an 8/9 unanimity rule.
  // A clear majority with almost no opposing topology is accepted; otherwise it remains unresolved.
  const closedCandidate = closed >= 6 && open <= 1;
  const openCandidate = open >= 6 && closed <= 1;
  if (!closedCandidate && !openCandidate) {
    return { label: 'ambiguous', stability: dominant / votes.length, votes, areaRange, localStrongFraction };
  }

  // Material topology-size changes under small policy perturbations are ambiguous.
  if (areaRange > 0.20) {
    return { label: 'ambiguous', stability: dominant / votes.length, votes, areaRange, localStrongFraction };
  }

  // An apparently open answer surrounded by dense boundary evidence is unresolved rather than
  // silently leaking to the exterior. The threshold is intentionally high so clean paper/background
  // does not become Ambiguous just because a frame or nearby line enters the local window.
  if (openCandidate && localStrongFraction > 0.28) {
    return { label: 'ambiguous', stability: open / votes.length, votes, areaRange, localStrongFraction };
  }

  if (closedCandidate) return { label: 'closed', stability: closed / votes.length, votes, areaRange, localStrongFraction };
  if (openCandidate) return { label: 'open', stability: open / votes.length, votes, areaRange, localStrongFraction };
  return { label: 'ambiguous', stability: dominant / votes.length, votes, areaRange, localStrongFraction };
}

function candidatePolicies() {
  const out = [];
  for (const evidenceThreshold of [0.24, 0.30, 0.36, 0.42, 0.48, 0.54, 0.60]) {
    for (const gapMax of [0, 1, 2, 3]) out.push({ evidenceThreshold, gapMax });
  }
  return out;
}

test('real-art corpus calibrates on training split and passes holdout', async ({ page }) => {
  test.setTimeout(120000);
  const decoded = new Map();
  for (const item of REAL_ART_CORPUS) {
    const { bytes, contentType } = await fetchBytes(item.imageUrl);
    decoded.set(item.id, evidenceFromLuma(await decodeLuma(page, bytes, contentType)));
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
      details.push({ item: item.id, query: q.id, expected: q.expected, got: got.label, stability: got.stability, areaRange: got.areaRange, localStrongFraction: got.localStrongFraction, votes: got.votes });
    }
    return { policy, pass, total, details };
  }).sort((a, b) => b.pass - a.pass || a.policy.gapMax - b.policy.gapMax || b.policy.evidenceThreshold - a.policy.evidenceThreshold);

  const selected = scored[0];
  const holdoutDetails = [];
  let holdoutPass = 0, holdoutTotal = 0;
  for (const item of holdout) for (const q of item.queries) {
    const got = classify(decoded.get(item.id), q, selected.policy);
    holdoutTotal += 1;
    holdoutPass += got.label === q.expected ? 1 : 0;
    holdoutDetails.push({ item: item.id, query: q.id, expected: q.expected, got: got.label, stability: got.stability, areaRange: got.areaRange, localStrongFraction: got.localStrongFraction, votes: got.votes });
  }

  const report = { generatedAt: new Date().toISOString(), selected, holdout: { pass: holdoutPass, total: holdoutTotal, details: holdoutDetails } };
  await mkdir(new URL('../results/', import.meta.url), { recursive: true });
  await writeFile(new URL('../results/real-art-2026-09-29.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log('REAL_ART_CALIBRATION', JSON.stringify(report, null, 2));

  expect(selected.pass / selected.total).toBeGreaterThanOrEqual(0.90);
  expect(holdoutPass / holdoutTotal).toBeGreaterThanOrEqual(0.80);
  expect(holdoutDetails.some(x => x.expected === 'ambiguous')).toBe(true);
});
