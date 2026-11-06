import {mod, strokeDabs} from './brush-engine.mjs';

export const tileSize = 128;
const angle = degrees => degrees * Math.PI / 180;
export function surface(width,height){
 const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):Object.assign(document.createElement('canvas'),{width,height});
 canvas.getContext('2d',{willReadFrequently:true});return canvas;
}

const textureCache = new Map();
const bitmaps = new WeakMap();
function texture(name) {
 if(textureCache.has(name)) return textureCache.get(name);
 const tile=surface(32,32), ctx=tile.getContext('2d'), data=ctx.createImageData(32,32);
 for(let y=0;y<32;y++) for(let x=0;x<32;x++){
  const noise=((Math.imul(x+11,374761393)^Math.imul(y+7,668265263))>>>0)%101/100;
  const tone=name==='graphite'?.12+.88*noise**2:.54+.29*noise+.17*Math.cos(y*Math.PI/4);
  data.data[(y*32+x)*4+3]=Math.round(tone*255);
 }
 ctx.putImageData(data,0,0);
 textureCache.set(name,tile);
 return tile;
}
function bitmap(asset){
 if(bitmaps.has(asset)) return bitmaps.get(asset);
 const image=surface(asset.width,asset.height), ctx=image.getContext('2d'), data=ctx.createImageData(asset.width,asset.height);
 for(let i=0;i<asset.width*asset.height;i++) data.data[i*4+3]=parseInt(asset.alpha.slice(i*2,i*2+2),16);
 ctx.putImageData(data,0,0);
 bitmaps.set(asset,image);
 return image;
}

function repeatTextureTransform(left,top,width,height,degrees,scale){
 const radians=angle(degrees),cos=Math.cos(radians)/scale,sin=Math.sin(radians)/scale;
 const period=(value,length)=>Math.round(value*length/32)*32/length;
 let a=period(cos,width),b=period(-sin,width),c=period(sin,height),d=period(cos,height);
 if(Math.abs(a*d-b*c)<1e-12){
  a=Math.max(1,Math.round(width/(32*scale)))*32/width;
  d=Math.max(1,Math.round(height/(32*scale)))*32/height;
  b=0;c=0;
 }
 return new DOMMatrix().translate(-left,-top).multiply(new DOMMatrix([a,b,c,d,0,0]).inverse());
}

export function tileBox(key,width,height){
 const columns=Math.ceil(width/tileSize);
 const x=key%columns*tileSize, y=Math.floor(key/columns)*tileSize;
 return {x,y,w:Math.min(tileSize,width-x),h:Math.min(tileSize,height-y)};
}

export function composite(ctx, stroke, image, x, y, mask=1){
 ctx.save();
 ctx.globalAlpha=(stroke.brush.accumulate?1:stroke.opacity)*mask;
 ctx.globalCompositeOperation={over:'source-over',erase:'destination-out',behind:'destination-over','alpha-lock':'source-atop'}[stroke.brush.blend];
 ctx.drawImage(image,x,y);
 ctx.restore();
}

function tipPath(ctx,tip){
 ctx.beginPath();
 if(tip==='round') ctx.arc(0,0,1,0,2*Math.PI);
 else if(tip==='square') ctx.rect(-1,-1,2,2);
 else {ctx.moveTo(0,-1);ctx.lineTo(1,0);ctx.lineTo(0,1);ctx.lineTo(-1,0);ctx.closePath()}
}

function drawTip(ctx, dab, brush, x, y){
 const radius=dab.size/2;
 ctx.translate(x,y);
 ctx.rotate(angle(dab.angle));
 ctx.scale(radius,radius*dab.aspect);
 ctx.transform(1,0,dab.shear,1,0,0);
 if(brush.tip==='bitmap'){
  ctx.drawImage(bitmap(brush.asset),-1,-1,2,2);
  return;
 }
 ctx.fillStyle='#000';
 if(dab.hardness<1){
  const gradient=ctx.createRadialGradient(0,0,dab.hardness,0,0,1);
  for(let i=0;i<=8;i++){
   const t=i/8;
   gradient.addColorStop(t,'rgba(0,0,0,'+(1-t*t*(3-2*t))+')');
  }
  ctx.fillStyle=gradient;
 }
 tipPath(ctx,brush.tip);
 ctx.fill();
}

