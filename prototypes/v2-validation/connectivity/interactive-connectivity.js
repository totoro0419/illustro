import {
  CONNECTIVITY_ALGORITHM_VERSION,
  evaluateConnectivity,
  resolveStrokeConnectivity,
} from './endpoint-connectivity.js';

const els = Object.fromEntries([
  'canvas','canvasShell','hint','summary','drawMode','truthMode','drawModeFooter','truthModeFooter',
  'brushSize','brushValue','undoStroke','clearAll','truthStatus','finalizeTruth','finalizeFooter',
  'precisionMetric','recallMetric','f1Metric','exactMetric','falseMetric','missedMetric',
  'showAuto','showTruth','showCandidates','exportJson','exportStatus',
].map(id=>[id,document.getElementById(id)]));

const state={
  mode:'draw',strokes:[],activeStroke:null,graph:resolveStrokeConnectivity([]),truth:new Set(),selectedEndpoint:null,
  truthFinalized:false,metrics:null,startedAt:performance.now(),pointerTypes:new Set(),nextStrokeNumber:1,
};
const pairKey=(a,b)=>a<b?`${a}|${b}`:`${b}|${a}`;
const clamp01=value=>Math.max(0,Math.min(1,value));
const percent=value=>Number.isFinite(value)?`${Math.round(clamp01(value)*100)}%`:'—';

