import {algorithm,correctSample,evaluateDab,makeSeed,mod,validateBrush} from './brush-engine.mjs';
import {Ink,composite,rasterize,tileBox,tileSize} from './brush-raster.mjs';
import {admit,PoseTimeline} from './stroke-input.mjs';
import {brushUI} from './brush-ui.mjs';
import {enableInputDiagnostics} from './input-diagnostics.mjs';
import {installColorPickers} from './color-pickers.mjs';
import {clamp,round,validateDocument,toPixels,hexToRgb,rgbToHex,hsvToRgb,rgbToHsv,hslToRgb,rgbToHsl,screenToDoc,docToScreen,zoomAt,History,createManifest,readManifest,flipAtDocumentCenter} from './model.mjs';
const $ = id => document.getElementById(id);
const all = q => [...document.querySelectorAll(q)];
const canvas = $('art'), preview=$('preview'), grid=$('grid'), paper=$('paper'), stage=$('stage');
let ctx=canvas.getContext('2d',{willReadFrequently:true}),pctx=preview.getContext('2d'),gctx=grid.getContext('2d');
canvas.style.visibility='hidden';
let rasterWorker=null,rasterSeq=0,strokeSerial=0,saveSerial=0;
const pendingSnapshots=new Map();
const useWorker=typeof Worker==='function'&&typeof OffscreenCanvas==='function';
if(useWorker){
 try{rasterWorker=new Worker(new URL('./raster-worker.mjs',import.meta.url),{type:'module'});}catch(err){console.warn('Illustro: Worker unavailable, synchronous raster fallback',err)}
}
function rasterFailure(message){
 workerFault=message;
 for(const request of pendingSnapshots.values())request.reject(Error(message));
 pendingSnapshots.clear();
 stage.dataset.rasterError=message;$('export-recovery').hidden=false;
 interruptStroke();
 dirty();
 notify('描画の確定を停止しました: '+message);
}
if(rasterWorker){
 rasterWorker.onmessage=({data:msg})=>{
  if(msg.epoch!==documentEpoch){msg.bitmap?.close();return}
  if(msg.type==='frame'){
   if(msg.seq===rasterSeq&&!workerFault){
    if(msg.box){
     const {x,y,w,h}=msg.box,columns=Math.ceil(doc.width/tileSize);
     ctx.clearRect(x,y,w,h);ctx.drawImage(msg.bitmap,x,y);
     for(let row=Math.floor(y/tileSize);row<Math.ceil((y+h)/tileSize);row++){
      for(let col=Math.floor(x/tileSize);col<Math.ceil((x+w)/tileSize);col++)repaint.add(row*columns+col);
     }
    }
    if(msg.stats){
     const latest=[...pendingInk.values()].at(-1);
     stage.dataset.rasterStats=JSON.stringify({...msg.stats,formalMs:latest?performance.now()-latest.acceptedAt:null});
    }
    lastFormal={strokes:archiveStrokes(),revision:history.revision};removePreviews();presentation();dirty();
    rasterWorker.postMessage({type:'presented',epoch:msg.epoch,seq:msg.seq});
   }
   msg.bitmap?.close();
  }else if(msg.type==='saved'){
   const request=pendingSnapshots.get(msg.requestId);
   if(request){pendingSnapshots.delete(msg.requestId);request.resolve(new Blob([msg.png],{type:'image/png'}))}
  }else if(msg.type==='error'){
   const request=pendingSnapshots.get(msg.requestId);
   if(request){pendingSnapshots.delete(msg.requestId);request.reject(Error(msg.message))}
   else if(msg.requestId==null)rasterFailure(msg.message);
  }
 };
 rasterWorker.onerror=()=>{rasterWorker.terminate();rasterWorker=null;rasterFailure('Workerが応答しなくなりました')};
}
function workerPNG(epoch){return new Promise((resolve,reject)=>{const requestId=++saveSerial;pendingSnapshots.set(requestId,{resolve,reject});rasterWorker.postMessage({type:'save',epoch,requestId})})}

let doc={name:'無題',author:'',description:'',width:1600,height:1200,dpi:300,profile:'srgb8',background:'white'};
let history=new History(),savedRev=-1,handle=null,documentEpoch=0,saveQueue=Promise.resolve(),active=null,nav=new Map(),gesture=null,view={x:0,y:0,scale:1,rotation:0,flipX:false,flipY:false};
let settings={tool:'gpen',size:12,opacity:1,flow:1,curve:1,fingerDraw:false,gestureUndo:true,color:[34,39,51],colorAlpha:1,previous:[0,0,0],lastBrush:'gpen'};
let templates=[];try{templates=JSON.parse(localStorage.getItem('illustro.templates.v1')||'[]')}catch{}
const isEraser=t=>brushes.get(t)?.blend==='erase';
let toastTimer, frame=0,gridPainted=false,colorPickers=null,pickerBefore=null,pickerPrevious=null;
function notify(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600)}
function dirty(){ stage.dataset.rasterPending=String(pendingInk.size);$('save-status').textContent=workerFault?'描画確定停止':pendingInk.size?'正式描画処理中…':savedRev===history.revision?'保存済み':'未保存';$('doc-title').textContent=doc.name+(savedRev===history.revision?'':' •');$('doc-dimensions').textContent=`${doc.width} × ${doc.height} px`;updateHistory() }
function updateHistory(){for(const b of all('[data-action=undo]')){b.disabled=!history.canUndo;b.title=history.canUndo?'Undo: '+history.undoName:'戻せません'}for(const b of all('[data-action=redo]')){b.disabled=!history.canRedo;b.title=history.canRedo?'Redo: '+history.redoName:'進めません'}}
function drawGrid(){if(gridPainted)return;gctx.clearRect(0,0,grid.width,grid.height);const show=grid.dataset.show==='1'&&view.scale>=6;if(!show)return;gridPainted=true;gctx.strokeStyle='#8994a560';gctx.lineWidth=1/Math.max(1,view.scale);gctx.beginPath();for(let x=0;x<=doc.width;x++){gctx.moveTo(x+.5,0);gctx.lineTo(x+.5,doc.height)}for(let y=0;y<=doc.height;y++){gctx.moveTo(0,y+.5);gctx.lineTo(doc.width,y+.5)}gctx.stroke()}
function renderView(){frame=0;const a=view.rotation*Math.PI/180, sx=view.scale*(view.flipX?-1:1),sy=view.scale*(view.flipY?-1:1);const co=Math.cos(a),si=Math.sin(a);paper.style.transform=`matrix(${co*sx},${si*sx},${-si*sy},${co*sy},${view.x},${view.y})`;$('zoom-readout').textContent=`${Math.round(view.scale*100)}% / ${Math.round(view.rotation)}°`;$('zoom-n').value=Math.round(view.scale*100);grid.style.display=grid.dataset.show==='1'&&view.scale>=6?'block':'none';if(grid.dataset.show==='1'&&view.scale>=6)drawGrid();
 if(!repeat){
  const corners=[[0,0],[doc.width,0],[doc.width,doc.height],[0,doc.height]];
  $('paper-shadow-polygon').setAttribute('points',corners.map(([x,y])=>{const p=docToScreen({x,y},view);return p.x+','+p.y}).join(' '));
 }
 renderRepeat();if(hover)showCursor(hover)}
