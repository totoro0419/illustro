export type ImagePosition=readonly [latitude:number,longitude:number];
export const IMAGE_POSITION_SECTION='round2.image-position';
const isPosition=(value:unknown):value is ImagePosition=>Array.isArray(value)&&value.length===2&&
  value.every(Number.isFinite)&&Math.abs(value[0])<=90&&Math.abs(value[1])<=180;
export const describePosition=([lat,lon]:ImagePosition)=>lat.toFixed(5)+'°, '+lon.toFixed(5)+'°';

export function decodeSavedPosition(bytes:Uint8Array|undefined){
  if(!bytes||bytes.length>128)return undefined;
  try{const value:unknown=JSON.parse(new TextDecoder().decode(bytes));return isPosition(value)?value:undefined;}
  catch{return undefined;}
}

/** Copy just the two coordinates. Thumbnail EXIF, device names and other fields stay out of the document. */
export function extractExifPosition(bytes:Uint8Array):ImagePosition|undefined{
  const ascii=(at:number,value:string)=>[...value].every((c,i)=>bytes[at+i]===c.charCodeAt(0));
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let start=0,end=bytes.length;
  if(bytes.length<8)return undefined;
  if(bytes[0]===255&&bytes[1]===216){
    start=-1;
    for(let i=2;i+4<=end&&bytes[i]===255;){
      const marker=bytes[i+1]!,size=view.getUint16(i+2),next=i+2+size;
      if(marker===0xda||marker===0xd9||size<2||next>end)break;
      if(marker===0xe1&&size>=8&&ascii(i+4,'Exif\0\0')){start=i+10;end=next;break;}
      i=next;
    }
  }else if(ascii(0,'RIFF')&&ascii(8,'WEBP')){
    start=-1;
    for(let i=12;i+8<=end;){
      const length=view.getUint32(i+4,true),next=i+8+length;
      if(next>end)break;
      if(ascii(i,'EXIF')){start=i+8+(ascii(i+8,'Exif\0\0')?6:0);end=next;break;}
      i=next+(length&1);
    }
  }else if(bytes[0]===137&&ascii(1,'PNG')){
    start=-1;
    for(let i=8;i+12<=end;){
      const length=view.getUint32(i),next=i+12+length;
      if(next>end)break;
      if(ascii(i+4,'eXIf')){start=i+8;end=i+8+length;break;}
      i=next;
    }
  }
  if(start<0||end-start<8)return undefined;
  const little=ascii(start,'II');
  if(!little&&!ascii(start,'MM'))return undefined;
  const read16=(at:number)=>view.getUint16(start+at,little);
  const read32=(at:number)=>view.getUint32(start+at,little);
  const safe=(at:number,length:number)=>at>=0&&length>=0&&at+length<=end-start;
  function field(dir:number,tag:number,type:number,count:number){
    if(!safe(dir,2))return undefined;
    const n=read16(dir);
    if(n>1024||!safe(dir+2,n*12))return undefined;
    for(let i=0;i<n;i++){
      const at=dir+2+i*12;
      if(read16(at)===tag&&read16(at+2)===type&&read32(at+4)===count)return at+8;
    }
  }
  if(read16(2)!==42)return undefined;
  const gpsField=field(read32(4),34853,4,1);
  if(gpsField===undefined)return undefined;
  const dir=read32(gpsField);
  function coordinate(tag:number,positive:string,negative:string){
    const ref=field(dir,tag,2,2),values=field(dir,tag+1,5,3);
    if(ref===undefined||values===undefined||!safe(read32(values),24))return NaN;
    const direction=String.fromCharCode(bytes[start+ref]!);
    if(direction!==positive&&direction!==negative)return NaN;
    const at=read32(values),components=[0,8,16].map(offset=>read32(at+offset)/read32(at+offset+4));
    if(components.some(value=>!Number.isFinite(value)||value<0)||components[1]!>=60||components[2]!>=60)return NaN;
    return (direction===negative?-1:1)*(components[0]!+components[1]!/60+components[2]!/3600);
  }
  const result=[coordinate(1,'N','S'),coordinate(3,'E','W')];
  return isPosition(result)?result:undefined;
}

/** Little-endian TIFF directory, with only the requested density and coordinates. */
export function writeExif(dpi:number|undefined,position:ImagePosition|undefined){
  const count=(dpi===undefined?0:3)+(position?1:0),directoryEnd=8+2+12*count+4;
  const gpsStart=directoryEnd+(dpi===undefined?0:16),rational=gpsStart+2+4*12+4;
  const bytes=new Uint8Array(position?rational+48:gpsStart),view=new DataView(bytes.buffer);
  const u16=(at:number,n:number)=>view.setUint16(at,n,true);
  const u32=(at:number,n:number)=>view.setUint32(at,n,true);
  const field=(at:number,tag:number,type:number,n:number,value:number)=>{
    u16(at,tag);u16(at+2,type);u32(at+4,n);u32(at+8,value);
  };
  bytes.set([73,73]);u16(2,42);u32(4,8);u16(8,count);
  let entry=10;
  if(dpi!==undefined){
    field(entry,282,5,1,directoryEnd);field(entry+12,283,5,1,directoryEnd+8);field(entry+24,296,3,1,2);
    u32(directoryEnd,dpi);u32(directoryEnd+4,1);u32(directoryEnd+8,dpi);u32(directoryEnd+12,1);
    entry+=36;
  }
  if(position){
    field(entry,34853,4,1,gpsStart);u16(gpsStart,4);
    for(const [index,value] of position.entries()){
      const tag=1+index*2,at=gpsStart+2+index*24,data=rational+index*24;
      field(at,tag,2,2,(index?(value<0?'W':'E'):(value<0?'S':'N')).charCodeAt(0));
      field(at+12,tag+1,5,3,data);
      const absolute=Math.abs(value),degrees=Math.floor(absolute),minutes=Math.floor((absolute-degrees)*60);
      const seconds=Math.min(59_999_999,Math.round((absolute-degrees-minutes/60)*3_600_000_000));
      u32(data,degrees);u32(data+4,1);u32(data+8,minutes);u32(data+12,1);u32(data+16,seconds);u32(data+20,1000000);
    }
  }
  return bytes;
}
