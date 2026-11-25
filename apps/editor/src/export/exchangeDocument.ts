import {CoreDocument,type LayerId} from '@illustro/core';
import {changeCanvasBounds,cropCanvas} from '../canvasGeometry';
import {assertImageSize,imageLayer,type ExchangeArtwork,type ExchangeLayer} from './exchangeTypes';

function layerName(name:string){
  return name.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,4096)||'レイヤー';
}

export function createExchangeDocument(source:ExchangeArtwork,flatten=false){
  const {width,height}=source;
  assertImageSize(width,height);
  const dpi=source.dpi!==undefined&&Number.isFinite(source.dpi)&&source.dpi>=1&&source.dpi<=2400?Math.round(source.dpi):undefined;
  const artwork=new CoreDocument({name:layerName(source.name),width,height,...(dpi!==undefined?{dpi}:{})});
  const layers=flatten||!source.layers.length?(source.merged?[imageLayer('統合画像',width,height,source.merged)]:[]):source.layers;
  if(!layers.length)throw Error('取り込めるレイヤーがありません。');
  const applyStyle=(layer:ExchangeLayer,id:LayerId,tx:ReturnType<CoreDocument['begin']>)=>{
    tx.renameLayer(id,layerName(layer.name));tx.setLayerVisibility(id,layer.visible);tx.setLayerOpacity(id,layer.opacity);
    if(layer.editable)tx.setEditableArtwork(id,layer.editable);
    if(layer.blend!=='normal')tx.setLayerBlend(id,{mode:layer.blend,space:'encoded',seed:0});
  };
  const first=layers[0]!,tx=artwork.begin('交換用ファイルを取り込む');
  let id=artwork.defaultRasterLayerId;
  tx.replaceLayerRaster(id,changeCanvasBounds(first.pixels,first.width,first.height,width,height,first.x,first.y));
  applyStyle(first,id,tx);
  for(const layer of layers.slice(1)){
    const left=Math.max(0,layer.x),top=Math.max(0,layer.y);
    const w=Math.min(width,layer.x+layer.width)-left,h=Math.min(height,layer.y+layer.height)-top;
    if(w<1||h<1)id=tx.addRasterLayerAbove(id);
    else {
      const pixels=cropCanvas(layer.pixels,layer.width,layer.height,left-layer.x,top-layer.y,w,h);
      id=tx.addRasterSnapshotAbove(id,{x:left,y:top,width:w,height:h,pixels},layerName(layer.name));
    }
    applyStyle(layer,id,tx);
  }
  tx.commit();
  return {artwork,selected:id};
}
