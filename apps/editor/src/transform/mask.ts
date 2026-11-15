import {samplePixelMask} from '@illustro/brush-rt';
import {MASK_TILE_SIZE,transformLayerMask,type LayerMask,type PixelLayerMask} from '@illustro/core';
import {inverseTransform,type Transform} from './geometry';

export function transformLinkedMask(mask:LayerMask,settings:Transform,width:number,height:number):LayerMask{
  const t=settings;
  if(t.mode==='affine'&&t.angle%360===0&&t.shear===0&&t.sx>0&&t.sy>0)
    return transformLayerMask(mask,t.sx,t.sy,t.dx+t.cx*(1-t.sx),t.dy+t.cy*(1-t.sy));
  const cos=Math.cos(t.angle*Math.PI/180),sin=Math.sin(t.angle*Math.PI/180);
  if(mask.shape!=='pixels'&&(t.mode==='perspective'||t.mode==='affine')){
    const points=mask.shape==='path'?mask.points:mask.shape==='rectangle'?[
      {x:mask.x,y:mask.y},{x:mask.x+mask.width,y:mask.y},
      {x:mask.x+mask.width,y:mask.y+mask.height},{x:mask.x,y:mask.y+mask.height}
    ]:Array.from({length:128},(_,i)=>{
      const theta=2*Math.PI*i/128;
      return {x:mask.x+(1+Math.cos(theta))*mask.width/2,y:mask.y+(1+Math.sin(theta))*mask.height/2};
    });
    return {...mask,shape:'path',points:points.map(point=>{
      const x=point.x-t.cx,y=point.y-t.cy,divisor=t.mode==='perspective'?1+t.perspective*y/height:1;
      if(divisor<=.0001)throw Error('マスクが遠近変形の範囲外にあります。');
      const u=(t.sx*x+t.shear*y)/divisor,v=t.sy*y/divisor;
      return {x:u*cos-v*sin+t.cx+t.dx,y:u*sin+v*cos+t.cy+t.dy};
    })};
  }
  if(mask.shape!=='pixels')throw Error('曲げる前に、連動した形のマスクを解除するかピクセルマスクに切り替えてください。');
  const inverse=inverseTransform(t,width,height),size=MASK_TILE_SIZE,tiles:Record<string,string>={};
  const raw:PixelLayerMask={...mask,enabled:true,density:1,inverted:false};
  for(let y=0;y<height;y+=size)for(let x=0;x<width;x+=size){
    const tile=new Uint8Array(size*size).fill(255);
    for(let row=0;row<size&&y+row<height;row++)for(let col=0;col<size&&x+col<width;col++){
      const p=inverse(x+col+.5,y+row+.5);
      tile[row*size+col]=samplePixelMask(raw,p.x,p.y);
    }
    const uniform=tile.every(value=>value===tile[0]);
    if(uniform&&tile[0]===255)continue;
    tiles[x/size+','+y/size]=uniform?tile[0]!.toString(16).padStart(2,'0'):btoa(String.fromCharCode(...tile));
  }
  return {...mask,x:0,y:0,scaleX:1,scaleY:1,tiles};
}
