/** C06 copy/cut/paste operating on real document pixels and history. */
import {transformLayerMask,moveEditableArtwork,type LayerNode,type LayerGroup,type LayerDeformation,type LayerMask,type LayerId,type LineRegions} from '@illustro/core';
import {validateRecord,type StrokeRecord} from '@illustro/brush-rt';
import {translateStroke} from '../seamlessStroke';
import {describeStroke,strokeTilesForCanvas} from '../strokeCommit';
import {digestLayerMask} from '../transform/mask';
import type {EditorController} from '../controller';
import type {BrushSurface} from '../brushSurface';
import {getAsset} from '../assets/library';
import {readFillReference} from '../fill/reference';
import {captureExport,renderFrozenArtwork} from '../export/basicExport';
import type {SelectionRect} from '../strokeSelection';
import {type MaskData,rasterizeSelection} from './mask';
import {runMaskedPixelJob} from './pixels';
import {forEachPastedTile} from './pasteTiles';

type EditableLayerCopy=Readonly<{layer:LayerNode;pixels:Uint8Array;regionSource?:Readonly<{pixels:Uint8Array;recipe:LineRegions}>;transform?:Readonly<{
  original:Uint8Array;mask:LayerMask|null;deformation:LayerDeformation;
  strokes:readonly Readonly<{record:StrokeRecord;supplemental:boolean}>[];
}>}>;
export type ClipboardItem=Readonly<{
  sourceDocumentId:string;sourceColorProfile:string;sourceName:string;
  originX:number;originY:number;width:number;height:number;
  selected:boolean;merged:boolean;pixels:Uint8ClampedArray;
  editable?:Readonly<{layers:readonly EditableLayerCopy[];groups:readonly LayerGroup[]}>;
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
function moveMask(mask:LayerMask|null|undefined,x:number,y:number){
  return mask&&(x||y)?transformLayerMask(mask,1,1,x,y):mask??null;
}
function moveDeformation(deformation:LayerDeformation,x:number,y:number):LayerDeformation{
  const move=<T extends {x:number;y:number}>(value:T):T=>({...value,x:value.x+x,y:value.y+y});
  const selection=deformation.selection?{...deformation.selection,x:deformation.selection.x+x,y:deformation.selection.y+y}:null;
  const postPaint=deformation.postPaint?.map(pass=>({
    selection:pass.selection?{...pass.selection,x:pass.selection.x+x,y:pass.selection.y+y}:null,
    records:pass.records.map(record=>translateStroke(validateRecord(record),x,y))
  }));
  const base={...deformation,bounds:move(deformation.bounds),selection,...(postPaint?{postPaint}:{})};
  if('affine' in deformation)return {...base,mode:deformation.mode,affine:{...deformation.affine,cx:deformation.affine.cx+x,cy:deformation.affine.cy+y}};
  if('corners' in deformation)return {...base,mode:deformation.mode,corners:deformation.corners.map(move) as unknown as typeof deformation.corners};
  if('mesh' in deformation){
    const mesh=deformation.mesh;
    return {...base,mode:deformation.mode,mesh:{...mesh,points:mesh.points.map(move),...(mesh.kind==='cage'?{source:mesh.source.map(move)}:{})}} as LayerDeformation;
  }
  return {...base,mode:deformation.mode,strokes:deformation.strokes.map(stroke=>({...stroke,points:stroke.points.map(move)}))};
}

export class ArtworkClipboard {
  private item:ClipboardItem|null=null;
  private selectionMask:MaskData|null=null;
  setSelectionMask(mask:MaskData|null){this.selectionMask=mask;}
  get hasContent(){return this.item!==null;}
  get summary(){return this.item?{
    name:this.item.sourceName,width:this.item.width,height:this.item.height,
    sourceDocumentId:this.item.sourceDocumentId,selected:this.item.selected,merged:this.item.merged,editable:this.item.editable?.layers.length??0,group:this.item.editable?.groups.length!==0&&!!this.item.editable
  }:null;}
  clear(){this.item=null;}
  async copy(controller:EditorController,drawing:BrushSurface,opts:Readonly<{merged:boolean;selectionOnly:boolean;group?:boolean}>){
    const document=controller.document,root=document.root,head=document.head;
    const selection=opts.selectionOnly?drawing.selectedRectangle:null;
    if(opts.selectionOnly&&!selection)throw Error('先に選択範囲を作成してください。');
    const area=safeRect(selection,root.width,root.height);
    let source:Uint8Array|Uint8ClampedArray,editable:ClipboardItem['editable'];
    const selectedLayer=controller.selectedLayer;
    const group=opts.group?root.groupsForLayer(selectedLayer.id).at(-1):undefined;
    if(opts.group&&!group)throw Error('コピーするグループ内のレイヤーを選んでください。');
    if(opts.merged){
      source=await renderFrozenArtwork(captureExport(document));
    }else{
      const layer=selectedLayer;
      if(layer.kind!=='raster')throw Error('このレイヤーは画素のコピーに対応していません。');
      const ids=new Set<LayerId>(group?.members??[layer.id]);
      if(!selection){
        for(const id of ids){
          const base=root.clippingSource(id);
          if(base)ids.add(base.id);
          const link=root.getLayer(id).imageLink;
          if(link?.kind==='instance'&&root.layers.get(link.sourceId)?.imageLink)ids.add(link.sourceId);
        }
      }
      const captured=await drawing.captureDocumentLayers(ids);
      if(!selection&&layer.baseColor!=='white'){
        const operations=document.rasterReplayPlan(head).operations;
        const layers:EditableLayerCopy[]=[];
        for(const id of root.rootLayerIds.filter(id=>ids.has(id))){
          const current=root.getLayer(id),pixels=captured.get(id);
          if(!pixels)throw Error('コピーするレイヤーを読み込めませんでした。');
          const recipe=current.lineRegions;
          if(recipe){
            const source=document.revision(recipe.sourceRevision).root;
            if(source.width!==root.width||source.height!==root.height)
              throw Error('元の線画の大きさが変わっています。領域を更新してからコピーしてください。');
            const reference=await readFillReference(document,recipe.sourceRevision,recipe.reference,recipe.sources);
            layers.push({layer:current,pixels,regionSource:{pixels:reference,recipe}});
            continue;
          }
          const deformation=current.deformation;
          if(!deformation){layers.push({layer:current,pixels});continue;}
          const sourceId=deformation.sourceLayerId??id,revision=deformation.sourceRevision;
          const originalLayer=document.revision(revision).root.getLayer(sourceId);
          const frozen=captureExport(document,sourceId,revision),surfaceId=originalLayer.surface.descriptor.surfaceId;
          const original=await renderFrozenArtwork({...frozen,layers:[{surfaceId,visible:true,opacity:1}],
            basePixels:frozen.basePixels?.filter(item=>item.surfaceId===surfaceId)??[],
            strokes:frozen.strokes.filter(item=>item.surfaceId===surfaceId)});
          const strokes=operations.flatMap(operation=>operation.kind==='brush.stroke'&&operation.targetEntityIds[0]===id
            ?[{record:validateRecord(operation.parameters.strokeRecord),supplemental:operation.parameters.seamlessCopy===true}]:[]);
          layers.push({layer:current,pixels:document.readBaseRasterPixels(id,head),transform:{
            original:new Uint8Array(original),mask:originalLayer.vectorMask??null,deformation,strokes
          }});
        }
        const groups=group?root.layerGroups.filter(candidate=>
          candidate.members.every(id=>ids.has(id))&&root.layerGroups.indexOf(candidate)>=root.layerGroups.indexOf(group)
        ):[];
        editable={layers,groups};
      }
      const pixels=captured.get(layer.id);
      if(!pixels)throw Error('レイヤーを読み込めませんでした。');
      source=pixels;
    }
    if(document.head!==head)throw Error('コピー中に作品が変更されました。もう一度コピーしてください。');
    const masked=this.selectionMask&&this.selectionMask.width===root.width&&this.selectionMask.height===root.height&&selection
      ?await runMaskedPixelJob(source,this.selectionMask,'copy'):source;
    if(document.head!==head)throw Error('コピー中に作品が変更されました。');
    const pixels=group?new Uint8ClampedArray(0):crop(masked,root.width,area);
    const record:ClipboardItem={
      sourceDocumentId:root.documentId,sourceColorProfile:root.colorProfileId,
      sourceName:opts.merged?'合成した作品':group?.name??selectedLayer.name,
      originX:area.x,originY:area.y,width:area.width,height:area.height,
      selected:!!selection,merged:opts.merged,pixels,...(editable?{editable}:{})
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
  async paste(controller:EditorController,placement:'center'|'original'='center'){
    const record=this.item;
    if(!record)throw Error('先にコピーしてください。');
    const document=controller.document,root=document.root,head=document.head,reference=controller.selectedLayer.id;
    if(record.sourceColorProfile!==root.colorProfileId)
      throw Error('元作品と色空間が異なります。色変換はC15の機能を使ってください。');
    if(!record.editable&&record.sourceDocumentId!=='external-image'&&record.sourceDocumentId!==root.documentId&&
      !window.confirm('別の作品から貼り付けます。現段階では画素だけを新しいレイヤーへ移し、元のブラシ履歴・特殊なレイヤー設定は移せません。続けますか？'))
      throw Error('別作品への貼り付けを取り消しました。');
    const x=placement==='original'?record.originX:Math.round((root.width-record.width)/2);
    const y=placement==='original'?record.originY:Math.round((root.height-record.height)/2);
    if(record.editable){
      if(x<0||y<0||x+record.width>root.width||y+record.height>root.height)
        throw Error('編集できるレイヤーを保つには、元作品と同じ大きさ以上のキャンバスに貼り付けてください。');
      const ids=new Set(record.editable.layers.map(entry=>entry.layer.id));
      const clipLoss=record.editable.layers.some(({layer})=>layer.clipSourceId&&!ids.has(layer.clipSourceId));
      const fontIds=new Set(record.editable.layers.flatMap(({layer})=>
        layer.editable?.kind==='text'&&layer.editable.fontAsset?[layer.editable.fontAsset]:[]));
      const missingFonts=[];
      for(const id of fontIds){
        const font=await getAsset(id);
        if(!font||font.deleted||font.kind!=='font')missingFonts.push(id);
      }
      const fontNotice=fontIds.size?'フォント参照を保持します。'+(missingFonts.length
        ?'素材庫にないフォントが'+missingFonts.length+'件あります。文字編集でフォントを指定し直せます。':''):'';
      const hasRegions=record.editable.layers.some(entry=>entry.regionSource);
      if(hasRegions&&(root.width!==record.width||root.height!==record.height))
        throw Error('元と同じ大きさの作品に貼り付けると、線画領域の判定と参照元を保持できます。');
      const missingLinks=record.editable.layers.some(({layer})=>layer.imageLink?.kind==='instance'&&!ids.has(layer.imageLink.sourceId));
      const detached=clipLoss?'別のレイヤーへのクリッピングは、元になるレイヤーがコピーに含まれないため引き継げません。':'';
      const originals=record.editable.layers.some(entry=>entry.transform)?'変形を再編集できるように、非表示の原本も一緒に置きます。':'';
      if(!window.confirm(`レイヤー ${ids.size} 枚を位置 (${x}, ${y}) に貼り付けます。レイヤー設定・マスク・文字・パスを保持します。元作品のUndo履歴は含みません。${originals}${hasRegions?'確認した線画の版も保持します。':''}${detached}${fontNotice}${missingLinks?'元が見つからない複製は現在の画像を埋め込みます。':''}`))
        throw Error('貼り付けを取り消しました。');
      const place=(pixels:Uint8Array)=>{
        if(!x&&!y&&record.width===root.width&&record.height===root.height)return pixels;
        const placed=new Uint8Array(root.width*root.height*4);
        for(let row=0;row<record.height;row++){
          const start=row*record.width*4;
          placed.set(pixels.subarray(start,start+record.width*4),((row+y)*root.width+x)*4);
        }
        return placed;
      };
      const entries=await Promise.all(record.editable.layers.map(async({layer,pixels,transform,regionSource})=>{
        const mask=moveMask(layer.vectorMask,x,y),effect=layer.blend?.effect;
        const placedLayer={...layer,
          ...(effect&&layer.blend?{blend:{...layer.blend,effect:{...effect,mask:moveMask(effect.mask,x,y)}}}:{}),
          ...(layer.imageLink?{imageLink:{...layer.imageLink,x:layer.imageLink.x+x,y:layer.imageLink.y+y}}:{})
        };
        const entry={layer:placedLayer,pixels:place(pixels),mask,editable:layer.editable?moveEditableArtwork(layer.editable,x,y):null};
        if(!transform)return {...entry,...(regionSource?{regionSource}:{})};
        let deformation=moveDeformation(transform.deformation,x,y);
        const oldDigest=transform.deformation.maskDigest;
        if(oldDigest&&layer.vectorMask&&mask&&await digestLayerMask(layer.vectorMask)===oldDigest)
          deformation={...deformation,maskDigest:await digestLayerMask(mask)};
        const strokes=[];
        for(const stroke of transform.strokes){
          const placed=translateStroke(stroke.record,x,y),tiles=await strokeTilesForCanvas(placed,root.width,root.height);
          if(!tiles.length)throw Error('変形後に描いた線を同じ位置関係で移せませんでした。');
          strokes.push({operation:describeStroke(placed,stroke.supplemental),tiles});
        }
        return {...entry,strokes,source:{pixels:place(transform.original),mask:moveMask(transform.mask,x,y),deformation}};
      }));
      if(controller.document!==document||document.head!==head||controller.selectedLayer.id!==reference)
        throw Error('貼り付け先が変わったため、操作を取り消しました。');
      const tx=document.begin('編集できるレイヤーを貼り付ける');
      const id=tx.pasteRasterLayers(reference,entries,record.editable.groups);
      controller.lastPersistenceHandoff=tx.commit().persistence;
      controller.selectLayer(id);
      return {revision:document.head,layerId:id,x,y};
    }
    if(x>=root.width||y>=root.height||x+record.width<=0||y+record.height<=0)
      throw Error('元の座標では画像がキャンバスの外に出ます。中央に貼り付けてください。');
    if((x<0||y<0||x+record.width>root.width||y+record.height>root.height)&&
      !window.confirm('貼り付ける画像の一部がキャンバスの外です。はみ出した部分は省いて新しいレイヤーへ貼り付けます。続けますか？'))
      throw Error('貼り付けを取り消しました。');
    // Core stores raster pixels by tile. Write exactly the touched tiles,
    // never create an unnecessary canvas-wide RGBA allocation for a 4px image.
    const tx=document.begin('画像を貼り付ける');
    const id=tx.addRasterLayerAbove(controller.selectedLayer.id,false);
    tx.renameLayer(id,(record.sourceName||'貼り付け').slice(0,100)+'（貼り付け）');
    forEachPastedTile(record,{width:root.width,height:root.height},x,y,
      (tileX,tileY,bytes)=>tx.editTile(id,tileX,tileY,destination=>destination.set(bytes)));
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
    if(!item.pixels.length)throw Error('グループを画像にするには、見えている絵をコピーしてください。');
    const canvas=document.createElement('canvas');canvas.width=item.width;canvas.height=item.height;
    const context=canvas.getContext('2d');
    if(!context)throw Error('画像を作成できません。');
    context.putImageData(new ImageData(item.pixels.slice(),item.width,item.height),0,0);
    return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('画像に変換できませんでした。')),'image/png'));
  }
}
