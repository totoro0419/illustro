import {writeExif} from './imagePosition';
import {xmp,type RasterMetadata} from './rasterMetadata';
import {ICC_LIMIT} from './iccMetadata';
import {assertImageSize} from './exchangeTypes';

// TIFF 6.0 chunky RGB, unassociated alpha, unsigned samples.
export function encodeTiff(pixels:Uint8ClampedArray,width:number,height:number,dpi=96,metadata:RasterMetadata={}):Uint8Array<ArrayBuffer>{
  assertImageSize(width,height);
  if(pixels.length!==width*height*4)throw Error('TIFFの画素データが正しくありません。');
  const description=xmp(metadata),profile=metadata.profile;
  const gps=metadata.position?writeExif(undefined,metadata.position):undefined;
  const gpsStart=gps?new DataView(gps.buffer).getUint32(18,true):0;
  const entries=14+Number(!!description)+Number(!!profile)+Number(!!gps),offset=8,extra=offset+2+entries*12+4;
  const textOffset=extra+24,profileOffset=textOffset+((description?.length??0)+1&~1);
  const gpsOffset=profileOffset+((profile?.length??0)+1&~1);
  const strip=gpsOffset+(gps?gps.length-gpsStart:0);
  const out=new Uint8Array(strip+pixels.length),view=new DataView(out.buffer);
  const u16=(at:number,n:number)=>view.setUint16(at,n,true),u32=(at:number,n:number)=>view.setUint32(at,n,true);
  out[0]=73;out[1]=73;u16(2,42);u32(4,offset);u16(offset,entries);
  let cursor=offset+2;
  function field(tag:number,type:number,count:number,value:number){
    u16(cursor,tag);u16(cursor+2,type);u32(cursor+4,count);
    if(type===3&&count===1)u16(cursor+8,value);else u32(cursor+8,value);cursor+=12;
  }
  field(256,4,1,width);field(257,4,1,height);field(258,3,4,extra);
  field(259,3,1,1);field(262,3,1,2);field(273,4,1,strip);field(277,3,1,4);
  field(278,4,1,height);field(279,4,1,pixels.length);field(282,5,1,extra+8);field(283,5,1,extra+16);
  field(284,3,1,1);field(296,3,1,2);field(338,3,1,2);
  if(description){field(700,1,description.length,textOffset);out.set(description,textOffset);}
  if(profile){field(34675,7,profile.length,profileOffset);out.set(profile,profileOffset);}
  if(gps){
    field(34853,4,1,gpsOffset);out.set(gps.subarray(gpsStart),gpsOffset);
    for(const offset of [22,46]){
      const previous=view.getUint32(gpsOffset+offset,true);
      u32(gpsOffset+offset,gpsOffset+previous-gpsStart);
    }
  }
  for(let i=0;i<4;i++)u16(extra+i*2,8);
  const density=Number.isFinite(dpi)&&dpi>=1&&dpi<=2400?dpi:96;
  u32(extra+8,Math.round(density*1000));u32(extra+12,1000);
  u32(extra+16,Math.round(density*1000));u32(extra+20,1000);
  out.set(pixels,strip);return out;
}

