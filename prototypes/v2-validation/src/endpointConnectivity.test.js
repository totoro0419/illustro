import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEndpointDescriptors, evaluateConnectivity, resolveStrokeConnectivity } from '../connectivity/endpoint-connectivity.js';

function line(id, x0, y0, x1, y1, width = 2, count = 11, extras = {}) {
  return {
    strokeId:id, width, ...extras,
    points:Array.from({length:count},(_,i)=>{
      const t=i/(count-1);
      return {x:x0+(x1-x0)*t,y:y0+(y1-y0)*t,width,pressure:0.6,timestamp:i*8};
    }),
  };
}
function curve(id, points, width = 2) {
  return {strokeId:id,width,points:points.map((p,i)=>({x:p[0],y:p[1],width,timestamp:i*8}))};
}
function connected(graph,a,b) {
  return graph.edges.some(edge=>{const ids=[edge.from.endpointId,edge.to.endpointId];return ids.includes(a)&&ids.includes(b);});
}
function candidate(graph,a,b) {
  return graph.candidates.find(row=>[row.endpointA,row.endpointB].includes(a)&&[row.endpointA,row.endpointB].includes(b));
}

test('endpoint descriptors preserve explicit identity and use a local shape, not one final segment',()=>{
  const jittered=curve('jitter',[[0,0],[3,0.1],[6,-0.1],[8,0.15],[9,-0.2],[10,0.1]],2);
  const {endpoints}=buildEndpointDescriptors([jittered]);
  const end=endpoints.find(endpoint=>endpoint.endpointId==='jitter:end');
  assert.equal(end.strokeId,'jitter'); assert.equal(end.end,'end'); assert.ok(end.trace.length>=5); assert.ok(end.localArcLength>0);
  assert.ok(end.tangent.x>0.9,`expected robust rightward tangent, got ${JSON.stringify(end.tangent)}`);
  assert.ok(Number.isFinite(end.localCurvature)); assert.ok(Number.isFinite(end.jitterNormalized));
});

test('contact: touching round-cap endpoints connect and are classified as contact',()=>{
  const graph=resolveStrokeConnectivity([line('a',0,0,10,0),line('b',10,0,20,0)]);
  assert.ok(connected(graph,'a:end','b:start'));
  const row=candidate(graph,'a:end','b:start'); assert.equal(row.connectionModel,'contact'); assert.ok(row.effectiveGap<=0);
});

test('continuation: a small positive normalized gap connects collinear endpoints',()=>{
  const graph=resolveStrokeConnectivity([line('a',0,0,10,0,1),line('b',11.6,0,22,0,1)]);
  const row=candidate(graph,'a:end','b:start'); assert.ok(row); assert.ok(row.effectiveGap>0); assert.equal(row.connectionModel,'continuation');
  assert.ok(connected(graph,'a:end','b:start'),JSON.stringify(row,null,2));
});

test('corner: 45 degree endpoint geometry can connect without an angle-equality rule',()=>{
  const graph=resolveStrokeConnectivity([line('a',0,0,10,0,1),line('b',11.2,0.6,18,7.4,1)]);
  const row=candidate(graph,'a:end','b:start'); assert.ok(row); assert.ok(['continuation','corner'].includes(row.connectionModel));
  assert.ok(connected(graph,'a:end','b:start'),JSON.stringify(row,null,2));
});

test('corner: 90 degree endpoint geometry can connect',()=>{
  const graph=resolveStrokeConnectivity([line('a',0,0,10,0,1),line('b',11.4,1.4,11.4,11,1)]);
  const row=candidate(graph,'a:end','b:start'); assert.equal(row.connectionModel,'corner');
  assert.ok(connected(graph,'a:end','b:start'),JSON.stringify(row,null,2));
});

test('curved endpoints use local tangent geometry and can connect',()=>{
  const a=curve('a',[[0,4],[3,4],[6,3.7],[8,3],[9.5,2]],1.5);
  const b=curve('b',[[11,1],[12,0.2],[14,-0.4],[17,-0.5]],1.5);
  const graph=resolveStrokeConnectivity([a,b]); const row=candidate(graph,'a:end','b:start');
  assert.ok(row); assert.ok(row.confidence>0.55,`unexpectedly weak curve candidate: ${row.confidence}`);
});

test('cap / closure: parallel boundaries with aligned terminals connect geometrically',()=>{
  const graph=resolveStrokeConnectivity([line('upper',0,0,20,0,2),line('lower',0,6,20,6,2)]);
  const row=candidate(graph,'upper:end','lower:end'); assert.ok(row); assert.equal(row.connectionModel,'cap');
  assert.ok(row.modelScores.find(model=>model.model==='cap').diagnostics.spacingStability>0.9);
  assert.ok(connected(graph,'upper:end','lower:end'),JSON.stringify(row,null,2));
});

