import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { REGION_FINAL_LARGE_CANDIDATES } from './final-large-candidates.js';

async function fetchJson(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'Illustro-Validation/1.0' },
  });
  if (!response.ok) throw new Error('fetch ' + response.status + ' ' + url);
  return response.json();
}

test('large final candidate sources are public-domain and image-readable', async () => {
  test.setTimeout(120000);
  const resultsDir = new URL('../results/', import.meta.url);
  await mkdir(resultsDir, { recursive: true });

  const report = [];
  for (const item of REGION_FINAL_LARGE_CANDIDATES) {
    const apiUrl = 'https://collectionapi.metmuseum.org/public/collection/v1/objects/' + item.objectId;
    const object = await fetchJson(apiUrl);
    expect(object.objectID).toBe(item.objectId);
    expect(object.isPublicDomain).toBe(true);
    const imageUrl = object.primaryImageSmall || object.primaryImage;
    expect(typeof imageUrl).toBe('string');
    expect(imageUrl.length).toBeGreaterThan(0);

    const response = await fetch(imageUrl, {
      redirect: 'follow',
      headers: { 'user-agent': 'Illustro-Validation/1.0' },
    });
    expect(response.ok).toBe(true);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    expect(contentType.startsWith('image/')).toBe(true);
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(1000);

    const ext = contentType.includes('png') ? 'png' : 'jpg';
    await writeFile(new URL('final-large-source-' + item.objectId + '.' + ext, resultsDir), bytes);
    report.push({
      ...item,
      sourcePage: object.objectURL,
      primaryImage: imageUrl,
      isPublicDomain: object.isPublicDomain,
      bytes: bytes.length,
      contentType,
    });
  }

  await writeFile(
    new URL('region-final-large-source-report.json', resultsDir),
    JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2) + '\n',
  );
  console.log('REGION_FINAL_LARGE_SOURCES', JSON.stringify(report, null, 2));
});
