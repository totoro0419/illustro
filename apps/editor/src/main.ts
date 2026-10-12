import './style.css';
import './ui/shell.css';
import './ui/aurora.css';
import './color/color.css';
import {ForegroundColor,rgb,hex} from './color/model';
import {installColorPanel} from './color/panel';
import {shellMarkup} from './ui/shell';
import {installShellUi} from './ui/shellBehavior';
import {EditorController,type EditorHistoryChange} from './controller';
import {BrushSurface} from './brushSurface';
import {changeCanvasBounds,cropCanvas,shiftedForAnchor,resizeImagePixels,type ImageResample} from './canvasGeometry';
import {captureExport,exportImage,exportFileName,type ImageFormat,type ImageExportResult} from './export/basicExport';
import {PersistenceCoordinator,type Candidate,type PersistenceState} from './persistence/coordinator';
import type {PortableOpenResult} from './persistence/portable';
import type {SemanticOperation} from '@illustro/core';

const qaPath=location.pathname.replace(/\/+$/,'');
const m09Mode=new URLSearchParams(location.search).has('m09')||qaPath.endsWith('/qa/m09')||qaPath.endsWith('/qa/m09/index.html');
const m08Mode=m09Mode||new URLSearchParams(location.search).has('m08')||qaPath.endsWith('/qa/m08')||qaPath.endsWith('/qa/m08/index.html');
const qaMode=new URLSearchParams(location.search).get('qa')==='1'||qaPath.endsWith('/qa/m05')||qaPath.endsWith('/qa/m05/index.html')||qaPath.endsWith('/qa/m06')||qaPath.endsWith('/qa/m06/index.html')||qaPath.endsWith('/qa/m07')||qaPath.endsWith('/qa/m07/index.html')||m08Mode;
const qaStartedAt=new Date().toISOString();
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=shellMarkup(qaMode,qaMode?(m09Mode?qaM09Markup():m08Mode?qaM08Markup():qaMarkup()):'');
// In M08 the GPU canvas is the entire interaction viewport, not a fixed paper rectangle.
if(m08Mode)document.body.classList.add('m08-canvas-viewport');

const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
let controller=new EditorController();
const foreground=new ForegroundColor();
let surface:BrushSurface|null=null,historyPending=false,undoCount=0,redoCount=0,blockedHistoryGhostClicks=0,lastPointerDownTarget:EventTarget|null=null,selectedTool:'brush'|'eraser'|'eyedropper'='brush',lastDrawingTool:'brush'|'eraser'='brush',lastBrushPresetId='foundation-g-pen',lastEraserPresetId='foundation-hard-eraser',documentReady=false,lastQueuedRevision:string|null=null,recoveryCandidates:readonly Candidate[]=[];
const CHECKPOINT_OPERATION_INTERVAL=12,CHECKPOINT_IDLE_MS=800;
let projectionCheckpointTimer:number|null=null,projectionCheckpointBusy=false,checkpointOpsSinceLast=0,checkpointNeedsFullSeed=true,lastCheckpointAt:number|null=null;
let checkpointOperations:SemanticOperation[]=[];
let persistenceState:PersistenceState|null=null;
let lastExport:(Omit<ImageExportResult,'blob'>&{downloadBytes:number})|null=null,exportError:string|null=null,exportBusy=false,exportCount=0;
const persistence=new PersistenceCoordinator(state=>{persistenceState=state;updatePersistenceDisplay();updateQa();});
const historyButtons=()=>[byId<HTMLButtonElement>('undo'),byId<HTMLButtonElement>('redo'),byId<HTMLButtonElement>('compactUndo'),byId<HTMLButtonElement>('compactRedo')];

const renderLayers=()=>{
  const rows=[...controller.layers].reverse(),selectedName=controller.selectedLayer.name;
  for(const id of ['layerList','layerPageList']){
    const list=byId<HTMLDivElement>(id);
    list.replaceChildren(...rows.map(layer=>{
      const selected=layer.id===controller.selectedLayerId,row=document.createElement('button'),name=document.createElement('span'),state=document.createElement('span');
      row.type='button';row.className='layer-row';row.dataset.layerId=layer.id;
      row.setAttribute('aria-pressed',String(selected));row.setAttribute('aria-label',layer.name+(selected?'、選択中':''));
      name.className='layer-name';name.textContent=layer.name;state.className='layer-state';state.textContent=selected?'選択中':'';
      row.append(name,state);
      row.onclick=()=>{
        try{controller.selectLayer(layer.id);renderLayers();byId('status').textContent=layer.name+'を選びました。次の線はこのレイヤーに入ります。';updateHistoryButtons();updateQa();}
        catch{byId('status').textContent='そのレイヤーを選択できませんでした。';}
      };
      return row;
    }));
  }
  byId('layerPageSelected').textContent=selectedName;
  byId('layersBoxSummary').textContent=selectedName;
  byId('documentBoxSummary').textContent=controller.document.root.width+'×'+controller.document.root.height;
};

function updateHistoryButtons(){
  const ready=!!surface,blocked=!ready||historyPending||surface?.busy===true;
  byId<HTMLButtonElement>('undo').disabled=blocked||!controller.canUndo;
  byId<HTMLButtonElement>('compactUndo').disabled=blocked||!controller.canUndo;
  byId<HTMLButtonElement>('redo').disabled=blocked||!controller.canRedo;
  byId<HTMLButtonElement>('compactRedo').disabled=blocked||!controller.canRedo;
  for(const button of historyButtons())button.setAttribute('aria-busy',String(historyPending));
}
function updatePersistenceDisplay(){
  const state=persistenceState,indicator=byId('saveState');
  if(!state){indicator.textContent='自動保存準備中';return;}
  indicator.textContent=state.storageError?'自動保存エラー':state.protectionPending||state.queueLength>0?'自動保存中':'自動保存済み';
  indicator.dataset.autosavePending=String(state.protectionPending||state.queueLength>0);indicator.dataset.saving=String(state.saving);indicator.dataset.protectedThrough=state.protectedThrough;
  byId<HTMLButtonElement>('recover').disabled=!recoveryCandidates.some(candidate=>BigInt(candidate.protectedThrough)>0n);
}

