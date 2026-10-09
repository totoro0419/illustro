import {CoreDocument,type RevisionId} from '@illustro/core';
import {GpuRenderer,validateRecord,type StrokeRecord} from '@illustro/brush-rt';

export type ImageFormat='png'|'jpeg'|'webp';
export type FrozenExport=Readonly<{
  revision:RevisionId;width:number;height:number;name:string;colorProfileId:string;
  layers:readonly Readonly<{surfaceId:string;visible:boolean;opacity:number}>[];
  strokes:readonly Readonly<{surfaceId:string;record:StrokeRecord}>[];
}>;
export type ImageExportResult=Readonly<{
  blob:Blob;revision:RevisionId;format:ImageFormat;mime:string;width:number;height:number;
  quality:number|null;alpha:boolean;background:'transparent'|'white';
  encodeMs:number;totalMs:number;estimatedPeakBytes:number;
}>;

export function captureExport(document:CoreDocument):FrozenExport {
  // All logical references are captured before the first asynchronous operation.
  const revision=document.head,root=document.revision(revision).root;
  if(!Number.isSafeInteger(root.width)||!Number.isSafeInteger(root.height)||root.width<1||root.height<1||root.width>8192||root.height>8192)throw new Error('作品の大きさが正しくありません。');
  if(root.colorProfileId!=='srgb')throw new Error('この作品の色設定はM06の書き出しに対応していません。');
  const layers=root.rootLayerIds.map(id=>{
    const layer=root.getLayer(id);
    if(layer.kind!=='raster'||layer.surface.descriptor.sampleEncoding!=='rgba.unorm8.v1'||layer.surface.descriptor.workingColorSpaceRef!=='srgb')throw new Error('このレイヤーの色形式はM06に未対応です。');
    return Object.freeze({surfaceId:layer.surface.descriptor.surfaceId,visible:layer.visible,opacity:layer.opacity});
  });
  const byLayer=new Map(root.rootLayerIds.map(id=>[id,root.getLayer(id).surface.descriptor.surfaceId]));
  const strokes: {surfaceId:string;record:StrokeRecord}[]=[];
  for(const op of document.operationsTo(revision)){
    if(op.kind==='brush.stroke'){
      const id=op.targetEntityIds[0],surfaceId=id===undefined?undefined:byLayer.get(id);
      if(!surfaceId)throw new Error('書き出し対象に不明なレイヤーがあります。');
      strokes.push(Object.freeze({surfaceId,record:validateRecord(op.parameters.strokeRecord)}));
    }else if(op.kind==='raster.strict-delta')throw new Error('厳密なラスターデータの書き出しはまだ利用できません。');
  }
  return Object.freeze({revision,width:root.width,height:root.height,name:root.name,colorProfileId:root.colorProfileId,layers:Object.freeze(layers),strokes:Object.freeze(strokes)});
}

/** Straight-alpha source-over; layer order is bottom to top. Output is never the presentation canvas. */
export function compositeLayer(destination:Uint8ClampedArray,source:Uint8Array|Uint8ClampedArray,opacity=1):void{
  if(destination.length!==source.length||destination.length%4)throw new Error('レイヤーの画像サイズが違います。');
  if(!Number.isFinite(opacity)||opacity<0||opacity>1)throw new Error('不正なレイヤー不透明度です。');
  for(let i=0;i<destination.length;i+=4){
    const sa=source[i+3]!/255*opacity,da=destination[i+3]!/255;
    if(sa===0)continue;
    const oa=sa+da*(1-sa),inva=da*(1-sa);
    destination[i]=Math.round((source[i]!*sa+destination[i]!*inva)/oa);
    destination[i+1]=Math.round((source[i+1]!*sa+destination[i+1]!*inva)/oa);
    destination[i+2]=Math.round((source[i+2]!*sa+destination[i+2]!*inva)/oa);
    destination[i+3]=Math.round(oa*255);
  }
}

function createRenderCanvas(width:number,height:number):HTMLCanvasElement{
  // Dedicated off-DOM canvas; neither the editor canvas nor its GPU context is accessed.
  return Object.assign(document.createElement('canvas'),{width,height});
}

