import {encodeAvifMetadata,isoExif} from './avifMetadata';
import {extractExifPosition} from './imagePosition';
import {xmp,type RasterMetadata} from './rasterMetadata';
import {extractIsoImageIcc} from './isoImageIcc';
import {type CoreDocument,type EditableArtwork,type EditablePath,type EditableText,type LayerId} from '@illustro/core';
import {captureExport,compositeLayer,encodePng,renderFrozenArtwork,type FrozenExport} from './basicExport';
import {assertImageSize,cleanFileName,imageLayer,MAX_EXCHANGE_BYTES,supportsOraBlend,xmlText,type ExchangeArtwork,type ExchangeFormat,type ExchangeLayer} from './exchangeTypes';
import {runIcc} from './iccRun';
import {resizeImagePixels} from '../canvasGeometry';
import {extractRasterIcc} from './rasterIcc';
import type {ImageFormat} from './basicExport';
import {decodeTiff,encodeTiff} from './tiff';

const formats:Record<string,ExchangeFormat|ImageFormat|'heif'>={png:'png',jpg:'jpeg',jpeg:'jpeg',webp:'webp',psd:'psd',psb:'psb',ora:'ora',tif:'tiff',tiff:'tiff',avif:'avif',svg:'svg',exr:'exr',heic:'heif',heif:'heif'};
const types:Record<ExchangeFormat,string>={psd:'image/vnd.adobe.photoshop',psb:'application/octet-stream',ora:'image/openraster',
  tiff:'image/tiff',svg:'image/svg+xml',avif:'image/avif',exr:'image/x-exr'};
export function exchangeFormat(name:string){
  return formats[name.split('.').pop()?.toLowerCase()??'']??null;
}
export const exchangeFileName=(name:string,format:ExchangeFormat)=>cleanFileName(name)+'.'+(format==='tiff'?'tiff':format);
export function readExchangeDimensions(blob:Blob,colorSpaceConversion:ColorSpaceConversion='default'){
  return createImageBitmap(blob,{colorSpaceConversion}).then(image=>{
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
  const isIsoImage=format==='avif'||format==='heif';
  if(isIsoImage||format==='png'||format==='jpeg'||format==='webp'){
    const warnings:string[]=[];
    let position:ReturnType<typeof extractExifPosition>;
    let sourceIcc:Uint8Array<ArrayBuffer>|null=null;
    try{
      const bytes=new Uint8Array(await file.arrayBuffer());
      const exif=isIsoImage?isoExif(bytes):bytes;
      position=exif?extractExifPosition(exif):undefined;
      sourceIcc=isIsoImage?extractIsoImageIcc(bytes):await extractRasterIcc(bytes);
    }catch(error){warnings.push(error instanceof Error?error.message:String(error));}
    const canConvert=!!sourceIcc&&String.fromCharCode(...sourceIcc.subarray(16,20))==='RGB ';
    if(!canConvert)warnings.push(sourceIcc?'元のICCを作品に保持し、ブラウザーがsRGBに展開した画素で開きます。':
      '利用できる埋め込みICCがないため、開いた画素をsRGBとして扱います。');
    const media=file.type||!isIsoImage?file:new Blob([file],{type:format==='avif'?'image/avif':file.name.toLowerCase().endsWith('.heic')?'image/heic':'image/heif'});
    const {width,height,pixels}=await readExchangeDimensions(media,canConvert?'none':'default').catch(error=>{
      if(isIsoImage)throw Error('このブラウザーでは'+format.toUpperCase()+'画像を開けません。');
      throw error;
    });
    return {width,height,name,layers:[imageLayer(name,width,height,pixels)],warnings,...(position?{position}:{}),
      ...(sourceIcc?{sourceIcc,sourceIccBrowserConverted:!canConvert}:{})};
  }
  if(format==='svg')return (await import('./svgImport')).importSvg(file,name);
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(format==='psd'||format==='psb')return (await import('./psdExchange')).decodePhotoshop(bytes,name);
  if(format==='ora')return (await import('./oraExchange')).decodeOra(bytes,name,data=>readExchangeDimensions(new Blob([new Uint8Array(data)],{type:'image/png'})));
  if(format==='exr'){
    const {width,height,pixels,warnings}=(await import('./exr')).decodeExr(bytes);
    return {width,height,name,layers:[imageLayer(name,width,height,pixels)],warnings};
  }
  if(format==='tiff'){
    const {width,height,pixels,dpi,warnings,sourceIcc}=decodeTiff(bytes);
    const position=extractExifPosition(bytes);
    return {width,height,name,dpi,layers:[imageLayer(name,width,height,pixels)],warnings,...(position?{position}:{}),...(sourceIcc?{sourceIcc}:{})};
  }
  throw Error('対応する交換形式ではありません。');
}

export async function exchangeProfileComparison(source:ExchangeArtwork,assigned?:Uint8Array<ArrayBuffer>){
  const profile=assigned??(!source.sourceIccBrowserConverted?source.sourceIcc:undefined);
  if(!profile)return null;
  const layer=source.layers.findLast(item=>item.visible);
  const pixels=source.merged??layer?.pixels;
  if(!pixels)return null;
  const w=source.merged?source.width:layer!.width,h=source.merged?source.height:layer!.height;
  const scale=Math.min(1,240/Math.max(w,h));
  const width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
  const before=new Uint8ClampedArray(resizeImagePixels(pixels,w,h,width,height,'nearest'));
  const {converted}=await runIcc({profile,layers:[before],proof:false,intent:1,blackPoint:true,gamut:false});
  const grid=document.createElement('div');grid.className='geometry-inputs';
  for(const [data,title] of [[before,'画素値のまま'],[converted[0]!.pixels,assigned?'割り当てた色':'変換後']] as const){
    const figure=document.createElement('figure'),label=document.createElement('figcaption');
    const image=document.createElement('canvas');image.width=width;image.height=height;
    image.style.cssText='display:block;max-width:100%;height:auto';
    image.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(data),width,height),0,0);
    label.textContent=title;image.setAttribute('aria-label',title);figure.style.margin='0';figure.append(label,image);grid.append(figure);
  }
  return grid;
}