document.addEventListener('pointerdown',e=>{lastPointerDownTarget=e.target;},{capture:true});
if(qaMode){document.addEventListener('pointerdown',e=>{const canvas=byId<HTMLCanvasElement>('canvas'),target=e.target instanceof HTMLElement?e.target:null;canvas.dataset.lastPointerTarget=target?.id||target?.tagName.toLowerCase()||'unknown';canvas.dataset.lastPointerType=e.pointerType;canvas.dataset.lastPointerX=String(Math.round(e.clientX));canvas.dataset.lastPointerY=String(Math.round(e.clientY));queueMicrotask(updateQa);},{capture:true});}
const updateQa=()=>{
  const canvas=byId<HTMLCanvasElement>('canvas'),selected=controller.selectedLayer;
  canvas.dataset.committedStrokes=String(controller.committedStrokeCount);canvas.dataset.revisionId=controller.document.head;canvas.dataset.dirtyTiles=String(controller.lastCommit?.dirtyTileCount??0);
  canvas.dataset.layerCount=String(controller.layers.length);canvas.dataset.selectedLayerId=controller.selectedLayerId;canvas.dataset.selectedLayerName=selected.name;
  canvas.dataset.canUndo=String(controller.canUndo);canvas.dataset.canRedo=String(controller.canRedo);canvas.dataset.historyBusy=String(historyPending||surface?.busy===true);canvas.dataset.historyPatchHits=String(surface?.historyPatchHits??0);canvas.dataset.historyReplayFallbacks=String(surface?.historyReplayFallbacks??0);canvas.dataset.selectedTool=selectedTool;canvas.dataset.selectedPresetId=surface?.brushId??'未選択';canvas.dataset.selectedBlend=surface?.blendMode??'normal';canvas.dataset.eraserStrokes=String(controller.committedEraserStrokeCount);
  if(!qaMode)return;
  const data={display:surface?.displayDiagnostics??null,milestone:m09Mode?'M09':m08Mode?'M08':'M07',commit:(import.meta.env.VITE_COMMIT_SHA??'unknown'),backend:surface?.backend??'未取得',backendSelection:surface?.backendSelection??null,initializationError:surface?.initializationError??null,viewport:`${innerWidth}x${innerHeight}`,userAgent:navigator.userAgent,
    selectedTool,selectedPresetId:surface?.brushId??'未選択',selectedPresetName:surface?.brushName??'未選択',blendMode:surface?.blendMode??'normal',eraserType:surface?.eraserType,size:surface?.brushSize??0,
    layerCount:controller.layers.length,selectedLayerId:controller.selectedLayerId,selectedLayerName:selected.name,currentRevision:controller.document.head,canUndo:controller.canUndo,canRedo:controller.canRedo,
    seamlessCopyCount:controller.document.currentRevision.command?.operations.filter(op=>op.parameters.seamlessCopy===true).length??0,undoCount,redoCount,blockedHistoryGhostClicks,eraserCommittedStrokeCount:controller.committedEraserStrokeCount,totalStrokeCount:controller.committedStrokeCount,committedStrokeCount:controller.committedStrokeCount,historyPatchHits:surface?.historyPatchHits??0,historyReplayFallbacks:surface?.historyReplayFallbacks??0,rendererDesynchronized:surface?.rendererDesynchronized??false,rendererAlpha:surface?.rendererAlpha??false,rendererPremultipliedAlpha:surface?.rendererPremultipliedAlpha??false,rendererArtworkAlpha:surface?.rendererArtworkAlpha??false,presentationOpaque:surface?.presentationOpaque??false,presentationMode:surface?.presentationMode??'未取得',presentationAlpha:surface?.presentationAlpha??null,presentationDesynchronized:surface?.presentationDesynchronized??null,presentationFrames:surface?.presentationFrames??0,presentationLastAt:surface?.presentationLastAt??0,projectionRestoreMs:surface?.projectionRestoreMs??0,projectionRestoreMode:surface?.projectionRestoreMode??'none',projectionCacheRevision:surface?.projectionCacheRevision??null,browserPredictionSamples:surface?.browserPredictionSamples??0,
    lastInputTarget:canvas.dataset.lastPointerTarget??'まだ入力なし',lastInputType:canvas.dataset.lastPointerType??'—',lastInputPoint:canvas.dataset.lastPointerX&&canvas.dataset.lastPointerY?`${canvas.dataset.lastPointerX},${canvas.dataset.lastPointerY}`:'—',
    activeElement:document.activeElement instanceof HTMLElement?(document.activeElement.id||document.activeElement.tagName.toLowerCase()):'unknown',workspaceOpen:!workspace.inert,workspaceDisplay:getComputedStyle(workspace).display,
    visualViewport:window.visualViewport?{width:Math.round(window.visualViewport.width),height:Math.round(window.visualViewport.height),offsetTop:Math.round(window.visualViewport.offsetTop),offsetLeft:Math.round(window.visualViewport.offsetLeft),scale:window.visualViewport.scale}:null,
    export:{last:lastExport,error:exportError,busy:exportBusy,count:exportCount},layers:controller.layers.map(layer=>({id:layer.id,surfaceId:layer.surface.descriptor.surfaceId,name:layer.name,committedStrokes:controller.strokeCountForLayer(layer.id)})),documentId:controller.document.root.documentId,documentMetadata:controller.document.root.metadata,writerEpoch:controller.document.writerEpochId,commitSequence:controller.document.commitSequence.toString(),persistence:persistenceState,autosaveCheckpoint:{operationInterval:CHECKPOINT_OPERATION_INTERVAL,idleMs:CHECKPOINT_IDLE_MS,opsSinceLast:checkpointOpsSinceLast,fullSeedPending:checkpointNeedsFullSeed,lastCheckpointAt},qaStartedAt};
  byId('qaAuto').textContent=JSON.stringify(data,null,2);
};
renderLayers();