export async function renderFrozenArtwork(frozen:FrozenExport):Promise<Uint8ClampedArray>{
  const {width,height,layers,strokes}=frozen;
  const canvas=createRenderCanvas(width,height);
  let renderer:GpuRenderer|null=null;
  try{
    // Use the same deterministic replay engine for exports regardless of live presentation backend.
    // WebGL2 is preferred here because it avoids acquiring a second WebGPU device.
    try{renderer=await GpuRenderer.create(canvas,width,height,'webgl2',{webglDesynchronized:false});}
    catch{renderer=await GpuRenderer.create(canvas,width,height,'webgpu',{webglDesynchronized:false});}
    renderer.setSurfaceStack(layers.map(l=>l.surfaceId));
    let id=0;
    for(const {surfaceId,record} of strokes){
      const preset={...record.preset,__legacyStarAa:record.engine==='illustro-rt-2.4'};
      renderer.document.append(++id,preset,record.commands,null,surfaceId);
      renderer.document.end(id,preset,surfaceId);
    }
    const composite=new Uint8ClampedArray(width*height*4);
    await renderer.drain();
    for(const layer of layers){
      if(!layer.visible||layer.opacity<=0)continue;
      const pixels=await renderer.read(layer.surfaceId);
      compositeLayer(composite,pixels,layer.opacity);
      // Let pointer input and normal drawing frames execute between layers.
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    }
    return composite;
  }finally{renderer?.destroy();canvas.width=1;canvas.height=1;}
}

export function flattenOnWhite(pixels:Uint8ClampedArray):Uint8ClampedArray{
  const result=new Uint8ClampedArray(pixels.length);
  for(let i=0;i<pixels.length;i+=4){
    const a=pixels[i+3]!/255;
    result[i]=Math.round(pixels[i]!*a+255*(1-a));
    result[i+1]=Math.round(pixels[i+1]!*a+255*(1-a));
    result[i+2]=Math.round(pixels[i+2]!*a+255*(1-a));
    result[i+3]=255;
  }
  return result;
}

