import {namedSnapshot,type WorkEntry} from './persistence/workLibrary';
import './style.css';
import './ui/shell.css';
import './ui/aurora.css';
import './ui/home.css';
import {installHomeShell,type HomeShell} from './ui/homeShell';
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
import {CoreDocument,type SemanticOperation} from '@illustro/core';

const perfMode=new URLSearchParams(location.search).has('perf')||location.pathname.includes('/qa/perf-canvas/')||location.pathname.includes('/qa/perf-stroke-handoff/');
const qaPath=location.pathname.replace(/\/+$/,'');
const m09Mode=new URLSearchParams(location.search).has('m09')||qaPath.endsWith('/qa/m09')||qaPath.endsWith('/qa/m09/index.html');
const m08Mode=m09Mode||new URLSearchParams(location.search).has('m08')||qaPath.endsWith('/qa/m08')||qaPath.endsWith('/qa/m08/index.html');
const qaMode=new URLSearchParams(location.search).get('qa')==='1'||qaPath.endsWith('/qa/m05')||qaPath.endsWith('/qa/m05/index.html')||qaPath.endsWith('/qa/m06')||qaPath.endsWith('/qa/m06/index.html')||qaPath.endsWith('/qa/m07')||qaPath.endsWith('/qa/m07/index.html')||m08Mode;
const qaStartedAt=new Date().toISOString();
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=shellMarkup(qaMode,qaMode?(m09Mode?qaM09Markup():m08Mode?qaM08Markup():qaMarkup()):'');
// In M08 the GPU canvas is the entire interaction viewport, not a fixed paper rectangle.
if(m08Mode)document.body.classList.add('m08-canvas-viewport');
if(m08Mode||!qaMode)document.body.classList.add('canvas-viewport');

const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
let controller=new EditorController();
const foreground=new ForegroundColor();
let eyedropperOriginal=foreground.current;
let surface:BrushSurface|null=null,historyPending=false,undoCount=0,redoCount=0,blockedHistoryGhostClicks=0,lastPointerDownTarget:EventTarget|null=null,selectedTool:'brush'|'eraser'|'eyedropper'='brush',lastDrawingTool:'brush'|'eraser'='brush',lastBrushPresetId='foundation-g-pen',lastEraserPresetId='foundation-hard-eraser',documentReady=false,lastQueuedRevision:string|null=null,recoveryCandidates:readonly Candidate[]=[];
const CHECKPOINT_OPERATION_INTERVAL=12,CHECKPOINT_IDLE_MS=800;
let projectionCheckpointTimer:number|null=null,projectionCheckpointBusy=false,checkpointOpsSinceLast=0,checkpointNeedsFullSeed=true,lastCheckpointAt:number|null=null;
let checkpointOperations:SemanticOperation[]=[];let checkpointCancelled=0;const checkpointErrors:Array<{at:string;message:string}>=[];let qaRefreshTimer:number|null=null;
function scheduleQaRefresh(){if(qaRefreshTimer!==null)return;qaRefreshTimer=window.setTimeout(()=>{qaRefreshTimer=null;updateQa();},250);}
let persistenceState:PersistenceState|null=null;
let lastExport:(Omit<ImageExportResult,'blob'>&{downloadBytes:number})|null=null,exportError:string|null=null,exportBusy=false,exportCount=0;
const persistence=new PersistenceCoordinator(state=>{persistenceState=state;surface?.setProtectionQueueLength(state.queueLength);updatePersistenceDisplay();if(state.storageError&&typeof homeUi!=='undefined')showStorageError(new Error(state.storageError));updateQa();});
let homeUi:HomeShell|null=null;let works:WorkEntry[]=[],lastWorkId:string|null=null,workSwitchBusy=false,librarySaving=false;
let thumbnailTimer:number|null=null,thumbnailInProgress=false;

