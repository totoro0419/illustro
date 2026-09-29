import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { REGION_FINAL_LARGE_2_CANDIDATES } from './final-large2-candidates.js';

async function fetchJson(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'Illustro-Validation/1.0' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('fetch ' + response.status + ' ' + url);
  return response.json();
}

async function visualFingerprint(page, bytes, contentType) {
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

test('second large final candidate sources are public-domain, readable, and visually fingerprinted', async ({ page }) => {
  test.setTimeout(120000);
  const resultsDir = new URL('../results/', import.meta.url);
  await mkdir(resultsDir, { recursive: true });

  const report = [];
  for (const item of REGION_FINAL_LARGE_2_CANDIDATES) {
    const apiUrl = 'https://collectionapi.metmuseum.org/public/collection/v1/objects/' + item.objectId;
    const object = await fetchJson(apiUrl);
    expect(object.objectID).toBe(item.objectId);
    expect(object.isPublicDomain).toBe(true);
    const imageUrl = object.primaryImageSmall || object.primaryImage;
    expect(typeof imageUrl).toBe('string');
    expect(imageUrl.length).toBeGreaterThan(0);

    let lastError;
    let bytes, contentType;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await fetch(imageUrl, {
          redirect: 'follow',
          headers: { 'user-agent': 'Illustro-Validation/1.0' },
          signal: AbortSignal.timeout(15_000),
        });
        expect(response.ok).toBe(true);
        contentType = response.headers.get('content-type') || 'image/jpeg';
        expect(contentType.startsWith('image/')).toBe(true);
        bytes = Buffer.from(await response.arrayBuffer());
        expect(bytes.length).toBeGreaterThan(1000);
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
    if (!bytes) throw lastError;

    const fingerprint = await visualFingerprint(page, bytes, contentType);
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    await writeFile(new URL('final-large2-source-' + item.objectId + '.' + ext, resultsDir), bytes);
    report.push({
      ...item,
      sourcePage: object.objectURL,
      primaryImage: imageUrl,
      isPublicDomain: object.isPublicDomain,
      bytes: bytes.length,
      contentType,
      fingerprint,
    });
  }

  await writeFile(
    new URL('region-final-large2-source-report.json', resultsDir),
    JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2) + '\n',
  );
  console.log('REGION_FINAL_LARGE_2_SOURCES', JSON.stringify(report, null, 2));
});
