import {writeExif} from './imagePosition';
import {xmp,type RasterMetadata} from './rasterMetadata';

type Box=Readonly<{type:string;start:number;body:number;end:number}>;
const encoder=new TextEncoder();
const u16=(value:number)=>Uint8Array.of(value>>8,value&255);
const u32=(value:number)=>Uint8Array.of(value>>>24,value>>>16&255,value>>>8&255,value&255);
const full=Uint8Array.of(0,0,0,0);
function concat(parts:readonly Uint8Array[]){
  const result=new Uint8Array(parts.reduce((n,item)=>n+item.length,0));
  let index=0;
  for(const part of parts){result.set(part,index);index+=part.length;}
  return result;
}
function box(type:string,...parts:Uint8Array[]){
  return concat([u32(8+parts.reduce((n,item)=>n+item.length,0)),encoder.encode(type),...parts]);
}
function viewOf(bytes:Uint8Array){return new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);}
function fourcc(bytes:Uint8Array,offset:number){return String.fromCharCode(...bytes.subarray(offset,offset+4));}
export function isoBoxes(bytes:Uint8Array,start=0,end=bytes.length):Box[]{
  const list:Box[]=[],view=viewOf(bytes);
  for(let i=start;i+8<=end;){
    let size=view.getUint32(i),head=8;
    if(size===1){
      if(i+16>end)break;
      const long=view.getBigUint64(i+8);
      if(long>BigInt(end-i))break;
      size=Number(long);head=16;
    }else if(size===0)size=end-i;
    if(size<head||i+size>end)break;
    list.push({type:fourcc(bytes,i+4),start:i,body:i+head,end:i+size});i+=size;
  }
  return list;
}

/** Attach metadata to the still-image layout produced by the bundled libavif encoder. */
export function encodeAvifMetadata(bytes:Uint8Array,metadata:RasterMetadata){
  const description=xmp(metadata),exif=metadata.dpi!==undefined||metadata.position;
  if(!metadata.profile&&!description&&!exif)return new Uint8Array(bytes);
  const view=viewOf(bytes),top=isoBoxes(bytes);
  const [ftyp,meta,mdat]=top;
  const fail=()=>Error('AVIFの情報欄を安全に作成できませんでした。');
  if(top.length!==3||!ftyp||ftyp.type!=='ftyp'||!meta||meta.type!=='meta'||!mdat||mdat.type!=='mdat')throw fail();
  const raw=(entry:Box)=>bytes.subarray(entry.start,entry.end);
  const body=(entry:Box)=>bytes.subarray(entry.body,entry.end);
  const children=isoBoxes(bytes,meta.body+4,meta.end);
  const field=(list:readonly Box[],id:string)=>{
    const found=list.find(entry=>entry.type===id);
    if(!found)throw fail();
    return found;
  };
  const primary=field(children,'pitm'),iloc=field(children,'iloc'),iinf=field(children,'iinf');
  if(primary.end-primary.body!==6||bytes[primary.body]!==0||iloc.end-iloc.body<8||
    view.getUint32(iloc.body)!==0||view.getUint16(iloc.body+4)!==0x4400||iinf.end-iinf.body<6||bytes[iinf.body]!==0)throw fail();
  const primaryId=view.getUint16(primary.body+4);
  const count=view.getUint16(iloc.body+6);
  if(!count||count>128||iloc.body+8+count*14!==iloc.end||count!==view.getUint16(iinf.body+4))throw fail();
  const imageExtents:Array<{id:number;offset:number;length:number}>=[];
  for(let i=0;i<count;i++){
    const at=iloc.body+8+i*14,id=view.getUint16(at),offset=view.getUint32(at+6),length=view.getUint32(at+10);
    if(view.getUint16(at+2)!==0||view.getUint16(at+4)!==1||offset<mdat.body||offset+length>mdat.end)throw fail();
    imageExtents.push({id,offset,length});
  }
  let id=Math.max(...imageExtents.map(extent=>extent.id));
  if(!imageExtents.some(extent=>extent.id===primaryId)||id>65532)throw fail();
  const items:Array<{id:number;type:string;name:string;payload:Uint8Array}>=[];
  if(exif)items.push({id:++id,type:'Exif',name:'Exif',payload:concat([full,writeExif(metadata.dpi,metadata.position)])});
  if(description)items.push({id:++id,type:'mime',name:'XMP',payload:description});
  const info=box('iinf',body(iinf).subarray(0,4),u16(count+items.length),body(iinf).subarray(6),
    ...items.map(item=>box('infe',Uint8Array.of(2,0,0,0),u16(item.id),u16(0),encoder.encode(item.type),
      encoder.encode(item.name+'\0'+(item.type==='mime'?'application/rdf+xml\0\0':'')))));
  const oldRefs=children.find(entry=>entry.type==='iref');
  if(oldRefs&&(oldRefs.end-oldRefs.body<4||bytes[oldRefs.body]!==0))throw fail();
  const refs=items.length?box('iref',oldRefs?body(oldRefs):full,
    ...items.map(item=>box('cdsc',u16(item.id),u16(1),u16(primaryId)))):null;
  const iprp=field(children,'iprp');
  let properties:Uint8Array=raw(iprp);
  if(metadata.profile){
    const fields=isoBoxes(bytes,iprp.body,iprp.end),ipco=field(fields,'ipco'),ipma=field(fields,'ipma');
    const index=isoBoxes(bytes,ipco.body,ipco.end).length+1;
    if(index>127||ipma.end-ipma.body<8||view.getUint32(ipma.body)!==0)throw fail();
    const associations:Uint8Array[]=[];
    let offset=ipma.body+8,found=false;
    const rows=view.getUint32(ipma.body+4);
    if(rows>128)throw fail();
    for(let i=0;i<rows;i++){
      if(offset+3>ipma.end)throw fail();
      const item=view.getUint16(offset),n=bytes[offset+2]!,end=offset+3+n;
      if(end>ipma.end)throw fail();
      if(item===primaryId){
        if(found||n===255)throw fail();
        found=true;associations.push(u16(item),Uint8Array.of(n+1),bytes.subarray(offset+3,end),Uint8Array.of(index));
      }else associations.push(bytes.subarray(offset,end));
      offset=end;
    }
    if(!found||offset!==ipma.end)throw fail();
    properties=box('iprp',...fields.map(entry=>entry===ipco?
      box('ipco',body(ipco),box('colr',encoder.encode('prof'),metadata.profile!)):entry===ipma?
      box('ipma',body(ipma).subarray(0,8),...associations):raw(entry)));
  }
  const mediaEnd=mdat.end;
  function locations(delta:number){
    let offset=mediaEnd+delta;
    const all=[...imageExtents.map(item=>({...item,offset:item.offset+delta})),...items.map(item=>{
      const result={id:item.id,offset,length:item.payload.length};offset+=item.payload.length;return result;
    })];
    return box('iloc',body(iloc).subarray(0,6),u16(all.length),
      ...all.flatMap(item=>[u16(item.id),u16(0),u16(1),u32(item.offset),u32(item.length)]));
  }
  const buildMeta=(delta:number)=>box('meta',body(meta).subarray(0,4),...children.map(entry=>
    entry===iloc?locations(delta):entry===iinf?info:entry===iprp?properties:entry===oldRefs&&refs?refs:raw(entry)),
    ...(!oldRefs&&refs?[refs]:[]));
  const preliminary=buildMeta(0),delta=preliminary.length-(meta.end-meta.start);
  return concat([raw(ftyp),buildMeta(delta),box('mdat',body(mdat),...items.map(item=>item.payload))]);
}