document.body.dataset.appMode=qaMode?'qa':'production';if(!qaMode){const retry=document.createElement('button');retry.type='button';retry.textContent='保存を再試行';retry.id='retryWorkSave';retry.onclick=()=>{void persistence.retry().then(()=>{byId('status').textContent='アプリ内に保存しました。';updatePersistenceDisplay();}).catch(showStorageError);};byId('saveState').after(retry);}
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
        try{controller.selectLayer(layer.id);if(!qaMode)void persistence.selectWorkLayer(layer.id).catch(showStorageError);renderLayers();byId('status').textContent=layer.name+'を選びました。次の線はこのレイヤーに入ります。';updateHistoryButtons();updateQa();}
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
  const ready=!!surface,blocked=!ready||historyPending||surface?.inputActive===true;
  byId<HTMLButtonElement>('undo').disabled=blocked||!(controller.canUndo||surface?.hasPendingStrokes);
  byId<HTMLButtonElement>('compactUndo').disabled=blocked||!(controller.canUndo||surface?.hasPendingStrokes);
  byId<HTMLButtonElement>('redo').disabled=blocked||!controller.canRedo;
  byId<HTMLButtonElement>('compactRedo').disabled=blocked||!controller.canRedo;
  for(const button of historyButtons())button.setAttribute('aria-busy',String(historyPending));
}
function updatePersistenceDisplay(){
  const state=persistenceState,indicator=byId('saveState');
  if(!state){indicator.textContent='自動保存準備中';return;}
  indicator.textContent=state.storageError?'保存できません・再試行してください':state.protectionPending||state.queueLength>0?'アプリ内に保存中':qaMode?'自動保存済み':documentReady?'アプリ内に保存済み':'作品はまだ開かれていません';
  const retry=document.getElementById('retryWorkSave');if(retry)retry.hidden=!state.storageError;
  indicator.dataset.autosavePending=String(state.protectionPending||state.queueLength>0);indicator.dataset.saving=String(state.saving||librarySaving);indicator.dataset.protectedThrough=state.protectedThrough;
  const homeSaveState=document.getElementById('ihHomeSaveState');
  if(homeSaveState){
    const pending=state.protectionPending||state.queueLength>0;
    homeSaveState.hidden=!documentReady||(!pending&&!state.storageError);
    homeSaveState.textContent=state.storageError?'保存できませんでした。開いているキャンバスに戻り、保存を再試行してください。':'作品を安全に保存しています。完了するまではこのページを閉じないでください。';
  }
  byId<HTMLButtonElement>('recover').disabled=!recoveryCandidates.some(candidate=>BigInt(candidate.protectedThrough)>0n);
}

