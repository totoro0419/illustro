import {addRasterMetadata} from './rasterMetadata';
import {runIcc} from './iccRun';
import {srgbIccBytes} from './iccMetadata';
import {CoreDocument,type LayerBlend,type LayerMask,type LayerId,type RevisionId,type DocumentRoot} from '@illustro/core';
import {blendArtworkPixel,gradientMapTable,mapGradientPixel,adjustmentCube,mapAdjustmentPixel,GpuRenderer,layerMaskTile,TILE,validateRecord,type StrokeRecord} from '@illustro/brush-rt';
import {canUseTiledHistoryPreview,createTiledPreviewAccumulator,yieldHistoryRender} from './tiledPreview';
import {rasterReplayKeys} from '../rasterReplayKeys';
import {resizeImagePixels} from '../canvasGeometry';
import {boundsOfSelection,cropSelectionMask,maskImage,type MaskData} from '../selection/mask';

export type ImageFormat='png'|'jpeg'|'webp';
export type FrozenExport=Readonly<{
  revision:RevisionId;width:number;height:number;name:string;colorProfileId:string;
  layers:readonly Readonly<{surfaceId:string;visible:boolean;opacity:number;baseColor?:'white';clipSurfaceId?:string;referenceOnly?:boolean;isolation?:readonly string[];mask?:LayerMask;blend?:LayerBlend}>[];
  basePixels?:readonly Readonly<{surfaceId:string;pixels:Uint8Array}>[];
  strokes:readonly Readonly<{surfaceId:string;record:StrokeRecord;keys?:readonly string[]}>[];
}>;
export type ImageExportResult=Readonly<{
  blob:Blob;revision:RevisionId;format:ImageFormat;mime:string;width:number;height:number;
  quality:number|null;alpha:boolean;background:'transparent'|'white';
  encodeMs:number;totalMs:number;estimatedPeakBytes:number;
}>;

export function captureExport(document:CoreDocument,soloLayerId?:LayerId,revision=document.head):FrozenExport {
  // All logical references are captured before the first asynchronous operation.
  const root=document.revision(revision).root;
  if(!Number.isSafeInteger(root.width)||!Number.isSafeInteger(root.height)||root.width<1||root.height<1||root.width>8192||root.height>8192)throw new Error('作品の大きさが正しくありません。');
  if(root.colorProfileId!=='srgb')throw new Error('この作品の色設定はM06の書き出しに対応していません。');
  if(soloLayerId&&!root.hasLayer(soloLayerId))throw new Error('単独表示のレイヤーが見つかりません。');
  const layers=captureExportLayers(root,soloLayerId);
  const byLayer=new Map(root.rootLayerIds.map(id=>[id,root.getLayer(id).surface.descriptor.surfaceId]));
  const strokes: {surfaceId:string;record:StrokeRecord;keys?:readonly string[]}[]=[];
  const {operations:visibleOperations,followsGeometry,seededLayers,tileFilteredLayers}=document.rasterReplayPlan(revision);
  const basePixels=root.rootLayerIds.filter(id=>followsGeometry||seededLayers.has(id)).map(id=>({
    surfaceId:root.getLayer(id).surface.descriptor.surfaceId,pixels:document.readBaseRasterPixels(id,revision),
  }));
  for(const op of visibleOperations){
    const target=op.targetEntityIds[0];
    if(target&&!byLayer.has(target))continue;
    if(op.kind==='brush.stroke'){
      const id=op.targetEntityIds[0],surfaceId=id===undefined?undefined:byLayer.get(id);
      if(!surfaceId)throw new Error('書き出し対象に不明なレイヤーがあります。');
      strokes.push(Object.freeze({surfaceId,record:validateRecord(op.parameters.strokeRecord),
        ...(id&&tileFilteredLayers.has(id)?{keys:Object.freeze(rasterReplayKeys(op,root.width,root.height))}:{})}));
    }else if(op.kind==='raster.strict-delta')throw new Error('厳密なラスターデータの書き出しはまだ利用できません。');
  }
  return Object.freeze({revision,width:root.width,height:root.height,name:root.name,colorProfileId:root.colorProfileId,layers:Object.freeze(layers),strokes:Object.freeze(strokes),...(basePixels.length?{basePixels}:{})});
}

