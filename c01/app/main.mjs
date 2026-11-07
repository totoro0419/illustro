import {algorithm,makeSeed,mod,validateBrush} from './brush-engine.mjs';
import {createLayerTree,addRasterLayer,selectLayer,freezeDrawTarget,setLayerVisibility,setLayerOpacity,addGroupLayer,groupLayers,setLayerParent,moveLayer,duplicateRasterLayer} from './layer-tree.mjs';
import {BLEND_MODES} from './blend-kernels.mjs';
import {readLayeredManifest} from './layered-manifest.mjs';
import {Ink,composite,rasterize,tileBox,tileSize} from './brush-raster.mjs';
import {RetainedScene} from './retained-scene.mjs';
import {Presentation} from './presentation.mjs';
import {previewDabs} from './preview-stroke.mjs';
import {admit,admitTerminal,PoseTimeline} from './stroke-input.mjs';
import {brushUI} from './brush-ui.mjs';
import {enableInputDiagnostics} from './input-diagnostics.mjs';
import {installColorPickers} from './color-pickers.mjs';
import {clamp,round,validateDocument,toPixels,hexToRgb,rgbToHex,hsvToRgb,rgbToHsv,hslToRgb,rgbToHsl,screenToDoc,docToScreen,zoomAt,History,createManifest,readManifest,flipAtDocumentCenter} from './model.mjs';
const $ = id => document.getElementById(id);
const all = q => [...document.querySelectorAll(q)];
const canvas = $('art'), preview=$('preview'), grid=$('grid'), paper=$('paper'), stage=$('stage');
let ctx=canvas.getContext('2d',{willReadFrequently:true}),pctx=preview.getContext('2d',{willReadFrequently:true}),gctx=grid.getContext('2d');
canvas.style.visibility='hidden';
let rasterWorker=null,previewWorker=null,previewGeneration=0,minimumPublicationSeq=0,publishedSeq=0,displaySeq=0,rasterSeq=0,strokeSerial=0,saveSerial=0;
let heldFormal=null;
const formalStates=new Map(),displayTiles=new Map(),formalTiles=new Map(),displayImages=new Map();
const requestedPresentation=new URLSearchParams(location.search).get('presentation');
const requestedDisplayCanvas=new URLSearchParams(location.search).get('displayCanvas');
const bitmapSupported=!!document.createElement('canvas').getContext('bitmaprenderer');
const requestedMode=!requestedPresentation||requestedPresentation==='auto'?'bitmap':requestedPresentation;
const presentationMode=requestedMode==='bitmap'&&!bitmapSupported?'2d':requestedMode;
const directPresentation=requestedDisplayCanvas!=='snapshot'&&presentationMode==='bitmap'&&typeof HTMLCanvasElement.prototype.transferControlToOffscreen==='function';
const pixelMirror=new URLSearchParams(location.search).has('pixelMirror');
const cpuDisplay=['cpu','snapshot'].includes(requestedDisplayCanvas);
const timerPresentation=new URLSearchParams(location.search).get('timerPresentation')==='1';
const retainedScene=new RetainedScene(stage,paper);
let gpuDisplay=null,gpuEnabled=false;
try{if(presentationMode==='webgl')gpuDisplay=new Presentation(stage)}catch(error){document.getElementById('gpu-presentation')?.remove();console.warn('表示をCanvas 2Dへ切り替えます',error)}
if(pixelMirror)window.__c02Verify={presentation:gpuDisplay,getView:()=>({...view})};
if(gpuDisplay){stage.append(grid);grid.style.transformOrigin='0 0';grid.style.pointerEvents='none';gpuDisplay.onLost=()=>{gpuEnabled=false;gpuDisplay.element.hidden=true;displayLayer.hidden=false;paper.style.visibility='visible';$('paper-shadow').style.visibility='visible';displayPictures([...displayImages.values()])}}
const perf=new URLSearchParams(location.search).has('perf')?{display:[],formal:[],preview:[],firstPreview:[],formalPublication:[]}:null;
if(perf)window.__c02Perf=perf;
const navPreview=document.createElement('canvas');navPreview.id='navigation-preview';navPreview.hidden=true;navPreview.setAttribute('aria-hidden','true');paper.append(navPreview);
const navContext=presentationMode==='webgl'?navPreview.getContext('bitmaprenderer'):null;let navReady=false;
const useNavigationPicture=()=>gpuEnabled&&nav.size>0&&!repeat&&navReady;
const displayLayer=document.createElement('div');displayLayer.id='display-tiles';displayLayer.setAttribute('aria-hidden','true');paper.insertBefore(displayLayer,grid.parentElement===paper?grid:null);
function displayPictures(pictures,groups=[]){
 for(const p of pictures)displayImages.set(p.key,p);
 if(gpuEnabled){const start=performance.now();if(pixelMirror)for(const {box,image}of pictures)pctx.putImageData(image,box.x,box.y);gpuDisplay.update(pictures);gpuDisplay.request(view);if(perf)perf.display.push({totalMs:performance.now()-start,tiles:pictures.length});return}
 if(presentationMode==='bitmap'){
  if(pixelMirror)for(const {box,image}of pictures)pctx.putImageData(image,box.x,box.y);
  for(const data of groups){let tile=displayTiles.get(data.key);if(!tile){
   const element=document.createElement('canvas');element.width=data.w;element.height=data.h;Object.assign(element.style,{left:data.x+'px',top:data.y+'px',width:data.w+'px',height:data.h+'px'});
   if(data.direct){
    const surface=element.transferControlToOffscreen();tile={element,direct:true};
    previewWorker.postMessage({type:'surface',epoch:documentEpoch,key:data.key,canvas:surface},[surface]);
   }else{tile={element,context:element.getContext('bitmaprenderer')};if(!tile.context)throw Error('Bitmap presentation unavailable')}
   displayTiles.set(data.key,tile);displayLayer.append(element);
  }if(!data.direct){
   // Keep width/height attributes aligned with the bitmap's backing while
   // CSS retains document-space geometry across adaptive resolution changes.
   if(tile.element.width!==data.bitmap.width||tile.element.height!==data.bitmap.height){tile.element.width=data.bitmap.width;tile.element.height=data.bitmap.height}
   tile.context.transferFromImageBitmap(data.bitmap)
  }}
  return;
 }
 const start=performance.now();let mirrorMs=0,tileMs=0;
 const groupSize=512,columns=Math.ceil(doc.width/groupSize);
 for(const {box,image} of pictures){
  let at=performance.now();if(pixelMirror)pctx.putImageData(image,box.x,box.y);mirrorMs+=performance.now()-at;
  const col=Math.floor(box.x/groupSize),row=Math.floor(box.y/groupSize),key=row*columns+col,x=col*groupSize,y=row*groupSize;
  let tile=displayTiles.get(key);
  if(!tile){const element=document.createElement('canvas');element.width=Math.min(groupSize,doc.width-x);element.height=Math.min(groupSize,doc.height-y);Object.assign(element.style,{left:x+'px',top:y+'px',width:element.width+'px',height:element.height+'px'});const context=element.getContext('2d',{willReadFrequently:true});if(!context)throw Error('表示Canvasが利用できません');tile={element,context};displayTiles.set(key,tile);displayLayer.append(element)}
  at=performance.now();tile.context.putImageData(image,box.x-x,box.y-y);tileMs+=performance.now()-at;
 }
 if(perf){perf.display.push({totalMs:performance.now()-start,mirrorMs,tileMs,tiles:pictures.length});if(perf.display.length>2048)perf.display.shift()}
}

