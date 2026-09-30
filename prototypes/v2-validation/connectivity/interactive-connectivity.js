import { CONNECTIVITY_ALGORITHM_VERSION, evaluateConnectivity, resolveStrokeConnectivity, aggregateConnectivityEvaluations, projectPointToStroke, segmentTargetAtFraction, connectionKey } from './endpoint-connectivity.js';
import { buildReviewDisplay, recordReview } from './review-display.js';
const ids=['canvas','canvasShell','hint','summary','drawMode','truthMode','drawModeFooter','truthModeFooter','brushSize','brushValue','brushCap','automaticList','undoStroke','clearAll','restoreClear','truthStatus','truthList','endpointA','endpointB','togglePair','segmentEndpoint','targetStroke','targetFraction','toggleSegment','reviewed','finalizeTruth','finalizeFooter','precisionMetric','recallMetric','f1Metric','exactMetric','falseMetric','missedMetric','showAuto','showTruth','showCandidates','exportJson','exportStatus','saveScene','archiveStatus','aggregateMetrics'];
ids.push('feedbackNote','nextTrial','connectionGroups','reviewStatus','advancedReview');
const els=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
const STORAGE_KEY='illustro-connectivity-evaluation-v2';
const DRAFT_KEY='illustro-connectivity-review-draft-v1';
const state={mode:'draw',strokes:[],activeStroke:null,graph:resolveStrokeConnectivity([]),truth:new Set(),segmentTruth:new Map(),selectedEndpoint:null,truthFinalized:false,metrics:null,startedAt:performance.now(),nextStrokeNumber:1,sceneId:crypto.randomUUID(),archive:[],clearBackup:null,board:null,pointerId:null,autoExposed:false,inputCounts:{trusted:0,untrusted:0,coalesced:0},storageError:null};
const pairKey=(a,b)=>a<b?`${a}|${b}`:`${b}|${a}`;
const percent=value=>Number.isFinite(value)?`${(100*value).toFixed(1)}%`:'—';
const truthPairs=()=>[...[...state.truth].map(key=>key.split('|')),...state.segmentTruth.values()];
state.display=buildReviewDisplay(state.graph);
state.note='';
state.reviewMessage='線とメモを一緒に記録します。';
state.draftError=null;
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
  try{els.canvas.setPointerCapture(event.pointerId);}catch{}updateUI();render();
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
  state.display=buildReviewDisplay(state.graph);
  state.truth=new Set([...state.truth].filter(key=>key.split('|').every(id=>valid.has(id))));
  state.segmentTruth=new Map([...state.segmentTruth].filter(([key,row])=>valid.has(row.endpointA)&&state.strokes.some(s=>s.strokeId===row.target.strokeId)));
  updateSelectors();updateUI();render();persistDraft();
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
function togglePair(a,b){if(!a||!b||a===b){els.truthStatus.textContent='異なる端点を2つ選んでください。';return;}const key=pairKey(a,b);state.truth.has(key)?state.truth.delete(key):state.truth.add(key);state.selectedEndpoint=null;invalidate();updateUI();render();persistDraft();}
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
function toggleSegment(endpointA,target){const source=state.graph.endpoints.find(e=>e.endpointId===endpointA);if(!source||source.strokeId===target.strokeId){els.truthStatus.textContent='端点がある線とは別の線を選んでください。';return;}const key=connectionKey(endpointA,target);state.segmentTruth.has(key)?state.segmentTruth.delete(key):state.segmentTruth.set(key,{endpointA,target:{kind:'segment',strokeId:target.strokeId,arcFraction:target.arcFraction}});state.selectedEndpoint=null;invalidate();updateUI();render();persistDraft();}
function finalizeTruth(){if(!state.graph.endpoints.length||!els.reviewed.checked)return;state.truthFinalized=true;state.metrics=evaluateConnectivity(state.graph,truthPairs());els.showAuto.checked=true;updateUI();render();persistDraft();}
function sceneBackup(){return {strokes:structuredClone(state.strokes),truth:[...state.truth],segmentTruth:[...state.segmentTruth],board:state.board,sceneId:state.sceneId,inputCounts:{...state.inputCounts},autoExposed:state.autoExposed,note:state.note};}
function undoStroke(){if(!state.strokes.length||state.activeStroke)return;state.clearBackup=sceneBackup();state.strokes.pop();invalidate();recompute();}
function clearAll(){
  if(!state.strokes.length||state.activeStroke)return;state.clearBackup=sceneBackup();
  state.strokes=[];state.activeStroke=null;state.pointerId=null;state.truth.clear();state.segmentTruth.clear();state.selectedEndpoint=null;state.nextStrokeNumber=1;state.sceneId=crypto.randomUUID();state.board=null;state.inputCounts={trusted:0,untrusted:0,coalesced:0};state.autoExposed=false;state.note='';els.feedbackNote.value='';els.showAuto.checked=true;els.showCandidates.checked=false;invalidate();setMode('draw');recompute();
}
function restoreClear(){if(!state.clearBackup||state.activeStroke)return;const b=state.clearBackup;const current=sceneBackup();state.strokes=b.strokes;state.truth=new Set(b.truth);state.segmentTruth=new Map(b.segmentTruth??[]);state.board=b.board;state.sceneId=b.sceneId??state.sceneId;state.inputCounts=b.inputCounts??state.inputCounts;state.autoExposed=b.autoExposed??state.autoExposed;state.note=b.note??'';els.feedbackNote.value=state.note;state.nextStrokeNumber=1+Math.max(0,...state.strokes.map(s=>Number(s.strokeId.split('-')[1])));state.clearBackup=current.strokes.length||current.note?current:null;invalidate();recompute();}
function updateUI(){
  const count=state.graph.endpoints.length;const existing=state.archive.findIndex(r=>r.recordId===state.sceneId);els.summary.textContent=`試験 ${existing>=0?existing+1:state.archive.length+1} / 線 ${state.strokes.length}本 / 端点 ${count}個 / 接続 ${state.display.groups.length}組`;
  els.hint.classList.toggle('hidden',!!state.strokes.length||!!state.activeStroke);els.undoStroke.disabled=!state.strokes.length||!!state.activeStroke;els.clearAll.disabled=!state.strokes.length||!!state.activeStroke;els.restoreClear.disabled=!state.clearBackup||!!state.activeStroke;els.nextTrial.disabled=!state.strokes.length||!!state.activeStroke;els.reviewStatus.textContent=state.reviewMessage;
  els.finalizeTruth.disabled=!count||!els.reviewed.checked||!!state.activeStroke;els.finalizeFooter.disabled=els.finalizeTruth.disabled;els.togglePair.disabled=count<2;els.toggleSegment.disabled=state.strokes.length<2;els.saveScene.disabled=!state.truthFinalized||!!state.activeStroke;els.exportJson.disabled=(!state.strokes.length&&!state.archive.length&&!state.note)||!!state.activeStroke;
  const name=labels();
  els.truthStatus.textContent=!count?'まず線を描いてください。':state.selectedEndpoint?`端点 ${name.get(state.selectedEndpoint)} を選択中。相手を選んでください。`:`つながっている端点を2つ順に選びます。現在 ${state.truth.size+state.segmentTruth.size}組。近すぎる端点は番号で指定できます。`;
  els.truthList.replaceChildren();for(const key of state.truth){const [a,b]=key.split('|'),button=document.createElement('button');button.type='button';button.className='button truth-pair';button.textContent=`${name.get(a)} ↔ ${name.get(b)} を解除`;button.addEventListener('click',()=>togglePair(a,b));els.truthList.append(button);}
  for(const [key,row] of state.segmentTruth){const button=document.createElement('button');button.type='button';button.className='button truth-pair';button.textContent=`${name.get(row.endpointA)} → ${row.target.strokeId} の ${(row.target.arcFraction*100).toFixed(1)}% を解除`;button.addEventListener('click',()=>{state.segmentTruth.delete(key);invalidate();updateUI();render();persistDraft();});els.truthList.append(button);}
  const m=state.metrics;els.precisionMetric.textContent=m?percent(m.precision):'—';els.recallMetric.textContent=m?percent(m.recall):'—';els.f1Metric.textContent=m?percent(m.f1):'—';els.exactMetric.textContent=m?(m.graphExactMatch?'一致':'不一致'):'—';els.falseMetric.textContent=m?String(m.falseConnection):'—';els.missedMetric.textContent=m?String(m.missedConnection):'—';
  const scored=state.archive.filter(r=>r.session?.truthFinalized&&r.metrics),aggregate=aggregateConnectivityEvaluations(scored.map(r=>r.metrics));els.archiveStatus.textContent=`記録済み ${state.archive.length}枚${state.storageError||state.draftError?'。このブラウザへの保存は失敗しました。JSONを書き出してください。':''}`;
  els.aggregateMetrics.textContent=scored.length?`採点済み ${scored.length}枚 / 正しくつないだ割合 ${percent(aggregate.precision)} / 見つけた割合 ${percent(aggregate.recall)} / 両方を合わせた値 ${percent(aggregate.f1)} / 全接続の一致 ${percent(aggregate.graphExactMatchRate)} / 誤接続 ${aggregate.falseConnection} / 見逃し ${aggregate.missedConnection}`:'自由なメモだけでは正解率を計算しません。必要な場合のみ、全接続の正解を指定して採点できます。';
  updateGroups();
  updateAutomaticList();
}
function edgeText(edge){const name=labels();return edge.to.kind==='segment'?`端点${name.get(edge.from.endpointId)} → 線${edge.to.strokeId.replace('stroke-','')}の途中 ${(edge.to.arcFraction*100).toFixed(1)}%`:`端点${name.get(edge.from.endpointId)} ↔ 端点${name.get(edge.to.endpointId)}`;}
function updateGroups(){
  els.connectionGroups.replaceChildren();
  for(const g of state.display.groups){const chip=document.createElement('div');chip.className='group-chip';chip.style.setProperty('--group-color',g.color);const title=document.createElement('b');title.textContent=`組${g.number}`;const dot=document.createElement('i');dot.setAttribute('aria-hidden','true');chip.append(dot,title,document.createTextNode('：'+g.edges.map(edgeText).join(' / ')));els.connectionGroups.append(chip);}
  if(!state.display.groups.length)els.connectionGroups.textContent=state.strokes.length?'自動でつないだ場所はありません。':'線を描くと、接続の組がここに表示されます。';
  if(state.display.ambiguous.length){const note=document.createElement('span');note.className='group-chip';note.textContent=`判断保留 ${state.display.ambiguous.length}件（？）`;els.connectionGroups.append(note);}
}
function line(ctx,a,b,stroke,width,dash=[]){ctx.save();ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();}
function drawStroke(ctx,s){if(!s?.points?.length)return;ctx.save();ctx.strokeStyle='#eef2f8';ctx.lineWidth=s.width;ctx.lineCap=s.cap;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(s.points[0].x,s.points[0].y);for(const p of s.points.slice(1))ctx.lineTo(p.x,p.y);if(s.points.length===1)ctx.lineTo(s.points[0].x+.001,s.points[0].y);ctx.stroke();ctx.restore();}
function updateAutomaticList(){
  els.automaticList.replaceChildren();for(const edge of state.graph.edges){const div=document.createElement('div');div.textContent=edgeText(edge)+(edge.geometry?.kind==='one-sided-extension'?'（片方の延長で届く交点）':edge.geometry?.kind==='direct-endpoint-link'?'（端点間を直線で接続）':'');els.automaticList.append(div);}if(!state.graph.edges.length)els.automaticList.textContent='自動で接続した場所はありません。';
}
function highlightAt(ctx,stroke,fraction,color,scale){
  if(!stroke)return;const p=stroke.points,dist=[0];for(let i=1;i<p.length;i++)dist.push(dist.at(-1)+Math.hypot(p[i].x-p[i-1].x,p[i].y-p[i-1].y));const total=dist.at(-1);if(!total)return;
  const at=total*fraction,extent=Math.max(18/scale,stroke.width*2),lo=Math.max(0,at-extent),hi=Math.min(total,at+extent);ctx.save();ctx.strokeStyle=color;ctx.lineWidth=Math.max(stroke.width,3/scale);ctx.lineCap=stroke.cap;ctx.lineJoin='round';ctx.beginPath();let begun=false;
  for(let i=1;i<p.length;i++){if(dist[i]<lo||dist[i-1]>hi)continue;const length=dist[i]-dist[i-1];if(!length)continue;const t0=Math.max(0,(lo-dist[i-1])/length),t1=Math.min(1,(hi-dist[i-1])/length);const a={x:p[i-1].x+(p[i].x-p[i-1].x)*t0,y:p[i-1].y+(p[i].y-p[i-1].y)*t0},b={x:p[i-1].x+(p[i].x-p[i-1].x)*t1,y:p[i-1].y+(p[i].y-p[i-1].y)*t1};if(!begun){ctx.moveTo(a.x,a.y);begun=true;}ctx.lineTo(b.x,b.y);}ctx.stroke();ctx.restore();
}
function drawSite(ctx,node,text,color,m,occupied){
  const x=node.position.x*m.scale,y=node.position.y*m.scale;ctx.font='700 14px system-ui';const width=Math.max(26,(ctx.measureText(text)?.width??text.length*8.5)+14),height=25;const maxX=(m.cssWidth-m.ox*2),maxY=(m.cssHeight-m.oy*2);let box;
  const free=b=>!occupied.some(o=>b.x<o.x+o.w+4&&b.x+b.w+4>o.x&&b.y<o.y+o.h+4&&b.y+b.h+4>o.y);
  for(const radius of [20,46,74,108]){for(const [dx,dy] of [[1,-1],[-1,-1],[1,1],[-1,1],[0,-1],[0,1],[1,0],[-1,0]]){const b={x:Math.max(2,Math.min(maxX-width-2,x+dx*radius-width/2)),y:Math.max(2,Math.min(maxY-height-2,y+dy*radius-height/2)),w:width,h:height};if(free(b)){box=b;break;}}if(box)break;}
  if(!box){for(let sy=2;sy<maxY-height;sy+=height+5){for(let sx=2;sx<maxX-width;sx+=width+5){const b={x:sx,y:sy,w:width,h:height};if(free(b)){box=b;break;}}if(box)break;}}
  box??={x:Math.max(2,Math.min(maxX-width-2,x-width/2)),y:Math.max(2,Math.min(maxY-height-2,y-height/2)),w:width,h:height};occupied.push(box);
  ctx.save();ctx.scale(1/m.scale,1/m.scale);line(ctx,{x,y},{x:box.x+width/2,y:box.y+height/2},color,1);ctx.fillStyle=color;ctx.beginPath();if(node.kind==='segment'){ctx.moveTo(x,y-6);ctx.lineTo(x+6,y);ctx.lineTo(x,y+6);ctx.lineTo(x-6,y);ctx.closePath();}else ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#10151d';ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.fillRect(box.x,box.y,width,height);ctx.strokeRect(box.x,box.y,width,height);ctx.fillStyle=color;ctx.font='700 14px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,box.x+width/2,box.y+height/2);ctx.restore();
}
function render(){
  const m=viewTransform(),ctx=els.canvas.getContext('2d');ctx.setTransform(m.dpr,0,0,m.dpr,0,0);ctx.clearRect(0,0,m.cssWidth,m.cssHeight);ctx.translate(m.ox,m.oy);ctx.scale(m.scale,m.scale);
  for(const s of state.strokes)drawStroke(ctx,s);drawStroke(ctx,state.activeStroke);
  const byId=new Map(state.graph.endpoints.map(e=>[e.endpointId,e]));
  // Automatic color preview is the default. Exposure is retained in exports;
  // optional complete-truth controls never pretend this was blind annotation.
  if(state.mode!=='truth'||state.truthFinalized){
    if(state.graph.endpoints.length&&!state.truthFinalized&&(els.showAuto.checked||els.showCandidates.checked))state.autoExposed=true;
    if(els.showCandidates.checked)for(const c of state.graph.candidates){if(c.connected||c.confidence<.35)continue;line(ctx,byId.get(c.endpointA).position,c.target.kind==='segment'?c.target.position:byId.get(c.endpointB).position,'#f2bd55',1.5/m.scale,[4/m.scale,5/m.scale]);}
    if(els.showAuto.checked)for(const g of state.display.groups){for(const n of g.members){const ep=byId.get(n.endpointId);highlightAt(ctx,state.strokes.find(s=>s.strokeId===n.strokeId),n.kind==='segment'?n.arcFraction:ep.end==='start'?0:1,g.color,m.scale);}for(const e of g.edges){const path=e.geometry?.path??[byId.get(e.from.endpointId).position,e.to.kind==='segment'?e.to.position:byId.get(e.to.endpointId).position];line(ctx,path[0],path[1],g.color,3/m.scale);}}
  }
  if(els.showTruth.checked)for(const key of state.truth){const [a,b]=key.split('|');line(ctx,byId.get(a).position,byId.get(b).position,'#55c8ff',2.5/m.scale,[7/m.scale,4/m.scale]);}
  if(els.showTruth.checked)for(const row of state.segmentTruth.values()){const stroke=state.strokes.find(s=>s.strokeId===row.target.strokeId),target=segmentTargetAtFraction(stroke,row.target.arcFraction);line(ctx,byId.get(row.endpointA).position,target.position,'#55c8ff',2.5/m.scale,[7/m.scale,4/m.scale]);ctx.save();ctx.strokeStyle='#55c8ff';ctx.lineWidth=2/m.scale;ctx.beginPath();ctx.arc(target.position.x,target.position.y,6/m.scale,0,2*Math.PI);ctx.stroke();ctx.restore();}
  const grouped=new Map(),occupied=[];
  if(els.showAuto.checked&&(state.mode!=='truth'||state.truthFinalized))for(const g of state.display.groups)for(const n of g.members)grouped.set(n.key,{...n,group:g});
  for(const [i,e] of state.graph.endpoints.entries()){const n=grouped.get(e.endpointId);drawSite(ctx,{kind:'endpoint',position:e.position},`${i+1}${n?'・組'+n.group.number:''}`,e.endpointId===state.selectedEndpoint?'#77a7ff':n?.group.color??'#e1e8f2',m,occupied);}
  for(const n of grouped.values())if(n.kind==='segment')drawSite(ctx,n,`線${n.strokeId.replace('stroke-','')} ${Math.round(n.arcFraction*100)}%・組${n.group.number}`,n.group.color,m,occupied);
  if(state.mode!=='truth')for(const c of state.display.ambiguous){const a=byId.get(c.endpointA),b=c.target.kind==='endpoint'?byId.get(c.target.endpointId).position:c.target.position;line(ctx,a.position,b,'#f2bd55',1.5/m.scale,[4/m.scale,4/m.scale]);ctx.save();ctx.fillStyle='#f2bd55';ctx.font=`700 ${15/m.scale}px system-ui`;ctx.fillText('?',(a.position.x+b.x)/2,(a.position.y+b.y)/2-8/m.scale);ctx.restore();}
}
function currentRecord(){return recordReview({schema:'illustro.stroke-connectivity-human-evaluation.v3',recordId:state.sceneId,recordedAt:new Date().toISOString(),algorithmVersion:CONNECTIVITY_ALGORITHM_VERSION,environment:{userAgent:navigator.userAgent,devicePixelRatio:devicePixelRatio,viewport:[innerWidth,innerHeight],board:state.board},session:{evaluationMode:state.truthFinalized?'complete-truth':'quick-review',strokeCount:state.strokes.length,endpointCount:state.graph.endpoints.length,truthFinalized:state.truthFinalized,reviewedAfterDrawing:els.reviewed.checked,inputCounts:{...state.inputCounts},automaticPreviewBeforeTruth:state.autoExposed},strokes:structuredClone(state.strokes),truthConnections:truthPairs(),graph:state.graph,metrics:state.truthFinalized?state.metrics:null},state.note,state.display);}
function storeRecord(){const record=currentRecord(),i=state.archive.findIndex(r=>r.recordId===record.recordId);if(i>=0)state.archive[i]=record;else state.archive.push(record);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.archive));state.storageError=null;return true;}catch(e){state.storageError=e.message;return false;}}
function saveScene(){if(!state.truthFinalized)return;storeRecord();persistDraft();updateUI();}
function nextTrial(){
  if(!state.strokes.length||state.activeStroke)return;
  if(!storeRecord()){state.reviewMessage='保存に失敗しました。線とメモはこの画面に残しています。「全試験を書き出す」で保存してください。';updateUI();return;}
  const number=state.archive.findIndex(r=>r.recordId===state.sceneId)+1;state.reviewMessage=`試験${number}を記録しました。次の線を描いてください。`;clearAll();els.canvasShell.focus({preventScroll:true});els.canvasShell.scrollIntoView({block:'start',behavior:'instant'});
}
function persistDraft(){
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify({schema:'illustro.connectivity-draft.v1',scene:sceneBackup(),clearBackup:state.clearBackup,truthFinalized:state.truthFinalized,reviewed:els.reviewed.checked,showAuto:els.showAuto.checked,reviewMessage:state.reviewMessage}));state.draftError=null;}catch(e){state.draftError=e.message;}
  els.archiveStatus.textContent=`記録済み ${state.archive.length}枚${state.storageError||state.draftError?'。このブラウザへの保存は失敗しました。JSONを書き出してください。':''}`;
}
function exportJson(){
  const current=state.strokes.length||state.note?currentRecord():null,records=[...state.archive];if(current){const i=records.findIndex(r=>r.recordId===current.recordId);if(i>=0)records[i]=current;else records.push(current);}
  const metrics=aggregateConnectivityEvaluations(records.filter(r=>r.session.truthFinalized&&r.metrics).map(r=>r.metrics));
  const payload={schema:'illustro.stroke-connectivity-dataset.v3',exportedAt:new Date().toISOString(),algorithmVersion:CONNECTIVITY_ALGORITHM_VERSION,records,aggregate:metrics,note:'Quick review notes are qualitative blocking-defect reports, not complete truth labels or precision/recall evidence.'};
  const url=URL.createObjectURL(new Blob([`${JSON.stringify(payload,null,2)}\n`],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`illustro-connectivity-evaluation-${new Date().toISOString().replaceAll(':','-').slice(0,19)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);els.exportStatus.textContent=`${records.length}枚を書き出しました。採点済み ${metrics.sceneCount}枚。`;
}
try {const rows=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');if(!Array.isArray(rows))throw Error('invalid archive');state.archive=rows.map(r=>{if(!Array.isArray(r.strokes))throw Error('invalid strokes');if(r.session?.truthFinalized&&r.session.reviewedAfterDrawing){const graph=resolveStrokeConnectivity(r.strokes);return {...r,graph,algorithmVersion:CONNECTIVITY_ALGORITHM_VERSION,metrics:evaluateConnectivity(graph,r.truthConnections)};}if(r.feedback?.kind==='qualitative-review')return {...r,metrics:null};throw Error('invalid archive record');});}catch(e){state.storageError=e.message;}
try {const draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');if(draft){const b=draft.scene;resolveStrokeConnectivity(b.strokes);state.strokes=b.strokes;state.truth=new Set(b.truth);state.segmentTruth=new Map(b.segmentTruth??[]);state.board=b.board;state.sceneId=b.sceneId;state.inputCounts=b.inputCounts;state.autoExposed=b.autoExposed;state.note=b.note??'';els.feedbackNote.value=state.note;state.clearBackup=draft.clearBackup??null;state.nextStrokeNumber=1+Math.max(0,...state.strokes.map(s=>Number(s.strokeId.split('-')[1])));state.truthFinalized=!!draft.truthFinalized;els.reviewed.checked=!!draft.reviewed;els.showAuto.checked=draft.showAuto!==false;state.reviewMessage=draft.reviewMessage??state.reviewMessage;state.graph=resolveStrokeConnectivity(state.strokes);state.display=buildReviewDisplay(state.graph);if(state.truthFinalized&&els.reviewed.checked)state.metrics=evaluateConnectivity(state.graph,truthPairs());}}catch(e){state.draftError=e.message;}
for(const b of [els.drawMode,els.drawModeFooter])b.addEventListener('click',()=>setMode('draw'));for(const b of [els.truthMode,els.truthModeFooter])b.addEventListener('click',()=>setMode('truth'));
els.brushSize.addEventListener('input',()=>{els.brushValue.textContent=els.brushSize.value;});els.undoStroke.addEventListener('click',undoStroke);els.clearAll.addEventListener('click',clearAll);els.restoreClear.addEventListener('click',restoreClear);els.togglePair.addEventListener('click',()=>togglePair(els.endpointA.value,els.endpointB.value));els.reviewed.addEventListener('change',()=>{state.truthFinalized=false;state.metrics=null;updateUI();persistDraft();});
els.toggleSegment.addEventListener('click',()=>{try{const stroke=state.strokes.find(s=>s.strokeId===els.targetStroke.value);if(!stroke)throw Error('接続先の線を選んでください。');toggleSegment(els.segmentEndpoint.value,segmentTargetAtFraction(stroke,Number(els.targetFraction.value)/100));}catch(e){els.truthStatus.textContent='線の途中の位置は0%より大きく100%より小さい値にしてください。';}});
els.finalizeTruth.addEventListener('click',finalizeTruth);els.finalizeFooter.addEventListener('click',finalizeTruth);els.saveScene.addEventListener('click',saveScene);els.exportJson.addEventListener('click',exportJson);
for(const c of [els.showAuto,els.showTruth,els.showCandidates])c.addEventListener('change',()=>{if(!state.truthFinalized&&(els.showAuto.checked||els.showCandidates.checked)&&state.mode!=='truth')state.autoExposed=true;render();});
els.feedbackNote.addEventListener('input',()=>{state.note=els.feedbackNote.value;persistDraft();els.exportJson.disabled=!state.strokes.length&&!state.archive.length&&!state.note;});els.nextTrial.addEventListener('click',nextTrial);
els.advancedReview.addEventListener('toggle',()=>{if(!els.advancedReview.open)setMode('draw');});
els.canvas.addEventListener('pointerdown',e=>{if(e.button>0||!e.isPrimary)return;e.preventDefault();if(state.mode==='draw')beginStroke(e);else toggleTruthEndpoint(e);});
els.canvas.addEventListener('pointermove',e=>{if(!state.activeStroke||e.pointerId!==state.pointerId)return;e.preventDefault();appendPointerSamples(e);render();});els.canvas.addEventListener('pointerup',e=>endStroke(e));els.canvas.addEventListener('pointercancel',e=>endStroke(e,true));els.canvas.addEventListener('lostpointercapture',e=>{if(state.activeStroke&&e.pointerId===state.pointerId)endStroke(e,true);});
const observer=new ResizeObserver(resizeCanvas);observer.observe(els.canvasShell);window.addEventListener('resize',resizeCanvas);window.addEventListener('orientationchange',()=>requestAnimationFrame(resizeCanvas));
window.__illustroConnectivityEval={getSnapshot:()=>({mode:state.mode,strokeCount:state.strokes.length,endpointCount:state.graph.endpoints.length,edgeCount:state.graph.edges.length,truthCount:state.truth.size+state.segmentTruth.size,truthFinalized:state.truthFinalized,metrics:state.metrics,graph:state.graph,display:state.display,note:state.note,board:state.board,archiveCount:state.archive.length,inputCounts:{...state.inputCounts},currentRecord:state.strokes.length||state.note?currentRecord():null})};
setMode('draw');updateSelectors();resizeCanvas();
