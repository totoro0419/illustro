import test from 'node:test';
import assert from 'node:assert/strict';
import {TileHistory} from '../dist/rt/tile-history.mjs';

function publish(h,plan){h.publish(plan);h.complete(plan);}
function harness(){
 let bound;const released=[],stored=new Map,archive={metrics:{},async put(id,pixels){stored.set(id,pixels);return {available:true};},async get(id){return stored.has(id)?{pixels:stored.get(id)}:{missing:true};},drop(ids){ids.forEach(id=>stored.delete(id));},destroy(){}};
 const gl={RGBA8:1,UNSIGNED_BYTE:1,TEXTURE_2D:1,RGBA:1,bindTexture(_,image){bound=image;},texSubImage2D(...args){bound.pixels.set(args.at(-1));}};
 const b={gl,layered:true,archiveIds:new Map,tiles:new Map,surface(){const image={pixels:new Uint8Array(65536)};image.t=image;return image;},copySurface(a,z){z.pixels.set(a.pixels);},release(image){released.push(image);}};
 b.zeroLayer=b.surface();const h=new TileHistory(b,{archive}),tile={key:'0,0',surfaceKey:'a',layer:[b.surface(),b.surface()],l:0,preset:{id:'p'},uncommittedOwner:1};b.tiles.set('a\0'+'0,0',tile);
 b.tile=(key,surfaceKey)=>{const q=surfaceKey+'\0'+key;let t=b.tiles.get(q);if(!t){t={key,surfaceKey,layer:[b.surface(),b.surface()],l:0,preset:{id:'p'},active:null};b.tiles.set(q,t);}return t;};
 const stroke=(id,value)=>{h.before(id,'0,0',tile,{id:'p'});tile.l=1-tile.l;tile.layer[tile.l].pixels.fill(value);tile.committedId=id;tile.preset={id:'p'};h.after(id,'0,0',tile);delete tile.uncommittedOwner;};
 return {b,h,tile,stroke,archive,stored,released};
}
test('adjacent strokes share the previous after image and copy only the changed tile',()=>{
 const {h,stroke}=harness();stroke(1,50);stroke(2,100);
 assert.equal(h.metrics.copies,2);assert.equal(h.patches.get(1).tiles.values().next().value.after.version,h.patches.get(2).tiles.values().next().value.before.version);
 assert.equal(h.versions.size,2);assert.equal(h.current.size,1);
});
test('mixed Undo/Redo prepares one final tile, keeps old layer readable, then publishes exactly',async()=>{
 const {h,stroke,tile}=harness();stroke(1,50);stroke(2,100);stroke(3,150);
 const plan=await h.prepare([{id:3,direction:'undo'},{id:2,direction:'undo'},{id:2,direction:'redo'}]);
 assert.equal(plan.staged.length,1);assert.equal(tile.layer[tile.l].pixels[0],150,'old layer remains authoritative until publication');
 publish(h,plan);assert.equal(tile.layer[tile.l].pixels[0],100);assert.equal(tile.committedId,2);assert.equal(h.patches.get(2).state,'applied');assert.equal(h.patches.get(3).state,'undone');
 const redo=await h.prepare([{id:3,direction:'redo'}]);publish(h,redo);assert.equal(tile.layer[tile.l].pixels[0],150);
});
test('cold snapshots restore identical bytes without creating a GPU history copy',async()=>{
 const {h,stroke,tile,stored,b}=harness();stroke(1,50);stroke(2,100);
 const before=h.patches.get(2).tiles.values().next().value.before.version;stored.set(before.id,before.gpu.pixels.slice());before.archived=true;h.gpuBytes-=65536;before.gpu=null;
 const copies=h.metrics.copies,plan=await h.prepare([{id:2,direction:'undo'}]);assert.ok(plan);h.publish(plan);
 assert.equal(tile.layer[tile.l].pixels[0],50);assert.equal(h.metrics.coldTiles,1);assert.equal(h.metrics.copies,copies);
});
test('an unavailable/corrupt archive never publishes a partly restored head',async()=>{
 const {h,stroke,tile}=harness();stroke(1,50);stroke(2,100);const v=h.patches.get(2).tiles.values().next().value.before.version;v.archived=true;v.gpu=null;
 assert.equal(await h.prepare([{id:2,direction:'undo'}]),null);assert.equal(tile.layer[tile.l].pixels[0],100);assert.equal(h.patches.get(2).state,'applied');assert.equal(h.busy,false);
});
test('Undo then paint releases the abandoned Redo images without touching the shared base',async()=>{
 const {h,stroke,tile,released}=harness();stroke(1,50);stroke(2,100);publish(h,await h.prepare([{id:2,direction:'undo'}]));h.drop([2]);stroke(3,200);
 assert.equal(tile.layer[tile.l].pixels[0],200);assert.equal(h.patches.has(2),false);assert.equal(h.metrics.copies,3);assert.equal(released.length,1);
 h.clear();assert.equal(h.gpuBytes,0);assert.equal(h.versions.size,0);assert.equal(h.patches.size,0);assert.equal(h.current.size,0);
});
test('empty Undo frees document GPU tiles and Redo recreates identical pixels',async()=>{
 const {h,b,stroke}=harness();stroke(1,77);const undo=await h.prepare([{id:1,direction:'undo'}]);publish(h,undo);assert.equal(b.tiles.size,0);assert.equal(h.current.get('a\0'+'0,0').version,null);
 const redo=await h.prepare([{id:1,direction:'redo'}]);assert.equal(b.tiles.get('a\0'+'0,0').layer[0].pixels[0],0,'old empty image remains visible while staged');publish(h,redo);const t=b.tiles.get('a\0'+'0,0');assert.equal(t.layer[t.l].pixels[0],77);assert.equal(t.committedId,1);
});
test('coverage-only interruption restores before pixels without completing an after image',async()=>{
 const {h,stroke,tile}=harness();stroke(1,50);h.before(2,'0,0',tile,{id:'p'});h.interrupt(2);
 const plan=await h.prepare([{id:2,direction:'undo'}]);assert.ok(plan);publish(h,plan);
 assert.equal(tile.layer[tile.l].pixels[0],50);assert.equal(h.patches.get(2).tiles.values().next().value.after,null);
 assert.equal(await h.prepare([{id:2,direction:'redo'}]),null,'Redo must regenerate the incomplete canonical suffix');assert.equal(h.busy,false);
});
test('partially committed stroke restores both completed and coverage-only tiles atomically',async()=>{
 const {h,b,stroke,tile}=harness();stroke(1,50);stroke(2,100);
 const other=b.tile('1,0','a');other.uncommittedOwner=2;h.before(2,'1,0',other,{id:'p'});h.interrupt(2);
 const plan=await h.prepare([{id:2,direction:'undo'}]);assert.ok(plan);assert.equal(tile.layer[tile.l].pixels[0],100);assert.equal(b.tiles.size,2);
 publish(h,plan);assert.equal(tile.layer[tile.l].pixels[0],50);assert.equal(b.tiles.size,1);assert.equal(await h.prepare([{id:2,direction:'redo'}]),null);
});
test('unsubmitted stroke has an empty reversible before patch and no snapshot copies',async()=>{
 const {h}=harness();h.interrupt(99);const plan=await h.prepare([{id:99,direction:'undo'}]);assert.ok(plan);assert.equal(plan.staged.length,0);publish(h,plan);
 assert.equal(h.metrics.copies,0);assert.equal(h.patches.get(99).state,'undone');assert.equal(await h.prepare([{id:99,direction:'redo'}]),null);h.drop([99]);assert.equal(h.patches.size,0);
});
