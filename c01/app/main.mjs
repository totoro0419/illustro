import {enableInputDiagnostics} from './input-diagnostics.mjs';
import {installColorPickers} from './color-pickers.mjs';
import {clamp,round,validateDocument,toPixels,hexToRgb,rgbToHex,hsvToRgb,rgbToHsv,hslToRgb,rgbToHsl,screenToDoc,docToScreen,zoomAt,History,createManifest,readManifest,brushBounds,flipAtDocumentCenter} from './model.mjs';
const $ = id => document.getElementById(id);
const all = q => [...document.querySelectorAll(q)];
const canvas = $('art'), preview=$('preview'), grid=$('grid'), paper=$('paper'), stage=$('stage');
let ctx=canvas.getContext('2d',{willReadFrequently:true}),pctx=preview.getContext('2d'),gctx=grid.getContext('2d');
preview.style.display='none';
let rasterWorker=null,rasterSeq=0,strokeSerial=0,saveSerial=0;
const pendingPreviews=new Map(),pendingSnapshots=new Map();
const useWorker=typeof Worker==='function'&&typeof OffscreenCanvas==='function';
if(useWorker){
 try{rasterWorker=new Worker(new URL('./raster-worker.mjs',import.meta.url),{type:'module'});}catch(err){console.warn('Illustro: Worker unavailable, synchronous raster fallback',err)}
}
function removePreviews(){for(const overlay of pendingPreviews.values())overlay.remove();pendingPreviews.clear()}
if(rasterWorker){
 rasterWorker.onmessage=e=>{const msg=e.data;if(msg.epoch!==documentEpoch){msg.bitmap?.close();return}
  if(msg.type==='frame'){if(msg.seq===rasterSeq){ctx.clearRect(0,0,doc.width,doc.height);ctx.drawImage(msg.bitmap,0,0);removePreviews();dirty();}msg.bitmap.close();}
  else if(msg.type==='saved'){const request=pendingSnapshots.get(msg.requestId);if(request){pendingSnapshots.delete(msg.requestId);request.resolve(new Blob([msg.png],{type:'image/png'}));}}
  else if(msg.type==='error'){if(msg.requestId&&pendingSnapshots.has(msg.requestId)){pendingSnapshots.get(msg.requestId).reject(Error(msg.message));pendingSnapshots.delete(msg.requestId)}else{notify('描画処理に失敗: '+msg.message);}}
 };
 rasterWorker.onerror=e=>{console.error('Illustro raster worker failure:',e);notify('描画Workerに障害が発生しました。作品の保存を中断してください。')};
}
function workerPNG(epoch){return new Promise((resolve,reject)=>{const requestId=++saveSerial;pendingSnapshots.set(requestId,{resolve,reject});rasterWorker.postMessage({type:'save',epoch,requestId})})}

