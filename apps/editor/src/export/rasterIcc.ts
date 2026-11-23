import {ICC_LIMIT,validIccBytes} from './iccMetadata';

const pngSignature=[137,80,78,71,13,10,26,10];
const tag=(bytes:Uint8Array,offset:number,value:string)=>
  [...value].every((character,index)=>bytes[offset+index]===character.charCodeAt(0));

async function decompressProfile(input:Uint8Array):Promise<Uint8Array<ArrayBuffer>>{
  const stream=new Blob([new Uint8Array(input)]).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader=stream.getReader(),parts:Uint8Array[]=[];
  let size=0;
  try{
    for(;;){
      const item=await reader.read();
      if(item.done)break;
      size+=item.value.length;
      if(size>ICC_LIMIT)throw Error('ICCプロファイルは4MBまでです。');
      parts.push(item.value);
    }
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  const output=new Uint8Array(size);
  let offset=0;
  for(const part of parts){output.set(part,offset);offset+=part.length;}
  return output;
}

/** Returns the original ICC bytes before the browser decodes or converts the picture. */
export async function extractRasterIcc(bytes:Uint8Array):Promise<Uint8Array<ArrayBuffer>|null>{
  let profile:Uint8Array<ArrayBuffer>|null=null;
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(pngSignature.every((value,i)=>bytes[i]===value)){
    for(let start=8;start+12<=bytes.length;){
      const length=view.getUint32(start),offset=start+8,end=offset+length;
      if(end+4>bytes.length)throw Error('PNGチャンクが途中で切れています。');
      if(tag(bytes,start+4,'iCCP')){
        const payload=bytes.subarray(offset,end),separator=payload.subarray(0,80).indexOf(0);
        if(separator<1||payload[separator+1]!==0||length>ICC_LIMIT+65536)throw Error('PNG内のICCが不正です。');
        profile=await decompressProfile(payload.subarray(separator+2));
        break;
      }
      if(tag(bytes,start+4,'IDAT')||tag(bytes,start+4,'IEND'))break;
      start=end+4;
    }
  }else if(bytes[0]===255&&bytes[1]===216){
    const parts=new Map<number,Uint8Array>();let count=0,size=0;
    for(let start=2;start<bytes.length;){
      if(bytes[start++]!==255)break;
      while(bytes[start]===255)start++;
      const marker=bytes[start++];
      if(marker===0xda||marker===0xd9||start+2>bytes.length)break;
      if(marker===1||marker!==undefined&&marker>=0xd0&&marker<=0xd7)continue;
      const length=view.getUint16(start),payload=start+2,end=start+length;
      if(length<2||end>bytes.length)throw Error('JPEGの情報が途中で切れています。');
      if(marker===0xe2&&length>=16&&tag(bytes,payload,'ICC_PROFILE\0')){
        const sequence=bytes[payload+12]!,total=bytes[payload+13]!;
        if(sequence<1||sequence>total||count&&count!==total||parts.has(sequence))throw Error('JPEG内のICCが不正です。');
        count=total;
        const part=bytes.subarray(payload+14,end);
        size+=part.length;
        if(size>ICC_LIMIT)throw Error('ICCプロファイルは4MBまでです。');
        parts.set(sequence,part);
      }
      start=end;
    }
    if(count){
      if(parts.size!==count)throw Error('JPEG内のICCが途中で切れています。');
      profile=new Uint8Array(size);
      let offset=0;
      for(let i=1;i<=count;i++){
        const part=parts.get(i)!;profile.set(part,offset);offset+=part.length;
      }
    }
  }else if(tag(bytes,0,'RIFF')&&tag(bytes,8,'WEBP')){
    const limit=view.getUint32(4,true)+8;
    if(limit>bytes.length)throw Error('WebPの情報が途中で切れています。');
    for(let start=12;start+8<=limit;){
      const length=view.getUint32(start+4,true),end=start+8+length;
      if(end+(length&1)>limit)throw Error('WebPチャンクが途中で切れています。');
      if(tag(bytes,start,'ICCP')){
        if(length>ICC_LIMIT)throw Error('ICCプロファイルは4MBまでです。');
        profile=new Uint8Array(bytes.subarray(start+8,end));break;
      }
      start=end+(length&1);
    }
  }
  if(profile&&!validIccBytes(profile))throw Error('ICCの形式を読み取れません。');
  return profile;
}
