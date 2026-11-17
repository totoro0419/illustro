import test from 'node:test';
import assert from 'node:assert/strict';
import {StrokeOverlay,selectionPreviewCoverage} from '../dist/rt/stroke-overlay.mjs';
import {GpuRenderer} from '../dist/rt/renderer.mjs';
const view=Float64Array.from([32,32,32,32,32,32,1,0,0,0,1,1,0,0,0,0]);

test('C06-001: preview selection uses exact document pixels and fractional coverage',()=>{
 const alpha=new Uint8Array(32*32);alpha[5*32+5]=128;alpha[8*32+9]=255;
 const mask={width:32,height:32,alpha},plan={scale:1};
 assert.equal(selectionPreviewCoverage(mask,view,plan,0,0),0);
 assert.equal(selectionPreviewCoverage(mask,view,plan,5,5),128/255);
 assert.equal(selectionPreviewCoverage(mask,view,plan,9,8),1);
 assert.equal(selectionPreviewCoverage(mask,view,plan,-1,2),0);
 assert.equal(selectionPreviewCoverage(mask,view,plan,32,2),0);
});
test('C06-001: masked composition never displays pixels outside the selection',()=>{
 const prior=globalThis.ImageData;
 globalThis.ImageData=class ImageData{constructor(width,height){this.data=new Uint8ClampedArray(width*height*4);}};
 try{
  const alpha=new Uint8Array(32*32);alpha[5*32+5]=128;alpha[8*32+9]=255;
  const prefix=new Float32Array(32*32*4);
  for(let i=0;i<prefix.length;i+=4){prefix[i]=1;prefix[i+3]=1;}
  const state={id:1,selectionMask:{width:32,height:32,alpha},view,plan:{scale:1},
   preset:{__foundation:{coverageUnion:true,material:false}},
   tiles:new Map([['0,0',{prefix,tail:null}]])};
  const preview=Object.create(StrokeOverlay.prototype);
  preview.states=new Map([[1,state]]);preview.cells=new Map([['0,0',new Set([1])]]);
  const data=preview.composedCell('0,0',[1]).image.data;
  assert.equal(data[3],0);
  assert.equal(data[(5*32+5)*4+3],128);
  assert.equal(data[(8*32+9)*4+3],255);
  assert.equal(data[(7*32+7)*4+3],0);
 }finally{globalThis.ImageData=prior;}
});
test('C06-001: the unmasked GPU mailbox never receives a selected preview',()=>{
 const r=Object.create(GpuRenderer.prototype);
 r.hiddenStrokeIds=new Set();r.strokeHandoff=true;r.previewStates=new Map();
 r.backend={overlayHoldIds:new Set()};
 let cpu=0,requests=0;
 r.proxy={enqueue:()=>{cpu++;return false;}};
 r.syncOverlayView=()=>{};r.requestWork=()=>{requests++;};
 r.mailbox={set:()=>{throw Error('unmasked GPU preview must not be submitted');}};
 r.setLive({id:1,selectionMask:{width:2,height:2,alpha:new Uint8Array(4).fill(255)},surfaceKey:'layer'});
 assert.equal(cpu,1);assert.equal(requests,1);
});
