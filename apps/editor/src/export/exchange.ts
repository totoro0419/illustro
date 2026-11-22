import {type CoreDocument,type EditableArtwork,type EditablePath,type LayerId} from '@illustro/core';
import {captureExport,compositeLayer,encodePng,renderFrozenArtwork,type FrozenExport} from './basicExport';
import {assertImageSize,cleanFileName,imageLayer,MAX_EXCHANGE_BYTES,supportsOraBlend,xmlText,type ExchangeArtwork,type ExchangeFormat,type ExchangeLayer} from './exchangeTypes';
import {runIcc} from './iccRun';
import {decodeTiff,encodeTiff} from './tiff';

const formats:Record<string,ExchangeFormat|'heif'>={psd:'psd',psb:'psb',ora:'ora',tif:'tiff',tiff:'tiff',avif:'avif',svg:'svg',exr:'exr',heic:'heif',heif:'heif'};
const types:Record<ExchangeFormat,string>={psd:'image/vnd.adobe.photoshop',psb:'application/octet-stream',ora:'image/openraster',
  tiff:'image/tiff',svg:'image/svg+xml',avif:'image/avif',exr:'image/x-exr'};
export function exchangeFormat(name:string){
  return formats[name.split('.').pop()?.toLowerCase()??'']??null;
}
export const exchangeFileName=(name:string,format:ExchangeFormat)=>cleanFileName(name)+'.'+(format==='tiff'?'tiff':format);
export function readExchangeDimensions(blob:Blob){
  return createImageBitmap(blob).then(image=>{
    try{
      const {width,height}=image;assertImageSize(width,height);
      const canvas=Object.assign(document.createElement('canvas'),{width,height}),context=canvas.getContext('2d');
      if(!context)throw Error('画素を取得できません。');
      try{context.drawImage(image,0,0);return {width,height,pixels:context.getImageData(0,0,width,height).data};}
      finally{canvas.width=1;canvas.height=1;}
    }finally{image.close();}
  });
}

export async function importExchange(file:File):Promise<ExchangeArtwork>{
  const format=exchangeFormat(file.name),name=cleanFileName(file.name);
  if(file.size>MAX_EXCHANGE_BYTES)throw Error('交換用ファイルは256MBまでです。');
  if(format==='avif'||format==='heif'){
    const media=file.type?file:new Blob([file],{type:format==='avif'?'image/avif':file.name.toLowerCase().endsWith('.heic')?'image/heic':'image/heif'});
    const {width,height,pixels}=await readExchangeDimensions(media).catch(()=>{
      throw Error('このブラウザーではこの'+format.toUpperCase()+'画像を開けません。PNGまたはTIFFに変換してから開いてください。');
    });
    return {width,height,name,layers:[imageLayer(name,width,height,pixels)],warnings:['編集用のsRGB・8ビット画像として取り込みます。']};
  }
  if(format==='svg')throw Error('SVGはこの画面では出力専用です。PNGに変換してから読み込んでください。');
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(format==='psd'||format==='psb')return (await import('./psdExchange')).decodePhotoshop(bytes,name);
  if(format==='ora')return (await import('./oraExchange')).decodeOra(bytes,name,data=>readExchangeDimensions(new Blob([new Uint8Array(data)],{type:'image/png'})));
  if(format==='exr'){
    const {width,height,pixels,warnings}=(await import('./exr')).decodeExr(bytes);
    return {width,height,name,layers:[imageLayer(name,width,height,pixels)],warnings};
  }
  if(format==='tiff'){
    const {width,height,pixels,dpi,warnings,sourceIcc}=decodeTiff(bytes);
    return {width,height,name,dpi,layers:[imageLayer(name,width,height,pixels)],warnings,...(sourceIcc?{sourceIcc}:{})};
  }
  throw Error('対応する交換形式ではありません。');
}

export async function convertExchangeColors(source:ExchangeArtwork,applyProfile:boolean):Promise<ExchangeArtwork>{
  if(!source.sourceIcc)return source;
  if(!applyProfile)return {...source,warnings:[...source.warnings,'画素値を変更せずsRGBとして割り当てました。']};
  const {layers,merged,sourceIcc}=source;
  const input=layers.map(layer=>layer.pixels);
  if(merged)input.push(merged);
  const {name,converted}=await runIcc({profile:sourceIcc,layers:input,proof:false,intent:1,blackPoint:true,gamut:false},true);
  return {...source,layers:layers.map((layer,index)=>({...layer,pixels:converted[index]!.pixels})),
    ...(merged?{merged:converted[layers.length]!.pixels}:{}),warnings:[...source.warnings,'埋め込みICC「'+name+'」からsRGBへ画素を変換しました。']};
}

