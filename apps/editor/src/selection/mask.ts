/** C06 per-pixel selection density, independent of raster layer content. */
export type CombineMode='replace'|'add'|'subtract'|'intersect';
export type SelectionShape=
 | Readonly<{type:'rectangle'|'ellipse';x:number;y:number;width:number;height:number}>
 | Readonly<{type:'polygon'|'lasso';points:readonly Readonly<{x:number;y:number}>[]}>;
export type MaskData=Readonly<{width:number;height:number;alpha:Uint8Array}>;

const limit=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const coverage=(value:number)=>Math.round(limit(value,0,1)*255);
const inPolygon=(x:number,y:number,points:readonly {x:number;y:number}[])=>{
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i]!,b=points[j]!;
    if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
};
export function rasterizeSelection(shape:SelectionShape,width:number,height:number):MaskData{
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>64_000_000)
    throw Error('選択範囲の作品の大きさが正しくありません。');
  const output=new Uint8Array(width*height);
  const points='points' in shape?shape.points:[];
  const bounds=points.length?
    {x:Math.min(...points.map(p=>p.x)),y:Math.min(...points.map(p=>p.y)),
      width:Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),
      height:Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y))}:shape as Extract<SelectionShape,{x:number}>;
  const x0=limit(Math.floor(bounds.x)-1,0,width),y0=limit(Math.floor(bounds.y)-1,0,height);
  const x1=limit(Math.ceil(bounds.x+bounds.width)+1,0,width);
  const y1=limit(Math.ceil(bounds.y+bounds.height)+1,0,height);
  if(!Number.isFinite(x0+y0+x1+y1)||x0>=x1||y0>=y1)return {width,height,alpha:output};
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    let count=0;
    for(const oy of [.25,.75])for(const ox of [.25,.75]){
      const sx=x+ox,sy=y+oy;
      let hit=false;
      if(shape.type==='rectangle')
        hit=sx>=shape.x&&sx<shape.x+shape.width&&sy>=shape.y&&sy<shape.y+shape.height;
      else if(shape.type==='ellipse'){
        const rx=shape.width/2,ry=shape.height/2;
        hit=rx>0&&ry>0&&((sx-shape.x-rx)/rx)**2+((sy-shape.y-ry)/ry)**2<=1;
      }else hit=points.length>=3&&inPolygon(sx,sy,points);
      if(hit)count++;
    }
    if(count)output[y*width+x]=count*255/4;
  }
  return {width,height,alpha:output};
}
export function combineSelection(previous:MaskData|null,next:MaskData,mode:CombineMode):MaskData{
  if(mode==='replace')return next;
  // Subtraction/intersection against an empty selection must remain empty.
  if(!previous)return mode==='add'?next:{width:next.width,height:next.height,alpha:new Uint8Array(next.alpha.length)};
  if(previous.width!==next.width||previous.height!==next.height)throw Error('範囲の大きさが異なります。');
  const data=new Uint8Array(next.alpha.length);
  for(let i=0;i<data.length;i++){
    const a=previous.alpha[i]!,b=next.alpha[i]!;
    data[i]=mode==='add'?Math.max(a,b):
      mode==='subtract'?Math.max(0,a-b):
      Math.round(a*b/255);
  }
  return {width:next.width,height:next.height,alpha:data};
}
export function invertSelection(mask:MaskData):MaskData{
  return {width:mask.width,height:mask.height,alpha:Uint8Array.from(mask.alpha,x=>255-x)};
}
export function fullSelection(width:number,height:number):MaskData{
  return {width,height,alpha:new Uint8Array(width*height).fill(255)};
}
export function boundsOfSelection(mask:MaskData):Readonly<{x:number;y:number;width:number;height:number}>|null{
  const {width,height,alpha}=mask;
  let x0=width,y0=height,x1=0,y1=0,hit=false;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)
    if(alpha[y*width+x]!==0){hit=true;x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);}
  return hit?{x:x0,y:y0,width:x1-x0,height:y1-y0}:null;
}
export function translateSelection(mask:MaskData,dx:number,dy:number):MaskData{
  const offsetX=Math.round(dx),offsetY=Math.round(dy);
  const result=new Uint8Array(mask.alpha.length);
  for(let y=0;y<mask.height;y++){
    const sy=y-offsetY;
    if(sy<0||sy>=mask.height)continue;
    const fromX=Math.max(0,-offsetX),endX=Math.min(mask.width,mask.width-offsetX);
    if(fromX>=endX)continue;
    result.set(mask.alpha.subarray(sy*mask.width+fromX,sy*mask.width+endX),
      y*mask.width+fromX+offsetX);
  }
  return {width:mask.width,height:mask.height,alpha:result};
}
/** Copy only the selected rectangle's alpha for a small clipboard job.
 * Never transfer or scan the full 4K mask in a small selection copy. */
