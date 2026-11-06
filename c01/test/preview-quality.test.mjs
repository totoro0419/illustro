import test from 'node:test';
import assert from 'node:assert/strict';
import {preset,strokeDabs} from '../app/brush-engine.mjs';
import {previewDabs} from '../app/preview-stroke.mjs';
import {PreviewInk} from '../app/preview-ink.mjs';

function sample(x,t){return {x,y:250,p:.7,t,speed:0,direction:0,tiltX:0,tiltY:0};}
function strokeFor(id,size){
 return {algorithm:'illustro.canvas-dabs.1',brush:preset(id),size,
  seed:'0011223344556677',points:[sample(100,0),sample(400,1000)],
  correction:{mode:'off'},guide:null,selection:null,wrap:false,
  opacity:1,flow:1,colorAlpha:1,color:[24,40,68],curve:1,pen:true};
}

for(const [name,size] of [['pencil',12],['pencil',300],['hardEraser',300]]){
 test(name+' '+size+'px provisional samples follow formal dab density',()=>{
  const stroke=strokeFor(name,size),drawn=[];
  const c={stroke,ink:{stamp(dab){drawn.push(dab)}},previewIndex:0,previewCount:0,active:true};
  const run=()=>previewDabs(c,{remaining:10000,until:performance.now()+10000});
  run();c.active=false;run();
  const formal=[...strokeDabs(stroke)];
  assert.equal(drawn.length,formal.length,'provisional/formal stamp count');
  for(let i=0;i<formal.length;i++){
   assert.ok(Math.abs(drawn[i].x-formal[i].x)<1e-5,'x index '+i);
   assert.ok(Math.abs(drawn[i].opacity*drawn[i].flow-formal[i].opacity*formal[i].flow)<1e-6,'coverage index '+i);
  }
 });
}

test('hard eraser edges and graphite use finer bounded provisional rasters',()=>{
 const eraser=new PreviewInk(strokeFor('hardEraser',300),1600,1200);
 const pencil=new PreviewInk(strokeFor('pencil',300),1600,1200);
 const gpen=new PreviewInk(strokeFor('gpen',300),1600,1200);
 assert.ok(eraser.scale>=.3,'hard eraser preview should no longer have ~9-pixel stair steps');
 assert.ok(pencil.scale>gpen.scale,'graphite preview receives more texture sampling');
 assert.ok(eraser.scale<=1&&pencil.scale<=1,'provisional resolution remains bounded');
});
