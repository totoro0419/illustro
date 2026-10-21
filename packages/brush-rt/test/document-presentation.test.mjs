import test from 'node:test';
import assert from 'node:assert/strict';
import {DocumentPresentation} from '../dist/rt/document-presentation.mjs';

function fixture(){
 const kinds=[],elements=[],previous=globalThis.document;
 globalThis.document={createElement:tag=>{
  const e={tag,style:{},children:[],setAttribute(){},append(child){this.children.push(child);},remove(){this.removed=true;},
   getContext(kind){kinds.push(kind);return {transferFromImageBitmap(bitmap){e.image=bitmap.id;}};}};
  elements.push(e);return e;
 }};
 const source={offsetLeft:0,offsetTop:0,before(e){this.scene=e;}};
 return {source,kinds,elements,restore(){if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}};
}
const group=(x,y,w=512,h=512,id=0)=>({key:x+','+y,x,y,w,h,bitmap:{id,width:w,height:h}});

test('many updates replace one retained 512px display group without new DOM elements',()=>{
 const f=fixture();try{
  const p=new DocumentPresentation(f.source,4000,4000);
  for(let i=0;i<100;i++)p.apply([group(0,0,512,512,i)]);
  assert.equal(p.tiles.size,1);
  assert.equal(p.bytes,512*512*4);
  assert.equal(f.elements.length,2);
  assert.equal(p.tiles.get('0,0').element.image,99);
  assert.deepEqual(f.kinds,['bitmaprenderer']);
  p.destroy();assert.equal(p.bytes,0);assert.ok(f.source.scene.removed);
 }finally{f.restore();}
});

test('4000px retained paper has at most 64 display canvases, not 1024 tile canvases',()=>{
 const f=fixture();try{
  const p=new DocumentPresentation(f.source,4000,4000),updates=[];
  for(let y=0;y<4000;y+=512)for(let x=0;x<4000;x+=512)
   updates.push(group(x,y,Math.min(512,4000-x),Math.min(512,4000-y),x+y));
  p.apply(updates);
  assert.equal(p.tiles.size,64);assert.equal(f.elements.length,65);
  assert.equal(p.bytes,4000*4000*4);
  assert.deepEqual(new Set(f.kinds),new Set(['bitmaprenderer']));
  p.destroy();
 }finally{f.restore();}
});

test('newly revealed bottom-right group keeps one parent transform',()=>{
 const f=fixture();try{
  const p=new DocumentPresentation(f.source,4000,4000);
  p.apply([group(3584,3584,416,416,1)]);
  const allocations=f.elements.length,zoom=.065,angle=.2;
  const view=[668,1220,334,610,4000,4000,zoom,angle,8,0,-1,1,0,0,0,0];
  p.update(view);
  assert.equal(f.elements.length,allocations);
  assert.equal(p.tiles.get('3584,3584').element.style.left,'3584px');
  const [a,b,c,d,e,g]=p.element.style.transform.slice(7,-1).split(',').map(Number);
  const point={x:a*4000+c*4000+e,y:b*4000+d*4000+g},dx=-2000,dy=2000;
  assert.ok(Math.abs(point.x-(175+zoom*(dx*Math.cos(angle)-dy*Math.sin(angle))))<1e-8);
  assert.ok(Math.abs(point.y-(305+zoom*(dx*Math.sin(angle)+dy*Math.cos(angle))))<1e-8);
  assert.deepEqual(f.kinds,['bitmaprenderer']);p.destroy();
 }finally{f.restore();}
});
