import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { REAL_ART_CORPUS } from './manifest.js';
import { buildRealArtEvidenceV3 } from './evidence-v3.js';
import { classifyV3 } from './v3-classifier.js';

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
      const got = classifyV3(decoded.get(item.id), q, policy);
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
    const got = classifyV3(decoded.get(item.id), q, selected.policy);
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