export function decodeTiff(bytes:Uint8Array){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const little=bytes[0]===73&&bytes[1]===73;
  if(bytes.length<8||!little&&!(bytes[0]===77&&bytes[1]===77)||view.getUint16(2,little)!==42)throw Error('対応するTIFFファイルではありません。');
  const word=(at:number)=>view.getUint16(at,little),long=(at:number)=>view.getUint32(at,little);
  const dir=long(4);
  if(dir+2>bytes.length)throw Error('TIFFの項目表が壊れています。');
  const count=word(dir);
  if(count>512||dir+2+count*12+4>bytes.length)throw Error('TIFFの項目表が壊れています。');
  const tags=new Map<number,number[]>();
  let dpi:number|undefined,sourceIcc:Uint8Array<ArrayBuffer>|undefined,invalidIcc=false;
  for(let i=0;i<count;i++){
    const at=dir+2+i*12,tag=word(at),type=word(at+2),n=long(at+4);
    if(tag===282&&type===5&&n===1){
      const pos=long(at+8);
      if(pos+8<=bytes.length&&long(pos+4))dpi=long(pos)/long(pos+4);
    }
    if(tag===34675){
      const start=long(at+8);
      if((type===7||type===1)&&n>=132&&n<=ICC_LIMIT&&start+n<=bytes.length&&view.getUint32(start+36)===0x61637370)
        sourceIcc=new Uint8Array(bytes.subarray(start,start+n));
      else invalidIcc=true;
      continue;
    }
    if(![256,257,258,259,262,273,274,277,278,279,284,296,338,339].includes(tag))continue;
    if(type!==3&&type!==4)continue;
    const length=type===3?2:4,position=n*length<=4?at+8:long(at+8);
    if(n>8192||position+n*length>bytes.length)throw Error('TIFFの画像情報が壊れています。');
    tags.set(tag,Array.from({length:n},(_,k)=>type===3?word(position+k*length):long(position+k*length)));
  }
  const get=(tag:number,fallback:number)=>tags.get(tag)?.[0]??fallback;
  const width=get(256,0),height=get(257,0),channels=get(277,1),rows=get(278,height),compression=get(259,1);
  assertImageSize(width,height);
  const bits=tags.get(258),sampleBits=bits?.[0];
  if(![1,32773].includes(compression)||get(262,0)!==2||![3,4].includes(channels)||get(284,1)!==1||get(274,1)!==1||get(339,1)!==1||
    !bits||bits.length!==channels||!bits.every(n=>n===sampleBits)||sampleBits!==8&&sampleBits!==16||rows<1)
    throw Error('このTIFF形式には対応していません。RGB/RGBA・8/16ビット・非圧縮またはPackBitsを使用してください。');
  const offsets=tags.get(273),sizes=tags.get(279),strips=Math.ceil(height/rows);
  if(!offsets||!sizes||offsets.length!==strips||sizes.length!==strips)throw Error('TIFFのストリップ情報が壊れています。');
  const out=new Uint8ClampedArray(width*height*4),channelBytes=sampleBits/8;
  let dest=0;
  for(let i=0;i<strips;i++){
    const start=offsets[i]!,length=sizes[i]!,expected=width*Math.min(rows,height-i*rows)*channels*channelBytes;
    if(start+length>bytes.length||compression===1&&length!==expected)throw Error('TIFFの画素が途中で途切れています。');
    let strip=bytes.subarray(start,start+length);
    if(compression===32773)strip=unpackPackBits(strip,expected);
    const block=new DataView(strip.buffer,strip.byteOffset,strip.byteLength);
    const sample=(at:number)=>sampleBits===8?strip[at]!:block.getUint16(at,little)/257;
    for(let k=0;k<expected;k+=channels*channelBytes){
      const a=channels===4?sample(k+3*channelBytes):255,premult=get(338,2)===1&&channels===4;
      for(let ch=0;ch<3;ch++)out[dest++]=premult?(a?sample(k+ch*channelBytes)*255/a:0):sample(k+ch*channelBytes);
      out[dest++]=a;
    }
  }
  if(dpi!==undefined&&get(296,2)===3)dpi*=2.54;
  if(dpi!==undefined&&get(296,2)===1)dpi=undefined;
  const warnings:string[]=[];
  if(sampleBits===16)warnings.push('16ビットの画素を8ビットに変換しました。');
  if(invalidIcc)warnings.push('読み込めないICCが含まれるため、RGB値をsRGBとして扱います。');
  if(long(dir+2+count*12))warnings.push('複数ページのうち最初のページを読み込みました。');
  return {width,height,pixels:out,dpi,warnings,...(sourceIcc?{sourceIcc}:{})};
}

function unpackPackBits(bytes:Uint8Array,length:number){
  const out=new Uint8Array(length);
  let read=0,write=0;
  while(read<bytes.length&&write<length){
    const head=bytes[read++]!;
    if(head===128)continue;
    const count=head<128?head+1:257-head;
    if(write+count>length)throw Error('PackBitsの展開長が一致しません。');
    if(head<128){
      if(read+count>bytes.length)throw Error('PackBitsの画素が途中で途切れています。');
      out.set(bytes.subarray(read,read+count),write);read+=count;
    }else{
      if(read>=bytes.length)throw Error('PackBitsの画素が途中で途切れています。');
      out.fill(bytes[read++]!,write,write+count);
    }
    write+=count;
  }
  if(write!==length)throw Error('PackBitsの展開長が一致しません。');
  return out;
}