function scheduleProjectionCheckpoint(delay=CHECKPOINT_IDLE_MS){
  if(projectionCheckpointTimer!==null)clearTimeout(projectionCheckpointTimer);
  projectionCheckpointTimer=window.setTimeout(()=>{projectionCheckpointTimer=null;void createProjectionCheckpoint();},Math.max(0,delay));
}
function noteCheckpointOperations(operations:readonly SemanticOperation[]){
  checkpointOperations.push(...operations);checkpointOpsSinceLast+=Math.max(1,operations.length);
  scheduleProjectionCheckpoint(checkpointOpsSinceLast>=CHECKPOINT_OPERATION_INTERVAL?0:CHECKPOINT_IDLE_MS);
}
async function createProjectionCheckpoint(){
  if(projectionCheckpointBusy||!surface||!documentReady){if(documentReady)scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);return;}
  if(surface.busy){scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);return;}
  const activeSurface=surface,revisionId=controller.document.head,operations=checkpointOperations.slice(),fullSeed=checkpointNeedsFullSeed;projectionCheckpointBusy=true;
  try{
    const delta=await activeSurface.captureProjectionDelta(revisionId,fullSeed?undefined:operations);
    if(surface===activeSurface&&controller.document.head===revisionId&&!activeSurface.busy&&await persistence.storeProjectionDelta(delta)){
      checkpointOperations=[];checkpointOpsSinceLast=0;checkpointNeedsFullSeed=false;lastCheckpointAt=Date.now();
    }
  }catch{}finally{
    projectionCheckpointBusy=false;
    if(surface===activeSurface&&(controller.document.head!==revisionId||checkpointOperations.length||checkpointNeedsFullSeed))scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);
    updateQa();
  }
}
function resetCheckpointTracking(){checkpointOperations=[];checkpointOpsSinceLast=0;checkpointNeedsFullSeed=true;lastCheckpointAt=null;if(projectionCheckpointTimer!==null){clearTimeout(projectionCheckpointTimer);projectionCheckpointTimer=null;}}
function queueLatestCommit(){
  const handoff=controller.lastPersistenceHandoff;if(!handoff||handoff.resultRevisionId===lastQueuedRevision)return;lastQueuedRevision=handoff.resultRevisionId;
  persistence.noteCommit(controller.document,handoff);const revision=controller.document.revision(handoff.resultRevisionId),operations=revision.command?.operations??[];noteCheckpointOperations(operations);
}
function makeSurface(backendOverride:'webgl2'|'webgpu'|null=null){return new BrushSurface(byId('canvas'),controller,text=>{byId('status').textContent=text;},()=>{queueLatestCommit();renderLayers();updateHistoryButtons();updateQa();},()=>{updateHistoryButtons();updateViewControls();redrawCrop();updateQa();},backendOverride,(rgba,phase)=>{
 if(phase==='cancel'){foreground.cancel();return;}
 if(!rgba||rgba.length<4||rgba[3]===0){if(phase==='commit'){foreground.cancel();byId('status').textContent='透明な場所からは色を取得できません。';restoreDrawingTool();}return;}
 const alpha=(rgba[3]??0)/255,fromComposite=(byId<HTMLSelectElement>('colorSampleSource').value!=='layer');
 const channels=rgba.slice(0,3).map(v=>Math.min(1,Math.max(0,v/255)));
 // Composite surfaces store premultiplied alpha; restore the displayed RGB at translucent edges.
 const color=rgb(...(fromComposite&&alpha>0&&alpha<1?channels.map(v=>Math.min(1,v/alpha)):channels) as [number,number,number]);
 if(phase==='preview'){foreground.begin();foreground.preview(color);}
 else{foreground.begin();foreground.commit(color);byId('status').textContent='キャンバスから '+hex(foreground.current)+' を取得しました。';restoreDrawingTool();}
 });}