export async function convertExchangeColors(source:ExchangeArtwork,applyProfile:boolean,assigned?:Uint8Array<ArrayBuffer>):Promise<ExchangeArtwork>{
  const profile=assigned??source.sourceIcc;
  if(!profile||source.sourceIccBrowserConverted&&!assigned)return source;
  if(!applyProfile)return {...source,sourceProfileAction:'assigned-srgb',warnings:[...source.warnings,'画素値を変更せずsRGBとして割り当てました。']};
  const {layers,merged}=source;
  const input=layers.map(layer=>layer.pixels);
  if(merged)input.push(merged);
  const {name,converted}=await runIcc({profile,layers:input,proof:false,intent:1,blackPoint:true,gamut:false},true);
  return {...source,sourceProfileAction:assigned?'assigned-icc':'converted-to-srgb',...(assigned?{assignedIcc:assigned}:{}),layers:layers.map(({editable:_,...layer},index)=>({...layer,pixels:converted[index]!.pixels})),
    ...(merged?{merged:converted[layers.length]!.pixels}:{}),warnings:[...(assigned?source.warnings.filter(warning=>!warning.includes('sRGBとして扱います')):source.warnings),
      ...(layers.some(layer=>layer.editable)?['色の変換を正確に保つため図形を画素に変換しました。']:[]),
      assigned?'RGB値に「'+name+'」を割り当て、その見え方を編集用sRGBで再現しました。':'埋め込みICC「'+name+'」からsRGBへ画素を変換しました。']};
}

