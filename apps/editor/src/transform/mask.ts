import {samplePixelMask} from '@illustro/brush-rt';
import {MASK_TILE_SIZE,transformLayerMask,validateLayerMask,vectorMaskCoverage,type LayerMask,type PixelLayerMask} from '@illustro/core';
import {cornerMode,inverseTransform,meshMode,type Transform} from './geometry';
import {quadrilateralMapping} from './quadrilateral';
import {liquifyMapping} from './liquify';
import {meshMapping} from './mesh';
import type {MaskData} from '../selection/mask';

export function transformLinkedMask(mask:LayerMask,settings:Transform,width:number,height:number):LayerMask{
  const t=settings;
  if(t.mode==='affine'&&t.angle%360===0&&t.shear===0&&t.sx>0&&t.sy>0)
    return transformLayerMask(mask,t.sx,t.sy,t.dx+t.cx*(1-t.sx),t.dy+t.cy*(1-t.sy));
  const cos=Math.cos(t.angle*Math.PI/180),sin=Math.sin(t.angle*Math.PI/180);
  const mesh=meshMode(t.mode)&&t.mesh?meshMapping(t.mesh.bounds,t.mesh.controls):null;
  if(mask.shape!=='pixels'&&(t.mode==='perspective'||t.mode==='affine'||t.mode==='liquify'||cornerMode(t.mode)||mesh)){
    const points=mask.shape==='path'?mask.points:mask.shape==='rectangle'?[
      {x:mask.x,y:mask.y},{x:mask.x+mask.width,y:mask.y},
      {x:mask.x+mask.width,y:mask.y+mask.height},{x:mask.x,y:mask.y+mask.height}
    ]:Array.from({length:128},(_,i)=>{
      const theta=2*Math.PI*i/128;
      return {x:mask.x+(1+Math.cos(theta))*mask.width/2,y:mask.y+(1+Math.sin(theta))*mask.height/2};
    });
    const quad=cornerMode(t.mode)&&t.quadrilateral?quadrilateralMapping(t.quadrilateral.bounds,t.quadrilateral.corners,t.mode):null;
    const liquify=t.mode==='liquify'?liquifyMapping(t.liquify??[]):null;
    if(quad||mesh||liquify){
      const source=t.mode==='free'||mesh||liquify?points.flatMap((a,index)=>{
        const b=points[(index+1)%points.length]!;
        const steps=Math.min(Math.max(1,Math.floor(4096/points.length)),Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/12)));
        return Array.from({length:steps},(_,i)=>({x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps}));
      }):points;
      const mapping=quad??mesh??liquify!;
      const mapped=source.map(point=>{
        const result=mapping.forward(point.x,point.y);
        if(result&&Number.isFinite(result.x)&&Number.isFinite(result.y))return result;
        if(liquify)return null;
        if(mesh)throw Error('マスクの一部が網目の変形範囲外です。マスクを連動させないか、網目の範囲を広げてください。');
        throw Error('マスクが遠近変形の範囲外にあります。');
      });
      if(mapped.every(point=>point!==null))return {...mask,shape:'path',points:mapped};
    }else return {...mask,shape:'path',points:points.map(point=>{
      const x=point.x-t.cx,y=point.y-t.cy,divisor=t.mode==='perspective'?1+t.perspective*y/height:1;
      if(divisor<=.0001)throw Error('マスクが遠近変形の範囲外にあります。');
      const u=(t.sx*x+t.shear*y)/divisor,v=t.sy*y/divisor;
      return {x:u*cos-v*sin+t.cx+t.dx,y:u*sin+v*cos+t.cy+t.dy};
    })};
  }
  if(mask.shape!=='pixels'&&t.mode!=='liquify')throw Error('曲げる前に、連動した形のマスクを解除するかピクセルマスクに切り替えてください。');
  const mapping=cornerMode(t.mode)&&t.quadrilateral?quadrilateralMapping(t.quadrilateral.bounds,t.quadrilateral.corners,t.mode):null;
  const inverse=mapping?(x:number,y:number)=>mapping.inverse(x,y,false):inverseTransform(t,width,height);
  const size=MASK_TILE_SIZE,tiles:Record<string,string>={};
  const raw={...mask,enabled:true,density:1,inverted:false};
  for(let y=0;y<height;y+=size)for(let x=0;x<width;x+=size){
    const tile=new Uint8Array(size*size).fill(255);
    for(let row=0;row<size&&y+row<height;row++)for(let col=0;col<size&&x+col<width;col++){
      const p=inverse(x+col+.5,y+row+.5);
      tile[row*size+col]=Number.isFinite(p.x)&&Number.isFinite(p.y)?(raw.shape==='pixels'?samplePixelMask(raw,p.x,p.y):Math.round(vectorMaskCoverage(raw,p.x,p.y)*255)):255;
    }
    const uniform=tile.every(value=>value===tile[0]);
    if(uniform&&tile[0]===255)continue;
    tiles[x/size+','+y/size]=uniform?tile[0]!.toString(16).padStart(2,'0'):btoa(String.fromCharCode(...tile));
  }
  return {...mask,shape:'pixels',x:0,y:0,scaleX:1,scaleY:1,tiles};
}


export function readSelectionMask(mask:PixelLayerMask,width:number,height:number):MaskData{
  const alpha=new Uint8Array(width*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)alpha[y*width+x]=samplePixelMask(mask,x+.5,y+.5);
  return {width,height,alpha};
}

export async function digestLayerMask(mask:LayerMask){
  const canonical=JSON.stringify(validateLayerMask(mask),(_key,value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)
    ?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0)):value);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
