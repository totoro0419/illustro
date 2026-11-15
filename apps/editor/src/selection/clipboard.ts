/** C06 copy/cut/paste operating on real document pixels and history. */
import type {EditorController} from '../controller';
import type {BrushSurface} from '../brushSurface';
import {captureExport,renderFrozenArtwork} from '../export/basicExport';
import type {SelectionRect} from '../strokeSelection';
import {type MaskData,rasterizeSelection} from './mask';
import {runMaskedPixelJob} from './pixels';

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
  private selectionMask:MaskData|null=null;
  setSelectionMask(mask:MaskData|null){this.selectionMask=mask;}
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
    const masked=this.selectionMask&&this.selectionMask.width===root.width&&this.selectionMask.height===root.height&&selection
      ?await runMaskedPixelJob(source,this.selectionMask,'copy'):source;
    if(document.head!==head)throw Error('コピー中に作品が変更されました。');
    const pixels=crop(masked,root.width,area);
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
    const mask=this.selectionMask&&this.selectionMask.width===root.width&&this.selectionMask.height===root.height
      ?this.selectionMask:rasterizeSelection({type:'rectangle',...area},root.width,root.height);
    const result=await runMaskedPixelJob(previous,mask,'cut');
    if(document.head!==head)throw Error('切り取り中に作品が変更されました。');
    const tx=document.begin('選択範囲を切り取る');
    tx.replaceLayerRaster(layer.id,result);
    controller.lastPersistenceHandoff=tx.commit().persistence;
    return {revision:document.head,layerId:layer.id};
  }
  /** One transaction and one Undo, unlike a cut followed by paste. */
  async moveContent(controller:EditorController,drawing:BrushSurface,dx:number,dy:number){
    dx=Math.round(dx);dy=Math.round(dy);
    if(!Number.isSafeInteger(dx)||!Number.isSafeInteger(dy)||Math.abs(dx)>16384||Math.abs(dy)>16384)
      throw Error('移動距離が正しくありません。');
    if(dx===0&&dy===0)throw Error('移動距離を指定してください。');
    const document=controller.document,root=document.root,layer=controller.selectedLayer,head=document.head;
    if(layer.kind!=='raster'||layer.baseColor==='white'||root.isLayerContentLocked(layer.id)||root.isLayerPositionLocked(layer.id))
      throw Error('このレイヤーの内容は移動できません。ロックを確認してください。');
    const rect=drawing.selectedRectangle;
    if(!rect)throw Error('先に移動する範囲を選択してください。');
    const selection=this.selectionMask??rasterizeSelection({type:'rectangle',...rect},root.width,root.height);
    if(selection.width!==root.width||selection.height!==root.height)
      throw Error('選択範囲の大きさが作品と異なります。');
    const snapshot=(await drawing.captureDocumentLayers(new Set([layer.id]))).get(layer.id);
    if(!snapshot||document.head!==head)throw Error('作品が変更されたため、移動を中止しました。');
    const target=await runMaskedPixelJob(snapshot,selection,'move',dx,dy);
    if(document.head!==head)throw Error('移動中に作品が変更されました。');
    const transaction=document.begin('選択した絵を移動');
    transaction.replaceLayerRaster(layer.id,target);
    controller.lastPersistenceHandoff=transaction.commit().persistence;
    return {revision:document.head,layerId:layer.id};
  }
  paste(controller:EditorController,placement:'center'|'original'='center'){
    const record=this.item;
    if(!record)throw Error('先にコピーしてください。');
    const document=controller.document,root=document.root;
    if(record.sourceColorProfile!==root.colorProfileId)
      throw Error('元作品と色空間が異なります。色変換はC15の機能を使ってください。');
    if(record.sourceDocumentId!=='external-image'&&record.sourceDocumentId!==root.documentId&&
      !window.confirm('別の作品から貼り付けます。現段階では画素だけを新しいレイヤーへ移し、元のブラシ履歴・特殊なレイヤー設定は移せません。続けますか？'))
      throw Error('別作品への貼り付けを取り消しました。');
    const x=placement==='original'?record.originX:Math.round((root.width-record.width)/2);
    const y=placement==='original'?record.originY:Math.round((root.height-record.height)/2);
    if(x>=root.width||y>=root.height||x+record.width<=0||y+record.height<=0)
      throw Error('元の座標では画像がキャンバスの外に出ます。中央に貼り付けてください。');
    if((x<0||y<0||x+record.width>root.width||y+record.height>root.height)&&
      !window.confirm('貼り付ける画像の一部がキャンバスの外です。はみ出した部分は省いて新しいレイヤーへ貼り付けます。続けますか？'))
      throw Error('貼り付けを取り消しました。');
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
  async importImage(source:Blob,name='画像'):Promise<ClipboardItem>{
    if(source.size>64*1024*1024||source.size<1)throw Error('画像ファイルのサイズは64MB以下にしてください。');
    const bitmap=await createImageBitmap(source);
    try{
      if(bitmap.width<1||bitmap.height<1||bitmap.width>8192||bitmap.height>8192||
        bitmap.width*bitmap.height>16_777_216)throw Error('画像が大きすぎます。最大1677万画素まで対応します。');
      const canvas=document.createElement('canvas');
      canvas.width=bitmap.width;canvas.height=bitmap.height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      if(!ctx)throw Error('読み込み用の画像画面を作成できません。');
      ctx.drawImage(bitmap,0,0);
      const data=ctx.getImageData(0,0,bitmap.width,bitmap.height);
      const item:ClipboardItem={
        sourceDocumentId:'external-image',sourceColorProfile:'srgb',
        sourceName:name.slice(0,100),originX:0,originY:0,
        width:bitmap.width,height:bitmap.height,selected:false,merged:true,
        pixels:data.data.slice()
      };
      this.item=item;return item;
    }finally{bitmap.close();}
  }
  async writeSystemClipboard():Promise<void>{
    const blob=await this.makePng();
    if(!navigator.clipboard?.write||typeof globalThis.ClipboardItem==='undefined')throw Error('このブラウザーは画像のコピーに対応していません。PNGを書き出してください。');
    await navigator.clipboard.write([new globalThis.ClipboardItem({'image/png':blob})]);
  }
  async readSystemClipboard():Promise<ClipboardItem>{
    if(!navigator.clipboard?.read)throw Error('端末のクリップボードを読めません。画像ファイルから読み込んでください。');
    const values=await navigator.clipboard.read();
    for(const clip of values){
      const supported=clip.types.find(type=>['image/png','image/webp','image/jpeg'].includes(type));
      if(!supported)continue;
      return this.importImage(await clip.getType(supported),'端末からコピーした画像');
    }
    throw Error('端末のクリップボードに対応画像がありません。');
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
