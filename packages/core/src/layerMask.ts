export type VectorLayerMask = Readonly<{
  shape:'rectangle'|'ellipse';
  x:number;y:number;width:number;height:number;
  enabled:boolean;inverted:boolean;density:number;
}>;

export function validateVectorLayerMask(value:unknown):VectorLayerMask|null{
  if(value===undefined||value===null)return null;
  if(!value||typeof value!=='object')throw new Error('マスクの設定が正しくありません。');
  const mask=value as Record<string,unknown>;
  const {shape,x,y,width,height,enabled,inverted,density}=mask;
  if((shape!=='rectangle'&&shape!=='ellipse')||typeof enabled!=='boolean'||typeof inverted!=='boolean'||
     typeof x!=='number'||!Number.isFinite(x)||typeof y!=='number'||!Number.isFinite(y)||
     typeof width!=='number'||!Number.isFinite(width)||width<=0||
     typeof height!=='number'||!Number.isFinite(height)||height<=0||
     typeof density!=='number'||!Number.isFinite(density)||density<0||density>1)throw new Error('マスクの設定が正しくありません。');
  return Object.freeze({shape,x,y,width,height,enabled,inverted,density});
}

export function vectorMaskCoverage(mask:VectorLayerMask|null|undefined,x:number,y:number){
  if(!mask?.enabled)return 1;
  const dx=(x-mask.x)/mask.width*2-1,dy=(y-mask.y)/mask.height*2-1;
  const inside=mask.shape==='ellipse'?dx*dx+dy*dy<=1:Math.abs(dx)<=1&&Math.abs(dy)<=1;
  return inside!==mask.inverted?1:1-mask.density;
}
