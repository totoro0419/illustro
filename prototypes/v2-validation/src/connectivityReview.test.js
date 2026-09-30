import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEndpointDescriptors, connectionGeometry, resolveStrokeConnectivity } from '../connectivity/endpoint-connectivity.js';
import { buildReviewDisplay, recordReview } from '../connectivity/review-display.js';
import { evaluateRecords } from '../connectivity/evaluate-connectivity-records.mjs';
const stroke=(strokeId,xy,width=1)=>({strokeId,width,points:xy.map(([x,y])=>({x,y,width}))});
const line=(id,a,b,w=1)=>stroke(id,Array.from({length:11},(_,i)=>[a[0]+(b[0]-a[0])*i/10,a[1]+(b[1]-a[1])*i/10]),w);
function descriptors(strokes,a,b){const d=buildEndpointDescriptors(strokes);return {d,a:d.endpoints.find(e=>e.endpointId===a),b:d.endpoints.find(e=>e.endpointId===b)};}
test('one-sided extension meets actual terminal ink and uses that intersection',()=>{
 const {d,a,b}=descriptors([line('a',[-10,0],[-1,0]),line('b',[0,-10],[0,1])],'a:end','b:end');
 const g=connectionGeometry(a,b,d.strokes);assert.equal(g.kind,'one-sided-extension');assert.deepEqual(g.point,{x:0,y:0});assert.deepEqual(g.path,[{x:-1,y:0},{x:0,y:0}]);assert.equal(g.sourceEndpoint,'a:end');assert.ok(g.target.arcFraction>0&&g.target.arcFraction<1);
});
test('two hypothetical extensions must use a direct endpoint link instead of their intersection',()=>{
 const {d,a,b}=descriptors([line('a',[-10,0],[-1,0]),line('b',[0,-10],[0,-1])],'a:end','b:end');
 const g=connectionGeometry(a,b,d.strokes);assert.equal(g.kind,'direct-endpoint-link');assert.equal(g.point,null);assert.deepEqual(g.path,[a.position,b.position]);
});
test('collinear continuation attaches at the nearest actual endpoint rather than an invented midpoint',()=>{
 const {d,a,b}=descriptors([line('a',[-10,0],[-1,0]),line('b',[0,0],[10,0])],'a:end','b:start');const g=connectionGeometry(a,b,d.strokes);assert.equal(g.kind,'one-sided-extension');assert.deepEqual(g.point,{x:0,y:0});assert.equal(g.target.arcFraction,0);
});
test('a curved target uses original segments and rejects a distant body intersection',()=>{
 const strokes=[line('a',[-10,0],[-1,0]),stroke('b',[[0,-10],[0,-4],[.4,-2],[.4,1]])];
 const {d,a,b}=descriptors(strokes,'a:end','b:end');const g=connectionGeometry(a,b,d.strokes);assert.equal(g.kind,'one-sided-extension');assert.ok(Math.abs(g.point.x-.4)<1e-9);assert.ok(Math.abs(g.point.y)<1e-9);
 const far=descriptors([line('a',[-10,0],[-1,0],.1),stroke('b',[[20,-10],[20,0],[20,10],[0,-10],[0,-5],[0,-1]],.1)],'a:end','b:end');assert.equal(connectionGeometry(far.a,far.b,far.d.strokes).kind,'direct-endpoint-link');
});
test('join geometry is invariant under pair order, input order, rotation and scale',()=>{
 for(const scale of [.1,1,10])for(const angle of [0,.7,2.3]){
  const transform=([x,y])=>[scale*(x*Math.cos(angle)-y*Math.sin(angle))+31,scale*(x*Math.sin(angle)+y*Math.cos(angle))-14];
  const strokes=[line('a',transform([-10,0]),transform([-1,0]),scale),line('b',transform([0,-10]),transform([0,1]),scale)];
  const {d,a,b}=descriptors(strokes,'a:end','b:end');for(const [x,y] of [[a,b],[b,a]]){const g=connectionGeometry(x,y,[...d.strokes].reverse());assert.equal(g.kind,'one-sided-extension');assert.ok(Math.hypot(g.point.x-31,g.point.y+14)<1e-8);}
 }
});
test('two T attachments on one stroke get distinct colors and explicit interior markers',()=>{
 const graph=resolveStrokeConnectivity([line('stroke-1',[0,0],[40,0],2),line('stroke-2',[10,0],[10,15],2),line('stroke-3',[30,0],[30,15],2)]);
 const display=buildReviewDisplay(graph);assert.equal(display.groups.length,2);assert.notEqual(display.groups[0].color,display.groups[1].color);assert.deepEqual(display.groups.map(g=>g.members.find(n=>n.kind==='segment').arcFraction),[.25,.75]);
});
test('a shared junction gets one group, while unknown candidates are not colored as connected',()=>{
 const graph=resolveStrokeConnectivity([line('stroke-1',[0,0],[0,40],2),line('stroke-2',[-15,0],[0,20],2),line('stroke-3',[15,0],[0,20],2)]);
 const display=buildReviewDisplay(graph);assert.equal(display.groups.length,1);assert.equal(display.groups[0].members.filter(n=>n.kind==='endpoint').length,2);assert.equal(display.groups[0].members.filter(n=>n.kind==='segment').length,1);
 const ambiguous=buildReviewDisplay({...graph,edges:[],candidates:[{decision:'ambiguous',endpointA:'stroke-2:end',target:{kind:'endpoint',endpointId:'stroke-3:end'},candidateId:'tie',decisionReason:'competition-ambiguous'}]});assert.equal(ambiguous.groups.length,0);assert.equal(ambiguous.ambiguous.length,1);
});
test('accepted one-sided intersection is exported as a graph anchor and split point',()=>{
 const strokes=[line('a',[-10,0],[-1,0]),line('b',[0,-10],[0,1])];
 const graph=resolveStrokeConnectivity(strokes,{endpointToSegment:false,manualConnections:[['a:end','b:end']]});
 assert.equal(graph.edges[0].geometry.kind,'one-sided-extension');assert.ok(graph.anchors.some(a=>a.strokeId==='b'&&Math.hypot(a.position.x,a.position.y)<1e-9));assert.equal(graph.strokeSpans.filter(s=>s.strokeId==='b').length,2);
});
test('blocking notes retain exact visible groups and never become accuracy labels',()=>{
 const graph=resolveStrokeConnectivity([line('stroke-1',[0,0],[10,0])]);const display=buildReviewDisplay(graph);
 const record=recordReview({recordId:'review',strokes:graph.strokes,session:{truthFinalized:false},metrics:null},'端点1と2の接続は許容できない',display);
 assert.equal(record.feedback.severity,'blocking');assert.equal(record.feedback.note,'端点1と2の接続は許容できない');assert.deepEqual(record.feedback.display,display);
 const result=evaluateRecords([{records:[record]}]);assert.equal(result.aggregate.sceneCount,0);assert.equal(result.excluded[0].reason,'truth-not-finalized');
 assert.equal(result.qualitativeFeedback[0].note,record.feedback.note);assert.deepEqual(result.qualitativeFeedback[0].display,display);
});