surface=makeSurface();
function updateViewControls(){const state=surface?.viewState;if(!state)return;
  byId<HTMLInputElement>('zoomPercent').value=String(Math.round(state.zoom*1000)/10);
  byId<HTMLInputElement>('angleDegree').value=String(Math.round(state.rotation*180/Math.PI*10)/10);
  for(const [id,on] of [['flipH',state.flipX],['flipV',state.flipY]] as const)byId<HTMLButtonElement>(id).setAttribute('aria-pressed',String(on));
  const tile=byId<HTMLInputElement>('seamless');if(tile)tile.checked=state.seamless;
}
const shellUi=installShellUi(),workspace=shellUi.workspace;
const colorPanel=installColorPanel(foreground,{onPickTool:()=>activateEyedropper(),onBrushColor:()=>surface?.setForegroundColor([foreground.current.r,foreground.current.g,foreground.current.b])});
function reflectRailTool(){for(const [id,active] of [['paint',selectedTool==='brush'],['erase',selectedTool==='eraser'],['eyedropper',selectedTool==='eyedropper']] as const)byId(id).setAttribute('aria-pressed',String(active));}
function activateEyedropper(){if(!surface||!documentReady)return;if(selectedTool!=='eyedropper')lastDrawingTool=selectedTool==='eraser'?'eraser':'brush';selectedTool='eyedropper';surface.setEyedropper(true,byId<HTMLSelectElement>('colorSampleSource').value as 'composite'|'layer');reflectRailTool();byId('status').textContent='キャンバスに触れて、取りたい色を選んでください。';updateQa();}
function restoreDrawingTool(){if(!surface)return;surface.setEyedropper(false);selectPreset(lastDrawingTool==='eraser'?lastEraserPresetId:lastBrushPresetId);updateQa();}
byId('eyedropper').onclick=activateEyedropper;
byId<HTMLSelectElement>('colorSampleSource').onchange=()=>{if(selectedTool==='eyedropper')surface?.setEyedropper(true,byId<HTMLSelectElement>('colorSampleSource').value as 'composite'|'layer');};
addEventListener('keydown',e=>{if(e.key.toLowerCase()!=='i'||e.altKey||e.ctrlKey||e.metaKey||e.repeat||(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,[contenteditable]')))return;e.preventDefault();if(selectedTool==='eyedropper')restoreDrawingTool();else activateEyedropper();});

function syncPreset(){if(!surface?.preset)return;byId<HTMLInputElement>('size').value=String(surface.preset.size);byId<HTMLInputElement>('sizeNumber').value=String(surface.preset.size);byId<HTMLInputElement>('force').checked=surface.preset.forceFade?.enabled??false;updateQa();}
type GeometryMode='document.crop'|'document.canvas-resize'|'document.image-resize';
let geometryMode:GeometryMode|null=null,geometryBusy=false;
const geometryDialog=byId<HTMLDialogElement>('geometryDialog'),cropOverlay=document.getElementById('cropOverlay') as unknown as SVGSVGElement;
const dimensionInput=(id:string)=>byId<HTMLInputElement>(id);
function geometryRect(){
 const root=controller.document.root;
 const x=Number(dimensionInput('geometryX').value),y=Number(dimensionInput('geometryY').value),w=Number(dimensionInput('geometryWidth').value),h=Number(dimensionInput('geometryHeight').value);
 if(![x,y,w,h].every(Number.isSafeInteger)||w<1||h<1||x<0||y<0||x+w>root.width||y+h>root.height)return null;
 return {x,y,w,h};
}
function redrawCrop(){
 if(geometryMode!=='document.crop'||!surface)return;
 const rect=geometryRect();if(!rect){cropOverlay.setAttribute('hidden','');return;}
 cropOverlay.removeAttribute('hidden');
 const a=surface.documentToScreen({x:rect.x,y:rect.y}),b=surface.documentToScreen({x:rect.x+rect.w,y:rect.y}),c=surface.documentToScreen({x:rect.x+rect.w,y:rect.y+rect.h}),d=surface.documentToScreen({x:rect.x,y:rect.y+rect.h});
 const points=[a,b,c,d];(document.getElementById('cropPolygon') as unknown as SVGPolygonElement).setAttribute('points',points.map(p=>p.x+','+p.y).join(' '));
 for(const [corner,index] of [['tl',0],['tr',1],['br',2],['bl',3]] as const){const handle=cropOverlay.querySelector<SVGCircleElement>('[data-corner="'+corner+'"]');if(handle){handle.setAttribute('cx',String(points[index]!.x));handle.setAttribute('cy',String(points[index]!.y));}}
}
function closeGeometry(){if(geometryBusy)return;geometryMode=null;geometryDialog.close();cropOverlay.setAttribute('hidden','');byId('geometryStatus').textContent='';}
function openGeometry(mode:GeometryMode){
 if(!documentReady||!surface?.canChangeGeometry){byId('status').textContent='描画が終わってから変更してください。';return;}
 geometryMode=mode;const root=controller.document.root;
 dimensionInput('geometryWidth').value=String(root.width);dimensionInput('geometryHeight').value=String(root.height);
 dimensionInput('geometryX').value='0';dimensionInput('geometryY').value='0';
 for(const element of geometryDialog.querySelectorAll<HTMLElement>('.crop-coordinate'))element.hidden=mode!=='document.crop';
 for(const element of geometryDialog.querySelectorAll<HTMLElement>('.resize-anchor'))element.hidden=mode!=='document.canvas-resize';
 for(const element of geometryDialog.querySelectorAll<HTMLElement>('.image-filter'))element.hidden=mode!=='document.image-resize';
 byId('geometryTitle').textContent=mode==='document.crop'?'切り抜き':mode==='document.canvas-resize'?'キャンバスサイズ変更':'画像サイズ変更';
 byId('geometryHelp').textContent=mode==='document.crop'?'黄色い枠の四隅をドラッグするか、数値で正確に指定できます。拡大・移動しながら調整できます。':mode==='document.canvas-resize'?'作品の範囲だけを変更します。絵の大きさは変えません。':'絵のピクセル数を変更します。画質を比較してから適用してください。';
 byId('geometryStatus').textContent='';
 if(!geometryDialog.open)geometryDialog.show();redrawCrop();
}
byId('cropStart').onclick=()=>openGeometry('document.crop');
byId('canvasResizeStart').onclick=()=>openGeometry('document.canvas-resize');
byId('imageResizeStart').onclick=()=>openGeometry('document.image-resize');
byId('geometryCancel').onclick=closeGeometry;
geometryDialog.addEventListener('cancel',e=>{e.preventDefault();closeGeometry();});
for(const id of ['geometryWidth','geometryHeight','geometryX','geometryY'])dimensionInput(id).addEventListener('input',redrawCrop);
let draggingCrop:{corner:string;startX:number;startY:number;endX:number;endY:number}|null=null;
cropOverlay.addEventListener('pointerdown',e=>{
 const target=e.target as SVGElement,corner=target.dataset.corner,rect=geometryRect();
 if(!corner||!rect)return;e.preventDefault();e.stopPropagation();
 draggingCrop={corner,startX:rect.x,startY:rect.y,endX:rect.x+rect.w,endY:rect.y+rect.h};
 target.setPointerCapture(e.pointerId);
});
cropOverlay.addEventListener('pointermove',e=>{
 if(!draggingCrop||!surface)return;e.preventDefault();
 const box=byId<HTMLCanvasElement>('canvas').getBoundingClientRect(),p=surface.screenToDocument({x:e.clientX-box.left,y:e.clientY-box.top}),root=controller.document.root,c=draggingCrop;
 const x=Math.max(0,Math.min(root.width,Math.round(p.x))),y=Math.max(0,Math.min(root.height,Math.round(p.y)));
 let x0=c.startX,y0=c.startY,x1=c.endX,y1=c.endY;
 if(c.corner.includes('l'))x0=Math.min(x,x1-1);else x1=Math.max(x,x0+1);
 if(c.corner.includes('t'))y0=Math.min(y,y1-1);else y1=Math.max(y,y0+1);
 dimensionInput('geometryX').value=String(x0);dimensionInput('geometryY').value=String(y0);
 dimensionInput('geometryWidth').value=String(x1-x0);dimensionInput('geometryHeight').value=String(y1-y0);redrawCrop();
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])cropOverlay.addEventListener(type,()=>draggingCrop=null);
async function reloadGeometryProjection(){
 const oldPreset=surface?.brushId;surface?.destroy();surface=makeSurface();
 await initializeCurrentSurface(true);
 if(oldPreset){try{selectPreset(oldPreset);}catch{}}
 updateViewControls();renderLayers();updateQa();redrawCrop();
}
async function applyGeometry(){
 if(!geometryMode||geometryBusy||!surface?.canChangeGeometry)return;
 const mode=geometryMode,old=controller.document.root,w=Number(dimensionInput('geometryWidth').value),h=Number(dimensionInput('geometryHeight').value);
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<1||h<1||w>8192||h>8192){byId('geometryStatus').textContent='幅と高さを1〜8192pxで指定してください。';return;}
 let rect=geometryRect();
 if(mode==='document.crop'&&!rect){byId('geometryStatus').textContent='切り抜き範囲が作品からはみ出しています。';return;}
 if(mode!=='document.crop'&&w===old.width&&h===old.height){byId('geometryStatus').textContent='元の大きさと同じです。';return;}
 geometryBusy=true;byId<HTMLButtonElement>('geometryApply').disabled=true;byId('geometryStatus').textContent='作品を変更しています。';
 const canvas=byId<HTMLCanvasElement>('canvas');canvas.style.pointerEvents='none';
 try{
  const source=await surface.captureDocumentLayers(),out=new Map<ReturnType<EditorController['target']>['layerId'],Uint8Array>();
  const anchor=dimensionInput('geometryAnchor').value as 'center'|'top-left'|'top-right'|'bottom-left'|'bottom-right';
  const shift=shiftedForAnchor(old.width,old.height,w,h,anchor);
  const method=dimensionInput('geometryFilter').value as ImageResample;
  for(const [id,pixels] of source){
   out.set(id,mode==='document.crop'?cropCanvas(pixels,old.width,old.height,rect!.x,rect!.y,w,h):
     mode==='document.canvas-resize'?changeCanvasBounds(pixels,old.width,old.height,w,h,shift.x,shift.y):
     resizeImagePixels(pixels,old.width,old.height,w,h,method));
  }
  const tx=controller.document.begin(mode==='document.crop'?'Crop':mode==='document.canvas-resize'?'Canvas Resize':'Image Resize');
  tx.resizeDocument(w,h,mode,out,mode==='document.crop'?{x:rect!.x,y:rect!.y}:{anchor,filter:method});
  const receipt=tx.commit();controller.lastPersistenceHandoff=receipt.persistence;queueLatestCommit();
  geometryMode=null;geometryDialog.close();cropOverlay.setAttribute('hidden','');
  await reloadGeometryProjection();scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);
  byId('status').textContent='作品を'+w+'×'+h+'pxに変更しました。元に戻すこともできます。';
 }catch(error){byId('geometryStatus').textContent=error instanceof Error?error.message:'変更できませんでした。';}
 finally{canvas.style.pointerEvents='';geometryBusy=false;byId<HTMLButtonElement>('geometryApply').disabled=false;updateHistoryButtons();updateQa();}
}
byId('geometryApply').onclick=()=>{void applyGeometry();};

async function initializeCurrentSurface(replay:boolean,projectionCache?:PortableOpenResult['projectionCache']){
  if(!surface)throw new Error('描画面がありません。');
  await surface.initialize();
  const select=byId<HTMLSelectElement>('brush');select.replaceChildren();surface.brushes.forEach(p=>select.add(new Option(p.name,p.id)));
  lastBrushPresetId=surface.brushes.find(p=>p.blend!=='erase')?.id??surface.brushes[0]?.id??lastBrushPresetId;
  lastEraserPresetId=surface.brushes.find(p=>p.id==='foundation-hard-eraser')?.id??surface.brushes.find(p=>p.blend==='erase')?.id??lastEraserPresetId;
  selectPreset(lastBrushPresetId);
  if(replay)await surface.restoreDocumentProjection(projectionCache);
  for(const id of ['brush','size','sizeNumber','force','addLayer','addLayerPage','save','saveCopy','exportImage','flipH','flipV'])(byId(id) as HTMLInputElement).disabled=false;
  syncPreset();surface.setForegroundColor([foreground.current.r,foreground.current.g,foreground.current.b]);renderLayers();updateHistoryButtons();documentReady=true;
}
async function activateOpened(opened:PortableOpenResult,recovered=false){
  surface?.destroy();controller=EditorController.restored(opened.document,opened.selectedLayerId);lastQueuedRevision=null;resetCheckpointTracking();surface=makeSurface();
  try{await initializeCurrentSurface(true,opened.projectionCache);}
  catch(error){
    const requested=new URLSearchParams(location.search).get('backend'),selection=surface?.backendSelection as {selected?:string}|null;
    if(requested!=='webgpu'&&requested!=='webgl2'&&selection?.selected==='webgpu'){
      surface?.destroy();surface=makeSurface('webgl2');await initializeCurrentSurface(true,opened.projectionCache);
    }else throw error;
  }
  await persistence.initialize(controller,null,opened.preserved,recovered);scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);updatePersistenceDisplay();updateQa();
}
byId<HTMLButtonElement>('new').onclick=async()=>{
  byId<HTMLButtonElement>('new').disabled=true;byId('status').textContent='キャンバスを準備しています。';
  try{
    surface?.destroy();controller=new EditorController(Number(byId<HTMLInputElement>('newCanvasWidth').value)||512,Number(byId<HTMLInputElement>('newCanvasHeight').value)||384);lastQueuedRevision=null;resetCheckpointTracking();surface=makeSurface();
    await initializeCurrentSurface(false);await persistence.initialize(controller,null,undefined,false);scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);
    const selection=surface?.backendSelection as {fallbackUsed?:boolean;selected?:string;webgpu?:{stage?:string;error?:string|null}}|null;
    byId('status').textContent=selection?.fallbackUsed?`描画できます。WebGPUは${selection.webgpu?.stage??'初期化'}で利用できなかったためWebGL2を使用しています。`:'描画できます。作業内容は自動的に保護されます。';
    updateQa();
  }catch(error){const message=surface?.initializationError||(error instanceof Error?error.message:String(error));updateQa();surface?.destroy();documentReady=false;byId('status').textContent='描画を開始できませんでした。'+message;}
  finally{byId<HTMLButtonElement>('new').disabled=false;}
};