const TYPE:Readonly<Record<ImageFormat,string>>={png:'image/png',jpeg:'image/jpeg',webp:'image/webp'};
const suffix:Readonly<Record<ImageFormat,string>>={png:'.png',jpeg:'.jpg',webp:'.webp'};
export function exportFileName(name:string,format:ImageFormat):string{
  const safe=(name.replace(/[\\/:*?"<>|\x00-\x1F]/g,'_').replace(/\.(?:illustro|png|jpe?g|webp)$/i,'').trim()||'Illustro').slice(0,120);
  return safe+suffix[format];
}

function rgbaImageData(pixels:Uint8ClampedArray,width:number,height:number):ImageData{
  return new ImageData(new Uint8ClampedArray(pixels),width,height,{colorSpace:'srgb'});
}

async function encodeBrowser(pixels:Uint8ClampedArray,width:number,height:number,format:'jpeg'|'webp',quality:number):Promise<Blob>{
  const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(width,height):createRenderCanvas(width,height);
  const ctx=canvas.getContext('2d',{alpha:format!=='jpeg',colorSpace:'srgb'}) as OffscreenCanvasRenderingContext2D|CanvasRenderingContext2D|null;
  if(!ctx)throw new Error('画像の変換処理を開始できません。');
  ctx.putImageData(rgbaImageData(pixels,width,height),0,0);
  if('convertToBlob' in canvas)return canvas.convertToBlob({type:TYPE[format],quality});
  return new Promise<Blob>((resolve,reject)=>(canvas as HTMLCanvasElement).toBlob(blob=>blob?resolve(blob):reject(new Error('画像の変換に失敗しました。')),TYPE[format],quality));
}

// PNG RGBA8 encoder: stores straight RGBA byte-for-byte, avoiding Canvas 2D's
// alpha=0 premultiplication which can discard RGB information.
function write32(out:Uint8Array,at:number,v:number){out[at]=(v>>>24)&255;out[at+1]=(v>>>16)&255;out[at+2]=(v>>>8)&255;out[at+3]=v&255;}
const CRC_TABLE=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function pngChunk(type:string,data:Uint8Array):Uint8Array{
  const out=new Uint8Array(12+data.length);write32(out,0,data.length);
  for(let i=0;i<4;i++)out[4+i]=type.charCodeAt(i);
  out.set(data,8);let crc=0xffffffff;
  for(let i=4;i<8+data.length;i++)crc=CRC_TABLE[(crc^out[i]!)&255]!^(crc>>>8);
  write32(out,8+data.length,(crc^0xffffffff)>>>0);return out;
}
function deflateStored(source:Uint8Array):Uint8Array{
  // Standards-compliant zlib stream of uncompressed DEFLATE blocks; fallback
  // for browsers without CompressionStream.
  const chunks=Math.max(1,Math.ceil(source.length/65535)),out=new Uint8Array(source.length+chunks*5+6);
  out[0]=0x78;out[1]=0x01;let at=2,a=1,b=0;
  for(let start=0;start<source.length;start+=65535){
    const len=Math.min(65535,source.length-start),last=start+len===source.length;
    out[at++]=last?1:0;out[at++]=len&255;out[at++]=(len>>>8)&255;out[at++]=(~len)&255;out[at++]=((~len)>>>8)&255;
    out.set(source.subarray(start,start+len),at);at+=len;
  }
  for(let i=0;i<source.length;i++){a=(a+source[i]!)%65521;b=(b+a)%65521;}
  write32(out,at,((b<<16)|a)>>>0);return out;
}
export async function encodePng(pixels:Uint8ClampedArray,width:number,height:number):Promise<Blob>{
  if(pixels.length!==width*height*4)throw new Error('PNGの画素数が正しくありません。');
  const stride=width*4,raw=new Uint8Array((stride+1)*height);
  for(let y=0;y<height;y++)raw.set(pixels.subarray(y*stride,(y+1)*stride),y*(stride+1)+1);
  let zipped:Uint8Array;
  if(typeof CompressionStream!=='undefined'){
    const stream=new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'));
    zipped=new Uint8Array(await new Response(stream).arrayBuffer());
  }else zipped=deflateStored(raw);
  const head=new Uint8Array(13);write32(head,0,width);write32(head,4,height);head[8]=8;head[9]=6;
  const sig=Uint8Array.of(137,80,78,71,13,10,26,10),ihdr=pngChunk('IHDR',head),srgb=pngChunk('sRGB',Uint8Array.of(0)),idat=pngChunk('IDAT',zipped),end=pngChunk('IEND',new Uint8Array());
  return new Blob([sig,ihdr,srgb,idat,end].map(bytes=>new Uint8Array(bytes).buffer as ArrayBuffer),{type:'image/png'});
}

export async function verifyImage(blob:Blob,format:ImageFormat,width:number,height:number):Promise<void>{
  if(blob.type!==TYPE[format]||blob.size<16)throw new Error('選択した形式で画像を作れませんでした。');
  const bytes=new Uint8Array(await blob.slice(0,40).arrayBuffer());
  const png=bytes.slice(0,8).every((n,i)=>n===[137,80,78,71,13,10,26,10][i]);
  const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(!(format==='png'?png:format==='jpeg'?jpeg:webp))throw new Error('画像ファイルの形式が指定と異なります。');
  const bitmap=await createImageBitmap(blob);
  try{if(bitmap.width!==width||bitmap.height!==height)throw new Error('書き出した画像の大きさが違います。');}
  finally{bitmap.close();}
}

export async function exportImage(frozen:FrozenExport,format:ImageFormat,quality=0.9):Promise<ImageExportResult>{
  const started=performance.now();
  if(!['png','jpeg','webp'].includes(format)||!Number.isFinite(quality)||quality<0||quality>1)throw new Error('書き出し設定が正しくありません。');
  const pixels=await renderFrozenArtwork(frozen),encodedStart=performance.now();
  const flattened=format==='jpeg'?flattenOnWhite(pixels):pixels;
  const blob=format==='png'?await encodePng(pixels,frozen.width,frozen.height):await encodeBrowser(flattened,frozen.width,frozen.height,format,quality);
  await verifyImage(blob,format,frozen.width,frozen.height);
  return Object.freeze({blob,revision:frozen.revision,format,mime:blob.type,width:frozen.width,height:frozen.height,quality:format==='png'?null:quality,alpha:format!=='jpeg',background:format==='jpeg'?'white':'transparent',encodeMs:performance.now()-encodedStart,totalMs:performance.now()-started,estimatedPeakBytes:frozen.width*frozen.height*4*(frozen.layers.length+4)});
}
