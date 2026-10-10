import './style.css';
import './ui/shell.css';
import './ui/aurora.css';
import {shellMarkup} from './ui/shell';
import {installShellUi} from './ui/shellBehavior';
import {EditorController,type EditorHistoryChange} from './controller';
import {BrushSurface} from './brushSurface';
import {captureExport,exportImage,exportFileName,type ImageFormat,type ImageExportResult} from './export/basicExport';
import {PersistenceCoordinator,type Candidate,type PersistenceState} from './persistence/coordinator';
import type {PortableOpenResult} from './persistence/portable';
import type {SemanticOperation} from '@illustro/core';

const qaPath=location.pathname.replace(/\/+$/,'');
const qaMode=new URLSearchParams(location.search).get('qa')==='1'||qaPath.endsWith('/qa/m05')||qaPath.endsWith('/qa/m05/index.html')||qaPath.endsWith('/qa/m06')||qaPath.endsWith('/qa/m06/index.html')||qaPath.endsWith('/qa/m07')||qaPath.endsWith('/qa/m07/index.html');
const qaStartedAt=new Date().toISOString();
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=shellMarkup(qaMode,qaMode?qaMarkup():'');

const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
let controller=new EditorController();
let surface:BrushSurface|null=null,historyPending=false,undoCount=0,redoCount=0,blockedHistoryGhostClicks=0,lastPointerDownTarget:EventTarget|null=null,selectedTool:'brush'|'eraser'='brush',lastBrushPresetId='foundation-g-pen',lastEraserPresetId='foundation-hard-eraser',documentReady=false,lastQueuedRevision:string|null=null,recoveryCandidates:readonly Candidate[]=[];
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
  const data={milestone:'M07',commit:(import.meta.env.VITE_COMMIT_SHA??'unknown'),backend:surface?.backend??'未取得',backendSelection:surface?.backendSelection??null,initializationError:surface?.initializationError??null,viewport:`${innerWidth}x${innerHeight}`,userAgent:navigator.userAgent,
    selectedTool,selectedPresetId:surface?.brushId??'未選択',selectedPresetName:surface?.brushName??'未選択',blendMode:surface?.blendMode??'normal',eraserType:surface?.eraserType,size:surface?.brushSize??0,
    layerCount:controller.layers.length,selectedLayerId:controller.selectedLayerId,selectedLayerName:selected.name,currentRevision:controller.document.head,canUndo:controller.canUndo,canRedo:controller.canRedo,
    undoCount,redoCount,blockedHistoryGhostClicks,eraserCommittedStrokeCount:controller.committedEraserStrokeCount,totalStrokeCount:controller.committedStrokeCount,committedStrokeCount:controller.committedStrokeCount,historyPatchHits:surface?.historyPatchHits??0,historyReplayFallbacks:surface?.historyReplayFallbacks??0,rendererDesynchronized:surface?.rendererDesynchronized??false,rendererAlpha:surface?.rendererAlpha??false,rendererPremultipliedAlpha:surface?.rendererPremultipliedAlpha??false,rendererArtworkAlpha:surface?.rendererArtworkAlpha??false,presentationOpaque:surface?.presentationOpaque??false,presentationMode:surface?.presentationMode??'未取得',presentationAlpha:surface?.presentationAlpha??null,presentationDesynchronized:surface?.presentationDesynchronized??null,presentationFrames:surface?.presentationFrames??0,presentationLastAt:surface?.presentationLastAt??0,projectionRestoreMs:surface?.projectionRestoreMs??0,projectionRestoreMode:surface?.projectionRestoreMode??'none',projectionCacheRevision:surface?.projectionCacheRevision??null,browserPredictionSamples:surface?.browserPredictionSamples??0,
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
function makeSurface(backendOverride:'webgl2'|'webgpu'|null=null){return new BrushSurface(byId('canvas'),controller,text=>{byId('status').textContent=text;},()=>{queueLatestCommit();renderLayers();updateHistoryButtons();updateQa();},()=>{updateHistoryButtons();updateQa();},backendOverride);}
surface=makeSurface();
const shellUi=installShellUi(),workspace=shellUi.workspace;

function syncPreset(){if(!surface?.preset)return;byId<HTMLInputElement>('size').value=String(surface.preset.size);byId<HTMLInputElement>('sizeNumber').value=String(surface.preset.size);byId<HTMLInputElement>('force').checked=surface.preset.forceFade?.enabled??false;updateQa();}
async function initializeCurrentSurface(replay:boolean,projectionCache?:PortableOpenResult['projectionCache']){
  if(!surface)throw new Error('描画面がありません。');
  await surface.initialize();
  const select=byId<HTMLSelectElement>('brush');select.replaceChildren();surface.brushes.forEach(p=>select.add(new Option(p.name,p.id)));
  lastBrushPresetId=surface.brushes.find(p=>p.blend!=='erase')?.id??surface.brushes[0]?.id??lastBrushPresetId;
  lastEraserPresetId=surface.brushes.find(p=>p.id==='foundation-hard-eraser')?.id??surface.brushes.find(p=>p.blend==='erase')?.id??lastEraserPresetId;
  selectPreset(lastBrushPresetId);
  if(replay)await surface.restoreDocumentProjection(projectionCache);
  for(const id of ['brush','size','sizeNumber','force','addLayer','addLayerPage','save','saveCopy','exportImage'])(byId(id) as HTMLInputElement).disabled=false;
  syncPreset();renderLayers();updateHistoryButtons();documentReady=true;
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
    if(documentReady){surface?.destroy();controller=new EditorController();lastQueuedRevision=null;resetCheckpointTracking();surface=makeSurface();}else resetCheckpointTracking();
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
  if(!surface||surface.busy||historyPending)return;const available=direction==='undo'?controller.canUndo:controller.canRedo;if(!available)return;
  historyPending=true;updateHistoryButtons();updateQa();let change:EditorHistoryChange|null=null;
  try{
    change=direction==='undo'?controller.undo():controller.redo();if(!change.changed)return;
    await surface.syncHistory(change);if(direction==='undo')undoCount++;else redoCount++;
    renderLayers();persistence.noteNavigation(controller.document);noteCheckpointOperations(change.operations);byId('status').textContent=direction==='undo'?'ひとつ前の状態に戻しました。':'取り消した操作をやり直しました。';
  }catch{
    if(change?.changed){
      try{const rollback=direction==='undo'?controller.redo():controller.undo();if(rollback.changed)await surface.syncHistory(rollback);}catch{}
    }
    renderLayers();byId('status').textContent='Undo / Redoを安全に反映できなかったため、操作を戻しました。';
  }finally{historyPending=false;updateHistoryButtons();updateQa();}
}
function bindHistoryButton(id:string,direction:'undo'|'redo'){
  const button=byId<HTMLButtonElement>(id);
  button.onclick=e=>{if(e.detail>0&&lastPointerDownTarget!==button){blockedHistoryGhostClicks++;e.preventDefault();updateQa();return;}void performHistory(direction);};
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

function selectPreset(id:string){if(!surface)return;surface.selectById(id);const erasing=surface.blendMode==='erase';selectedTool=erasing?'eraser':'brush';if(erasing)lastEraserPresetId=surface.brushId;else lastBrushPresetId=surface.brushId;byId<HTMLSelectElement>('brush').value=surface.brushId;byId('erase').setAttribute('aria-pressed',String(erasing));byId('paint').setAttribute('aria-pressed',String(!erasing));syncPreset();byId('brushBoxSummary').textContent=(surface.brushName||selectedTool)+' · '+Math.round(surface.brushSize)+'px';}
byId<HTMLSelectElement>('brush').onchange=e=>selectPreset((e.target as HTMLSelectElement).value);for(const id of ['size','sizeNumber'])byId<HTMLInputElement>(id).oninput=e=>{if(!surface)return;const input=e.target as HTMLInputElement,value=Number(input.value);if(!input.validity.valid||input.value==='')return;surface.setSize(value);syncPreset();};
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
function qaMarkup(){return '<details id="qaPanel" class="qa-panel" open><summary>使いやすさと描画の確認</summary><ol>'+
['左のツール欄は見やすいですか？','ブラシと消しゴムをすぐ切り替えられますか？','右側が邪魔にならず描けますか？','右側の幅を簡単に変えられますか？','レイヤーボタンからレイヤー画面を開けますか？','その画面を開いたままでも描けますか？','元に戻す・やり直しはすぐ使えますか？','保存と画像書き出しへ迷わず行けますか？','ペンや指でボタンを押しやすいですか？','明るい見た目で制作に集中できますか？','右側を開閉しても描画が止まりませんか？','重くなっていませんか？'].map(x=>'<li>'+x+'</li>').join('')+
'</ol><details class="qa-auto"><summary>問題があるときの動作確認</summary><button id="qaDiagInitial" type="button">状態を記録する</button><button id="qaDiagCopy" type="button">結果をコピーする</button><pre id="qaGpuReport"></pre></details><label>結果<select id="qaState"><option value="unchecked">まだ確認していない</option><option value="ok">問題なし</option><option value="problem">問題あり</option></select></label><label id="qaNoteLabel">気になったこと<textarea id="qaNote" rows="3" placeholder="具体的に教えてください"></textarea></label><button id="qaCopy" type="button">確認結果をコピー</button><details class="qa-auto"><summary>詳しい動作記録</summary><pre id="qaAuto"></pre></details></details>';}
