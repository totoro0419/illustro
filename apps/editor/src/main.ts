import './style.css';
import {EditorController,type EditorHistoryChange} from './controller';
import {BrushSurface} from './brushSurface';
import {PersistenceCoordinator,type Candidate,type PersistenceState} from './persistence/coordinator';
import type {PortableOpenResult} from './persistence/portable';

const qaPath=location.pathname.replace(/\/+$/,'');
const qaMode=new URLSearchParams(location.search).get('qa')==='1'||qaPath.endsWith('/qa/m05')||qaPath.endsWith('/qa/m05/index.html');
const qaStartedAt=new Date().toISOString();
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header><strong>Illustro</strong><button disabled title="ホーム画面は準備中">Home</button><button id="save" disabled>保存</button><button id="open" type="button">開く</button><span id="saveState">未保存</span><span>${qaMode?'M05 実機確認':'描画確認用'}</span></header>
<nav class="rail" aria-label="メインツール">
  <button id="paint" aria-pressed="true">ブラシ</button><button id="erase" aria-pressed="false">消しゴム</button>
  <button disabled>ぼかし</button><button disabled>スポイト</button><button disabled>塗り</button><button disabled>選択</button><button disabled>変形</button><button disabled>移動</button>
  <button id="colorPage" class="compact-only">色</button><button id="brushPage" class="compact-only">設定</button><button id="layersPage" class="compact-only">レイヤー</button>
  <button disabled class="all">全機能</button>
</nav>
<main><p id="status" role="status">新規キャンバスを開くか、保存した作品を開いてください。</p><div class="document-actions"><button id="new">新規キャンバス</button><button id="reloadSaved" type="button" disabled>保存版を開き直す</button><button id="recover" type="button" disabled>作業途中から戻す</button><button id="saveCopy" type="button" disabled>別名保存</button><input id="openFile" type="file" accept=".illustro,application/octet-stream" hidden></div><div class="surface"><canvas id="canvas" aria-label="描画キャンバス" data-committed-strokes="0"></canvas></div></main>
<div id="splitter" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Workspaceの幅" aria-valuemin="240" aria-valuemax="440" aria-valuenow="344"></div>
<aside id="workspace" aria-label="Workspace"><button id="close" class="compact-only">閉じる</button>
  ${qaMode?qaMarkup():''}
  <details open id="layersBox"><summary>レイヤー</summary><div id="layerList" class="layer-list" aria-label="レイヤー一覧"></div><button id="addLayer" type="button" disabled>レイヤー追加</button></details>
  <details open id="colorBox"><summary>カラー</summary><p>カラー調整は準備中です。</p></details>
  <details open id="brushBox"><summary>ブラシ</summary><label>種類<select id="brush" disabled></select></label>
    <label>太さ<input id="size" type="range" min="0.1" max="1024" step="0.1" value="16" disabled></label>
    <label>太さの数値<input id="sizeNumber" type="number" min="0.1" max="1024" step="0.1" value="16" disabled></label>
    <label><input id="force" type="checkbox" disabled>強制入り抜き</label><label><input id="finger" type="checkbox">指で描く</label>
  </details>
  ${['プロパティ','資料','素材','効果','ナビゲーター','履歴','自動化','文書','Workspace設定'].map(name=>`<details><summary>${name}</summary><p>準備中</p></details>`).join('')}
  <label class="width-control">Workspaceの幅<input id="width" type="range" min="240" max="440" value="344"></label>
  <div class="commands"><button id="layer">レイヤー</button><button id="undo" disabled title="元に戻す">Undo</button><button id="redo" disabled title="やり直す">Redo</button><button disabled>左右反転</button><button disabled>上下反転</button></div>
