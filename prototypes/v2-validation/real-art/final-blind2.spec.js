import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { REGION_V3_FINAL_BLIND_2, REGION_V3_FINAL_BLIND_2_CRITERIA } from './final-blind2-manifest.js';
import { buildRealArtEvidenceV3 } from './evidence-v3.js';
import { classifyV3, FIXED_V3_POLICY } from './v3-classifier.js';

const MAX_SIDE = 256;

async function fetchBytes(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': 'Illustro-Validation/1.0' },
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

test('Region V3 second fresh blind corpus meets predeclared Gate C criteria', async ({ page }) => {
  test.setTimeout(120000);

  const decoded = new Map();
  for (const item of REGION_V3_FINAL_BLIND_2) {
    const { bytes, contentType } = await fetchBytes(item.imageUrl);
    decoded.set(item.id, buildRealArtEvidenceV3(await decodeLuma(page, bytes, contentType)));
  }

  const details = [];
  const byLabel = {
    closed: { pass: 0, total: 0 },
    open: { pass: 0, total: 0 },
    ambiguous: { pass: 0, total: 0 },
  };
  let pass = 0;
  let total = 0;

  for (const item of REGION_V3_FINAL_BLIND_2) {
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
        groups: got.groups,
        counts: got.counts,
        areaRange: got.areaRange,
        local: got.local,
        closure: got.closure,
        artifact: got.artifact,
        coherentClosure: got.coherentClosure,
        nearFrame: got.nearFrame,
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    labelFreezeCommit: 'aa94246418c6b58bbf762472e839587497944a42',
    classifierFreezeCommit: '88b7bf7c9bee8e0961a605c93defd76f737cc09e',
    evidenceModel: 'v3-multiscale-oriented-texture-wash',
    fixedPolicy: FIXED_V3_POLICY,
    criteria: REGION_V3_FINAL_BLIND_2_CRITERIA,
    result: { pass, total, byLabel, details },
  };

  await mkdir(new URL('../results/', import.meta.url), { recursive: true });
  await writeFile(
    new URL('../results/region-v3-final-blind2-2026-09-29.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log('REGION_V3_FINAL_BLIND_2', JSON.stringify(report, null, 2));

  expect(total).toBe(REGION_V3_FINAL_BLIND_2_CRITERIA.totalQueries);
  expect(pass).toBeGreaterThanOrEqual(REGION_V3_FINAL_BLIND_2_CRITERIA.minimumOverallPass);
  expect(byLabel.closed.pass).toBeGreaterThanOrEqual(REGION_V3_FINAL_BLIND_2_CRITERIA.minimumPassByLabel.closed);
  expect(byLabel.open.pass).toBeGreaterThanOrEqual(REGION_V3_FINAL_BLIND_2_CRITERIA.minimumPassByLabel.open);
  expect(byLabel.ambiguous.pass).toBeGreaterThanOrEqual(REGION_V3_FINAL_BLIND_2_CRITERIA.minimumPassByLabel.ambiguous);
});