byId<HTMLButtonElement>('addLayer').onclick=()=>{if(!surface)return;if(surface.busy||historyPending){byId('status').textContent='今の操作が終わってからレイヤーを追加してください。';return;}try{const id=controller.addRasterLayer(),layer=controller.document.root.getLayer(id);surface.syncLayerStack();surface.discardRedoProjection();queueLatestCommit();renderLayers();updateHistoryButtons();byId('status').textContent=`${layer.name}を追加して選択しました。`;updateQa();}catch{byId('status').textContent='レイヤーを追加できませんでした。';}};

byId<HTMLButtonElement>('addLayerPage').onclick=()=>byId<HTMLButtonElement>('addLayer').click();

async function performHistory(direction:'undo'|'redo'){
  if(!surface||surface.busy||historyPending||geometryBusy)return;const available=direction==='undo'?controller.canUndo:controller.canRedo;if(!available)return;
  historyPending=true;updateHistoryButtons();updateQa();let change:EditorHistoryChange|null=null;
  try{
    change=direction==='undo'?controller.undo():controller.redo();if(!change.changed)return;
    if(change.operations.some(op=>op.kind==='document.crop'||op.kind==='document.canvas-resize'||op.kind==='document.image-resize'))await reloadGeometryProjection();else await surface.syncHistory(change);if(direction==='undo')undoCount++;else redoCount++;
    renderLayers();persistence.noteNavigation(controller.document);noteCheckpointOperations(change.operations);byId('status').textContent=direction==='undo'?'ひとつ前の状態に戻しました。':'取り消した操作をやり直しました。';
  }catch{
    if(change?.changed){
      try{const rollback=direction==='undo'?controller.redo():controller.undo();if(rollback.changed){if(rollback.operations.some(op=>op.kind==='document.crop'||op.kind==='document.canvas-resize'||op.kind==='document.image-resize'))await reloadGeometryProjection();else await surface.syncHistory(rollback);}}catch{}
    }
    renderLayers();byId('status').textContent='Undo / Redoを安全に反映できなかったため、操作を戻しました。';
  }finally{historyPending=false;updateHistoryButtons();updateQa();}
}
function bindHistoryButton(id:string,direction:'undo'|'redo'){
  const button=byId<HTMLButtonElement>(id);
  // A real pointer press may land on the button's text <span>, not the
  // button node itself. Accept any descendant while rejecting genuine
  // outside-down / inside-up ghost clicks that can affect touch devices.
  button.onclick=e=>{
    const startedInside=lastPointerDownTarget instanceof Node&&button.contains(lastPointerDownTarget);
    if(e.detail>0&&!startedInside){blockedHistoryGhostClicks++;e.preventDefault();updateQa();return;}
    void performHistory(direction);
  };
}
bindHistoryButton('undo','undo');bindHistoryButton('compactUndo','undo');bindHistoryButton('redo','redo');bindHistoryButton('compactRedo','redo');

