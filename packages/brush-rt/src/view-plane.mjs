import {viewAffine,toScreen} from '@rt/stroke-overlay';

// The UI owns one view. Delayed raster images never alter it.
// Everything already on screen is mapped to the same immutable anchor view;
// a pointer event only writes ONE CSS transform, without Worker/GPU work.
export class ViewPlane {
 constructor(canvas,paper){
  this.canvas=canvas;
  this.paper=paper.element;
  this.parent=canvas.parentElement;
  this.root=document.createElement('div');
  this.root.className='illustro-view-plane';
  Object.assign(this.root.style,{position:'absolute',inset:'0',transformOrigin:'0 0',pointerEvents:'none',willChange:'transform'});
  if(getComputedStyle(this.parent).position==='static')this.parent.style.position='relative';
  this.paper.before(this.root);
  this.root.append(this.paper,this.canvas);
  Object.assign(this.canvas.style,{position:'absolute',left:'0',top:'0',transformOrigin:'0 0',pointerEvents:'none',background:'transparent'});
  Object.assign(this.paper.style,{left:'0px',top:'0px',transformOrigin:'0 0',pointerEvents:'none'});
  this.anchor=null;this.view=null;this.pictureView=null;
  this.paperVersion=-1;this.pictureVersion=-1;
 }
 static matrix(values){return 'matrix('+values.join(',')+')';}
 start(view){
  if(this.anchor)return;
  this.anchor=Array.from(view);
  const a=toScreen(view,0,0),x=toScreen(view,1,0),y=toScreen(view,0,1);
  this.paper.style.transform=ViewPlane.matrix([x.x-a.x,x.y-a.y,y.x-a.x,y.y-a.y,a.x,a.y]);
 }
 move(view){
  this.start(view);
  this.view=Array.from(view);
  this.root.style.transform=ViewPlane.matrix(viewAffine(this.anchor,this.view));
  // Never hide an old picture merely because the user has moved it.
  this.updateVisibility();
 }
 updatePaper(version){
  this.paperVersion=Math.max(this.paperVersion,version);
  this.updateVisibility();
 }
 // Clip the old viewport picture to the actual document region.
 // Newly exposed document pixels are supplied by the retained paper underneath.
 static documentClip(v){
  let poly=[[0,0],[v[4],0],[v[4],v[5]],[0,v[5]]].map(([x,y])=>toScreen(v,x,y));
  const planes=[p=>p.x,p=>v[2]-p.x,p=>p.y,p=>v[3]-p.y];
  for(const side of planes){
   const out=[];for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],fa=side(a),fb=side(b);
    if(fa>=0)out.push(a);
    if((fa<0&&fb>0)||(fa>0&&fb<0)){const t=fa/(fa-fb);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
   }poly=out;
  }
  return poly.length>=3?'polygon('+poly.map(p=>p.x+'px '+p.y+'px').join(',')+')':'inset(100%)';
 }
 replacePicture(view,version){
  if(!view)return;
  this.pictureView=Array.from(view);this.pictureVersion=version;
  Object.assign(this.canvas.style,{
   width:view[2]+'px',height:view[3]+'px',
   transform:ViewPlane.matrix(viewAffine(view,this.anchor)),
   clipPath:ViewPlane.documentClip(view)
  });
  this.updateVisibility();
 }
 updateVisibility(){
  if(!this.view)return;
  const specialized=this.view[12]>.5||this.view[14]>.5;
  this.paper.style.display=specialized?'none':'block';
  // Paper groups are sparse updates, not a complete viewport replacement.
  // A newer paper version may contain only the changed 512px groups; hiding
  // the last precise picture would reveal missing document pixels. Retain it
  // until a new precise image has actually been installed.
  this.canvas.style.visibility='visible';
 }
 placeInk(layer){
  if(!this.anchor||!layer.view||!layer.rect)return;
  const [a,b,c,d,e,f]=viewAffine(layer.view,this.anchor),[x,y]=layer.rect;
  layer.element.style.transform=ViewPlane.matrix([a,b,c,d,e+a*x+c*y-x,f+b*x+d*y-y]);
 }
 displayedRevision(){
  if(!this.view)return -1;
  // Retire temporary ink only after it is covered by an installed precise
  // picture; sparse paper tile arrival alone cannot prove that coverage.
  return this.pictureVersion;
 }
 detach(){
  this.root.before(this.paper,this.canvas);this.root.remove();
  for(const prop of ['position','left','top','transform','transformOrigin','clipPath','visibility','width','height','pointerEvents','background'])
   this.canvas.style[prop]='';
  for(const prop of ['left','top','transform','transformOrigin','display','pointerEvents'])
   this.paper.style[prop]='';
 }
}
