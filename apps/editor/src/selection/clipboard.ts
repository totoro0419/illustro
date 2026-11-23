import {legacyProfileTransform} from '../color/legacyProfiles';
import {appConfirm} from '../ui/appDialogs';
/** C06 copy/cut/paste operating on real document pixels and history. */
import {transformLayerMask,moveEditableArtwork,type EditableText,type RasterPixelTiles,type LayerNode,type LayerGroup,type LayerDeformation,type LayerMask,type LayerId,type LineRegions} from '@illustro/core';
import {CanonicalBuilder,validateRecord,type StrokeRecord} from '@illustro/brush-rt';
import {translateStroke} from '../seamlessStroke';
import {describeStroke,strokeTilesForCanvas} from '../strokeCommit';
import {digestLayerMask} from '../transform/mask';
import type {EditorController} from '../controller';
import type {BrushSurface} from '../brushSurface';
import {addAssetsAtomically,getAsset,type AssetEntry} from '../assets/library';
import {textFontAssetIds} from '../artwork/textStyles';
import {readFillReference} from '../fill/reference';
import {captureExport,renderFrozenArtwork} from '../export/basicExport';
import type {SelectionRect} from '../strokeSelection';
import {cropSelectionMask,type MaskData,rasterizeSelection} from './mask';
import {runMaskedPixelJob} from './pixels';
import {forEachPastedTile} from './pasteTiles';

