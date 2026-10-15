import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CanonicalBuilder} from '../dist/rt/model.mjs';
import {TileDocument} from '../dist/rt/renderer.mjs';
const presets=JSON.parse(fs.readFileSync(new URL('../../../docs/brush/evidence/presets.json',import.meta.url)));
const ink={...presets.find(p=>p.id==='fine-ink'),size:1024,stabilization:0,pressureSmoothing:0};
function record(){const b=new CanonicalBuilder(ink);for(let i=0;i<100;i++)b.accept({x:64+i*.1,y:64,t:i*4,pressure:1,pointerType:'pen'});b.finish();return b.record();}
test('pending exact solid coverage reduces GPU work without changing the record or touched tiles',()=>{
 const r=record(),original=JSON.stringify(r),old=new TileDocument(128,128),next=new TileDocument(128,128);next.pruneSolid=true;
 old.append(1,ink,r.commands);next.append(1,ink,r.commands);assert.ok(next.formalCommandsPruned>0);assert.ok(next.count<old.count);assert.deepEqual(next.end(1,ink),old.end(1,ink));assert.equal(JSON.stringify(r),original);assert.equal(r.raw.length,100);
 while(next.jobs.length)for(const job of next.peekMany(128))next.complete(job);assert.equal(next.count,0);assert.equal(next.jobs.length,0);
});
test('a pigment change preserves the later MAX commands and their order',()=>{
 const r=record(),a=r.commands[0].slice(),b=r.commands[1].slice(),c=r.commands[2].slice();b[8]=.9;c[8]=.9;const d=new TileDocument(128,128);d.pruneSolid=true;d.append(1,ink,[a,b,c]);assert.equal(d.count,3);assert.deepEqual(d.jobs[0].commands,[a,b,c]);
});
test('new arrivals cannot replace a submitted tile job',()=>{
 const r=record(),d=new TileDocument(128,128);d.pruneSolid=true;d.append(1,ink,[r.commands[0]]);const first=d.jobs[0],submitted=d.peekMany(1);d.append(1,ink,[r.commands[1],r.commands[2]]);assert.equal(d.jobs[0],first);assert.deepEqual(submitted[0].commands,[r.commands[0]]);assert.equal(first.commands.length,1);assert.equal(d.jobs.length,2);d.end(1,ink);while(d.jobs.length)for(const job of d.peekMany(128))d.complete(job);assert.equal(d.count,0);
});