const rasterCommands=[];let rasterSendFrame=0,presentationInitAt=performance.now();
function queueRaster(message){rasterCommands.push(message);scheduleRasterSend()}
function scheduleRasterSend(){if(!rasterSendFrame)rasterSendFrame=requestAnimationFrame(()=>{rasterSendFrame=0;if(!rasterWorker||workerFault){rasterCommands.length=0;return}if(nav.size)return;for(const message of rasterCommands.splice(0))rasterWorker.postMessage(message)})}
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
 preview.style.visibility='hidden';
 previewWorker=new Worker(new URL('./preview-worker.mjs',import.meta.url),{type:'module'});
 previewWorker.onmessage=({data:m})=>{
  if(m.type==='display-submit'){
   if(m.epoch===documentEpoch&&m.generation===previewGeneration){
    if(m.seq>displaySeq){displaySeq=m.seq;dirty();if(perf&&m.acceptedAt)(perf.submittedPublication||=[]).push(performance.timeOrigin+performance.now()-m.acceptedAt)}
    if(perf){(perf.firstSubmitted||=[]).push(...(m.stats.first||[]).map(item=>item.ms));(perf.submit||=[]).push(m.stats);if(perf.submit.length>2048)perf.submit.shift()}
   }return
  }
  if(m.type==='surface-init'){if(m.epoch===documentEpoch&&!workerFault)displayPictures([],m.groups);return}
  if(m.type==='ready'){
   if(m.epoch!==documentEpoch){for(const g of m.groups||[])g.bitmap?.close();return}
   const initialGroups=(m.groups||[]).filter(g=>!displayTiles.has(g.key));displayPictures([],initialGroups);for(const g of m.groups||[])g.bitmap?.close();
   requestAnimationFrame(()=>requestAnimationFrame(()=>{if(m.epoch===documentEpoch){stage.dataset.presentationReady='true';stage.dataset.presentationInitMs=String(performance.now()-presentationInitAt);stage.setAttribute('aria-busy','false');dirty()}}));return
  }
  if(m.type==='error'){if(m.epoch===documentEpoch)rasterFailure('仮線: '+m.message);return}
  const valid=m.epoch===documentEpoch&&m.generation===previewGeneration&&!workerFault;
  if(m.navBitmap){if(valid&&gpuEnabled&&navContext){navContext.transferFromImageBitmap(m.navBitmap);navReady=true;if(nav.size)scheduleView()}m.navBitmap.close()}
  const accepted=m.epoch===documentEpoch&&m.generation===previewGeneration&&!workerFault&&!(nav.size&&!active&&!m.first?.length);
  if(accepted){
   if(perf&&m.stats){perf.preview.push(m.stats);for(const item of m.first||[])perf.firstPreview.push(performance.timeOrigin+performance.now()-item.startedAt);if(m.formalAcceptedAt&&m.formalSeq>(perf.lastFormalSeq||0)){perf.formalPublication.push(performance.timeOrigin+performance.now()-m.formalAcceptedAt);perf.lastFormalSeq=m.formalSeq}}
   displayPictures(m.pictures,m.groups);
   renderRepeat();
  }
  for(const p of m.pictures||[])p.bitmap?.close();for(const group of m.groups||[])group.bitmap?.close();
  previewWorker.postMessage({type:'ack',epoch:m.epoch,serial:m.serial,accepted});
 };
 previewWorker.onerror=()=>rasterFailure('仮線Workerが応答しなくなりました');
 rasterWorker.onmessage=({data:msg})=>{
  if(msg.epoch!==documentEpoch){for(const p of msg.pictures||[])p.bitmap?.close();return}
  if(msg.type==='frame'){
   if(msg.seq>=minimumPublicationSeq&&msg.seq>publishedSeq&&msg.seq<=rasterSeq&&!workerFault){
    const receiveStart=performance.now();publishedSeq=msg.seq;
    for(const {key,box,image} of msg.pictures){formalTiles.set(key,{box,image:new ImageData(new Uint8ClampedArray(image.data),box.w,box.h)});if(pixelMirror)ctx.putImageData(image,box.x,box.y)}
    const state=formalStates.get(msg.seq);
    if(state)lastFormal={strokes:archiveStrokes(state.index),revision:state.revision};
    for(const seq of formalStates.keys())if(seq<=msg.seq)formalStates.delete(seq);
    if(msg.stats)stage.dataset.rasterStats=JSON.stringify(msg.stats);
    if(!heldFormal)heldFormal={pictures:new Map()};
    for(const p of msg.pictures)heldFormal.pictures.set(p.key,p);
    Object.assign(heldFormal,{epoch:msg.epoch,seq:msg.seq,acceptedAt:state?.acceptedAt});
    flushFormal();
    rasterWorker.postMessage({type:'presented',epoch:msg.epoch,seq:msg.seq});dirty();if(perf){perf.formal.push({totalMs:performance.now()-receiveStart,tiles:msg.pictures.length,...msg.stats});if(perf.formal.length>2048)perf.formal.shift()}
   }else for(const p of msg.pictures)p.bitmap?.close();
  }else if(msg.type==='hit-result'){
   const found=msg.candidates?.[0];if(found){selectLayer(layerTree,found.id);maskPaintMode=false;renderLayerPanel();notify('選択: '+found.name)}else notify('この位置に描画内容のある層は見つかりません');
  }else if(msg.type==='saved'){
   const request=pendingSnapshots.get(msg.requestId);
   if(request){pendingSnapshots.delete(msg.requestId);request.resolve(msg.native);if(perf){(perf.save||=[]).push(msg.stats)}}
  }else if(msg.type==='error'){
   const request=pendingSnapshots.get(msg.requestId);
   if(request){pendingSnapshots.delete(msg.requestId);request.reject(Error(msg.message))}
   else if(msg.requestId==null)rasterFailure(msg.message);
  }
 };
 rasterWorker.onerror=()=>{rasterWorker.terminate();rasterWorker=null;rasterFailure('Workerが応答しなくなりました')};
}
/** Navigation keeps the retained preview picture while precise tiles wait in
 * CPU memory. No view event waits for these uploads or for the raster queue. */
function flushFormal(){
 if(!heldFormal||nav.size||heldFormal.seq<minimumPublicationSeq||workerFault)return;
 const packet=heldFormal;heldFormal=null;const retired=[];
 for(const [id,candidate]of pendingInk)if(candidate.seq<=packet.seq){retired.push(id);pendingInk.delete(id)}
 const pictures=[...packet.pictures.values()];
 previewWorker.postMessage({type:'base',epoch:packet.epoch,seq:packet.seq,acceptedAt:packet.acceptedAt,pictures,retired},pictures.map(p=>p.image.data.buffer));
 dirty();
}
function workerNative(epoch,metadata,revision,extra={}){return new Promise((resolve,reject)=>{const requestId=++saveSerial;pendingSnapshots.set(requestId,{resolve,reject});queueRaster({type:'save',epoch,requestId,metadata,revision,extra})})}

let doc={name:'無題',author:'',description:'',width:1600,height:1200,dpi:300,profile:'srgb8',background:'white'};
let layerTree=createLayerTree();
let history=new History(),savedRev=-1,handle=null,documentEpoch=0,saveQueue=Promise.resolve(),active=null,nav=new Map(),gesture=null,view={x:0,y:0,scale:1,rotation:0,flipX:false,flipY:false};
let navigationMoved=false,navigationTapHandled=false,navigationTapAllowed=true,navigationStarted=0;
let settings={tool:'gpen',size:12,opacity:1,flow:1,curve:1,fingerDraw:false,gestureUndo:true,color:[34,39,51],colorAlpha:1,previous:[0,0,0],lastBrush:'gpen'};
let templates=[];try{templates=JSON.parse(localStorage.getItem('illustro.templates.v1')||'[]')}catch{}
const isEraser=t=>brushes.get(t)?.blend==='erase';
let toastTimer, frame=0,viewUIFrame=0,gridPainted=false,colorPickers=null,pickerBefore=null,pickerPrevious=null;
function notify(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600)}
function dirty(){ stage.dataset.rasterPending=String(pendingInk.size);stage.dataset.presentationSeq=String(displaySeq);$('save-status').textContent=workerFault?'描画確定停止':rasterWorker&&stage.dataset.presentationReady!=='true'?'表示を準備中…':pendingInk.size?'正式描画処理中…':rasterWorker&&displaySeq<rasterSeq?'表示を確定中…':savedRev===history.revision?'保存済み':'未保存';$('doc-title').textContent=doc.name+(savedRev===history.revision?'':' •');$('doc-dimensions').textContent=`${doc.width} × ${doc.height} px`;updateHistory() }
function updateHistory(){for(const b of all('[data-action=undo]')){b.disabled=!history.canUndo;b.title=history.canUndo?'Undo: '+history.undoName:'戻せません'}for(const b of all('[data-action=redo]')){b.disabled=!history.canRedo;b.title=history.canRedo?'Redo: '+history.redoName:'進めません'}}
function drawGrid(){if(gridPainted)return;gctx.clearRect(0,0,grid.width,grid.height);const show=grid.dataset.show==='1'&&view.scale>=6;if(!show)return;gridPainted=true;gctx.strokeStyle='#8994a560';gctx.lineWidth=1/Math.max(1,view.scale);gctx.beginPath();for(let x=0;x<=doc.width;x++){gctx.moveTo(x+.5,0);gctx.lineTo(x+.5,doc.height)}for(let y=0;y<=doc.height;y++){gctx.moveTo(0,y+.5);gctx.lineTo(doc.width,y+.5)}gctx.stroke()}
function updateViewUI(){ $('zoom-readout').textContent=`${Math.round(view.scale*100)}% / ${Math.round(view.rotation)}°`;$('zoom-n').value=Math.round(view.scale*100)}
function renderView(){frame=0;if(retainedScene.base){if(!viewUIFrame)viewUIFrame=requestAnimationFrame(()=>{viewUIFrame=0;updateViewUI()});poseTimeline.record(performance.now(),view,gesture?.rect||stage.getBoundingClientRect());retainedScene.move(view);return}poseTimeline.record(performance.now(),view,stage.getBoundingClientRect());previewWorker?.postMessage({type:'view-scale',epoch:documentEpoch,scale:view.scale*(devicePixelRatio||1)});const a=view.rotation*Math.PI/180, sx=view.scale*(view.flipX?-1:1),sy=view.scale*(view.flipY?-1:1);const co=Math.cos(a),si=Math.sin(a);paper.style.transform=`matrix(${co*sx},${si*sx},${-si*sy},${co*sy},${view.x},${view.y})`;retainedScene.updateShadow(paper.style.transform,doc.width,doc.height);if(gpuDisplay){grid.style.transform=paper.style.transform;if(!useNavigationPicture())gpuDisplay.render(view)}updateViewUI();grid.style.display=!gpuEnabled&&grid.dataset.show==='1'&&view.scale>=6?'block':'none';if(!gpuEnabled&&grid.dataset.show==='1'&&view.scale>=6)drawGrid();
 if(!repeat){
  const corners=[[0,0],[doc.width,0],[doc.width,doc.height],[0,doc.height]];
  const points=corners.map(([x,y])=>{const p=docToScreen({x,y},view);return p.x+','+p.y}).join(' ');
  for(const polygon of all('#paper-shadow polygon'))polygon.setAttribute('points',points);
 }
 renderRepeat();if(hover)showCursor(hover)}
