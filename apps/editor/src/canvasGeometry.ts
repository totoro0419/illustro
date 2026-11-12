/**
 * M08 destructive document geometry. All pixel buffers are straight-alpha RGBA8,
 * row-major, document-sized; navigation never calls these functions.
 */
export type ImageResample='auto'|'nearest'|'bilinear'|'bicubic'|'area';
type Pixels=Uint8Array|Uint8ClampedArray;
function dimensions(w:number,h:number){if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<1||h<1||w>8192||h>8192)throw Error('Invalid artwork dimensions');}
function verify(source:Pixels,w:number,h:number){dimensions(w,h);if(source.length!==w*h*4)throw Error('Source pixel buffer mismatch');}

/** Canvas Resize: shift/crop bounds while preserving every included source pixel bit-for-bit. */
export function changeCanvasBounds(source:Pixels,w:number,h:number,newW:number,newH:number,shiftX:number,shiftY:number){
 verify(source,w,h);dimensions(newW,newH);if(!Number.isInteger(shiftX)||!Number.isInteger(shiftY))throw Error('Invalid canvas offset');
 const out=new Uint8Array(newW*newH*4),left=Math.max(0,shiftX),right=Math.min(newW,w+shiftX),top=Math.max(0,shiftY),bottom=Math.min(newH,h+shiftY);
 if(right<=left||bottom<=top)return out;
 for(let y=top;y<bottom;y++)out.set(source.subarray(((y-shiftY)*w+left-shiftX)*4,((y-shiftY)*w+right-shiftX)*4),(y*newW+left)*4);
 return out;
}
/** Crop uses source pixel bounds (left/top inclusive). */
export function cropCanvas(source:Pixels,w:number,h:number,x:number,y:number,cropW:number,cropH:number){
 if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(cropW)||!Number.isInteger(cropH)||cropW<1||cropH<1||x<0||y<0||x+cropW>w||y+cropH>h)throw Error('Crop must be inside existing artwork');
 return changeCanvasBounds(source,w,h,cropW,cropH,-x,-y);
}
export function shiftedForAnchor(oldW:number,oldH:number,newW:number,newH:number,anchor:'center'|'top-left'|'top-right'|'bottom-left'|'bottom-right'){
 dimensions(oldW,oldH);dimensions(newW,newH);
 const x=newW-oldW,y=newH-oldH;
 if(anchor==='center')return {x:Math.floor(x/2),y:Math.floor(y/2)};
 if(anchor==='top-left')return {x:0,y:0};
 if(anchor==='top-right')return {x,y:0};
 if(anchor==='bottom-left')return {x:0,y};
 if(anchor==='bottom-right')return {x,y};
 throw Error('Unknown canvas anchor');
}
const clamp=(n:number,lower:number,upper:number)=>Math.max(lower,Math.min(upper,n));
const cubic=(x:number)=>{const B=1/3,C=1/3,d=Math.abs(x);return d<1?((12-9*B-6*C)*d*d*d+(-18+12*B+6*C)*d*d+(6-2*B))/6:d<2?((-B-6*C)*d*d*d+(6*B+30*C)*d*d+(-12*B-48*C)*d+(8*B+24*C))/6:0;};
function forWeights(x:number,ratio:number,method:'bilinear'|'bicubic'|'area',limit:number,cb:(i:number,w:number)=>void){
 if(method==='area'){
   const from=x*ratio,to=(x+1)*ratio;
   for(let i=Math.floor(from);i<Math.ceil(to);i++){const weight=Math.max(0,Math.min(to,i+1)-Math.max(from,i));if(weight>0)cb(clamp(i,0,limit-1),weight/ratio);}
   return;
 }
 const center=(x+.5)*ratio-.5,range=method==='bilinear'?1:2;
 for(let i=Math.floor(center)-range+1;i<=Math.floor(center)+range;i++){const w=method==='bilinear'?Math.max(0,1-Math.abs(i-center)):cubic(i-center);if(w!==0)cb(clamp(i,0,limit-1),w);}
}
/** Premultiplied-alpha weighted color prevents dark/bright fringe at transparent boundaries. */
export function resizeImagePixels(source:Pixels,w:number,h:number,newW:number,newH:number,requested:ImageResample='auto'){
 verify(source,w,h);dimensions(newW,newH);
 const method:Exclude<ImageResample,'auto'>=requested==='auto'?(newW<w/1.5||newH<h/1.5?'area':'bicubic'):requested;
 if(!['nearest','bilinear','bicubic','area'].includes(method))throw Error('Unsupported interpolation');
 if(newW===w&&newH===h)return Uint8Array.from(source);
 const out=new Uint8Array(newW*newH*4),rx=w/newW,ry=h/newH;
 if(method==='nearest'){
   for(let y=0;y<newH;y++)for(let x=0;x<newW;x++){const sx=clamp(Math.floor((x+.5)*rx),0,w-1),sy=clamp(Math.floor((y+.5)*ry),0,h-1),a=(sy*w+sx)*4,b=(y*newW+x)*4;out.set(source.subarray(a,a+4),b);}return out;
 }
 const sampleMethod=method;
 for(let y=0;y<newH;y++){
   const wy:Array<[number,number]>=[];forWeights(y,ry,sampleMethod,h,(i,w)=>wy.push([i,w]));
   for(let x=0;x<newW;x++){
     const wx:Array<[number,number]>=[];forWeights(x,rx,sampleMethod,w,(i,weight)=>wx.push([i,weight]));
     let a=0,r=0,g=0,b=0,total=0;
     for(const [sy,wyv] of wy)for(const [sx,wxv] of wx){
       const v=wyv*wxv,i=(sy*w+sx)*4,alpha=(source[i+3]??0)/255;
       total+=v;a+=v*alpha;r+=v*alpha*(source[i]??0);g+=v*alpha*(source[i+1]??0);b+=v*alpha*(source[i+2]??0);
     }
     const p=(y*newW+x)*4,opacity=total===0?0:clamp(a/total,0,1);
     out[p+3]=Math.round(opacity*255);
     if(a>1e-8){out[p]=Math.round(clamp(r/a,0,255));out[p+1]=Math.round(clamp(g/a,0,255));out[p+2]=Math.round(clamp(b/a,0,255));}
   }
 }
 return out;
}
