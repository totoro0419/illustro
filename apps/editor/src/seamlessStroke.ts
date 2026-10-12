import {CanonicalBuilder,type StrokeRecord} from '@illustro/brush-rt';
export type WrappedStroke=Readonly<{dx:number;dy:number;record:StrokeRecord}>;
type Bounds=Readonly<{x0:number;y0:number;x1:number;y1:number}>;
export function strokeBounds(record:StrokeRecord):Bounds{
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const c of record.commands){
  const r=Math.max((c[2]??0)/2,c[18]??0)*((c[19]??0)>0?1:Math.SQRT2)+2;
  const a=(c[19]??0)>0?c[16]??c[0]!:c[0]!,b=(c[19]??0)>0?c[17]??c[1]!:c[1]!;
  x0=Math.min(x0,(c[0]??0)-r,a-r);x1=Math.max(x1,(c[0]??0)+r,a+r);
  y0=Math.min(y0,(c[1]??0)-r,b-r);y1=Math.max(y1,(c[1]??0)+r,b+r);
 }
 return {x0,y0,x1,y1};
}
/** Reconstructs valid, deterministic seam copies; never mutates canonical brush records. */
export function wrappedCopies(record:StrokeRecord,width:number,height:number):WrappedStroke[]{
 if(!(width>0&&height>0&&Number.isSafeInteger(width)&&Number.isSafeInteger(height)))throw new Error('invalid seamless size');
 const b=strokeBounds(record);if(!Number.isFinite(b.x0))return [];
 const xs=[0],ys=[0];if(b.x0<0)xs.push(width);if(b.x1>width)xs.push(-width);
 if(b.y0<0)ys.push(height);if(b.y1>height)ys.push(-height);
 const result:WrappedStroke[]=[];
 for(const dx of xs)for(const dy of ys){
  if(dx===0&&dy===0)continue;
  if(b.x0+dx>=width||b.x1+dx<=0||b.y0+dy>=height||b.y1+dy<=0)continue;
  const builder=new CanonicalBuilder(record.version===3?record.foundation:record.preset,[record.seed[0],record.seed[1]],record.fast,record.version===3?record.context:undefined);
  for(const sample of record.raw)builder.accept({...sample,x:sample.x+dx,y:sample.y+dy});
  if(record.version===3&&record.releaseInput)builder.release({...record.releaseInput,x:record.releaseInput.x+dx,y:record.releaseInput.y+dy});
  builder.finish();result.push(Object.freeze({dx,dy,record:builder.record()}));
 }
 return result;
}
