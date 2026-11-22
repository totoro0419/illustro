import {unzlibSync} from 'fflate';
import {assertImageSize,MAX_EXCHANGE_BYTES} from './exchangeTypes';

const magic=20000630;
const cstring=(name:string)=>new TextEncoder().encode(name+'\0');
type Channel={name:string;type:number;bytes:number};
type Window={x0:number;y0:number;x1:number;y1:number};
const channelIndex:Record<string,number>={R:0,G:1,B:2,A:3};
const linear=Float32Array.from({length:256},(_,i)=>i<=10?i/3294.6:((i/255+.055)/1.055)**2.4);
const toByte=(value:number)=>255*(value<=.0031308?12.92*value:1.055*value**(1/2.4)-.055);

function half(value:number){
  const exponent=(value>>10)&31,fraction=(value&1023)/1024,sign=value&32768?-1:1;
  return exponent===31?(fraction?NaN:sign*Infinity):sign*(exponent?2**(exponent-15)*(1+fraction):2**-14*fraction);
}
function numericBytes(length:number,write:(view:DataView)=>void){
  const bytes=new Uint8Array(length);write(new DataView(bytes.buffer));return bytes;
}

export function encodeExr(rgba:Uint8ClampedArray,width:number,height:number):Uint8Array<ArrayBuffer>{
  assertImageSize(width,height);
  if(rgba.length!==width*height*4||width*height*16+height*16+1024>MAX_EXCHANGE_BYTES)
    throw Error('EXRの画素データが不正か、256MBの出力上限を超えています。');
  const channels=['A','B','G','R'] as const;
  const prefix=numericBytes(8,v=>{v.setUint32(0,magic,true);v.setUint32(4,2,true);});
  const info=new Uint8Array(73),infoView=new DataView(info.buffer);
  for(const [i,name] of channels.entries()){
    const at=i*18;info.set(cstring(name),at);infoView.setInt32(at+2,2,true);
    infoView.setInt32(at+10,1,true);infoView.setInt32(at+14,1,true);
  }
  const window=numericBytes(16,v=>{v.setInt32(8,width-1,true);v.setInt32(12,height-1,true);});
  const one=numericBytes(4,v=>v.setFloat32(0,1,true));
  function attribute(name:string,type:string,value:Uint8Array){
    return [cstring(name),cstring(type),numericBytes(4,v=>v.setUint32(0,value.length,true)),value];
  }
  const header=[prefix,
    ...attribute('channels','chlist',info),
    ...attribute('compression','compression',Uint8Array.of(0)),
    ...attribute('dataWindow','box2i',window),
    ...attribute('displayWindow','box2i',window),
    ...attribute('lineOrder','lineOrder',Uint8Array.of(0)),
    ...attribute('pixelAspectRatio','float',one),
    ...attribute('screenWindowCenter','v2f',new Uint8Array(8)),
    ...attribute('screenWindowWidth','float',one),
    Uint8Array.of(0)];
  const table=header.reduce((length,entry)=>length+entry.length,0),rowBytes=width*16,chunk=rowBytes+8;
  const prefixBytes=table+height*8,out=new Uint8Array(prefixBytes+height*chunk),view=new DataView(out.buffer);
  let dst=0;for(const bytes of header){out.set(bytes,dst);dst+=bytes.length;}
  for(let y=0;y<height;y++){
    const offset=prefixBytes+y*chunk;
    view.setBigUint64(table+y*8,BigInt(offset),true);
    view.setInt32(offset,y,true);view.setUint32(offset+4,rowBytes,true);
    for(const [k,name] of channels.entries()){
      const c=channelIndex[name]!;
      for(let x=0;x<width;x++){
        const src=(y*width+x)*4,a=rgba[src+3]!/255;
        view.setFloat32(offset+8+(k*width+x)*4,c===3?a:linear[rgba[src+c]!]!*a,true);
      }
    }
  }
  return out;
}

function unpackZip(data:Uint8Array,size:number){
  const raw=unzlibSync(data,{out:new Uint8Array(size)});
  if(raw.length!==size)throw Error('EXRの圧縮データの長さが違います。');
  for(let i=1;i<raw.length;i++)raw[i]=(raw[i-1]!+raw[i]!-128)&255;
  const unpacked=new Uint8Array(size);
  const half=Math.ceil(size/2);
  for(let i=0;i<size;i++)unpacked[i]=raw[(i>>1)+(i%2?half:0)]!;
  return unpacked;
}

