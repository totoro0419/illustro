import test from 'node:test';
import assert from 'node:assert/strict';
import {DrawingHost} from '../dist/rt/drawing-host.mjs';

// An actual Worker may stall forever after receiving its input. These unit
// tests intentionally do not synthesize a successful worker completion.
function hostFixture(){
 const messages=[],presentations=[],consumed=[],removed=[];
 const element=()=>({
  width:0,height:0,style:{},setAttribute(){},
  getContext(){return {transferFromImageBitmap(bitmap){consumed.push(bitmap);}};},
  before(){},after(){},remove(){removed.push(this);}
 });
 const old=element(),host=Object.create(DrawingHost.prototype);
 host.sequence=0;host.epoch=0;host.disposed=false;host.presentationRequestId=0;
 host.presentationRequests=new Map;host.documentVersion=0;host.pendingRetirements=new Map;
 host.layers=new Map([[3,{element:old}]]);host.hiddenStrokeIds=new Set;
 host.canvas={offsetLeft:0,offsetTop:0,after(){}};
 host.viewPlane={placeInk(){},displayedRevision:()=>0};
 host.presentation={postMessage(message){messages.push(message);}};
 host.send=(method,args)=>messages.push({method,args});
 host.onPresentation=event=>presentations.push(event);
 const makePicture=(sequence=1,pages=true)=>({
  type:'picture',sequence,epoch:0,retired:[3],
  pages:pages?[{bitmap:{width:128,height:128,close(){}}}]:[],
  layers:[{id:7,bitmap:{width:64,height:64},view:[800,1200,400,600,4000,4000,.1,0,0,0,1,1,0,0,0,0],
   rect:[10,20,64,64],scale:1,polygon:[{x:10,y:20},{x:74,y:20},{x:74,y:84},{x:10,y:84}]}]
 });
 const previousDocument=globalThis.document;globalThis.document={createElement:element};
 return {host,messages,presentations,consumed,removed,old,makePicture,restore(){if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}};
}
test('temporary ink appears and remains movable while exact document image Worker is stuck',async()=>{
 const f=hostFixture();
 try{
  const work=f.host.picture(f.makePicture());
  assert.equal(f.host.layers.has(7),true,'new temporary ink must not wait for document image Worker');
  assert.equal(f.consumed.length,1,'bitmap is actually displayed before document response');
  assert.equal(f.presentations[0].kind,'picture-overlay');
  assert.equal(f.presentations[0].waitingForDocument,true);
  assert.equal(f.host.layers.has(3),true,'old preview survives until exact document pixels are visible');
  assert.ok(f.host.pendingRetirements.has(3));
  assert.equal(f.messages.filter(m=>m.method==='pictureAck').length,0,'publication acknowledgment must await image ownership transfer');
  assert.equal(f.host.presentationRequests.size,1,'document rendering remains pending');
  f.host.presentationRequests.get(1).resolve({accepted:true});
  await work;
  assert.equal(f.messages.filter(m=>m.method==='pictureAck').length,1);
  assert.equal(f.host.layers.has(3),true,'no premature retirement with incomplete paper');
  f.host.retireOverlays(1);
  assert.equal(f.host.layers.has(3),false,'only the exact replacement retires old ink');
 }finally{f.restore();}
});
test('pure overlay updates do not create document completion waits',async()=>{
 const f=hostFixture();
 try{
  await f.host.picture(f.makePicture(1,false));
  assert.equal(f.host.layers.has(7),true);
  assert.equal(f.host.layers.has(3),false);
  assert.equal(f.host.presentationRequests.size,0);
  assert.deepEqual(f.messages.filter(m=>m.method==='pictureAck').map(m=>m.args.accepted),[true]);
 }finally{f.restore();}
});
test('stale worker picture must not replace current ink',async()=>{
 const f=hostFixture();
 try{
  f.host.epoch=4;
  const m=f.makePicture();m.epoch=3;
  let closed=0;for(const x of m.pages)x.bitmap.close=()=>closed++;for(const x of m.layers)x.bitmap.close=()=>closed++;
  await f.host.picture(m);
  assert.equal(f.consumed.length,0);assert.equal(closed,2);
  assert.equal(f.host.layers.has(7),false);
  assert.deepEqual(f.messages.filter(m=>m.method==='pictureAck').map(m=>m.args.accepted),[false]);
 }finally{f.restore();}
});

test('an overlay-only retirement never makes ink disappear while exact raster is blocked',async()=>{
 const f=hostFixture();
 try{
  // A real stalled document request exists. There is no exact replacement
  // for either old preview yet even when an overlay-only packet arrives.
  f.host.presentationRequests.set(99,{resolve(){},read:false});
  await f.host.picture(f.makePicture(2,false));
  assert.equal(f.host.layers.has(3),true,'old stroke cannot vanish under a blocked image Worker');
  assert.equal(f.host.layers.has(7),true,'new temporary ink still appears');
  assert.equal(f.host.pendingRetirements.get(3),2);
  f.host.retireOverlays(1);
  assert.equal(f.host.layers.has(3),true,'stale precise image never retires ink');
  f.host.retireOverlays(2);
  assert.equal(f.host.layers.has(3),false,'correct newer document can retire the preview');
 }finally{f.restore();}
});