function scheduleView(){if(useNavigationPicture()||!gpuEnabled&&!repeat){if(frame)cancelAnimationFrame(frame);renderView();return}if(!frame)frame=requestAnimationFrame(renderView)}
function fit(){const w=stage.clientWidth,h=stage.clientHeight;view={x:(w-Math.min(w/doc.width,h/doc.height)*doc.width*.88)/2,y:(h-Math.min(w/doc.width,h/doc.height)*doc.height*.88)/2,scale:clamp(Math.min(w/doc.width,h/doc.height)*.88,.05,4),rotation:0,flipX:false,flipY:false};scheduleView()}
function setDimensions(){gridPainted=false;gpuEnabled=false;try{gpuEnabled=Boolean(rasterWorker&&previewWorker&&gpuDisplay?.configure(doc.width,doc.height,doc.background))}catch(error){console.warn('表示をCanvas 2Dへ切り替えます',error)}if(gpuDisplay)gpuDisplay.element.hidden=!gpuEnabled;displayLayer.hidden=gpuEnabled;paper.style.visibility=gpuEnabled?'hidden':'visible';$('paper-shadow').style.visibility=gpuEnabled?'hidden':'visible';for(const c of [canvas,preview,grid]){c.width=doc.width;c.height=doc.height;c.style.width=doc.width+'px';c.style.height=doc.height+'px'}navPreview.style.width=doc.width+'px';navPreview.style.height=doc.height+'px';paper.style.width=doc.width+'px';paper.style.height=doc.height+'px';paper.style.background=doc.background==='white'?'white':'transparent';$('checker').style.display=doc.background==='white'?'none':'block';ctx=canvas.getContext('2d',{willReadFrequently:true});pctx=preview.getContext('2d',{willReadFrequently:true});gctx=grid.getContext('2d');$('meta-summary').textContent=`${doc.width} × ${doc.height}px / ${doc.dpi} DPI / sRGB 8bit`;dirty()}
function syncMeta(){for(const [id,key] of [['meta-name','name'],['meta-author','author'],['meta-description','description']])$(id).value=doc[key]}
function resetDoc(data){
 clearTimeout(previewSendTimer);previewSendTimer=0;if(sensorFrame)cancelAnimationFrame(sensorFrame);sensorFrame=0;lastPreviewFrame=0;presentationInterval=16;
 for(const {element,direct}of displayTiles.values()){if(!direct)element.width=element.height=1;element.remove()}displayTiles.clear();formalTiles.clear();displayImages.clear();
 rasterCommands.length=0;presentationInitAt=performance.now();stage.dataset.presentationReady=rasterWorker?'initializing':'true';stage.setAttribute('aria-busy',String(!!rasterWorker));retainedScene.complete();heldFormal=null;navReady=false;navPreview.hidden=true;nav.clear();gesture=null;documentEpoch++;if(perf)perf.lastFormalSeq=0;doc={...data};layerTree=createLayerTree();addRasterLayer(layerTree,'レイヤー1');layerTree.layers[0].id='raster-1';layerTree.selectedId='raster-1';soloLayerId=null;selectedMulti.clear();layerComps=[];maskPaintMode=false;hitSelectMode=false;history=new History();savedRev=-1;handle=null;active=null;interrupted=null;workerFault=null;rasterSeq=0;publishedSeq=0;displaySeq=0;minimumPublicationSeq=0;formalStates.clear();previewGeneration++;priorStrokes=[];recoveryStrokes=[];lastFormal={strokes:[],revision:0};
 $('export-recovery').hidden=true;
 stage.removeAttribute('data-raster-error');stage.removeAttribute('data-raster-stats');$('interrupted-stroke').hidden=true;
 removePreviews();repaint.clear();clearTemporary();
 for(const request of pendingSnapshots.values())request.reject(Error('作品が切り替わりました'));
 pendingSnapshots.clear();setDimensions();
 if(rasterWorker){rasterWorker.postMessage({type:'reset',epoch:documentEpoch,width:doc.width,height:doc.height});previewWorker.postMessage({type:'reset',epoch:documentEpoch,generation:previewGeneration,width:doc.width,height:doc.height,background:doc.background,measure:!!perf,bitmap:presentationMode==='bitmap',direct:directPresentation,cpuDisplay,framePacing:!timerPresentation,navigationPicture:gpuEnabled})}
 syncMeta();fit();renderLayerPanel();
 poseTimeline.entries.length=0;cancelAnimationFrame(frame);renderView();dirty();
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
let armed=null,toggled=null,interrupted=null,workerFault=null,inkFrame=0,previewSendTimer=0,sensorFrame=0,presentationInterval=16,lastPreviewFrame=0;
let repeat=false, hover=null, hoverFrame=0, padBrushes=null, padStroke=null, priorStrokes=[], recoveryStrokes=[], lastFormal={strokes:[],revision:0};
const cursor=$('brush-cursor'), repeatView=$('repeat-view');

function presentation(){
 if(previewWorker)return;
 if(!repaint.size)return;
 const candidates=[...pendingInk.values(),active,interrupted];
 for(const key of repaint){
  const box=tileBox(key,doc.width,doc.height);
  pctx.clearRect(box.x,box.y,box.w,box.h);
  pctx.drawImage(canvas,box.x,box.y,box.w,box.h,box.x,box.y,box.w,box.h);
  for(const candidate of candidates){
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
 if(previewWorker){if(!candidate.visible)previewGeneration++;previewWorker.postMessage({type:'visibility',epoch:documentEpoch,generation:previewGeneration,id:candidate.strokeId,visible:candidate.visible,retire:!candidate.visible&&candidate!==active&&candidate!==interrupted&&!pendingInk.has(candidate.strokeId)});return}
 for(const key of candidate.ink.tiles.keys())repaint.add(key);
}
function removePreviews(){
 for(const item of pendingInk.values()){
  item.visible=false;invalidate(item);
 }
 pendingInk.clear();
}
function renderRepeat(){
 retainedScene.setShadowVisible(!repeat);
 if(useNavigationPicture()){navPreview.hidden=false;gpuDisplay.element.hidden=true;paper.style.visibility='visible';$('paper-shadow').style.visibility='visible';return}
 navPreview.hidden=true;if(gpuEnabled){paper.style.visibility='hidden';$('paper-shadow').style.visibility='hidden';gpuDisplay.repeat=repeat;gpuDisplay.element.hidden=false;repeatView.hidden=true;gpuDisplay.request(view);return}
 if(gpuDisplay)gpuDisplay.element.hidden=true;
 if(!repeat)return;
 if(previewWorker){pctx.clearRect(0,0,doc.width,doc.height);for(const {box,image}of displayImages.values())pctx.putImageData(image,box.x,box.y);}
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
 if(!$('show-cursor').checked||e.pointerType==='touch'&&active?.id!==e.pointerId||nav.has(e.pointerId)){
  cursor.hidden=true;return;
 }
 const rect=stage.getBoundingClientRect(),input=brushes.input;
 const erase=currentAction()==='erase'||Boolean(e.buttons&32)||isEraser(settings.tool);
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
  size:(erase||brush.blend==='erase')&&input.independent?input.eraserSize:settings.size,opacity:settings.opacity*brush.opacityFactor,flow:settings.flow,
  color:[...settings.color],colorAlpha:settings.colorAlpha,curve:settings.curve,pen};
}
function syncPreview(candidate){
 const offset=candidate.sentPoints||0,points=candidate.stroke.points;
 // Re-send the last point too: equal timestamp samples replace the old tail.
 const from=Math.max(0,offset-1);
 previewWorker.postMessage({type:'points',epoch:documentEpoch,id:candidate.strokeId,offset:from,points:points.slice(from),active:candidate===active,presentationInterval});
 candidate.sentPoints=points.length;candidate.sentActive=candidate===active;
}
function watchPresentation(){
 if(!sensorFrame&&(active||!timerPresentation)){lastPreviewFrame=0;sensorFrame=requestAnimationFrame(previewCadenceFrame)}
}
function previewCadenceFrame(){
 sensorFrame=0;
 if(!active&&(timerPresentation||!(pendingInk.size||nav.size||displaySeq<rasterSeq))){lastPreviewFrame=0;return}
 const now=performance.now(),before=presentationInterval;
 if(lastPreviewFrame){
  const observed=Math.min(timerPresentation?32:250,Math.max(8,now-lastPreviewFrame));
  // Attack a slow display frame immediately; recover over a few good frames
  // instead of filling the GPU queue again on the first fast callback.
  presentationInterval=timerPresentation?observed:Math.max(observed,presentationInterval*.75);
 }
 lastPreviewFrame=now;
 if(!timerPresentation&&Math.abs(before-presentationInterval)>1)previewWorker?.postMessage({type:'cadence',epoch:documentEpoch,interval:presentationInterval});
 if(active?.inputEvent){updateStrokeDiagnostics(active);active.inputEvent=null}
 sensorFrame=requestAnimationFrame(previewCadenceFrame);
}
function queuePreview(){
 if(previewWorker){
  // Input delivery must continue even when compositor rAF callbacks are late.
  // Keep only the small sensor/UI update on the display clock.
  if(!previewSendTimer)previewSendTimer=setTimeout(()=>{
   previewSendTimer=0;
   for(const candidate of [active,...pendingInk.values(),interrupted])if(candidate){
    if(candidate.sentPoints!==candidate.stroke.points.length||candidate===active||candidate.sentActive!==(candidate===active))syncPreview(candidate);
   }
  },4);
  watchPresentation();
  return;
 }
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
  if(active?.inputEvent){updateStrokeDiagnostics(active);active.inputEvent=null}
  presentation();
  if([active,...pendingInk.values()].some(s=>s?.visible&&!s.previewFailed&&(s.dabs||s.previewIndex<s.stroke.points.length)))queuePreview();
 });
}
function beginStroke(e,erase=false){
 if(active||interrupted||workerFault)return;
 const point=poseTimeline.sample(e,sensors);
 if(!point)return;
 // Some styluses deliver pressure 0 at the contact-down edge, even though
 // the pen is touching. A zero-size pressure brush leaves an initial gap.
 // Only the initial physical contact is floored; later pressure is untouched.
 if(e.pointerType==='pen'&&(e.buttons&1)){
  const diameter=(erase||brushes.get(erase?brushes.input.eraser:settings.tool).blend==='erase')&&brushes.input.independent?brushes.input.eraserSize:settings.size;
  // At least a document-pixel-wide first dab with pressure-size brushes.
  point.p=Math.max(point.p,Math.min(1,Math.max(.07,1.25/Math.max(1,diameter))));
 }
 const brush=brushes.get(erase?brushes.input.eraser:settings.tool);
 let frozenTarget;
  try{frozenTarget=freezeDrawTarget(layerTree);if(maskPaintMode){if(!layerTree.layers.find(l=>l.id===frozenTarget.id)?.mask)throw Error('マスクがありません');frozenTarget={...frozenTarget,mask:true};}}catch(error){notify('描画不可: '+error.message);return}
  const stroke=strokeSettings(brush,[point],e.pointerType==='pen',erase);
  stroke.target=frozenTarget;
 if(e.altKey)stroke.guide=null;
 const ink=previewWorker?{tiles:new Map()}:new Ink(stroke,doc.width,doc.height,true);
 if(sensorFrame)cancelAnimationFrame(sensorFrame);sensorFrame=0;lastPreviewFrame=0;
 active={id:e.pointerId,strokeId:++strokeSerial,stroke,ink,visible:true,previewIndex:0,previewCount:0,
  lastClient:{x:e.clientX,y:e.clientY},started:performance.now(),type:e.pointerType};
 if(previewWorker){previewWorker.postMessage({type:'start',epoch:documentEpoch,id:active.strokeId,stroke:structuredClone(stroke),startedAt:performance.timeOrigin+active.started,presentationInterval});active.sentPoints=1;active.sentActive=true}
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
  if(!(end?admitTerminal(points,point):admit(points,point))&&!point)recordInput('unknown-view-pose',event);
 }
 queuePreview();
 if(e.pointerType==='pen')s.inputEvent=e;
}
function updateStrokeDiagnostics(candidate){
 const e=candidate.inputEvent,points=candidate.stroke.points;
  $('sensor-readout').textContent='筆圧 '+round(e.pressure,2)+'／傾き '+(sensors.tilt?e.tiltX+', '+e.tiltY:'未検出')+'／軸回転 '+(sensors.barrel?e.twist:'未検出');
  if(!$('input-wave').hidden){
   const wave=$('input-wave'),wc=wave.getContext('2d'),samples=points.slice(-wave.width);
   wc.clearRect(0,0,wave.width,wave.height);wc.beginPath();wc.strokeStyle='#345acc';
   samples.forEach((p,i)=>{const y=(1-p.p)*(wave.height-2)+1;if(i)wc.lineTo(i,y);else wc.moveTo(i,y)});wc.stroke();
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
  syncPreview(candidate);candidate.seq=++rasterSeq;
  formalStates.set(rasterSeq,{index:history.index,revision:history.revision,acceptedAt:performance.timeOrigin+performance.now()});
  queueRaster({type:'stroke',seq:rasterSeq,epoch:documentEpoch,stroke,acceptedAt:candidate.acceptedAt});
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
   minimumPublicationSeq=++rasterSeq;previewGeneration++;
   const candidate=pendingInk.get(action.strokeId);
   if(candidate){candidate.visible=!isUndo;invalidate(candidate);presentation()}
   if(!candidate)previewWorker.postMessage({type:'visibility',epoch:documentEpoch,generation:previewGeneration});
   formalStates.set(rasterSeq,{index:history.index,revision:history.revision,acceptedAt:performance.timeOrigin+performance.now()});
   queueRaster({type:isUndo?'undo':'redo',seq:rasterSeq,epoch:documentEpoch});
  }else{
   for(const {key,box,before,after} of action.patches){
    ctx.putImageData(isUndo?before:after,box.x,box.y);repaint.add(key);
   }
   presentation();
  }
 }else if(action.kind==='layers'||action.kind==='layer-operation'){layerTree=structuredClone(isUndo?action.before:action.after);publishLayerState();renderLayerPanel();if(action.kind==='layer-operation'){const seq=++rasterSeq;minimumPublicationSeq=seq;formalStates.set(seq,{index:history.index,revision:history.revision,acceptedAt:performance.timeOrigin+performance.now()});queueRaster({type:isUndo?'undo':'redo',seq,epoch:documentEpoch})}}else if(action.kind==='comps'){layerComps=structuredClone(isUndo?action.before:action.after);renderLayerPanel()}
  else if(action.kind==='meta'){doc=structuredClone(isUndo?action.before:action.after);syncMeta()}
 dirty();
}
function undo(){if(workerFault||interrupted)return;if(active){interruptStroke();return}applyAction(history.undo(),true)}
function redo(){if(workerFault||interrupted)return;if(active){interruptStroke();return}applyAction(history.redo(),false)}
function pinchReset(){const ps=[...nav.values()];if(ps.length)watchPresentation();previewWorker?.postMessage({type:'navigation',epoch:documentEpoch,active:ps.length>0});rasterWorker?.postMessage({type:'navigation',epoch:documentEpoch,active:ps.length>0});if(!ps.length){retainedScene.complete();gesture=null;scheduleRasterSend();scheduleView();return}if(!gpuEnabled&&!repeat)retainedScene.begin(view);const mid=ps.reduce((a,p)=>({x:a.x+p.x,y:a.y+p.y}),{x:0,y:0});mid.x/=ps.length;mid.y/=ps.length;const rect=stage.getBoundingClientRect(),local={x:mid.x-rect.left,y:mid.y-rect.top};let dist=1,ang=0;if(ps.length>1){dist=Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y)||1;ang=Math.atan2(ps[1].y-ps[0].y,ps[1].x-ps[0].x)}gesture={start:local,origin:{...view},docPoint:screenToDoc(local,view),dist,ang,rect}}
const recordInput=enableInputDiagnostics(stage,()=>({nav:nav.size,active:active?.id??null,rasterPending:pendingInk.size}));
function addNav(e,action='pan'){
 if(!nav.size){navigationMoved=false;navigationTapHandled=false;navigationTapAllowed=!active;navigationStarted=performance.now()}
 if(nav.size)for(const contact of nav.values())contact.action='pan';
 nav.set(e.pointerId,{action,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,started:performance.now(),type:e.pointerType});
 pinchReset();
}
function sampleColor(e){
 const point=poseTimeline.sample(e,sensors);
 if(!point)return;
 const x=Math.floor(repeat?mod(point.x,doc.width):point.x),y=Math.floor(repeat?mod(point.y,doc.height):point.y);
 if(x<0||y<0||x>=doc.width||y>=doc.height)return;
 const key=Math.floor(y/tileSize)*Math.ceil(doc.width/tileSize)+Math.floor(x/tileSize),tile=displayImages.get(key),offset=((y%tileSize)*(tile?.box.w||0)+x%tileSize)*4;
 const [r,g,b,a]=previewWorker?(tile?tile.image.data.slice(offset,offset+4):[0,0,0,0]):pctx.getImageData(x,y,1,1).data;
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
 if(hitSelectMode){const rect=stage.getBoundingClientRect(),point=screenToDoc({x:e.clientX-rect.left,y:e.clientY-rect.top},view);if(point.x>=0&&point.y>=0&&point.x<doc.width&&point.y<doc.height)queueRaster({type:'hit-test',epoch:documentEpoch,requestId:++saveSerial,x:Math.floor(point.x),y:Math.floor(point.y),threshold:16});return}
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
 else if(action==='sample'){if(touch)addNav(e,'sample');else sampleColor(e)}
 else {beginStroke(e,action==='erase');hover=e;showCursor(e)}
}
function pointerMove(e){
 updatePenButtons(e);
 hover=e;
 if(!hoverFrame)hoverFrame=requestAnimationFrame(()=>{hoverFrame=0;if(hover)showCursor(hover)});
 if(nav.has(e.pointerId)){
  if(e.pointerType==='touch')recordInput('nav-move',e);
  const p=nav.get(e.pointerId);p.x=e.clientX;p.y=e.clientY;if(Math.hypot(p.x-p.startX,p.y-p.startY)>=12)navigationMoved=true;
  if(p.action==='sample')return;
  if(!gesture)pinchReset();
  const ps=[...nav.values()],rect=gesture.rect;
  const mid=ps.reduce((a,p)=>({x:a.x+p.x,y:a.y+p.y}),{x:0,y:0});
  mid.x=mid.x/ps.length-rect.left;mid.y=mid.y/ps.length-rect.top;
  let factor=1,rotate=0;
  if(ps.length>1){
   factor=(Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y)||1)/gesture.dist;
   rotate=(Math.atan2(ps[1].y-ps[0].y,ps[1].x-ps[0].x)-gesture.ang)*180/Math.PI;
  }
  if(Math.abs(factor-1)>.04||Math.abs(rotate)>3||Math.hypot(mid.x-gesture.start.x,mid.y-gesture.start.y)>=12)navigationMoved=true;
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
 if(e.pointerType==='touch'){hover=null;cursor.hidden=true}
 if(e.pointerType==='pen')recordInput(cancelled?'pen-cancel':'pen-up',e);
 if(nav.has(e.pointerId)){
  const p=nav.get(e.pointerId),tap=!navigationMoved&&!navigationTapHandled&&Math.hypot(p.x-p.startX,p.y-p.startY)<12&&performance.now()-navigationStarted<260;
  const touchOnly=p.type==='touch'&&[...nav.values()].every(point=>point.type==='touch');if(cancelled)navigationTapHandled=true;
  const count=nav.size;nav.delete(e.pointerId);
  if(!cancelled&&tap&&p.action==='sample')sampleColor(e);
  if(!cancelled&&tap&&touchOnly&&navigationTapAllowed&&count>=2&&settings.gestureUndo&&!active){navigationTapHandled=true;if(count>=3)redo();else undo()}
  pinchReset();flushFormal();
 }else if(active?.id===e.pointerId){
  if(cancelled)interruptStroke();
  else if(e.button!==2){addStroke(e,true);commitStroke()}
 }
 if(cancelled)clearTemporary();
 else updatePenButtons(e);
 try{if(stage.hasPointerCapture(e.pointerId)&&e.button!==2)stage.releasePointerCapture(e.pointerId)}catch{}
}
function interruptInput(){
 interruptStroke();nav.clear();pinchReset();flushFormal();hover=null;cursor.hidden=true;
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
 repeat=e.target.checked;repeatView.hidden=!repeat;paper.style.visibility=repeat||gpuEnabled?'hidden':'visible';$('paper-shadow').style.visibility=repeat||gpuEnabled?'hidden':'visible';renderRepeat();scheduleView();
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
function archiveStrokes(index=history.index){
 return [...priorStrokes,...history.items.slice(0,index).filter(a=>a.kind==='pixels').map(a=>a.stroke)];
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
  const context=frozen.getContext('2d');if(previewWorker){for(const {box,image}of formalTiles.values())context.putImageData(image,box.x,box.y)}else context.drawImage(canvas,0,0);
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

const layerPanel=document.createElement('section');
layerPanel.id='c03-layer-panel';
layerPanel.innerHTML='<h3>レイヤー <small>C03 Alpha</small></h3><div class="c03-actions"><button id="c03-add-layer" type="button">＋ Raster</button><button id="c03-solo" type="button" aria-pressed="false" title="一時的なSolo表示">Solo</button></div><label class="c03-search-row">検索 <input id="c03-layer-search" type="search" placeholder="名前"></label><div id="c03-layer-list" role="listbox" aria-label="レイヤー"></div><label>レイヤー名 <input id="c03-layer-name" type="text" maxlength="120"></label><label>色タグ <select id="c03-layer-tag"><option value="">なし</option><option value="red">赤</option><option value="orange">橙</option><option value="yellow">黄</option><option value="green">緑</option><option value="blue">青</option><option value="violet">紫</option></select></label><label>不透明度 <input id="c03-layer-opacity" type="range" min="0" max="100" value="100"><output id="c03-layer-opacity-out">100%</output></label><label>合成 <select id="c03-layer-blend"><option value="normal">通常</option><option value="multiply">乗算</option><option value="screen">スクリーン</option></select></label><div class="c03-lock-row"><label><input type="checkbox" id="c03-lock-position">位置ロック</label><label><input type="checkbox" id="c03-lock-pixels">画素ロック</label><label><input type="checkbox" id="c03-lock-all">全体ロック</label></div><small id="c03-layer-hint">グループ・マスク・特殊合成は未統合です。</small>';
document.querySelector('.workspace-scroll').prepend(layerPanel);
let soloLayerId=null,maskPaintMode=false,hitSelectMode=false,layerComps=[];
const selectedMulti=new Set();

const advancedPanel=document.createElement('div');advancedPanel.id='c03-advanced';
advancedPanel.innerHTML=`<div class="c03-actions"><button id="c03-add-group">＋ Group</button><button id="c03-group-selected">まとめる</button><button id="c03-ungroup">解除</button></div>
<div class="c03-actions"><button id="c03-layer-up">↑</button><button id="c03-layer-down">↓</button><button id="c03-duplicate">複製</button><button id="c03-merge-down">下へ結合</button></div>
<div class="c03-actions"><select id="c03-filter-type"><option value="">全種別</option><option value="raster">Raster</option><option value="group">Group</option></select><select id="c03-filter-tag"><option value="">全タグ</option><option value="red">赤</option><option value="orange">橙</option><option value="yellow">黄</option><option value="green">緑</option><option value="blue">青</option><option value="violet">紫</option></select></div>
<label>親グループ<select id="c03-layer-parent"></select></label>
<div class="c03-lock-row"><label><input id="c03-layer-clipped" type="checkbox">下層でクリップ</label><label><input id="c03-alpha-lock" type="checkbox">透明度ロック</label></div>
<div class="c03-actions"><button id="c03-add-mask">画素マスク追加</button><button id="c03-mask-edit" aria-pressed="false">マスク描画</button><button id="c03-add-vector-mask">矩形マスク</button></div>
<div class="c03-lock-row"><label><input id="c03-mask-enabled" type="checkbox">マスク有効</label><label><input id="c03-mask-inverted" type="checkbox">反転</label><label><input id="c03-vector-inverted" type="checkbox">矩形反転</label></div>
<div class="c03-actions"><button id="c03-hit-select" aria-pressed="false">作品から層を選択</button></div>
<details><summary>階調依存合成（Blend If）</summary><label>対象<select id="c03-blendif-channel"><option value="luminance">輝度</option><option value="r">赤</option><option value="g">緑</option><option value="b">青</option></select></label><label>色空間<select id="c03-blendif-space"><option value="encoded">sRGB</option><option value="linear">linear</option></select></label>
<label>自層下限<input id="c03-blendif-source-low" type="number" min="0" max="255" value="0"></label><label>自層上限<input id="c03-blendif-source-high" type="number" min="0" max="255" value="255"></label>
<label>下地下限<input id="c03-blendif-back-low" type="number" min="0" max="255" value="0"></label><label>下地上限<input id="c03-blendif-back-high" type="number" min="0" max="255" value="255"></label><div class="c03-actions"><button id="c03-blendif-apply">適用</button><button id="c03-blendif-clear">解除</button></div></details>
<details><summary>レイヤーカンプ</summary><input id="c03-comp-name" type="text" placeholder="案名"><select id="c03-comp-list"></select><div class="c03-actions"><button id="c03-comp-create">記録</button><button id="c03-comp-apply">適用</button><button id="c03-comp-delete">削除</button></div></details>`;
layerPanel.append(advancedPanel);
for(const mode of ['dissolve',...BLEND_MODES.filter(m=>!['normal','multiply','screen'].includes(m))])$('c03-layer-blend').append(new Option(mode,mode));
function groupDescendant(id,parent){
 let l=layerTree.layers.find(item=>item.id===id);
 for(let i=0;i<100&&l?.parentId;i++){if(l.parentId===parent)return true;l=layerTree.layers.find(item=>item.id===l.parentId)}
 return false;
}
function renderAdvancedLayerPanel(){
 const selected=layerTree.layers.find(l=>l.id===layerTree.selectedId),raster=selected?.type==='raster';
 const parent=$('c03-layer-parent');parent.replaceChildren(new Option('最上位',''));
 for(const group of layerTree.layers.filter(l=>l.type==='group'&&l.id!==selected?.id&&!groupDescendant(l.id,selected?.id)))parent.append(new Option(group.name,group.id));
 parent.value=selected?.parentId??'';
 $('c03-layer-clipped').checked=Boolean(selected?.clipped);$('c03-alpha-lock').checked=Boolean(selected?.alphaLock);
 $('c03-mask-enabled').checked=Boolean(selected?.mask&&selected.mask.enabled!==false);
 $('c03-mask-inverted').checked=Boolean(selected?.mask?.inverted);
 $('c03-vector-inverted').checked=Boolean(selected?.vectorMask?.inverted);
 $('c03-mask-edit').setAttribute('aria-pressed',String(maskPaintMode&&raster));
 $('c03-hit-select').setAttribute('aria-pressed',String(hitSelectMode));
 for(const id of ['c03-add-mask','c03-mask-edit','c03-add-vector-mask','c03-mask-enabled','c03-mask-inverted','c03-vector-inverted','c03-alpha-lock','c03-blendif-apply','c03-blendif-clear','c03-duplicate','c03-merge-down'])$(id).disabled=!raster;
 $('c03-layer-parent').disabled=!selected;
 const filtered=Boolean($('c03-layer-search').value||$('c03-filter-type').value||$('c03-filter-tag').value);
 for(const id of ['c03-layer-up','c03-layer-down'])$(id).disabled=!selected||filtered;
 const opts=selected?.blendIf;
 $('c03-blendif-channel').value=opts?.channel||'luminance';$('c03-blendif-space').value=opts?.space||'encoded';
 for(const [id,field,key] of [['source-low','sourceRange','low0'],['source-high','sourceRange','high1'],['back-low','backdropRange','low0'],['back-high','backdropRange','high1']])
  $('c03-blendif-'+id).value=Math.round(255*(opts?.[field]?.[key]??(key==='low0'?0:1)));
 const list=$('c03-comp-list'),selectedComp=list.value;list.replaceChildren(...layerComps.map((comp,i)=>new Option(comp.name,String(i))));
 if(layerComps.some((comp,i)=>String(i)===selectedComp))list.value=selectedComp;
 $('c03-layer-hint').textContent=filtered?'検索中は並び替えを停止しています。':'層数: '+layerTree.layers.length+(maskPaintMode?' / マスク描画中':'');
}

function renderLayerPanel(){
 const list=$('c03-layer-list');list.replaceChildren();
 const search=$('c03-layer-search').value.trim().toLocaleLowerCase();
 const filtered=layerTree.layers.filter(layer=>layer.name.toLocaleLowerCase().includes(search)&&(!$('c03-filter-type').value||layer.type===$('c03-filter-type').value)&&(!$('c03-filter-tag').value||layer.tag===$('c03-filter-tag').value));
 for(const layer of [...filtered].reverse()){
  const row=document.createElement('div');row.className='c03-row'+(layer.id===layerTree.selectedId?' selected':'');row.style.paddingLeft=(4+Math.min(6,(()=>{let n=0,p=layer.parentId;while(p&&n<6){n++;p=layerTree.layers.find(l=>l.id===p)?.parentId}return n})())*12)+'px';
  const multi=document.createElement('input');multi.type='checkbox';multi.className='c03-multi';multi.checked=selectedMulti.has(layer.id);multi.title='複数選択';multi.onchange=()=>multi.checked?selectedMulti.add(layer.id):selectedMulti.delete(layer.id);
  const visible=document.createElement('button');visible.textContent=layer.visible?'◉':'○';visible.title='表示/非表示';
  visible.onclick=()=>{const before=structuredClone(layerTree);setLayerVisibility(layerTree,layer.id,!layer.visible);layerEdit(before,'表示切替')};
  const select=document.createElement('button');select.textContent=layer.name;select.title='描画レイヤー選択';
  select.onclick=()=>{selectLayer(layerTree,layer.id);maskPaintMode=false;renderLayerPanel()};
  if(layer.tag){const swatch=document.createElement('i');swatch.className='c03-layer-tag';swatch.dataset.tag=layer.tag;swatch.title='色タグ '+layer.tag;row.append(swatch)}
  row.append(multi,visible,select);list.append(row);
 }
 const selected=layerTree.layers.find(l=>l.id===layerTree.selectedId);
 for(const id of ['c03-layer-opacity','c03-layer-name','c03-layer-tag','c03-layer-blend','c03-lock-position','c03-lock-pixels','c03-lock-all'])$(id).disabled=!selected;
 $('c03-layer-name').value=selected?.name??'';
 $('c03-layer-tag').value=selected?.tag??'';
 $('c03-layer-blend').value=selected?.blendMode??'normal';
 $('c03-lock-position').checked=Boolean(selected?.locks.position);
 $('c03-lock-pixels').checked=Boolean(selected?.locks.pixels);
 $('c03-lock-all').checked=Boolean(selected?.locks.all);
 $('c03-layer-opacity').value=Math.round((selected?.opacity??1)*100);
 $('c03-layer-opacity-out').textContent=$('c03-layer-opacity').value+'%';
 $('c03-solo').setAttribute('aria-pressed',String(soloLayerId===selected?.id&&!!selected));
 $('c03-layer-hint').textContent=search&&!filtered.some(l=>l.id===selected?.id)?'選択中のレイヤーは検索結果外です。検索解除で表示できます。':'グループ・マスク・特殊合成は未統合です。';
 renderAdvancedLayerPanel();
}
function publishLayerState(){
 if(!rasterWorker||workerFault)return;
 const seq=++rasterSeq;minimumPublicationSeq=seq;
 formalStates.set(seq,{index:history.index,revision:history.revision,acceptedAt:performance.timeOrigin+performance.now()});
 queueRaster({type:'layers',epoch:documentEpoch,seq,layers:structuredClone(layerTree.layers)});
 dirty();
}
function layerEdit(before,label){
 history.accept({kind:'layers',label,before,after:structuredClone(layerTree)});
 publishLayerState();renderLayerPanel();dirty();
}
$('c03-add-layer').onclick=()=>{
 if(!rasterWorker){notify('この環境では複数レイヤー描画を利用できません');return}
 if((layerTree.layers.length+1)*doc.width*doc.height*4>256*1024*1024){notify('レイヤー用メモリ予算を超えます');return}
 const before=structuredClone(layerTree);
 addRasterLayer(layerTree,'レイヤー'+(layerTree.layers.length+1));
 layerEdit(before,'レイヤー追加');
};
let opacityOrigin=null;
$('c03-layer-opacity').addEventListener('pointerdown',()=>{opacityOrigin=structuredClone(layerTree)});
$('c03-layer-opacity').addEventListener('input',e=>{
 const layer=layerTree.layers.find(l=>l.id===layerTree.selectedId);if(!layer)return;
 if(!opacityOrigin)opacityOrigin=structuredClone(layerTree);
 setLayerOpacity(layerTree,layer.id,Number(e.target.value)/100);
 $('c03-layer-opacity-out').textContent=e.target.value+'%';publishLayerState();
});
$('c03-layer-opacity').addEventListener('change',()=>{
 if(!opacityOrigin)return;const before=opacityOrigin;opacityOrigin=null;
 if(JSON.stringify(before.layers)!==JSON.stringify(layerTree.layers))layerEdit(before,'不透明度');
});
$('c03-layer-search').addEventListener('input',renderLayerPanel);
function editSelectedLayer(label,change){
 const current=layerTree.layers.find(l=>l.id===layerTree.selectedId);
 if(!current)return;
 const before=structuredClone(layerTree);
 change(current);
 if(JSON.stringify(before.layers)!==JSON.stringify(layerTree.layers))layerEdit(before,label);
 else renderLayerPanel();
}
$('c03-layer-name').addEventListener('change',e=>editSelectedLayer('レイヤー名',(layer)=>{
 const name=String(e.target.value).trim();
 if(name)layer.name=name;else notify('空のレイヤー名は使用できません');
}));
$('c03-layer-tag').addEventListener('change',e=>editSelectedLayer('色タグ',(layer)=>layer.tag=e.target.value));
$('c03-layer-blend').addEventListener('change',e=>editSelectedLayer('合成モード',(layer)=>{
 if(!BLEND_MODES.includes(e.target.value)&&e.target.value!=='dissolve')throw Error('未対応の合成モード');
 layer.blendMode=e.target.value;
}));
for(const [id,field] of [['c03-lock-position','position'],['c03-lock-pixels','pixels'],['c03-lock-all','all']]){
 $(id).addEventListener('change',e=>editSelectedLayer(field+' lock',(layer)=>layer.locks[field]=e.target.checked));
}
$('c03-solo').onclick=()=>{
 const id=layerTree.selectedId;if(!id)return;
 soloLayerId=soloLayerId===id?null:id;
 const seq=++rasterSeq;
 minimumPublicationSeq=seq;
 formalStates.set(seq,{index:history.index,revision:history.revision,acceptedAt:performance.timeOrigin+performance.now()});
 queueRaster({type:'solo',epoch:documentEpoch,seq,layerId:soloLayerId});
 renderLayerPanel();dirty();
};


function layerOperation(before,operation,label){
 if(!rasterWorker||workerFault){notify('この操作にはRaster Workerが必要です');layerTree=before;renderLayerPanel();return}
 const seq=++rasterSeq;minimumPublicationSeq=seq;
 history.accept({kind:'layer-operation',before,after:structuredClone(layerTree),label});
 formalStates.set(seq,{index:history.index,revision:history.revision,acceptedAt:performance.timeOrigin+performance.now()});
 queueRaster({type:'layer-operation',epoch:documentEpoch,seq,operation,layers:structuredClone(layerTree.layers)});
 renderLayerPanel();dirty();
}
$('c03-add-group').onclick=()=>{
 if(layerTree.layers.length>=100){notify('レイヤー上限です');return}
 const before=structuredClone(layerTree);addGroupLayer(layerTree,'グループ');maskPaintMode=false;layerEdit(before,'グループ追加');
};
$('c03-group-selected').onclick=()=>{
 const ids=[...selectedMulti].filter(id=>layerTree.layers.some(l=>l.id===id));
 if(!ids.length){notify('行のチェックボックスでまとめる層を選択してください');return}
 const before=structuredClone(layerTree);
 try{groupLayers(layerTree,ids);selectedMulti.clear();maskPaintMode=false;layerEdit(before,'グループ化')}
 catch(e){layerTree=before;notify(e.message)}
};
$('c03-ungroup').onclick=()=>{
 const layer=layerTree.layers.find(l=>l.id===layerTree.selectedId);
 if(layer?.type!=='group')return notify('グループを選んでください');
 const before=structuredClone(layerTree);
 for(const child of layerTree.layers.filter(l=>l.parentId===layer.id))child.parentId=layer.parentId??null;
 layerTree.layers=layerTree.layers.filter(l=>l!==layer);
 layerTree.selectedId=layerTree.layers[0]?.id||null;
 layerEdit(before,'グループ解除');
};
for(const [id,direction] of [['c03-layer-up',1],['c03-layer-down',-1]]){
 $(id).onclick=()=>{const before=structuredClone(layerTree);if(moveLayer(layerTree,layerTree.selectedId,direction))layerEdit(before,'並べ替え')};
}
$('c03-layer-parent').onchange=e=>{
 const before=structuredClone(layerTree);
 try{setLayerParent(layerTree,layerTree.selectedId,e.target.value||null);layerEdit(before,'所属グループ')}
 catch(err){layerTree=before;renderLayerPanel();notify(err.message)}
};
for(const id of ['c03-filter-type','c03-filter-tag'])$(id).onchange=renderLayerPanel;
$('c03-duplicate').onclick=()=>{
 const source=layerTree.layers.find(l=>l.id===layerTree.selectedId);
 if(source?.type!=='raster')return;
 if((layerTree.layers.filter(l=>l.type==='raster').length+1)*doc.width*doc.height*4>256*1024*1024){notify('複製後のメモリ予算を超えます');return}
 const before=structuredClone(layerTree),target=duplicateRasterLayer(layerTree,source.id);
 layerOperation(before,{kind:'duplicate',sourceId:source.id,targetId:target.id},'レイヤー複製');
};
$('c03-merge-down').onclick=()=>{
 const upper=layerTree.layers.find(l=>l.id===layerTree.selectedId),siblings=layerTree.layers.filter(l=>(l.parentId??null)===(upper?.parentId??null));
 const lower=siblings[siblings.indexOf(upper)-1];
 if(!lower||upper?.type!=='raster'||lower.type!=='raster')return notify('直下のRasterレイヤーが必要です');
 const compatible=l=>l.visible&&l.opacity===1&&l.blendMode==='normal'&&!l.mask&&!l.vectorMask&&!l.blendIf&&!l.clipped&&!l.alphaLock&&!l.locks?.all;
 if(!compatible(upper)||!compatible(lower))return notify('特殊な合成やマスクがある層は外観保護のため結合できません');
 const before=structuredClone(layerTree);
 layerTree.layers=layerTree.layers.filter(l=>l.id!==upper.id);layerTree.selectedId=lower.id;
 layerOperation(before,{kind:'merge',upperId:upper.id,lowerId:lower.id},'下へ結合');
};
$('c03-layer-clipped').onchange=e=>editSelectedLayer('クリッピング',layer=>layer.clipped=e.target.checked);
$('c03-alpha-lock').onchange=e=>editSelectedLayer('透明度ロック',layer=>layer.alphaLock=e.target.checked);
$('c03-add-mask').onclick=()=>editSelectedLayer('画素マスク追加',layer=>{
 if(layer.type!=='raster')return;
 if(layer.mask){notify('画素マスクは既にあります');return}
 layer.mask={type:'pixel',enabled:true,inverted:false,linked:true};
});
$('c03-mask-enabled').onchange=e=>editSelectedLayer('マスク有効',layer=>{if(layer.mask)layer.mask.enabled=e.target.checked});
$('c03-mask-inverted').onchange=e=>editSelectedLayer('画素マスク反転',layer=>{if(layer.mask)layer.mask.inverted=e.target.checked});
$('c03-mask-edit').onclick=()=>{
 const layer=layerTree.layers.find(l=>l.id===layerTree.selectedId);
 if(!layer?.mask)return notify('先に画素マスクを追加してください');
 maskPaintMode=!maskPaintMode;renderLayerPanel();
};
$('c03-add-vector-mask').onclick=()=>{
 const value=prompt('矩形マスクを x,y,幅,高さ で指定', '0,0,'+doc.width+','+doc.height);
 if(value==null)return;
 const numbers=value.split(/[,，\s]+/).map(Number);
 if(numbers.length!==4||numbers.some(n=>!Number.isFinite(n))||numbers[2]<=0||numbers[3]<=0)return notify('矩形の指定が無効です');
 editSelectedLayer('矩形ベクターマスク',layer=>layer.vectorMask={enabled:true,inverted:false,rect:numbers});
};
$('c03-vector-inverted').onchange=e=>editSelectedLayer('矩形マスク反転',layer=>{if(layer.vectorMask)layer.vectorMask.inverted=e.target.checked});
$('c03-hit-select').onclick=()=>{hitSelectMode=!hitSelectMode;renderLayerPanel()};
function blendIfRange(low,high){
 if(!Number.isInteger(low)||!Number.isInteger(high)||low<0||high>255||low>=high)throw Error('下限と上限を0〜255で正しく指定してください');
 const a=low/255,b=high/255;
 return {low0:a,low1:a===0?0:Math.min(a+.025,b),high0:b===1?1:Math.max(a,b-.025),high1:b};
}
$('c03-blendif-apply').onclick=()=>{
 try{
  const bi={channel:$('c03-blendif-channel').value,space:$('c03-blendif-space').value,
   sourceRange:blendIfRange(Number($('c03-blendif-source-low').value),Number($('c03-blendif-source-high').value)),
   backdropRange:blendIfRange(Number($('c03-blendif-back-low').value),Number($('c03-blendif-back-high').value))};
  editSelectedLayer('階調依存合成',layer=>layer.blendIf=bi);
 }catch(e){notify(e.message)}
};
$('c03-blendif-clear').onclick=()=>editSelectedLayer('階調依存合成解除',layer=>delete layer.blendIf);
$('c03-comp-create').onclick=()=>{
 const name=$('c03-comp-name').value.trim()||'案 '+(layerComps.length+1);
 if(layerComps.some(c=>c.name===name))return notify('同名の案があります');
 const before=structuredClone(layerComps);
 layerComps.push({name,layers:layerTree.layers.map(({id,visible,opacity,blendMode})=>({id,visible,opacity,blendMode}))});
 history.accept({kind:'comps',label:'カンプ記録',before,after:structuredClone(layerComps)});renderLayerPanel();dirty();
};
$('c03-comp-apply').onclick=()=>{
 const comp=layerComps[Number($('c03-comp-list').value)];if(!comp)return;
 const before=structuredClone(layerTree);let missing=0;
 for(const saved of comp.layers){
  const layer=layerTree.layers.find(l=>l.id===saved.id);
  if(!layer){missing++;continue}
  Object.assign(layer,{visible:saved.visible,opacity:saved.opacity,blendMode:saved.blendMode});
 }
 layerEdit(before,'カンプ適用');if(missing)notify(missing+'層が削除されているため適用されませんでした');
};
$('c03-comp-delete').onclick=()=>{
 const index=Number($('c03-comp-list').value);
 if(!Number.isInteger(index)||index<0||index>=layerComps.length)return;
 const before=structuredClone(layerComps);layerComps.splice(index,1);
 history.accept({kind:'comps',label:'カンプ削除',before,after:structuredClone(layerComps)});renderLayerPanel();dirty();
};


async function save(as=false){
 if(interrupted||workerFault){notify('描画の中断を解消してから保存してください');return}
 const strokeArchive=rasterWorker?null:archiveStrokes(),recoveryAtFence=[...recoveryStrokes];
 const revision=history.revision,epoch=documentEpoch,meta=structuredClone(doc);
 // Capture the exact accepted raster at request time before any await; encode asynchronously.
 let frozen,picker=null;
 try{
  const nativePromise=rasterWorker?workerNative(epoch,meta,revision,{layerComps:structuredClone(layerComps)}):null;
  if(!rasterWorker){frozen=document.createElement('canvas');frozen.width=meta.width;frozen.height=meta.height;frozen.getContext('2d').drawImage(canvas,0,0);}
  const filename=meta.name.replace(/[\\/:*?"<>|]/g,'_')+'.illustro';
  const hasPicker=typeof window.showSaveFilePicker==='function';
  // File picker must start synchronously inside the user's click activation.
  if(hasPicker){picker=(!as&&handle)?Promise.resolve(handle):window.showSaveFilePicker({suggestedName:filename,types:[{description:'Illustro Native',accept:{'application/json':['.illustro']}}]});picker.catch(()=>{});}
  $('save-status').textContent='保存データを準備中…';
  let contents;
  if(nativePromise)contents=await nativePromise;
  else{
   const blob=await new Promise((resolve,reject)=>frozen.toBlob(b=>b?resolve(b):reject(new Error('PNG生成に失敗')),'image/png'));
   const manifest=createManifest(meta,await blobDataURL(blob),revision,strokeArchive);
   if(recoveryAtFence.length)manifest.brushArchive.recovery=recoveryAtFence;
   contents=JSON.stringify(manifest);
  }
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
async function open(file){
 if(!file||!allowDocumentChange())return;
 const epoch=documentEpoch,revision=history.revision;
 if(history.revision!==savedRev&&history.canUndo&&!confirm('未保存の作品を破棄して開きますか？'))return;
 try{
  const native=readLayeredManifest(await file.text());
  if(!rasterWorker&&native.layers.length>1)throw Error('複数レイヤーNativeにはRaster Workerが必要です');
  const layers=native.layers.map(layer=>{
   if(!['raster','group'].includes(layer.type)||layer.children?.length)throw Error('未対応のレイヤー形式です');
   if(!BLEND_MODES.includes(layer.blendMode||'normal')&&layer.blendMode!=='dissolve')throw Error('この合成モードは未対応です');
   return {...layer,lifetime:layer.lifetime||1,blendMode:layer.blendMode||'normal',locks:layer.locks||{}};
  });
  const images=[];
  for(const layer of layers){
   if(layer.type==='group'){images.push(null);continue}
   const img=new Image();
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('PNG decode failed'));img.src=layer.png});
   if(img.width!==native.document.width||img.height!==native.document.height)throw Error('PNGサイズの不一致');
   images.push(img);
  }
  if(epoch!==documentEpoch||revision!==history.revision||!allowDocumentChange())throw Error('読込中に作品が変更されました');
  resetDoc(native.document);
  layerTree.layers=layers.map(({png,...other})=>other);
  layerTree.selectedId=layerTree.layers.at(-1).id;
  layerTree.nextId=1+Math.max(0,...layerTree.layers.map(layer=>Number(/^layer-([0-9]+)$/.exec(layer.id)?.[1]||0)));
  layerComps=Array.isArray(native.history?.layerComps)?structuredClone(native.history.layerComps):[];renderLayerPanel();
  priorStrokes=native.brushArchive?.strokes||[];
  recoveryStrokes=native.brushArchive?.recovery||[];
  lastFormal={strokes:[...priorStrokes],revision:0};
  ctx.clearRect(0,0,doc.width,doc.height);
  layers.forEach((layer,i)=>{
   if(layer.type!=='raster'||!layer.visible)return;
   ctx.save();ctx.globalAlpha=layer.opacity;
   ctx.globalCompositeOperation={normal:'source-over',multiply:'multiply',screen:'screen'}[layer.blendMode];
   ctx.drawImage(images[i],0,0);ctx.restore();
  });
  pctx.clearRect(0,0,doc.width,doc.height);pctx.drawImage(ctx.canvas,0,0);
  for(let y=0;y<doc.height;y+=tileSize)for(let x=0;x<doc.width;x+=tileSize){
   const key=Math.floor(y/tileSize)*Math.ceil(doc.width/tileSize)+Math.floor(x/tileSize),box=tileBox(key,doc.width,doc.height);
   formalTiles.set(key,{box,image:ctx.getImageData(x,y,box.w,box.h)});
  }
  if(previewWorker){
   const pictures=[...formalTiles].map(([key,{box,image}])=>({key,box,image:new ImageData(new Uint8ClampedArray(image.data),box.w,box.h)}));
   previewWorker.postMessage({type:'base',epoch:documentEpoch,pictures,retired:[]},pictures.map(p=>p.image.data.buffer));
  }
  renderRepeat();
  if(rasterWorker){const seq=++rasterSeq;minimumPublicationSeq=seq;formalStates.set(seq,{index:history.index,revision:history.revision,acceptedAt:performance.timeOrigin+performance.now()});queueRaster({type:'load',epoch:documentEpoch,seq,layers,archive:priorStrokes,recovery:recoveryStrokes});}
  savedRev=history.revision;dirty();notify('Native作品を開きました');
 }catch(error){notify('読込に失敗: '+error.message)}
}
$('open-file').addEventListener('change',e=>{open(e.target.files[0]);e.target.value=''})
const commands={new:showDialog,open:()=>$('open-file').click(),save:()=>save(),saveas:()=>save(true),undo,redo,fit,actual:()=>{view=zoomAt(view,1/view.scale,{x:stage.clientWidth/2,y:stage.clientHeight/2});scheduleView()},resetrotation:()=>{view=zoomAt(view,1,{x:stage.clientWidth/2,y:stage.clientHeight/2},-view.rotation);scheduleView()},resetflip:()=>{view=flipAtDocumentCenter(view,doc.width,doc.height,{flipX:false,flipY:false});scheduleView()},flipx:()=>{view=flipAtDocumentCenter(view,doc.width,doc.height,{flipX:!view.flipX});scheduleView()},flipy:()=>{view=flipAtDocumentCenter(view,doc.width,doc.height,{flipY:!view.flipY});scheduleView()},grid:()=>{grid.dataset.show=grid.dataset.show==='1'?'0':'1';gridPainted=false;scheduleView()},applymeta:applyMeta,template:addTemplate};all('[data-action]').forEach(b=>b.addEventListener('click',()=>commands[b.dataset.action]?.()));all('[data-tool]').forEach(b=>b.addEventListener('click',()=>selectTool(b.dataset.tool)));
$('quick-tool').onclick=() =>selectTool(isEraser(settings.tool)?settings.lastBrush:'hardEraser');$('quick-color').onclick=()=>{showPanel();$('color-section').scrollIntoView({block:'start'})};$('mobile-eraser').onclick=()=>selectTool(isEraser(settings.tool)?settings.lastBrush:'hardEraser');$('mobile-tools').onclick=()=>{showPanel();$('tool-name').scrollIntoView()};$('mobile-color').onclick=()=>$('quick-color').click();$('mobile-size').onclick=()=>{showPanel();$('size').focus()};
function showPanel(){$('workspace').classList.remove('collapsed')};$('panel-toggle').onclick=()=>$('workspace').classList.toggle('collapsed');$('close-panel').onclick=()=>$('workspace').classList.add('collapsed');
const resizer=$('resize-handle');resizer.addEventListener('pointerdown',e=>resizer.setPointerCapture(e.pointerId));resizer.addEventListener('pointermove',e=>{if(e.buttons&&resizer.hasPointerCapture(e.pointerId)){$('workspace').style.width=clamp(window.innerWidth-e.clientX,250,Math.min(window.innerWidth*.44,480))+'px'}});
$('zoom-n').addEventListener('change',e=>{const z=clamp(Number(e.target.value)/100,.05,64);view=zoomAt(view,z/view.scale,{x:stage.clientWidth/2,y:stage.clientHeight/2});scheduleView()});
const temporaryKeys={Space:'pan',KeyE:'erase',KeyI:'sample'};
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLElement&&e.target.closest('input,textarea,select,dialog,[contenteditable]'))return;
 const ctrl=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
 if(ctrl&&key==='z'){e.preventDefault();e.shiftKey?redo():undo()}
 else if(ctrl&&key==='y'){e.preventDefault();redo()}
 else if(ctrl&&key==='s'){e.preventDefault();save(e.shiftKey)}
 else if(!ctrl&&!e.altKey&&temporaryKeys[e.code]&&!(e.code==='Space'&&e.target instanceof HTMLButtonElement)){e.preventDefault();if(!e.repeat)hold(e.code,temporaryKeys[e.code])}
});
window.addEventListener('keyup',e=>{if(temporaryKeys[e.code])release(e.code)});
window.addEventListener('resize',scheduleView);
if(typeof ResizeObserver==='function')new ResizeObserver(scheduleView).observe(stage);
setColor(settings.color,false);resetDoc(doc);selectTool('gpen');
if(matchMedia('(max-width:720px)').matches)$('workspace').classList.add('collapsed');
if(!rasterWorker)notify('この端末では筆の確定が同期処理になります');