export function decodeExr(bytes:Uint8Array){
  if(bytes.length<16||bytes.length>MAX_EXCHANGE_BYTES)throw Error('EXRファイルの大きさが正しくありません。');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const version=view.getUint32(4,true);
  if(view.getUint32(0,true)!==magic||(version&255)!==2||(version&~0x4ff)!==0)
    throw Error('対応していないEXRです。単一の走査線画像を選んでください。');
  let pos=8;
  function string(end:number,max=255){
    const first=pos;
    while(pos<end&&bytes[pos]&&pos-first<=max)pos++;
    if(pos>=end||bytes[pos]!==0||pos-first>max)throw Error('EXRの属性名が壊れています。');
    return new TextDecoder().decode(bytes.subarray(first,pos++));
  }
  function readWindow(at:number):Window{
    return {x0:view.getInt32(at,true),y0:view.getInt32(at+4,true),x1:view.getInt32(at+8,true),y1:view.getInt32(at+12,true)};
  }
  let data:Window|undefined,display:Window|undefined,compression=-1,customColors=false;
  const channels:Channel[]=[],attributes=new Set<string>();
  while(true){
    const name=string(Math.min(bytes.length,1024*1024));if(!name)break;
    const type=string(bytes.length,32);
    if(attributes.has(name)||attributes.size>=128||pos+4>bytes.length)throw Error('EXRの属性が壊れています。');
    attributes.add(name);
    const size=view.getUint32(pos,true);pos+=4;const end=pos+size;
    if(end>bytes.length||end>1024*1024)throw Error('EXRの属性が大きすぎるか、途中で途切れています。');
    if(name==='dataWindow'&&type==='box2i'&&size===16)data=readWindow(pos);
    if(name==='displayWindow'&&type==='box2i'&&size===16)display=readWindow(pos);
    if(name==='compression'&&type==='compression'&&size===1)compression=bytes[pos]!;
    if(name==='chromaticities'&&type==='chromaticities'&&size===32){
      const srgb=[.64,.33,.30,.60,.15,.06,.3127,.3290];
      customColors=srgb.some((value,i)=>!(Math.abs(value-view.getFloat32(pos+i*4,true))<=1e-4));
    }
    if(name==='channels'&&type==='chlist'){
      const names=new Set<string>();
      for(let key=string(end,64);key;key=string(end,64)){
        if(names.has(key)||channels.length>=32||pos+16>end)throw Error('EXRのチャンネルが壊れています。');
        names.add(key);
        const type=view.getInt32(pos,true),xSampling=view.getInt32(pos+8,true),ySampling=view.getInt32(pos+12,true);
        if(type<0||type>2||xSampling!==1||ySampling!==1)throw Error('間引いたチャンネルを含むEXRは対応していません。');
        channels.push({name:key,type,bytes:type===1?2:4});pos+=16;
      }
      if(pos!==end)throw Error('EXRのチャンネルが壊れています。');
    }
    pos=end;
  }
  if(!data||!display||![0,2,3].includes(compression)||!['R','G','B'].every(name=>channels.some(c=>c.name===name&&c.type!==0)))
    throw Error('RGBの走査線EXR（非圧縮／ZIPS／ZIP、HALF／FLOAT）を選んでください。');
  const width=display.x1-display.x0+1,height=display.y1-display.y0+1;
  const dataWidth=data.x1-data.x0+1,dataHeight=data.y1-data.y0+1;
  assertImageSize(width,height);assertImageSize(dataWidth,dataHeight);
  const step=compression===3?16:1,chunks=Math.ceil(dataHeight/step),table=pos,chunkStart=table+chunks*8;
  const rowBytes=dataWidth*channels.reduce((sum,c)=>sum+c.bytes,0);
  if(chunkStart>bytes.length||rowBytes*dataHeight>MAX_EXCHANGE_BYTES)throw Error('EXRの展開サイズが上限を超えています。');
  const rgba=new Uint8ClampedArray(width*height*4),visited=new Set<number>();
  const colorChannel=(name:string)=>Object.hasOwn(channelIndex,name)?channelIndex[name]!:-1;
  const rows=channels.map(c=>({...c,index:colorChannel(c.name)}));
  const values=new Float32Array(dataWidth*4);
  let cropped=false,hdr=false;
  for(let chunk=0;chunk<chunks;chunk++){
    const offset=Number(view.getBigUint64(table+chunk*8,true));
    if(!Number.isSafeInteger(offset)||offset<chunkStart||offset+8>bytes.length)throw Error('EXRの走査線の位置が壊れています。');
    const y=view.getInt32(offset,true),length=view.getUint32(offset+4,true);
    if(y<data.y0||y>data.y1||(y-data.y0)%step||visited.has(y)||offset+8+length>bytes.length)
      throw Error('EXRの走査線が重複か破損しています。');
    visited.add(y);
    const count=Math.min(step,data.y1-y+1),expected=count*rowBytes;
    if(length>expected||compression===0&&length!==expected)throw Error('EXRの走査線の長さが違います。');
    let block=bytes.subarray(offset+8,offset+8+length);
    if(length!==expected)block=unpackZip(block,expected);
    const lines=new DataView(block.buffer,block.byteOffset,block.byteLength);
    let read=0;
    for(let iy=y;iy<y+count;iy++){
      values.fill(0);
      for(let x=0;x<dataWidth;x++)values[x*4+3]=1;
      for(const channel of rows){
        if(channel.index<0){read+=dataWidth*channel.bytes;continue;}
        for(let x=0;x<dataWidth;x++){
          values[x*4+channel.index]=channel.type===1?half(lines.getUint16(read,true)):
            channel.type===2?lines.getFloat32(read,true):lines.getUint32(read,true)/4294967295;
          read+=channel.bytes;
        }
      }
      if(iy<display.y0||iy>display.y1){cropped=true;continue;}
      for(let x=0;x<dataWidth;x++){
        const px=x+data.x0-display.x0;
        if(px<0||px>=width){cropped=true;continue;}
        const i=((iy-display.y0)*width+px)*4,s=x*4;
        const a=Math.min(1,Math.max(0,Number.isNaN(values[s+3]!)?0:values[s+3]!));
        for(let c=0;c<3;c++){
          const channel=a?values[s+c]!/a:values[s+c]!;
          if(!Number.isFinite(channel)||channel>1.000001||channel<0)hdr=true;
          rgba[i+c]=toByte(Math.max(0,Math.min(1,channel)));
        }
        rgba[i+3]=a*255;
      }
    }
  }
  const warnings=['線形RGBをsRGB・8ビットに変換して開きます。'];
  if(customColors)warnings.push('独自の色原色は変換せず、sRGBの原色として扱います。');
  if(hdr)warnings.push('SDRの範囲を外れる色はクリップします。HDRを保持する用途には原本を使ってください。');
  if(cropped)warnings.push('表示枠の外の画素は取り込みません。');
  if(rows.some(c=>c.index<0))warnings.push('補助チャンネルは取り込みません。');
  return {width,height,pixels:rgba,warnings};
}