export function exchangeWarnings(doc:CoreDocument,format:ExchangeFormat,layered:boolean){
  const root=doc.root,warnings=new Set<string>();
  if(format==='exr')warnings.add('表示中の絵をリニアsRGBの32ビット浮動小数点で出力します。元の8ビット作品と同じ色の範囲で、HDRには広がりません。');
  else if(format==='avif'||format==='tiff'||!layered)warnings.add('表示中の作品を1枚のsRGB・8ビット画像にします。レイヤーや編集履歴は含まれません。');
  else {
    if(root.layerGroups.length)warnings.add('グループを展開します。グループの合成は交換先で変わることがあります。');
    for(const id of root.rootLayerIds){
      const layer=root.getLayer(id);
      if(layer.editable&&!(format==='svg'&&exportablePath(layer.editable)&&!special(layer)))
        warnings.add('「'+layer.name+'」の文字・ベクター・グラデーションは画素で出力されます。');
      if(special(layer))warnings.add('「'+layer.name+'」のマスク・クリッピング・色効果は編集用のレイヤーに引き継がれない場合があります。');
      if(format==='ora'&&layer.blend&&!supportsOraBlend(layer.blend.mode))
        warnings.add('「'+layer.name+'」の合成方法はOpenRasterでは通常に変換します。');
      if(format==='svg'&&layer.blend?.mode!=='normal'&&layer.blend?.mode)warnings.add('SVGの編集用レイヤーでは合成方法を通常に変更します。');
      if(layer.lineRegions||layer.imageLink||layer.deformation)warnings.add('解析・リンク・変形の編集データは作品ファイルにのみ残ります。');
    }
  }
  return [...warnings];
}

function special(layer:ReturnType<CoreDocument['root']['getLayer']>){
  return !!(layer.vectorMask?.enabled||layer.clipSourceId||layer.blend?.tone||layer.blend?.effect?.enabled||layer.blend?.gradientMap||
    layer.blend?.space==='linear');
}
function exportablePath(content:EditableArtwork):content is EditablePath{
  return content.kind==='path'&&!content.empty&&!content.fillRuns&&(!content.width||!content.lineStyle||content.lineStyle==='solid');
}
function svgGeometry(path:EditablePath){
  const first=path.points[0],last=path.points[1];if(!first)return '';
  const attrs=' fill="'+(path.fill??'none')+'" stroke="'+(path.width?path.stroke:'none')+'" stroke-width="'+path.width+
    '" stroke-linecap="round" stroke-linejoin="round" opacity="'+(path.opacity??1)+'"'+
    (path.transform?' transform="matrix('+[path.transform.a,path.transform.b,path.transform.c,path.transform.d,path.transform.e,path.transform.f].join(' ')+')"':'');
  if((path.shape==='rectangle'||path.shape==='ellipse')&&last){
    const x=Math.min(first.x,last.x),y=Math.min(first.y,last.y),w=Math.abs(first.x-last.x),h=Math.abs(first.y-last.y);
    return path.shape==='rectangle'?'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'"'+attrs+'/>':
      '<ellipse cx="'+(x+w/2)+'" cy="'+(y+h/2)+'" rx="'+w/2+'" ry="'+h/2+'"'+attrs+'/>';
  }
  let d='';
  for(const [i,p] of path.points.entries()){
    const prev=path.points[i-1];
    d+=!prev||p.move?'M'+p.x+' '+p.y:prev.outX!==undefined||p.inX!==undefined
      ?'C'+[prev.outX??prev.x,prev.outY??prev.y,p.inX??p.x,p.inY??p.y,p.x,p.y].join(' ')
      :'L'+p.x+' '+p.y;
    if(p.close)d+='Z';
  }
  if(path.closed&&!path.points.at(-1)?.close)d+='Z';
  return '<path d="'+d+'" fill-rule="evenodd"'+attrs+'/>';
}

async function embeddedPng(pixels:Uint8ClampedArray,width:number,height:number){
  const png=new Uint8Array(await (await encodePng(pixels,width,height)).arrayBuffer());
  const chunks:string[]=[];
  for(let i=0;i<png.length;i+=12288)chunks.push(btoa(String.fromCharCode(...png.subarray(i,i+12288))));
  return '<image width="'+width+'" height="'+height+'" href="data:image/png;base64,'+chunks.join('')+'"/>';
}

