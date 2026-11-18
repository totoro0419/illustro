import type {EditableArtwork} from '@illustro/core';
import {textFontAssetIds} from './textStyles';

/** Generic fonts resolve directly; imported faces require the exact family
 * backed by a font Blob. Arbitrary document-only font names stay on the UI. */
export function canRenderTextInArtworkWorker(content:EditableArtwork,preparedFamily?:string|readonly string[]):boolean{
  if(content.kind!=='text')return false;
  const prepared=new Set(typeof preparedFamily==='string'?[preparedFamily]:preparedFamily??[]);
  if(textFontAssetIds(content).some(id=>!prepared.has('IllustroFont-'+id)))return false;
  return content.fontAsset?content.family==='IllustroFont-'+content.fontAsset:
    (content.family==='sans-serif'||content.family==='serif'||content.family==='monospace');
}
