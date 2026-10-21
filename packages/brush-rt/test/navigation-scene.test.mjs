import test from 'node:test';
import assert from 'node:assert/strict';
import {NavigationScene} from '../dist/rt/navigation-scene.mjs';
import {DrawingHost} from '../dist/rt/drawing-host.mjs';

const originalDocument=globalThis.document;
function mockScene(){
 const scene={children:[],style:{},removed:false,append(x){this.children.push(x)},before(x){this.sibling=x},remove(){this.removed=true}};
 globalThis.document={createElement(){return scene}};
 const canvas={style:{},before(el){this.parent=el}};
 return {scene,canvas,restore(){if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;}};
}
const view=(pan=0,zoom=1,angle=0)=>[668,1220,334,610,4000,4000,zoom,angle,pan,0,1,1,0,0,0,0];
test('pan, zoom and rotation change exactly one browser-owned element, with no async work',()=>{
 const f=mockScene();try{
  const nav=new NavigationScene(f.canvas);const base=view();
  nav.begin(base);
  const next=view(40,1.7,.35);
  const before=f.scene.style.transform;
  assert.equal(before,'none');
  assert.equal(nav.move(next),true);
  assert.match(f.scene.style.transform,/^matrix\(/);
  const m=f.scene.style.transform.slice(7,-1).split(',').map(Number);
  assert.equal(m.length,6);assert.ok(Math.abs(m[0]-1.7*Math.cos(.35))<1e-8);
  assert.ok(Math.abs(m[1]-1.7*Math.sin(.35))<1e-8);
  assert.ok(f.scene.children.includes(f.canvas));
  nav.end();assert.equal(f.scene.style.transform,'none');assert.equal(nav.baseView,null);
  nav.destroy(f.canvas);assert.equal(f.scene.removed,true);
 }finally{f.restore();}
});

test('navigation does not send view messages to raster or presentation workers while a gesture is held',()=>{
 const calls=[],base=view(),nav={baseView:null,begin(v){this.baseView=Array.from(v);},move(v){calls.push(['dom',v[8]]);},end(){this.baseView=null;}};
 const host={backend:{viewTransform:base},navigationScene:nav,navigationActive:false,
  presentation:{postMessage:m=>calls.push(['display',m.method,m.active])},
  send:(name,data)=>calls.push(['draw',name,data]),syncVisibility(){calls.push(['visible'])},
  reproject(){calls.push(['rebase'])},onPresentation(){calls.push(['observed'])}};
 DrawingHost.prototype.setNavigationActive.call(host,true);
 calls.length=0;
 for(let i=1;i<=50;i++)DrawingHost.prototype.setViewTransform.call(host,view(i*3,1+i*.005,i*.004));
 assert.equal(calls.filter(x=>x[0]==='dom').length,50);
 assert.equal(calls.filter(x=>x[0]==='display'||x[0]==='draw'||x[0]==='rebase').length,0);
 DrawingHost.prototype.setNavigationActive.call(host,false);
 assert.equal(nav.baseView,null);
 assert.equal(calls.filter(x=>x[0]==='display'&&x[1]==='view').length,1);
 assert.equal(calls.filter(x=>x[0]==='draw'&&x[1]==='view').length,1);
 assert.equal(calls.filter(x=>x[0]==='rebase').length,1);
});
