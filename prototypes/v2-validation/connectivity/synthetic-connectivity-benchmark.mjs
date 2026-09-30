import { fileURLToPath } from 'node:url';
import { evaluateConnectivity, resolveStrokeConnectivity } from './endpoint-connectivity.js';

function line(id, x0, y0, x1, y1, width = 2, count = 13, jitter = 0) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  return {
    strokeId: id,
    width,
    points: Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1);
      const wave = jitter ? Math.sin(i * 1.7) * jitter * (0.25 + 0.75 * t) : 0;
      return {
        x: x0 + dx * t + nx * wave,
        y: y0 + dy * t + ny * wave,
        width,
        pressure: 0.55 + 0.1 * Math.sin(i),
        timestamp: i * 7,
      };
    }),
  };
}

function cornerScene(name, degrees, width = 1, normalizedGap = 0.8) {
  const theta = degrees * Math.PI / 180;
  const p = { x: 30, y: 20 };
  const d1 = { x: 1, y: 0 };
  const d2 = { x: Math.cos(theta), y: Math.sin(theta) };
  const gRaw = { x: d1.x + d2.x, y: d1.y + d2.y };
  const gl = Math.hypot(gRaw.x, gRaw.y);
  const g = { x: gRaw.x / gl, y: gRaw.y / gl };
  const centerDistance = width + normalizedGap * width;
  const q = { x: p.x + g.x * centerDistance, y: p.y + g.y * centerDistance };
  return {
    name,
    category: `corner-${degrees}`,
    strokes: [
      line('a', 5, 20, p.x, p.y, width),
      line('b', q.x, q.y, q.x + d2.x * 25, q.y + d2.y * 25, width),
    ],
    truth: [['a:end', 'b:start']],
  };
}

function continuationScene(name, width, normalizedGap, jitter = 0) {
  const centerGap = width + normalizedGap * width;
  return {
    name,
    category: jitter ? 'jittered-continuation' : 'continuation',
    strokes: [
      line('a', 0, 0, 24, 0, width, 13, jitter),
      line('b', 24 + centerGap, 0, 48 + centerGap, 0, width, 13, jitter),
    ],
    truth: [['a:end', 'b:start']],
  };
}

function contactScene(name, width) {
  return {
    name,
    category: 'contact',
    strokes: [line('a', 0, 0, 20, 0, width), line('b', 20, 0, 40, 0, width)],
    truth: [['a:end', 'b:start']],
  };
}

function capScene(name, width, separation, jitter = 0) {
  return {
    name,
    category: 'cap',
    strokes: [
      line('upper', 0, 0, 32, 0, width, 15, jitter),
      line('lower', 10, separation, 32, separation, width, 13, jitter),
    ],
    truth: [['upper:end', 'lower:end']],
  };
}

