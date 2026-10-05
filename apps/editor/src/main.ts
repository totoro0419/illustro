import './style.css';
import {EditorController} from './controller';
import {BrushSurface} from './brushSurface';

const qaMode=new URLSearchParams(location.search).get('qa')==='1'||/\/qa\/m02\/(?:index\.html)?$/.test(location.pathname);
const qaStartedAt=new Date().toISOString();
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header><strong>Illustro</strong><button disabled title="ホーム画面は準備中">Home</button><button disabled title="保存は準備中">Save</button><span>${qaMode?'M02 実機確認':'描画確認用'}</span></header>
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
  <div class="commands"><button id="layer">レイヤー</button><button disabled>Undo</button><button disabled>Redo</button><button disabled>左右反転</button><button disabled>上下反転</button></div>
</aside>
<div class="compact-only bottom"><button disabled>Undo</button><button disabled>Redo</button><button id="drawer" aria-controls="workspace" aria-expanded="false">Workspace</button></div>
${qaMode?qaMarkup():''}`;
const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const controller=new EditorController();
let surface:BrushSurface|null=null;
const renderLayers=()=>{
  const list=byId<HTMLDivElement>('layerList');const rows=[...controller.layers].reverse();list.replaceChildren(...rows.map(layer=>{
    const selected=layer.id===controller.selectedLayerId,row=document.createElement('button'),name=document.createElement('span'),state=document.createElement('span');
    row.type='button';row.className='layer-row';row.dataset.layerId=layer.id;row.setAttribute('aria-pressed',String(selected));row.setAttribute('aria-label',`${layer.name}${selected?'、選択中':''}`);
    name.className='layer-name';name.textContent=layer.name;state.className='layer-state';state.textContent=selected?'選択中':'';
    row.append(name,state);row.onclick=()=>{try{controller.selectLayer(layer.id);renderLayers();byId('status').textContent=`${layer.name}を選びました。次の線はこのレイヤーに入ります。`;updateQa();}catch{byId('status').textContent='そのレイヤーを選択できませんでした。';}};return row;
  }));
};
const updateQa=()=>{
  const canvas=byId<HTMLCanvasElement>('canvas'),selected=controller.selectedLayer;canvas.dataset.committedStrokes=String(controller.committedStrokeCount);canvas.dataset.revisionId=controller.document.head;canvas.dataset.dirtyTiles=String(controller.lastCommit?.dirtyTileCount??0);canvas.dataset.layerCount=String(controller.layers.length);canvas.dataset.selectedLayerId=controller.selectedLayerId;canvas.dataset.selectedLayerName=selected.name;
  if(!qaMode)return;
  const data={milestone:'M02',commit:(import.meta.env.VITE_COMMIT_SHA??'unknown'),backend:surface?.backend??'未取得',viewport:`${innerWidth}x${innerHeight}`,userAgent:navigator.userAgent,device:{platform:navigator.platform,maxTouchPoints:navigator.maxTouchPoints},layerCount:controller.layers.length,selectedLayerId:controller.selectedLayerId,selectedLayerName:selected.name,layers:controller.layers.map(layer=>({id:layer.id,name:layer.name,committedStrokes:controller.strokeCountForLayer(layer.id)})),committedStrokeCount:controller.committedStrokeCount,lastRevision:controller.document.head,lastStrokeRevision:controller.lastCommit?.revisionId??null,qaStartedAt};
  byId('qaAuto').textContent=JSON.stringify(data,null,2);
};
renderLayers();
surface=new BrushSurface(byId('canvas'),controller,text=>{byId('status').textContent=text;},()=>{renderLayers();updateQa();});
let paintIndex=0,eraseIndex=5;const workspace=byId('workspace'),drawer=byId<HTMLButtonElement>('drawer');
function openBox(id:string){workspace.classList.add('open');drawer.setAttribute('aria-expanded','true');const box=byId<HTMLDetailsElement>(id);box.open=true;box.scrollIntoView({block:'nearest'});}
byId('layer').onclick=()=>openBox('layersBox');byId('layersPage').onclick=()=>openBox('layersBox');byId('colorPage').onclick=()=>openBox('colorBox');byId('brushPage').onclick=()=>openBox('brushBox');
drawer.onclick=()=>{workspace.classList.toggle('open');drawer.setAttribute('aria-expanded',String(workspace.classList.contains('open')));};
function close(){workspace.classList.remove('open');drawer.setAttribute('aria-expanded','false');drawer.focus();}byId('close').onclick=close;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&workspace.classList.contains('open'))close();});
function setWidth(value:number){const width=Math.max(240,Math.min(440,value));document.documentElement.style.setProperty('--workspace',`${width}px`);byId<HTMLInputElement>('width').value=String(width);byId('splitter').setAttribute('aria-valuenow',String(width));}
byId<HTMLInputElement>('width').oninput=e=>setWidth(Number((e.target as HTMLInputElement).value));const splitter=byId('splitter');let resizePointer:number|null=null;
splitter.onpointerdown=e=>{resizePointer=e.pointerId;splitter.setPointerCapture(e.pointerId);e.preventDefault();};splitter.onpointermove=e=>{if(e.pointerId===resizePointer)setWidth(innerWidth-e.clientX);};splitter.onpointerup=splitter.onpointercancel=()=>{resizePointer=null;};
splitter.onkeydown=e=>{const current=Number(splitter.getAttribute('aria-valuenow'));if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setWidth(current+(e.key==='ArrowLeft'?10:-10));}};
function syncPreset(){if(!surface?.preset)return;byId<HTMLInputElement>('size').value=String(surface.preset.size);byId<HTMLInputElement>('sizeNumber').value=String(surface.preset.size);byId<HTMLInputElement>('force').checked=surface.preset.forceFade?.enabled??false;updateQa();}
byId<HTMLButtonElement>('new').onclick=async()=>{if(!surface)return;byId<HTMLButtonElement>('new').disabled=true;byId('status').textContent='キャンバスを準備しています。';try{await surface.initialize();const select=byId<HTMLSelectElement>('brush');surface.brushes.forEach((p,i)=>select.add(new Option(p.name,String(i))));for(const id of ['brush','size','sizeNumber','force','addLayer'])(byId(id) as HTMLInputElement).disabled=false;syncPreset();renderLayers();byId('status').textContent='描画できます。レイヤー追加・選択を試せます。Undo・保存はまだ利用できません。';updateQa();}catch{surface.destroy();byId('status').textContent='描画を開始できませんでした。ページを再読み込みしてください。';}};
byId<HTMLButtonElement>('addLayer').onclick=()=>{if(!surface)return;if(surface.busy){byId('status').textContent='線を描き終えてからレイヤーを追加してください。';return;}try{const id=controller.addRasterLayer(),layer=controller.document.root.getLayer(id);renderLayers();byId('status').textContent=`${layer.name}を追加して選択しました。`;updateQa();}catch{byId('status').textContent='レイヤーを追加できませんでした。';}};
function selectBrush(index:number){if(!surface)return;surface.select(index);byId<HTMLSelectElement>('brush').value=String(index);const erasing=index>=5;if(erasing)eraseIndex=index;else paintIndex=index;byId('erase').setAttribute('aria-pressed',String(erasing));byId('paint').setAttribute('aria-pressed',String(!erasing));syncPreset();}
byId<HTMLSelectElement>('brush').onchange=e=>selectBrush(Number((e.target as HTMLSelectElement).value));for(const id of ['size','sizeNumber'])byId<HTMLInputElement>(id).oninput=e=>{if(!surface)return;const input=e.target as HTMLInputElement,value=Number(input.value);if(!input.validity.valid||input.value==='')return;surface.setSize(value);syncPreset();};
byId<HTMLInputElement>('force').onchange=e=>{surface?.setForceFade((e.target as HTMLInputElement).checked);updateQa();};byId<HTMLInputElement>('finger').onchange=e=>{if(surface)surface.fingerDrawing=(e.target as HTMLInputElement).checked;};byId('erase').onclick=()=>selectBrush(eraseIndex);byId('paint').onclick=()=>selectBrush(paintIndex);
if(qaMode){const state=byId<HTMLSelectElement>('qaState'),noteLabel=byId<HTMLLabelElement>('qaNoteLabel'),note=byId<HTMLTextAreaElement>('qaNote');const sync=()=>{const problem=state.value==='problem';noteLabel.hidden=!problem;note.disabled=!problem;updateQa();};state.onchange=sync;sync();byId<HTMLButtonElement>('qaCopy').onclick=async()=>{const result={result:state.value,note:state.value==='problem'?note.value:'',automatic:JSON.parse(byId('qaAuto').textContent||'{}')};try{await navigator.clipboard.writeText(JSON.stringify(result,null,2));byId('qaCopy').textContent='コピーしました';}catch{byId('qaCopy').textContent='コピーできませんでした';}};}
updateQa();addEventListener('resize',updateQa);addEventListener('pagehide',()=>surface?.destroy());

function qaMarkup(){return `<details id="qaPanel" class="qa-panel" open><summary>M02 今回の確認</summary><ol><li>「新規キャンバス」を押してください。</li><li>最初のレイヤーが「選択中」になっていることを見てください。</li><li>「レイヤー追加」を押してください。</li><li>レイヤーが1枚増えることを見てください。</li><li>新しいレイヤーに線を数本描いてください。</li><li>最初のレイヤーを選び直してください。</li><li>別の場所へ線を数本描いてください。</li><li>もう一度、新しいレイヤーへ戻ってください。</li><li>今選んでいるレイヤーが、見た目ではっきり分かるか確認してください。</li><li>レイヤーを切り替えても、以前描いた線が消えたり変な場所へ移ったりしないか確認してください。</li><li>レイヤー追加や切り替えが重くないか確認してください。</li><li>M01で合格した描き心地や強制入り抜きが悪くなっていないか確認してください。</li><li>問題がなければ「問題なし」、違和感があれば「問題あり」を選んでください。</li></ol><label>結果<select id="qaState"><option value="unchecked">未確認</option><option value="ok">問題なし</option><option value="problem">問題あり</option></select></label><label id="qaNoteLabel">気になったこと<textarea id="qaNote" rows="3" placeholder="短く書いてください"></textarea></label><button id="qaCopy" type="button">結果をコピー</button><details class="qa-auto"><summary>自動記録</summary><pre id="qaAuto"></pre></details></details>`;}
