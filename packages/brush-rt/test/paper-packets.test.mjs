import test from 'node:test';
import assert from 'node:assert/strict';
import {mergePaperPackets,queueFuturePaperPacket} from '../dist/rt/paper-packets.mjs';
const tile=(key,value,surfaceId='a')=>({surfaceId,key,pixels:new Uint8Array([value,0,0,value?255:0])});
const packet=(serial,tiles,replace=false,epoch=1)=>({serial,epoch,id:serial,ids:[serial],tiles,replace});
test('a two-slot future mailbox retains every necessary tile and stroke identity',()=>{
 const queue=[];for(let n=1;n<=64;n++){queueFuturePaperPacket(queue,packet(n,[tile(n%4+',0',n)],n===1));assert.ok(queue.length<=2);}
 const merged=mergePaperPackets(...queue),values=new Map(merged.tiles.map(t=>[t.key,t.pixels[0]]));
 assert.deepEqual([...values].sort(),[['0,0',64],['1,0',61],['2,0',62],['3,0',63]]);
 assert.deepEqual(merged.ids,Array.from({length:64},(_,i)=>i+1));assert.equal(merged.id,null);assert.equal(merged.replace,true);
});
test('a later full replacement removes obsolete image tiles',()=>{
 const a=packet(1,[tile('old',1)],true),b=packet(2,[tile('new',2)],true),m=mergePaperPackets(a,b);
 assert.deepEqual(m.tiles.map(t=>t.key),['new']);assert.deepEqual(m.ids,[1,2]);assert.equal(m.replace,true);assert.equal(a.tiles[0].key,'old');
});
test('a newer epoch supersedes an obsolete future state',()=>{
 const a=packet(100,[tile('old',1)],true,1),b=packet(2,[tile('new',2)],true,2);
 assert.equal(mergePaperPackets(a,b),b);assert.equal(mergePaperPackets(b,a),b);
});
test('serial order wins even when a delayed packet is supplied last',()=>{
 const newer=packet(8,[tile('shared',8)]),older=packet(7,[tile('shared',7),tile('other',7)]);
 const m=mergePaperPackets(newer,older);assert.equal(m.serial,8);assert.equal(m.tiles.find(t=>t.key==='shared').pixels[0],8);assert.equal(m.tiles.find(t=>t.key==='other').pixels[0],7);
});
test('transparent clearing tiles and separate layers survive coalescing',()=>{
 const m=mergePaperPackets(packet(1,[tile('0,0',255),tile('0,0',128,'b')]),packet(2,[tile('0,0',0)]));
 assert.equal(m.tiles.length,2);assert.equal(m.tiles.find(t=>t.surfaceId==='a').pixels[3],0);assert.equal(m.tiles.find(t=>t.surfaceId==='b').pixels[0],128);
});
