import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { REGION_V3_FINAL_LARGE_FINGERPRINTS } from './final-large-fingerprints.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { REGION_V3_FINAL_LARGE, REGION_V3_FINAL_LARGE_CRITERIA } from './final-large-manifest.js';
import { buildRealArtEvidenceV3 } from './evidence-v3.js';
import { classifyV3, FIXED_V3_POLICY } from './v3-classifier.js';

const MAX_SIDE = 256;

async function fetchFrozenBytes(item) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(item.imageUrl, {
        redirect: 'follow',
        headers: { 'user-agent': 'Illustro-Validation/1.0' },
      });
      if (!response.ok) throw new Error('fetch ' + response.status + ' ' + item.imageUrl);
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const bytes = Buffer.from(await response.arrayBuffer());
      const rawDigest = createHash('sha256').update(bytes).digest('hex');
      return { bytes, contentType, rawDigest };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

async function decodedVisualFingerprint(page, bytes, contentType) {
  const base64 = bytes.toString('base64');
  return page.evaluate(async ({ base64, contentType }) => {
    const bin = atob(base64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
    const bitmap = await createImageBitmap(new Blob([u8], { type: contentType }));

    const canvas = new OffscreenCanvas(9, 8);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, 9, 8);
    const data = ctx.getImageData(0, 0, 9, 8).data;
    const luma = new Float64Array(72);
    for (let i = 0; i < 72; i += 1) {
      const p = i * 4;
      luma[i] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
    }
    let hash = 0n;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        hash = (hash << 1n) | (luma[y * 9 + x] > luma[y * 9 + x + 1] ? 1n : 0n);
      }
    }
    const result = {
      width: bitmap.width,
      height: bitmap.height,
      dHash64: hash.toString(16).padStart(16, '0'),
    };
    bitmap.close();
    return result;
  }, { base64, contentType });
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

test('exposed first large corpus remains above post-failure development regression floor', async ({ page }) => {
  test.setTimeout(180000);

  const decoded = new Map();
  const sourceDigests = {};
  const sourceFingerprints = {};
  for (const item of REGION_V3_FINAL_LARGE) {
    const { bytes, contentType, rawDigest } = await fetchFrozenBytes(item);
    const fingerprint = await decodedVisualFingerprint(page, bytes, contentType);
    const expectedFingerprint = REGION_V3_FINAL_LARGE_FINGERPRINTS[item.id];
    expect(expectedFingerprint, 'missing frozen fingerprint for ' + item.id).toBeTruthy();
    expect(fingerprint.width, item.id + ' width changed').toBe(expectedFingerprint.width);
    expect(fingerprint.height, item.id + ' height changed').toBe(expectedFingerprint.height);
    expect(fingerprint.dHash64, item.id + ' decoded visual content changed').toBe(expectedFingerprint.dHash64);

    sourceDigests[item.id] = rawDigest;
    sourceFingerprints[item.id] = fingerprint;
    decoded.set(item.id, buildRealArtEvidenceV3(await decodeLuma(page, bytes, contentType)));
  }

  const byLabel = {
    closed: { pass: 0, total: 0 },
    open: { pass: 0, total: 0 },
    ambiguous: { pass: 0, total: 0 },
  };
  const byStratum = {};
  const details = [];
  let pass = 0;
  let total = 0;

  for (const item of REGION_V3_FINAL_LARGE) {
    if (!byStratum[item.stratum]) byStratum[item.stratum] = { pass: 0, total: 0 };
    for (const query of item.queries) {
      const got = classifyV3(decoded.get(item.id), query, FIXED_V3_POLICY);
      const ok = got.label === query.expected;
      total += 1;
      pass += ok ? 1 : 0;
      byLabel[query.expected].total += 1;
      byLabel[query.expected].pass += ok ? 1 : 0;
      byStratum[item.stratum].total += 1;
      byStratum[item.stratum].pass += ok ? 1 : 0;
      details.push({
        item: item.id,
        stratum: item.stratum,
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
        denseOutlinedClosure: got.denseOutlinedClosure,
        framedWashClosure: got.framedWashClosure,
        denseContextContrastClosure: got.denseContextContrastClosure,
        quietContinuousClosure: got.quietContinuousClosure,
        quietFramedClosure: got.quietFramedClosure,
        cleanerLargeFrameClosure: got.cleanerLargeFrameClosure,
        mediumStructuralClosure: got.mediumStructuralClosure,
        clutterEnclosure: got.clutterEnclosure,
        microTextureAccidentalClosure: got.microTextureAccidentalClosure,
        texturedBridgeNetworkEnclosure: got.texturedBridgeNetworkEnclosure,
        softHypothesis: got.softHypothesis,
        nearFrame: got.nearFrame,
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    status: 'EXPOSED_LARGE_DEVELOPMENT_REGRESSION',
    candidateSourceFreezeCommit: '9d65bc51fdd1892207eae2298b6c81365eea448a',
    labelSeedSourceHashFreezeCommit: '4d4542551f71573764e1155e2c9315592d2cb990',
    decodedVisualFingerprintFreezeCommit: '5113a6c9725d9a4c7e2ef166daeae99ef187d074',
    classifierFreezeCommit: '28b90c658004ee1c83ce25d93cb50a856f50ab22',
    evidenceModel: 'v3-multiscale-oriented-texture-wash-plus-isolated-soft',
    fixedPolicy: FIXED_V3_POLICY,
    sourceDigests,
    sourceFingerprints,
    criteria: REGION_V3_FINAL_LARGE_CRITERIA,
    result: { pass, total, byLabel, byStratum, details },
  };

  await mkdir(new URL('../results/', import.meta.url), { recursive: true });
  await writeFile(
    new URL('../results/region-v3-final-large-2026-09-29.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log('REGION_V3_FINAL_LARGE', JSON.stringify(report, null, 2));

  expect(total).toBe(REGION_V3_FINAL_LARGE_CRITERIA.totalQueries);
  expect(pass).toBeGreaterThanOrEqual(REGION_V3_FINAL_LARGE_CRITERIA.minimumOverallPass);
  expect(byLabel.closed.pass).toBeGreaterThanOrEqual(REGION_V3_FINAL_LARGE_CRITERIA.minimumPassByLabel.closed);
  expect(byLabel.open.pass).toBeGreaterThanOrEqual(REGION_V3_FINAL_LARGE_CRITERIA.minimumPassByLabel.open);
  expect(byLabel.ambiguous.pass).toBeGreaterThanOrEqual(REGION_V3_FINAL_LARGE_CRITERIA.minimumPassByLabel.ambiguous);
});