/** Capture only the stack. Live tools read local GPU tiles rather than replaying history. */
export function captureExportLayers(root:DocumentRoot,soloLayerId?:LayerId):FrozenExport['layers'] {
  return root.rootLayerIds.map(id=>{
    const layer=root.getLayer(id);
    if(layer.kind!=='raster'||layer.surface.descriptor.sampleEncoding!=='rgba.unorm8.v1'||layer.surface.descriptor.workingColorSpaceRef!=='srgb')throw new Error('このレイヤーの色形式はM06に未対応です。');
    const clip=soloLayerId?null:root.clippingSource(id);
    const isolation=soloLayerId?[]:root.groupsForLayer(id).filter(group=>group.compositing==='isolated').map(group=>group.id);
    return Object.freeze({surfaceId:layer.surface.descriptor.surfaceId,...(isolation.length?{isolation}:{}),...(clip?{clipSurfaceId:clip.surface.descriptor.surfaceId}:{}),...(layer.vectorMask?.enabled?{mask:layer.vectorMask}:{}),...(layer.blend&&!soloLayerId?{blend:layer.blend}:{}),visible:soloLayerId?id===soloLayerId:root.isLayerVisible(id),opacity:layer.opacity,...(layer.baseColor?{baseColor:layer.baseColor}:{})});
  });
}