</aside>
<div class="compact-only bottom"><button id="compactUndo" disabled title="元に戻す">Undo</button><button id="compactRedo" disabled title="やり直す">Redo</button><button id="drawer" aria-controls="workspace" aria-expanded="false">Workspace</button></div>`;

const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
let controller=new EditorController();
let surface:BrushSurface|null=null,historyPending=false,undoCount=0,redoCount=0,blockedHistoryGhostClicks=0,lastPointerDownTarget:EventTarget|null=null,selectedTool:'brush'|'eraser'='brush',lastBrushPresetId='foundation-g-pen',lastEraserPresetId='foundation-hard-eraser',documentReady=false,lastQueuedRevision:string|null=null,recoveryCandidates:readonly Candidate[]=[];
let projectionCheckpointTimer:number|null=null,projectionCheckpointBusy=false;
let persistenceState:PersistenceState|null=null;
const persistence=new PersistenceCoordinator(state=>{persistenceState=state;updatePersistenceDisplay();updateQa();});
const historyButtons=()=>[byId<HTMLButtonElement>('undo'),byId<HTMLButtonElement>('redo'),byId<HTMLButtonElement>('compactUndo'),byId<HTMLButtonElement>('compactRedo')];

const renderLayers=()=>{
  const list=byId<HTMLDivElement>('layerList');const rows=[...controller.layers].reverse();list.replaceChildren(...rows.map(layer=>{
    const selected=layer.id===controller.selectedLayerId,row=document.createElement('button'),name=document.createElement('span'),state=document.createElement('span');
    row.type='button';row.className='layer-row';row.dataset.layerId=layer.id;row.setAttribute('aria-pressed',String(selected));row.setAttribute('aria-label',`${layer.name}${selected?'、選択中':''}`);
    name.className='layer-name';name.textContent=layer.name;state.className='layer-state';state.textContent=selected?'選択中':'';
    row.append(name,state);row.onclick=()=>{try{controller.selectLayer(layer.id);renderLayers();byId('status').textContent=`${layer.name}を選びました。次の線はこのレイヤーに入ります。`;updateHistoryButtons();updateQa();}catch{byId('status').textContent='そのレイヤーを選択できませんでした。';}};return row;
  }));
};

function updateHistoryButtons(){
  const ready=!!surface,blocked=!ready||historyPending||surface?.busy===true;
  byId<HTMLButtonElement>('undo').disabled=blocked||!controller.canUndo;
  byId<HTMLButtonElement>('compactUndo').disabled=blocked||!controller.canUndo;
  byId<HTMLButtonElement>('redo').disabled=blocked||!controller.canRedo;
  byId<HTMLButtonElement>('compactRedo').disabled=blocked||!controller.canRedo;
  for(const button of historyButtons())button.setAttribute('aria-busy',String(historyPending));
}
function persistedSaveCandidate(){
  const candidates=recoveryCandidates.filter(candidate=>candidate.lastGood||candidate.previousGood);
  if(!documentReady)return candidates[0]??null;
  const state=persistenceState;if(!state?.savedRevision)return null;
  return candidates.find(candidate=>candidate.documentId===controller.document.root.documentId&&candidate.savedRevisionId===state.savedRevision)??null;
}
function updatePersistenceDisplay(){
  const state=persistenceState,indicator=byId('saveState');
  if(!state){indicator.textContent='未保存';return;}
  indicator.textContent=state.saving?'保存中':state.storageError?'保護エラー':state.dirty?(state.savedRevision?'保存後の変更あり':'未保存'):'保存済み';
  indicator.dataset.dirty=String(state.dirty);indicator.dataset.saving=String(state.saving);indicator.dataset.protectedThrough=state.protectedThrough;
  byId<HTMLButtonElement>('reloadSaved').disabled=!state.lastGood&&!persistedSaveCandidate();
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
  const data={milestone:'M05',commit:(import.meta.env.VITE_COMMIT_SHA??'unknown'),backend:surface?.backend??'未取得',backendSelection:surface?.backendSelection??null,initializationError:surface?.initializationError??null,viewport:`${innerWidth}x${innerHeight}`,userAgent:navigator.userAgent,
    selectedTool,selectedPresetId:surface?.brushId??'未選択',selectedPresetName:surface?.brushName??'未選択',blendMode:surface?.blendMode??'normal',eraserType:surface?.eraserType,size:surface?.brushSize??0,
    layerCount:controller.layers.length,selectedLayerId:controller.selectedLayerId,selectedLayerName:selected.name,currentRevision:controller.document.head,canUndo:controller.canUndo,canRedo:controller.canRedo,
    undoCount,redoCount,blockedHistoryGhostClicks,eraserCommittedStrokeCount:controller.committedEraserStrokeCount,totalStrokeCount:controller.committedStrokeCount,committedStrokeCount:controller.committedStrokeCount,historyPatchHits:surface?.historyPatchHits??0,historyReplayFallbacks:surface?.historyReplayFallbacks??0,rendererDesynchronized:surface?.rendererDesynchronized??false,rendererAlpha:surface?.rendererAlpha??false,rendererPremultipliedAlpha:surface?.rendererPremultipliedAlpha??false,rendererArtworkAlpha:surface?.rendererArtworkAlpha??false,presentationOpaque:surface?.presentationOpaque??false,presentationMode:surface?.presentationMode??'未取得',presentationAlpha:surface?.presentationAlpha??null,presentationDesynchronized:surface?.presentationDesynchronized??null,presentationFrames:surface?.presentationFrames??0,presentationLastAt:surface?.presentationLastAt??0,projectionRestoreMs:surface?.projectionRestoreMs??0,projectionRestoreMode:surface?.projectionRestoreMode??'none',projectionCacheRevision:surface?.projectionCacheRevision??null,browserPredictionSamples:surface?.browserPredictionSamples??0,
    lastInputTarget:canvas.dataset.lastPointerTarget??'まだ入力なし',lastInputType:canvas.dataset.lastPointerType??'—',lastInputPoint:canvas.dataset.lastPointerX&&canvas.dataset.lastPointerY?`${canvas.dataset.lastPointerX},${canvas.dataset.lastPointerY}`:'—',
    activeElement:document.activeElement instanceof HTMLElement?(document.activeElement.id||document.activeElement.tagName.toLowerCase()):'unknown',workspaceOpen:workspace.classList.contains('open'),workspaceDisplay:getComputedStyle(workspace).display,
    visualViewport:window.visualViewport?{width:Math.round(window.visualViewport.width),height:Math.round(window.visualViewport.height),offsetTop:Math.round(window.visualViewport.offsetTop),offsetLeft:Math.round(window.visualViewport.offsetLeft),scale:window.visualViewport.scale}:null,
    layers:controller.layers.map(layer=>({id:layer.id,surfaceId:layer.surface.descriptor.surfaceId,name:layer.name,committedStrokes:controller.strokeCountForLayer(layer.id)})),documentId:controller.document.root.documentId,documentMetadata:controller.document.root.metadata,writerEpoch:controller.document.writerEpochId,commitSequence:controller.document.commitSequence.toString(),persistence:persistenceState,qaStartedAt};
  byId('qaAuto').textContent=JSON.stringify(data,null,2);
};
renderLayers();

function scheduleProjectionCheckpoint(delay=700){
  if(projectionCheckpointTimer!==null)clearTimeout(projectionCheckpointTimer);
  projectionCheckpointTimer=window.setTimeout(()=>{projectionCheckpointTimer=null;void createProjectionCheckpoint();},delay);
}
async function createProjectionCheckpoint(){
  if(projectionCheckpointBusy||!surface||!documentReady){if(documentReady)scheduleProjectionCheckpoint(900);return;}
  if(surface.busy){scheduleProjectionCheckpoint(900);return;}
  const activeSurface=surface,revisionId=controller.document.head;projectionCheckpointBusy=true;
  try{
    const cache=await activeSurface.captureProjectionCache(revisionId);
    if(surface===activeSurface&&controller.document.head===revisionId&&!activeSurface.busy)await persistence.storeProjectionCheckpoint(cache);
  }catch{}finally{
    projectionCheckpointBusy=false;
    if(surface===activeSurface&&controller.document.head!==revisionId)scheduleProjectionCheckpoint(900);
  }
}
function queueLatestCommit(){const handoff=controller.lastPersistenceHandoff;if(!handoff||handoff.resultRevisionId===lastQueuedRevision)return;lastQueuedRevision=handoff.resultRevisionId;persistence.noteCommit(controller.document,handoff);scheduleProjectionCheckpoint();}
function makeSurface(backendOverride:'webgl2'|'webgpu'|null=null){return new BrushSurface(byId('canvas'),controller,text=>{byId('status').textContent=text;},()=>{queueLatestCommit();renderLayers();updateHistoryButtons();updateQa();},()=>{updateHistoryButtons();updateQa();},backendOverride);}
surface=makeSurface();const workspace=byId('workspace'),drawer=byId<HTMLButtonElement>('drawer'),compactWorkspace=matchMedia('(max-width:760px)');
function syncWorkspaceState(){const open=workspace.classList.contains('open'),hidden=compactWorkspace.matches&&!open;drawer.setAttribute('aria-expanded',String(open));workspace.inert=hidden;workspace.setAttribute('aria-hidden',String(hidden));}
function openBox(id:string){workspace.classList.add('open');syncWorkspaceState();const box=byId<HTMLDetailsElement>(id);box.open=true;box.scrollIntoView({block:'nearest'});}
byId('layer').onclick=()=>openBox('layersBox');byId('layersPage').onclick=()=>openBox('layersBox');byId('colorPage').onclick=()=>openBox('colorBox');byId('brushPage').onclick=()=>openBox('brushBox');
drawer.onclick=()=>{workspace.classList.toggle('open');syncWorkspaceState();};
function close(restoreKeyboardFocus=false){workspace.classList.remove('open');syncWorkspaceState();const active=document.activeElement;if(active instanceof HTMLElement&&workspace.contains(active))active.blur();if(restoreKeyboardFocus)drawer.focus({preventScroll:true});}
byId('close').onclick=e=>close(e.detail===0);compactWorkspace.addEventListener('change',syncWorkspaceState);syncWorkspaceState();

function setWidth(value:number){const width=Math.max(240,Math.min(440,value));document.documentElement.style.setProperty('--workspace',`${width}px`);byId<HTMLInputElement>('width').value=String(width);byId('splitter').setAttribute('aria-valuenow',String(width));}
byId<HTMLInputElement>('width').oninput=e=>setWidth(Number((e.target as HTMLInputElement).value));const splitter=byId('splitter');let resizePointer:number|null=null;
splitter.onpointerdown=e=>{resizePointer=e.pointerId;splitter.setPointerCapture(e.pointerId);e.preventDefault();};splitter.onpointermove=e=>{if(e.pointerId===resizePointer)setWidth(innerWidth-e.clientX);};splitter.onpointerup=splitter.onpointercancel=()=>{resizePointer=null;};
splitter.onkeydown=e=>{const current=Number(splitter.getAttribute('aria-valuenow'));if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setWidth(current+(e.key==='ArrowLeft'?10:-10));}};

function syncPreset(){if(!surface?.preset)return;byId<HTMLInputElement>('size').value=String(surface.preset.size);byId<HTMLInputElement>('sizeNumber').value=String(surface.preset.size);byId<HTMLInputElement>('force').checked=surface.preset.forceFade?.enabled??false;updateQa();}
async function initializeCurrentSurface(replay:boolean,projectionCache?:PortableOpenResult['projectionCache']){
  if(!surface)throw new Error('描画面がありません。');
  await surface.initialize();
  const select=byId<HTMLSelectElement>('brush');select.replaceChildren();surface.brushes.forEach(p=>select.add(new Option(p.name,p.id)));
  lastBrushPresetId=surface.brushes.find(p=>p.blend!=='erase')?.id??surface.brushes[0]?.id??lastBrushPresetId;
  lastEraserPresetId=surface.brushes.find(p=>p.id==='foundation-hard-eraser')?.id??surface.brushes.find(p=>p.blend==='erase')?.id??lastEraserPresetId;
  selectPreset(lastBrushPresetId);
  if(replay)await surface.restoreDocumentProjection(projectionCache);
  for(const id of ['brush','size','sizeNumber','force','addLayer','save','saveCopy'])(byId(id) as HTMLInputElement).disabled=false;
  syncPreset();renderLayers();updateHistoryButtons();documentReady=true;
}
async function activateOpened(opened:PortableOpenResult,recovered=false,savedRevision=opened.snapshotRevisionId){
  surface?.destroy();controller=EditorController.restored(opened.document,opened.selectedLayerId);lastQueuedRevision=null;surface=makeSurface();
  try{await initializeCurrentSurface(true,opened.projectionCache);}
  catch(error){
    const requested=new URLSearchParams(location.search).get('backend'),selection=surface?.backendSelection as {selected?:string}|null;
    if(requested!=='webgpu'&&requested!=='webgl2'&&selection?.selected==='webgpu'){
      surface?.destroy();surface=makeSurface('webgl2');await initializeCurrentSurface(true,opened.projectionCache);
    }else throw error;
  }
  await persistence.initialize(controller,savedRevision,opened.preserved,recovered);scheduleProjectionCheckpoint(1000);updatePersistenceDisplay();updateQa();
}
byId<HTMLButtonElement>('new').onclick=async()=>{
  byId<HTMLButtonElement>('new').disabled=true;byId('status').textContent='キャンバスを準備しています。';
  try{
    if(documentReady){surface?.destroy();controller=new EditorController();lastQueuedRevision=null;surface=makeSurface();}
    await initializeCurrentSurface(false);await persistence.initialize(controller,null,undefined,false);
    const selection=surface?.backendSelection as {fallbackUsed?:boolean;selected?:string;webgpu?:{stage?:string;error?:string|null}}|null;
    byId('status').textContent=selection?.fallbackUsed?`描画できます。WebGPUは${selection.webgpu?.stage??'初期化'}で利用できなかったためWebGL2を使用しています。`:'描画できます。作業内容は自動的に保護されます。';
    updateQa();
  }catch(error){const message=surface?.initializationError||(error instanceof Error?error.message:String(error));updateQa();surface?.destroy();documentReady=false;byId('status').textContent='描画を開始できませんでした。'+message;}
  finally{byId<HTMLButtonElement>('new').disabled=false;}
};

byId<HTMLButtonElement>('addLayer').onclick=()=>{if(!surface)return;if(surface.busy||historyPending){byId('status').textContent='今の操作が終わってからレイヤーを追加してください。';return;}try{const id=controller.addRasterLayer(),layer=controller.document.root.getLayer(id);surface.syncLayerStack();surface.discardRedoProjection();queueLatestCommit();renderLayers();updateHistoryButtons();byId('status').textContent=`${layer.name}を追加して選択しました。`;updateQa();}catch{byId('status').textContent='レイヤーを追加できませんでした。';}};

async function performHistory(direction:'undo'|'redo'){
  if(!surface||surface.busy||historyPending)return;const available=direction==='undo'?controller.canUndo:controller.canRedo;if(!available)return;
  historyPending=true;updateHistoryButtons();updateQa();let change:EditorHistoryChange|null=null;
  try{
    change=direction==='undo'?controller.undo():controller.redo();if(!change.changed)return;
    await surface.syncHistory(change);if(direction==='undo')undoCount++;else redoCount++;
    renderLayers();persistence.noteNavigation(controller.document);byId('status').textContent=direction==='undo'?'ひとつ前の状態に戻しました。':'取り消した操作をやり直しました。';
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
  if(e.key==='Escape'&&workspace.classList.contains('open')){close(true);return;}
  if(isTextEditingTarget(e.target)||e.altKey)return;
  const primary=e.ctrlKey||e.metaKey;if(!primary)return;const key=e.key.toLowerCase();
  const undo=key==='z'&&!e.shiftKey,redo=(key==='z'&&e.shiftKey)||(key==='y'&&e.ctrlKey&&!e.metaKey);
  if(!undo&&!redo)return;const direction=undo?'undo':'redo',available=direction==='undo'?controller.canUndo:controller.canRedo;
  if(!surface||surface.busy||historyPending||!available)return;e.preventDefault();void performHistory(direction);
});

function selectPreset(id:string){if(!surface)return;surface.selectById(id);const erasing=surface.blendMode==='erase';selectedTool=erasing?'eraser':'brush';if(erasing)lastEraserPresetId=surface.brushId;else lastBrushPresetId=surface.brushId;byId<HTMLSelectElement>('brush').value=surface.brushId;byId('erase').setAttribute('aria-pressed',String(erasing));byId('paint').setAttribute('aria-pressed',String(!erasing));syncPreset();}
byId<HTMLSelectElement>('brush').onchange=e=>selectPreset((e.target as HTMLSelectElement).value);for(const id of ['size','sizeNumber'])byId<HTMLInputElement>(id).oninput=e=>{if(!surface)return;const input=e.target as HTMLInputElement,value=Number(input.value);if(!input.validity.valid||input.value==='')return;surface.setSize(value);syncPreset();};
byId<HTMLInputElement>('force').onchange=e=>{surface?.setForceFade((e.target as HTMLInputElement).checked);updateQa();};byId<HTMLInputElement>('finger').onchange=e=>{if(surface)surface.fingerDrawing=(e.target as HTMLInputElement).checked;};byId('erase').onclick=()=>selectPreset(lastEraserPresetId);byId('paint').onclick=()=>selectPreset(lastBrushPresetId);

byId<HTMLButtonElement>('open').onclick=()=>byId<HTMLInputElement>('openFile').click();
byId<HTMLInputElement>('openFile').onchange=async e=>{
  const input=e.target as HTMLInputElement,file=input.files?.[0];input.value='';if(!file)return;
  byId('status').textContent='作品ファイルを確認しています。';let opened:PortableOpenResult;
  try{opened=await persistence.decodePortable(new Uint8Array(await file.arrayBuffer()));}
  catch(error){byId('status').textContent='この作品ファイルは安全に読み込めませんでした。'+(error instanceof Error?error.message:String(error));updateQa();return;}
  byId('status').textContent='作品を表示しています。';
  try{await activateOpened(opened,false,opened.snapshotRevisionId);byId('status').textContent='保存した作品を開きました。';}
  catch(error){byId('status').textContent='作品ファイルは正常ですが、表示の復元に失敗しました。'+(error instanceof Error?error.message:String(error));}
  updateQa();
};
byId<HTMLButtonElement>('save').onclick=async()=>{
  if(!documentReady)return;byId('status').textContent='保存しています。保存中も描けます。';
  try{const result=await persistence.save(controller.document,controller.selectedLayerId),size=formatFileSize(result.byteLength);byId<HTMLButtonElement>('reloadSaved').disabled=false;byId('status').textContent=result.output==='download'?'作品ファイルを端末へ保存しました（'+size+'）。':'作品を保存しました（'+size+'）。';void refreshRecoveryCandidates();}
  catch(error){byId('status').textContent='保存できませんでした。'+(error instanceof Error?error.message:String(error));}
  updateQa();
};
byId<HTMLButtonElement>('saveCopy').onclick=async()=>{
  if(!documentReady)return;
  try{await persistence.saveCopy(controller.document,controller.selectedLayerId);byId('status').textContent='別名の作品として保存しました。';}
  catch(error){byId('status').textContent='別名保存できませんでした。'+(error instanceof Error?error.message:String(error));}
  updateQa();
};
byId<HTMLButtonElement>('reloadSaved').onclick=async()=>{
  try{const candidate=persistenceState?.lastGood?undefined:persistedSaveCandidate()??undefined,opened=await persistence.reloadLastGood(candidate);await activateOpened(opened,false,opened.snapshotRevisionId);byId('status').textContent='最後に正常保存できた状態を開き直しました。';}
  catch(error){byId('status').textContent='保存版を開き直せませんでした。'+(error instanceof Error?error.message:String(error));}
  updateQa();
};
byId<HTMLButtonElement>('recover').onclick=async()=>{
  const candidate=recoveryCandidates.find(item=>BigInt(item.protectedThrough)>0n);if(!candidate)return;byId('status').textContent='作業途中の状態を確認しています。';
  try{
    const recovered=await persistence.recover(candidate),opened={document:recovered.document,selectedLayerId:recovered.selectedLayerId,preserved:{manifestExtras:{},optionalSections:[]},generationId:'recovery',snapshotRevisionId:recovered.document.head,...(recovered.projectionCache?{projectionCache:recovered.projectionCache}:{})} as PortableOpenResult;
    await activateOpened(opened,true,recovered.savedRevision??undefined);recoveryCandidates=[];byId('status').textContent='作業途中の保護状態から戻しました。';
  }catch(error){byId('status').textContent='作業途中の状態を戻せませんでした。'+(error instanceof Error?error.message:String(error));}
  updatePersistenceDisplay();updateQa();
};
async function refreshRecoveryCandidates(){
  try{const values=await persistence.listRecoveryCandidates();recoveryCandidates=values;updatePersistenceDisplay();if(recoveryCandidates.some(candidate=>BigInt(candidate.protectedThrough)>0n)&&!documentReady)byId('status').textContent='作業途中から戻せる作品があります。';}catch{}
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
updateHistoryButtons();updatePersistenceDisplay();updateQa();addEventListener('resize',updateQa);addEventListener('pagehide',()=>{if(projectionCheckpointTimer!==null)clearTimeout(projectionCheckpointTimer);surface?.destroy();});

function formatFileSize(bytes:number){if(!Number.isFinite(bytes)||bytes<0)return 'サイズ不明';if(bytes<1024)return Math.round(bytes)+' B';if(bytes<1024*1024)return (bytes/1024).toFixed(bytes<10*1024?1:0)+' KB';return (bytes/(1024*1024)).toFixed(bytes<10*1024*1024?1:0)+' MB';}
function qaMarkup(){return `<details id="qaPanel" class="qa-panel" open><summary>M05 今回の確認</summary><ol>
<li>線を描き、レイヤー追加や消しゴムも使った状態で「保存」してください。</li>
<li>保存後にさらに描き、「保存後の変更あり」と表示されるか確認してください。</li>
<li>「保存版を開き直す」で、保存した時点の絵とレイヤー状態へ正しく戻るか確認してください。</li>
<li>もう一度描き、保存せずページを再読み込みしてください。</li>
<li>「作業途中から戻す」が使える場合、直前の作業まで正しく戻るか確認してください。</li>
<li>最後に「問題なし / 問題あり」を選択してください。</li>
</ol><details class="qa-auto"><summary>描画と保存の状態（問題がある場合のみ）</summary>
<p>黒画面、保存後の表示差、復元失敗がある場合に状態を記録します。</p>
<button id="qaDiagInitial" type="button">状態を記録する</button>
<button id="qaDiagCopy" type="button">診断結果をコピーする</button>
<pre id="qaGpuReport" style="font-size:10px;white-space:pre-wrap;overflow-wrap:anywhere"></pre>
</details><label>結果<select id="qaState"><option value="unchecked">未確認</option><option value="ok">問題なし</option><option value="problem">問題あり</option></select></label><label id="qaNoteLabel">気になったこと<textarea id="qaNote" rows="3" placeholder="短く書いてください"></textarea></label><button id="qaCopy" type="button">結果をコピー</button><details class="qa-auto"><summary>自動記録</summary><pre id="qaAuto"></pre></details></details>`;}
