import type {RasterMetadata} from './rasterMetadata';
import {strFromU8,strToU8,unzipSync,zipSync,type Zippable} from 'fflate';
import type {LayerBlendMode} from '@illustro/core';
import {encodePng} from './basicExport';
import {resizeImagePixels} from '../canvasGeometry';
import {assertImageSize,MAX_EXCHANGE_BYTES,xmlText,toComposite,fromComposite,type ExchangeArtwork,type ExchangeLayer} from './exchangeTypes';

const pngBytes=async(pixels:Uint8ClampedArray,width:number,height:number,metadata:RasterMetadata)=>
  new Uint8Array(await (await encodePng(pixels,width,height,metadata.dpi,{
    ...(metadata.profile?{iccProfile:metadata.profile}:{}),
    ...(metadata.author?{author:metadata.author}:{}),...(metadata.copyright?{copyright:metadata.copyright}:{}),
  })).arrayBuffer());

export async function encodeOra(art:ExchangeArtwork,metadata:RasterMetadata={}){
  const {width,height,layers,merged}=art;
  assertImageSize(width,height);
  if(!merged||merged.length!==width*height*4)throw Error('作品全体の画像がありません。');
  const entries:Zippable={mimetype:[strToU8('image/openraster'),{level:0}]};
  const tree:string[]=[];
  for(const [index,layer] of [...layers].reverse().entries()){
    const path='data/layer'+index+'.png';
    tree.push('<layer name="'+xmlText(layer.name)+'" src="'+path+'" x="'+layer.x+'" y="'+layer.y+'" opacity="'+layer.opacity+
      '" visibility="'+(layer.visible?'visible':'hidden')+'" composite-op="'+(toComposite[layer.blend]??'svg:src-over')+'"/>');
    entries[path]=[await pngBytes(layer.pixels,layer.width,layer.height,metadata),{level:0}];
  }
  entries['stack.xml']=strToU8('<?xml version="1.0" encoding="UTF-8"?><image version="0.0.3" name="'+xmlText(art.name)+
    '" w="'+width+'" h="'+height+'"><stack>'+tree.join('')+'</stack></image>');
  const ratio=Math.min(1,256/Math.max(width,height)),w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
  const thumb=new Uint8ClampedArray(resizeImagePixels(merged,width,height,w,h,'auto'));
  entries['Thumbnails/thumbnail.png']=[await pngBytes(thumb,w,h,metadata),{level:0}];
  entries['mergedimage.png']=[await pngBytes(merged,width,height,metadata),{level:0}];
  return zipSync(entries);
}

export async function decodeOra(bytes:Uint8Array,name:string,decodePng:(bytes:Uint8Array)=>Promise<{width:number;height:number;pixels:Uint8ClampedArray}>){
  let total=0,count=0;
  const archive=unzipSync(bytes,{filter:file=>{
    if(!/^(mimetype|stack\.xml|mergedimage\.png|(?![./\\])[^:\\]+\.png)$/.test(file.name)||
      file.name.split('/').some(part=>part==='..'||part==='.'||part===''))return false;
    if(file.name==='stack.xml'&&file.originalSize>1024*1024)throw Error('OpenRasterのレイヤー情報が大きすぎます。');
    total+=file.originalSize;count++;
    if(total>MAX_EXCHANGE_BYTES||count>520)throw Error('OpenRasterの展開サイズが上限を超えています。');
    return true;
  }});
  if(!archive.mimetype||strFromU8(archive.mimetype)!=='image/openraster'||!archive['stack.xml'])throw Error('OpenRasterではないか、レイヤー情報がありません。');
  const xml=strFromU8(archive['stack.xml']);
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('外部定義を含むOpenRasterは開けません。');
  const doc=new DOMParser().parseFromString(xml,'application/xml'),image=doc.documentElement;
  const width=Number(image.getAttribute('w')),height=Number(image.getAttribute('h'));
  if(image.localName!=='image'||doc.querySelector('parsererror'))throw Error('OpenRasterのレイヤー情報に誤りがあります。');
  assertImageSize(width,height);
  const stack=[...image.children].find(element=>element.localName==='stack');
  if(!stack)throw Error('OpenRasterにレイヤー一覧がありません。');
  const layers:ExchangeLayer[]=[],warnings=new Set<string>();
  let decodedPixels=0;
  async function read(group:Element,x=0,y=0,opacity=1,visible=true,depth=0):Promise<void>{
    if(depth>24)throw Error('OpenRasterのグループが深すぎます。');
    for(const layer of [...group.children].reverse()){
      const title=layer.getAttribute('name')||'レイヤー';
      const input=Number(layer.getAttribute('opacity')??1);
      const effectiveOpacity=opacity*(Number.isFinite(input)?Math.max(0,Math.min(1,input)):1);
      const effectiveVisible=visible&&layer.getAttribute('visibility')!=='hidden';
      const coordinate=(key:string)=>{const n=Number(layer.getAttribute(key)??0);return Number.isSafeInteger(n)&&Math.abs(n)<=65536?n:0;};
      const left=x+coordinate('x'),top=y+coordinate('y');
      if(layer.localName==='stack'){
        warnings.add('グループを展開して取り込みます。グループの合成が変わる場合があります。');
        await read(layer,left,top,effectiveOpacity,effectiveVisible,depth+1);continue;
      }
      if(layer.localName!=='layer'){warnings.add('未対応のレイヤー項目を読み飛ばしました。');continue;}
      const file=archive[layer.getAttribute('src')??''];
      if(!(file instanceof Uint8Array))throw Error(title+' の画像データがありません。');
      if(file.length<24||file[0]!==137||file[1]!==80)throw Error(title+' のPNGデータが正しくありません。');
      const pngHeader=new DataView(file.buffer,file.byteOffset,file.byteLength);
      const w=pngHeader.getUint32(16),h=pngHeader.getUint32(20);
      assertImageSize(w,h);decodedPixels+=w*h;
      if(decodedPixels>MAX_EXCHANGE_BYTES/4||layers.length>=512)throw Error('OpenRasterの画素数が上限を超えています。');
      const rgba=await decodePng(file),operation=layer.getAttribute('composite-op')??'svg:src-over';
      const blend=fromComposite.get(operation);
      if(!blend)warnings.add(title+' の合成方法 '+operation+' を通常に変更しました。');
      if(layer.children.length)warnings.add(title+' の補助データを引き継げません。');
      layers.push({...rgba,name:title,x:left,y:top,opacity:effectiveOpacity,visible:effectiveVisible,blend:blend??'normal'});
    }
  }
  await read(stack);
  const composite=archive['mergedimage.png'];
  let merged:Uint8ClampedArray|undefined;
  if(composite&&composite.length>=24&&decodedPixels+width*height<=MAX_EXCHANGE_BYTES/4){
    const header=new DataView(composite.buffer,composite.byteOffset,composite.byteLength);
    if(header.getUint32(16)===width&&header.getUint32(20)===height)merged=(await decodePng(composite)).pixels;
    else warnings.add('統合画像の寸法が一致しないため読み飛ばしました。');
  }
  if(!layers.length&&!merged)throw Error('OpenRasterに使用できる画像がありません。');
  return {width,height,name:image.getAttribute('name')||name,layers,merged,warnings:[...warnings]};
}