export function cropSelectionMask(mask:MaskData,area:Readonly<{x:number;y:number;width:number;height:number}>):MaskData{
  const {x,y,width,height}=area;
  if(![x,y,width,height,mask.width,mask.height].every(Number.isSafeInteger)||
    width<1||height<1||x<0||y<0||x+width>mask.width||y+height>mask.height||
    mask.alpha.length!==mask.width*mask.height)
    throw Error('切り出す選択範囲が正しくありません。');
  const alpha=new Uint8Array(width*height);
  for(let row=0;row<height;row++)
    alpha.set(mask.alpha.subarray((y+row)*mask.width+x,(y+row)*mask.width+x+width),row*width);
  return {width,height,alpha};
}
export function maskImage(pixels:Uint8Array|Uint8ClampedArray,mask:MaskData):Uint8ClampedArray{
  if(pixels.length!==mask.alpha.length*4)throw Error('選択の大きさが作品に一致しません。');
  const result=new Uint8ClampedArray(pixels);
  for(let i=0;i<mask.alpha.length;i++){
    const a=mask.alpha[i]!,offset=i*4+3;
    result[offset]=Math.round(result[offset]!*a/255);
    if(result[offset]===0){result[i*4]=0;result[i*4+1]=0;result[i*4+2]=0;}
  }
  return result;
}
export function eraseMaskedPixels(pixels:Uint8Array|Uint8ClampedArray,mask:MaskData):Uint8ClampedArray{
  if(pixels.length!==mask.alpha.length*4)throw Error('選択の大きさが作品に一致しません。');
  const result=new Uint8ClampedArray(pixels);
  for(let i=0;i<mask.alpha.length;i++){
    const alpha=mask.alpha[i]!,offset=i*4+3;
    result[offset]=Math.round(result[offset]!*(255-alpha)/255);
    if(!result[offset]){result[i*4]=0;result[i*4+1]=0;result[i*4+2]=0;}
  }
  return result;
}
export function featherMask(mask:MaskData,radius:number):MaskData{
  if(!Number.isInteger(radius)||radius<0||radius>32)throw Error('ぼかし幅は0〜32pxで指定してください。');
  if(!radius)return mask;
  const w=mask.width,h=mask.height,temporary=new Uint8Array(mask.alpha.length),out=new Uint8Array(mask.alpha.length);
  const span=2*radius+1;
  for(let y=0;y<h;y++){
    let sum=0;for(let x=-radius;x<=radius;x++)sum+=mask.alpha[y*w+limit(x,0,w-1)]!;
    for(let x=0;x<w;x++){
      temporary[y*w+x]=Math.round(sum/span);
      sum-=mask.alpha[y*w+limit(x-radius,0,w-1)]!;
      sum+=mask.alpha[y*w+limit(x+radius+1,0,w-1)]!;
    }
  }
  for(let x=0;x<w;x++){
    let sum=0;for(let y=-radius;y<=radius;y++)sum+=temporary[limit(y,0,h-1)*w+x]!;
    for(let y=0;y<h;y++){
      out[y*w+x]=Math.round(sum/span);
      sum-=temporary[limit(y-radius,0,h-1)*w+x]!;
      sum+=temporary[limit(y+radius+1,0,h-1)*w+x]!;
    }
  }
  return {width:w,height:h,alpha:out};
}

