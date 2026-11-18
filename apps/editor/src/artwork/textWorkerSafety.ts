import type {EditableArtwork} from '@illustro/core';

/** Generic fonts resolve directly; imported faces require the exact family
 * backed by a font Blob. Arbitrary document-only font names stay on the UI. */
export function canRenderTextInArtworkWorker(content:EditableArtwork,preparedFamily?:string):boolean{
  return content.kind==='text'&&(content.fontAsset?
    preparedFamily==='IllustroFont-'+content.fontAsset&&content.family===preparedFamily:
    (content.family==='sans-serif'||content.family==='serif'||content.family==='monospace'));
}
