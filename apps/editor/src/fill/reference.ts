import type {CoreDocument,LayerId,LineRegions,RevisionId} from '@illustro/core';
import {runArtwork} from '../artwork/run';
import {captureExport,renderFrozenArtwork} from '../export/basicExport';

export async function readFillReference(document:CoreDocument,revision:RevisionId,mode:LineRegions['reference'],ids:readonly LayerId[]){
  const root=document.revision(revision).root,{width,height}=root;
  if(mode!=='merged'&&(!ids.length||ids.some(id=>!root.hasLayer(id)||root.getLayer(id).lineRegions)))
    throw Error('参照するレイヤーが選ばれていないか、見つかりません。参照元を確認してください。');
  const path=ids[0]?root.getLayer(ids[0]).editable:undefined;
  if((mode==='vector'||mode==='vector-visible')&&path?.kind!=='path')
    throw Error('ベクターの線画レイヤーを指定してください。');
  if(mode==='vector'&&path?.kind==='path'){
    return new Uint8Array(await runArtwork({content:{...path,fill:null,stroke:'#000000',width:1,lineStyle:'solid'},
      width,height,outputWidth:width,outputHeight:height}));
  }
  const frozen=captureExport(document,undefined,revision);
  if(mode==='merged')return new Uint8Array(await renderFrozenArtwork(frozen));
  const sources=new Set<string>(ids.map(id=>root.getLayer(id).surface.descriptor.surfaceId));
  const dependencies=new Set(sources);
  for(const item of frozen.layers)if(sources.has(item.surfaceId)&&item.clipSurfaceId)dependencies.add(item.clipSurfaceId);
  return new Uint8Array(await renderFrozenArtwork({...frozen,
    layers:frozen.layers.filter(item=>dependencies.has(item.surfaceId)).map(item=>({
      ...item,visible:true,referenceOnly:!sources.has(item.surfaceId)
    })),
    strokes:frozen.strokes.filter(item=>dependencies.has(item.surfaceId)),
    basePixels:frozen.basePixels?.filter(item=>dependencies.has(item.surfaceId))??[]
  }));
}
