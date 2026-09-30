import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runSyntheticBenchmark } from '../connectivity/synthetic-connectivity-benchmark.mjs';

test('Stroke-native endpoint connectivity synthetic corpus has no false or missed connection regressions', () => {
  const result = runSyntheticBenchmark();
  assert.equal(result.sceneCount, 22);
  assert.equal(result.falseConnection, 0, JSON.stringify(result.scenes.filter(scene => scene.fp), null, 2));
  assert.equal(result.missedConnection, 0, JSON.stringify(result.scenes.filter(scene => scene.fn), null, 2));
  assert.equal(result.precision, 1);
  assert.equal(result.recall, 1);
  assert.equal(result.f1, 1);
  assert.equal(result.graphExactMatchRate, 1);
  const payload = {
    ...result,
    generatedAt: new Date().toISOString(),
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    note: 'Synthetic geometry only; this is not a human-input accuracy claim.',
  };
  fs.mkdirSync(new URL('../results/', import.meta.url), { recursive: true });
  fs.writeFileSync(new URL('../results/endpoint-connectivity-synthetic.json', import.meta.url), `${JSON.stringify(payload, null, 2)}\n`);
});
