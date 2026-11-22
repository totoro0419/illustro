import {CanonicalBuilder,validateRecord,type StrokeRecord} from '@illustro/brush-rt';

export type MacroAffine=Readonly<{dx:number;dy:number;sx:number;sy:number;angle:number;shear:number;cx:number;cy:number}>;
export type MacroArtworkStep=Readonly<{kind:'stroke';records:readonly StrokeRecord[]}|{kind:'affine';affine:MacroAffine}>;
const prefix='artwork:';
const limit=220_000;

export function isMacroArtwork(value:string){return value.startsWith(prefix);}
export function decodeMacroArtwork(value:string):MacroArtworkStep|null{
  if(!isMacroArtwork(value)||value.length>limit)return null;
  try{
    const data=JSON.parse(value.slice(prefix.length));
    if(data?.kind==='stroke'&&Array.isArray(data.records)&&data.records.length>=1&&data.records.length<=8){
      if(data.records.some((record:StrokeRecord)=>record?.version!==3||!Array.isArray(record.raw)||record.raw.length>2048||
        !Array.isArray(record.commands)||record.commands.length>4096))return null;
      return {kind:'stroke',records:data.records.map(validateRecord)};
    }
    if(data?.kind==='affine'){
      const a=data.affine as MacroAffine;
      if(!a||![a.dx,a.dy,a.sx,a.sy,a.angle,a.shear,a.cx,a.cy].every(Number.isFinite)||
        Math.abs(a.dx)>8192||Math.abs(a.dy)>8192||Math.abs(a.cx)>8192||Math.abs(a.cy)>8192||
        Math.abs(a.sx)<.01||Math.abs(a.sy)<.01||Math.abs(a.sx)>16||Math.abs(a.sy)>16||
        Math.abs(a.angle)>Math.PI*4||Math.abs(a.shear)>16)return null;
      return {kind:'affine',affine:{dx:a.dx,dy:a.dy,sx:a.sx,sy:a.sy,angle:a.angle,shear:a.shear,cx:a.cx,cy:a.cy}};
    }
  }catch{}
  return null;
}
export function encodeMacroArtwork(step:MacroArtworkStep){
  const encoded=prefix+JSON.stringify(step);
  return decodeMacroArtwork(encoded)?encoded:null;
}
export function moveRecordedBrush(record:StrokeRecord,dx:number,dy:number){
  if(!dx&&!dy)return record;
  if(record.version!==3)throw Error('この版の記録は移動できません。');
  const builder=new CanonicalBuilder(record.foundation,[...record.seed],0,record.context);
  for(const sample of record.raw)builder.accept({...sample,x:sample.x+dx,y:sample.y+dy});
  if(record.releaseInput)builder.release({...record.releaseInput,x:record.releaseInput.x+dx,y:record.releaseInput.y+dy});
  builder.finish();
  return builder.record();
}