function isTextEditingTarget(target:EventTarget|null){if(!(target instanceof HTMLElement))return false;if(target.isContentEditable||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement)return true;if(target instanceof HTMLInputElement){return !['button','checkbox','radio','range','submit','reset'].includes(target.type);}return false;}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&e.defaultPrevented)return;
  if(isTextEditingTarget(e.target)||e.altKey)return;
  const primary=e.ctrlKey||e.metaKey;if(!primary)return;const key=e.key.toLowerCase();
  const undo=key==='z'&&!e.shiftKey,redo=(key==='z'&&e.shiftKey)||(key==='y'&&e.ctrlKey&&!e.metaKey);
  if(!undo&&!redo)return;const direction=undo?'undo':'redo',available=direction==='undo'?controller.canUndo:controller.canRedo;
  if(!surface||surface.busy||historyPending||!available)return;e.preventDefault();void performHistory(direction);
});

function selectPreset(id:string){if(!surface)return;surface.setEyedropper(false);surface.selectById(id);surface.setForegroundColor([foreground.current.r,foreground.current.g,foreground.current.b]);const erasing=surface.blendMode==='erase';selectedTool=erasing?'eraser':'brush';if(erasing)lastEraserPresetId=surface.brushId;else lastBrushPresetId=surface.brushId;lastDrawingTool=selectedTool;byId<HTMLSelectElement>('brush').value=surface.brushId;byId('erase').setAttribute('aria-pressed',String(erasing));byId('paint').setAttribute('aria-pressed',String(!erasing));syncPreset();reflectRailTool();byId('brushBoxSummary').textContent=(surface.brushName||selectedTool)+' · '+Math.round(surface.brushSize)+'px';}
byId<HTMLSelectElement>('brush').onchange=e=>selectPreset((e.target as HTMLSelectElement).value);for(const id of ['size','sizeNumber'])byId<HTMLInputElement>(id).oninput=e=>{if(!surface)return;const input=e.target as HTMLInputElement,value=Number(input.value);if(!input.validity.valid||input.value==='')return;surface.setSize(value);syncPreset();};
for(const [id,handler] of Object.entries({fitView:()=>surface?.fitView(),zoomOut:()=>surface?.zoomView(1/1.25),zoomIn:()=>surface?.zoomView(1.25),view100:()=>surface?.viewAt100(),actualPixels:()=>surface?.actualPixels(),resetRotation:()=>surface?.resetRotation(),flipH:()=>surface?.flipView('x'),flipV:()=>surface?.flipView('y')}))byId<HTMLButtonElement>(id).onclick=handler;
byId<HTMLInputElement>('zoomPercent').onchange=e=>{const n=Number((e.target as HTMLInputElement).value);surface?.setViewZoom(n/100);};
byId<HTMLInputElement>('angleDegree').onchange=e=>{const n=Number((e.target as HTMLInputElement).value);surface?.setViewRotation(n*Math.PI/180);};
byId<HTMLInputElement>('seamless').onchange=e=>surface?.setSeamless((e.target as HTMLInputElement).checked);
const referenceToggle=document.getElementById('referencePattern') as HTMLInputElement|null;if(referenceToggle)referenceToggle.onchange=()=>surface?.setReferencePattern(referenceToggle.checked);
byId<HTMLInputElement>('force').onchange=e=>{surface?.setForceFade((e.target as HTMLInputElement).checked);updateQa();};byId<HTMLInputElement>('finger').onchange=e=>{if(surface)surface.fingerDrawing=(e.target as HTMLInputElement).checked;};byId('erase').onclick=()=>selectPreset(lastEraserPresetId);byId('paint').onclick=()=>selectPreset(lastBrushPresetId);

byId<HTMLButtonElement>('open').onclick=()=>byId<HTMLInputElement>('openFile').click();
byId<HTMLInputElement>('openFile').onchange=async e=>{
  const input=e.target as HTMLInputElement,file=input.files?.[0];input.value='';if(!file)return;
  byId('status').textContent='作品ファイルを確認しています。';let opened:PortableOpenResult;
  try{opened=await persistence.decodePortable(new Uint8Array(await file.arrayBuffer()));}
  catch(error){byId('status').textContent='この作品ファイルは安全に読み込めませんでした。'+(error instanceof Error?error.message:String(error));updateQa();return;}
  byId('status').textContent='作品を表示しています。';
  try{await activateOpened(opened,false);byId('status').textContent='作品ファイルを開きました。自動保存を開始しました。';}
  catch(error){byId('status').textContent='作品ファイルは正常ですが、表示の復元に失敗しました。'+(error instanceof Error?error.message:String(error));}
  updateQa();
};
byId<HTMLButtonElement>('save').onclick=async()=>{
  if(!documentReady)return;byId('status').textContent='作品ファイルを作成しています。作業の自動保存とは別です。';
  try{const result=await persistence.save(controller.document,controller.selectedLayerId),size=formatFileSize(result.byteLength);byId('status').textContent='作品ファイルを保存しました（'+size+'）。自動保存状態には影響しません。';}
  catch(error){byId('status').textContent='作品ファイルを保存できませんでした。'+(error instanceof Error?error.message:String(error));}
  updateQa();
};
byId<HTMLButtonElement>('saveCopy').onclick=async()=>{
  if(!documentReady)return;
  try{await persistence.saveCopy(controller.document,controller.selectedLayerId);byId('status').textContent='別名の作品ファイルを保存しました。自動保存状態には影響しません。';}
  catch(error){byId('status').textContent='作品ファイルを別名保存できませんでした。'+(error instanceof Error?error.message:String(error));}
  updateQa();
};

