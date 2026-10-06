import './style.css';
import {EditorController,type EditorHistoryChange} from './controller';
import {BrushSurface} from './brushSurface';

const qaPath=location.pathname.replace(/\/+$/,'');
const qaMode=new URLSearchParams(location.search).get('qa')==='1'||qaPath.endsWith('/qa/m03')||qaPath.endsWith('/qa/m03/index.html');
const qaStartedAt=new Date().toISOString();
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header><strong>Illustro</strong><button disabled title="ホーム画面は準備中">Home</button><button disabled title="保存は準備中">Save</button><span>${qaMode?'M03 実機確認':'描画確認用'}</span></header>
<nav class="rail" aria-label="メインツール">
  <button id="paint" aria-pressed="true">ブラシ</button><button id="erase" aria-pressed="false">消しゴム</button>
  <button disabled>ぼかし</button><button disabled>スポイト</button><button disabled>塗り</button><button disabled>選択</button><button disabled>変形</button><button disabled>移動</button>
  <button id="colorPage" class="compact-only">色</button><button id="brushPage" class="compact-only">設定</button><button id="layersPage" class="compact-only">レイヤー</button>
  <button disabled class="all">全機能</button>
</nav>
<main><p id="status" role="status">新規キャンバスを開いてください。保存はまだ利用できません。</p><button id="new">新規キャンバス</button><div class="surface"><canvas id="canvas" aria-label="描画キャンバス" data-committed-strokes="0"></canvas></div></main>
<div id="splitter" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Workspaceの幅" aria-valuemin="240" aria-valuemax="440" aria-valuenow="344"></div>
<aside id="workspace" aria-label="Workspace"><button id="close" class="compact-only">閉じる</button>
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
<div class="compact-only bottom"><button id="compactUndo" disabled title="元に戻す">Undo</button><button id="compactRedo" disabled title="やり直す">Redo</button><button id="drawer" aria-controls="workspace" aria-expanded="false">Workspace</button></div>
${qaMode?qaMarkup():''}`;

const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const controller=new EditorController();
let surface:BrushSurface|null=null,historyPending=false,undoCount=0,redoCount=0;
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

const updateQa=()=>{
  const canvas=byId<HTMLCanvasElement>('canvas'),selected=controller.selectedLayer;
  canvas.dataset.committedStrokes=String(controller.committedStrokeCount);canvas.dataset.revisionId=controller.document.head;canvas.dataset.dirtyTiles=String(controller.lastCommit?.dirtyTileCount??0);
  canvas.dataset.layerCount=String(controller.layers.length);canvas.dataset.selectedLayerId=controller.selectedLayerId;canvas.dataset.selectedLayerName=selected.name;
  canvas.dataset.canUndo=String(controller.canUndo);canvas.dataset.canRedo=String(controller.canRedo);canvas.dataset.historyBusy=String(historyPending||surface?.busy===true);canvas.dataset.historyPatchHits=String(surface?.historyPatchHits??0);canvas.dataset.historyReplayFallbacks=String(surface?.historyReplayFallbacks??0);
  if(!qaMode)return;
  const data={milestone:'M03',commit:(import.meta.env.VITE_COMMIT_SHA??'unknown'),backend:surface?.backend??'未取得',viewport:`${innerWidth}x${innerHeight}`,userAgent:navigator.userAgent,
    layerCount:controller.layers.length,selectedLayerId:controller.selectedLayerId,selectedLayerName:selected.name,currentRevision:controller.document.head,canUndo:controller.canUndo,canRedo:controller.canRedo,
    undoCount,redoCount,committedStrokeCount:controller.committedStrokeCount,historyPatchHits:surface?.historyPatchHits??0,historyReplayFallbacks:surface?.historyReplayFallbacks??0,layers:controller.layers.map(layer=>({id:layer.id,surfaceId:layer.surface.descriptor.surfaceId,name:layer.name,committedStrokes:controller.strokeCountForLayer(layer.id)})),qaStartedAt};
  byId('qaAuto').textContent=JSON.stringify(data,null,2);
};
renderLayers();

surface=new BrushSurface(byId('canvas'),controller,text=>{byId('status').textContent=text;},()=>{renderLayers();updateHistoryButtons();updateQa();},()=>{updateHistoryButtons();updateQa();});
let paintIndex=0,eraseIndex=5;const workspace=byId('workspace'),drawer=byId<HTMLButtonElement>('drawer'),compactWorkspace=matchMedia('(max-width:760px)');
function syncWorkspaceState(){const open=workspace.classList.contains('open'),hidden=compactWorkspace.matches&&!open;drawer.setAttribute('aria-expanded',String(open));workspace.inert=hidden;workspace.setAttribute('aria-hidden',String(hidden));}
function openBox(id:string){workspace.classList.add('open');syncWorkspaceState();const box=byId<HTMLDetailsElement>(id);box.open=true;box.scrollIntoView({block:'nearest'});}
byId('layer').onclick=()=>openBox('layersBox');byId('layersPage').onclick=()=>openBox('layersBox');byId('colorPage').onclick=()=>openBox('colorBox');byId('brushPage').onclick=()=>openBox('brushBox');
drawer.onclick=()=>{workspace.classList.toggle('open');syncWorkspaceState();};
function close(){workspace.classList.remove('open');syncWorkspaceState();drawer.focus();}byId('close').onclick=close;compactWorkspace.addEventListener('change',syncWorkspaceState);syncWorkspaceState();

function setWidth(value:number){const width=Math.max(240,Math.min(440,value));document.documentElement.style.setProperty('--workspace',`${width}px`);byId<HTMLInputElement>('width').value=String(width);byId('splitter').setAttribute('aria-valuenow',String(width));}
byId<HTMLInputElement>('width').oninput=e=>setWidth(Number((e.target as HTMLInputElement).value));const splitter=byId('splitter');let resizePointer:number|null=null;
splitter.onpointerdown=e=>{resizePointer=e.pointerId;splitter.setPointerCapture(e.pointerId);e.preventDefault();};splitter.onpointermove=e=>{if(e.pointerId===resizePointer)setWidth(innerWidth-e.clientX);};splitter.onpointerup=splitter.onpointercancel=()=>{resizePointer=null;};
splitter.onkeydown=e=>{const current=Number(splitter.getAttribute('aria-valuenow'));if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setWidth(current+(e.key==='ArrowLeft'?10:-10));}};

function syncPreset(){if(!surface?.preset)return;byId<HTMLInputElement>('size').value=String(surface.preset.size);byId<HTMLInputElement>('sizeNumber').value=String(surface.preset.size);byId<HTMLInputElement>('force').checked=surface.preset.forceFade?.enabled??false;updateQa();}
byId<HTMLButtonElement>('new').onclick=async()=>{if(!surface)return;byId<HTMLButtonElement>('new').disabled=true;byId('status').textContent='キャンバスを準備しています。';try{await surface.initialize();const select=byId<HTMLSelectElement>('brush');surface.brushes.forEach((p,i)=>select.add(new Option(p.name,String(i))));for(const id of ['brush','size','sizeNumber','force','addLayer'])(byId(id) as HTMLInputElement).disabled=false;syncPreset();renderLayers();updateHistoryButtons();byId('status').textContent='描画できます。Undo / Redoとレイヤー追加・選択を試せます。';updateQa();}catch{surface.destroy();byId('status').textContent='描画を開始できませんでした。ページを再読み込みしてください。';}};

byId<HTMLButtonElement>('addLayer').onclick=()=>{if(!surface)return;if(surface.busy||historyPending){byId('status').textContent='今の操作が終わってからレイヤーを追加してください。';return;}try{const id=controller.addRasterLayer(),layer=controller.document.root.getLayer(id);surface.discardRedoProjection();renderLayers();updateHistoryButtons();byId('status').textContent=`${layer.name}を追加して選択しました。`;updateQa();}catch{byId('status').textContent='レイヤーを追加できませんでした。';}};

async function performHistory(direction:'undo'|'redo'){
  if(!surface||surface.busy||historyPending)return;const available=direction==='undo'?controller.canUndo:controller.canRedo;if(!available)return;
  historyPending=true;updateHistoryButtons();updateQa();let change:EditorHistoryChange|null=null;
  try{
    change=direction==='undo'?controller.undo():controller.redo();if(!change.changed)return;
    await surface.syncHistory(change);if(direction==='undo')undoCount++;else redoCount++;
    renderLayers();byId('status').textContent=direction==='undo'?'ひとつ前の状態に戻しました。':'取り消した操作をやり直しました。';
  }catch{
    if(change?.changed){
      try{const rollback=direction==='undo'?controller.redo():controller.undo();if(rollback.changed)await surface.syncHistory(rollback);}catch{}
    }
    renderLayers();byId('status').textContent='Undo / Redoを安全に反映できなかったため、操作を戻しました。';
  }finally{historyPending=false;updateHistoryButtons();updateQa();}
}
byId('undo').onclick=()=>void performHistory('undo');byId('compactUndo').onclick=()=>void performHistory('undo');byId('redo').onclick=()=>void performHistory('redo');byId('compactRedo').onclick=()=>void performHistory('redo');

function isTextEditingTarget(target:EventTarget|null){if(!(target instanceof HTMLElement))return false;if(target.isContentEditable||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement)return true;if(target instanceof HTMLInputElement){return !['button','checkbox','radio','range','submit','reset'].includes(target.type);}return false;}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&workspace.classList.contains('open')){close();return;}
  if(isTextEditingTarget(e.target)||e.altKey)return;
  const primary=e.ctrlKey||e.metaKey;if(!primary)return;const key=e.key.toLowerCase();
  const undo=key==='z'&&!e.shiftKey,redo=(key==='z'&&e.shiftKey)||(key==='y'&&e.ctrlKey&&!e.metaKey);
  if(!undo&&!redo)return;const direction=undo?'undo':'redo',available=direction==='undo'?controller.canUndo:controller.canRedo;
  if(!surface||surface.busy||historyPending||!available)return;e.preventDefault();void performHistory(direction);
});

function selectBrush(index:number){if(!surface)return;surface.select(index);byId<HTMLSelectElement>('brush').value=String(index);const erasing=index>=5;if(erasing)eraseIndex=index;else paintIndex=index;byId('erase').setAttribute('aria-pressed',String(erasing));byId('paint').setAttribute('aria-pressed',String(!erasing));syncPreset();}
byId<HTMLSelectElement>('brush').onchange=e=>selectBrush(Number((e.target as HTMLSelectElement).value));for(const id of ['size','sizeNumber'])byId<HTMLInputElement>(id).oninput=e=>{if(!surface)return;const input=e.target as HTMLInputElement,value=Number(input.value);if(!input.validity.valid||input.value==='')return;surface.setSize(value);syncPreset();};
byId<HTMLInputElement>('force').onchange=e=>{surface?.setForceFade((e.target as HTMLInputElement).checked);updateQa();};byId<HTMLInputElement>('finger').onchange=e=>{if(surface)surface.fingerDrawing=(e.target as HTMLInputElement).checked;};byId('erase').onclick=()=>selectBrush(eraseIndex);byId('paint').onclick=()=>selectBrush(paintIndex);

if(qaMode){const state=byId<HTMLSelectElement>('qaState'),noteLabel=byId<HTMLLabelElement>('qaNoteLabel'),note=byId<HTMLTextAreaElement>('qaNote');const sync=()=>{const problem=state.value==='problem';noteLabel.hidden=!problem;note.disabled=!problem;updateQa();};state.onchange=sync;sync();byId<HTMLButtonElement>('qaCopy').onclick=async()=>{const result={result:state.value,note:state.value==='problem'?note.value:'',automatic:JSON.parse(byId('qaAuto').textContent||'{}')};try{await navigator.clipboard.writeText(JSON.stringify(result,null,2));byId('qaCopy').textContent='コピーしました';}catch{byId('qaCopy').textContent='コピーできませんでした';}};}
updateHistoryButtons();updateQa();addEventListener('resize',updateQa);addEventListener('pagehide',()=>surface?.destroy());

function qaMarkup(){return `<details id="qaPanel" class="qa-panel" open><summary>M03 今回の確認</summary><ol>
<li>「新規キャンバス」を押してください。</li>
<li>線を2〜3本描いてください。</li>
<li>Undoを1回押し、一番新しい線だけ消えるか確認してください。</li>
<li>もう一度Undoし、その前の線が消えるか確認してください。</li>
<li>Redoを押し、消した線が順番どおり戻るか確認してください。</li>
<li>新しいレイヤーを追加してください。</li>
<li>そのレイヤーに線を描いてください。</li>
<li>Undoでまず線だけ消えるか確認してください。</li>
<li>もう一度Undoして追加したレイヤーが消えるか確認してください。</li>
<li>Redoでレイヤーが戻るか確認してください。</li>
<li>さらにRedoして線が戻るか確認してください。</li>
<li>Undoしたあと新しい線を描き、Redoができなくなるか確認してください。</li>
<li>Undo / Redoを数回素早く押しても表示がおかしくならないか確認してください。</li>
<li>レイヤーや線が突然別の場所へ移らないか確認してください。</li>
<li>M01/M02で合格した描き心地が悪化していないか確認してください。</li>
<li>問題なし / 問題ありを選択してください。</li>
</ol><label>結果<select id="qaState"><option value="unchecked">未確認</option><option value="ok">問題なし</option><option value="problem">問題あり</option></select></label><label id="qaNoteLabel">気になったこと<textarea id="qaNote" rows="3" placeholder="短く書いてください"></textarea></label><button id="qaCopy" type="button">結果をコピー</button><details class="qa-auto"><summary>自動記録</summary><pre id="qaAuto"></pre></details></details>`;}
