import test from 'node:test';
import assert from 'node:assert/strict';
import {IndependentScene} from '../dist/rt/drawing-host.mjs';
import {toScreen} from '../dist/rt/stroke-overlay.mjs';
function el(tag){
 const node={tag,style:{},children:[],parent:null,
  append(...children){for(const child of children){if(child.parent)child.parent.children.splice(child.parent.children.indexOf(child),1);child.parent=this;this.children.push(child);}},
  before(child){const p=this.parent;if(!p)throw Error('detached');if(child.parent)child.parent.children.splice(child.parent.children.indexOf(child),1);const index=p.children.indexOf(this);child.parent=p;p.children.splice(index,0,child);},
  remove(){if(this.parent)this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}
 };
 return node;
}
const v=(pan=0,zoom=1,angle=0)=>[1200,800,600,400,4000,4000,zoom,angle,pan,0,1,1,0,0,0,0];
test('held paper and temporary ink move synchronously while raster worker is unavailable',()=>{
 const savedDocument=globalThis.document,savedStyle=globalThis.getComputedStyle;
 globalThis.document={createElement:el};globalThis.getComputedStyle=()=>({position:'relative'});
 try{
  const surface=el('surface'),paper=el('paper'),canvas=el('canvas');surface.append(paper,canvas);
  const scene=new IndependentScene(canvas,{element:paper});
  scene.setView(v());scene.preciseUpdated(v(),1);
  assert.equal(canvas.style.visibility,'visible');
  const stroke={element:el('stroke'),view:v(),rect:[13,29,70,80]};scene.motion.append(stroke.element);scene.placeInk(stroke);
  const inkTransform=stroke.element.style.transform;
  const paperTransform=paper.style.transform;
  scene.setView(v(100,2,.15));
  assert.equal(canvas.style.visibility,'hidden');
  assert.equal(paper.style.transform,paperTransform);
  assert.equal(stroke.element.style.transform,inkTransform);
  assert.match(scene.motion.style.transform,/^matrix\(/);
  const coords=scene.motion.style.transform.slice(7,-1).split(',').map(Number);
  const before=toScreen(v(),130,80),after=toScreen(v(100,2,.15),130,80);
  assert.ok(Math.abs(coords[0]*before.x+coords[2]*before.y+coords[4]-after.x)<1e-6);
  assert.ok(Math.abs(coords[1]*before.x+coords[3]*before.y+coords[5]-after.y)<1e-6);
  scene.paperUpdated(2);
  scene.preciseUpdated(v(),2);assert.equal(canvas.style.visibility,'hidden');
  scene.preciseUpdated(v(100,2,.15),2);assert.equal(canvas.style.visibility,'visible');
  scene.destroy();assert.ok(surface.children.includes(canvas));
 }finally{
  if(savedDocument===undefined)delete globalThis.document;else globalThis.document=savedDocument;
  if(savedStyle===undefined)delete globalThis.getComputedStyle;else globalThis.getComputedStyle=savedStyle;
 }
});
