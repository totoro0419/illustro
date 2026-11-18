import type {EditableArtwork,LayerMask} from '@illustro/core';
import {renderArtwork} from './render';
import {ArtworkWorkerFonts,type ArtworkWorkerFont} from './workerFonts';
import {textFontAssetIds} from './textStyles';

export type ArtworkJob={content:EditableArtwork;width:number;height:number;outputWidth:number;outputHeight:number;mask?:LayerMask|null;previewMask?:boolean};
export type ArtworkWorkerJob=ArtworkJob&{font?:ArtworkWorkerFont;fonts?:readonly ArtworkWorkerFont[]};
const loadedFonts=new ArtworkWorkerFonts();
self.onmessage=async({data}:MessageEvent<ArtworkWorkerJob>)=>{
  try{
    const sources=data.fonts??(data.font?[data.font]:[]);
    const render=()=>renderArtwork(data.content,data,new OffscreenCanvas(1,1));
    let pixels:ReturnType<typeof renderArtwork>;
    if(data.content.kind==='text'&&textFontAssetIds(data.content).length){
      const families=new Set(sources.map(source=>source.family));
      if(textFontAssetIds(data.content).some(id=>!families.has('IllustroFont-'+id)))
        throw Error('文字と描画用フォントが一致しません。');
      const fonts=(self as unknown as {fonts?:FontFaceSet}).fonts;
      if(!fonts||typeof FontFace==='undefined')throw Error('この環境では背景でフォントを読み込めません。');
      pixels=await loadedFonts.withFonts(sources,fonts,render);
    }else pixels=render();
    (self as unknown as Worker).postMessage({pixels},[pixels.buffer]);
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
