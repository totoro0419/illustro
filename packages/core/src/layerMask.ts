export const MASK_TILE_SIZE=64;

type MaskSettings=Readonly<{enabled:boolean;inverted:boolean;density:number;linked?:boolean}>;
type ShapeMask=Readonly<{shape:'rectangle'|'ellipse';x:number;y:number;width:number;height:number}>;
export type MaskPoint=Readonly<{x:number;y:number}>;
export type PathLayerMask=MaskSettings&Readonly<{shape:'path';points:readonly MaskPoint[]}>;
export type PixelLayerMask=MaskSettings&Readonly<{
  shape:'pixels';
  x:number;y:number;scaleX:number;scaleY:number;
  tiles:Readonly<Record<string,string>>;
}>;
export type VectorLayerMask=MaskSettings&ShapeMask|PathLayerMask;
export type LayerMask=VectorLayerMask|PixelLayerMask;

const trustedMasks=new WeakSet<object>();
const trustedTiles=new WeakSet<object>();
const invalid=()=>new Error('マスクの設定が正しくありません。');
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);

export function validateLayerMask(value:unknown):LayerMask|null{
  if(value===undefined||value===null)return null;
  if(!value||typeof value!=='object')throw invalid();
  if(trustedMasks.has(value))return value as LayerMask;
  const mask=value as Record<string,unknown>;
  const {shape,x,y,width,height,enabled,inverted,density,linked}=mask;
  if(typeof enabled!=='boolean'||typeof inverted!=='boolean'||!finite(density)||density<0||density>1||
    (linked!==undefined&&typeof linked!=='boolean'))throw invalid();
  const settings={enabled,inverted,density,...(linked===undefined?{}:{linked})};
  let result:LayerMask;
  if(shape==='path'){
    if(!Array.isArray(mask.points)||mask.points.length<3||mask.points.length>4096)throw invalid();
    const points=mask.points.map(point=>{
      if(!point||!finite(point.x)||!finite(point.y))throw invalid();
      return Object.freeze({x:point.x,y:point.y});
    });
    result=Object.freeze({...settings,shape,points:Object.freeze(points)});
  }else if(shape==='pixels'){
    const {scaleX,scaleY,tiles}=mask;
    if(!finite(x)||!finite(y)||!finite(scaleX)||!finite(scaleY)||scaleX<=0||scaleY<=0||
      !tiles||typeof tiles!=='object'||Array.isArray(tiles))throw invalid();
    if(!trustedTiles.has(tiles)){
      for(const [key,data] of Object.entries(tiles)){
        if(!/^-?\d{1,9},-?\d{1,9}$/.test(key)||typeof data!=='string'||
          !(/^[\da-f]{2}$/.test(data)||/^[A-Za-z0-9+/]{5462}==$/.test(data)))throw invalid();
      }
      Object.freeze(tiles);
      trustedTiles.add(tiles);
    }
    result=Object.freeze({...settings,shape,x,y,scaleX,scaleY,tiles:tiles as PixelLayerMask['tiles']});
  }else{
    if((shape!=='rectangle'&&shape!=='ellipse')||!finite(x)||!finite(y)||
      !finite(width)||width<=0||!finite(height)||height<=0)throw invalid();
    result=Object.freeze({...settings,shape,x,y,width,height});
  }
  trustedMasks.add(result);
  return result;
}

export function transformLayerMask(mask:LayerMask,sx:number,sy:number,dx:number,dy:number):LayerMask{
  if(mask.shape==='path'){
    return validateLayerMask({...mask,points:mask.points.map(({x,y})=>({x:x*sx+dx,y:y*sy+dy}))})!;
  }
  const position={x:mask.x*sx+dx,y:mask.y*sy+dy};
  return validateLayerMask(mask.shape==='pixels'
    ?{...mask,...position,scaleX:mask.scaleX*sx,scaleY:mask.scaleY*sy}
    :{...mask,...position,width:mask.width*sx,height:mask.height*sy})!;
}

export function vectorMaskCoverage(mask:VectorLayerMask|null|undefined,x:number,y:number){
  if(!mask?.enabled)return 1;
  let inside=false;
  if(mask.shape==='path'){
    const points=mask.points;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i]!,b=points[j]!;
      if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
    }
  }else{
    const dx=(x-mask.x)/mask.width*2-1,dy=(y-mask.y)/mask.height*2-1;
    inside=mask.shape==='ellipse'?dx*dx+dy*dy<=1:Math.abs(dx)<=1&&Math.abs(dy)<=1;
  }
  return inside!==mask.inverted?1:1-mask.density;
}
