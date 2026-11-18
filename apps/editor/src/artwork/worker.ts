import type {EditableArtwork,LayerMask} from '@illustro/core';
import {renderArtwork} from './render';
import {ArtworkWorkerFonts,type ArtworkWorkerFont} from './workerFonts';

export type ArtworkJob={content:EditableArtwork;width:number;height:number;outputWidth:number;outputHeight:number;mask?:LayerMask|null;previewMask?:boolean};
export type ArtworkWorkerJob=ArtworkJob&{font?:ArtworkWorkerFont};
const loadedFonts=new ArtworkWorkerFonts();
self.onmessage=async({data}:MessageEvent<ArtworkWorkerJob>)=>{
  try{
    if(data.content.kind==='text'&&data.content.fontAsset){
      if(!data.font||data.font.family!==data.content.family)throw Error('文字と描画用フォントが一致しません。');
      const fonts=(self as unknown as {fonts?:FontFaceSet}).fonts;
      if(!fonts||typeof FontFace==='undefined')throw Error('この環境では背景でフォントを読み込めません。');
      await loadedFonts.ensure(data.font,fonts);
    }
    const pixels=renderArtwork(data.content,data,new OffscreenCanvas(1,1));
    (self as unknown as Worker).postMessage({pixels},[pixels.buffer]);
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