function encodeAvif(pixels:Uint8ClampedArray,width:number,height:number,quality:number,lossless:boolean){
  return new Promise<ArrayBuffer>((resolve,reject)=>{
    const worker=new Worker(new URL('./avif.worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=event=>{
      worker.terminate();
      if(event.data.buffer instanceof ArrayBuffer)resolve(event.data.buffer);
      else reject(Error(event.data.error||'AVIFの書き出しに失敗しました。'));
    };
    worker.onerror=()=>{worker.terminate();reject(Error('この端末でAVIFの変換を開始できません。'));};
    try{worker.postMessage({width,height,pixels,quality,lossless});}
    catch(error){worker.terminate();reject(error);}
  });
}

export async function exportExchange(doc:CoreDocument,format:ExchangeFormat,layered:boolean,quality=90,lossless=false){
  const fixed=captureExport(doc),root=doc.revision(fixed.revision).root;
  const {width,height,name}=fixed;assertImageSize(width,height);
  const merged=await renderFrozenArtwork(fixed);
  const mime=types[format];
  if(format==='exr'){
    const {encodeExr}=await import('./exr');
    return new Blob([encodeExr(merged,width,height)],{type:mime});
  }
  if(format==='tiff')return new Blob([encodeTiff(merged,width,height,root.info.dpi??96)],{type:mime});
  if(format==='avif'){
    const buffer=await encodeAvif(merged,width,height,quality,lossless);
    const head=new Uint8Array(buffer.slice(0,16));
    if(String.fromCharCode(...head.slice(4,8))!=='ftyp'||!['avif','avis'].includes(String.fromCharCode(...head.slice(8,12))))
      throw Error('AVIFとして書き出せませんでした。');
    return new Blob([buffer],{type:mime});
  }
  if(layered&&root.rootLayerIds.length*width*height*4>MAX_EXCHANGE_BYTES)
    throw Error('レイヤー付き出力の画素数が上限を超えています。「見た目を1枚にまとめる」を使用してください。');
  const layers:ExchangeLayer[]=[],svg:string[]=[];
  if(layered){
    for(const id of root.rootLayerIds){
      const layer=root.getLayer(id),source=fixed.layers.find(item=>item.surfaceId===layer.surface.descriptor.surfaceId);
      if(!source)continue;
      const opacity=source.opacity,visible=source.visible,blend=layer.blend?.mode??'normal';
      if(format==='svg'&&layer.editable&&exportablePath(layer.editable)&&!special(layer)){
        svg.push('<g aria-label="'+xmlText(layer.name)+'" opacity="'+opacity+'"'+(visible?'':' display="none"')+'>'+svgGeometry(layer.editable)+'</g>');
        continue;
      }
      const pixels=await layerPixels(fixed,id,root);
      if(format==='svg')svg.push('<g aria-label="'+xmlText(layer.name)+'" opacity="'+opacity+'"'+(visible?'':' display="none"')+'>'+
        await embeddedPng(pixels,width,height)+'</g>');
      else layers.push({...imageLayer(layer.name,width,height,pixels),opacity,visible,blend});
    }
  }else if(format==='svg')svg.push(await embeddedPng(merged,width,height));
  else layers.push(imageLayer(name,width,height,merged));
  if(format==='svg')return new Blob(['<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="'+width+
    '" height="'+height+'" viewBox="0 0 '+width+' '+height+'">'+svg.join('')+'</svg>'],{type:mime});
  const art={width,height,name,layers,merged,warnings:[],dpi:root.info.dpi??undefined};
  const bytes=format==='ora'?await (await import('./oraExchange')).encodeOra(art):
    (await import('./psdExchange')).encodePhotoshop(art,format==='psb');
  return new Blob([new Uint8Array(bytes)],{type:mime});
}

async function layerPixels(frozen:FrozenExport,id:LayerId,root:CoreDocument['root']){
  const surfaceId=root.getLayer(id).surface.descriptor.surfaceId;
  const original=frozen.layers.find(layer=>layer.surfaceId===surfaceId)!;
  const {baseColor,mask}=original;
  const pixels=await renderFrozenArtwork({...frozen,layers:[{surfaceId,visible:true,opacity:1,...(baseColor?{baseColor}:{})}],
    strokes:frozen.strokes.filter(s=>s.surfaceId===surfaceId),basePixels:frozen.basePixels?.filter(s=>s.surfaceId===surfaceId)??[]});
  if(!mask?.enabled)return pixels;
  const masked=new Uint8ClampedArray(pixels.length);
  compositeLayer(masked,pixels,1,undefined,{width:frozen.width,mask});
  return masked;
}