export function buildSyntheticScenes() {
  const scenes = [];
  for (const width of [1, 2, 6]) scenes.push(contactScene(`contact-w${width}`, width));
  for (const gap of [0.25, 0.7, 1.2]) scenes.push(continuationScene(`continuation-gap${gap}`, 2, gap));
  scenes.push(continuationScene('continuation-thin-fast-jitter', 1.2, 0.55, 0.18));
  scenes.push(continuationScene('continuation-thick-jitter', 7, 0.7, 0.8));
  for (const degrees of [45, 90, 120]) scenes.push(cornerScene(`corner-${degrees}`, degrees, 1.5, 0.65));
  scenes.push(capScene('cap-thin', 1.5, 4.2));
  scenes.push(capScene('cap-medium', 2.5, 7));
  scenes.push(capScene('cap-jittered', 3, 8, 0.22));
  scenes.push({
    name:'slender-closed-strip', category:'slender-closure',
    strokes:[line('upper',0,0,40,0,2),line('lower',0,6,40,6,2)],
    truth:[['upper:start','lower:start'],['upper:end','lower:end']],
  });
  scenes.push({
    name:'dense-many-endpoints', category:'competition-many',
    strokes:[
      line('a',0,0,20,0,0.8),
      ...Array.from({length:8},(_,i)=>{
        const angle=i*Math.PI/4;
        const cx=20+Math.cos(angle)*3.5, cy=Math.sin(angle)*3.5;
        return line(`d${i}`,cx,cy,cx+Math.cos(angle)*18,cy+Math.sin(angle)*18,0.8);
      }),
    ],
    truth:[],
  });
  scenes.push({ name:'far-disconnected', category:'negative-far', strokes:[line('a',0,0,15,0,1),line('b',35,0,50,0,1)], truth:[] });
  scenes.push({ name:'near-back-facing', category:'negative-near', strokes:[line('a',0,0,15,0,1),line('b',18,1,30,1,1)], truth:[] });
  scenes.push({ name:'parallel-staggered-open', category:'negative-parallel', strokes:[line('a',0,0,30,0,1.5),line('b',18,5,42,5,1.5)], truth:[] });
  scenes.push({ name:'t-junction-endpoint-to-segment-not-yet-resolved', category:'t-junction', strokes:[line('bar',0,0,40,0,1.5),line('stem',20,1.4,20,18,1.5)], truth:[] });
  scenes.push({ name:'crossing-no-endpoint-pair', category:'crossing', strokes:[line('h',0,0,40,0,1.5),line('v',20,-18,20,18,1.5)], truth:[] });
  scenes.push({
    name:'dense-equal-competition', category:'competition',
    strokes:[line('a',0,0,20,0,1),line('b',21.7,-0.8,42,-5.5,1),line('c',21.7,0.8,42,5.5,1)],
    truth:[],
  });
  scenes.push({ name:'thick-small-gap', category:'width-normalization', strokes:[line('a',0,0,20,0,12),line('b',25,0,45,0,12)], truth:[['a:end','b:start']] });
  scenes.push({ name:'thin-same-center-gap', category:'width-normalization-negative', strokes:[line('a',0,0,20,0,1),line('b',25,0,45,0,1)], truth:[] });
  return scenes;
}

export function runSyntheticBenchmark() {
  const scenes = buildSyntheticScenes();
  let tp = 0, fp = 0, fn = 0, exact = 0;
  const category = {}, rows = [];
  for (const scene of scenes) {
    const graph = resolveStrokeConnectivity(scene.strokes);
    const metrics = evaluateConnectivity(graph, scene.truth);
    tp += metrics.trueConnection; fp += metrics.falseConnection; fn += metrics.missedConnection;
    exact += metrics.graphExactMatch ? 1 : 0;
    category[scene.category] ??= { scenes:0, exact:0, tp:0, fp:0, fn:0 };
    const c = category[scene.category];
    c.scenes += 1; c.exact += metrics.graphExactMatch ? 1 : 0; c.tp += metrics.trueConnection; c.fp += metrics.falseConnection; c.fn += metrics.missedConnection;
    rows.push({
      name:scene.name, category:scene.category, truth:scene.truth.length, predicted:graph.edges.length,
      tp:metrics.trueConnection, fp:metrics.falseConnection, fn:metrics.missedConnection, exact:metrics.graphExactMatch,
      edges:graph.edges.map(edge=>({pair:[edge.from.endpointId,edge.to.endpointId],model:edge.model,confidence:edge.confidence})),
    });
  }
  const precision = tp + fp ? tp / (tp + fp) : 1;
  const recall = tp + fn ? tp / (tp + fn) : 1;
  const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
  return {
    schema:'illustro.stroke-connectivity-synthetic-benchmark.v1',
    sceneCount:scenes.length,
    trueConnection:tp,
    falseConnection:fp,
    missedConnection:fn,
    precision,
    recall,
    f1,
    graphExactMatchRate:exact / scenes.length,
    category,
    scenes:rows,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(runSyntheticBenchmark(), null, 2));
}
