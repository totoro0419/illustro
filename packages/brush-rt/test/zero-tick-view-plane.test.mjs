import test from 'node:test';
import assert from 'node:assert/strict';
import {ViewPlane} from '../dist/rt/view-plane.mjs';
import {toScreen} from '../dist/rt/stroke-overlay.mjs';
const node=name=>({
 name,style:{},parentElement:null,children:[],offsetLeft:0,offsetTop:0,
 append(...nodes){for(const n of nodes){n.remove();this.children.push(n);n.parentElement=this;}},
 before(...nodes){const p=this.parentElement;if(!p)throw Error('no parent');let pos=p.children.indexOf(this);
  for(const n of nodes){n.remove();p.children.splice(pos++,0,n);n.parentElement=p;}},
 remove(){if(!this.parentElement)return;const p=this.parentElement;p.children.splice(p.children.indexOf(this),1);this.parentElement=null;}
});
const view=(zoom=.1,pan=0,angle=0)=>[800,1200,400,600,4000,4000,zoom,angle,pan,0,1,1,0,0,0,0];
test('one CSS transform moves the same visible picture without any worker response',()=>{
 const originalDocument=globalThis.document,originalStyle=globalThis.getComputedStyle;
 globalThis.document={createElement:node};globalThis.getComputedStyle=()=>({position:'relative'});
 try{
  const parent=node('surface'),paper=node('document'),canvas=node('precise');
  parent.append(paper,canvas);
  const stage=new ViewPlane(canvas,{element:paper});
  stage.move(view());stage.replacePicture(view(),1);
  const firstPicture=canvas.style.transform;
  assert.equal(canvas.style.visibility,'visible');
  const firstStage=stage.root.style.transform;
  const ink={element:node('ink'),view:view(),rect:[20,30,200,100]};
  stage.root.append(ink.element);stage.placeInk(ink);
  const firstInk=ink.element.style.transform;
  stage.move(view(.15,35,.2));
  assert.notEqual(stage.root.style.transform,firstStage);
  assert.equal(canvas.style.transform,firstPicture);
  assert.equal(ink.element.style.transform,firstInk);
  assert.equal(canvas.style.visibility,'visible','moving must NEVER hide existing precise pixels');
  assert.equal(stage.pictureVersion,1);
  // The same document point must match the new screen position.
  const [a,b,c,d,e,f]=stage.root.style.transform.slice(7,-1).split(',').map(Number);
  const src=toScreen(view(),125,245),dst=toScreen(view(.15,35,.2),125,245);
  assert.ok(Math.abs(a*src.x+c*src.y+e-dst.x)<.00001);
  assert.ok(Math.abs(b*src.x+d*src.y+f-dst.y)<.00001);
  assert.equal(stage.displayedRevision(),-1);
  stage.updatePaper(2);
  assert.equal(stage.displayedRevision(),2);
  assert.equal(canvas.style.visibility,'hidden','newer complete paper can atomically replace old bitmap');
  stage.replacePicture(view(),2);
  assert.equal(canvas.style.visibility,'visible','late source view is reprojected without resetting current camera');
  assert.ok(stage.root.style.transform!==firstStage);
  stage.detach();
  assert.equal(canvas.parentElement,parent);
 }finally{if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
  if(originalStyle===undefined)delete globalThis.getComputedStyle;else globalThis.getComputedStyle=originalStyle;}
});
test('special paper modes never retire overlays using ordinary retained paper',()=>{
 const originalDocument=globalThis.document,originalStyle=globalThis.getComputedStyle;
 globalThis.document={createElement:node};globalThis.getComputedStyle=()=>({position:'relative'});
 try{
  const parent=node('surface'),paper=node('document'),canvas=node('precise');parent.append(paper,canvas);
  const stage=new ViewPlane(canvas,{element:paper}),special=view();special[12]=1;
  stage.move(special);stage.replacePicture(special,1);stage.updatePaper(7);
  assert.equal(stage.displayedRevision(),1);
  assert.equal(canvas.style.visibility,'visible');
  assert.equal(paper.style.display,'none');
  stage.detach();
 }finally{if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
  if(originalStyle===undefined)delete globalThis.getComputedStyle;else globalThis.getComputedStyle=originalStyle;}
});