document.addEventListener('pointerdown',e=>{lastPointerDownTarget=e.target;},{capture:true});
if(qaMode){document.addEventListener('pointerdown',e=>{const canvas=byId<HTMLCanvasElement>('canvas'),target=e.target instanceof HTMLElement?e.target:null;canvas.dataset.lastPointerTarget=target?.id||target?.tagName.toLowerCase()||'unknown';canvas.dataset.lastPointerType=e.pointerType;canvas.dataset.lastPointerX=String(Math.round(e.clientX));canvas.dataset.lastPointerY=String(Math.round(e.clientY));queueMicrotask(updateQa);},{capture:true});}
const updateQa=()=>{
  const canvas=byId<HTMLCanvasElement>('canvas'),selected=controller.selectedLayer;
  canvas.dataset.commit=import.meta.env.VITE_COMMIT_SHA??'unknown';canvas.dataset.documentId=controller.document.root.documentId;canvas.dataset.documentName=controller.document.root.name;canvas.dataset.documentWidth=String(controller.document.root.width);canvas.dataset.documentHeight=String(controller.document.root.height);canvas.dataset.backend=surface?.backend??'';canvas.dataset.view=JSON.stringify(surface?.viewState??null);canvas.dataset.committedStrokes=String(controller.committedStrokeCount);canvas.dataset.revisionId=controller.document.head;canvas.dataset.dirtyTiles=String(controller.lastCommit?.dirtyTileCount??0);
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
    export:{last:lastExport,error:exportError,busy:exportBusy,count:exportCount},layers:controller.layers.map(layer=>({id:layer.id,surfaceId:layer.surface.descriptor.surfaceId,name:layer.name,committedStrokes:controller.strokeCountForLayer(layer.id)})),documentId:controller.document.root.documentId,documentMetadata:controller.document.root.metadata,writerEpoch:controller.document.writerEpochId,commitSequence:controller.document.commitSequence.toString(),persistence:persistenceState,autosaveCheckpoint:{operationInterval:CHECKPOINT_OPERATION_INTERVAL,idleMs:CHECKPOINT_IDLE_MS,opsSinceLast:checkpointOpsSinceLast,fullSeedPending:checkpointNeedsFullSeed,lastCheckpointAt,cancelled:checkpointCancelled,errors:checkpointErrors},qaStartedAt};
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
  if(surface.interacting){scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);return;}
  const activeSurface=surface,revisionId=controller.document.head,operations=checkpointOperations.slice(),fullSeed=checkpointNeedsFullSeed;projectionCheckpointBusy=true;
  try{
    const delta=await activeSurface.captureProjectionDelta(revisionId,fullSeed?undefined:operations);
    if(surface===activeSurface&&controller.document.head===revisionId&&!activeSurface.busy&&await persistence.storeProjectionDelta(delta)&&surface===activeSurface){
      checkpointOperations.splice(0,operations.length);checkpointOpsSinceLast=checkpointOperations.length;checkpointNeedsFullSeed=false;lastCheckpointAt=Date.now();
    }
  }catch(error){const message=error instanceof Error?error.message:String(error);if(message.includes('stale'))checkpointCancelled++;else{checkpointErrors.push({at:new Date().toISOString(),message});if(checkpointErrors.length>12)checkpointErrors.shift();}}finally{
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
function makeSurface(backendOverride:'webgl2'|'webgpu'|null=null){return new BrushSurface(byId('canvas'),controller,text=>{byId('status').textContent=text;},()=>{queueLatestCommit();renderLayers();updateHistoryButtons();updateQa();},reason=>{updateViewControls();redrawCrop();if(reason==='view'){scheduleQaRefresh();return;}updateHistoryButtons();updateQa();},backendOverride,(rgba,phase,point)=>{
 if(phase==='cancel'){byId('colorSampleLoupe').hidden=true;foreground.cancel();return;}
 if(!rgba||rgba.length<4||rgba[3]===0){if(phase==='commit'){foreground.cancel();byId('status').textContent='透明な場所からは色を取得できません。';restoreDrawingTool();}return;}
 const alpha=(rgba[3]??0)/255,fromComposite=(byId<HTMLSelectElement>('colorSampleSource').value!=='layer');
 const channels=rgba.slice(0,3).map(v=>Math.min(1,Math.max(0,v/255)));
 // Composite surfaces store premultiplied alpha; restore the displayed RGB at translucent edges.
 const color=rgb(...(fromComposite&&alpha>0&&alpha<1?channels.map(v=>Math.min(1,v/alpha)):channels) as [number,number,number]);
 if(phase==='preview'){
  foreground.begin();foreground.preview(color);
  if(point&&surface){const loupe=byId<HTMLElement>('colorSampleLoupe'),box=byId<HTMLCanvasElement>('canvas').getBoundingClientRect(),screen=surface.documentToScreen(point);
   byId<HTMLElement>('colorSampledSwatch').style.backgroundColor=hex(color);
   byId<HTMLElement>('colorBeforeSwatch').style.backgroundColor=hex(eyedropperOriginal);
   byId('colorSampleCode').textContent=hex(color);
   loupe.style.left=Math.max(8,Math.min(innerWidth-150,box.left+screen.x-72))+'px';
   loupe.style.top=Math.max(8,Math.min(innerHeight-110,box.top+screen.y-116))+'px';
   loupe.hidden=false;}
 }
 else{byId('colorSampleLoupe').hidden=true;foreground.begin();foreground.commit(color);byId('status').textContent='キャンバスから '+hex(foreground.current)+' を取得しました。';restoreDrawingTool();}
 });}
surface=makeSurface();
function updateViewControls(){const state=surface?.viewState;if(!state)return;
  const zoom=byId<HTMLInputElement>('zoomPercent'),zoomValue=String(Math.round(state.zoom*1000)/10);if(zoom.value!==zoomValue)zoom.value=zoomValue;
  const angle=byId<HTMLInputElement>('angleDegree'),angleValue=String(Math.round(state.rotation*180/Math.PI*10)/10);if(angle.value!==angleValue)angle.value=angleValue;
  for(const [id,on] of [['flipH',state.flipX],['flipV',state.flipY]] as const){const button=byId<HTMLButtonElement>(id),value=String(on);if(button.getAttribute('aria-pressed')!==value)button.setAttribute('aria-pressed',value);}
  const tile=byId<HTMLInputElement>('seamless');if(tile)tile.checked=state.seamless;
}
const shellUi=installShellUi(),workspace=shellUi.workspace;
const colorPanel=installColorPanel(foreground,{onPickTool:()=>activateEyedropper(),onBrushColor:()=>surface?.setForegroundColor([foreground.current.r,foreground.current.g,foreground.current.b])});
function reflectRailTool(){for(const [id,active] of [['paint',selectedTool==='brush'],['erase',selectedTool==='eraser'],['eyedropper',selectedTool==='eyedropper']] as const)byId(id).setAttribute('aria-pressed',String(active));}
function activateEyedropper(){if(!surface||!documentReady)return;if(selectedTool!=='eyedropper')lastDrawingTool=selectedTool==='eraser'?'eraser':'brush';eyedropperOriginal=foreground.current;selectedTool='eyedropper';surface.setEyedropper(true,byId<HTMLSelectElement>('colorSampleSource').value as 'composite'|'layer');reflectRailTool();byId('status').textContent='キャンバスに触れて、取りたい色を選んでください。';updateQa();}
function restoreDrawingTool(){if(!surface)return;byId('colorSampleLoupe').hidden=true;surface.setEyedropper(false);selectPreset(lastDrawingTool==='eraser'?lastEraserPresetId:lastBrushPresetId);updateQa();}
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
async function activateOpened(opened:PortableOpenResult,recovered=false,expectedEpoch:string|null=null){
  const previous=controller,previousPreserved=persistence.preservedData,wasReady=documentReady;documentReady=false;
  try{
  surface?.destroy();controller=EditorController.restored(opened.document,opened.selectedLayerId);lastQueuedRevision=null;resetCheckpointTracking();surface=makeSurface();
  try{await initializeCurrentSurface(true,opened.projectionCache);}
  catch(error){
    const requested=new URLSearchParams(location.search).get('backend'),selection=surface?.backendSelection as {selected?:string}|null;
    if(requested!=='webgpu'&&requested!=='webgl2'&&selection?.selected==='webgpu'){
      surface?.destroy();surface=makeSurface('webgl2');await initializeCurrentSurface(true,opened.projectionCache);
    }else throw error;
  }
  persistence.clearFileDestination();await persistence.initialize(controller,null,opened.preserved,recovered);if(!qaMode)await persistence.bindWork(expectedEpoch);scheduleProjectionCheckpoint(CHECKPOINT_IDLE_MS);updatePersistenceDisplay();updateQa();
  }catch(error){
    surface?.destroy();const snapshot=previous.document.capturePersistenceSnapshot();controller=EditorController.restored(CoreDocument.restore({snapshot,blockPayloads:previous.document.persistenceBlockPayloads(snapshot)}),previous.selectedLayerId);surface=makeSurface();documentReady=false;
    if(wasReady){try{await initializeCurrentSurface(true);await persistence.initialize(controller,null,previousPreserved,false);const current=(await persistence.listWorks()).works.find(x=>x.documentId===controller.document.root.documentId);if(!qaMode)await persistence.bindWork(current?.writerEpochId??null);}catch{}}
    throw error;
  }
}
async function createDocument(width:number,height:number,name='新しい作品',background:'transparent'|'white'='transparent'):Promise<boolean>{
  const trigger=byId<HTMLButtonElement>('new');
  if(trigger.disabled)return false;
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>8192||height>8192){
    byId('status').textContent='幅と高さを1〜8192pxで指定してください。';return false;
  }
  if(!qaMode&&!(await prepareWorkSwitch()))return false;
  trigger.disabled=true;byId('status').textContent='キャンバスを準備しています。';
  try{
    const document=new CoreDocument({width,height,name:name.trim()||'新しい作品'});let selected=document.root.rootLayerIds[0]!;
    if(background==='white'){
      const pixels=new Uint8Array(width*height*4);pixels.fill(255);const tx=document.begin('白い背景');
      tx.resizeDocument(width,height,'document.canvas-resize',new Map([[selected,pixels]]),{});tx.renameLayer(selected,'背景');tx.commit();
      const next=document.addRasterLayerAbove(selected);selected=next.layerId;
    }
    await activateOpened({document,selectedLayerId:selected,preserved:{manifestExtras:{},optionalSections:[]},generationId:'new',snapshotRevisionId:document.head});
    if(!qaMode){void storeBlankThumbnail(document.root.documentId,document.head,width,height,background);void refreshWorks();}
    const selection=surface?.backendSelection as {fallbackUsed?:boolean;selected?:string;webgpu?:{stage?:string;error?:string|null}}|null;
    byId('status').textContent=selection?.fallbackUsed?'描画できます。WebGPUを使えなかったためWebGL2に切り替えました。':'描画できます。作業内容は自動的に保護されます。';
    updateQa();return true;
  }catch(error){
    const message=surface?.initializationError||(error instanceof Error?error.message:String(error));
    updateQa();surface?.destroy();documentReady=false;byId('status').textContent='描画を開始できませんでした。'+message;return false;
  }finally{trigger.disabled=false;}
}
byId<HTMLButtonElement>('new').onclick=()=>{
  if(homeUi&&!qaMode){homeUi.showNew();return;}
  void createDocument(Number(byId<HTMLInputElement>('newCanvasWidth').value)||512,Number(byId<HTMLInputElement>('newCanvasHeight').value)||384);
};
byId<HTMLButtonElement>('addLayer').onclick=()=>{if(!surface)return;if(surface.busy||historyPending){byId('status').textContent='今の操作が終わってからレイヤーを追加してください。';return;}try{const id=controller.addRasterLayer(),layer=controller.document.root.getLayer(id);surface.syncLayerStack();surface.discardRedoProjection();queueLatestCommit();renderLayers();updateHistoryButtons();byId('status').textContent=`${layer.name}を追加して選択しました。`;updateQa();}catch{byId('status').textContent='レイヤーを追加できませんでした。';}};

