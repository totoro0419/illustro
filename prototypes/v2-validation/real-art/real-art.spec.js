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
  const paper = percentile(luma, 0.86);
  const dark = percentile(luma, 0.12);
  const range = Math.max(0.06, paper - dark);
  const grid = new EvidenceGrid(width, height);
  const radius = 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0, n = 0;
      for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy += 1) {
        for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx += 1) {
          sum += luma[yy * width + xx]; n += 1;
        }
      }
      const local = sum / n;
      const globalInk = Math.max(0, (paper - luma[y * width + x]) / range);
      const localInk = Math.max(0, (local - luma[y * width + x]) / 0.16);
      grid.set(x, y, Math.min(1, 0.38 * globalInk + 0.92 * localInk));
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
      const c = seedComponent(r, query.seed[0], query.seed[1]);
      votes.push(c ? (c.touchesEdge ? 'open' : 'closed') : 'ambiguous');
    }
  }
  const closed = votes.filter(v => v === 'closed').length;
  const open = votes.filter(v => v === 'open').length;
  if (closed >= 8) return { label: 'closed', stability: closed / votes.length, votes };
  if (open >= 8) return { label: 'open', stability: open / votes.length, votes };
  return { label: 'ambiguous', stability: Math.max(closed, open) / votes.length, votes };
}

function candidatePolicies() {
  const out = [];
  for (const evidenceThreshold of [0.28, 0.34, 0.40, 0.46, 0.52, 0.58, 0.64]) {
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
      details.push({ item: item.id, query: q.id, expected: q.expected, got: got.label, stability: got.stability });
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
    holdoutDetails.push({ item: item.id, query: q.id, expected: q.expected, got: got.label, stability: got.stability });
  }

  const report = { generatedAt: new Date().toISOString(), selected, holdout: { pass: holdoutPass, total: holdoutTotal, details: holdoutDetails } };
  await mkdir(new URL('../results/', import.meta.url), { recursive: true });
  await writeFile(new URL('../results/real-art-2026-09-29.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log('REAL_ART_CALIBRATION', JSON.stringify(report, null, 2));

  expect(selected.pass / selected.total).toBeGreaterThanOrEqual(0.90);
  expect(holdoutPass / holdoutTotal).toBeGreaterThanOrEqual(0.80);
  expect(holdoutDetails.some(x => x.expected === 'ambiguous')).toBe(true);
});
