/** Bounded, presentation-only CPU coverage. No Canvas stamp commands enter the
 * shared GPU queue. Document-space tiles can be coarser than formal pixels;
 * immutable formal brush descriptors and rasterize() are never changed here.
 */
import {tileSize,tileBox} from './brush-raster.mjs';
import {mod} from './brush-engine.mjs';
const clamp=x=>Math.min(1,Math.max(0,x));
export class PreviewInk{
 constructor(stroke,width,height){
  this.stroke=stroke;this.width=width;this.height=height;this.columns=Math.ceil(width/tileSize);
  let size=stroke.size,aspect=stroke.brush.aspect,shear=Math.abs(stroke.brush.shear);
  for(const node of stroke.brush.maps){
   if(!node.enabled)continue;
   const factor=Math.max(Math.abs(node.min),Math.abs(node.max));
   const bound=value=>node.operation==='replace'?factor:node.operation==='add'?value+factor:value*factor;
   if(node.output==='size')size=bound(size);if(node.output==='aspect')aspect=bound(aspect);if(node.output==='shear')shear=bound(shear);
  }
  // Higher provisional sampling for hard erasers and graphite. Formal RGBA is unchanged.
  const target=stroke.brush.blend==='erase'&&b.hardness>=.9?96:b.id==='pencil'?64:32;
  this.scale=Math.min(1,target/Math.max(1,Math.min(900,size)*(Math.min(2,aspect)+Math.min(1,shear))));
  this.tiles=new Map();this.pixels=new Map();this.changed=new Set();
 }
 stamp(dab){
  const s=this.stroke,b=s.brush,k=this.scale,r=dab.size/2,opacity=dab.opacity*dab.flow*s.colorAlpha*(b.accumulate?s.opacity:1);
  if(!opacity||!r)return;
  const angle=dab.angle*Math.PI/180,co=Math.cos(angle),si=Math.sin(angle);
  const dx=r*(Math.abs(co)+Math.abs(co*dab.shear-si*dab.aspect))+1/k,dy=r*(Math.abs(si)+Math.abs(si*dab.shear+co*dab.aspect))+1/k;
  const copies=(c,radius,length)=>s.wrap?Array.from({length:Math.min(16,Math.floor((length-c+radius)/length)-Math.ceil((-c-radius)/length)+1)},(_,i)=>c+(Math.ceil((-c-radius)/length)+i)*length):[c];
  for(const cy of copies(s.wrap?mod(dab.y,this.height):dab.y,dy,this.height))for(const cx of copies(s.wrap?mod(dab.x,this.width):dab.x,dx,this.width)){
   const left=Math.max(0,Math.floor((cx-dx)/tileSize)),right=Math.min(this.columns,Math.ceil((cx+dx)/tileSize));
   const top=Math.max(0,Math.floor((cy-dy)/tileSize)),bottom=Math.min(Math.ceil(this.height/tileSize),Math.ceil((cy+dy)/tileSize));
   for(let row=top;row<bottom;row++)for(let col=left;col<right;col++){
    const key=row*this.columns+col,box=tileBox(key,this.width,this.height);
    let image=this.pixels.get(key);
    if(!image){image=new ImageData(Math.ceil(box.w*k),Math.ceil(box.h*k));this.pixels.set(key,image);this.tiles.set(key,image)}
    const x0=Math.max(0,Math.floor((cx-dx-box.x)*k)),x1=Math.min(image.width,Math.ceil((cx+dx-box.x)*k));
    const y0=Math.max(0,Math.floor((cy-dy-box.y)*k)),y1=Math.min(image.height,Math.ceil((cy+dy-box.y)*k)),data=image.data;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
     const px=box.x+(x+.5)/k-cx,py=box.y+(y+.5)/k-cy;
     const v=(-si*px+co*py)/(r*dab.aspect),u=(co*px+si*py)/r-dab.shear*v;
     const distance=b.tip==='square'?Math.max(Math.abs(u),Math.abs(v)):b.tip==='diamond'?Math.abs(u)+Math.abs(v):Math.hypot(u,v);
     let coverage=clamp((1-distance)*r*k+.5);
     if(dab.hardness<1&&distance>dab.hardness){const t=clamp((distance-dab.hardness)/(1-dab.hardness));coverage*=1-t*t*(3-2*t)}
     if(b.tip==='bitmap'){
      const asset=b.asset,ax=Math.floor((u+1)*asset.width/2),ay=Math.floor((v+1)*asset.height/2);
      coverage=ax<0||ay<0||ax>=asset.width||ay>=asset.height?0:parseInt(asset.alpha.slice((ay*asset.width+ax)*2,(ay*asset.width+ax)*2+2),16)/255;
     }
     if(!coverage)continue;
     if(dab.depth&&b.texture!=='none'){
      const tx=Math.floor((box.x+(x+.5)/k)/dab.textureScale),ty=Math.floor((box.y+(y+.5)/k)/dab.textureScale);
      const noise=((Math.imul(mod(tx,32)+11,374761393)^Math.imul(mod(ty,32)+7,668265263))>>>0)%101/100;
      const grain=b.texture==='graphite'?.12+.88*noise**2:.54+.29*noise+.17*Math.cos(ty*Math.PI/4);
      coverage*=1-dab.depth+dab.depth*grain;
     }
     const alpha=coverage*opacity,i=(y*image.width+x)*4,old=data[i+3]/255,out=alpha+old*(1-alpha);
     if(!out)continue;
     for(let c=0;c<3;c++)data[i+c]=(dab.color[c]*alpha+data[i+c]*old*(1-alpha))/out;
     data[i+3]=Math.round(out*255);
    }
    this.changed.add(key);
   }
  }
 }
 flush(){} // pixels are already CPU ImageData; publication never uploads ink canvases.
}