function setMode(mode){
  state.mode=mode;state.selectedEndpoint=null;
  for(const button of [els.drawMode,els.drawModeFooter]) button.classList.toggle('active',mode==='draw');
  for(const button of [els.truthMode,els.truthModeFooter]) button.classList.toggle('active',mode==='truth');
  els.canvas.style.cursor=mode==='draw'?'crosshair':'pointer';updateTruthStatus();render();
}
function canvasMetrics(){
  const rect=els.canvas.getBoundingClientRect();const dpr=Math.max(1,Math.min(3,window.devicePixelRatio||1));
  return {rect,cssWidth:Math.max(1,rect.width),cssHeight:Math.max(1,rect.height),dpr};
}
function resizeCanvas(){
  const {cssWidth,cssHeight,dpr}=canvasMetrics();
  const width=Math.max(1,Math.round(cssWidth*dpr)),height=Math.max(1,Math.round(cssHeight*dpr));
  if(els.canvas.width!==width||els.canvas.height!==height){els.canvas.width=width;els.canvas.height=height} render();
}
function eventPoint(event){
  const {rect}=canvasMetrics();
  const pressure=Number.isFinite(event.pressure)&&event.pressure>0?clamp01(event.pressure):null;
  return {x:event.clientX-rect.left,y:event.clientY-rect.top,width:Number(els.brushSize.value),pressure,timestamp:performance.now(),pointerType:event.pointerType||'unknown'};
}
function appendPointerSamples(event){
  if(!state.activeStroke)return;
  const events=typeof event.getCoalescedEvents==='function'?event.getCoalescedEvents():[];
  const source=events.length?events:[event];
  for(const sample of source){
    const point=eventPoint(sample),last=state.activeStroke.points.at(-1);
    if(!last||Math.hypot(point.x-last.x,point.y-last.y)>=0.35)state.activeStroke.points.push(point);
  }
}
function beginStroke(event){
  const point=eventPoint(event);state.pointerTypes.add(point.pointerType);
  state.activeStroke={strokeId:`stroke-${state.nextStrokeNumber++}`,order:state.strokes.length,width:Number(els.brushSize.value),cap:'round',pointerType:point.pointerType,points:[point]};
  try{els.canvas.setPointerCapture(event.pointerId)}catch{} render();
}
function endStroke(event){
  if(!state.activeStroke)return;appendPointerSamples(event);
  if(state.activeStroke.points.length>=2)state.strokes.push(state.activeStroke);
  state.activeStroke=null;try{els.canvas.releasePointerCapture(event.pointerId)}catch{}
  state.truthFinalized=false;state.metrics=null;recompute();
}
function truthPairs(){return [...state.truth].map(key=>key.split('|'))}
function pruneTruth(){
  const valid=new Set(state.graph.endpoints.map(endpoint=>endpoint.endpointId));
  state.truth=new Set([...state.truth].filter(key=>key.split('|').every(id=>valid.has(id))));
  if(state.selectedEndpoint&&!valid.has(state.selectedEndpoint))state.selectedEndpoint=null;
}
function recompute(){
  state.graph=resolveStrokeConnectivity(state.strokes);pruneTruth();
  if(state.truthFinalized)state.metrics=evaluateConnectivity(state.graph,truthPairs());
  updateUI();render();
}
function endpointLabelMap(){return new Map(state.graph.endpoints.map((endpoint,index)=>[endpoint.endpointId,String(index+1)]))}
function hitEndpoint(point){
  const radius=20;let best=null;
  for(const endpoint of state.graph.endpoints){
    const d=Math.hypot(endpoint.position.x-point.x,endpoint.position.y-point.y);
    if(d<=radius&&(!best||d<best.distance))best={endpoint,distance:d};
  }
  return best?.endpoint??null;
}
function toggleTruthEndpoint(event){
  const point=eventPoint(event),endpoint=hitEndpoint(point);
  if(!endpoint){state.selectedEndpoint=null;updateTruthStatus();render();return}
  if(!state.selectedEndpoint)state.selectedEndpoint=endpoint.endpointId;
  else if(state.selectedEndpoint===endpoint.endpointId)state.selectedEndpoint=null;
  else{
    const key=pairKey(state.selectedEndpoint,endpoint.endpointId);
    state.truth.has(key)?state.truth.delete(key):state.truth.add(key);
    state.selectedEndpoint=null;state.truthFinalized=false;state.metrics=null;
  }
  updateUI();render();
}
function finalizeTruth(){
  if(!state.graph.endpoints.length)return;
  state.truthFinalized=true;state.metrics=evaluateConnectivity(state.graph,truthPairs());updateUI();render();
}
function undoStroke(){if(!state.strokes.length)return;state.strokes.pop();state.truthFinalized=false;state.metrics=null;recompute()}
function clearAll(){
  state.strokes=[];state.activeStroke=null;state.truth.clear();state.selectedEndpoint=null;state.truthFinalized=false;state.metrics=null;state.nextStrokeNumber=1;recompute();
}
function updateTruthStatus(){
  const labels=endpointLabelMap();
  if(!state.graph.endpoints.length){els.truthStatus.textContent='まず線を描いてください。';return}
  if(state.mode!=='truth'){els.truthStatus.textContent=`正解として指定済み: ${state.truth.size}組。必要なら「正解を指定」に切り替えてください。`;return}
  if(state.selectedEndpoint)els.truthStatus.textContent=`端点 ${labels.get(state.selectedEndpoint)} を選択中。つながる相手の端点をタップしてください。`;
  else els.truthStatus.textContent=`つながっている端点を2つ順にタップします。現在 ${state.truth.size}組を正解として指定しています。`;
}
function updateUI(){
  const strokeCount=state.strokes.length,endpointCount=state.graph.endpoints.length;
  els.summary.textContent=`線 ${strokeCount}本 / 端点 ${endpointCount}個 / 自動接続 ${state.graph.edges.length}個`;
  els.hint.classList.toggle('hidden',strokeCount>0||!!state.activeStroke);els.undoStroke.disabled=strokeCount===0;els.clearAll.disabled=strokeCount===0;
  els.finalizeTruth.disabled=endpointCount===0;els.finalizeFooter.disabled=endpointCount===0;els.exportJson.disabled=strokeCount===0;updateTruthStatus();
  const metrics=state.metrics;
  els.precisionMetric.textContent=metrics?percent(metrics.precision):'—';els.recallMetric.textContent=metrics?percent(metrics.recall):'—';els.f1Metric.textContent=metrics?percent(metrics.f1):'—';
  els.exactMetric.textContent=metrics?(metrics.graphExactMatch?'一致':'不一致'):'—';els.exactMetric.className=metrics?(metrics.graphExactMatch?'good':'warn'):'';
  els.falseMetric.textContent=metrics?String(metrics.falseConnection):'—';els.missedMetric.textContent=metrics?String(metrics.missedConnection):'—';
}
function drawLine(ctx,a,b,style){
  ctx.save();ctx.strokeStyle=style.stroke;ctx.globalAlpha=style.alpha??1;ctx.lineWidth=style.width??2;ctx.setLineDash(style.dash??[]);
  ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();
}
function renderStroke(ctx,stroke,active=false){
  if(!stroke?.points?.length)return;ctx.save();ctx.strokeStyle=active?'#ffffff':'#eef2f8';ctx.globalAlpha=active?1:.92;ctx.lineWidth=stroke.width;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(stroke.points[0].x,stroke.points[0].y);for(const point of stroke.points.slice(1))ctx.lineTo(point.x,point.y);
  if(stroke.points.length===1)ctx.lineTo(stroke.points[0].x+.01,stroke.points[0].y+.01);ctx.stroke();ctx.restore();
}
function endpointById(id){return state.graph.endpoints.find(endpoint=>endpoint.endpointId===id)}
function render(){
  const {cssWidth,cssHeight,dpr}=canvasMetrics(),ctx=els.canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssWidth,cssHeight);
  for(const stroke of state.strokes)renderStroke(ctx,stroke);if(state.activeStroke)renderStroke(ctx,state.activeStroke,true);
  if(els.showCandidates.checked)for(const candidate of state.graph.candidates){
    if(candidate.connected||candidate.confidence<.35)continue;const a=endpointById(candidate.endpointA),b=endpointById(candidate.endpointB);
    if(a&&b)drawLine(ctx,a.position,b.position,{stroke:'#f2bd55',width:1.5,alpha:.5,dash:[4,5]});
  }
  if(els.showAuto.checked)for(const edge of state.graph.edges){
    const a=endpointById(edge.from.endpointId),b=endpointById(edge.to.endpointId);if(a&&b)drawLine(ctx,a.position,b.position,{stroke:'#5be09a',width:4,alpha:.8});
  }
  if(els.showTruth.checked)for(const key of state.truth){
    const [aId,bId]=key.split('|'),a=endpointById(aId),b=endpointById(bId);if(a&&b)drawLine(ctx,a.position,b.position,{stroke:'#55c8ff',width:2.5,alpha:1,dash:[7,4]});
  }
  const labels=endpointLabelMap();
  for(const endpoint of state.graph.endpoints){
    const selected=endpoint.endpointId===state.selectedEndpoint;ctx.save();ctx.fillStyle=selected?'#77a7ff':'#101318';ctx.strokeStyle=selected?'#dce8ff':'#ffffff';ctx.lineWidth=selected?3:2;
    ctx.beginPath();ctx.arc(endpoint.position.x,endpoint.position.y,selected?11:9,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#ffffff';ctx.font='700 11px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(labels.get(endpoint.endpointId),endpoint.position.x,endpoint.position.y+.5);ctx.restore();
  }
}
function exportJson(){
  const payload={
    schema:'illustro.stroke-connectivity-human-evaluation.v1',exportedAt:new Date().toISOString(),algorithmVersion:CONNECTIVITY_ALGORITHM_VERSION,
    environment:{userAgent:navigator.userAgent,platform:navigator.platform,devicePixelRatio:window.devicePixelRatio||1,viewport:[window.innerWidth,window.innerHeight],pointerTypes:[...state.pointerTypes]},
    session:{elapsedMs:Math.round(performance.now()-state.startedAt),strokeCount:state.strokes.length,endpointCount:state.graph.endpoints.length,truthFinalized:state.truthFinalized},
    strokes:state.strokes,truthConnections:truthPairs(),graph:state.graph,metrics:state.truthFinalized?state.metrics:null,
  };
  const blob=new Blob([`${JSON.stringify(payload,null,2)}\n`],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`illustro-connectivity-evaluation-${new Date().toISOString().replaceAll(':','-').slice(0,19)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);
  els.exportStatus.textContent=state.truthFinalized?'採点結果を含めて書き出しました。':'正解はまだ確定していないため、採点前の記録として書き出しました。';
}
for(const button of [els.drawMode,els.drawModeFooter])button.addEventListener('click',()=>setMode('draw'));
for(const button of [els.truthMode,els.truthModeFooter])button.addEventListener('click',()=>setMode('truth'));
els.brushSize.addEventListener('input',()=>{els.brushValue.textContent=els.brushSize.value});els.undoStroke.addEventListener('click',undoStroke);els.clearAll.addEventListener('click',clearAll);
els.finalizeTruth.addEventListener('click',finalizeTruth);els.finalizeFooter.addEventListener('click',finalizeTruth);els.exportJson.addEventListener('click',exportJson);
for(const checkbox of [els.showAuto,els.showTruth,els.showCandidates])checkbox.addEventListener('change',render);
els.canvas.addEventListener('pointerdown',event=>{if(event.button>0||!event.isPrimary)return;event.preventDefault();if(state.mode==='draw')beginStroke(event);else toggleTruthEndpoint(event)});
els.canvas.addEventListener('pointermove',event=>{if(!state.activeStroke)return;event.preventDefault();appendPointerSamples(event);render()});
els.canvas.addEventListener('pointerup',event=>{if(!state.activeStroke)return;event.preventDefault();endStroke(event)});
els.canvas.addEventListener('pointercancel',event=>{if(!state.activeStroke)return;event.preventDefault();endStroke(event)});
const resizeObserver=new ResizeObserver(resizeCanvas);resizeObserver.observe(els.canvasShell);window.addEventListener('resize',resizeCanvas);window.addEventListener('orientationchange',()=>requestAnimationFrame(resizeCanvas));
window.__illustroConnectivityEval={getSnapshot:()=>({mode:state.mode,strokeCount:state.strokes.length,endpointCount:state.graph.endpoints.length,edgeCount:state.graph.edges.length,truthCount:state.truth.size,truthFinalized:state.truthFinalized,metrics:state.metrics,graph:state.graph})};
setMode('draw');updateUI();resizeCanvas();
