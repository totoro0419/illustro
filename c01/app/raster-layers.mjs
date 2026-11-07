/** C03 retained layer compositor. Fast native Canvas2D path is unchanged for
 * ordinary raster layers; exceptional masks/Blend If use scoped tile readback.
 * Stored images are never flattened by changing appearance metadata.
 */
import {BLEND_MODES,blendRgb,sourceOver} from './blend-kernels.mjs';
import {blendIfWeights} from './blend-if.mjs';
const nativeModes=new Set(['normal','darken','multiply','color-burn','lighten','screen','color-dodge','overlay','soft-light','hard-light','difference','exclusion','hue','saturation','color','luminosity']);
const nativeName=mode=>mode==='normal'?'source-over':mode;
const clamp=x=>Math.max(0,Math.min(1,x));
const defaultLayer={id:'raster-1',type:'raster',name:'レイヤー1',lifetime:1,visible:true,opacity:1,blendMode:'normal',locks:{}};
const range255=x=>Math.max(0,Math.min(255,Math.round(x*255)));
export class RasterLayerStore {
 constructor(width,height){
  this.width=width;this.height=height;this.surfaces=new Map();this.layers=[];this.soloId=null;
  this.setLayers([defaultLayer]);
 }
 getSurface(id,lifetime=1,mask=false){
  const key=mask?id+'::mask':id;
  const old=this.surfaces.get(key);
  if(old){if(old.lifetime!==lifetime)throw Error('Layer lifetime mismatch');return old;}
  const canvas=new OffscreenCanvas(this.width,this.height),ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('Layer context unavailable');
  if(mask){ctx.fillStyle='#fff';ctx.fillRect(0,0,this.width,this.height);}
  const result={canvas,ctx,lifetime};this.surfaces.set(key,result);return result;
 }
 setLayers(next){
  if(!Array.isArray(next)||!next.length||next.length>100)throw Error('Layer count unsupported');
  const set=new Set(),groups=new Set();
  for(const layer of next){
   if(!['raster','group'].includes(layer.type)||typeof layer.id!=='string'||!layer.id||set.has(layer.id)||!Number.isInteger(layer.lifetime)||layer.lifetime<1)throw Error('Invalid layer');
   if(!BLEND_MODES.includes(layer.blendMode||'normal')&&layer.blendMode!=='dissolve')throw Error('Unsupported composite mode');
   if(!Number.isFinite(layer.opacity)||layer.opacity<0||layer.opacity>1)throw Error('Invalid opacity');
   set.add(layer.id);if(layer.type==='group')groups.add(layer.id);
  }
  for(const layer of next){
   if(layer.parentId!=null&&!groups.has(layer.parentId))throw Error('Missing group parent');
   let at=layer.parentId;const visited=new Set([layer.id]);
   while(at!=null){if(visited.has(at))throw Error('Cyclic layer groups');visited.add(at);at=next.find(l=>l.id===at)?.parentId??null;}
   if(layer.type==='raster'){this.getSurface(layer.id,layer.lifetime);if(layer.mask)this.getSurface(layer.id,layer.lifetime,true);}
  }
  this.layers=structuredClone(next);
  if(this.soloId&&!set.has(this.soloId))this.soloId=null;
 }
 drawingContext(target){
  const id=target?.id||'raster-1',generation=target?.lifetime??1;
  const layer=this.layers.find(l=>l.id===id&&l.lifetime===generation);
  if(!layer||layer.type!=='raster')throw Error('Drawing target was removed or replaced');
  if(layer.locks?.pixels||layer.locks?.all)throw Error('Drawing target is locked');
  if(target?.mask&&!layer.mask)throw Error('Mask target was removed');
  return this.getSurface(id,generation,Boolean(target?.mask)).ctx;
 }
 /** Apply one committed stroke to an alpha-locked layer without changing α. */
 preserveAlpha(target,before,box){
  if(target?.mask)return;
  const layer=this.layers.find(l=>l.id===target?.id);
  if(!layer?.alphaLock)return;
  const context=this.drawingContext(target),after=context.getImageData(box.x,box.y,box.w,box.h);
  for(let i=0;i<after.data.length;i+=4){
   const a=before.data[i+3];after.data[i+3]=a;
   if(!a)after.data.fill(0,i,i+3);
  }
  context.putImageData(after,box.x,box.y);
 }
 /** Color data is straight RGBA; clipping and pixel/vector masks are applied
  * before blending. Alpha contributions are combined exactly once.
  */
 layerData(layer,box){
  const surface=this.getSurface(layer.id,layer.lifetime);
  const data=surface.ctx.getImageData(box.x,box.y,box.w,box.h).data;
  const result=new Uint8ClampedArray(data);
  if(layer.mask?.enabled!==false&&layer.mask){
   const mask=this.getSurface(layer.id,layer.lifetime,true).ctx.getImageData(box.x,box.y,box.w,box.h).data;
   for(let i=0;i<result.length;i+=4){
    const value=((mask[i]*.3+mask[i+1]*.59+mask[i+2]*.11)/255)*(mask[i+3]/255);
    result[i+3]=Math.round(result[i+3]*(layer.mask.inverted?1-value:value));
   }
  }
  const vector=layer.vectorMask;
  if(vector?.enabled){
   const [rx,ry,rw,rh]=vector.rect||[0,0,this.width,this.height];
   for(let y=0;y<box.h;y++)for(let x=0;x<box.w;x++){
    const inside=box.x+x>=rx&&box.x+x<rx+rw&&box.y+y>=ry&&box.y+y<ry+rh;
    if(Boolean(inside)===Boolean(vector.inverted))result[(y*box.w+x)*4+3]=0;
   }
  }
  return result;
 }
 blend(bottom,top,box,layer,clip=null){
  const result=new Uint8ClampedArray(bottom),mode=layer.blendMode||'normal';
  const opacity=layer.opacity;
  let hash=0;for(let i=0;i<layer.id.length;i++)hash=(Math.imul(hash,31)+layer.id.charCodeAt(i))|0;
  for(let p=0;p<result.length;p+=4){
   let alpha=top[p+3]/255*opacity;
   if(clip)alpha*=clip[p+3]/255;
   if(!alpha)continue;
   let base=[result[p]/255,result[p+1]/255,result[p+2]/255,result[p+3]/255];
   const src=[top[p]/255,top[p+1]/255,top[p+2]/255,alpha];
   if(layer.blendIf){
    const weight=blendIfWeights(base,src,layer.blendIf);
    src[3]*=weight.backdrop*weight.source;
    if(!src[3])continue;
   }
   if(mode==='dissolve'){
    const x=(p/4)%box.w,y=Math.floor(p/4/box.w);
    const n=(Math.imul(x+box.x+1,374761393)^Math.imul(y+box.y+1,668265263)^hash)>>>0;
    const sample=((Math.imul(n^(n>>>13),1274126177)>>>0)/4294967296);
    if(sample>=src[3])continue;
    src[3]=1;
   }
   const out=sourceOver(base,src,mode==='dissolve'?'normal':mode);
   for(let c=0;c<4;c++)result[p+c]=range255(out[c]);
  }
  return result;
 }
 renderTile(ctx,b){
  ctx.clearRect(b.x,b.y,b.w,b.h);
  const visible=this.layers.filter(l=>l.visible&&l.opacity>0);
  const basic=!this.soloId&&visible.length===this.layers.length&&this.layers.every(l=>l.type==='raster'&&!l.parentId&&!l.clipped&&!l.mask&&!l.vectorMask&&!l.blendIf&&nativeModes.has(l.blendMode||'normal'));
  if(basic){
   for(const layer of this.layers){
    ctx.save();ctx.globalAlpha=layer.opacity;ctx.globalCompositeOperation=nativeName(layer.blendMode||'normal');
    ctx.drawImage(this.getSurface(layer.id,layer.lifetime).canvas,b.x,b.y,b.w,b.h,b.x,b.y,b.w,b.h);ctx.restore();
   }
   return;
  }
  const compose=(parentId)=>{
   let output=new Uint8ClampedArray(b.w*b.h*4),lastBase=null;
   for(const layer of this.layers){
    if((layer.parentId??null)!==parentId)continue;
    if(this.soloId){
     if(layer.id!==this.soloId&&layer.type!=='group'&&!this.isDescendant(layer.id,this.soloId))continue;
     if(layer.type==='group'&&layer.id!==this.soloId&&!this.isAncestor(layer.id,this.soloId))continue;
    }else if(!layer.visible||layer.opacity===0)continue;
    const pixels=layer.type==='group'?compose(layer.id):this.layerData(layer,b);
    if(layer.clipped&&lastBase)output=this.blend(output,pixels,b,layer,lastBase);
    else {output=this.blend(output,pixels,b,layer);lastBase=pixels;}
   }
   return output;
  };
  const pixels=compose(null);
  ctx.putImageData(new ImageData(pixels,b.w,b.h),b.x,b.y);
 }
 isAncestor(parent,child){
  let layer=this.layers.find(l=>l.id===child),count=0;
  while(layer?.parentId&&count++<100){
   if(layer.parentId===parent)return true;
   layer=this.layers.find(l=>l.id===layer.parentId);
  }
  return false;
 }
 isDescendant(child,parent){return this.isAncestor(parent,child);}
 async loadLayers(entries){
  const decoded=[];
  try{
   for(const layer of entries){
    if(layer.type!=='raster')continue;
    const bitmap=await createImageBitmap(await(await fetch(layer.png)).blob());
    if(bitmap.width!==this.width||bitmap.height!==this.height)throw Error('Layer dimension mismatch');
    decoded.push({layer,bitmap,mask:false});
    if(layer.mask?.png){
     const mask=await createImageBitmap(await(await fetch(layer.mask.png)).blob());
     if(mask.width!==this.width||mask.height!==this.height){mask.close();throw Error('Mask dimension mismatch');}
     decoded.push({layer,bitmap:mask,mask:true});
    }
   }
   this.surfaces.clear();
   this.setLayers(entries.map(layer=>{
    const copy=structuredClone(layer);delete copy.png;if(copy.mask)delete copy.mask.png;return copy;
   }));
   for(const {layer,bitmap,mask} of decoded){
    const ctx=this.getSurface(layer.id,layer.lifetime,mask).ctx;
    if(mask)ctx.clearRect(0,0,this.width,this.height);
    ctx.drawImage(bitmap,0,0);
   }
  }finally{for(const {bitmap}of decoded)bitmap.close();}
 }
 async nativeLayers(){
  const results=[];
  const reader=new FileReaderSync();
  for(const layer of this.layers){
   const next=structuredClone(layer);
   if(layer.type==='raster'){
    next.png=reader.readAsDataURL(await this.getSurface(layer.id,layer.lifetime).canvas.convertToBlob({type:'image/png'}));
    if(layer.mask)next.mask={...next.mask,png:reader.readAsDataURL(await this.getSurface(layer.id,layer.lifetime,true).canvas.convertToBlob({type:'image/png'}))};
   }
   results.push(next);
  }
  return results;
 }
}