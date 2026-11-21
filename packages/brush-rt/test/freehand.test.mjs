import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createPreset, referenceBrushes} from '../dist/rt/foundation.mjs';
import {CanonicalBuilder, validateRecord} from '../dist/rt/model.mjs';

const point = (x, y, t, pressure = .7) => ({x, y, t, pressure, pointerType: 'pen'});
const tremor = i => i ? 1.7 * Math.sin(i * 1.28) + .8 * Math.cos(i * 2.52) : 0;
const slowLine = Array.from({length: 160}, (_, i) =>
  point(60 + i * 1.15, 120 + tremor(i), i * 8 + 2 * Math.sin(i)));
const slowArc = Array.from({length: 155}, (_, i) => {
  const angle = i * .013, radius = 160 + tremor(i);
  return point(200 + radius * Math.cos(angle), 200 + radius * Math.sin(angle), i * 8 + 2 * Math.sin(i));
});
const fastCircle = Array.from({length: 19}, (_, i) => {
  const angle = i * Math.PI / 9;
  return point(170 + 96 * Math.cos(angle), 170 + 96 * Math.sin(angle), i * 17 + 3 * Math.sin(i));
});
const sY = x => 120 + 35 * Math.sin((x - 40) * Math.PI / 132);
const fastS = Array.from({length: 19}, (_, i) => {
  const x = 40 + i * 16;
  return point(x, sY(x), i * 10 + 2 * Math.sin(i));
});

function build(samples, strength, scale = 1, preset = createPreset('test-freehand', 'Test freehand')) {
  const brush = structuredClone(preset);
  Object.assign(brush.stabilization, {constant: strength, fast: 0});
  const context = scale === null ? {} : {freehandStabilizationScale: scale};
  const builder = new CanonicalBuilder(brush, [1, 2], 0, context);
  for (const sample of samples) builder.accept(sample);
  builder.finish();
  return builder.record();
}

// Integrate over equal amounts of traveled distance so extra subdivisions
// don't dilute the error in a sparse part of the stroke.
function rmsError(record, deviation) {
  let squared = 0, distance = 0;
  for (const command of record.commands) {
    const dx = command[0] - command[16], dy = command[1] - command[17];
    const length = Math.hypot(dx, dy);
    for (let i = 0; i < 8; i++) {
      const t = (i + .5) / 8;
      squared += deviation(command[16] + t * dx, command[17] + t * dy) ** 2 * length / 8;
    }
    distance += length;
  }
  return Math.sqrt(squared / distance);
}

test('slow freehand damps tremor more strongly as the setting rises', () => {
  for (const [samples, deviation] of [
    [slowLine, (_x, y) => y - 120],
    [slowArc, (x, y) => Math.hypot(x - 200, y - 200) - 160],
  ]) {
    const off = build(samples, 0);
    assert.deepEqual(off.commands, build(samples, 0, null).commands);
    assert.deepEqual(off.geometry.map(({x, y}) => [x, y]), samples.map(({x, y}) => [x, y]));
    const low = rmsError(build(samples, .25), deviation);
    const medium = rmsError(build(samples, .5), deviation);
    const high = rmsError(build(samples, 1), deviation);
    assert.ok(low < rmsError(off, deviation));
    assert.ok(high < medium && medium < low, `${high} < ${medium} < ${low}`);
    assert.ok(high < rmsError(build(samples, 1, null), deviation) * .7);
  }
});

test('sparse fast circles and S-curves get closer to their intended shape', () => {
  for (const [samples, deviation] of [
    [fastCircle, (x, y) => Math.hypot(x - 170, y - 170) - 96],
    [fastS, (x, y) => y - sY(x)],
  ]) {
    for (const strength of [.25, 1]) {
      const before = build(samples, strength, null), after = build(samples, strength);
      assert.ok(rmsError(after, deviation) < rmsError(before, deviation) * .6);
      assert.ok(after.commands.length > samples.length);
      assert.ok(after.commands.length <= samples.length * 12);
      assert.deepEqual([after.geometry[0].x, after.geometry[0].y], [samples[0].x, samples[0].y]);
      assert.ok(Math.hypot(after.geometry.at(-1).x - samples.at(-1).x, after.geometry.at(-1).y - samples.at(-1).y) < 1);
    }
  }
});

