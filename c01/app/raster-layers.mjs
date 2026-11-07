/** C03 raster-only layer store. Individual raster canvases remain authoritative. */
export class RasterLayerStore {
 constructor(width,height){
  this.width=width;this.height=height;this.surfaces=new Map();
  this.layers=[];this.soloId=null;
  this.setLayers([{id:'raster-1',type:'raster',name:'レイヤー1',lifetime:1,visible:true,opacity:1,blendMode:'normal',locks:{}}]);
 }
 getSurface(id,lifetime=1){
  const old=this.surfaces.get(id);
  if(old){if(old.lifetime!==lifetime)throw Error('Layer lifetime mismatch');return old;}
  const canvas=new OffscreenCanvas(this.width,this.height);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('Layer context unavailable');
  const result={canvas,ctx,lifetime};
  this.surfaces.set(id,result);return result;
 }
 setLayers(next){
  if(!Array.isArray(next)||!next.length||next.length>100)throw Error('Layer count unsupported');
  const set=new Set();
  for(const l of next){
   if(l.type!=='raster'||!l.id||set.has(l.id)||!Number.isInteger(l.lifetime)||l.lifetime<1)throw Error('Invalid raster layer');
   if(!['normal','multiply','screen'].includes(l.blendMode||'normal'))throw Error('Unsupported composite mode');
   if(!Number.isFinite(l.opacity)||l.opacity<0||l.opacity>1)throw Error('Invalid layer opacity');
   set.add(l.id);this.getSurface(l.id,l.lifetime);
  }
  this.layers=structuredClone(next);
 }
 drawingContext(target){
  const id=target?.id||'raster-1',generation=target?.lifetime??1;
  const layer=this.layers.find(l=>l.id===id&&l.lifetime===generation);
  if(!layer)throw Error('Drawing target was removed or replaced');
  if(layer.locks?.pixels||layer.locks?.all)throw Error('Drawing target is locked');
  return this.getSurface(id,generation).ctx;
 }
 renderTile(ctx,b){
  ctx.clearRect(b.x,b.y,b.w,b.h);
  for(const l of this.layers){
   if((this.soloId?l.id!==this.soloId:!l.visible)||l.opacity===0)continue;
   ctx.save();ctx.globalAlpha=l.opacity;
   ctx.globalCompositeOperation=({'normal':'source-over','multiply':'multiply','screen':'screen'})[l.blendMode||'normal'];
   ctx.drawImage(this.getSurface(l.id,l.lifetime).canvas,b.x,b.y,b.w,b.h,b.x,b.y,b.w,b.h);
   ctx.restore();
  }
 }
 async loadLayers(entries){
  const decoded=[];
  try{
   for(const layer of entries){
    const bitmap=await createImageBitmap(await (await fetch(layer.png)).blob());
    if(bitmap.width!==this.width||bitmap.height!==this.height)throw Error('Layer dimension mismatch');
    decoded.push({layer,bitmap});
   }
   this.setLayers(entries.map(({png,...meta})=>meta));
   for(const {layer,bitmap}of decoded)this.getSurface(layer.id,layer.lifetime).ctx.drawImage(bitmap,0,0);
  }finally{for(const {bitmap}of decoded)bitmap.close()}
 }
 async nativeLayers(){
  const results=[];
  for(const l of this.layers){
   const blob=await this.getSurface(l.id,l.lifetime).canvas.convertToBlob({type:'image/png'});
   results.push({...structuredClone(l),png:new FileReaderSync().readAsDataURL(blob)});
  }
  return results;
 }
}