/** Separable monotone sliding-window maximum/minimum; O(width*height). */
export function growOrShrink(mask:MaskData,radius:number,mode:'grow'|'shrink'):MaskData{
  if(!Number.isInteger(radius)||radius<0||radius>128)throw Error('拡張・縮小幅は0〜128pxで指定してください。');
  if(!radius)return mask;
  const w=mask.width,h=mask.height;
  const temporary=new Uint8Array(mask.alpha.length),result=new Uint8Array(mask.alpha.length);
  const max=mode==='grow',windowLength=2*radius+1;
  const slide=(length:number,read:(index:number)=>number,write:(index:number,value:number)=>void)=>{
    const deque=new Int32Array(length+windowLength);
    let head=0,tail=0;
    for(let i=-radius;i<length+radius;i++){
      const value=read(limit(i,0,length-1));
      while(tail>head&&(max?read(limit(deque[tail-1]!,0,length-1))<=value:
        read(limit(deque[tail-1]!,0,length-1))>=value))tail--;
      deque[tail++]=i;
      while(tail>head&&deque[head]!<=i-windowLength)head++;
      if(i>=radius){
        const x=i-radius;
        if(x<length)write(x,read(limit(deque[head]!,0,length-1)));
      }
    }
  };
  for(let y=0;y<h;y++)slide(w,x=>mask.alpha[y*w+x]!, (x,value)=>{temporary[y*w+x]=value;});
  for(let x=0;x<w;x++)slide(h,y=>temporary[y*w+x]!, (y,value)=>{result[y*w+x]=value;});
  return {width:w,height:h,alpha:result};
}
export function selectionBorder(mask:MaskData,radius:number):MaskData{
  const outer=growOrShrink(mask,radius,'grow'),
    inner=growOrShrink(mask,radius,'shrink'),out=new Uint8Array(mask.alpha.length);
  for(let i=0;i<out.length;i++)out[i]=Math.max(0,outer.alpha[i]!-inner.alpha[i]!);
  return {width:mask.width,height:mask.height,alpha:out};
}

/** A selection brush deposits partial alpha and records one mask change per stroke. */
export type SelectionBrushPoint=Readonly<{x:number;y:number;pressure:number}>;
export type SelectionBrushSettings=Readonly<{
  size:number;opacity:number;hardness:number;mode:'add'|'subtract';
}>;
export function brushSelection(
  mask:MaskData,points:readonly SelectionBrushPoint[],settings:SelectionBrushSettings
):MaskData{
  const result={...mask,alpha:mask.alpha.slice()};
  paintSelectionBrush(result,points,settings);
  return result;
}
/** Mutates an owned scratch mask. Preview workers append only new segments;
 * the committed brush uses the same kernel with a fresh mask and from=0. */
export function paintSelectionBrush(
  mask:MaskData,points:readonly SelectionBrushPoint[],settings:SelectionBrushSettings,from=0
):void{
  const {width,height}=mask;
  if(mask.alpha.length!==width*height||points.length>10000||
    !Number.isInteger(from)||from<0||from>points.length||
    !Number.isFinite(settings.size)||settings.size<1||settings.size>800||
    !Number.isFinite(settings.opacity)||settings.opacity<0||settings.opacity>1||
    !Number.isFinite(settings.hardness)||settings.hardness<0||settings.hardness>1)
    throw Error('選択ブラシの設定か入力が正しくありません。');
  const out=mask.alpha;
  const paint=(x:number,y:number,pressure:number)=>{
    const radius=Math.max(.5,settings.size*(.25+.75*limit(pressure,0,1))*.5);
    const inner=radius*settings.hardness;
    const x0=Math.max(0,Math.floor(x-radius)),x1=Math.min(width,Math.ceil(x+radius));
    const y0=Math.max(0,Math.floor(y-radius)),y1=Math.min(height,Math.ceil(y+radius));
    for(let py=y0;py<y1;py++)for(let px=x0;px<x1;px++){
      const dist=Math.hypot(px+.5-x,py+.5-y);
      if(dist>=radius)continue;
      const coverage=settings.opacity*(dist<=inner?1:
        Math.max(0,1-(dist-inner)/Math.max(.01,radius-inner)));
      const index=py*width+px,prior=out[index]!;
      out[index]=settings.mode==='add'
        ?Math.round(prior+(255-prior)*coverage)
        :Math.round(prior*(1-coverage));
    }
  };
  // Interpolate dots to avoid gaps when events are sparse or sampling is delayed.
  const step=Math.max(1,settings.size*.23);
  for(let i=from;i<points.length;i++){
    const current=points[i]!;
    if(!Number.isFinite(current.x)||!Number.isFinite(current.y)||!Number.isFinite(current.pressure))
      throw Error('選択ブラシの位置が正しくありません。');
    const prior=points[Math.max(0,i-1)]!,distance=Math.hypot(current.x-prior.x,current.y-prior.y);
    const count=Math.min(10000,Math.max(1,Math.ceil(distance/step)));
    for(let k=1;k<=count;k++){
      const t=k/count;
      paint(prior.x+(current.x-prior.x)*t,prior.y+(current.y-prior.y)*t,prior.pressure+(current.pressure-prior.pressure)*t);
    }
  }
}
