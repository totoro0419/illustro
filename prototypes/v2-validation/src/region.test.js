import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRegion, calibrateRegion, resetPrototypeIds, assignInitialIds, reconcileRegions, faceSignature, incrementalResolve, TopologyGenerationController } from './region.js';
import { staticRegionFixtures, regionTransitions, transitionWithConflictingAssignments, incrementalFixture } from './region-corpus.js';

const fixtures=staticRegionFixtures();
const transitions=regionTransitions().filter(t=>t.name!=='merge-conflicting-assignment');
const best=calibrateRegion(fixtures,transitions)[0];
const policy=best.policy;

test('calibrated region policy passes corpus',()=>{
  assert.equal(best.pass,best.total,JSON.stringify(best));
});

test('static fixtures match expected status and face count',()=>{
  for(const f of fixtures){const r=resolveRegion(f.grid,policy);assert.equal(r.status,f.expectStatus,f.name);assert.equal(r.faces.length,f.expectFaces,f.name);}
});

test('transitions satisfy stable identity semantics',()=>{
  resetPrototypeIds();
  for(const tr of transitions){const oldR=assignInitialIds(resolveRegion(tr.oldGrid,policy));const newR=resolveRegion(tr.newGrid,policy);const rec=reconcileRegions(oldR,newR,policy,tr.options??{});assert.ok(tr.check(oldR,newR,rec),tr.name+JSON.stringify(rec));}
});

test('conflicting merge assignments become ambiguous',()=>{
  const {rec}=transitionWithConflictingAssignments(policy,resolveRegion,assignInitialIds,reconcileRegions,resetPrototypeIds);assert.equal(rec.status,'Ambiguous');assert.ok(rec.decisions.some(d=>d.kind==='merge'&&d.assignmentConflict));
});

test('incremental result equals full recompute and affected work is bounded',()=>{
  const f=incrementalFixture();const prev=resolveRegion(f.oldGrid,policy);const inc=incrementalResolve(prev,f.newGrid,f.dirty,policy);const full=resolveRegion(f.newGrid,policy);assert.deepEqual(faceSignature(inc),faceSignature(full));assert.ok(inc.incremental.affectedOldCells < inc.incremental.fullDomainCells/2,JSON.stringify(inc.incremental));
});

test('fixed result remains frozen after later source edits',()=>{
  const f=staticRegionFixtures()[0];const fixed=resolveRegion(f.grid,policy);const sig=faceSignature(fixed);const later=f.grid.clone();later.set(12,20,0);later.set(12,21,0);resolveRegion(later,policy);assert.deepEqual(faceSignature(fixed),sig);
});

test('stale topology generation can never publish as Current',()=>{
  const c=new TopologyGenerationController();const a=c.begin();const b=c.begin();const result=resolveRegion(staticRegionFixtures()[0].grid,policy);const stale=c.publish(a,result);const latest=c.publish(b,result);assert.equal(stale.state,'Retired');assert.equal(latest.state,'Current');
});

test('user pinned boundary survives source evidence loss',()=>{
  const f=staticRegionFixtures().find(x=>x.name==='user-pinned');const g=f.grid.clone();g.data.fill(0);const r=resolveRegion(g,policy);assert.equal(r.status,'Current');assert.equal(r.faces.length,1);
});
