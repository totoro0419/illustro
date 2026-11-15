/** C06 copy/cut/paste operating on real document pixels and history. */
import type {EditorController} from '../controller';
import type {BrushSurface} from '../brushSurface';
import {captureExport,renderFrozenArtwork} from '../export/basicExport';
import type {SelectionRect} from '../strokeSelection';

export type ClipboardItem=Readonly<{
  sourceDocumentId:string;sourceColorProfile:string;sourceName:string;
  originX:number;originY:number;width:number;height:number;
  selected:boolean;merged:boolean;pixels:Uint8ClampedArray;
}>;
const safeRect=(selection:SelectionRect|null,width:number,height:number)=>{
  const x0=Math.max(0,Math.min(width,Math.ceil(selection?.x??0)));
  const y0=Math.max(0,Math.min(height,Math.ceil(selection?.y??0)));
  const x1=Math.max(0,Math.min(width,Math.floor(selection?selection.x+selection.width:width)));
  const y1=Math.max(0,Math.min(height,Math.floor(selection?selection.y+selection.height:height)));
  if(x0>=x1||y0>=y1)throw Error('コピーする範囲が空です。');
  return {x:x0,y:y0,width:x1-x0,height:y1-y0};
};
function crop(source:Uint8Array|Uint8ClampedArray,srcWidth:number,area:Readonly<{x:number;y:number;width:number;height:number}>){
  const result=new Uint8ClampedArray(area.width*area.height*4);
  for(let y=0;y<area.height;y++){
    const start=((area.y+y)*srcWidth+area.x)*4;
    result.set(source.subarray(start,start+area.width*4),y*area.width*4);
  }
  return result;
}
export class ArtworkClipboard {
  private item:ClipboardItem|null=null;
  get hasContent(){return this.item!==null;}
  get summary(){return this.item?{
    name:this.item.sourceName,width:this.item.width,height:this.item.height,
    sourceDocumentId:this.item.sourceDocumentId,selected:this.item.selected,merged:this.item.merged
  }:null;}
  clear(){this.item=null;}
  async copy(controller:EditorController,drawing:BrushSurface,opts:Readonly<{merged:boolean;selectionOnly:boolean}>){
    const document=controller.document,root=document.root,head=document.head;
    const selection=opts.selectionOnly?drawing.selectedRectangle:null;
    if(opts.selectionOnly&&!selection)throw Error('先に選択範囲を作成してください。');
    const area=safeRect(selection,root.width,root.height);
    let source:Uint8Array|Uint8ClampedArray;
    if(opts.merged){
      source=await renderFrozenArtwork(captureExport(document));
    }else{
      const layer=controller.selectedLayer;
      if(layer.kind!=='raster')throw Error('このレイヤーは画素のコピーに対応していません。');
      const captured=await drawing.captureDocumentLayers(new Set([layer.id]));
      const pixels=captured.get(layer.id);
      if(!pixels)throw Error('レイヤーを読み込めませんでした。');
      source=pixels;
    }
    if(document.head!==head)throw Error('コピー中に作品が変更されました。もう一度コピーしてください。');
    const pixels=crop(source,root.width,area);
    const record:ClipboardItem={
      sourceDocumentId:root.documentId,sourceColorProfile:root.colorProfileId,
      sourceName:opts.merged?'合成した作品':controller.selectedLayer.name,
      originX:area.x,originY:area.y,width:area.width,height:area.height,
      selected:!!selection,merged:opts.merged,pixels
    };
    this.item=record;
    return record;
  }
  async cut(controller:EditorController,drawing:BrushSurface){
    const document=controller.document,root=document.root,layer=controller.selectedLayer;
    if(layer.kind!=='raster'||layer.baseColor==='white')throw Error('このレイヤーは切り取れません。');
    if(root.isLayerContentLocked(layer.id))throw Error('ロック中のレイヤーは切り取れません。');
    const area=drawing.selectedRectangle;
    if(!area)throw Error('切り取る範囲を選択してください。');
    const head=document.head;
    // A successful clipboard read is mandatory before modifying source pixels.
    await this.copy(controller,drawing,{merged:false,selectionOnly:true});
    if(head!==document.head)throw Error('作品が変更されたため切り取りを中止しました。');
    const previous=(await drawing.captureDocumentLayers(new Set([layer.id]))).get(layer.id);
    if(!previous||head!==document.head)throw Error('切り取るレイヤーの読み込みに失敗しました。');
    const result=new Uint8ClampedArray(previous);
    const rect=safeRect(area,root.width,root.height);
    for(let y=rect.y;y<rect.y+rect.height;y++){
      const from=(y*root.width+rect.x)*4;
      result.fill(0,from,from+rect.width*4);
    }
    const tx=document.begin('選択範囲を切り取る');
    tx.replaceLayerRaster(layer.id,result);
    controller.lastPersistenceHandoff=tx.commit().persistence;
    return {revision:document.head,layerId:layer.id};
  }
  paste(controller:EditorController,placement:'center'|'original'='center'){
    const record=this.item;
    if(!record)throw Error('先にコピーしてください。');
    const document=controller.document,root=document.root;
    if(record.sourceColorProfile!==root.colorProfileId)
      throw Error('元作品と色空間が異なります。色変換はC15の機能を使ってください。');
    const x=placement==='original'?record.originX:Math.round((root.width-record.width)/2);
    const y=placement==='original'?record.originY:Math.round((root.height-record.height)/2);
    const pixels=new Uint8ClampedArray(root.width*root.height*4);
    for(let row=0;row<record.height;row++){
      const dy=y+row;
      if(dy<0||dy>=root.height)continue;
      const x0=Math.max(0,x),x1=Math.min(root.width,x+record.width);
      if(x0>=x1)continue;
      const srcStart=(row*record.width+x0-x)*4;
      const destStart=(dy*root.width+x0)*4;
      pixels.set(record.pixels.subarray(srcStart,srcStart+(x1-x0)*4),destStart);
    }
    const tx=document.begin('画像を貼り付ける');
    const id=tx.addRasterSnapshotAbove(controller.selectedLayer.id,pixels,
      (record.sourceName||'貼り付け').slice(0,100)+'（貼り付け）',false,false);
    controller.lastPersistenceHandoff=tx.commit().persistence;
    controller.selectLayer(id);
    return {revision:document.head,layerId:id,x,y};
  }
  async makePng():Promise<Blob>{
    const item=this.item;
    if(!item)throw Error('コピーした内容がありません。');
    const canvas=document.createElement('canvas');canvas.width=item.width;canvas.height=item.height;
    const context=canvas.getContext('2d');
    if(!context)throw Error('画像を作成できません。');
    context.putImageData(new ImageData(item.pixels.slice(),item.width,item.height),0,0);
    return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('画像に変換できませんでした。')),'image/png'));
  }
}