function scheduleView(){poseTimeline.record(performance.now(),view,stage.getBoundingClientRect());if(!frame)frame=requestAnimationFrame(renderView)}
function fit(){const w=stage.clientWidth,h=stage.clientHeight;view={x:(w-Math.min(w/doc.width,h/doc.height)*doc.width*.88)/2,y:(h-Math.min(w/doc.width,h/doc.height)*doc.height*.88)/2,scale:clamp(Math.min(w/doc.width,h/doc.height)*.88,.05,4),rotation:0,flipX:false,flipY:false};scheduleView()}
function setDimensions(){gridPainted=false;for(const c of [canvas,preview,grid]){c.width=doc.width;c.height=doc.height;c.style.width=doc.width+'px';c.style.height=doc.height+'px'}paper.style.width=doc.width+'px';paper.style.height=doc.height+'px';paper.style.background=doc.background==='white'?'white':'transparent';$('checker').style.display=doc.background==='white'?'none':'block';ctx=canvas.getContext('2d',{willReadFrequently:true});pctx=preview.getContext('2d');gctx=grid.getContext('2d');$('meta-summary').textContent=`${doc.width} × ${doc.height}px / ${doc.dpi} DPI / sRGB 8bit`;dirty()}
function syncMeta(){for(const [id,key] of [['meta-name','name'],['meta-author','author'],['meta-description','description']])$(id).value=doc[key]}
function resetDoc(data){
 documentEpoch++;doc={...data};history=new History();savedRev=-1;handle=null;active=null;interrupted=null;workerFault=null;rasterSeq=0;priorStrokes=[];recoveryStrokes=[];lastFormal={strokes:[],revision:0};
 $('export-recovery').hidden=true;
 stage.removeAttribute('data-raster-error');stage.removeAttribute('data-raster-stats');$('interrupted-stroke').hidden=true;
 removePreviews();repaint.clear();clearTemporary();
 for(const request of pendingSnapshots.values())request.reject(Error('作品が切り替わりました'));
 pendingSnapshots.clear();setDimensions();
 if(rasterWorker)rasterWorker.postMessage({type:'reset',epoch:documentEpoch,width:doc.width,height:doc.height});
 syncMeta();fit();dirty();
}
function selectTool(name,collapse=true){
 const brush=brushes.get(name);
 if(!brush)return;
 settings.tool=name;if(!isEraser(name))settings.lastBrush=name;
 brushes.select(name);
 all('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===name));
 $('quick-tool').textContent=isEraser(name)?'◇':'✒';$('quick-tool').title=brush.name;
 updateToolStatus();
 if(collapse&&matchMedia('(max-width:720px)').matches)$('workspace').classList.add('collapsed');
}
function setColor(rgb,old=true){if(old)settings.previous=[...settings.color];settings.color=rgb.map(x=>clamp(Math.round(x),0,255));const hsv=rgbToHsv(settings.color),hsl=rgbToHsl(settings.color);$('hex').value=rgbToHex(settings.color);for(const [i,v] of [['r',rgb[0]],['g',rgb[1]],['b',rgb[2]],['h',round(hsv[0])],['hs',round(hsv[1]*100)],['v',round(hsv[2]*100)],['lh',round(hsl[0])],['ls',round(hsl[1]*100)],['l',round(hsl[2]*100)]])$(i).value=v;$('color-swatch').style.background=$('current-color').style.background=rgbToHex(settings.color);$('previous-color').style.background=rgbToHex(settings.previous);colorPickers?.reflect(hsv)}
const poseTimeline=new PoseTimeline();
const sensors={tilt:false,barrel:false,side:false,eraser:false};
const held=new Map(), pendingInk=new Map(), repaint=new Set();
let armed=null,toggled=null,interrupted=null,workerFault=null,inkFrame=0;
let repeat=false, hover=null, padBrushes=null, padStroke=null, priorStrokes=[], recoveryStrokes=[], lastFormal={strokes:[],revision:0};
const cursor=$('brush-cursor'), repeatView=$('repeat-view');

function presentation(){
 if(!repaint.size)return;
 for(const key of repaint){
  const box=tileBox(key,doc.width,doc.height);
  pctx.clearRect(box.x,box.y,box.w,box.h);
  pctx.drawImage(canvas,box.x,box.y,box.w,box.h,box.x,box.y,box.w,box.h);
  for(const candidate of [...pendingInk.values(),active,interrupted]){
   const tile=candidate?.visible&&candidate.ink.tiles.get(key);
   if(!tile)continue;
   pctx.save();
   const selection=candidate.stroke.selection;
   if(selection){
    pctx.beginPath();pctx.rect(selection.x,selection.y,selection.w,selection.h);pctx.clip();
   }
   composite(pctx,candidate.stroke,tile,box.x,box.y,selection?.alpha??1);
   pctx.restore();
  }
 }
 repaint.clear();
 renderRepeat();
}
function invalidate(candidate){
 for(const key of candidate.ink.tiles.keys())repaint.add(key);
}
function removePreviews(){
 for(const item of pendingInk.values()){
  item.visible=false;invalidate(item);
 }
 pendingInk.clear();
}
function renderRepeat(){
 if(!repeat)return;
 const ratio=Math.min(window.devicePixelRatio||1,2);
 const width=Math.max(1,Math.round(stage.clientWidth*ratio)), height=Math.max(1,Math.round(stage.clientHeight*ratio));
 if(repeatView.width!==width||repeatView.height!==height){repeatView.width=width;repeatView.height=height}
 const rc=repeatView.getContext('2d');
 rc.resetTransform();rc.clearRect(0,0,width,height);
 const angle=view.rotation*Math.PI/180,co=Math.cos(angle),si=Math.sin(angle);
 const x=view.scale*(view.flipX?-1:1)*ratio,y=view.scale*(view.flipY?-1:1)*ratio;
 rc.setTransform(co*x,si*x,-si*y,co*y,view.x*ratio,view.y*ratio);
 const corners=[[0,0],[width/ratio,0],[0,height/ratio],[width/ratio,height/ratio]].map(([x,y])=>screenToDoc({x,y},view));
 const left=Math.min(...corners.map(p=>p.x)),top=Math.min(...corners.map(p=>p.y));
 const w=Math.max(...corners.map(p=>p.x))-left,h=Math.max(...corners.map(p=>p.y))-top;
 if(doc.background==='white')rc.fillStyle='white';
 else rc.fillStyle='#f0f3f8';
 rc.fillRect(left,top,w,h);
 rc.fillStyle=rc.createPattern(preview,'repeat');rc.fillRect(left,top,w,h);
 rc.lineWidth=1.5/view.scale;rc.strokeStyle='#4169d7';rc.strokeRect(0,0,doc.width,doc.height);
}

function currentAction(){
 return [...held.values()].at(-1)||armed||toggled;
}
function updateToolStatus(){
 const action=currentAction();
 $('hold-eraser').setAttribute('aria-pressed',String(action==='erase'));
 $('tool-name').textContent=action==='erase'?'一時消しゴム':action==='pan'?'一時移動':action==='sample'?'一時採色':brushes.get(settings.tool).name;
 if(hover) showCursor(hover);
}
function clearTemporary(){
 held.clear();armed=null;toggled=null;updateToolStatus();
}
function updateSensorStatus(){
 $('button-capability').textContent='サイドボタン '+(sensors.side?'検出済み':'未検出')+'／後端消しゴム '+(sensors.eraser?'検出済み':'未検出');
}
function showCursor(e){
 if(!$('show-cursor').checked||e.pointerType==='touch'||nav.has(e.pointerId)){
  cursor.hidden=true;return;
 }
 const rect=stage.getBoundingClientRect(),input=brushes.input;
 const erase=currentAction()==='erase'||Boolean(e.buttons&32);
 const diameter=active?.stroke.size||(erase&&input.independent?input.eraserSize:settings.size);
 const size=clamp(diameter*view.scale,7,1800);
 Object.assign(cursor.style,{left:e.clientX-rect.left+'px',top:e.clientY-rect.top+'px',width:size+'px',height:size+'px'});
 cursor.title='基準径。変調、硬さ、散布で描画範囲が変わります';
 cursor.hidden=false;
}
function strokeSettings(brush,points,pen,erase=false,includeConstraints=true){
 const input=brushes.input,mode=brush.correction;
 const correction=mode==='global'?{...brushes.correction}:{mode,positionTau:brush.positionTau,speedTau:brush.speedTau,pressureTau:brush.pressureTau};
 const axis=$('brush-guide').value, guide=includeConstraints&&axis?{axis,coordinate:(axis==='x'?doc.width:doc.height)/2,strength:Number($('guide-strength').value)}:null;
 const selection=includeConstraints&&$('mask-enable').checked?{
  x:Math.floor(doc.width/4),y:Math.floor(doc.height/4),w:Math.ceil(doc.width/2),h:Math.ceil(doc.height/2),alpha:Number($('mask-alpha').value)
 }:null;
 return {algorithm,seed:makeSeed(),points,brush,correction,guide,selection,wrap:includeConstraints&&repeat,
  size:erase&&input.independent?input.eraserSize:settings.size,opacity:settings.opacity,flow:settings.flow,
  color:[...settings.color],colorAlpha:settings.colorAlpha,curve:settings.curve,pen};
}
function previewDabs(candidate,budget){
 const {stroke:s,ink}=candidate;
 while(budget.remaining>0&&performance.now()<budget.until){
  if(!candidate.dabs){
   if(candidate.previewIndex>=s.points.length)return;
   const current=s.points[candidate.previewIndex++];
   const filtered=correctSample(current,candidate.raw,candidate.filtered,s.correction);
   candidate.raw=current;candidate.filtered=filtered;
   const guide=s.guide,point={...filtered};
   if(guide)point[guide.axis]+=(guide.coordinate-point[guide.axis])*guide.strength;
   const from=candidate.previewPoint;
   point.distance=from?from.distance+Math.hypot(point.x-from.x,point.y-from.y):0;
   candidate.previewPoint=point;
   candidate.dabs=(function*(){
    if(!from){
     const dab=evaluateDab(s,point,null,candidate.previewCount++);
     candidate.nextDab=dab.spacing;yield dab;return;
    }
    while(candidate.nextDab<=point.distance&&point.distance>from.distance){
     const f=(candidate.nextDab-from.distance)/(point.distance-from.distance);
     const sample={...point,distance:candidate.nextDab,x:from.x+(point.x-from.x)*f,y:from.y+(point.y-from.y)*f,p:from.p+(point.p-from.p)*f};
     const dab=evaluateDab(s,sample,null,candidate.previewCount++);
     candidate.nextDab+=Math.max(.5,dab.spacing);yield dab;
    }
   })();
  }
  const next=candidate.dabs.next();
  if(next.done)candidate.dabs=null;
  else{ink.stamp(next.value);budget.remaining--}
 }
}
function queuePreview(){
 if(!inkFrame)inkFrame=requestAnimationFrame(()=>{
  inkFrame=0;
  const budget={remaining:120,until:performance.now()+5};
  // Live input is prioritized ahead of unfinished previews for older strokes.
  for(const candidate of [active,...pendingInk.values(),interrupted]){
   if(!candidate?.visible||candidate.previewFailed)continue;
   try{previewDabs(candidate,budget)}catch{candidate.previewFailed=true}

   for(const key of candidate.ink.changed)repaint.add(key);
   candidate.ink.changed.clear();
  }
  presentation();
  if([active,...pendingInk.values()].some(s=>s?.visible&&!s.previewFailed&&(s.dabs||s.previewIndex<s.stroke.points.length)))queuePreview();
 });
}
function beginStroke(e,erase=false){
 if(active||interrupted||workerFault)return;
 const point=poseTimeline.sample(e,sensors);
 if(!point)return;
 const brush=brushes.get(erase?brushes.input.eraser:settings.tool);
 const stroke=strokeSettings(brush,[point],e.pointerType==='pen',erase);
 if(e.altKey)stroke.guide=null;
 const ink=new Ink(stroke,doc.width,doc.height,true);
 active={id:e.pointerId,strokeId:++strokeSerial,stroke,ink,visible:true,previewIndex:0,previewCount:0,
  lastClient:{x:e.clientX,y:e.clientY},started:performance.now(),type:e.pointerType};
 queuePreview();
}
function addStroke(e,end=false){
 const s=active;
 if(!s||s.id!==e.pointerId)return;
 const points=s.stroke.points;
 s.lastClient={x:e.clientX,y:e.clientY};
 const coalesced=!end&&e.getCoalescedEvents?.();
 for(const event of coalesced?.length?coalesced:[e]){
  const point=poseTimeline.sample(event,sensors,end?points.at(-1).p:undefined);
  if(!admit(points,point)&&!point)recordInput('unknown-view-pose',event);
 }
 queuePreview();
 if(e.pointerType==='pen'){
  $('sensor-readout').textContent='筆圧 '+round(e.pressure,2)+'／傾き '+(sensors.tilt?e.tiltX+', '+e.tiltY:'未検出')+'／軸回転 '+(sensors.barrel?e.twist:'未検出');
  if(!$('input-wave').hidden){
   const wave=$('input-wave'),wc=wave.getContext('2d'),samples=points.slice(-wave.width);
   wc.clearRect(0,0,wave.width,wave.height);wc.beginPath();wc.strokeStyle='#345acc';
   samples.forEach((p,i)=>{const y=(1-p.p)*(wave.height-2)+1;if(i)wc.lineTo(i,y);else wc.moveTo(i,y)});wc.stroke();
  }
 }
}
function commitStroke(candidate=active){
 if(!candidate||workerFault)return;
 if(candidate===active)active=null;
 const {stroke,strokeId}=candidate;
 const action={label:stroke.brush.name,kind:'pixels',strokeId,stroke};
 if(rasterWorker){
  history.accept(action);pendingInk.set(strokeId,candidate);
  candidate.acceptedAt=performance.now();
  rasterWorker.postMessage({type:'stroke',seq:++rasterSeq,epoch:documentEpoch,stroke});
 }else{
  try{
   const {ink}=rasterize(stroke,doc.width,doc.height);
   action.patches=[];
   for(const [key,tile] of ink.tiles){
    const box=tileBox(key,doc.width,doc.height);
    const before=ctx.getImageData(box.x,box.y,box.w,box.h);
    const patch={key,box,before};action.patches.push(patch);
    composite(ctx,stroke,tile,box.x,box.y);
    patch.after=ctx.getImageData(box.x,box.y,box.w,box.h);repaint.add(key);
   }
   history.accept(action);
  }catch(err){
   for(const {box,before} of action.patches||[])ctx.putImageData(before,box.x,box.y);
   interrupted=candidate;$('interrupted-stroke').hidden=false;
   notify('筆の確定に失敗: '+err.message);
  }
  if(!interrupted){candidate.visible=false;invalidate(candidate)}
 }
 queuePreview();dirty();
}
function interruptStroke(){
 if(active){interrupted=active;active=null;$('interrupted-stroke').hidden=false;queuePreview()}
 clearTemporary();
}
function resolveInterruption(keep){
 if(!interrupted)return;
 const candidate=interrupted;interrupted=null;$('interrupted-stroke').hidden=true;
 if(keep&&workerFault){interrupted=candidate;$('interrupted-stroke').hidden=false;notify('救出ボタンで確定画像と筆を出力できます');return}
 if(keep)commitStroke(candidate);
 else{candidate.visible=false;invalidate(candidate);presentation()}
}
function applyAction(action,isUndo){
 if(!action)return;
 if(action.kind==='pixels'){
  if(rasterWorker){
   const candidate=pendingInk.get(action.strokeId);
   if(candidate){candidate.visible=!isUndo;invalidate(candidate);presentation()}
   rasterWorker.postMessage({type:isUndo?'undo':'redo',seq:++rasterSeq,epoch:documentEpoch});
  }else{
   for(const {key,box,before,after} of action.patches){
    ctx.putImageData(isUndo?before:after,box.x,box.y);repaint.add(key);
   }
   presentation();
  }
 }else if(action.kind==='meta'){doc=structuredClone(isUndo?action.before:action.after);syncMeta()}
 dirty();
}
function undo(){if(workerFault||interrupted)return;if(active){interruptStroke();return}applyAction(history.undo(),true)}
function redo(){if(workerFault||interrupted)return;if(active){interruptStroke();return}applyAction(history.redo(),false)}
function pinchReset(){const ps=[...nav.values()];if(!ps.length){gesture=null;return}const mid=ps.reduce((a,p)=>({x:a.x+p.x,y:a.y+p.y}),{x:0,y:0});mid.x/=ps.length;mid.y/=ps.length;const rect=stage.getBoundingClientRect(),local={x:mid.x-rect.left,y:mid.y-rect.top};let dist=1,ang=0;if(ps.length>1){dist=Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y)||1;ang=Math.atan2(ps[1].y-ps[0].y,ps[1].x-ps[0].x)}gesture={start:local,origin:{...view},docPoint:screenToDoc(local,view),dist,ang}}
const recordInput=enableInputDiagnostics(stage,()=>({nav:nav.size,active:active?.id??null}));
function addNav(e){
 nav.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,started:performance.now(),type:e.pointerType});
 pinchReset();
}
function sampleColor(e){
 const point=poseTimeline.sample(e,sensors);
 if(!point)return;
 const x=Math.floor(repeat?mod(point.x,doc.width):point.x),y=Math.floor(repeat?mod(point.y,doc.height):point.y);
 if(x<0||y<0||x>=doc.width||y>=doc.height)return;
 const [r,g,b,a]=pctx.getImageData(x,y,1,1).data;
 if(a)setColor([r,g,b]);
 else if(doc.background==='white')setColor([255,255,255]);
}
function updatePenButtons(e){
 if(e.pointerType!=='pen')return;
 if((e.buttons&2)||e.button===2){
  if(!sensors.side){sensors.side=true;updateSensorStatus()}
  const {side,sideMode}=brushes.input;
  if(side!=='none'&&!held.has('barrel-edge')){
   held.set('barrel-edge',null);
   if(sideMode==='hold')held.set('barrel-action',side);
   if(sideMode==='once')armed=side;
   if(sideMode==='toggle')toggled=toggled===side?null:side;
   updateToolStatus();
  }
 }else if(held.has('barrel-edge')){
  held.delete('barrel-edge');held.delete('barrel-action');updateToolStatus();
 }
 if((e.buttons&32)||e.button===5){
  if(!sensors.eraser){sensors.eraser=true;updateSensorStatus()}
 }
}
function pointerDown(e){
 if(e.pointerType==='touch')recordInput('stage-touch-down',e);
 updatePenButtons(e);
 // A barrel-only press changes the temporary tool without drawing a tap.
 if(e.button===2||e.button>0&&![1,5].includes(e.button))return;
 if(e.pointerType==='touch'&&brushes.input.palm&&active?.type==='pen'&&Math.min(e.width,e.height)>=32){
  recordInput('palm-wide-contact',e);return;
 }
 stage.focus({preventScroll:true});
 try{stage.setPointerCapture(e.pointerId)}catch{}
 const touch=e.pointerType==='touch';
 if(touch&&active?.type==='touch'&&!nav.size){
  const first=active, p=first.lastClient;
  first.visible=false;invalidate(first);active=null;
  nav.set(first.id,{x:p.x,y:p.y,startX:p.x,startY:p.y,started:first.started,type:'touch'});
  presentation();
 }
 const temporary=touch&&active?.type==='pen'?null:currentAction();
 const action=e.pointerType==='pen'&&((e.buttons&32)||e.button===5)?'erase':temporary||
  (e.button===1||touch&&(nav.size>0||active)?'pan':brushes.input[e.pointerType]||'draw');
 if(temporary&&armed){armed=null;updateToolStatus()}
 if(action==='pan')addNav(e);
 else if(action==='sample')sampleColor(e);
 else beginStroke(e,action==='erase');
}
function pointerMove(e){
 updatePenButtons(e);
 hover=e;showCursor(e);
 if(nav.has(e.pointerId)){
  if(e.pointerType==='touch')recordInput('nav-move',e);
  const p=nav.get(e.pointerId);p.x=e.clientX;p.y=e.clientY;
  if(!gesture)pinchReset();
  const ps=[...nav.values()],rect=stage.getBoundingClientRect();
  const mid=ps.reduce((a,p)=>({x:a.x+p.x,y:a.y+p.y}),{x:0,y:0});
  mid.x=mid.x/ps.length-rect.left;mid.y=mid.y/ps.length-rect.top;
  let factor=1,rotate=0;
  if(ps.length>1){
   factor=(Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y)||1)/gesture.dist;
   rotate=(Math.atan2(ps[1].y-ps[0].y,ps[1].x-ps[0].x)-gesture.ang)*180/Math.PI;
  }
  view={...gesture.origin,scale:clamp(gesture.origin.scale*factor,.05,64),rotation:gesture.origin.rotation+rotate};
  const transformed=docToScreen(gesture.docPoint,{...view,x:0,y:0});
  view.x=mid.x-transformed.x;view.y=mid.y-transformed.y;scheduleView();return;
 }
 if(active?.id===e.pointerId){
  if(e.pointerType==='pen'&&!(e.buttons&33)){interruptStroke();return}
  addStroke(e);
 }
}
function pointerUp(e,forcedCancel=false){
 const cancelled=forcedCancel||e.type==='pointercancel';
 if(e.pointerType==='pen')recordInput(cancelled?'pen-cancel':'pen-up',e);
 if(nav.has(e.pointerId)){
  const p=nav.get(e.pointerId),tap=Math.hypot(p.x-p.startX,p.y-p.startY)<12&&performance.now()-p.started<260;
  const count=nav.size;nav.delete(e.pointerId);
  if(!cancelled&&tap&&count>=2&&settings.gestureUndo&&!active){if(count>=3)redo();else undo()}
  pinchReset();
 }else if(active?.id===e.pointerId){
  if(cancelled)interruptStroke();
  else if(e.button!==2){addStroke(e,true);commitStroke()}
 }
 if(cancelled)clearTemporary();
 else updatePenButtons(e);
 try{if(stage.hasPointerCapture(e.pointerId)&&e.button!==2)stage.releasePointerCapture(e.pointerId)}catch{}
}
function interruptInput(){
 interruptStroke();nav.clear();gesture=null;hover=null;cursor.hidden=true;
}
stage.addEventListener('pointerdown',pointerDown);
stage.addEventListener('pointermove',pointerMove);
stage.addEventListener('pointerup',pointerUp);
stage.addEventListener('pointercancel',pointerUp);
stage.addEventListener('lostpointercapture',e=>{if(active?.id===e.pointerId||nav.has(e.pointerId))pointerUp(e,true)});
stage.addEventListener('pointerleave',()=>{hover=null;cursor.hidden=true});
window.addEventListener('blur',interruptInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)interruptInput()});
stage.addEventListener('contextmenu',e=>e.preventDefault());
stage.addEventListener('wheel',e=>{
 e.preventDefault();const r=stage.getBoundingClientRect();
 view=zoomAt(view,Math.exp(-e.deltaY*.001),{x:e.clientX-r.left,y:e.clientY-r.top});scheduleView();
},{passive:false});
const pads=[$('pad-before'),$('pad-after')];
const clearPad=()=>{
 padStroke=null;
 for(const pad of pads)pad.getContext('2d').clearRect(0,0,pad.width,pad.height);
};
const brushes=brushUI({notify,onSelect:selectTool,onPad:read=>{padBrushes=read},clearPad,sensors});
function drawPad(){
 if(!padStroke)return;
 const {points,brushes:comparison,pen,seed}=padStroke;
 for(const [index,pad] of pads.entries()){
  const stroke=strokeSettings(comparison[index],points,pen,false,false);
  stroke.seed=seed;stroke.size=Math.min(stroke.size,72);
  const context=pad.getContext('2d');
  context.clearRect(0,0,pad.width,pad.height);
  try{
   const {ink}=rasterize(stroke,pad.width,pad.height);
   for(const [key,tile] of ink.tiles){
    const box=tileBox(key,pad.width,pad.height);
    composite(context,stroke.brush.blend==='erase'?{...stroke,brush:{...stroke.brush,blend:'over'}}:stroke,tile,box.x,box.y);
   }
  }catch(error){$('brush-error').textContent=error.message}
 }
}
const pad=pads[1];
function padPoint(e){
 const r=pad.getBoundingClientRect();
 return {x:(e.clientX-r.left)*pad.width/r.width,y:(e.clientY-r.top)*pad.height/r.height,t:e.timeStamp,
  p:e.pointerType==='pen'&&e.type!=='pointerup'?e.pressure:padStroke?.points.at(-1)?.p??1,tiltX:null,tiltY:null,azimuth:null,twist:null};
}
pad.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 const comparison=padBrushes?.();
 if(!comparison)return;
 padStroke={id:e.pointerId,points:[padPoint(e)],brushes:comparison,pen:e.pointerType==='pen',seed:makeSeed()};
 try{pad.setPointerCapture(e.pointerId)}catch{}
});
pad.addEventListener('pointermove',e=>{
 if(padStroke?.id===e.pointerId&&e.buttons)admit(padStroke.points,padPoint(e));
});
pad.addEventListener('pointerup',e=>{
 if(padStroke?.id!==e.pointerId)return;
 admit(padStroke.points,padPoint(e));drawPad();padStroke=null;
});
pad.addEventListener('pointercancel',()=>{padStroke=null});
pad.addEventListener('keydown',e=>{
 if(e.key!=='Enter')return;
 const comparison=padBrushes?.();
 if(!comparison)return;
 padStroke={brushes:comparison,pen:true,seed:makeSeed(),points:Array.from({length:42},(_,i)=>({
  x:18+i*5,y:52+Math.sin(i/8)*23,t:i*10,p:.18+.8*Math.sin(i/42*Math.PI),tiltX:null,tiltY:null,azimuth:null,twist:null
 }))};
 drawPad();padStroke=null;
});
$('repeat-draw').onchange=e=>{
 repeat=e.target.checked;repeatView.hidden=!repeat;paper.style.visibility=repeat?'hidden':'visible';$('paper-shadow').style.visibility=repeat?'hidden':'visible';scheduleView();
};
$('wave-enable').onchange=e=>{$('input-wave').hidden=!e.target.checked};
$('show-cursor').onchange=()=>{if(hover)showCursor(hover)};
$('recover-stroke').onclick=()=>resolveInterruption(true);
$('discard-stroke').onclick=()=>resolveInterruption(false);
const holdEraser=$('hold-eraser');
const hold=(key,action)=>{held.set(key,action);updateToolStatus()};
const release=key=>{held.delete(key);updateToolStatus()};
holdEraser.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 e.preventDefault();holdEraser.setPointerCapture(e.pointerId);hold('onscreen','erase');
});
for(const type of ['pointerup','pointercancel','lostpointercapture']) holdEraser.addEventListener(type,()=>release('onscreen'));
holdEraser.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();e.stopPropagation();hold('onscreen','erase')}});
holdEraser.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter')release('onscreen')});
holdEraser.addEventListener('blur',()=>release('onscreen'));
function initSizeControls(id,field,min,max,numberId=null){const range=$(id),number=$(numberId||id+'-n');const fn=(v)=>{const n=Number(v);if(!Number.isFinite(n))return;const bounded=clamp(n,min,max);settings[field]=field==='size'?bounded:bounded/100;range.value=bounded;if(number)number.value=bounded;if(id==='size'){$('quick-size').value=clamp(bounded,1,200);$('quick-size-value').textContent=bounded;if(hover)showCursor(hover)}};range.addEventListener('input',e=>fn(e.target.value));if(number)number.addEventListener('change',e=>fn(e.target.value));return fn}
const changeSize=initSizeControls('size','size',1,300);initSizeControls('opacity','opacity',0,100);initSizeControls('flow','flow',0,100);$('quick-size').addEventListener('input',e=>changeSize(e.target.value));$('pressure-curve').addEventListener('input',e=>{settings.curve=Number(e.target.value)/100;$('pressure-curve-value').textContent=settings.curve.toFixed(2)});$('tap-gesture').addEventListener('change',e=>settings.gestureUndo=e.target.checked);
$('hex').addEventListener('change',e=>{try{setColor(hexToRgb(e.target.value))}catch(err){notify(err.message);setColor(settings.color,false)}});
for(const id of ['r','g','b'])$(id).addEventListener('change',()=>setColor(['r','g','b'].map(q=>Number($(q).value))));for(const id of ['h','hs','v'])$(id).addEventListener('change',()=>setColor(hsvToRgb(Number($('h').value),Number($('hs').value)/100,Number($('v').value)/100)));for(const id of ['lh','ls','l'])$(id).addEventListener('change',()=>setColor(hslToRgb(Number($('lh').value),Number($('ls').value)/100,Number($('l').value)/100)));$('color-alpha').addEventListener('change',e=>settings.colorAlpha=clamp(Number(e.target.value)/100,0,1));
colorPickers=installColorPickers({
 getColor:()=>settings.color,
 preview:rgb=>setColor(rgb,false),
 begin:()=>{pickerBefore=[...settings.color];pickerPrevious=[...settings.previous]},
 commit:()=>{if(pickerBefore){settings.previous=pickerBefore;pickerBefore=null;pickerPrevious=null;setColor(settings.color,false)}},
 cancel:()=>{if(pickerBefore){const original=pickerBefore,old=pickerPrevious;pickerBefore=null;pickerPrevious=null;settings.previous=old;setColor(original,false)}}
});
colorPickers.reflect(rgbToHsv(settings.color));
function allowDocumentChange(){if(workerFault&&interrupted){notify('中断した筆を救出または取り消してください');return false}if(active)interruptStroke();if(interrupted){notify('中断した筆を処理してから作品を切り替えてください');return false}return true}
function showDialog(){if(!allowDocumentChange())return;refreshTemplates();$('dialog-backdrop').hidden=false;$('new-name').focus()}function closeDialog(){$('dialog-backdrop').hidden=true}
function refreshTemplates(){const select=$('new-template');select.innerHTML='<option value="">選択しない</option>';templates.forEach((t,i)=>{const op=document.createElement('option');op.value=String(i);op.textContent=t.name+` (${t.width}×${t.height})`;select.appendChild(op)})}
$('new-template').addEventListener('change',e=>{const t=templates[Number(e.target.value)];if(e.target.value===''||!t)return;$('new-name').value=t.name;$('new-width').value=t.width;$('new-height').value=t.height;$('new-unit').value='px';$('new-dpi').value=t.dpi;$('new-bg').value=t.background});$('new-unit').addEventListener('change',()=>{$('new-error').textContent='単位を切り替えました。入力値は自動換算されません。'});
$('new-dialog').addEventListener('submit',e=>{e.preventDefault();try{const dpi=Number($('new-dpi').value),unit=$('new-unit').value,width=toPixels(Number($('new-width').value),unit,dpi),height=toPixels(Number($('new-height').value),unit,dpi);validateDocument(width,height,dpi);if(history.revision!==savedRev&&history.canUndo&&!confirm('未保存の変更があります。新規作品を作りますか？'))return;resetDoc({name:$('new-name').value||'無題',author:'',description:'',width,height,dpi,profile:'srgb8',background:$('new-bg').value});closeDialog();notify('新しい作品を作成しました')}catch(err){$('new-error').textContent=err.message}});$('dialog-close').onclick=$('new-cancel').onclick=closeDialog;
function applyMeta(){const next={...doc,name:$('meta-name').value||'無題',author:$('meta-author').value,description:$('meta-description').value};if(JSON.stringify(doc)===JSON.stringify(next))return;history.accept({kind:'meta',label:'作品情報',before:structuredClone(doc),after:structuredClone(next)});doc=next;dirty()}
function addTemplate(){const t={name:doc.name,width:doc.width,height:doc.height,dpi:doc.dpi,background:doc.background,profile:'srgb8'};templates.push(t);try{localStorage.setItem('illustro.templates.v1',JSON.stringify(templates))}catch{notify('テンプレートの保存に失敗しました');return}notify('寸法・DPI・背景のみテンプレートに保存しました')}
function archiveStrokes(){
 return [...priorStrokes,...history.items.slice(0,history.index).filter(a=>a.kind==='pixels').map(a=>a.stroke)];
}
function blobDataURL(blob){
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||Error('PNG読込失敗'));reader.readAsDataURL(blob)});
}
function downloadNative(contents,filename){
 const data=new Blob([contents],{type:'application/json'}),url=URL.createObjectURL(data),link=document.createElement('a');
 link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
$('export-recovery').onclick=async()=>{
 try{
  const frozen=document.createElement('canvas');frozen.width=doc.width;frozen.height=doc.height;
  frozen.getContext('2d').drawImage(canvas,0,0);
  const {strokes,revision}=lastFormal,meta={...doc};
  const pending=[...recoveryStrokes,...[...pendingInk.values()].filter(item=>item.visible).map(item=>item.stroke)];
  if(interrupted)pending.push(interrupted.stroke);
  const blob=await new Promise((resolve,reject)=>frozen.toBlob(b=>b?resolve(b):reject(Error('PNG生成失敗')),'image/png'));
  const recovery=createManifest(meta,await blobDataURL(blob),revision,strokes);
  recovery.brushArchive.recovery=pending;
  downloadNative(JSON.stringify(recovery),'illustro-recovery.illustro');
  notify('確定画像と未確定の筆を分けてダウンロードします');
 }catch(error){notify('救出に失敗: '+error.message)}
};
async function save(as=false){
 if(active)interruptStroke();
 if(interrupted||workerFault){notify('描画の中断を解消してから保存してください');return}
 const strokeArchive=archiveStrokes(),recoveryAtFence=[...recoveryStrokes];
 const revision=history.revision,epoch=documentEpoch,meta=structuredClone(doc);
 // Capture the exact accepted raster at request time before any await; encode asynchronously.
 let frozen,picker=null;
 try{
  const pngPromise=rasterWorker?workerPNG(epoch):null;
  if(!rasterWorker){frozen=document.createElement('canvas');frozen.width=meta.width;frozen.height=meta.height;frozen.getContext('2d').drawImage(canvas,0,0);}
  const filename=meta.name.replace(/[\\/:*?"<>|]/g,'_')+'.illustro';
  const hasPicker=typeof window.showSaveFilePicker==='function';
  // File picker must start synchronously inside the user's click activation.
  if(hasPicker){picker=(!as&&handle)?Promise.resolve(handle):window.showSaveFilePicker({suggestedName:filename,types:[{description:'Illustro Native',accept:{'application/json':['.illustro']}}]});picker.catch(()=>{});}
  $('save-status').textContent='保存データを準備中…';
  const blob=pngPromise?await pngPromise:await new Promise((resolve,reject)=>frozen.toBlob(b=>b?resolve(b):reject(new Error('PNG生成に失敗')),'image/png'));
  const png=await blobDataURL(blob);
  const manifest=createManifest(meta,png,revision,strokeArchive);
  if(recoveryAtFence.length)manifest.brushArchive.recovery=recoveryAtFence;
  const contents=JSON.stringify(manifest);
  if(hasPicker){
   const dest=await picker;
   // Serialize writes: older Save requests cannot finish after newer ones on the same target.
   const operation=saveQueue.catch(()=>{}).then(async()=>{const writer=await dest.createWritable();try{await writer.write(contents);await writer.close()}catch(error){await writer.abort().catch(()=>{});throw error}});
   saveQueue=operation;await operation;
   if(epoch===documentEpoch){handle=dest;savedRev=revision;dirty()}
   notify('保存完了');
  }else{
   downloadNative(contents,filename);
   if(epoch===documentEpoch)dirty();notify('ネイティブ作品のダウンロードを開始（完了は未確認）');
  }
 }catch(err){if(epoch===documentEpoch)dirty();if(err.name==='AbortError'){notify('保存をキャンセルしました');return}notify('保存に失敗: '+err.message)}
}
async function open(file){if(!file||!allowDocumentChange())return;const epoch=documentEpoch,revision=history.revision;if(history.revision!==savedRev&&history.canUndo&&!confirm('未保存の作品を破棄して開きますか？'))return;try{const json=readManifest(await file.text());const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('レイヤー画像を解読できません'));img.src=json.layers[0].png});if(img.width!==json.document.width||img.height!==json.document.height)throw new Error('レイヤー寸法が一致しません');if(epoch!==documentEpoch||revision!==history.revision||!allowDocumentChange())throw Error('読み込み中に作品が変わりました');resetDoc(json.document);priorStrokes=json.brushArchive?.strokes||[];recoveryStrokes=json.brushArchive?.recovery||[];
 lastFormal={strokes:[...priorStrokes],revision:0};ctx.drawImage(img,0,0);pctx.drawImage(img,0,0);renderRepeat();if(rasterWorker)rasterWorker.postMessage({type:'load',epoch:documentEpoch,png:json.layers[0].png});savedRev=history.revision;dirty();const unavailable=priorStrokes.some(s=>{if(s?.algorithm!==algorithm)return true;try{validateBrush(s.brush);return false}catch{return true}});
 notify(recoveryStrokes.length?'完成画像を開きました。未確定の筆は復旧情報として保持しました':unavailable?'完成画像を開きました。一部ブラシの素材または版が利用できません':'ネイティブ作品を開きました')}catch(err){notify('読込に失敗: '+err.message)}}