const exportDialog=byId<HTMLDialogElement>('exportDialog'),exportFormat=byId<HTMLSelectElement>('exportFormat'),exportQuality=byId<HTMLInputElement>('exportQuality');
function updateExportOptions(){
  const f=exportFormat.value as ImageFormat,lossy=f!=='png';
  byId<HTMLLabelElement>('exportQualityRow').hidden=!lossy;
  byId<HTMLOutputElement>('exportQualityValue').textContent=exportQuality.value+'%';
  byId('exportTransparencyInfo').textContent=f==='jpeg'
    ?'JPEGは透明部分を保存できません。背景を白にして書き出します（黒にはしません）。'
    :f==='png'?'PNGは透明度を保ち、画像の色を劣化させずに保存します。':'WebPは透明度を保ち、画質を調整できます。';
}
exportFormat.onchange=updateExportOptions;exportQuality.oninput=updateExportOptions;updateExportOptions();
byId<HTMLButtonElement>('exportImage').onclick=()=>{
  if(!documentReady)return;
  byId('exportStatus').textContent='';
  exportDialog.showModal();
};
byId<HTMLButtonElement>('exportCancel').onclick=()=>{if(!exportBusy)exportDialog.close();};
byId<HTMLButtonElement>('exportRun').onclick=async()=>{
  if(exportBusy||!documentReady)return;
  const format=exportFormat.value as ImageFormat,quality=Number(exportQuality.value)/100;
  // The snapshot is captured synchronously: later brush transactions cannot enter it.
  let fixed:ReturnType<typeof captureExport>;
  try{fixed=captureExport(controller.document);}
  catch(error){byId('exportStatus').textContent=String(error instanceof Error?error.message:error);return;}
  const filename=exportFileName(fixed.name,format);
  exportBusy=true;exportError=null;byId<HTMLButtonElement>('exportRun').disabled=true;byId<HTMLButtonElement>('exportCancel').disabled=true;
  // A modal dialog would block canvas input during encoding; close it before heavy work.
  exportDialog.close();byId('status').textContent='画像を書き出しています。描画は続けられます。';
  byId('exportStatus').textContent='画像を書き出しています。描画は続けられます。';updateQa();
  try{
    const result=await exportImage(fixed,format,quality);
    // Download works on Android and on browsers without the File System Access API.
    const url=URL.createObjectURL(result.blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download=filename;anchor.hidden=true;document.body.append(anchor);anchor.click();anchor.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    const {blob,...evidence}=result;lastExport={...evidence,downloadBytes:blob.size};exportCount++;
    byId('exportStatus').textContent=filename+' を作成しました（'+result.width+'×'+result.height+'ピクセル、'+formatFileSize(blob.size)+'）。作品ファイルの保存状態は変わりません。';
    byId('status').textContent='画像を書き出しました（'+result.width+'×'+result.height+'ピクセル、'+formatFileSize(blob.size)+'）。引き続き描画できます。';
  }catch(error){
    exportError=error instanceof Error?error.message:String(error);
    byId('exportStatus').textContent='画像を書き出せませんでした。'+exportError;
    byId('status').textContent='書き出しに失敗しました。作品は変更されていません。';
  }finally{
    exportBusy=false;byId<HTMLButtonElement>('exportRun').disabled=false;byId<HTMLButtonElement>('exportCancel').disabled=false;updateQa();
  }
};

byId<HTMLButtonElement>('recover').onclick=async()=>{
  const candidate=recoveryCandidates.find(item=>BigInt(item.protectedThrough)>0n);if(!candidate)return;byId('status').textContent='作業途中の状態を確認しています。';
  try{
    const recovered=await persistence.recover(candidate),opened={document:recovered.document,selectedLayerId:recovered.selectedLayerId,preserved:{manifestExtras:{},optionalSections:[]},generationId:'recovery',snapshotRevisionId:recovered.document.head,...(recovered.projectionCache?{projectionCache:recovered.projectionCache}:{})} as PortableOpenResult;
    await activateOpened(opened,true);recoveryCandidates=[];byId('status').textContent='自動保存された最新の作業状態へ戻しました。';
  }catch(error){byId('status').textContent='作業途中の状態を戻せませんでした。'+(error instanceof Error?error.message:String(error));}
  updatePersistenceDisplay();updateQa();
};
async function refreshRecoveryCandidates(){
  try{const values=await persistence.listRecoveryCandidates();recoveryCandidates=values;updatePersistenceDisplay();if(recoveryCandidates.some(candidate=>BigInt(candidate.protectedThrough)>0n)&&!documentReady)byId('status').textContent='自動保存から戻せる作業があります。';}catch{}
}
void refreshRecoveryCandidates();
if('serviceWorker' in navigator){const build=encodeURIComponent(import.meta.env.VITE_COMMIT_SHA??'dev');void navigator.serviceWorker.register('./sw.js?build='+build,{scope:'./'}).catch(()=>{});}

if(qaMode){
  const out=byId<HTMLPreElement>('qaGpuReport');
  byId<HTMLButtonElement>('qaDiagInitial').onclick=async()=>{
    out.textContent='GPUの状態を確認しています…';
    try{out.textContent=JSON.stringify(await surface?.inspectRendering(),null,2);}
    catch(e){out.textContent='診断失敗: '+String(e);}
  };
  byId<HTMLButtonElement>('qaDiagCopy').onclick=async()=>{
    const result={commit:(import.meta.env.VITE_COMMIT_SHA??'unknown'),
      gpu:await surface?.inspectRendering(),qa:JSON.parse(byId('qaAuto').textContent||'{}')};
    const txt=JSON.stringify(result,null,2);out.textContent=txt;
    try{await navigator.clipboard.writeText(txt);byId('qaDiagCopy').textContent='診断結果をコピーしました';}
    catch{byId('qaDiagCopy').textContent='下の結果を長押ししてコピーしてください';}
  };
}
if(qaMode){const state=byId<HTMLSelectElement>('qaState'),noteLabel=byId<HTMLLabelElement>('qaNoteLabel'),note=byId<HTMLTextAreaElement>('qaNote');const sync=()=>{const problem=state.value==='problem';noteLabel.hidden=!problem;note.disabled=!problem;updateQa();};state.onchange=sync;sync();byId<HTMLButtonElement>('qaCopy').onclick=async()=>{const result={result:state.value,note:state.value==='problem'?note.value:'',automatic:JSON.parse(byId('qaAuto').textContent||'{}')};try{await navigator.clipboard.writeText(JSON.stringify(result,null,2));byId('qaCopy').textContent='コピーしました';}catch{byId('qaCopy').textContent='コピーできませんでした';}};}
updateHistoryButtons();updatePersistenceDisplay();updateQa();addEventListener('resize',updateQa);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&documentReady){if(projectionCheckpointTimer!==null)clearTimeout(projectionCheckpointTimer);projectionCheckpointTimer=null;void createProjectionCheckpoint();}});addEventListener('pagehide',()=>{if(projectionCheckpointTimer!==null)clearTimeout(projectionCheckpointTimer);surface?.destroy();});

