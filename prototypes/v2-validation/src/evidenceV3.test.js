import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRealArtEvidenceV3 } from '../real-art/evidence-v3.js';

function image(width, height, value = 1) {
  return { width, height, luma: new Array(width * height).fill(value) };
}
function set(img, x, y, v) { img.luma[y * img.width + x] = v; }

test('V3 oriented continuation raises evidence across a short aligned gap', () => {
  const img = image(48, 48, 1);
  for (let x = 6; x <= 41; x += 1) if (x < 23 || x > 25) set(img, x, 24, 0.02);
  const b = buildRealArtEvidenceV3(img);
  assert.ok(b.grids.balanced.get(24, 24) > b.grids.conservative.get(24, 24));
  assert.ok(b.features.bridge[24 * 48 + 24] > 0.2);
});

test('V3 suppresses broad wash relative to a narrow ink line', () => {
  const img = image(48, 48, 1);
  for (let y = 12; y <= 35; y += 1) for (let x = 12; x <= 35; x += 1) set(img, x, y, 0.67);
  for (let y = 6; y <= 41; y += 1) set(img, 8, y, 0.02);
  const b = buildRealArtEvidenceV3(img);
  assert.ok(b.grids.balanced.get(8, 24) > b.grids.balanced.get(24, 24) + 0.2);
});

test('V3 source-frame policy does not turn crop edges into boundaries', () => {
  const img = image(48, 48, 1);
  for (let y = 0; y < 48; y += 1) set(img, 0, y, 0);
  const b = buildRealArtEvidenceV3(img);
  assert.equal(b.grids.permissive.get(0, 24), 0);
});
