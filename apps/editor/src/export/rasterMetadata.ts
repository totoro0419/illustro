import {xmlText} from './exchangeTypes';

const encoder=new TextEncoder();
const ascii=(bytes:Uint8Array,at:number,text:string)=>[...text].every((s,i)=>bytes[at+i]===s.charCodeAt(0));
export type RasterMetadata=Readonly<{profile?:Uint8Array;dpi?:number;author?:string;copyright?:string}>;

function xmp({author,copyright}:RasterMetadata){
  const name=xmlText((author??'').trim().slice(0,500));
  const rights=xmlText((copyright??'').trim().slice(0,500));
  if(!name&&!rights)return null;
  return encoder.encode('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'+
    '<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">'+
    (name?'<dc:creator><rdf:Seq><rdf:li>'+name+'</rdf:li></rdf:Seq></dc:creator>':'')+
    (rights?'<dc:rights><rdf:Alt><rdf:li xml:lang="x-default">'+rights+'</rdf:li></rdf:Alt></dc:rights>':'')+
    '</rdf:Description></rdf:RDF></x:xmpmeta>');
}

function concat(...parts:Uint8Array[]):Uint8Array<ArrayBuffer>{
  const out=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));
  let start=0;
  for(const part of parts){out.set(part,start);start+=part.length;}
  return out;
}

function jpegSegment(tag:number,data:Uint8Array){
  const size=data.length+2;
  if(size>65535)throw Error('JPEGの情報欄が大きすぎます。');
  return concat(Uint8Array.of(255,tag,size>>8,size&255),data);
}

function jpegMetadata(bytes:Uint8Array,metadata:RasterMetadata){
  const {profile,dpi}=metadata,extras:Uint8Array[]=[];
  if(bytes[0]!==255||bytes[1]!==216)throw Error('JPEG形式で書き出せませんでした。');
  const density=dpi===undefined?[]:[jpegSegment(224,concat(encoder.encode('JFIF\0'),Uint8Array.of(1,1,1,dpi>>8,dpi&255,dpi>>8,dpi&255,0,0)))];
  if(profile){
    const split=65519,count=Math.ceil(profile.length/split),label=encoder.encode('ICC_PROFILE\0');
    for(let i=0;i<count;i++){
      extras.push(jpegSegment(226,concat(label,Uint8Array.of(i+1,count),profile.subarray(i*split,(i+1)*split))));
    }
  }
  const description=xmp(metadata),label='http://ns.adobe.com/xap/1.0/\0';
  if(description)extras.push(jpegSegment(225,concat(encoder.encode(label),description)));
  const preserved:Uint8Array[]=[];
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let start=2;
  while(start+4<=bytes.length&&bytes[start]===255){
    const code=bytes[start+1]!;
    if(code<224||code>239)break;
    const size=view.getUint16(start+2),end=start+2+size;
    if(size<2||end>bytes.length)throw Error('JPEGの情報欄を読み取れません。');
    const replace=(dpi!==undefined&&code===224&&ascii(bytes,start+4,'JFIF\0'))||
      (profile&&code===226&&ascii(bytes,start+4,'ICC_PROFILE\0'))||
      (description&&code===225&&ascii(bytes,start+4,label));
    if(!replace)preserved.push(bytes.subarray(start,end));
    start=end;
  }
  return concat(bytes.subarray(0,2),...density,...preserved,...extras,bytes.subarray(start));
}

function densityExif(dpi:number){
  // Little-endian TIFF IFD with XResolution, YResolution and inch units.
  const exif=new Uint8Array(66),view=new DataView(exif.buffer);
  exif.set(encoder.encode('II'));view.setUint16(2,42,true);view.setUint32(4,8,true);
  view.setUint16(8,3,true);
  for(const [offset,tag,value,type] of [[10,282,50,5],[22,283,58,5],[34,296,2,3]] as const){
    view.setUint16(offset,tag,true);view.setUint16(offset+2,type,true);view.setUint32(offset+4,1,true);
    view.setUint32(offset+8,value,true);
  }
  view.setUint32(50,dpi,true);view.setUint32(54,1,true);view.setUint32(58,dpi,true);view.setUint32(62,1,true);
  return exif;
}

function webpChunk(tag:string,content:Uint8Array){
  const head=new Uint8Array(8);head.set(encoder.encode(tag));
  new DataView(head.buffer).setUint32(4,content.length,true);
  return concat(head,content,...(content.length%2?[Uint8Array.of(0)]:[]));
}

function webpMetadata(bytes:Uint8Array,width:number,height:number,metadata:RasterMetadata){
  if(bytes.length<20||!ascii(bytes,0,'RIFF')||!ascii(bytes,8,'WEBP'))throw Error('WebP形式で書き出せませんでした。');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),limit=view.getUint32(4,true)+8;
  if(limit!==bytes.length)throw Error('WebPの長さを読み取れません。');
  const {dpi,profile}=metadata,description=xmp(metadata),left:Uint8Array[]=[],right:Uint8Array[]=[];
  let features=0;
  for(let start=12;start+8<=limit;){
    const size=view.getUint32(start+4,true),end=start+8+size+(size&1);
    if(end>limit)throw Error('WebPの情報欄を読み取れません。');
    const id=String.fromCharCode(...bytes.subarray(start,start+4)),raw=bytes.subarray(start,end);
    if(id==='VP8X')features=bytes[start+8]??0;
    else if(id==='ICCP'){if(!profile)left.push(raw);}
    else if(id==='EXIF'){if(dpi===undefined)right.push(raw);}
    else if(id==='XMP '){if(!description)right.push(raw);}
    else {
      if(id==='ALPH'||id==='VP8L'&&size>=5&&!!(bytes[start+12]!&16))features|=16;
      left.push(raw);
    }
    start=end;
  }
  const extended=new Uint8Array(10);
  extended[0]=features|(profile?32:0)|(dpi===undefined?0:8)|(description?4:0);
  for(let i=0;i<3;i++){extended[4+i]=((width-1)>>(i*8))&255;extended[7+i]=((height-1)>>(i*8))&255;}
  const original=encoder.encode('WEBP');
  const body=concat(original,webpChunk('VP8X',extended),...(profile?[webpChunk('ICCP',profile)]:[]),...left,
    ...right,...(dpi===undefined?[]:[webpChunk('EXIF',densityExif(dpi))]),...(description?[webpChunk('XMP ',description)]:[]));
  const head=new Uint8Array(8);head.set(encoder.encode('RIFF'));new DataView(head.buffer).setUint32(4,body.length,true);
  return new Blob([head,body],{type:'image/webp'});
}

export async function addRasterMetadata(blob:Blob,format:'jpeg'|'webp',width:number,height:number,metadata:RasterMetadata){
  const {profile,dpi,author,copyright}=metadata;
  if(!profile&&dpi===undefined&&!author?.trim()&&!copyright?.trim())return blob;
  if(dpi!==undefined&&(!Number.isInteger(dpi)||dpi<1||dpi>2400))throw Error('DPIは1〜2400で指定してください。');
  const bytes=new Uint8Array(await blob.arrayBuffer());
  return format==='jpeg'?new Blob([jpegMetadata(bytes,metadata)],{type:'image/jpeg'}):webpMetadata(bytes,width,height,metadata);
}
