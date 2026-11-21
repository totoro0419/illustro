import type {CoreDocument,EditableArtwork,LayerId,LayerMask} from '@illustro/core';

/** Both shape outputs share the exact same rendered pixels and mask. Only
 * the editable metadata differs; raster shapes use ordinary brush editing. */
export function saveArtworkSnapshot(
 tx:ReturnType<CoreDocument['begin']>,reference:LayerId,pixels:Uint8Array|Uint8ClampedArray,
 content:EditableArtwork,name:string,editing:LayerId|undefined,mask:LayerMask|null,
 output:'vector'|'raster'='vector'
):LayerId{
 const editable=output==='raster'?null:content;
 const id=editing??tx.addRasterSnapshotAbove(reference,pixels,name);
 if(editing)tx.replaceLayerRaster(id,pixels,undefined,editable);
 else{
  tx.setEditableArtwork(id,editable);
  if(mask)tx.setVectorLayerMask(id,mask);
 }
 return id;
}
