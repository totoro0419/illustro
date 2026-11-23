import {validIccBytes} from './iccMetadata';

type Box=Readonly<{type:string;body:number;end:number}>;
export function extractIsoImageIcc(bytes:Uint8Array):Uint8Array<ArrayBuffer>|null{
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  function* boxes(start:number,end:number):Generator<Box>{
    for(let i=start;i+8<=end;){
      let size=view.getUint32(i),header=8;
      if(size===1){
        if(i+16>end)break;
        const large=view.getBigUint64(i+8);
        if(large>BigInt(end-i))break;
        size=Number(large);header=16;
      }else if(size===0)size=end-i;
      if(size<header||i+size>end)break;
      yield {type:String.fromCharCode(...bytes.subarray(i+4,i+8)),body:i+header,end:i+size};
      i+=size;
    }
  }
  const meta=[...boxes(0,bytes.length)].find(box=>box.type==='meta');
  if(!meta||meta.body+4>meta.end)return null;
  const entries=[...boxes(meta.body+4,meta.end)];
  const primary=entries.find(box=>box.type==='pitm'),properties=entries.find(box=>box.type==='iprp');
  if(!properties)return null;
  const sub=[...boxes(properties.body,properties.end)],container=sub.find(box=>box.type==='ipco');
  if(!container)return null;
  const profiles=new Map<number,Uint8Array<ArrayBuffer>>();
  let index=0;
  for(const property of boxes(container.body,container.end)){
    index++;
    if(property.type!=='colr'||property.body+4>property.end)continue;
    const type=String.fromCharCode(...bytes.subarray(property.body,property.body+4));
    if(type!=='prof'&&type!=='rICC')continue;
    const profile=bytes.subarray(property.body+4,property.end);
    if(validIccBytes(profile))profiles.set(index,new Uint8Array(profile));
  }
  if(!profiles.size)return null;
  const primaryWide=primary&&bytes[primary.body]!==0;
  const primaryId=primary&&primary.body+(primaryWide?8:6)<=primary.end?
    primaryWide?view.getUint32(primary.body+4):view.getUint16(primary.body+4):null;
  if(primaryId===null)return profiles.size===1?profiles.values().next().value??null:null;
  for(const table of sub.filter(box=>box.type==='ipma'&&box.body+8<=box.end)){
    const version=bytes[table.body]!,wide=!!(bytes[table.body+3]!&1);
    if(version>1)continue;
    const count=view.getUint32(table.body+4);
    let cursor=table.body+8;
    for(let i=0;i<count&&cursor+(version?5:3)<=table.end;i++){
      const item=version?view.getUint32(cursor):view.getUint16(cursor);
      cursor+=version?4:2;
      const associated=bytes[cursor++]!,size=wide?2:1;
      if(cursor+associated*size>table.end)break;
      if(item===primaryId){
        for(let j=0;j<associated;j++){
          const id=wide?view.getUint16(cursor+j*size)&0x7fff:bytes[cursor+j*size]!&0x7f;
          const match=profiles.get(id);if(match)return match;
        }
      }
      cursor+=associated*size;
    }
  }
  return null;
}