byId<HTMLButtonElement>('addLayerPage').onclick=()=>byId<HTMLButtonElement>('addLayer').click();

async function performHistory(direction:'undo'|'redo'){
  if(!surface||surface.inputActive||historyPending||geometryBusy)return;const available=direction==='undo'?(controller.canUndo||surface.hasPendingStrokes):controller.canRedo;if(!available)return;
  historyPending=true;surface.setInputBarrier(true);updateHistoryButtons();updateQa();let change:EditorHistoryChange|null=null;
  try{
    await surface.settleStrokes();change=direction==='undo'?controller.undo():controller.redo();if(!change.changed)return;
    if(change.operations.some(op=>op.kind==='document.crop'||op.kind==='document.canvas-resize'||op.kind==='document.image-resize'))await reloadGeometryProjection();else await surface.syncHistory(change);if(direction==='undo')undoCount++;else redoCount++;
    renderLayers();persistence.noteNavigation(controller.document);noteCheckpointOperations(change.operations);byId('status').textContent=direction==='undo'?'ひとつ前の状態に戻しました。':'取り消した操作をやり直しました。';
  }catch{
    if(change?.changed){
      try{const rollback=direction==='undo'?controller.redo():controller.undo();if(rollback.changed){if(rollback.operations.some(op=>op.kind==='document.crop'||op.kind==='document.canvas-resize'||op.kind==='document.image-resize'))await reloadGeometryProjection();else await surface.syncHistory(rollback);}}catch{}
    }
    renderLayers();byId('status').textContent='Undo / Redoを安全に反映できなかったため、操作を戻しました。';
  }finally{surface?.setInputBarrier(false);historyPending=false;updateHistoryButtons();updateQa();}
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
  if(!undo&&!redo)return;const direction=undo?'undo':'redo',available=direction==='undo'?(controller.canUndo||surface?.hasPendingStrokes):controller.canRedo;
  if(!surface||surface.inputActive||historyPending||!available)return;e.preventDefault();void performHistory(direction);
});

