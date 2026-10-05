import './style.css';
import {EditorController} from './controller';
import {BrushSurface} from './brushSurface';

const qaMode=new URLSearchParams(location.search).get('qa')==='1'||/\/qa\/m01\/(?:index\.html)?$/.test(location.pathname);
const qaStartedAt=new Date().toISOString();
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<header><strong>Illustro</strong><button disabled title="ホーム画面は準備中">Home</button><button disabled title="保存は準備中">Save</button><span>${qaMode?'M01 実機確認':'描画確認用'}</span></header>
<nav class="rail" aria-label="メインツール">
  <button id="paint" aria-pressed="true">ブラシ</button><button id="erase" aria-pressed="false">消しゴム</button>
  <button disabled>ぼかし</button><button disabled>スポイト</button><button disabled>塗り</button><button disabled>選択</button><button disabled>変形</button><button disabled>移動</button>
  <button id="colorPage" class="compact-only">色</button><button id="brushPage" class="compact-only">設定</button><button id="layersPage" class="compact-only">レイヤー</button>
  <button disabled class="all">全機能</button>
</nav>
<main><p id="status" role="status">新規キャンバスを開いてください。保存はまだ利用できません。</p><button id="new">新規キャンバス</button><div class="surface"><canvas id="canvas" aria-label="描画キャンバス" data-committed-strokes="0"></canvas></div></main>
<div id="splitter" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Workspaceの幅" aria-valuemin="240" aria-valuemax="440" aria-valuenow="344"></div>
<aside id="workspace" aria-label="Workspace"><button id="close" class="compact-only">閉じる</button>
  <details open id="layersBox"><summary>レイヤー</summary><p>Layer 1</p><button disabled>レイヤー追加</button></details>
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
const updateQa=()=>{
  const canvas=byId<HTMLCanvasElement>('canvas');canvas.dataset.committedStrokes=String(controller.committedStrokeCount);canvas.dataset.revisionId=controller.lastCommit?.revisionId??controller.document.head;canvas.dataset.dirtyTiles=String(controller.lastCommit?.dirtyTileCount??0);
  if(!qaMode)return;
  const data={milestone:'M01',commit:(import.meta.env.VITE_COMMIT_SHA??'unknown'),brush:surface?.brushName??'未選択',brushSize:surface?.brushSize??0,backend:surface?.backend??'未取得',viewport:`${innerWidth}x${innerHeight}`,userAgent:navigator.userAgent,qaStartedAt,committedStrokes:controller.committedStrokeCount,lastRevision:controller.lastCommit?.revisionId??controller.document.head,lastDirtyTiles:controller.lastCommit?.dirtyTileCount??0};
  byId('qaAuto').textContent=JSON.stringify(data,null,2);
};
surface=new BrushSurface(byId('canvas'),controller,text=>{byId('status').textContent=text;},updateQa);
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
byId<HTMLButtonElement>('new').onclick=async()=>{if(!surface)return;byId<HTMLButtonElement>('new').disabled=true;byId('status').textContent='キャンバスを準備しています。';try{await surface.initialize();const select=byId<HTMLSelectElement>('brush');surface.brushes.forEach((p,i)=>select.add(new Option(p.name,String(i))));for(const id of ['brush','size','sizeNumber','force'])(byId(id) as HTMLInputElement).disabled=false;syncPreset();byId('status').textContent='描画できます。レイヤー追加・取消・保存はまだ利用できません。';updateQa();}catch{surface.destroy();byId('status').textContent='描画を開始できませんでした。ページを再読み込みしてください。';}};
function selectBrush(index:number){if(!surface)return;surface.select(index);byId<HTMLSelectElement>('brush').value=String(index);const erasing=index>=5;if(erasing)eraseIndex=index;else paintIndex=index;byId('erase').setAttribute('aria-pressed',String(erasing));byId('paint').setAttribute('aria-pressed',String(!erasing));syncPreset();}
byId<HTMLSelectElement>('brush').onchange=e=>selectBrush(Number((e.target as HTMLSelectElement).value));for(const id of ['size','sizeNumber'])byId<HTMLInputElement>(id).oninput=e=>{if(!surface)return;const input=e.target as HTMLInputElement,value=Number(input.value);if(!input.validity.valid||input.value==='')return;surface.setSize(value);syncPreset();};
byId<HTMLInputElement>('force').onchange=e=>{surface?.setForceFade((e.target as HTMLInputElement).checked);updateQa();};byId<HTMLInputElement>('finger').onchange=e=>{if(surface)surface.fingerDrawing=(e.target as HTMLInputElement).checked;};byId('erase').onclick=()=>selectBrush(eraseIndex);byId('paint').onclick=()=>selectBrush(paintIndex);
if(qaMode){const state=byId<HTMLSelectElement>('qaState'),noteLabel=byId<HTMLLabelElement>('qaNoteLabel'),note=byId<HTMLTextAreaElement>('qaNote');const sync=()=>{const problem=state.value==='problem';noteLabel.hidden=!problem;note.disabled=!problem;updateQa();};state.onchange=sync;sync();byId<HTMLButtonElement>('qaCopy').onclick=async()=>{const result={result:state.value,note:state.value==='problem'?note.value:'',automatic:JSON.parse(byId('qaAuto').textContent||'{}')};try{await navigator.clipboard.writeText(JSON.stringify(result,null,2));byId('qaCopy').textContent='コピーしました';}catch{byId('qaCopy').textContent='コピーできませんでした';}};}
updateQa();addEventListener('resize',updateQa);addEventListener('pagehide',()=>surface?.destroy());

function qaMarkup(){return `<details id="qaPanel" class="qa-panel" open><summary>今回の確認</summary><ol><li>新しいキャンバスを開いてください。</li><li>普通の太さで線を5本ほど描いてください。</li><li>ペンを離したあと、線が消えたり急に別の形になったりしないか見てください。</li><li>その上からさらに線を5本ほど描いてください。前に描いた線がそのまま残るか見てください。</li><li>細い線と太い線を何本か描いてください。線が途中で欠けないか見てください。</li><li>ゆっくりした線と速い線を描いてください。今まで合格していた描き心地が悪くなっていないか見てください。</li><li>問題がなければ「問題なし」、違和感があれば「問題あり」を選んでください。</li></ol><label>結果<select id="qaState"><option value="unchecked">未確認</option><option value="ok">問題なし</option><option value="problem">問題あり</option></select></label><label id="qaNoteLabel">気になったこと<textarea id="qaNote" rows="3" placeholder="短く書いてください"></textarea></label><button id="qaCopy" type="button">結果をコピー</button><details class="qa-auto"><summary>自動記録</summary><pre id="qaAuto"></pre></details></details>`;}