test('fast and slow intentional corners retain their apex and outgoing heading', () => {
  for (const [step, dt] of [[18, 14], [1, 12]]) {
    const samples = Array.from({length: 41}, (_, i) => i <= 20
      ? point(80 + i * step, 80, i * dt)
      : point(80 + (20 - .36 * (i - 20)) * step, 80 + .9 * (i - 20) * step, i * dt));
    const {geometry, commands} = build(samples, 1);
    const apex = geometry[20], next = geometry[21];
    assert.ok(Math.hypot(apex.x - samples[20].x, apex.y - samples[20].y) < .5);
    assert.equal(next.x, samples[21].x);
    assert.equal(next.y, samples[21].y);
    assert.ok(commands.every(c => c[0] <= samples[20].x + .5));
  }
});

test('irregular input and abrupt speed changes stay bounded at different zoom levels', () => {
  const samples = Array.from({length: 60}, (_, i) => point(
    i < 25 ? i * .8 : i < 42 ? 20 + (i - 25) * 17 : 309 + (i - 42) * .7, tremor(i),
    i * 10 + [0, 10, 0, -3][i % 4]));
  const scaled = scale => samples.map(s => ({...s, x: s.x / scale, y: s.y / scale}));
  const reference = build(samples, 1);
  for (const scale of [.12, 1, 8]) {
    const record = build(scaled(scale), 1, scale);
    for (const [i, q] of record.geometry.entries()) {
      assert.ok(Math.hypot(q.x * scale - samples[i].x, q.y * scale - samples[i].y) <= 9.0001);
      assert.ok(Math.hypot(q.x * scale - reference.geometry[i].x, q.y * scale - reference.geometry[i].y) < 1e-7);
      if (i > 26 && i < 42) assert.ok(q.x * scale > record.geometry[i - 1].x * scale);
    }
  }
});

test('live commands and final replay share their path with pressure, textures, sprays and erasers', () => {
  const samples = fastCircle.map((p, i) => ({...p, pressure: .1 + .9 * i / (fastCircle.length - 1)}));
  const brushes = [...referenceBrushes, createPreset('test-airbrush', 'Test airbrush', {
    renderer: 'soft', paint: 'build-up', size: 400, tip: {hardness: .06}, spacing: {exposureMs: 12},
  })];
  for (const source of brushes) {
    const brush = structuredClone(source);
    Object.assign(brush.stabilization, {scope: 'common', constant: 0});
    const context = {freehandStabilizationScale: 1, forceFadeGeometry: 'adaptive-v1',
      commonStabilization: {constant: .8, fast: 0, speedMode: 'increase', post: 0}};
    const builder = new CanonicalBuilder(brush, [1, 2], 0, context);
    const live = [];
    for (const sample of samples) {
      builder.accept(sample);
      live.push(...builder.ready().map(c => Array.from(c)));
    }
    const beforeRelease = builder.geometry.at(-1);
    // The contact reported by pointer-up can jump and has zero pressure.
    builder.release(point(400, 400, samples.at(-1).t + 10, 0));
    live.push(...builder.finish().map(c => Array.from(c)));
    const record = builder.record();
    assert.equal(record.smoothing, 'adaptive-freehand-1');
    assert.equal(record.geometry.at(-1), beforeRelease);
    assert.deepEqual(record.geometry.map(p => p.p), build(samples, 0, null, brush).geometry.map(p => p.p));
    assert.deepEqual(validateRecord(JSON.parse(JSON.stringify(record))), record);
    if (brush.forceFade.enabled) {
      // Force Fade adds width samples on release, on the same centerline.
      for (const c of record.commands) {
        const a = live.findLast(sample => sample[21] <= c[21]) ?? live[0];
        const b = live.find(sample => sample[21] >= c[21]) ?? live.at(-1);
        const f = a === b ? 0 : (c[21] - a[21]) / (b[21] - a[21]);
        assert.ok(Math.hypot(c[0] - a[0] - f * (b[0] - a[0]), c[1] - a[1] - f * (b[1] - a[1])) < 1e-7);
      }
    } else assert.deepEqual(live, record.commands, source.id);
  }
});

test('old records retain their versions and shapes; version mismatches are rejected', () => {
  const old = build(slowLine, 1, null), adaptive = build(slowLine, 1);
  assert.equal(old.smoothing, 'local-regression-adaptive-48ms-bounded-2');
  assert.deepEqual(validateRecord(JSON.parse(JSON.stringify(old))), old);
  assert.throws(() => validateRecord({...adaptive, smoothing: old.smoothing}), /unsupported foundation record/);
  assert.throws(() => validateRecord({...old, context: adaptive.context}), /unsupported foundation record/);
});
