import {xmp,type RasterMetadata} from './rasterMetadata';
import {initializeCanvas,readPsd,writePsdUint8Array,type BlendMode,type Layer} from 'ag-psd';
import {ICC_LIMIT} from './iccMetadata';
import {LAYER_BLEND_MODES,type LayerBlendMode} from '@illustro/core';
import {assertImageSize,imageLayer,type ExchangeArtwork,type ExchangeLayer} from './exchangeTypes';

const supported=new Set<string>(LAYER_BLEND_MODES);
function toPsdMode(mode:LayerBlendMode):BlendMode{
  return (mode==='dissolve'||mode==='normal'?mode:mode.replace(/-/g,' ')) as BlendMode;
}
function fromPsdMode(mode?:BlendMode):LayerBlendMode|null{
  const normalized=(mode??'normal').replace(/ /g,'-');
  return supported.has(normalized)?normalized as LayerBlendMode:null;
}
function useRawCanvas(){
  // ag-psd asks for ImageData objects even with useImageData; keep the path off DOM
  // and retain the straight alpha bytes in the encoded file.
  initializeCanvas((width,height)=>Object.assign(document.createElement('canvas'),{width,height}),
    (width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4),colorSpace:'srgb'}));
}
export function encodePhotoshop(art:ExchangeArtwork,large:boolean,metadata:RasterMetadata={}){
  assertImageSize(art.width,art.height);
  if(!art.merged||art.merged.length!==art.width*art.height*4)throw Error('作品全体の画像がありません。');
  useRawCanvas();
  const description=xmp(metadata);
  return writePsdUint8Array({width:art.width,height:art.height,
    imageData:{width:art.width,height:art.height,data:art.merged},
    imageResources:{
      ...(art.dpi?{resolutionInfo:{horizontalResolution:art.dpi,verticalResolution:art.dpi,
        horizontalResolutionUnit:'PPI' as const,verticalResolutionUnit:'PPI' as const,widthUnit:'Inches' as const,heightUnit:'Inches' as const}}:{}),
      ...(metadata.profile?{iccProfile:metadata.profile}:{}),
      ...(description?{xmpMetadata:new TextDecoder().decode(description)}:{}),
      ...(metadata.copyright?.trim()?{copyrighted:true}:{}),
    },
    children:art.layers.map(layer=>({name:layer.name,left:layer.x,top:layer.y,hidden:!layer.visible,opacity:layer.opacity,
      blendMode:toPsdMode(layer.blend),imageData:{width:layer.width,height:layer.height,data:layer.pixels}})),
  },{psb:large,trimImageData:true,noBackground:true});
}
export function decodePhotoshop(bytes:Uint8Array,name:string):ExchangeArtwork{
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length<26||String.fromCharCode(...bytes.subarray(0,4))!=='8BPS'||![1,2].includes(view.getUint16(4)))throw Error('PSD/PSBのヘッダーを読み込めません。');
  assertImageSize(view.getUint32(18),view.getUint32(14));
  useRawCanvas();
  const psd=readPsd(bytes,{useImageData:true,skipThumbnail:true,skipLinkedFilesData:true,totalMemoryLimit:256*1024*1024,
    imageResourcesWhitelist:['resolutionInfo','iccProfile']});
  const {width,height}=psd;
  const warnings=new Set<string>(),layers:ExchangeLayer[]=[];
  const embedded=psd.imageResources?.iccProfile;
  const sourceIcc=embedded&&embedded.length<=ICC_LIMIT&&psd.colorMode===3?new Uint8Array(embedded):undefined;
  if(embedded&&!sourceIcc)warnings.add('RGB以外のPSDのICC、または4MBを超えるICCは適用できません。');
  if(psd.bitsPerChannel&&psd.bitsPerChannel!==8)warnings.add('高精度の画素を8ビットに変換しました。');
  function read(children:readonly Layer[],opacity=1,visible=true){
    for(const layer of children){
      const title=layer.name||'レイヤー',effectiveOpacity=opacity*(layer.opacity??1),effectiveVisible=visible&&!layer.hidden;
      if(layer.children){
        warnings.add('グループを展開して取り込みます。グループ単位の合成は再現されないことがあります。');
        read(layer.children,effectiveOpacity,effectiveVisible);continue;
      }
      if(layer.text||layer.vectorMask||layer.placedLayer||layer.adjustment||layer.effects)
        warnings.add(title+' の文字・ベクター・調整・効果などは再編集できません。');
      if(layer.mask||layer.realMask||layer.clipping)warnings.add(title+' のマスクやクリッピングは引き継がれません。');
      const data=layer.imageData;
      if(!data||data.width<1||data.height<1){warnings.add(title+' に取り込める画素がありません。');continue;}
      let pixels:Uint8ClampedArray;
      if(data.data instanceof Uint16Array)pixels=Uint8ClampedArray.from(data.data,v=>v/257);
      else if(data.data instanceof Float32Array)pixels=Uint8ClampedArray.from(data.data,(v,i)=>
        i%4===3?255*v:255*(v<=.0031308?12.92*v:1.055*Math.max(0,v)**(1/2.4)-.055));
      else pixels=new Uint8ClampedArray(data.data);
      const blend=fromPsdMode(layer.blendMode);
      if(!blend)warnings.add(title+' の合成方法は通常に変換されました。');
      layers.push({...imageLayer(title,data.width,data.height,pixels),x:layer.left??0,y:layer.top??0,
        opacity:effectiveOpacity,visible:effectiveVisible,blend:blend??'normal'});
    }
  }
  read(psd.children??[]);
  const composite=psd.imageData?.data;
  const merged=composite instanceof Uint8Array||composite instanceof Uint8ClampedArray?new Uint8ClampedArray(composite):undefined;
  if(!layers.length&&!merged)throw Error('取り込める画像データがありません。');
  return {width,height,name,dpi:psd.imageResources?.resolutionInfo?.horizontalResolution,layers,merged,...(sourceIcc?{sourceIcc}:{}),warnings:[...warnings]};
}