function formatFileSize(bytes:number){if(!Number.isFinite(bytes)||bytes<0)return 'サイズ不明';if(bytes<1024)return Math.round(bytes)+' B';if(bytes<1024*1024)return (bytes/1024).toFixed(bytes<10*1024?1:0)+' KB';return (bytes/(1024*1024)).toFixed(bytes<10*1024*1024?1:0)+' MB';}
function qaM09Markup(){return '<details id="qaPanel" class="qa-panel" open><summary>色の選択と保存の確認</summary><ol>'+[
'色の輪から自然に色を選べるか',
'明るさや鮮やかさを細かく調整しやすいか',
'数字を入れて正確な色にできるか',
'選んだ色ですぐ描けるか',
'スポイトでキャンバス上の色を正しく取れるか',
'最近使った色へすぐ戻れるか',
'パレットへ色を保存しやすいか',
'パレットの色を並べ替え・削除できるか',
'パレットを保存してもう一度読み込めるか',
'ペンや指で使いやすいか',
'色を操作中もキャンバスが重くならないか',
'今までの描画とキャンバス操作が壊れていないか',
'結果を「問題なし」または「問題あり」から選んでください'
].map(x=>'<li>'+x+'</li>').join('')+'</ol><details class="qa-auto"><summary>問題の調査用</summary><button id="qaDiagInitial" type="button">状態を記録する</button><button id="qaDiagCopy" type="button">結果をコピーする</button><pre id="qaGpuReport"></pre></details><label>結果<select id="qaState"><option value="unchecked">まだ確認していない</option><option value="ok">問題なし</option><option value="problem">問題あり</option></select></label><label id="qaNoteLabel">気になったこと<textarea id="qaNote" rows="3"></textarea></label><button id="qaCopy" type="button">確認結果をコピー</button><details class="qa-auto"><summary>詳しい動作記録</summary><pre id="qaAuto"></pre></details></details>';}
function qaM08Markup(){return '<details id="qaPanel" class="qa-panel" open><summary>キャンバスの操作と画質の確認</summary><ol>'+[
'指で用紙を動かしても、白い四角形だけが元の場所に残らないか',
'2本指で用紙を拡大・縮小して、用紙の枠と絵がずれないか',
'2本指で用紙を回して、枠と絵が一緒に回るか',
'左右・上下反転で、用紙の枠と絵がずれないか',
'100%表示で、線や細かい模様がぼやけないか',
'拡大・縮小・回転を繰り返しても、画質が不自然に崩れないか',
'描いている途中と、ペンを離した後で線の見た目が変わりすぎないか',
'右の作業欄を閉じても、描いた線がすぐ表示されるか',
'切り抜きで、作品の表示範囲が正しく変わるか',
'キャンバスのサイズ変更で、絵が勝手に引き伸ばされないか',
'画像のサイズ変更で、絵も指定した大きさに変わるか',
'端がつながるモードで、上下左右の境界をまたいで描けるか',
'元に戻す・やり直すが正常に動くか',
'保存して開き直しても、絵と変更内容が残っているか',
'2000〜3000pxの大きな作品でも操作が重くならないか',
'Androidなどの高密度画面でも線が粗く見えないか',
'問題なし、または問題ありを選んでください'
].map(x=>'<li>'+x+'</li>').join('')+'</ol><label class="checkbox-line"><input id="referencePattern" type="checkbox"> 画質確認用の細かい模様を表示（作品には影響しません）</label><details class="qa-auto"><summary>問題の調査用</summary><button id="qaDiagInitial" type="button">状態を記録する</button><button id="qaDiagCopy" type="button">結果をコピーする</button><pre id="qaGpuReport"></pre></details><label>結果<select id="qaState"><option value="unchecked">まだ確認していない</option><option value="ok">問題なし</option><option value="problem">問題あり</option></select></label><label id="qaNoteLabel">気になったこと<textarea id="qaNote" rows="3"></textarea></label><button id="qaCopy" type="button">確認結果をコピー</button><details class="qa-auto"><summary>詳しい動作記録</summary><pre id="qaAuto"></pre></details></details>';}
function qaMarkup(){return '<details id="qaPanel" class="qa-panel" open><summary>使いやすさと描画の確認</summary><ol>'+
['左のツール欄は見やすいですか？','ブラシと消しゴムをすぐ切り替えられますか？','右側が邪魔にならず描けますか？','右側の幅を簡単に変えられますか？','レイヤーボタンからレイヤー画面を開けますか？','その画面を開いたままでも描けますか？','元に戻す・やり直しはすぐ使えますか？','保存と画像書き出しへ迷わず行けますか？','ペンや指でボタンを押しやすいですか？','明るい見た目で制作に集中できますか？','右側を開閉しても描画が止まりませんか？','重くなっていませんか？'].map(x=>'<li>'+x+'</li>').join('')+
'</ol><details class="qa-auto"><summary>問題があるときの動作確認</summary><button id="qaDiagInitial" type="button">状態を記録する</button><button id="qaDiagCopy" type="button">結果をコピーする</button><pre id="qaGpuReport"></pre></details><label>結果<select id="qaState"><option value="unchecked">まだ確認していない</option><option value="ok">問題なし</option><option value="problem">問題あり</option></select></label><label id="qaNoteLabel">気になったこと<textarea id="qaNote" rows="3" placeholder="具体的に教えてください"></textarea></label><button id="qaCopy" type="button">確認結果をコピー</button><details class="qa-auto"><summary>詳しい動作記録</summary><pre id="qaAuto"></pre></details></details>';}
