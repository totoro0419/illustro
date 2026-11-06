/** CPU-only provisional composition. Exact formal tiles bypass all brush math.
 * No Canvas context, readback or GPU stamp is required on this presentation path.
 */
// Shared bounded sampling tables: brush-size changes cannot grow this cache
// indefinitely. Both axes use the same exact bilinear coordinates as before.
const axes=new Map();
function samplingAxis(length,limit,scale){
 const key=length+'/'+limit+'/'+scale;let axis=axes.get(key);if(axis)return axis;
 axis={left:new Uint32Array(length),right:new Uint32Array(length),weight:new Float64Array(length)};
 for(let i=0;i<length;i++){const u=(i+.5)*scale-.5,base=Math.floor(u);axis.left[i]=Math.min(limit-1,Math.max(0,base))*4;axis.right[i]=Math.min(limit-1,Math.max(0,base+1))*4;axis.weight[i]=u-base}
 if(axes.size>=32)axes.delete(axes.keys().next().value);axes.set(key,axis);return axis;
}
export function previewComposite(base,candidates,key,box){
 const image=new ImageData(base?new Uint8ClampedArray(base.data):new Uint8ClampedArray(box.w*box.h*4),box.w,box.h),out=image.data;
 for(const candidate of candidates){
  if(!candidate.visible)continue;
  const ink=candidate.ink.tiles.get(key);if(!ink)continue;
  const stroke=candidate.stroke,selection=stroke.selection,scale=candidate.ink.scale;
  const opacity=(stroke.brush.accumulate?1:stroke.opacity)*(selection?.alpha??1);
  const w=ink.width,h=ink.height,src=ink.data,blend=stroke.brush.blend;
  const ax=scale===1?null:samplingAxis(box.w,w,scale),ay=scale===1?null:samplingAxis(box.h,h,scale);
  for(let y=0;y<box.h;y++){
   const top=ay?ay.left[y]*w:0,bottom=ay?ay.right[y]*w:0,fy=ay?ay.weight[y]:0;
   for(let x=0;x<box.w;x++){
   if(selection&&(box.x+x<selection.x||box.y+y<selection.y||box.x+x>=selection.x+selection.w||box.y+y>=selection.y+selection.h))continue;
   let a=0,r=0,g=0,b=0;
   if(scale===1){
    // Native-size preview pixels land on integer centres: bilinear weights
    // are exactly (1,0,0,0), so avoid four taps and their clamp arithmetic.
    const p=(y*w+x)*4;a=src[p+3]/255;r=src[p]*a;g=src[p+1]*a;b=src[p+2]*a;
   }else{
   const left=ax.left[x],right=ax.right[x],fx=ax.weight[x];
   for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
    const p=(dy?bottom:top)+(dx?right:left),weight=(dx?fx:1-fx)*(dy?fy:1-fy),wa=src[p+3]/255*weight;
    a+=wa;r+=src[p]*wa;g+=src[p+1]*wa;b+=src[p+2]*wa;
   }
   }
   if(!a)continue;
   const i=(y*box.w+x)*4,da=out[i+3]/255,sa=a*opacity;
   let next,source,destination;
   if(blend==='erase'){next=da*(1-sa);source=0;destination=next}
   else if(blend==='behind'){source=sa*(1-da);destination=da;next=source+destination}
   else if(blend==='alpha-lock'){next=da;source=sa*da;destination=da*(1-sa)}
   else {source=sa;destination=da*(1-sa);next=source+destination}
   if(next>0){out[i]=(r/a*source+out[i]*destination)/next;out[i+1]=(g/a*source+out[i+1]*destination)/next;out[i+2]=(b/a*source+out[i+2]*destination)/next;out[i+3]=next*255}
   else out.fill(0,i,i+4);
   }
  }
 }
 return image;
}