let doc={name:'無題',author:'',description:'',width:1600,height:1200,dpi:300,profile:'srgb8',background:'white'};
let history=new History(),savedRev=-1,handle=null,documentEpoch=0,saveQueue=Promise.resolve(),active=null,nav=new Map(),gesture=null,spaceDown=false,view={x:0,y:0,scale:1,rotation:0,flipX:false,flipY:false};
let settings={tool:'gpen',size:12,opacity:1,flow:1,curve:1,fingerDraw:false,gestureUndo:true,color:[34,39,51],colorAlpha:1,previous:[0,0,0],lastBrush:'gpen'};
let templates=[];try{templates=JSON.parse(localStorage.getItem('illustro.templates.v1')||'[]')}catch{}
const tools={round:'丸ブラシ',gpen:'Gペン',pencil:'鉛筆',marker:'マーカー',air:'エアブラシ',hardEraser:'硬い消しゴム',softEraser:'柔らかい消しゴム'};
const isEraser=t=>t==='hardEraser'||t==='softEraser';
let toastTimer, frame=0,gridPainted=false,colorPickers=null,pickerBefore=null,pickerPrevious=null;
function notify(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600)}
function dirty(){ $('save-status').textContent=pendingPreviews.size?'正式描画処理中…':savedRev===history.revision?'保存済み':'未保存';$('doc-title').textContent=doc.name+(savedRev===history.revision?'':' •');$('doc-dimensions').textContent=`${doc.width} × ${doc.height} px`;updateHistory() }
function updateHistory(){for(const b of all('[data-action=undo]')){b.disabled=!history.canUndo;b.title=history.canUndo?'Undo: '+history.undoName:'戻せません'}for(const b of all('[data-action=redo]')){b.disabled=!history.canRedo;b.title=history.canRedo?'Redo: '+history.redoName:'進めません'}}
function drawGrid(){if(gridPainted)return;gctx.clearRect(0,0,grid.width,grid.height);const show=grid.dataset.show==='1'&&view.scale>=6;if(!show)return;gridPainted=true;gctx.strokeStyle='#8994a560';gctx.lineWidth=1/Math.max(1,view.scale);gctx.beginPath();for(let x=0;x<=doc.width;x++){gctx.moveTo(x+.5,0);gctx.lineTo(x+.5,doc.height)}for(let y=0;y<=doc.height;y++){gctx.moveTo(0,y+.5);gctx.lineTo(doc.width,y+.5)}gctx.stroke()}
function renderView(){frame=0;const a=view.rotation*Math.PI/180, sx=view.scale*(view.flipX?-1:1),sy=view.scale*(view.flipY?-1:1);const co=Math.cos(a),si=Math.sin(a);paper.style.transform=`matrix(${co*sx},${si*sx},${-si*sy},${co*sy},${view.x},${view.y})`;$('zoom-readout').textContent=`${Math.round(view.scale*100)}% / ${Math.round(view.rotation)}°`;$('zoom-n').value=Math.round(view.scale*100);grid.style.display=grid.dataset.show==='1'&&view.scale>=6?'block':'none';if(grid.dataset.show==='1'&&view.scale>=6)drawGrid()}
function scheduleView(){if(!frame)frame=requestAnimationFrame(renderView)}
function fit(){const w=stage.clientWidth,h=stage.clientHeight;view={x:(w-Math.min(w/doc.width,h/doc.height)*doc.width*.88)/2,y:(h-Math.min(w/doc.width,h/doc.height)*doc.height*.88)/2,scale:clamp(Math.min(w/doc.width,h/doc.height)*.88,.05,4),rotation:0,flipX:false,flipY:false};scheduleView()}
function setDimensions(){gridPainted=false;for(const c of [canvas,preview,grid]){c.width=doc.width;c.height=doc.height;c.style.width=doc.width+'px';c.style.height=doc.height+'px'}paper.style.width=doc.width+'px';paper.style.height=doc.height+'px';paper.style.background=doc.background==='white'?'white':'transparent';$('checker').style.display=doc.background==='white'?'none':'block';ctx=canvas.getContext('2d',{willReadFrequently:true});pctx=preview.getContext('2d');gctx=grid.getContext('2d');$('meta-summary').textContent=`${doc.width} × ${doc.height}px / ${doc.dpi} DPI / sRGB 8bit`;dirty()}
function syncMeta(){for(const [id,key] of [['meta-name','name'],['meta-author','author'],['meta-description','description']])$(id).value=doc[key]}
function resetDoc(data){documentEpoch++;doc={...data};history=new History();savedRev=-1;handle=null;active=null;rasterSeq=0;removePreviews();for(const request of pendingSnapshots.values())request.reject(Error('作品が切り替わりました'));pendingSnapshots.clear();setDimensions();if(rasterWorker)rasterWorker.postMessage({type:'reset',epoch:documentEpoch,width:doc.width,height:doc.height});syncMeta();fit();dirty()}
function selectTool(name){if(!tools[name])return;settings.tool=name;if(!isEraser(name))settings.lastBrush=name;all('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===name));$('tool-name').textContent=tools[name];$('quick-tool').textContent=isEraser(name)?'◇':'✒';$('quick-tool').title=tools[name];if(window.matchMedia('(max-width:720px)').matches)$('workspace').classList.add('collapsed')}
function rgba(alpha){return `rgba(${settings.color[0]},${settings.color[1]},${settings.color[2]},${alpha})`}
function setColor(rgb,old=true){if(old)settings.previous=[...settings.color];settings.color=rgb.map(x=>clamp(Math.round(x),0,255));const hsv=rgbToHsv(settings.color),hsl=rgbToHsl(settings.color);$('hex').value=rgbToHex(settings.color);for(const [i,v] of [['r',rgb[0]],['g',rgb[1]],['b',rgb[2]],['h',round(hsv[0])],['hs',round(hsv[1]*100)],['v',round(hsv[2]*100)],['lh',round(hsl[0])],['ls',round(hsl[1]*100)],['l',round(hsl[2]*100)]])$(i).value=v;$('color-swatch').style.background=$('current-color').style.background=rgbToHex(settings.color);$('previous-color').style.background=rgbToHex(settings.previous);colorPickers?.reflect(hsv)}
function cursorSample(e){const rect=stage.getBoundingClientRect();const v=screenToDoc({x:e.clientX-rect.left,y:e.clientY-rect.top},view);return {x:v.x,y:v.y,p: e.pointerType==='pen'?clamp(e.pressure||.5,0,1):1,t:e.timeStamp,tiltX:Number.isFinite(e.tiltX)?e.tiltX:null,tiltY:Number.isFinite(e.tiltY)?e.tiltY:null,twist:Number.isFinite(e.twist)?e.twist:null}}
function stamp(s,point){const pctx=s.overlayCtx||preview.getContext('2d');const size=s.size*(s.pen?(.12+.88*Math.pow(point.p,s.curve)):1);const r=Math.max(.25,size/2);let alpha=s.flow*(s.pen?(.25+.75*Math.pow(point.p,s.curve)):1)*s.colorAlpha;if(s.tool==='pencil')alpha*=.47;if(s.tool==='marker')alpha*=.34;if(s.tool==='air')alpha*=.35;alpha=clamp(alpha,0,1);if(alpha<=0)return;
 pctx.save();pctx.globalCompositeOperation='source-over';pctx.fillStyle=isEraser(s.tool)?`rgba(255,255,255,${alpha})`:`rgba(${s.color.join(',')},${alpha})`;
 if(s.tool==='air'||s.tool==='softEraser'){const grad=pctx.createRadialGradient(point.x,point.y,r*.08,point.x,point.y,r);grad.addColorStop(0,isEraser(s.tool)?`rgba(255,255,255,${alpha})`:`rgba(${s.color.join(',')},${alpha})`);grad.addColorStop(1,isEraser(s.tool)?'rgba(255,255,255,0)':'rgba(0,0,0,0)');pctx.fillStyle=grad;pctx.beginPath();pctx.arc(point.x,point.y,r,0,Math.PI*2);pctx.fill()}
 else if(s.tool==='marker'){pctx.translate(point.x,point.y);pctx.rotate(-.3);pctx.fillRect(-r,-r*.46,2*r,r*.92)}
 else {pctx.beginPath();if(s.tool==='pencil'){pctx.ellipse(point.x,point.y,r,r*.77,.1,0,Math.PI*2)}else if(s.tool==='gpen'){pctx.ellipse(point.x,point.y,r,r*.8,Math.atan2(point.tiltY||0,(point.tiltX||0)+1)*.35,0,Math.PI*2)}else pctx.arc(point.x,point.y,r,0,Math.PI*2);pctx.fill()}pctx.restore()}
function segment(s,from,to,maxStamps=5000){const distance=Math.hypot(to.x-from.x,to.y-from.y);const spacing=Math.max(.5,s.size*(s.tool==='air'||s.tool==='softEraser'?.14:s.tool==='marker'?.2:.12));const count=Math.min(maxStamps,Math.max(1,Math.ceil(distance/spacing)));for(let i=1;i<=count;i++){const t=i/count;stamp(s,{x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t,p:from.p+(to.p-from.p)*t,tiltX:to.tiltX,tiltY:to.tiltY})}}
function makeOverlay(){
 const overlay=document.createElement('canvas');overlay.className='stroke-preview';overlay.width=doc.width;overlay.height=doc.height;
 overlay.style.width=doc.width+'px';overlay.style.height=doc.height+'px';
 paper.insertBefore(overlay,grid);return overlay;
}
function drawPreview(s){
 s.previewFrame=0;if(!s.overlay.isConnected)return;
 const end=s.points.length-1;if(end<=s.previewIndex)return;
 const remaining=end-s.previewIndex,step=Math.max(1,Math.ceil(remaining/24));
 let from=s.points[s.previewIndex],count=0;
 for(let i=s.previewIndex+step;i<=end;i+=step){
  const to=s.points[Math.min(i,end)];segment(s,from,to,Math.max(1,Math.floor(80/Math.ceil(remaining/step))));from=to;count++;
 }
 if(from!==s.points[end])segment(s,from,s.points[end],3);
 s.previewIndex=end;
}
function queuePreview(s){if(!s.previewFrame)s.previewFrame=requestAnimationFrame(()=>drawPreview(s))}
function beginStroke(e){
 if(active)return;
 const pt=cursorSample(e),overlay=makeOverlay();
 const s={id:e.pointerId,strokeId:++strokeSerial,overlay,overlayCtx:overlay.getContext('2d'),previewIndex:0,previewFrame:0,points:[pt],tool:settings.tool,size:settings.size,opacity:settings.opacity,flow:settings.flow,color:[...settings.color],colorAlpha:settings.colorAlpha,curve:settings.curve,pen:e.pointerType==='pen',last:pt,lastClient:{x:e.clientX,y:e.clientY}};
 active=s;s.overlay.style.opacity=String(s.opacity);if(isEraser(s.tool))s.overlay.classList.add('eraser-preview');stamp(s,pt);
}
function addStroke(e){
 if(!active||active.id!==e.pointerId)return;
 const s=active;s.lastClient={x:e.clientX,y:e.clientY};
 // Sensor samples are accepted immediately. Preview rasterization is capped per frame;
 // the full sample sequence is kept for lossless formal evaluation in the Worker.
 const evs=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[e];
 for(const ev of evs.length?evs:[e]){
  const pt=cursorSample(ev),prev=s.last;
  if(pt.x===prev.x&&pt.y===prev.y)continue;
  s.points.push(pt);s.last=pt;
 }
 queuePreview(s);
 if(e.pointerType==='pen')$('sensor-readout').textContent=`ペン入力: 筆圧 ${round(e.pressure,2)} / 傾き ${e.tiltX??'–'}, ${e.tiltY??'–'} / twist ${e.twist??'–'}（OS報告値）`;
}
function commitStroke(cancelled=false){
 if(!active)return;
 const s=active;active=null;queuePreview(s);
 const b=brushBounds(s.points,s.size,doc.width,doc.height);
 if(!b.w||!b.h){s.overlay.remove();return}
 if(rasterWorker){
  const action={label:tools[s.tool]+(cancelled?'（入力中断）':''),kind:'pixels',strokeId:s.strokeId};
  history.accept(action);pendingPreviews.set(s.strokeId,s.overlay);
  // Keep all accepted samples, but exclude DOM/canvas handles from the job message.
  const {tool,size,opacity,flow,color,colorAlpha,curve,pen,points}=s;
  rasterWorker.postMessage({type:'stroke',seq:++rasterSeq,epoch:documentEpoch,stroke:{tool,size,opacity,flow,color,colorAlpha,curve,pen,points}});
  dirty();return;
 }
 // Explicit fallback for browsers without OffscreenCanvas/Worker support.
 try{
  const before=ctx.getImageData(b.x,b.y,b.w,b.h);ctx.save();
  ctx.globalCompositeOperation=isEraser(s.tool)?'destination-out':'source-over';ctx.globalAlpha=s.opacity;
  ctx.drawImage(s.overlay,b.x,b.y,b.w,b.h,b.x,b.y,b.w,b.h);ctx.restore();
  const after=ctx.getImageData(b.x,b.y,b.w,b.h);
  history.accept({label:tools[s.tool]+(cancelled?'（入力中断）':''),kind:'pixels',bounds:b,before,after});dirty();
 }catch(err){notify('描画確定に失敗: '+err.message)}finally{s.overlay.remove()}
}
function applyAction(action,isUndo){
 if(!action)return;
 if(action.kind==='pixels'){
  if(rasterWorker){
   const overlay=pendingPreviews.get(action.strokeId);if(overlay)overlay.style.visibility=isUndo?'hidden':'visible';
   rasterWorker.postMessage({type:isUndo?'undo':'redo',seq:++rasterSeq,epoch:documentEpoch});
  }else{const b=action.bounds;ctx.putImageData(isUndo?action.before:action.after,b.x,b.y)}
 }else if(action.kind==='meta'){doc=structuredClone(isUndo?action.before:action.after);syncMeta()}
 dirty();
}
function undo(){if(active)commitStroke();applyAction(history.undo(),true)}
function redo(){if(active)commitStroke();applyAction(history.redo(),false)}
function pinchReset(){const ps=[...nav.values()];if(!ps.length){gesture=null;return}const mid=ps.reduce((a,p)=>({x:a.x+p.x,y:a.y+p.y}),{x:0,y:0});mid.x/=ps.length;mid.y/=ps.length;const rect=stage.getBoundingClientRect(),local={x:mid.x-rect.left,y:mid.y-rect.top};let dist=1,ang=0;if(ps.length>1){dist=Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y)||1;ang=Math.atan2(ps[1].y-ps[0].y,ps[1].x-ps[0].x)}gesture={start:local,origin:{...view},docPoint:screenToDoc(local,view),dist,ang}}
const recordInput=enableInputDiagnostics(stage,()=>({nav:nav.size,active:active?.id??null}));
function pointerDown(e){if(e.pointerType==='touch')recordInput('stage-touch-down',e);if(e.button===2)return;stage.focus({preventScroll:true});try{stage.setPointerCapture(e.pointerId)}catch{}if(e.pointerType==='touch'&&active&&!active.pen&&nav.size===0){const p=active.lastClient;nav.set(active.id,{x:p.x,y:p.y,startX:p.x,startY:p.y,started:performance.now()})}const isNav=e.pointerType==='touch'?!settings.fingerDraw||nav.size>0||Boolean(active):e.button===1||spaceDown;if(isNav){nav.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,started:performance.now()});pinchReset()}else if(e.pointerType==='touch'&&settings.fingerDraw&&nav.size===0)beginStroke(e);else beginStroke(e)}
function pointerMove(e){if(nav.has(e.pointerId)){if(e.pointerType==='touch')recordInput('nav-move',e);const p=nav.get(e.pointerId);p.x=e.clientX;p.y=e.clientY;if(!gesture)pinchReset();const ps=[...nav.values()],rect=stage.getBoundingClientRect();const mid=ps.reduce((a,p)=>({x:a.x+p.x,y:a.y+p.y}),{x:0,y:0});mid.x=mid.x/ps.length-rect.left;mid.y=mid.y/ps.length-rect.top;let factor=1,rotate=0;if(ps.length>1){const dist=Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y)||1;factor=dist/gesture.dist;rotate=(Math.atan2(ps[1].y-ps[0].y,ps[1].x-ps[0].x)-gesture.ang)*180/Math.PI}view={...gesture.origin,scale:clamp(gesture.origin.scale*factor,.05,64),rotation:gesture.origin.rotation+rotate};const transformed=docToScreen(gesture.docPoint,{...view,x:0,y:0});view.x=mid.x-transformed.x;view.y=mid.y-transformed.y;scheduleView();return}if(active?.id===e.pointerId)addStroke(e)}
function pointerUp(e,forcedCancel=false){
 const cancelled=forcedCancel||e.type==='pointercancel';
 if(e.pointerType==='pen')recordInput(cancelled?'pen-cancel':'pen-up',e);
 if(nav.has(e.pointerId)){
  const p=nav.get(e.pointerId),tap=Math.hypot(p.x-p.startX,p.y-p.startY)<12&&performance.now()-p.started<260;
  const count=nav.size;nav.delete(e.pointerId);
  if(active?.id===e.pointerId)commitStroke(cancelled);
  if(!cancelled&&tap&&count>=2&&settings.gestureUndo&&!active){if(count>=3)redo();else undo()}
  pinchReset();
 }else if(active?.id===e.pointerId){
  if(!cancelled)addStroke(e);
  commitStroke(cancelled);
 }
 // Pointer capture is per pointer. Explicitly release after finalizing state.
 try{if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId)}catch{}
}
stage.addEventListener('pointerdown',pointerDown);stage.addEventListener('pointermove',pointerMove);stage.addEventListener('pointerup',pointerUp);stage.addEventListener('pointercancel',pointerUp);stage.addEventListener('lostpointercapture',e=>{if(active?.id===e.pointerId||nav.has(e.pointerId))pointerUp(e,true)});window.addEventListener('blur',()=>{if(active)commitStroke(true);nav.clear();gesture=null});stage.addEventListener('contextmenu',e=>e.preventDefault());stage.addEventListener('wheel',e=>{e.preventDefault();const r=stage.getBoundingClientRect();view=zoomAt(view,Math.exp(-e.deltaY*.001),{x:e.clientX-r.left,y:e.clientY-r.top});scheduleView()},{passive:false});
function initSizeControls(id,field,min,max,numberId=null){const range=$(id),number=$(numberId||id+'-n');const fn=(v)=>{const n=Number(v);if(!Number.isFinite(n))return;const bounded=clamp(n,min,max);settings[field]=field==='size'?bounded:bounded/100;range.value=bounded;if(number)number.value=bounded;if(id==='size'){$('quick-size').value=clamp(bounded,1,200);$('quick-size-value').textContent=bounded}};range.addEventListener('input',e=>fn(e.target.value));if(number)number.addEventListener('change',e=>fn(e.target.value));return fn}
const changeSize=initSizeControls('size','size',1,300);initSizeControls('opacity','opacity',0,100);initSizeControls('flow','flow',0,100);$('quick-size').addEventListener('input',e=>changeSize(e.target.value));$('pressure-curve').addEventListener('input',e=>{settings.curve=Number(e.target.value)/100;$('pressure-curve-value').textContent=settings.curve.toFixed(2)});$('finger-draw').addEventListener('change',e=>{settings.fingerDraw=e.target.checked;notify(settings.fingerDraw?'指描き（2指で移動）':'指ナビ / ペン描画')});$('tap-gesture').addEventListener('change',e=>settings.gestureUndo=e.target.checked);
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
function showDialog(){refreshTemplates();$('dialog-backdrop').hidden=false;$('new-name').focus()}function closeDialog(){$('dialog-backdrop').hidden=true}
function refreshTemplates(){const select=$('new-template');select.innerHTML='<option value="">選択しない</option>';templates.forEach((t,i)=>{const op=document.createElement('option');op.value=String(i);op.textContent=t.name+` (${t.width}×${t.height})`;select.appendChild(op)})}
$('new-template').addEventListener('change',e=>{const t=templates[Number(e.target.value)];if(e.target.value===''||!t)return;$('new-name').value=t.name;$('new-width').value=t.width;$('new-height').value=t.height;$('new-unit').value='px';$('new-dpi').value=t.dpi;$('new-bg').value=t.background});$('new-unit').addEventListener('change',()=>{$('new-error').textContent='単位を切り替えました。入力値は自動換算されません。'});
$('new-dialog').addEventListener('submit',e=>{e.preventDefault();try{const dpi=Number($('new-dpi').value),unit=$('new-unit').value,width=toPixels(Number($('new-width').value),unit,dpi),height=toPixels(Number($('new-height').value),unit,dpi);validateDocument(width,height,dpi);if(history.revision!==savedRev&&history.canUndo&&!confirm('未保存の変更があります。新規作品を作りますか？'))return;resetDoc({name:$('new-name').value||'無題',author:'',description:'',width,height,dpi,profile:'srgb8',background:$('new-bg').value});closeDialog();notify('新しい作品を作成しました')}catch(err){$('new-error').textContent=err.message}});$('dialog-close').onclick=$('new-cancel').onclick=closeDialog;
function applyMeta(){const next={...doc,name:$('meta-name').value||'無題',author:$('meta-author').value,description:$('meta-description').value};if(JSON.stringify(doc)===JSON.stringify(next))return;history.accept({kind:'meta',label:'作品情報',before:structuredClone(doc),after:structuredClone(next)});doc=next;dirty()}
function addTemplate(){const t={name:doc.name,width:doc.width,height:doc.height,dpi:doc.dpi,background:doc.background,profile:'srgb8'};templates.push(t);try{localStorage.setItem('illustro.templates.v1',JSON.stringify(templates))}catch{notify('テンプレートの保存に失敗しました');return}notify('寸法・DPI・背景のみテンプレートに保存しました')}
async function save(as=false){
 if(active)commitStroke();
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
  const png=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||new Error('PNG読込失敗'));reader.readAsDataURL(blob)});
  const contents=JSON.stringify(createManifest(meta,png,revision));
  if(hasPicker){
   const dest=await picker;
   // Serialize writes: older Save requests cannot finish after newer ones on the same target.
   const operation=saveQueue.catch(()=>{}).then(async()=>{const writer=await dest.createWritable();try{await writer.write(contents);await writer.close()}catch(error){await writer.abort().catch(()=>{});throw error}});
   saveQueue=operation;await operation;
   if(epoch===documentEpoch){handle=dest;savedRev=revision;dirty()}
   notify('保存完了');
  }else{
   const data=new Blob([contents],{type:'application/json'}),url=URL.createObjectURL(data),a=document.createElement('a');
   a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
   if(epoch===documentEpoch)dirty();notify('ネイティブ作品のダウンロードを開始（完了は未確認）');
  }
 }catch(err){if(epoch===documentEpoch)dirty();if(err.name==='AbortError'){notify('保存をキャンセルしました');return}notify('保存に失敗: '+err.message)}
}
async function open(file){if(!file)return;if(history.revision!==savedRev&&history.canUndo&&!confirm('未保存の作品を破棄して開きますか？'))return;try{const json=readManifest(await file.text());const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('レイヤー画像を解読できません'));img.src=json.layers[0].png});if(img.width!==json.document.width||img.height!==json.document.height)throw new Error('レイヤー寸法が一致しません');resetDoc(json.document);ctx.drawImage(img,0,0);if(rasterWorker)rasterWorker.postMessage({type:'load',epoch:documentEpoch,png:json.layers[0].png});savedRev=history.revision;dirty();notify('ネイティブ作品を開きました')}catch(err){notify('読込に失敗: '+err.message)}}
$('open-file').addEventListener('change',e=>{open(e.target.files[0]);e.target.value=''})
const commands={new:showDialog,open:()=>$('open-file').click(),save:()=>save(),saveas:()=>save(true),undo,redo,fit,actual:()=>{view=zoomAt(view,1/view.scale,{x:stage.clientWidth/2,y:stage.clientHeight/2});scheduleView()},resetrotation:()=>{view=zoomAt(view,1,{x:stage.clientWidth/2,y:stage.clientHeight/2},-view.rotation);scheduleView()},resetflip:()=>{view=flipAtDocumentCenter(view,doc.width,doc.height,{flipX:false,flipY:false});scheduleView()},flipx:()=>{view=flipAtDocumentCenter(view,doc.width,doc.height,{flipX:!view.flipX});scheduleView()},flipy:()=>{view=flipAtDocumentCenter(view,doc.width,doc.height,{flipY:!view.flipY});scheduleView()},grid:()=>{grid.dataset.show=grid.dataset.show==='1'?'0':'1';gridPainted=false;scheduleView()},applymeta:applyMeta,template:addTemplate};all('[data-action]').forEach(b=>b.addEventListener('click',()=>commands[b.dataset.action]?.()));all('[data-tool]').forEach(b=>b.addEventListener('click',()=>selectTool(b.dataset.tool)));
$('quick-tool').onclick=() =>selectTool(isEraser(settings.tool)?settings.lastBrush:'hardEraser');$('quick-color').onclick=()=>{showPanel();$('color-section').scrollIntoView({block:'start'})};$('mobile-eraser').onclick=()=>selectTool(isEraser(settings.tool)?settings.lastBrush:'hardEraser');$('mobile-tools').onclick=()=>{showPanel();$('tool-name').scrollIntoView()};$('mobile-color').onclick=()=>$('quick-color').click();$('mobile-size').onclick=()=>{showPanel();$('size').focus()};
function showPanel(){$('workspace').classList.remove('collapsed')};$('panel-toggle').onclick=()=>$('workspace').classList.toggle('collapsed');$('close-panel').onclick=()=>$('workspace').classList.add('collapsed');
const resizer=$('resize-handle');resizer.addEventListener('pointerdown',e=>resizer.setPointerCapture(e.pointerId));resizer.addEventListener('pointermove',e=>{if(e.buttons&&resizer.hasPointerCapture(e.pointerId)){$('workspace').style.width=clamp(window.innerWidth-e.clientX,250,Math.min(window.innerWidth*.44,480))+'px'}});
$('zoom-n').addEventListener('change',e=>{const z=clamp(Number(e.target.value)/100,.05,64);view=zoomAt(view,z/view.scale,{x:stage.clientWidth/2,y:stage.clientHeight/2});scheduleView()});
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const ctrl=e.ctrlKey||e.metaKey;if(ctrl&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(ctrl&&e.key.toLowerCase()==='y'){e.preventDefault();redo()}else if(ctrl&&e.key.toLowerCase()==='s'){e.preventDefault();save(e.shiftKey)}else if(e.code==='Space'){e.preventDefault();spaceDown=true}});window.addEventListener('keyup',e=>{if(e.code==='Space')spaceDown=false});
window.addEventListener('resize',()=>{if(!active&&nav.size===0)scheduleView()});setColor(settings.color,false);resetDoc(doc);selectTool('gpen');if(matchMedia('(max-width:720px)').matches)$('workspace').classList.add('collapsed');notify(rasterWorker?'Illustro C01 · ペン描画をバックグラウンド処理します':'Illustro C01 · 一部の端末では描画確定時に一時停止する場合があります');