function selectPreset(id:string){if(!surface)return;surface.setEyedropper(false);surface.selectById(id);surface.setForegroundColor([foreground.current.r,foreground.current.g,foreground.current.b]);const erasing=surface.blendMode==='erase';selectedTool=erasing?'eraser':'brush';if(erasing)lastEraserPresetId=surface.brushId;else lastBrushPresetId=surface.brushId;lastDrawingTool=selectedTool;byId<HTMLSelectElement>('brush').value=surface.brushId;byId('erase').setAttribute('aria-pressed',String(erasing));byId('paint').setAttribute('aria-pressed',String(!erasing));syncPreset();reflectRailTool();byId('brushBoxSummary').textContent=(surface.brushName||selectedTool)+' · '+Math.round(surface.brushSize)+'px';}
byId<HTMLSelectElement>('brush').onchange=e=>selectPreset((e.target as HTMLSelectElement).value);for(const id of ['size','sizeNumber'])byId<HTMLInputElement>(id).oninput=e=>{if(!surface)return;const input=e.target as HTMLInputElement,value=Number(input.value);if(!input.validity.valid||input.value==='')return;surface.setSize(value);syncPreset();};
for(const [id,handler] of Object.entries({fitView:()=>surface?.fitView(),zoomOut:()=>surface?.zoomView(1/1.25),zoomIn:()=>surface?.zoomView(1.25),view100:()=>surface?.viewAt100(),actualPixels:()=>surface?.actualPixels(),resetRotation:()=>surface?.resetRotation(),flipH:()=>surface?.flipView('x'),flipV:()=>surface?.flipView('y')}))byId<HTMLButtonElement>(id).onclick=handler;
byId<HTMLInputElement>('zoomPercent').onchange=e=>{const n=Number((e.target as HTMLInputElement).value);surface?.setViewZoom(n/100);};
byId<HTMLInputElement>('angleDegree').onchange=e=>{const n=Number((e.target as HTMLInputElement).value);surface?.setViewRotation(n*Math.PI/180);};
byId<HTMLInputElement>('seamless').onchange=e=>surface?.setSeamless((e.target as HTMLInputElement).checked);
const referenceToggle=document.getElementById('referencePattern') as HTMLInputElement|null;if(referenceToggle)referenceToggle.onchange=()=>surface?.setReferencePattern(referenceToggle.checked);
byId<HTMLInputElement>('force').onchange=e=>{surface?.setForceFade((e.target as HTMLInputElement).checked);updateQa();};byId<HTMLInputElement>('finger').onchange=e=>{if(surface)surface.fingerDrawing=(e.target as HTMLInputElement).checked;};byId('erase').onclick=()=>selectPreset(lastEraserPresetId);byId('paint').onclick=()=>selectPreset(lastBrushPresetId);