export function exchangeWarnings(doc:CoreDocument,format:ExchangeFormat,layered:boolean){
  const root=doc.root,warnings=new Set<string>();
  if(format==='ora')warnings.add(layered?'レイヤー名・順序・不透明度・対応する合成方法を保持します。マスクは見た目に反映した画像になり、組み直せません。':'透明度付きの統合画像をOpenRasterに保存します。');
  if(format==='tiff')warnings.add('保存は非圧縮RGB・8ビット、透明度とDPI付き。読み込みは対応する非圧縮またはPackBitsの8/16ビットRGB。複数ページや編集用レイヤーは保持されません。');
  if(format==='svg')warnings.add(layered?'Illustroへ読み戻せます。通常の図形・パスと対応する横書き文字は再編集でき、可変幅や複雑な文字、その他の筆跡は画像にします。':'見た目を保つため、統合画像を埋め込みます。');
  if(format==='exr')warnings.add('表示中の絵をリニアsRGBの32ビット浮動小数点で出力します。元の8ビット作品と同じ色の範囲で、HDRには広がりません。');
  else if(format==='avif'||format==='tiff'||!layered)warnings.add('表示中の作品を1枚のsRGB・8ビット画像にします。レイヤーや編集履歴は含まれません。');
  else {
    if(root.layerGroups.length)warnings.add('グループを展開します。グループの合成は交換先で変わることがあります。');
    for(const id of root.rootLayerIds){
      const layer=root.getLayer(id);
      if(layer.editable){
        const editableSvg=format==='svg'&&!special(layer)&&(exportablePath(layer.editable)||exportableText(layer.editable));
        if(!editableSvg)warnings.add('「'+layer.name+'」の文字・ベクター・グラデーションは画素で出力されます。');
        else if(layer.editable.kind==='text')warnings.add('「'+layer.name+'」の文字は交換先のシステム書体（'+layer.editable.family+'）で表示されます。');
      }
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
  return !!(layer.vectorMask?.enabled||layer.clipSourceId||layer.blend?.tone||layer.blend?.effect?.enabled||layer.blend?.gradientMap||layer.blend?.adjustment||
    layer.blend?.space==='linear');
}
function exportablePath(content:EditableArtwork):content is EditablePath{
  return content.kind==='path'&&!content.empty&&!content.fillRuns&&(!content.width||!content.lineStyle||content.lineStyle==='solid')&&
    content.points.every(point=>point.pressure===undefined||point.pressure===1);
}
function exportableText(content:EditableArtwork):content is EditableText{
  return content.kind==='text'&&!content.vertical&&!content.fontAsset&&!content.styleRanges?.length&&
    content.boxWidth===undefined&&content.boxHeight===undefined&&['sans-serif','serif','monospace'].includes(content.family);
}
export function svgTextGeometry(text:EditableText){
  if(!exportableText(text))return null;
  const {x,y}=text.origin,anchor=text.align==='center'?'middle':text.align==='right'?'end':'start';
  const transform=text.transform?' transform="matrix('+[text.transform.a,text.transform.b,text.transform.c,text.transform.d,text.transform.e,text.transform.f].join(' ')+')"':'';
  return '<text xml:space="preserve" dominant-baseline="text-before-edge" text-anchor="'+anchor+
    '" fill="'+xmlText(text.color)+'" font-family="'+xmlText(text.family)+'" font-size="'+text.size+
    '" letter-spacing="'+text.spacing+'"'+transform+'>'+
    text.text.split(/\r?\n/).map((line,row)=>'<tspan x="'+x+'" y="'+(y+row*text.lineHeight*text.size)+'">'+xmlText(line)+'</tspan>').join('')+'</text>';
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

async function embeddedPng(pixels:Uint8ClampedArray,width:number,height:number,metadata:RasterMetadata){
  const png=new Uint8Array(await (await encodePng(pixels,width,height,metadata.dpi,metadata.profile?{iccProfile:metadata.profile}:{})).arrayBuffer());
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

export async function exportExchange(doc:CoreDocument,format:ExchangeFormat,layered:boolean,quality=90,lossless=false,metadata:RasterMetadata={}){
  const fixed=captureExport(doc),root=doc.revision(fixed.revision).root;
  const {width,height,name}=fixed;assertImageSize(width,height);
  if(metadata.profile&&(!['psd','psb','ora','tiff','avif'].includes(format)&&!(format==='svg'&&!layered)||
    String.fromCharCode(...metadata.profile.subarray(16,20))!=='RGB '))
    throw Error('この出力にはRGBのICCを設定できません。');
  const convert=async(pixels:Uint8ClampedArray)=>{
    if(!metadata.profile)return pixels;
    const result=await runIcc({profile:metadata.profile,layers:[pixels],proof:false,forExport:true,intent:1,blackPoint:true,gamut:false});
    return result.converted[0]!.pixels;
  };
  const merged=await convert(await renderFrozenArtwork(fixed));
  const mime=types[format];
  if(format==='exr'){
    const {encodeExr}=await import('./exr');
    return new Blob([encodeExr(merged,width,height,metadata)],{type:mime});
  }
  if(format==='tiff')return new Blob([encodeTiff(merged,width,height,metadata.dpi??root.info.dpi??96,metadata)],{type:mime});
  if(format==='avif'){
    const buffer=await encodeAvif(merged,width,height,quality,lossless);
    const head=new Uint8Array(buffer.slice(0,16));
    if(String.fromCharCode(...head.slice(4,8))!=='ftyp'||!['avif','avis'].includes(String.fromCharCode(...head.slice(8,12))))
      throw Error('AVIFとして書き出せませんでした。');
    return new Blob([encodeAvifMetadata(new Uint8Array(buffer),metadata)],{type:mime});
  }
  if(layered&&root.rootLayerIds.length*width*height*4>MAX_EXCHANGE_BYTES)
    throw Error('レイヤー付き出力の画素数が上限を超えています。「見た目を1枚にまとめる」を使用してください。');
  const layers:ExchangeLayer[]=[],svg:string[]=[];
  if(layered){
    for(const id of root.rootLayerIds){
      const layer=root.getLayer(id),source=fixed.layers.find(item=>item.surfaceId===layer.surface.descriptor.surfaceId);
      if(!source)continue;
      const opacity=source.opacity,visible=source.visible,blend=layer.blend?.mode??'normal';
      if(format==='svg'&&layer.editable&&!special(layer)){
        const geometry=exportablePath(layer.editable)?svgGeometry(layer.editable):
          exportableText(layer.editable)?svgTextGeometry(layer.editable):null;
        if(geometry!==null){
          svg.push('<g aria-label="'+xmlText(layer.name)+'" opacity="'+opacity+'"'+(visible?'':' display="none"')+'>'+geometry+'</g>');
          continue;
        }
      }
      const pixels=await convert(await layerPixels(fixed,id,root));
      if(format==='svg')svg.push('<g aria-label="'+xmlText(layer.name)+'" opacity="'+opacity+'"'+(visible?'':' display="none"')+'>'+
        await embeddedPng(pixels,width,height,metadata)+'</g>');
      else layers.push({...imageLayer(layer.name,width,height,pixels),opacity,visible,blend});
    }
  }else if(format==='svg')svg.push(await embeddedPng(merged,width,height,metadata));
  else layers.push(imageLayer(name,width,height,merged));
  const description=xmp(metadata);
  if(format==='svg'){
    const length=(pixels:number)=>metadata.dpi?(pixels/metadata.dpi).toFixed(6)+'in':String(pixels);
    return new Blob(['<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="'+length(width)+
      '" height="'+length(height)+'" viewBox="0 0 '+width+' '+height+'">'+
      (description?'<metadata>'+new TextDecoder().decode(description)+'</metadata>':'')+svg.join('')+'</svg>'],{type:mime});
  }
  const art={width,height,name,layers,merged,warnings:[],dpi:metadata.dpi??root.info.dpi??undefined};
  const bytes=format==='ora'?await (await import('./oraExchange')).encodeOra(art,metadata):
    (await import('./psdExchange')).encodePhotoshop(art,format==='psb',metadata);
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