/** One bounded scratch image is reused by all dabs of this ink buffer. */
export class Ink {
 constructor(stroke,width,height,previewOnly=false){
  this.stroke=stroke;this.width=width;this.height=height;
  this.columns=Math.ceil(width/tileSize);this.previewOnly=previewOnly;
  this.tiles=new Map();
  this.changed=new Set();
 }
 stamp(dab){for(const _ of this.stampSteps(dab)){} }
 *stampSteps(dab){
  const s=this.stroke,b=s.brush;
  const opacity=dab.opacity*dab.flow*s.colorAlpha*(b.accumulate?s.opacity:1);
  if(!opacity || !dab.size) return;
  const r=dab.size/2;
  const a=angle(dab.angle), sin=Math.sin(a), cos=Math.cos(a);
  const dx=r*(Math.abs(cos)+Math.abs(cos*dab.shear-sin*dab.aspect))+1;
  const dy=r*(Math.abs(sin)+Math.abs(sin*dab.shear+cos*dab.aspect))+1;
  const cx=s.wrap?mod(dab.x,this.width):dab.x,cy=s.wrap?mod(dab.y,this.height):dab.y;
  const copies=(center,radius,length)=>{
   if(!s.wrap)return [center];
   const start=Math.ceil((-center-radius)/length),end=Math.floor((length-center+radius)/length);
   if(end-start>8192)throw Error('元タイルに対して先端が大きすぎます');
   return Array.from({length:end-start+1},(_,i)=>center+(start+i)*length);
  };
  const rows=copies(cy,dy,this.height),columns=copies(cx,dx,this.width);
  const overlap=s.wrap&&(2*dx>this.width||2*dy>this.height);
  if(overlap&&rows.length*columns.length>8192)throw Error('元タイルに対して先端が大きすぎます');
  if(this.previewOnly&&overlap&&rows.length*columns.length>12)return;
  const wrapped=overlap?new Map():null;
  for(const y of rows) for(const x of columns){
   const left=Math.max(0,Math.floor(x-dx)), top=Math.max(0,Math.floor(y-dy));
   const right=Math.min(this.width,Math.ceil(x+dx)), bottom=Math.min(this.height,Math.ceil(y+dy));
   if(left>=right||top>=bottom) continue;
   const lastX=Math.ceil(right/tileSize), lastY=Math.ceil(bottom/tileSize);
   const simple=dab.hardness===1 && b.tip!=='bitmap' && (!dab.depth || b.texture==='none');
   const stamp=simple?null:this.maskedTip(dab,x,y,left,top,right-left,bottom-top);
   for(let row=Math.floor(top/tileSize);row<lastY;row++) for(let col=Math.floor(left/tileSize);col<lastX;col++){
    const key=row*this.columns+col, box=tileBox(key,this.width,this.height);
    let tile;
    if(overlap){
     if(!this.wrapScratch||this.wrapScratch.width!==box.w||this.wrapScratch.height!==box.h)this.wrapScratch=surface(box.w,box.h);
     tile=this.wrapScratch;
     tile.getContext('2d',{willReadFrequently:true}).clearRect(0,0,box.w,box.h);
    }else tile=this.getTile(key,box);
    const ctx=tile.getContext('2d');
    ctx.save();ctx.translate(-box.x,-box.y);
    ctx.globalAlpha=overlap?1:opacity;
    if(stamp) ctx.drawImage(stamp,0,0,right-left,bottom-top,left,top,right-left,bottom-top);
    else {
     const radius=dab.size/2;
     ctx.fillStyle='rgb('+dab.color.join(',')+')';
     ctx.translate(x,y);ctx.rotate(a);ctx.scale(radius,radius*dab.aspect);ctx.transform(1,0,dab.shear,1,0,0);
     tipPath(ctx,b.tip);ctx.fill();
    }
    ctx.restore();
    if(overlap){
     const layer=ctx.getImageData(0,0,box.w,box.h),merged=wrapped.get(key);
     if(!merged)wrapped.set(key,layer);
     else for(let i=3;i<layer.data.length;i+=4)if(layer.data[i]>merged.data[i]){
      merged.data[i-3]=layer.data[i-3];merged.data[i-2]=layer.data[i-2];
      merged.data[i-1]=layer.data[i-1];merged.data[i]=layer.data[i];
     }
    }else this.changed.add(key);
    yield key;
   }
  }
  for(const [key,image] of wrapped||[]){
   const box=tileBox(key,this.width,this.height);
   if(!this.wrapScratch||this.wrapScratch.width!==box.w||this.wrapScratch.height!==box.h)this.wrapScratch=surface(box.w,box.h);
   this.wrapScratch.getContext('2d',{willReadFrequently:true}).putImageData(image,0,0);
   const ctx=this.getTile(key,box).getContext('2d');
   ctx.globalAlpha=opacity;ctx.drawImage(this.wrapScratch,0,0);ctx.globalAlpha=1;
   this.changed.add(key);yield key;
  }
 }
 getTile(key,box){
  let tile=this.tiles.get(key);
  if(!tile){tile=surface(box.w,box.h);this.tiles.set(key,tile)}
  return tile;
 }
 maskedTip(dab,x,y,left,top,width,height){
  if(!this.scratch || this.scratch.width<width || this.scratch.height<height){
   this.scratch=surface(Math.max(width,this.scratch?.width||0),Math.max(height,this.scratch?.height||0));
  }
  const ctx=this.scratch.getContext('2d'), b=this.stroke.brush;
  ctx.clearRect(0,0,width,height);
  ctx.save();ctx.translate(-left,-top);drawTip(ctx,dab,b,x,y);ctx.restore();
  if(dab.depth && b.texture!=='none'){
   ctx.save();
   const pattern=ctx.createPattern(texture(b.texture),'repeat');
   const tipAttached=b.textureAnchor==='stroke';
   const transform=this.stroke.wrap&&!tipAttached
    ?repeatTextureTransform(left,top,this.width,this.height,b.textureAngle,dab.textureScale)
    :new DOMMatrix().translate((tipAttached?x:0)-left,(tipAttached?y:0)-top)
      .rotate(b.textureAngle+(tipAttached?dab.direction:0)).scale(dab.textureScale);
   pattern.setTransform(transform);
   // Destination-in with a partially transparent pattern uses the original tip once.
   // Build the weighted texture on a tiny cached-pattern surface first.
   if(!this.grain || this.grain.width<width || this.grain.height<height) this.grain=surface(this.scratch.width,this.scratch.height);
   const gc=this.grain.getContext('2d');
   gc.clearRect(0,0,width,height);
   gc.fillStyle='rgba(0,0,0,'+(1-dab.depth)+')';gc.fillRect(0,0,width,height);
   // lighter gives (1-depth) + depth * texture without compounding alpha.
   gc.globalCompositeOperation='lighter';gc.globalAlpha=dab.depth;
   gc.fillStyle=pattern;gc.fillRect(0,0,width,height);
   gc.globalCompositeOperation='source-over';gc.globalAlpha=1;
   ctx.globalCompositeOperation='destination-in';ctx.drawImage(this.grain,0,0);
   ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation='source-in';ctx.fillStyle='rgb('+dab.color.join(',')+')';ctx.fillRect(0,0,width,height);
  ctx.restore();
  return this.scratch;
 }
 finishTile(key){
  const selection=this.stroke.selection;
  if(!selection)return;
  const {x,y,w,h}=tileBox(key,this.width,this.height),ctx=this.tiles.get(key).getContext('2d');
  // The frozen demo mask is uniform within an axis-aligned rectangle.
  const left=Math.max(0,selection.x-x),top=Math.max(0,selection.y-y);
  const right=Math.min(w,selection.x+selection.w-x),bottom=Math.min(h,selection.y+selection.h-y);
  if(right<=left||bottom<=top){ctx.clearRect(0,0,w,h);return}
  ctx.clearRect(0,0,w,top);ctx.clearRect(0,bottom,w,h-bottom);
  ctx.clearRect(0,top,left,bottom-top);ctx.clearRect(right,top,w-right,bottom-top);
  ctx.save();ctx.globalCompositeOperation='destination-out';ctx.fillStyle='rgba(0,0,0,'+(1-selection.alpha)+')';
  ctx.fillRect(0,0,w,h);ctx.restore();
 }
}
export function rasterize(stroke,width,height){
 const ink=new Ink(stroke,width,height);
 let stamps=0;
 for(const dab of strokeDabs(stroke)){
  if(++stamps>250000) throw Error('この筆のスタンプ数が上限を超えました。間隔を広げるか筆を分割してください');
  const particles=Math.round(dab.particles);
  for(let i=0;i<particles;i++){
   if(i===0){ink.stamp(dab);continue}
   const radians=i*2.3999632297;
   ink.stamp({...dab,x:dab.x+Math.cos(radians)*dab.size*.42,y:dab.y+Math.sin(radians)*dab.size*.42,size:dab.size*.21});
  }
 }
 for(const key of ink.tiles.keys()) ink.finishTile(key);
 return {ink,stamps};
}