byId<HTMLButtonElement>('open').onclick=()=>{if(homeUi&&!qaMode){homeUi.showNew('file');return;}byId<HTMLInputElement>('openFile').click();};
byId<HTMLInputElement>('openFile').onchange=async e=>{
  const input=e.target as HTMLInputElement,file=input.files?.[0];input.value='';if(!file)return;
  byId('status').textContent='作品ファイルを確認しています。';let opened:PortableOpenResult;
  try{opened=await persistence.decodePortable(new Uint8Array(await file.arrayBuffer()));}
  catch(error){const message='この作品ファイルは安全に読み込めませんでした。'+(error instanceof Error?error.message:String(error));byId('status').textContent=message;homeUi?.notify(message);updateQa();return;}
  byId('status').textContent='作品を表示しています。';
  try{
    if(!qaMode){
      if(!(await prepareWorkSwitch()))return;
      const same=(await persistence.listWorks()).works.find(x=>x.documentId===opened.document.root.documentId);
      if(same){
        if(same.revisionId===opened.document.head){await openWork(same.documentId);homeUi?.notify('登録済みの同じ作品を開きました。');return;}
        if(!confirm('同じ識別番号の作品が既にあります。読み込むファイルを別の作品として追加しますか？\n既存の作品は残ります。'))return;
        opened=copyOpened(opened,opened.document.root.name+'（読み込み）');
      }
    }
    await activateOpened(opened,false);if(!qaMode){await createWorkThumbnail();await refreshWorks();}byId('status').textContent='作品ファイルを開きました。自動保存を開始しました。';homeUi?.showEditor();}
  catch(error){const message='作品ファイルは正常ですが、表示の復元に失敗しました。'+(error instanceof Error?error.message:String(error));byId('status').textContent=message;homeUi?.notify(message);}
  updateQa();
};
byId<HTMLButtonElement>('save').onclick=async()=>{
  if(!documentReady)return;byId('status').textContent='作品ファイルを作成しています。作業の自動保存とは別です。';
  try{await surface?.settleLogicalStrokes();const result=await persistence.save(controller.document,controller.selectedLayerId),size=formatFileSize(result.byteLength);byId('status').textContent='作品ファイルを保存しました（'+size+'）。自動保存状態には影響しません。';}
  catch(error){byId('status').textContent='作品ファイルを保存できませんでした。'+(error instanceof Error?error.message:String(error));}
  updateQa();
};
byId<HTMLButtonElement>('saveCopy').onclick=async()=>{
  if(!documentReady)return;
  try{await surface?.settleLogicalStrokes();await persistence.saveCopy(controller.document,controller.selectedLayerId);byId('status').textContent='別名の作品ファイルを保存しました。自動保存状態には影響しません。';}
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

async function recoverCandidate(candidate:Candidate):Promise<boolean>{
  byId('status').textContent='作業途中の状態を確認しています。';
  try{
    const recovered=await persistence.recover(candidate),opened={document:recovered.document,selectedLayerId:recovered.selectedLayerId,preserved:{manifestExtras:{},optionalSections:[]},generationId:'recovery',snapshotRevisionId:recovered.document.head,...(recovered.projectionCache?{projectionCache:recovered.projectionCache}:{})} as PortableOpenResult;
    const existing=!qaMode?(await persistence.listWorks()).works.find(x=>x.documentId===opened.document.root.documentId):null;await activateOpened(opened,true,existing?.writerEpochId??null);if(!qaMode)await refreshWorks();recoveryCandidates=[];byId('status').textContent=qaMode?'自動保存された最新の作業状態へ戻しました。':'選択した作業状態へ戻しました。';
    updatePersistenceDisplay();updateQa();return true;
  }catch(error){
    const message='作業途中の状態を戻せませんでした。'+(error instanceof Error?error.message:String(error));
    byId('status').textContent=message;homeUi?.notify(message);updatePersistenceDisplay();updateQa();return false;
  }
}
byId<HTMLButtonElement>('recover').onclick=()=>{
  if(homeUi&&!qaMode){homeUi.showRecovery();return;}
  const candidate=recoveryCandidates.find(item=>BigInt(item.protectedThrough)>0n);
  if(candidate)void recoverCandidate(candidate);
};
async function refreshRecoveryCandidates(){
  try{const values=await persistence.listRecoveryCandidates();recoveryCandidates=values;updatePersistenceDisplay();homeUi?.setRecoveryCandidates(values);if(recoveryCandidates.some(candidate=>BigInt(candidate.protectedThrough)>0n)&&!documentReady)byId('status').textContent='自動保存から戻せる作業があります。';}catch{}
}
function showStorageError(error:unknown){const text='アプリ内に保存できませんでした。'+(error instanceof Error?error.message:String(error));byId('status').textContent=text;homeUi?.notify(text);}
async function refreshWorks(){try{const result=await persistence.listWorks();works=result.works;lastWorkId=result.lastWorkId;homeUi?.setWorks(works,lastWorkId);}catch(error){showStorageError(error);}}
function copyOpened(opened:PortableOpenResult,name:string):PortableOpenResult{
  const snapshot=opened.document.capturePersistenceSnapshot(),document=CoreDocument.restore({snapshot:namedSnapshot(snapshot,name,crypto.randomUUID()),blockPayloads:opened.document.persistenceBlockPayloads(snapshot)});
  return {...opened,document,snapshotRevisionId:document.head,generationId:'copy'};
}
// A new blank work needs no expensive full-resolution GPU readback.
async function storeBlankThumbnail(documentId:string,revisionId:string,width:number,height:number,background:'transparent'|'white'){
  const scale=Math.min(1,320/width,240/height),preview=new OffscreenCanvas(Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale)));
  if(background==='white'){const context=preview.getContext('2d')!;context.fillStyle='#ffffff';context.fillRect(0,0,preview.width,preview.height);}
  try{await persistence.storeThumbnail(documentId,revisionId,await preview.convertToBlob({type:'image/png'}));}
  catch(error){console.warn('Initial thumbnail deferred:',error);}
}
async function createWorkThumbnail(){
  if(qaMode||!documentReady||!surface||surface.busy)return;
  const active=surface,doc=controller.document,revision=doc.head,documentId=doc.root.documentId;
  if(works.some(work=>work.documentId===documentId&&work.thumbnail&&work.thumbnailRevision===revision))return;
  const blob=await active.captureWorkThumbnail();
  if(surface===active&&controller.document===doc&&doc.head===revision)await persistence.storeThumbnail(documentId,revision,blob);
}
// Thumbnail updates are best-effort background work, never part of opening or leaving an artwork.
function scheduleWorkThumbnail(){
  if(qaMode||!documentReady||!surface)return;
  if(thumbnailTimer!==null)clearTimeout(thumbnailTimer);
  thumbnailTimer=window.setTimeout(()=>{
    thumbnailTimer=null;
    const run=async()=>{
      if(!app.inert||thumbnailInProgress||!documentReady||!surface||surface.busy)return;
      thumbnailInProgress=true;
      try{await createWorkThumbnail();await refreshWorks();}
      catch(error){console.warn('Thumbnail update deferred:',error);}
      finally{thumbnailInProgress=false;}
    };
    const idle=(window as Window&{requestIdleCallback?:(callback:()=>void,options?:{timeout:number})=>number}).requestIdleCallback;
    if(idle)idle(()=>{void run();},{timeout:1500});else void run();
  },120);
}
async function prepareWorkSwitch(){
  if(!documentReady)return true;
  if(persistence.state.saving){homeUi?.notify('作品ファイルの保存が終わってから切り替えてください。描画は続けられます。');return false;}
  if(surface?.busy||historyPending||geometryBusy){homeUi?.notify('描いている線や操作が終わってから切り替えてください。');return false;}
  const wasInert=app.inert;app.inert=true;
  try{librarySaving=true;await persistence.barrier();return true;}
  catch(error){showStorageError(error);return false;}finally{app.inert=wasInert;librarySaving=false;updatePersistenceDisplay();}
}
async function openWork(id:string):Promise<boolean>{
  if(workSwitchBusy)return false;workSwitchBusy=true;
  try{if(documentReady&&controller.document.root.documentId===id){homeUi?.showEditor();return true;}
    if(!(await prepareWorkSwitch()))return false;
    const loaded=await persistence.loadWork(id);await activateOpened(loaded.opened,false,loaded.entry.writerEpochId);await refreshWorks();homeUi?.showEditor();
    if(loaded.fallback)homeUi?.notify('最新の保存を読み込めなかったため、前の正常な保存から開きました。');return true;
  }catch(error){showStorageError(error);return false;}finally{workSwitchBusy=false;}
}
if(!qaMode){
  // The editor is inert while Home is active. Keep the native file picker outside
  // that subtree so a genuine Home button press may open the OS picker.
  document.body.append(byId<HTMLInputElement>('openFile'));
  homeUi=installHomeShell(app,{
    createDocument,
    openFile:()=>byId<HTMLInputElement>('openFile').click(),
    resume:async(documentId,writerEpochId)=>{
      if(!(await prepareWorkSwitch()))return false;
      const candidate=recoveryCandidates.find(item=>item.documentId===documentId&&item.writerEpochId===writerEpochId);
      return candidate?recoverCandidate(candidate):false;
    },
    prepareHome:async()=>{scheduleWorkThumbnail();void refreshWorks();
      // Start durable protection after the Home screen has had a chance to paint.
      window.setTimeout(()=>{void persistence.barrier().then(refreshWorks).catch(showStorageError);},40);
      return true;},
    listWorks:async()=>{const result=await persistence.listWorks();works=result.works;lastWorkId=result.lastWorkId;return {works,lastWorkId};},
    openWork,
    renameWork:async(id,name)=>{await persistence.renameWork(id,name);if(documentReady&&controller.document.root.documentId===id){await prepareWorkSwitch();const loaded=await persistence.loadWork(id);await activateOpened(loaded.opened,false,loaded.entry.writerEpochId);}await refreshWorks();},
    duplicateWork:async(id)=>{if(!(await prepareWorkSwitch()))throw new Error('現在の作品を保存できませんでした。');const loaded=await persistence.loadWork(id),copy=copyOpened(loaded.opened,loaded.entry.name+' のコピー');await activateOpened(copy);await refreshWorks();},
    deleteWork:async(id)=>{await persistence.deleteWork(id);if(documentReady&&controller.document.root.documentId===id){surface?.destroy();surface=null;documentReady=false;resetCheckpointTracking();}await refreshWorks();},
    hasDocument:()=>documentReady,
  });
  byId<HTMLButtonElement>('home').onclick=()=>{void homeUi?.showHome();};
}
void refreshRecoveryCandidates();if(!qaMode)void refreshWorks();
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
function qaM09Markup(){return '<p class="qa-m09-full-app"><a id="m09FullApp" href="./app/">ホーム画面・マイ作品も確認する →</a></p>'+'<details id="qaPanel" class="qa-panel" open><summary>色の選択と保存の確認</summary><ol>'+[
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

// Review-only performance controls: native disclosure + checkbox, no normal UI changes.
if(perfMode){
 (window as unknown as {__illustroPerformance:unknown}).__illustroPerformance={
  read:()=>({commit:import.meta.env.VITE_COMMIT_SHA,revision:controller.document.head,strokes:controller.committedStrokeCount,...surface?.performanceDiagnostics,checkpointErrors}),
  probe:()=>surface?.handoffProbe(),
  checkpoint:(fullSeed=false)=>{if(fullSeed)checkpointNeedsFullSeed=true;return createProjectionCheckpoint();},
  capture:async()=>{if(!surface)throw new Error('No document');const before=surface.performanceDiagnostics,delta=await surface.captureProjectionDelta(controller.document.head),after=surface.performanceDiagnostics;return {replace:delta.replace,tiles:delta.tiles.length,bytes:delta.tiles.reduce((n,t)=>n+t.pixels.byteLength,0),before,after};},
  view:(zoom:number,angle:number)=>{surface?.setViewZoom(zoom,false);surface?.setViewRotation(angle,false);},
 };
 const panel=document.createElement('details');panel.id='canvasPerformance';panel.style.cssText='position:fixed;left:80px;bottom:20px;z-index:80;max-width:min(420px,calc(100vw - 100px));max-height:45vh;overflow:auto;background:#fffaf0;color:#302c26;border:1px solid #decba4;border-radius:12px;padding:8px 12px;font-size:12px';
 panel.innerHTML='<summary>キャンバスの軽さを確認</summary><p>実機確認用の検証版です。性能合格は未判定です。</p><label style="display:block;padding:8px 0"><input id="performanceEnabled" type="checkbox"> 動作の測定を表示する</label><p>数値はGPUへの表示要求を測った目安です。画面そのものの更新や指から光までの時間は未測定です。</p><output id="performanceReadout" style="white-space:pre-wrap"></output><details id="performanceRawDetails"><summary>詳しい動作記録</summary><pre id="performanceRaw"></pre></details><p><a href="../../m09/" target="_blank" rel="noopener">改善前のM09を開く</a> · <a href="../evidence/qa-status.json" target="_blank" rel="noopener">検査結果と未確認事項</a></p>';
 document.body.append(panel);const enabled=byId<HTMLInputElement>('performanceEnabled');
 enabled.onchange=()=>{surface?.setPerformanceEnabled(enabled.checked);byId('performanceReadout').textContent='';};
 window.setInterval(()=>{if(!enabled.checked)return;surface?.setPerformanceEnabled(true);const data=surface?.performanceDiagnostics,metrics=data as Record<string,unknown>|undefined;
  // Enable only on transition; the history window must survive refreshes.
  const value=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(1):'未測定';
  byId('performanceReadout').textContent='次の入力まで：'+value(data?.handoff.traces.at(-1)?.readyMs)+' ms\n正式確定まで：'+value(data?.handoff.traces.at(-1)?.logicalMs)+' ms\n処理待ち：'+((data?.handoff.pendingLogical??0)+(data?.handoff.pendingGpu??0))+' 筆\n入力の制限：'+(data?.handoff.rejected??0)+' 回\n表示要求：'+value(metrics?.submissionFps)+' 回/秒\n反映までの目安：'+value(metrics?.inputToPreviewSubmitP95Ms)+' ms\n遅い側の表示間隔：'+value(metrics?.frameIntervalP95Ms)+' ms\nGPU完了待ちの目安：'+value(metrics?.queueCompletionProxyMs)+' ms\n画像の読み出し：'+value(data?.checkpoint.lastMs)+' ms\nGPUの処理時間：未測定';
  if(byId<HTMLDetailsElement>('performanceRawDetails').open)byId('performanceRaw').textContent=JSON.stringify({backend:surface?.backend,...data,checkpointErrors},null,2);
 },500);
}
