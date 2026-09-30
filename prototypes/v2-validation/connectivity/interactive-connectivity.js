import { CONNECTIVITY_ALGORITHM_VERSION, evaluateConnectivity, resolveStrokeConnectivity, aggregateConnectivityEvaluations, projectPointToStroke, segmentTargetAtFraction, connectionKey } from './endpoint-connectivity.js';
const ids=['canvas','canvasShell','hint','summary','drawMode','truthMode','drawModeFooter','truthModeFooter','brushSize','brushValue','brushCap','automaticList','undoStroke','clearAll','restoreClear','truthStatus','truthList','endpointA','endpointB','togglePair','segmentEndpoint','targetStroke','targetFraction','toggleSegment','reviewed','finalizeTruth','finalizeFooter','precisionMetric','recallMetric','f1Metric','exactMetric','falseMetric','missedMetric','showAuto','showTruth','showCandidates','exportJson','exportStatus','saveScene','archiveStatus','aggregateMetrics'];
const els=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
const STORAGE_KEY='illustro-connectivity-evaluation-v2';
const state={mode:'draw',strokes:[],activeStroke:null,graph:resolveStrokeConnectivity([]),truth:new Set(),segmentTruth:new Map(),selectedEndpoint:null,truthFinalized:false,metrics:null,startedAt:performance.now(),nextStrokeNumber:1,sceneId:crypto.randomUUID(),archive:[],clearBackup:null,board:null,pointerId:null,autoExposed:false,inputCounts:{trusted:0,untrusted:0,coalesced:0},storageError:null};
const pairKey=(a,b)=>a<b?`${a}|${b}`:`${b}|${a}`;
const percent=value=>Number.isFinite(value)?`${(100*value).toFixed(1)}%`:'—';
const truthPairs=()=>[...[...state.truth].map(key=>key.split('|')),...state.segmentTruth.values()];
function invalidate(){state.truthFinalized=false;state.metrics=null;els.reviewed.checked=false;}
function setMode(mode){
  if(state.activeStroke)return;state.mode=mode;state.selectedEndpoint=null;
  for(const b of [els.drawMode,els.drawModeFooter]){b.classList.toggle('active',mode==='draw');b.setAttribute('aria-pressed',String(mode==='draw'));}
  for(const b of [els.truthMode,els.truthModeFooter]){b.classList.toggle('active',mode==='truth');b.setAttribute('aria-pressed',String(mode==='truth'));}
  els.canvas.style.cursor=mode==='draw'?'crosshair':'pointer';updateUI();render();
}
function canvasMetrics(){const rect=els.canvas.getBoundingClientRect();return {rect,cssWidth:Math.max(1,rect.width),cssHeight:Math.max(1,rect.height),dpr:Math.max(1,Math.min(3,window.devicePixelRatio||1))};}
function viewTransform(){const m=canvasMetrics(),b=state.board??{width:m.cssWidth,height:m.cssHeight};const scale=Math.min(m.cssWidth/b.width,m.cssHeight/b.height);return {...m,scale,ox:(m.cssWidth-b.width*scale)/2,oy:(m.cssHeight-b.height*scale)/2};}
function resizeCanvas(){const m=canvasMetrics();els.canvas.width=Math.round(m.cssWidth*m.dpr);els.canvas.height=Math.round(m.cssHeight*m.dpr);render();}
function eventPoint(event){
  const {rect,scale,ox,oy}=viewTransform();
  return {x:(event.clientX-rect.left-ox)/scale,y:(event.clientY-rect.top-oy)/scale,width:state.activeStroke?.width??Number(els.brushSize.value),pressure:Number.isFinite(event.pressure)?event.pressure:null,timestamp:event.timeStamp,pointerType:event.pointerType||state.activeStroke?.pointerType||'unknown',tiltX:event.tiltX??null,tiltY:event.tiltY??null,twist:event.twist??null};
}
function noteInput(e,coalesced=false){state.inputCounts[e.isTrusted?'trusted':'untrusted']++;if(coalesced)state.inputCounts.coalesced++;}
function appendPointerSamples(event){
  if(!state.activeStroke||event.pointerId!==state.pointerId)return;
  const coalesced=event.getCoalescedEvents?.()??[],source=coalesced.length?coalesced:[event];
  for(const e of source){noteInput(event,coalesced.length>0);state.activeStroke.points.push(eventPoint(e));}
}
function beginStroke(event){
  if(state.activeStroke)return;
  const m=canvasMetrics();state.board??={width:m.cssWidth,height:m.cssHeight};
  noteInput(event);state.pointerId=event.pointerId;
  state.activeStroke={strokeId:`stroke-${state.nextStrokeNumber++}`,order:state.strokes.length,width:Number(els.brushSize.value),cap:els.brushCap.value,pointerType:event.pointerType||'unknown',points:[eventPoint(event)],inputTrusted:event.isTrusted};
  try{els.canvas.setPointerCapture(event.pointerId);}catch{}render();
}
function endStroke(event,cancelled=false){
  if(!state.activeStroke||event.pointerId!==state.pointerId)return;
  if(!cancelled)appendPointerSamples(event);
  // Cancel retains the actually received trace, without inventing a terminal sample.
  state.activeStroke.cancelled=cancelled;
  if(state.activeStroke.points.length>=2)state.strokes.push(state.activeStroke);
  state.activeStroke=null;state.pointerId=null;invalidate();
  try{els.canvas.releasePointerCapture(event.pointerId);}catch{}recompute();
}
function recompute(){
  state.graph=resolveStrokeConnectivity(state.strokes);const valid=new Set(state.graph.endpoints.map(e=>e.endpointId));
  state.truth=new Set([...state.truth].filter(key=>key.split('|').every(id=>valid.has(id))));
  state.segmentTruth=new Map([...state.segmentTruth].filter(([key,row])=>valid.has(row.endpointA)&&state.strokes.some(s=>s.strokeId===row.target.strokeId)));
  updateSelectors();updateUI();render();
}
function labels(){return new Map(state.graph.endpoints.map((e,i)=>[e.endpointId,String(i+1)]));}
function updateSelectors(){
  for(const select of [els.endpointA,els.endpointB,els.segmentEndpoint]){
    const previous=select.value;select.replaceChildren();
  for(const [i,e] of state.graph.endpoints.entries()){const o=document.createElement('option');o.value=e.endpointId;o.textContent=`${i+1}（${e.strokeId} ${e.end==='start'?'始点':'終点'}）`;select.append(o);}
    if([...select.options].some(o=>o.value===previous))select.value=previous;
  }
  const previousStroke=els.targetStroke.value;els.targetStroke.replaceChildren();for(const s of state.strokes){const o=document.createElement('option');o.value=s.strokeId;o.textContent=s.strokeId;els.targetStroke.append(o);}if(state.strokes.some(s=>s.strokeId===previousStroke))els.targetStroke.value=previousStroke;
  if(els.endpointA.value===els.endpointB.value&&els.endpointB.options.length>1)els.endpointB.selectedIndex=1;
}
function togglePair(a,b){if(!a||!b||a===b){els.truthStatus.textContent='異なる端点を2つ選んでください。';return;}const key=pairKey(a,b);state.truth.has(key)?state.truth.delete(key):state.truth.add(key);state.selectedEndpoint=null;invalidate();updateUI();render();}
function toggleTruthEndpoint(event){
  const p=eventPoint(event),radius=20/viewTransform().scale;
  const hits=state.graph.endpoints.map(e=>({e,d:Math.hypot(e.position.x-p.x,e.position.y-p.y)})).filter(r=>r.d<=radius).sort((a,b)=>a.d-b.d);
  if(hits.length>1&&Math.abs(hits[0].d-hits[1].d)<4/viewTransform().scale){els.truthStatus.textContent='端点が重なっています。下の番号選択で指定してください。';return;}
  const endpoint=hits[0]?.e;
  if(!endpoint){
    if(state.selectedEndpoint){const source=state.graph.endpoints.find(e=>e.endpointId===state.selectedEndpoint);const targets=state.strokes.filter(s=>s.strokeId!==source.strokeId).map(s=>projectPointToStroke(s,p)).filter(Boolean).filter(t=>t.distance<=radius&&t.arcFraction>0&&t.arcFraction<1).sort((a,b)=>a.distance-b.distance);if(targets.length>1&&Math.abs(targets[0].distance-targets[1].distance)<4/viewTransform().scale){els.truthStatus.textContent='線が重なっています。接続先の線番号と位置で指定してください。';return;}if(targets[0]){toggleSegment(state.selectedEndpoint,targets[0]);return;}}
    state.selectedEndpoint=null;updateUI();render();return;}

  if(!state.selectedEndpoint)state.selectedEndpoint=endpoint.endpointId;
  else if(state.selectedEndpoint===endpoint.endpointId)state.selectedEndpoint=null;
  else {togglePair(state.selectedEndpoint,endpoint.endpointId);return;}
  updateUI();render();
}
function toggleSegment(endpointA,target){const source=state.graph.endpoints.find(e=>e.endpointId===endpointA);if(!source||source.strokeId===target.strokeId){els.truthStatus.textContent='端点がある線とは別の線を選んでください。';return;}const key=connectionKey(endpointA,target);state.segmentTruth.has(key)?state.segmentTruth.delete(key):state.segmentTruth.set(key,{endpointA,target:{kind:'segment',strokeId:target.strokeId,arcFraction:target.arcFraction}});state.selectedEndpoint=null;invalidate();updateUI();render();}
function finalizeTruth(){if(!state.graph.endpoints.length||!els.reviewed.checked)return;state.truthFinalized=true;state.metrics=evaluateConnectivity(state.graph,truthPairs());els.showAuto.checked=true;updateUI();render();}
function undoStroke(){if(!state.strokes.length)return;state.clearBackup={strokes:structuredClone(state.strokes),truth:[...state.truth],segmentTruth:[...state.segmentTruth],board:state.board};state.strokes.pop();invalidate();recompute();}
function clearAll(){
  if(!state.strokes.length)return;state.clearBackup={strokes:structuredClone(state.strokes),truth:[...state.truth],segmentTruth:[...state.segmentTruth],board:state.board,sceneId:state.sceneId,inputCounts:{...state.inputCounts},autoExposed:state.autoExposed};
  state.strokes=[];state.activeStroke=null;state.pointerId=null;state.truth.clear();state.segmentTruth.clear();state.selectedEndpoint=null;state.nextStrokeNumber=1;state.sceneId=crypto.randomUUID();state.board=null;state.inputCounts={trusted:0,untrusted:0,coalesced:0};state.autoExposed=false;els.showAuto.checked=false;els.showCandidates.checked=false;invalidate();recompute();
}
function restoreClear(){if(!state.clearBackup)return;const b=state.clearBackup;state.strokes=b.strokes;state.truth=new Set(b.truth);state.segmentTruth=new Map(b.segmentTruth??[]);state.board=b.board;state.sceneId=b.sceneId??state.sceneId;state.inputCounts=b.inputCounts??state.inputCounts;state.autoExposed=b.autoExposed??state.autoExposed;state.nextStrokeNumber=1+Math.max(0,...state.strokes.map(s=>Number(s.strokeId.split('-')[1])));state.clearBackup=null;invalidate();recompute();}
function updateUI(){
  const count=state.graph.endpoints.length;els.summary.textContent=`線 ${state.strokes.length}本 / 端点 ${count}個${state.truthFinalized?` / 自動接続 ${state.graph.edges.length}個`:''}`;
  els.hint.classList.toggle('hidden',!!state.strokes.length||!!state.activeStroke);els.undoStroke.disabled=!state.strokes.length;els.clearAll.disabled=!state.strokes.length;els.restoreClear.disabled=!state.clearBackup;
  els.finalizeTruth.disabled=!count||!els.reviewed.checked;els.finalizeFooter.disabled=els.finalizeTruth.disabled;els.togglePair.disabled=count<2;els.toggleSegment.disabled=state.strokes.length<2;els.saveScene.disabled=!state.truthFinalized;els.exportJson.disabled=!state.strokes.length&&!state.archive.length;
  const name=labels();
  els.truthStatus.textContent=!count?'まず線を描いてください。':state.selectedEndpoint?`端点 ${name.get(state.selectedEndpoint)} を選択中。相手を選んでください。`:`つながっている端点を2つ順に選びます。現在 ${state.truth.size+state.segmentTruth.size}組。近すぎる端点は番号で指定できます。`;
  els.truthList.replaceChildren();for(const key of state.truth){const [a,b]=key.split('|'),button=document.createElement('button');button.type='button';button.className='button truth-pair';button.textContent=`${name.get(a)} ↔ ${name.get(b)} を解除`;button.addEventListener('click',()=>togglePair(a,b));els.truthList.append(button);}
  for(const [key,row] of state.segmentTruth){const button=document.createElement('button');button.type='button';button.className='button truth-pair';button.textContent=`${name.get(row.endpointA)} → ${row.target.strokeId} の ${(row.target.arcFraction*100).toFixed(1)}% を解除`;button.addEventListener('click',()=>{state.segmentTruth.delete(key);invalidate();updateUI();render();});els.truthList.append(button);}
  const m=state.metrics;els.precisionMetric.textContent=m?percent(m.precision):'—';els.recallMetric.textContent=m?percent(m.recall):'—';els.f1Metric.textContent=m?percent(m.f1):'—';els.exactMetric.textContent=m?(m.graphExactMatch?'一致':'不一致'):'—';els.falseMetric.textContent=m?String(m.falseConnection):'—';els.missedMetric.textContent=m?String(m.missedConnection):'—';
  const aggregate=aggregateConnectivityEvaluations(state.archive.map(r=>r.metrics));els.archiveStatus.textContent=`記録済み ${state.archive.length}枚${state.storageError?'。このブラウザへの保存は失敗しました。JSONを書き出してください。':''}`;
  els.aggregateMetrics.textContent=state.archive.length?`正しくつないだ割合 ${percent(aggregate.precision)} / 見つけた割合 ${percent(aggregate.recall)} / 両方を合わせた値 ${percent(aggregate.f1)} / 全接続の一致 ${percent(aggregate.graphExactMatchRate)} / 誤接続 ${aggregate.falseConnection} / 見逃し ${aggregate.missedConnection}`:'複数の絵を記録すると、全体の結果を表示します。';
}
function line(ctx,a,b,stroke,width,dash=[]){ctx.save();ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();}
function drawStroke(ctx,s){if(!s?.points?.length)return;ctx.save();ctx.strokeStyle='#eef2f8';ctx.lineWidth=s.width;ctx.lineCap=s.cap;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(s.points[0].x,s.points[0].y);for(const p of s.points.slice(1))ctx.lineTo(p.x,p.y);if(s.points.length===1)ctx.lineTo(s.points[0].x+.001,s.points[0].y);ctx.stroke();ctx.restore();}
function updateAutomaticList(){
  els.automaticList.replaceChildren();if(!state.truthFinalized&&!els.showAuto.checked){els.automaticList.textContent='採点後に表示します。';return;}const name=labels();for(const edge of state.graph.edges){const div=document.createElement('div');div.textContent=edge.to.kind==='segment'?`端点 ${name.get(edge.from.endpointId)} → 線 ${edge.to.strokeId.split('-').at(-1)} の途中（${(edge.to.arcFraction*100).toFixed(1)}%）`:`端点 ${name.get(edge.from.endpointId)} ↔ 端点 ${name.get(edge.to.endpointId)}`;els.automaticList.append(div);}if(!state.graph.edges.length)els.automaticList.textContent='自動で接続した場所はありません。';
}
function render(){
  updateAutomaticList();
  const m=viewTransform(),ctx=els.canvas.getContext('2d');ctx.setTransform(m.dpr,0,0,m.dpr,0,0);ctx.clearRect(0,0,m.cssWidth,m.cssHeight);ctx.translate(m.ox,m.oy);ctx.scale(m.scale,m.scale);
  for(const s of state.strokes)drawStroke(ctx,s);drawStroke(ctx,state.activeStroke);
  const byId=new Map(state.graph.endpoints.map(e=>[e.endpointId,e]));
  // Blind annotation by default; preview exposure is explicitly retained in exports.
  if(state.mode!=='truth'||state.truthFinalized){
    if(!state.truthFinalized&&(els.showAuto.checked||els.showCandidates.checked))state.autoExposed=true;
    if(els.showCandidates.checked)for(const c of state.graph.candidates){if(c.connected||c.confidence<.35)continue;line(ctx,byId.get(c.endpointA).position,c.target.kind==='segment'?c.target.position:byId.get(c.endpointB).position,'#f2bd55',1.5/m.scale,[4/m.scale,5/m.scale]);}
    if(els.showAuto.checked)for(const e of state.graph.edges){const target=e.to.kind==='segment'?e.to.position:byId.get(e.to.endpointId).position;line(ctx,byId.get(e.from.endpointId).position,target,'#5be09a',4/m.scale);ctx.save();ctx.strokeStyle='#5be09a';ctx.lineWidth=3/m.scale;ctx.beginPath();ctx.arc(target.x,target.y,15/m.scale,0,2*Math.PI);ctx.stroke();ctx.restore();}
  }
  if(els.showTruth.checked)for(const key of state.truth){const [a,b]=key.split('|');line(ctx,byId.get(a).position,byId.get(b).position,'#55c8ff',2.5/m.scale,[7/m.scale,4/m.scale]);}
  if(els.showTruth.checked)for(const row of state.segmentTruth.values()){const stroke=state.strokes.find(s=>s.strokeId===row.target.strokeId),target=segmentTargetAtFraction(stroke,row.target.arcFraction);line(ctx,byId.get(row.endpointA).position,target.position,'#55c8ff',2.5/m.scale,[7/m.scale,4/m.scale]);ctx.save();ctx.strokeStyle='#55c8ff';ctx.lineWidth=2/m.scale;ctx.beginPath();ctx.arc(target.position.x,target.position.y,6/m.scale,0,2*Math.PI);ctx.stroke();ctx.restore();}
  for(const [i,e] of state.graph.endpoints.entries()){const selected=e.endpointId===state.selectedEndpoint;ctx.save();ctx.translate(e.position.x,e.position.y);ctx.scale(1/m.scale,1/m.scale);ctx.fillStyle=selected?'#77a7ff':'#101318';ctx.strokeStyle='#fff';ctx.lineWidth=selected?3:2;ctx.beginPath();ctx.arc(0,0,selected?11:9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='700 11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),0,.5);ctx.restore();}
}
function currentRecord(){return {schema:'illustro.stroke-connectivity-human-evaluation.v2',recordId:state.sceneId,recordedAt:new Date().toISOString(),algorithmVersion:CONNECTIVITY_ALGORITHM_VERSION,environment:{userAgent:navigator.userAgent,devicePixelRatio:devicePixelRatio,viewport:[innerWidth,innerHeight],board:state.board},session:{strokeCount:state.strokes.length,endpointCount:state.graph.endpoints.length,truthFinalized:state.truthFinalized,reviewedAfterDrawing:els.reviewed.checked,inputCounts:{...state.inputCounts},automaticPreviewBeforeTruth:state.autoExposed},strokes:structuredClone(state.strokes),truthConnections:truthPairs(),graph:state.graph,metrics:state.truthFinalized?state.metrics:null};}
function saveScene(){if(!state.truthFinalized)return;const record=currentRecord(),i=state.archive.findIndex(r=>r.recordId===record.recordId);if(i>=0)state.archive[i]=record;else state.archive.push(record);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.archive));state.storageError=null;}catch(e){state.storageError=e.message;}updateUI();}
function exportJson(){
  const current=state.strokes.length?currentRecord():null,records=[...state.archive];if(current){const i=records.findIndex(r=>r.recordId===current.recordId);if(i>=0)records[i]=current;else records.push(current);}
  const metrics=aggregateConnectivityEvaluations(records.filter(r=>r.session.truthFinalized&&r.metrics).map(r=>r.metrics));
  const payload={schema:'illustro.stroke-connectivity-dataset.v2',exportedAt:new Date().toISOString(),algorithmVersion:CONNECTIVITY_ALGORITHM_VERSION,records,aggregate:metrics};
  const url=URL.createObjectURL(new Blob([`${JSON.stringify(payload,null,2)}\n`],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`illustro-connectivity-evaluation-${new Date().toISOString().replaceAll(':','-').slice(0,19)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);els.exportStatus.textContent=`${records.length}枚を書き出しました。採点済み ${metrics.sceneCount}枚。`;
}
try {const rows=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(!Array.isArray(rows))throw Error('invalid archive');state.archive=rows.map(r=>{if(!r.session?.truthFinalized||!r.session.reviewedAfterDrawing)throw Error('unreviewed archive');const graph=resolveStrokeConnectivity(r.strokes);return {...r,graph,algorithmVersion:CONNECTIVITY_ALGORITHM_VERSION,metrics:evaluateConnectivity(graph,r.truthConnections)};});}catch(e){state.storageError=e.message;}
for(const b of [els.drawMode,els.drawModeFooter])b.addEventListener('click',()=>setMode('draw'));for(const b of [els.truthMode,els.truthModeFooter])b.addEventListener('click',()=>setMode('truth'));
els.brushSize.addEventListener('input',()=>{els.brushValue.textContent=els.brushSize.value;});els.undoStroke.addEventListener('click',undoStroke);els.clearAll.addEventListener('click',clearAll);els.restoreClear.addEventListener('click',restoreClear);els.togglePair.addEventListener('click',()=>togglePair(els.endpointA.value,els.endpointB.value));els.reviewed.addEventListener('change',()=>{state.truthFinalized=false;state.metrics=null;updateUI();});
els.toggleSegment.addEventListener('click',()=>{try{const stroke=state.strokes.find(s=>s.strokeId===els.targetStroke.value);if(!stroke)throw Error('接続先の線を選んでください。');toggleSegment(els.segmentEndpoint.value,segmentTargetAtFraction(stroke,Number(els.targetFraction.value)/100));}catch(e){els.truthStatus.textContent='線の途中の位置は0%より大きく100%より小さい値にしてください。';}});
els.finalizeTruth.addEventListener('click',finalizeTruth);els.finalizeFooter.addEventListener('click',finalizeTruth);els.saveScene.addEventListener('click',saveScene);els.exportJson.addEventListener('click',exportJson);
for(const c of [els.showAuto,els.showTruth,els.showCandidates])c.addEventListener('change',()=>{if(!state.truthFinalized&&(els.showAuto.checked||els.showCandidates.checked)&&state.mode!=='truth')state.autoExposed=true;render();});
els.canvas.addEventListener('pointerdown',e=>{if(e.button>0||!e.isPrimary)return;e.preventDefault();if(state.mode==='draw')beginStroke(e);else toggleTruthEndpoint(e);});
els.canvas.addEventListener('pointermove',e=>{if(!state.activeStroke||e.pointerId!==state.pointerId)return;e.preventDefault();appendPointerSamples(e);render();});els.canvas.addEventListener('pointerup',e=>endStroke(e));els.canvas.addEventListener('pointercancel',e=>endStroke(e,true));els.canvas.addEventListener('lostpointercapture',e=>{if(state.activeStroke&&e.pointerId===state.pointerId)endStroke(e,true);});
const observer=new ResizeObserver(resizeCanvas);observer.observe(els.canvasShell);window.addEventListener('resize',resizeCanvas);window.addEventListener('orientationchange',()=>requestAnimationFrame(resizeCanvas));
window.__illustroConnectivityEval={getSnapshot:()=>({mode:state.mode,strokeCount:state.strokes.length,endpointCount:state.graph.endpoints.length,edgeCount:state.graph.edges.length,truthCount:state.truth.size+state.segmentTruth.size,truthFinalized:state.truthFinalized,metrics:state.metrics,graph:state.graph,board:state.board,archiveCount:state.archive.length,inputCounts:{...state.inputCounts},currentRecord:state.strokes.length?currentRecord():null})};
setMode('draw');updateSelectors();resizeCanvas();