/** Straight-alpha source-over; layer order is bottom to top. Output is never the presentation canvas. */
export function compositeLayer(destination:Uint8ClampedArray,source:Uint8Array|Uint8ClampedArray,opacity=1,clip?:{pixels:Uint8Array|Uint8ClampedArray;opacity:number;mask?:LayerMask|null},shape?:{width:number;mask?:LayerMask|null;blend?:LayerBlend|null;originX?:number;originY?:number}):void{
  if(destination.length!==source.length||destination.length%4)throw new Error('レイヤーの画像サイズが違います。');
  if(!Number.isFinite(opacity)||opacity<0||opacity>1)throw new Error('不正なレイヤー不透明度です。');
  const tileSize=TILE;
  const blend=shape?.blend;
  const advanced=blend&&(blend.mode!=='normal'||blend.space==='linear'||blend.tone||blend.effect?.enabled);
  const hasMask=shape&&(shape.mask?.enabled||clip?.mask?.enabled||blend?.effect?.enabled&&blend.effect.mask?.enabled);
  const maskRows=new Map<number,readonly [number|Uint8Array,number|Uint8Array,number|Uint8Array]>();
  let tileY=-1;
  for(let i=0;i<destination.length;i+=4){
    let sa=source[i+3]!/255*opacity*(clip?clip.pixels[i+3]!/255*clip.opacity:1);
    if(sa===0)continue;
    let effectCoverage=1;
    if(hasMask){
      const pixel=i/4,x=pixel%shape.width+(shape.originX??0),y=Math.floor(pixel/shape.width)+(shape.originY??0);
      const tx=Math.floor(x/tileSize),ty=Math.floor(y/tileSize);
      if(ty!==tileY){maskRows.clear();tileY=ty;}
      let alpha=maskRows.get(tx);
      if(!alpha){
        const key=tx+','+ty;
        alpha=[layerMaskTile(shape.mask,key),layerMaskTile(clip?.mask,key),layerMaskTile(blend?.effect?.mask,key)];
        maskRows.set(tx,alpha);
      }
      const offset=(y%tileSize)*tileSize+x%tileSize;
      const [own,source,adjustment]=alpha;
      effectCoverage=(typeof adjustment==='number'?adjustment:adjustment[offset]!)/255;
      sa*=(typeof own==='number'?own:own[offset]!)*(typeof source==='number'?source:source[offset]!)/65025;
    }
    if(sa===0)continue;
    if(advanced){
      const pixel=i/4,width=shape!.width;
      blendArtworkPixel(destination,i,source,sa,blend,pixel%width+(shape!.originX??0),Math.floor(pixel/width)+(shape!.originY??0),effectCoverage);
      continue;
    }
    const da=destination[i+3]!/255;
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
  if(!layers.length)return new Uint8ClampedArray(width*height*4);
  const canvas=createRenderCanvas(width,height);
  let renderer:GpuRenderer|null=null;
  try{
    // Use the same deterministic replay engine for exports regardless of live presentation backend.
    // WebGL2 is preferred here because it avoids acquiring a second WebGPU device.
    try{renderer=await GpuRenderer.create(canvas,width,height,'webgl2',{webglDesynchronized:false});}
    catch{renderer=await GpuRenderer.create(canvas,width,height,'webgpu',{webglDesynchronized:false});}
    renderer.setSurfaceStack(layers.map(l=>l.surfaceId));
    if(frozen.basePixels)await seedBasePixels(renderer,frozen.basePixels,width,height);
    let id=0;
    for(const {surfaceId,record,keys} of strokes){
      const preset={...record.preset,__legacyStarAa:record.engine==='illustro-rt-2.4'};
      renderer.document.append(++id,preset,record.commands,keys?new Set(keys):null,surfaceId);
      renderer.document.end(id,preset,surfaceId);
    }
    await renderer.drain();
    const composite=await compositeArtworkRegion(layers,{x:0,y:0,width,height},async id=>{
      // Yield between full layer readbacks so the work area stays responsive.
      await yieldHistoryRender();
      return renderer!.read(id);
    });
    if(!composite)throw Error('作品の合成に必要な画素を読み取れません。');
    return composite;
  }finally{renderer?.destroy();canvas.width=1;canvas.height=1;}
}

/** Thumbnail-only fast path: identical source-over compositing per source pixel,
 * but only one GPU tile is read and combined at a time. Advanced content falls
 * back to the unchanged full-resolution renderer.
 */
export type ArtworkRegion=Readonly<{x:number;y:number;width:number;height:number}>;

/** Compose a region using the same masks, opacity and group order as export. */
export async function compositeArtworkRegion(
  layers:FrozenExport['layers'],area:ArtworkRegion,
  read:(surfaceId:string)=>Promise<Uint8Array|Uint8ClampedArray|null>,signal?:AbortSignal,
  tables=new Map<object,Uint8Array>(),
):Promise<Uint8ClampedArray|null>{
  const {x,y,width,height}=area,length=width*height*4;
  const merged=new Uint8ClampedArray(length);
  let white:Uint8ClampedArray|null=null;
  const byId=new Map(layers.map(layer=>[layer.surfaceId,layer]));
  const clippingSources=new Set(layers.flatMap(layer=>layer.clipSurfaceId?[layer.clipSurfaceId]:[]));
  const clippedPixels=new Map<string,Uint8Array|Uint8ClampedArray>();
  const groups:Array<{id:string;pixels:Uint8ClampedArray}>=[];
  function closeGroup(){
    const group=groups.pop()!;
    compositeLayer(groups.at(-1)?.pixels??merged,group.pixels);
  }
  async function readLayer(layer:FrozenExport['layers'][number]){
    signal?.throwIfAborted();
    if(layer.baseColor==='white')return white??=new Uint8ClampedArray(length).fill(255);
    const pixels=clippedPixels.get(layer.surfaceId)??await read(layer.surfaceId);
    if(!pixels)return null;
    if(pixels.length!==length)throw Error('合成に必要な画素が不足しています。');
    if(clippingSources.has(layer.surfaceId))clippedPixels.set(layer.surfaceId,pixels);
    return pixels;
  }
  for(const layer of layers){
    signal?.throwIfAborted();
    if(layer.referenceOnly||!layer.visible||layer.opacity<=0)continue;
    const isolation=layer.isolation??[];
    let common=0;
    while(common<groups.length&&isolation[common]===groups[common]?.id)common++;
    while(groups.length>common)closeGroup();
    for(const id of isolation.slice(common))groups.push({id,pixels:new Uint8ClampedArray(length)});
    const clip=layer.clipSurfaceId?byId.get(layer.clipSurfaceId):undefined;
    if(clip&&(!clip.visible||clip.opacity<=0))continue;
    const destination=groups.at(-1)?.pixels??merged,clipPixels=clip?await readLayer(clip):null;
    if(clip&&!clipPixels)return null;
    const map=layer.blend?.gradientMap,adjustment=layer.blend?.adjustment,lookup=map??adjustment;
    if(lookup){
      let table=tables.get(lookup);
      if(!table){table=map?gradientMapTable(map):adjustmentCube(adjustment!);tables.set(lookup,table);}
      const cache=new Map<number,readonly [number|Uint8Array,number|Uint8Array]>();
      for(let row=0;row<height;row++)for(let col=0;col<width;col++){
        const px=x+col,py=y+row,tx=Math.floor(px/TILE),ty=Math.floor(py/TILE),key=ty*128+tx;
        let masks=cache.get(key);
        if(!masks){const tileKey=tx+','+ty;masks=[layerMaskTile(layer.mask,tileKey),layerMaskTile(clip?.mask,tileKey)];cache.set(key,masks);}
        const [own,clipping]=masks,local=(py%TILE)*TILE+px%TILE,offset=(row*width+col)*4;
        const coverage=layer.opacity*(typeof own==='number'?own:own[local]!)/255*
          (clip&&clipPixels?clipPixels[offset+3]!*clip.opacity*(typeof clipping==='number'?clipping:clipping[local]!)/65025:1);
        if(map)mapGradientPixel(destination,offset,table,map,px,py,coverage);
        else mapAdjustmentPixel(destination,offset,table,coverage);
      }
      continue;
    }
    const pixels=await readLayer(layer);
    if(!pixels)return null;
    compositeLayer(destination,pixels,layer.opacity,clip&&clipPixels?{pixels:clipPixels,opacity:clip.opacity,mask:clip.mask??null}:undefined,
      {width,originX:x,originY:y,mask:layer.mask??null,blend:layer.blend??null});
  }
  while(groups.length)closeGroup();
  signal?.throwIfAborted();
  return merged;
}

export async function renderFrozenArtworkTiledPreview(
  frozen:FrozenExport,targetWidth:number,targetHeight:number,
  options?:Readonly<{replacement:{surfaceId:string;pixels:Uint8ClampedArray};signal:AbortSignal}>,
):Promise<Uint8ClampedArray|null>{
  if(!canUseTiledHistoryPreview(frozen,targetWidth,targetHeight))return null;
  const {width,height,layers,strokes}=frozen;
  const replacement=options?.replacement;
  if(replacement&&(replacement.pixels.length!==width*height*4||!layers.some(layer=>layer.surfaceId===replacement.surfaceId)))
    throw Error('差し替えるレイヤーの画像サイズが正しくありません。');
  const check=()=>options?.signal.throwIfAborted();
  check();
  const canvas=createRenderCanvas(width,height);
  let renderer:GpuRenderer|null=null;
  try{
    try{renderer=await GpuRenderer.create(canvas,width,height,'webgl2',{webglDesynchronized:false});}
    catch{renderer=await GpuRenderer.create(canvas,width,height,'webgpu',{webglDesynchronized:false});}
    renderer.setSurfaceStack(layers.map(layer=>layer.surfaceId));
    if(frozen.basePixels)await seedBasePixels(renderer,frozen.basePixels.filter(layer=>layer.surfaceId!==replacement?.surfaceId),width,height);
    let id=0;
    for(const {surfaceId,record,keys} of strokes){
      if(surfaceId===replacement?.surfaceId)continue;
      check();
      const preset={...record.preset,__legacyStarAa:record.engine==='illustro-rt-2.4'};
      renderer.document.append(++id,preset,record.commands,keys?new Set(keys):null,surfaceId);
      renderer.document.end(id,preset,surfaceId);
    }
    await renderer.drain();
    check();
    const accumulator=createTiledPreviewAccumulator(width,height,targetWidth,targetHeight);
    const tables=new Map<object,Uint8Array>();
    for(let ty=0;ty<Math.ceil(height/TILE);ty++){
      for(let tx=0;tx<Math.ceil(width/TILE);tx++){
        check();
        const x=tx*TILE,y=ty*TILE,key=tx+','+ty;
        const composite=await compositeArtworkRegion(layers,{x,y,width:TILE,height:TILE},async id=>{
          if(id!==replacement?.surfaceId)return await renderer!.readTile(id,key)??new Uint8Array(TILE*TILE*4);
          const pixels=new Uint8ClampedArray(TILE*TILE*4);
          for(let row=0;row<TILE&&y+row<height;row++){
            const from=((y+row)*width+x)*4;
            pixels.set(replacement.pixels.subarray(from,from+Math.min(TILE,width-x)*4),row*TILE*4);
          }
          return pixels;
        },options?.signal,tables);
        if(!composite)return null;
        accumulator.addTile(composite,x,y,TILE);
      }
      await yieldHistoryRender();
    }
    check();
    return accumulator.finish();
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
type PngMetadata=Readonly<{includeIcc?:boolean;iccProfile?:Uint8Array;author?:string;copyright?:string}>;
export async function encodePng(pixels:Uint8ClampedArray,width:number,height:number,dpi?:number,metadata:PngMetadata={}):Promise<Blob>{
  if(pixels.length!==width*height*4)throw new Error('PNGの画素数が正しくありません。');
  const stride=width*4,raw=new Uint8Array((stride+1)*height);
  for(let y=0;y<height;y++)raw.set(pixels.subarray(y*stride,(y+1)*stride),y*(stride+1)+1);
  let zipped:Uint8Array;
  if(typeof CompressionStream!=='undefined'){
    const compressor=new CompressionStream('deflate');
    const writer=compressor.writable.getWriter();
    const write=async()=>{
      try{
        const chunkSize=1024*1024;
        for(let offset=0;offset<raw.length;offset+=chunkSize)
          await writer.write(raw.subarray(offset,offset+chunkSize));
        await writer.close();
      }finally{writer.releaseLock();}
    };
    const [compressed]=await Promise.all([new Response(compressor.readable).arrayBuffer(),write()]);
    zipped=new Uint8Array(compressed);
  }else zipped=deflateStored(raw);
  const head=new Uint8Array(13);write32(head,0,width);write32(head,4,height);head[8]=8;head[9]=6;
  const sig=Uint8Array.of(137,80,78,71,13,10,26,10),ihdr=pngChunk('IHDR',head),idat=pngChunk('IDAT',zipped),end=pngChunk('IEND',new Uint8Array());
  const profile=metadata.iccProfile??(metadata.includeIcc?srgbIccBytes():null);
  let color=pngChunk('sRGB',Uint8Array.of(0));
  if(profile){
    const label=new TextEncoder().encode((metadata.iccProfile?'Output ICC':'sRGB')+'\0\0');
    const zipped=deflateStored(profile),payload=new Uint8Array(label.length+zipped.length);
    payload.set(label);payload.set(zipped,label.length);color=pngChunk('iCCP',payload);
  }
  const textChunks:Uint8Array[]=[];
  for(const [label,value] of [['Author',metadata.author],['Copyright',metadata.copyright]] as const){
    if(value?.trim())textChunks.push(pngChunk('iTXt',new TextEncoder().encode(label+'\0\0\0\0\0'+value.trim().slice(0,4096).replaceAll('\0',''))));
  }
  const density:Uint8Array[]=[];
  if(dpi!==undefined){
    if(!Number.isFinite(dpi)||dpi<1||dpi>2400)throw Error('PNGのDPIは1〜2400で指定してください。');
    const data=new Uint8Array(9),pixelsPerMetre=Math.round(dpi/.0254);
    write32(data,0,pixelsPerMetre);write32(data,4,pixelsPerMetre);data[8]=1;
    density.push(pngChunk('pHYs',data));
  }
  return new Blob([sig,ihdr,color,...density,...textChunks,idat,end].map(bytes=>new Uint8Array(bytes).buffer as ArrayBuffer),{type:'image/png'});
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

export type ImageExportOptions=Readonly<{selection?:MaskData;pixelScale?:number;dpi?:number;pngMetadata?:PngMetadata;
  losslessWebp?:boolean;comparison?:(original:ImageData,compressed:ImageData)=>void}>;

async function encodeLosslessWebp(pixels:Uint8ClampedArray,width:number,height:number){
  const worker=new Worker(new URL('./webp.worker.ts',import.meta.url),{type:'module'});
  try{
    return await new Promise<Blob>((resolve,reject)=>{
      worker.onmessage=(event:MessageEvent<{error:string}|{buffer:ArrayBuffer}>)=>{
        if('error' in event.data)reject(Error(event.data.error));
        else resolve(new Blob([event.data.buffer],{type:'image/webp'}));
      };
      worker.onerror=()=>reject(Error('WebPの可逆圧縮を開始できません。'));
      const input=new Uint8ClampedArray(pixels);
      worker.postMessage({pixels:input,width,height},[input.buffer]);
    });
  }finally{worker.terminate();}
}

function originalCrop(pixels:Uint8ClampedArray,width:number,height:number){
  const w=Math.min(240,width),h=Math.min(180,height);
  const x=Math.floor((width-w)/2),y=Math.floor((height-h)/2),image=new ImageData(w,h);
  for(let row=0;row<h;row++){
    const start=((y+row)*width+x)*4;
    image.data.set(pixels.subarray(start,start+w*4),row*w*4);
  }
  return {x,y,w,h,image};
}

export async function exportImage(frozen:FrozenExport,format:ImageFormat,quality=0.9,options:ImageExportOptions={}):Promise<ImageExportResult>{
  const started=performance.now();
  if(!['png','jpeg','webp'].includes(format)||!Number.isFinite(quality)||quality<0||quality>1)throw new Error('書き出し設定が正しくありません。');
  const {selection,pixelScale=1,dpi,pngMetadata}=options;
  if(!Number.isSafeInteger(pixelScale)||pixelScale<1||pixelScale>8)throw Error('整数倍の拡大率は1〜8で指定してください。');
  if(selection&&(selection.width!==frozen.width||selection.height!==frozen.height||selection.alpha.length!==frozen.width*frozen.height))
    throw Error('選択範囲と作品の大きさが一致しません。');
  const bounds=selection?boundsOfSelection(selection):null;
  if(selection&&!bounds)throw Error('書き出す範囲を選んでください。');
  let width=bounds?.width??frozen.width,height=bounds?.height??frozen.height;
  if(width*pixelScale>8192||height*pixelScale>8192)throw Error('書き出し後の長い辺を8192px以下にしてください。');
  let pixels=await renderFrozenArtwork(frozen);
  if(bounds&&selection){
    const cropped=new Uint8ClampedArray(width*height*4);
    for(let y=0;y<height;y++){
      const start=((bounds.y+y)*frozen.width+bounds.x)*4;
      cropped.set(pixels.subarray(start,start+width*4),y*width*4);
    }
    pixels=maskImage(cropped,cropSelectionMask(selection,bounds));
  }
  if(pixelScale!==1){
    pixels=new Uint8ClampedArray(resizeImagePixels(pixels,width,height,width*pixelScale,height*pixelScale,'nearest'));
    width*=pixelScale;height*=pixelScale;
  }
  const encodedStart=performance.now();
  const original=options.comparison?originalCrop(pixels,width,height):null;
  let output=format==='jpeg'?flattenOnWhite(pixels):pixels;
  const profile=pngMetadata?.iccProfile??(pngMetadata?.includeIcc?srgbIccBytes():undefined);
  if(pngMetadata?.iccProfile){
    if(String.fromCharCode(...pngMetadata.iccProfile.subarray(16,20))!=='RGB ')
      throw Error('RGBの出力用ICCを選んでください。');
    const {converted}=await runIcc({profile:pngMetadata.iccProfile,layers:[output],proof:false,forExport:true,
      intent:1,blackPoint:true,gamut:false},true);
    output=converted[0]!.pixels;
  }
  let blob=format==='png'?await encodePng(output,width,height,dpi,pngMetadata):
    format==='webp'&&options.losslessWebp?await encodeLosslessWebp(output,width,height):await encodeBrowser(output,width,height,format,quality);
  if(format!=='png')blob=await addRasterMetadata(blob,format,width,height,{
    ...(profile?{profile}:{}),...(dpi===undefined?{}:{dpi}),
    ...(pngMetadata?.author?{author:pngMetadata.author}:{}),...(pngMetadata?.copyright?{copyright:pngMetadata.copyright}:{})
  });
  await verifyImage(blob,format,width,height);
  if(original&&options.comparison){
    const {x,y,w,h,image}=original,decoded=await createImageBitmap(blob);
    try{
      const canvas=createRenderCanvas(w,h),context=canvas.getContext('2d');
      if(!context)throw Error('比較画像を表示できません。');
      context.drawImage(decoded,x,y,w,h,0,0,w,h);
      options.comparison(image,context.getImageData(0,0,w,h));
    }finally{decoded.close();}
  }
  return Object.freeze({blob,revision:frozen.revision,format,mime:blob.type,width,height,quality:format==='png'||format==='webp'&&options.losslessWebp?null:quality,alpha:format!=='jpeg',background:format==='jpeg'?'white':'transparent',encodeMs:performance.now()-encodedStart,totalMs:performance.now()-started,estimatedPeakBytes:frozen.width*frozen.height*4*(frozen.layers.length+4)+(pixelScale!==1?width*height*8:0)});
}

async function seedBasePixels(renderer:GpuRenderer,layers:readonly {surfaceId:string;pixels:Uint8Array}[],width:number,height:number){
  const backend=(renderer as unknown as {backend:any}).backend,T=128;
  for(const layer of layers)for(let ty=0;ty<Math.ceil(height/T);ty++)for(let tx=0;tx<Math.ceil(width/T);tx++){
    const pixels=new Uint8Array(T*T*4);let nonEmpty=false;
    for(let y=0;y<Math.min(T,height-ty*T);y++){const row=layer.pixels.subarray(((ty*T+y)*width+tx*T)*4,((ty*T+y)*width+tx*T+Math.min(T,width-tx*T))*4);pixels.set(row,y*T*4);for(let i=3;i<row.length;i+=4)if(row[i])nonEmpty=true;}
    if(!nonEmpty)continue;const key=tx+','+ty,tile=backend.tile(key,layer.surfaceId),target=tile.layer[tile.l];
    if(backend.gl){const g=backend.gl;g.bindTexture(g.TEXTURE_2D,target.t);g.texSubImage2D(g.TEXTURE_2D,0,0,0,T,T,g.RGBA,g.UNSIGNED_BYTE,pixels);}
    else backend.device.queue.writeTexture({texture:target},pixels,{bytesPerRow:T*4},[T,T]);
    tile.committedId=-1;backend.dirtyConfirmed.add(key);
  }
  if(backend.device)await backend.device.queue.onSubmittedWorkDone();
}