/** Read the associated EXIF item from an AVIF/HEIF item-based image. */
export function isoExif(bytes:Uint8Array):Uint8Array|undefined{
  const view=viewOf(bytes),meta=isoBoxes(bytes).find(entry=>entry.type==='meta');
  if(!meta)return undefined;
  const children=isoBoxes(bytes,meta.body+4,meta.end),get=(type:string)=>children.find(entry=>entry.type===type);
  const info=get('iinf'),locations=get('iloc'),data=get('idat');
  if(!info||!locations||info.body+6>info.end||locations.body+8>locations.end)return undefined;
  const infoVersion=bytes[info.body]!,entries=isoBoxes(bytes,info.body+(infoVersion===0?6:8),info.end);
  const primary=get('pitm'),refs=get('iref');
  if(!primary||primary.body+6>primary.end||!refs||refs.body+4>refs.end)return undefined;
  const primaryWide=bytes[primary.body]===1,wide=bytes[refs.body]===1;
  if(primaryWide&&primary.body+8>primary.end||bytes[primary.body]!>1||bytes[refs.body]!>1)return undefined;
  const primaryId=primaryWide?view.getUint32(primary.body+4):view.getUint16(primary.body+4),size=wide?4:2;
  const itemId=(offset:number)=>wide?view.getUint32(offset):view.getUint16(offset);
  const associated=new Set<number>();
  for(const entry of isoBoxes(bytes,refs.body+4,refs.end)){
    if(entry.type!=='cdsc'||entry.body+size+2>entry.end)continue;
    const count=view.getUint16(entry.body+size),start=entry.body+size+2;
    if(start+count*size!==entry.end)continue;
    for(let i=0;i<count;i++)if(itemId(start+i*size)===primaryId){associated.add(itemId(entry.body));break;}
  }
  const candidate=entries.find(entry=>{
    const length=entry.end-entry.body,version=bytes[entry.body];
    if(entry.type!=='infe')return false;
    if(version===2&&length>=12&&fourcc(bytes,entry.body+8)==='Exif')return associated.has(view.getUint16(entry.body+4));
    if(version===3&&length>=14&&fourcc(bytes,entry.body+10)==='Exif')return associated.has(view.getUint32(entry.body+4));
    return false;
  });
  if(!candidate)return undefined;
  const id=bytes[candidate.body]===2?view.getUint16(candidate.body+4):view.getUint32(candidate.body+4);
  const version=bytes[locations.body]!,sizes=bytes[locations.body+4]!,base=bytes[locations.body+5]!;
  if(version>2)return undefined;
  let cursor=locations.body+6;
  function read(size:number){
    if(size>8||cursor+size>locations!.end)throw RangeError('invalid ISO extent number');
    let value=0;
    for(let i=0;i<size;i++)value=value*256+bytes[cursor++]!;
    if(!Number.isSafeInteger(value))throw RangeError('ISO extent number overflow');
    return value;
  }
  try{
    const count=read(version===2?4:2);
    if(count>65535)return undefined;
    for(let i=0;i<count;i++){
      const item=read(version===2?4:2),method=version?read(2)&15:0,reference=read(2),offset=read(base>>4),extents=read(2);
      if(extents>1024)return undefined;
      for(let j=0;j<extents;j++){
        if(version)read(base&15);
        const start=read(sizes>>4),length=read(sizes&15);
        if(item!==id)continue;
        if(reference||extents!==1||method>1||method===1&&!data)return undefined;
        const absolute=offset+start+(method===1?data!.body:0),end=absolute+length;
        if(length<12||end>(method===1?data!.end:bytes.length))return undefined;
        const header=absolute+4+view.getUint32(absolute);
        return header+8<=end?bytes.subarray(header,end):undefined;
      }
    }
  }catch{/* Broken or unsupported metadata must not block image import. */}
  return undefined;
}
