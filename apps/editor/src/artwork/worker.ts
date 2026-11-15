import type {EditableArtwork} from '@illustro/core';
import {renderArtwork} from './render';

export type ArtworkJob={content:EditableArtwork;width:number;height:number;outputWidth:number;outputHeight:number};
self.onmessage=({data}:MessageEvent<ArtworkJob>)=>{
  try{
    const pixels=renderArtwork(data.content,data,new OffscreenCanvas(1,1));
    (self as unknown as Worker).postMessage({pixels},[pixels.buffer]);
  }catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}
};