test('width normalization: the same center gap is weak for a hairline and contact for a thick stroke',()=>{
  const thin=resolveStrokeConnectivity([line('a',0,0,10,0,1),line('b',14,0,24,0,1)]);
  const thick=resolveStrokeConnectivity([line('a',0,0,10,0,10),line('b',14,0,24,0,10)]);
  const thinRow=candidate(thin,'a:end','b:start'), thickRow=candidate(thick,'a:end','b:start');
  assert.ok(thinRow); assert.ok(thickRow); assert.ok(thinRow.normalizedGap>thickRow.normalizedGap);
  assert.equal(connected(thin,'a:end','b:start'),false); assert.equal(connected(thick,'a:end','b:start'),true);
});

test('near but geometrically nonconnecting endpoints are not auto-joined',()=>{
  const graph=resolveStrokeConnectivity([line('a',0,0,10,0,1),line('b',11.5,0.8,21.5,0.8,1)]);
  assert.equal(connected(graph,'a:end','b:end'),false);
});

test('dense competing continuation candidates are withheld rather than independently thresholded',()=>{
  const graph=resolveStrokeConnectivity([
    line('a',0,0,10,0,1),
    line('b',11.7,-0.28,22,-0.28,1),
    line('c',11.7,0.28,22,0.28,1),
  ]);
  const ab=candidate(graph,'a:end','b:start'), ac=candidate(graph,'a:end','c:start');
  assert.ok(ab&&ac); assert.ok(ab.confidence>=0.7&&ac.confidence>=0.7);
  assert.equal(connected(graph,'a:end','b:start'),false); assert.equal(connected(graph,'a:end','c:start'),false);
  assert.ok([ab.decisionReason,ac.decisionReason].includes('competition-ambiguous'));
});

test('contact junctions allow more than one connection at an endpoint',()=>{
  const graph=resolveStrokeConnectivity([line('left',0,0,10,0,2),line('right',10,0,20,0,2),line('down',10,0,10,10,2)]);
  const touching=graph.edges.filter(edge=>[edge.from.endpointId,edge.to.endpointId].some(id=>id==='left:end'));
  assert.ok(touching.length>=2,`expected junction-compatible contact edges, got ${JSON.stringify(graph.edges)}`);
});

test('T-junction and crossing do not invent endpoint-endpoint links when only a segment interior is nearby',()=>{
  const tee=resolveStrokeConnectivity([line('bar',0,0,30,0,1),line('stem',15,1.2,15,12,1)]);
  assert.equal(tee.edges.length,0); assert.deepEqual(tee.supportsTargetKinds,['endpoint','segment']);
  const crossing=resolveStrokeConnectivity([line('h',0,0,30,0,1),line('v',15,-15,15,15,1)]);
  assert.equal(crossing.edges.length,0);
});

test('finger-like terminal jitter does not destroy a clear continuation',()=>{
  const a=curve('a',[[0,0],[3,0.2],[6,-0.15],[8,0.25],[9.2,-0.18],[10,0.1]],3);
  const b=curve('b',[[11.9,-0.05],[13,0.18],[15,-0.2],[18,0.1],[22,0]],3);
  const graph=resolveStrokeConnectivity([a,b]); assert.ok(connected(graph,'a:end','b:start'));
});

test('manual connect/disconnect overrides are retained in diagnostics for future correction UI',()=>{
  const strokes=[line('a',0,0,10,0,1),line('b',30,0,40,0,1)];
  const forced=resolveStrokeConnectivity(strokes,{candidateWidthMultiplier:40,manualConnections:[['a:end','b:start']]});
  assert.ok(connected(forced,'a:end','b:start')); assert.equal(candidate(forced,'a:end','b:start').decisionReason,'manual-connect');
  const touching=[line('c',0,0,10,0,2),line('d',10,0,20,0,2)];
  const cut=resolveStrokeConnectivity(touching,{manualDisconnections:[['c:end','d:start']]});
  assert.equal(connected(cut,'c:end','d:start'),false); assert.equal(candidate(cut,'c:end','d:start').decisionReason,'manual-disconnect');
});

test('evaluation reports precision, recall, F1, exact graph match, model stats, and calibration',()=>{
  const graph=resolveStrokeConnectivity([line('a',0,0,10,0,2),line('b',10,0,20,0,2),line('c',40,0,50,0,2)]);
  const metrics=evaluateConnectivity(graph,[['a:end','b:start']]);
  assert.equal(metrics.trueConnection,1); assert.equal(metrics.falseConnection,0); assert.equal(metrics.missedConnection,0);
  assert.equal(metrics.precision,1); assert.equal(metrics.recall,1); assert.equal(metrics.f1,1); assert.equal(metrics.graphExactMatch,true);
  assert.ok(Number.isFinite(metrics.confidenceCalibration.brier)); assert.ok(Object.keys(metrics.modelStats).length>=1); assert.ok(Object.keys(metrics.conditionStats).length>=1);
});