type EditableLayerCopy=Readonly<{layer:LayerNode;pixels:Uint8Array|RasterPixelTiles;regionSource?:Readonly<{pixels:Uint8Array;recipe:LineRegions}>;transform?:Readonly<{
  original:Uint8Array;mask:LayerMask|null;deformation:LayerDeformation;
  strokes:readonly Readonly<{record:StrokeRecord;supplemental:boolean}>[];
}>}>;
export type ClipboardItem=Readonly<{
  sourceDocumentId:string;sourceColorProfile:string;sourceName:string;
  originX:number;originY:number;width:number;height:number;
  selected:boolean;merged:boolean;pixels:Uint8ClampedArray;
  editable?:Readonly<{layers:readonly EditableLayerCopy[];groups:readonly LayerGroup[];
    fonts?:readonly AssetEntry[];embedFonts?:boolean}>;
}>;
const safeRect=(selection:SelectionRect|null,width:number,height:number)=>{
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
    selection&&![selection.x,selection.y,selection.width,selection.height].every(Number.isFinite))
    throw Error('コピーする範囲が正しくありません。');
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
  private serial=0;
  private selectionMask:MaskData|null=null;
  get snapshotId(){return this.serial;}
  /** Generate a small read-only visual candidate, never a second 4K canvas. */
  preview(maxSide=512):Readonly<{
    width:number;height:number;originX:number;originY:number;
    previewWidth:number;previewHeight:number;pixels:Uint8ClampedArray|null;
    editable:boolean;sourceName:string;
  }>|null{
    const item=this.item;
    if(!item)return null;
    const factor=Math.min(1,maxSide/Math.max(item.width,item.height));
    const previewWidth=Math.max(1,Math.round(item.width*factor)),
      previewHeight=Math.max(1,Math.round(item.height*factor));
    let pixels:Uint8ClampedArray|null=null;
    if(item.pixels.length===item.width*item.height*4){
      pixels=new Uint8ClampedArray(previewWidth*previewHeight*4);
      for(let py=0;py<previewHeight;py++){
        const sy=Math.min(item.height-1,Math.floor((py+.5)*item.height/previewHeight));
        for(let px=0;px<previewWidth;px++){
          const sx=Math.min(item.width-1,Math.floor((px+.5)*item.width/previewWidth));
          const from=(sy*item.width+sx)*4,to=(py*previewWidth+px)*4;
          pixels.set(item.pixels.subarray(from,from+4),to);
        }
      }
    }
    return {
      width:item.width,height:item.height,originX:item.originX,originY:item.originY,
      previewWidth,previewHeight,pixels,editable:!!item.editable,sourceName:item.sourceName
    };
  }
  setSelectionMask(mask:MaskData|null){this.selectionMask=mask;}
  get hasContent(){return this.item!==null;}
  get summary(){return this.item?{
    name:this.item.sourceName,width:this.item.width,height:this.item.height,
    sourceDocumentId:this.item.sourceDocumentId,selected:this.item.selected,merged:this.item.merged,editable:this.item.editable?.layers.length??0,group:this.item.editable?.groups.length!==0&&!!this.item.editable
  }:null;}
  clear(){this.item=null;this.serial++;}
  async copy(controller:EditorController,drawing:BrushSurface,opts:Readonly<{merged:boolean;selectionOnly:boolean;group?:boolean;embedFonts?:boolean}>){
    const document=controller.document,root=document.root,head=document.head;
    const selection=opts.selectionOnly?drawing.selectedRectangle:null;
    if(opts.selectionOnly&&!selection)throw Error('先に選択範囲を作成してください。');
    const area=safeRect(selection,root.width,root.height);
    // Never turn a corrupt saved selection mask into an unmasked rectangle
    // copy. In particular, missing alpha bytes must not expose extra pixels.
    if(selection&&this.selectionMask&&(
      this.selectionMask.width!==root.width||this.selectionMask.height!==root.height||
      this.selectionMask.alpha.length!==root.width*root.height))
      throw Error('選択マスクの大きさが作品に一致しません。');
    let source:Uint8Array|Uint8ClampedArray,editable:ClipboardItem['editable'];
    let regionPixels:Uint8ClampedArray|null=null;
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
      // Normal group layers are copied as occupied tiles. Geometry-aware
      // layers (deformation, line-regions, white paper) retain their full
      // compatible capture; they have additional reconstruction semantics.
      if(selection&&!group&&layer.baseColor!=='white'&&!layer.deformation&&
        !layer.lineRegions&&!layer.imageLink&&typeof drawing.captureDocumentLayerRegion==='function')
        regionPixels=await drawing.captureDocumentLayerRegion(layer.id,area);
      const sparseIds=group&&!selection?new Set([...ids].filter(id=>{
        const candidate=root.getLayer(id);
        return candidate.baseColor!=='white'&&!candidate.deformation&&!candidate.lineRegions;
      })):null;
      const sparse= sparseIds?.size?await drawing.captureDocumentLayerTiles(sparseIds):null;
      const fullIds=regionPixels?new Set<LayerId>():
        sparse?new Set([...ids].filter(id=>!sparseIds!.has(id))):ids;
      const captured=fullIds.size?await drawing.captureDocumentLayers(fullIds):new Map<LayerId,Uint8Array>();
      if(!selection&&layer.baseColor!=='white'){
        const operations=document.rasterReplayPlan(head).operations;
        const layers:EditableLayerCopy[]=[];
        for(const id of root.rootLayerIds.filter(id=>ids.has(id))){
          const current=root.getLayer(id),pixels=sparse?.get(id)??captured.get(id);
          if(!pixels)throw Error('コピーするレイヤーを読み込めませんでした。');
          const recipe=current.lineRegions;
          if(recipe){
            if(!(pixels instanceof Uint8Array))throw Error('線画領域の参照元が正しくありません。');
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
      if(group)source=new Uint8Array(0); // A group preview uses its outline; no merged 4K image.
      else{
        const pixels=regionPixels??captured.get(layer.id);
        if(!pixels)throw Error('レイヤーを読み込めませんでした。');
        source=pixels;
      }
    }
    if(document.head!==head)throw Error('コピー中に作品が変更されました。もう一度コピーしてください。');
    // Crop before masking: a 12px selection should not transfer a 64 MiB
    // source and a 16 MiB alpha mask to a Worker just to keep 12px.
    const selectedMask=this.selectionMask&&this.selectionMask.width===root.width&&
      this.selectionMask.height===root.height&&selection?this.selectionMask:null;
    const clipped=group?new Uint8ClampedArray(0):
      regionPixels??crop(source,root.width,area);
    const pixels=selectedMask&&!group
      ?await runMaskedPixelJob(clipped,cropSelectionMask(selectedMask,area),'copy'):clipped;
    if(editable){
      const ids=new Set(editable.layers.flatMap(({layer})=>layer.editable?.kind==='text'&&
        (layer.editable.embedFont||opts.embedFonts)?textFontAssetIds(layer.editable):[]));
      const fonts:AssetEntry[]=[];
      let size=0;
      for(const id of ids){
        const font=await getAsset(id);
        if(!font||font.deleted||font.kind!=='font')continue;
        size+=font.data.size;
        if(font.data.size>24*1024*1024||size>48*1024*1024)
          throw Error('一緒にコピーするフォントは1件24MB、合計48MBまでです。');
        fonts.push(font);
      }
      editable={...editable,...(fonts.length?{fonts}:{}),...(opts.embedFonts?{embedFonts:true}:{})};
    }
    if(document.head!==head)throw Error('コピー中に作品が変更されました。');
    const record:ClipboardItem={
      sourceDocumentId:root.documentId,sourceColorProfile:root.colorProfileId,
      sourceName:opts.merged?'合成した作品':group?.name??selectedLayer.name,
      originX:area.x,originY:area.y,width:area.width,height:area.height,
      selected:!!selection,merged:opts.merged,pixels,...(editable?{editable}:{})
    };
    this.item=record;this.serial++;
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
  async paste(
    controller:EditorController,
    placement:'center'|'original'|Readonly<{x:number;y:number}>='center'
  ){
    let record=this.item;
    if(!record)throw Error('先にコピーしてください。');
    const document=controller.document,root=document.root,head=document.head,reference=controller.selectedLayer.id;
    const convert=legacyProfileTransform(record.sourceColorProfile,root.colorProfileId);
    if(convert){
      if(!await appConfirm('「'+record.sourceColorProfile+'」から「'+root.colorProfileId+
        '」へ色を変換します。範囲外の色は近い色になり、重ね方や色効果の見え方が変わる場合があります。続けますか？'))
        throw Error('貼り付けを取り消しました。');
      const convertStroke=(stroke:StrokeRecord)=>{
        const preset=stroke.version===3?stroke.foundation:stroke.preset;
        const builder=new CanonicalBuilder({...preset,color:convert.color([...preset.color] as [number,number,number])},
          [...stroke.seed],stroke.fast,stroke.version===3?stroke.context:{});
        for(const input of stroke.raw)builder.accept(input);
        if(stroke.version===3&&stroke.releaseInput)builder.release(stroke.releaseInput);
        builder.finish();return builder.record();
      };
      const editable=record.editable;
      const layers:EditableLayerCopy[]=[];
      for(const item of editable?.layers??[]){
        const {layer,transform,regionSource}=item;
        const pixels=item.pixels instanceof Uint8Array?await convert.pixels(item.pixels):{
          ...item.pixels,tiles:await Promise.all(item.pixels.tiles.map(async tile=>({...tile,pixels:await convert.pixels(tile.pixels)}))),
        };
        const map=layer.blend?.gradientMap;
        const nextBlend=map&&layer.blend?{...layer.blend,gradientMap:{...map,stops:map.stops.map(stop=>({...stop,color:convert.hex(stop.color)}))}}:undefined;
        layers.push({...item,pixels,layer:{...layer,...(nextBlend?{blend:nextBlend}:{}),
          ...(layer.editable?{editable:convert.editable(layer.editable)}:{})},
          ...(transform?{transform:{...transform,original:await convert.pixels(transform.original),
            deformation:{...transform.deformation,...(transform.deformation.postPaint?{
              postPaint:transform.deformation.postPaint.map(pass=>({...pass,records:pass.records.map(raw=>convertStroke(validateRecord(raw)))}))
            }:{})},strokes:transform.strokes.map(stroke=>({...stroke,record:convertStroke(stroke.record)}))}}:{}),
          ...(regionSource?{regionSource:{...regionSource,pixels:await convert.pixels(regionSource.pixels)}}:{})});
      }
      record={...record,pixels:await convert.pixels(record.pixels),...(editable?{editable:{...editable,layers}}:{})};
    }
    if(controller.document!==document||document.head!==head||controller.selectedLayer.id!==reference)
      throw Error('貼り付け先が変わったため、操作を取り消しました。');
    if(!record.editable&&record.sourceDocumentId!=='external-image'&&record.sourceDocumentId!==root.documentId&&
      !await appConfirm('別の作品から貼り付けます。現段階では画素だけを新しいレイヤーへ移し、元のブラシ履歴・特殊なレイヤー設定は移せません。続けますか？'))
      throw Error('別作品への貼り付けを取り消しました。');
    const custom=typeof placement==='object'?placement:null;
    if(custom&&(!Number.isSafeInteger(custom.x)||!Number.isSafeInteger(custom.y)||
      Math.abs(custom.x)>16384||Math.abs(custom.y)>16384))
      throw Error('貼り付け位置の座標が正しくありません。');
    const x=custom?custom.x:placement==='original'?record.originX:Math.round((root.width-record.width)/2);
    const y=custom?custom.y:placement==='original'?record.originY:Math.round((root.height-record.height)/2);
    if(record.editable){
      if(x<0||y<0||x+record.width>root.width||y+record.height>root.height)
        throw Error('編集できるレイヤーを保つには、元作品と同じ大きさ以上のキャンバスに貼り付けてください。');
      const ids=new Set(record.editable.layers.map(entry=>entry.layer.id));
      const clipLoss=record.editable.layers.some(({layer})=>layer.clipSourceId&&!ids.has(layer.clipSourceId));
      const fontIds=new Set(record.editable.layers.flatMap(({layer})=>
        layer.editable?.kind==='text'?textFontAssetIds(layer.editable):[]));
      const copiedFonts=new Map((record.editable.fonts??[]).map(font=>[font.id,font]));
      const missingFonts:string[]=[],newFonts:AssetEntry[]=[],fontRemap=new Map<string,string>();
      for(const id of fontIds){
        const local=await getAsset(id),copy=copiedFonts.get(id);
        const active=local&&!local.deleted&&local.kind==='font'?local:null;
        if(!copy){if(!active)missingFonts.push(id);continue;}
        if(active&&active.version===copy.version&&active.bytes===copy.bytes)continue;
        const nextId=local?crypto.randomUUID():copy.id;
        fontRemap.set(id,nextId);
        newFonts.push({...copy,id:nextId});
      }
      const fontNotice=fontIds.size?' フォント参照を保持します。'+(copiedFonts.size?
        ' コピーに含まれるフォントは'+copiedFonts.size+'件です。':'')+(missingFonts.length
        ?' 見つからないフォントが'+missingFonts.length+'件あります。文字編集で指定し直せます。':''):'';
      const embedFonts=record.editable.embedFonts===true;
      function placeText(text:EditableText):EditableText{
        const ids=textFontAssetIds(text);
        const contained=ids.length>0&&ids.every(id=>copiedFonts.has(id));
        return {...text,...(embedFonts&&contained?{embedFont:true}:{}),
          ...(text.fontAsset?{fontAsset:fontRemap.get(text.fontAsset)??text.fontAsset}:{}),
          ...(text.styleRanges?{styleRanges:text.styleRanges.map(range=>range.fontAsset?
            {...range,fontAsset:fontRemap.get(range.fontAsset)??range.fontAsset}:range)}:{})};
      }
      const hasRegions=record.editable.layers.some(entry=>entry.regionSource);
      if(hasRegions&&(root.width!==record.width||root.height!==record.height))
        throw Error('元と同じ大きさの作品に貼り付けると、線画領域の判定と参照元を保持できます。');
      const missingLinks=record.editable.layers.some(({layer})=>layer.imageLink?.kind==='instance'&&!ids.has(layer.imageLink.sourceId));
      const detached=clipLoss?'別のレイヤーへのクリッピングは、元になるレイヤーがコピーに含まれないため引き継げません。':'';
      const originals=record.editable.layers.some(entry=>entry.transform)?'変形を再編集できるように、非表示の原本も一緒に置きます。':'';
      if(!await appConfirm(`レイヤー ${ids.size} 枚を位置 (${x}, ${y}) に貼り付けます。レイヤー設定・マスク・文字・パスを保持します。元作品のUndo履歴は含みません。${originals}${hasRegions?'確認した線画の版も保持します。':''}${detached}${fontNotice}${missingLinks?'元が見つからない複製は現在の画像を埋め込みます。':''}`))
        throw Error('貼り付けを取り消しました。');
      const place=(pixels:Uint8Array|RasterPixelTiles)=>{
        if('tiles' in pixels)return {...pixels,x,y,width:record.width,height:record.height};
        if(!x&&!y&&record.width===root.width&&record.height===root.height)return pixels;
        // Keep the original bytes and offset. Core seeds only intersecting
        // tiles, instead of allocating one giant transparent RGBA buffer per
        // editable layer (including each preserved deformation source).
        return {x,y,width:record.width,height:record.height,pixels};
      };
      const entries=await Promise.all(record.editable.layers.map(async({layer,pixels,transform,regionSource})=>{
        const mask=moveMask(layer.vectorMask,x,y),effect=layer.blend?.effect;
        const placedLayer={...layer,
          ...(effect&&layer.blend?{blend:{...layer.blend,effect:{...effect,mask:moveMask(effect.mask,x,y)}}}:{}),
          ...(layer.imageLink?{imageLink:{...layer.imageLink,x:layer.imageLink.x+x,y:layer.imageLink.y+y}}:{})
        };
        const editable=layer.editable?.kind==='text'?placeText(layer.editable):layer.editable;
        const entry={layer:placedLayer,pixels:place(pixels),mask,editable:editable?moveEditableArtwork(editable,x,y):null};
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
      try{
        if(newFonts.length)await addAssetsAtomically(newFonts);
        if(controller.document!==document||document.head!==head||controller.selectedLayer.id!==reference)
          throw Error('貼り付け先が変わったため、操作を取り消しました。');
        controller.lastPersistenceHandoff=tx.commit().persistence;
      }catch(error){tx.cancel();throw error;}
      controller.selectLayer(id);
      return {revision:document.head,layerId:id,x,y};
    }
    if(x>=root.width||y>=root.height||x+record.width<=0||y+record.height<=0)
      throw Error('元の座標では画像がキャンバスの外に出ます。中央に貼り付けてください。');
    if((x<0||y<0||x+record.width>root.width||y+record.height>root.height)&&
      !await appConfirm('貼り付ける画像の一部がキャンバスの外です。はみ出した部分は省いて新しいレイヤーへ貼り付けます。続けますか？'))
      throw Error('貼り付けを取り消しました。');
    // Core stores raster pixels by tile. Write exactly the touched tiles,
    // never create an unnecessary canvas-wide RGBA allocation for a 4px image.
    if(controller.document!==document||document.head!==head||controller.selectedLayer.id!==reference)
      throw Error('貼り付け先が変わったため、操作を取り消しました。');
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
      this.item=item;this.serial++;return item;
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
