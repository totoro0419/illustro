import test from 'node:test';
import assert from 'node:assert/strict';
import {CanonicalBuilder} from '../../../prototypes/brush-rt/dist/rt/model.mjs';
import {TileDocument} from '../../../prototypes/brush-rt/dist/rt/renderer.mjs';
import fs from 'node:fs';
const presets=JSON.parse(fs.readFileSync(new URL('../../../docs/brush/evidence/presets.json',import.meta.url))),ink={...presets.find(p=>p.id==='fine-ink'),size:16,stabilization:1,pressureSmoothing:0};

test('completed coverage tiles do not retain per-stroke scheduling tags',()=>{
 const p={...ink,size:1024,stabilization:0},b=new CanonicalBuilder(p);b.accept({x:64,y:64,t:0,pressure:1,pointerType:'pen'});b.finish();const d=new TileDocument(128,128);
 for(let id=1;id<=1100;id++){d.append(id,p,b.record().commands);d.end(id,p);while(d.jobs.length)for(const job of d.peekMany(128))d.complete(job);assert.equal(d.full.size,0);}
 assert.equal(d.count,0);assert.equal(d.open.size,0);assert.equal(d.touched.size,0);
});
