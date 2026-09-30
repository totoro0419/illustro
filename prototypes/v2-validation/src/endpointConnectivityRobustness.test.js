import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveStrokeConnectivity, evaluateConnectivity, normalizeStroke, buildEndpointDescriptors, scoreEndpointPair } from '../connectivity/endpoint-connectivity.js';

const line=(strokeId,x0,y0,x1,y1,width=1,cap='round')=>({strokeId,width,cap,points:Array.from({length:11},(_,i)=>({x:x0+(x1-x0)*i/10,y:y0+(y1-y0)*i/10,width}))});
const pair=(g,a,b)=>g.candidates.find(c=>[c.endpointA,c.endpointB].includes(a)&&[c.endpointA,c.endpointB].includes(b));

test('tapered endpoint uses terminal width, not the wide local median for contact',()=>{
  const a=line('a',0,0,20,0,10); a.points.at(-1).width=1;
  const g=resolveStrokeConnectivity([a,line('b',25,0,45,0)]);
  assert.equal(g.endpoints.find(e=>e.endpointId==='a:end').width,1);
  assert.equal(pair(g,'a:end','b:start').connected,false);
});

test('nonoverlapping high score ties cannot become multiway contact junctions',()=>{
  const g=resolveStrokeConnectivity([line('a',0,0,20,0),line('b',21.03,-.1,40,-.1),line('c',21.03,.1,40,.1)]);
  for(const b of ['b:start','c:start']){
    const c=pair(g,'a:end',b);assert.ok(c.confidence>.9);assert.ok(c.effectiveGap>0);
    assert.equal(c.connected,false);assert.equal(c.decisionReason,'competition-ambiguous');
  }
});

test('manual far connections are candidates without expanding automatic search',()=>{
  const g=resolveStrokeConnectivity([line('a',0,0,10,0),line('b',30,0,40,0)],{manualConnections:[['a:end','b:start']]});
  assert.equal(g.edges.length,1);assert.equal(pair(g,'a:end','b:start').decisionReason,'manual-connect');
});

test('candidate generation misses appear in calibration and stratified FN counts',()=>{
  const g=resolveStrokeConnectivity([line('a',0,0,10,0),line('b',30,0,40,0)]);
  const m=evaluateConnectivity(g,[['a:end','b:start']]);
  assert.equal(m.missedConnection,1);assert.equal(m.candidateGenerationMisses,1);
  assert.equal(m.modelStats['not-generated'].fn,1);
  assert.equal(m.confidenceCalibration.candidateOnlyBrier,null);
  assert.equal(m.confidenceCalibration.brier,1);
});

test('unknown pressure remains null and degenerate positions are not fabricated',()=>{
  const s=normalizeStroke({strokeId:'dot',width:2,points:[{x:7,y:8,pressure:null,timestamp:null}]});
  assert.equal(s.points.length,1);assert.equal(s.points[0].x,7);assert.equal(s.points[0].pressure,null);assert.equal(s.points[0].timestamp,null);
});

test('duplicate and reserved-delimiter IDs, invalid overrides and labels fail explicitly',()=>{
  assert.throws(()=>resolveStrokeConnectivity([line('a',0,0,10,0),line('a',20,0,30,0)]),/duplicate/);
  assert.throws(()=>resolveStrokeConnectivity([line('a|b',0,0,10,0)]),/strokeId/);
  assert.throws(()=>resolveStrokeConnectivity([line('a',0,0,10,0)],{manualConnections:[['a:end','missing:start']]}),/endpoint/);
  assert.throws(()=>evaluateConnectivity(resolveStrokeConnectivity([line('a',0,0,10,0)]),[['a:end','missing:start']]),/endpoint/);
});

test('square and butt cap projections cannot substitute for actual footprint contact',()=>{
  for(const cap of ['square','butt']) {
    const a=line('a',-10,0,0,0,2,cap), b=cap==='square'?line('b',-7.9,.9,2.1,.9,2,cap):line('b',.1,.5,10,.5,2,cap);
    const endpoints=buildEndpointDescriptors([a,b]).endpoints;
    const c=scoreEndpointPair(endpoints[1],endpoints[cap==='square'?3:2]);
    assert.ok(c.supportGap<0);assert.ok(c.effectiveGap>0);assert.equal(c.footprintOverlap,false);
  }
});

test('a synthetic gap bridge crossing a third stroke is withheld with a segment diagnostic',()=>{
  const strokes=[line('a',0,0,20,0),line('b',22,0,42,0),line('bar',21,-15,21,15)];
  const g=resolveStrokeConnectivity(strokes,{endpointToSegment:false});
  const c=pair(g,'a:end','b:start');assert.ok(c.confidence>.7);
  assert.equal(c.connected,false);assert.equal(c.decisionReason,'graph-conflict');
  assert.equal(c.graphConflicts[0].kind,'segment-crossing');
  const full=resolveStrokeConnectivity(strokes);
  assert.equal(pair(full,'a:end','b:start').connected,false);
  assert.equal(pair(full,'a:end','b:start').decisionReason,'competition-ambiguous');
  assert.equal(full.edges.filter(e=>e.to.kind==='segment').length,2);
});

test('rotation, translation, scale, stroke order and sample reversal preserve endpoint graph topology',()=>{
  const strokes=[line('a',0,0,20,0),line('b',22,0,42,0)];
  for(const scale of [.1,1,17]) for(const angle of [0,.4,1.7,3.1]) {
    const transformed=strokes.map(s=>({...s,width:s.width*scale,points:s.points.map(p=>({x:500+scale*(p.x*Math.cos(angle)-p.y*Math.sin(angle)),y:-200+scale*(p.x*Math.sin(angle)+p.y*Math.cos(angle)),width:p.width*scale}))}));
    for(const reverseOrder of [false,true]) for(const reversePoints of [false,true]) {
      const input=(reverseOrder?[...transformed].reverse():transformed).map(s=>({...s,points:reversePoints?[...s.points].reverse():s.points}));
      const g=resolveStrokeConnectivity(input);
      assert.equal(g.edges.length,1);
      assert.equal(pair(g,reversePoints?'a:start':'a:end',reversePoints?'b:end':'b:start').connected,true);
    }
  }
});
