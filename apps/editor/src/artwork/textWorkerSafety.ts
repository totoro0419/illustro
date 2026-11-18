import type {EditableArtwork} from '@illustro/core';

/** Only system-generic font names are safe to resolve in a drawing worker.
 * Imported fonts and named fonts continue on the document thread until their
 * Worker FontFaceSet availability has been independently verified. */
export function canRenderTextInArtworkWorker(content:EditableArtwork):boolean{
  return content.kind==='text'&&!content.fontAsset&&
    (content.family==='sans-serif'||content.family==='serif'||content.family==='monospace');
}