$('open-file').addEventListener('change',e=>{open(e.target.files[0]);e.target.value=''})
const commands={new:showDialog,open:()=>$('open-file').click(),save:()=>save(),saveas:()=>save(true),undo,redo,fit,actual:()=>{view=zoomAt(view,1/view.scale,{x:stage.clientWidth/2,y:stage.clientHeight/2});scheduleView()},resetrotation:()=>{view=zoomAt(view,1,{x:stage.clientWidth/2,y:stage.clientHeight/2},-view.rotation);scheduleView()},resetflip:()=>{view=flipAtDocumentCenter(view,doc.width,doc.height,{flipX:false,flipY:false});scheduleView()},flipx:()=>{view=flipAtDocumentCenter(view,doc.width,doc.height,{flipX:!view.flipX});scheduleView()},flipy:()=>{view=flipAtDocumentCenter(view,doc.width,doc.height,{flipY:!view.flipY});scheduleView()},grid:()=>{grid.dataset.show=grid.dataset.show==='1'?'0':'1';gridPainted=false;scheduleView()},applymeta:applyMeta,template:addTemplate};all('[data-action]').forEach(b=>b.addEventListener('click',()=>commands[b.dataset.action]?.()));all('[data-tool]').forEach(b=>b.addEventListener('click',()=>selectTool(b.dataset.tool)));
$('quick-tool').onclick=() =>selectTool(isEraser(settings.tool)?settings.lastBrush:'hardEraser');$('quick-color').onclick=()=>{showPanel();$('color-section').scrollIntoView({block:'start'})};$('mobile-eraser').onclick=()=>selectTool(isEraser(settings.tool)?settings.lastBrush:'hardEraser');$('mobile-tools').onclick=()=>{showPanel();$('tool-name').scrollIntoView()};$('mobile-color').onclick=()=>$('quick-color').click();$('mobile-size').onclick=()=>{showPanel();$('size').focus()};
function showPanel(){$('workspace').classList.remove('collapsed')};$('panel-toggle').onclick=()=>$('workspace').classList.toggle('collapsed');$('close-panel').onclick=()=>$('workspace').classList.add('collapsed');
const resizer=$('resize-handle');resizer.addEventListener('pointerdown',e=>resizer.setPointerCapture(e.pointerId));resizer.addEventListener('pointermove',e=>{if(e.buttons&&resizer.hasPointerCapture(e.pointerId)){$('workspace').style.width=clamp(window.innerWidth-e.clientX,250,Math.min(window.innerWidth*.44,480))+'px'}});
$('zoom-n').addEventListener('change',e=>{const z=clamp(Number(e.target.value)/100,.05,64);view=zoomAt(view,z/view.scale,{x:stage.clientWidth/2,y:stage.clientHeight/2});scheduleView()});
const temporaryKeys={Space:'pan',KeyE:'erase',KeyI:'sample'};
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,button,dialog,[contenteditable]'))return;
 const ctrl=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
 if(ctrl&&key==='z'){e.preventDefault();e.shiftKey?redo():undo()}
 else if(ctrl&&key==='y'){e.preventDefault();redo()}
 else if(ctrl&&key==='s'){e.preventDefault();save(e.shiftKey)}
 else if(!ctrl&&!e.altKey&&temporaryKeys[e.code]){e.preventDefault();if(!e.repeat)hold(e.code,temporaryKeys[e.code])}
});
window.addEventListener('keyup',e=>{if(temporaryKeys[e.code])release(e.code)});
window.addEventListener('resize',scheduleView);
setColor(settings.color,false);resetDoc(doc);selectTool('gpen');
if(matchMedia('(max-width:720px)').matches)$('workspace').classList.add('collapsed');
if(!rasterWorker)notify('この端末では筆の確定が同期処理になります');
