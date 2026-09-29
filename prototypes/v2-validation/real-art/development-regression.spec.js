import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { REGION_V3_FINAL_BLIND } from './final-blind-manifest.js';
import { REGION_V3_FINAL_BLIND_2 } from './final-blind2-manifest.js';
import { REGION_V3_FINAL_BLIND_3 } from './final-blind3-manifest.js';
import { REGION_V3_FINAL_BLIND_4 } from './final-blind4-manifest.js';
import { REGION_V3_FINAL_BLIND_5 } from './final-blind5-manifest.js';
import { REGION_V3_FINAL_BLIND_6 } from './final-blind6-manifest.js';
import { REGION_V3_FINAL_BLIND_7 } from './final-blind7-manifest.js';
import { REGION_V3_FINAL_BLIND_8 } from './final-blind8-manifest.js';
import { REGION_V3_FINAL_BLIND_9 } from './final-blind9-manifest.js';
import { buildRealArtEvidenceV3 } from './evidence-v3.js';
import { classifyV3, FIXED_V3_POLICY } from './v3-classifier.js';

const MAX_SIDE = 256;
const CORPORA = [
  REGION_V3_FINAL_BLIND,
  REGION_V3_FINAL_BLIND_2,
  REGION_V3_FINAL_BLIND_3,
  REGION_V3_FINAL_BLIND_4,
  REGION_V3_FINAL_BLIND_5,
  REGION_V3_FINAL_BLIND_6,
  REGION_V3_FINAL_BLIND_7,
  REGION_V3_FINAL_BLIND_8,
  REGION_V3_FINAL_BLIND_9,
];

const DEVELOPMENT_FLOOR = Object.freeze({
  totalQueries: 90,
  minimumOverallPass: 80,
  expectedByLabel: Object.freeze({ closed: 27, open: 45, ambiguous: 18 }),
  minimumPassByLabel: Object.freeze({ closed: 21, open: 42, ambiguous: 15 }),
});

async function fetchBytes(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': 'Illustro-Validation/1.0' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error('fetch ' + response.status + ' ' + url);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      return { bytes: Buffer.from(await response.arrayBuffer()), contentType };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1000));
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

test('exposed Region blind sets remain above aggregate development regression floor', async ({ page }) => {
  test.setTimeout(240000);

  const items = CORPORA.flat();
  const decoded = new Map();
  for (const item of items) {
    if (decoded.has(item.id)) continue;
    const { bytes, contentType } = await fetchBytes(item.imageUrl);
    decoded.set(item.id, buildRealArtEvidenceV3(await decodeLuma(page, bytes, contentType)));
  }

  const byLabel = {
    closed: { pass: 0, total: 0 },
    open: { pass: 0, total: 0 },
    ambiguous: { pass: 0, total: 0 },
  };
  const details = [];
  let pass = 0;
  let total = 0;

  for (const item of items) {
    for (const query of item.queries) {
      const got = classifyV3(decoded.get(item.id), query, FIXED_V3_POLICY);
      const ok = got.label === query.expected;
      total += 1;
      pass += ok ? 1 : 0;
      byLabel[query.expected].total += 1;
      byLabel[query.expected].pass += ok ? 1 : 0;
      details.push({
        item: item.id,
        query: query.id,
        expected: query.expected,
        got: got.label,
        ok,
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'EXPOSED_DEVELOPMENT_REGRESSION',
    policy: FIXED_V3_POLICY,
    floor: DEVELOPMENT_FLOOR,
    result: { pass, total, byLabel, details },
  };
  await mkdir(new URL('../results/', import.meta.url), { recursive: true });
  await writeFile(
    new URL('../results/region-v3-development-regression-2026-09-29.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log('REGION_V3_EXPOSED_DEVELOPMENT', JSON.stringify(report, null, 2));

  expect(total).toBe(DEVELOPMENT_FLOOR.totalQueries);
  expect(pass).toBeGreaterThanOrEqual(DEVELOPMENT_FLOOR.minimumOverallPass);
  expect(byLabel.closed.pass).toBeGreaterThanOrEqual(DEVELOPMENT_FLOOR.minimumPassByLabel.closed);
  expect(byLabel.open.pass).toBeGreaterThanOrEqual(DEVELOPMENT_FLOOR.minimumPassByLabel.open);
  expect(byLabel.ambiguous.pass).toBeGreaterThanOrEqual(DEVELOPMENT_FLOOR.minimumPassByLabel.ambiguous);
});
