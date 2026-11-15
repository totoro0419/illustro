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
  if(!previous||mode==='replace')return next;
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
