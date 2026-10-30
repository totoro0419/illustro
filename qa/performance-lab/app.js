(function(){'use strict';
const C=window.IllustroBenchCore;
const $=id=>document.getElementById(id);
const vw=$('viewport'),world=$('world'),base=$('drawing'),over=$('stroke-overlay'),warpOver=$('warp-overlay');
const bx=base.getContext('2d',{alpha:false,willReadFrequently:false}),px=over.getContext('2d'),wx=warpOver.getContext('2d');
const W=512,H=384;for(const el of [base,over,warpOver]){el.width=W;el.height=H;el.style.width=W+'px';el.style.height=H+'px';}
world.style.width=W+'px';world.style.height=H+'px';
let src=C.fixture(W,H,213),current=C.clone(src),active=null,pending=[],rendering=false,transformId=0,warpDisplay=false;
let view={tx:0,ty:0,s:1,theta:0};const touches=new Map();let penTouches=0,gesture=null,mousePan=null,ptrCount=0,cancelCount=0,eventLagMax=0,maxGap=0,commits=0,commitTotal=0,lastYield=0,rafLast=0;
let report=null;
const interactionTrace=[];const labStart=performance.now();let touchWhileWorking=0,moveWhileWorking=0,cancelWhileWorking=0;const workWindows=[];
function interactionSnapshot(){return {pointerEventsTotal:ptrCount,pointerCancelTotal:cancelCount,pointerEventDeliveryToHandlerMaxMs:eventLagMax,overallRafGapMaxMs:maxGap,eventsDuringWork:interactionTrace.filter(x=>x.duringWork).length,touchEventsDuringWork:touchWhileWorking,touchMovesDuringWork:moveWhileWorking,pointerCancelsDuringWork:cancelWhileWorking,recordedEvents:interactionTrace.length,workWindows:workWindows.slice(-80),events:interactionTrace.slice(-1000),note:'JS-observed events only; not OS sensor input or pen-to-photon.'}}
function text(id,s){$(id).textContent=s;}
function initialView(){const r=vw.getBoundingClientRect();view={tx:(r.width-W*Math.min((r.width-32)/W,(r.height-32)/H))/2,ty:(r.height-H*Math.min((r.width-32)/W,(r.height-32)/H))/2,s:Math.min((r.width-32)/W,(r.height-32)/H),theta:0};applyView();}
function applyView(){const {tx,ty,s,theta}=view;world.style.transform='translate('+tx+'px,'+ty+'px) rotate('+theta+'rad) scale('+s+')';text('zoom-value',Math.round(s*100)+'% / '+Math.round(theta*180/Math.PI)+'°');}
function local(e){const r=vw.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
function docXY(pos,st=view){const x=(pos.x-st.tx)/st.s,y=(pos.y-st.ty)/st.s,c=Math.cos(st.theta),s=Math.sin(st.theta);return{x:c*x+s*y,y:-s*x+c*y};}
function drawBitmap(a){bx.putImageData(new ImageData(a.data,a.w,a.h),0,0);}
function drawPreview(){px.clearRect(0,0,W,H);const all=active?[...pending,active]:pending;for(const line of all){px.strokeStyle='rgba(236,70,43,.78)';px.fillStyle='rgba(236,70,43,.78)';px.lineWidth=line.radius*2;px.lineJoin='round';px.lineCap='round';px.beginPath();for(let i=0;i<line.points.length;i++){const p=line.points[i];if(!i)px.moveTo(p.x,p.y);else px.lineTo(p.x,p.y);}if(line.points.length===1){px.arc(line.points[0].x,line.points[0].y,line.radius,0,Math.PI*2);px.fill();}else px.stroke();}}
function stats(){text('touch-count','指入力 '+touches.size);text('pen-count','ペン入力 '+penTouches);text('queue-count','本線処理待ち '+pending.length);text('pointer-events',ptrCount.toLocaleString());text('pointer-cancel',cancelCount);text('touch-working',touchWhileWorking);text('input-lag',eventLagMax>0?eventLagMax.toFixed(1)+' ms':'—');text('max-gap',maxGap>0?maxGap.toFixed(1)+' ms':'—');text('frame-gap',maxGap>0?'最大フレーム間隔 '+maxGap.toFixed(1)+'ms':'最大フレーム間隔 —');text('commit-count',commits);text('commit-wall',commits?commitTotal.toFixed(1)+' ms':'—');text('yield-count',commits?String(lastYield):'—');}
function frame(now){if(rafLast && !document.hidden){const d=now-rafLast;if(d>maxGap)maxGap=d;}rafLast=document.hidden?0:now;stats();requestAnimationFrame(frame);}requestAnimationFrame(frame);
function record(e){ptrCount++;const at=performance.now(),delta=at-e.timeStamp;if(delta>=0&&delta<60000)eventLagMax=Math.max(eventLagMax,delta);const busy=rendering||pending.length>0;interactionTrace.push({atMs:Math.round((at-labStart)*10)/10,kind:e.type,pointerType:e.pointerType,duringWork:busy,pendingStrokes:pending.length,deliveryToHandlerMs:delta>=0&&delta<60000?Math.round(delta*10)/10:null});if(interactionTrace.length>1000)interactionTrace.shift();if(busy&&e.pointerType==='touch'){touchWhileWorking++;if(e.type==='pointermove')moveWhileWorking++;}if(busy&&e.type==='pointercancel')cancelWhileWorking++;}
function canDraw(e){return e.pointerType==='pen'||(e.pointerType!=='touch'&&e.button===0&&!e.shiftKey);}
function resetWarpPreview(){transformId++;wx.clearRect(0,0,W,H);warpDisplay=false;}
function beginGesture(){const p=[...touches.values()];if(p.length===2){const center={x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2};gesture={start:view,center,anchor:docXY(center),len:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),ang:Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x)};}else{gesture=null;}}
function touchUpdate(){const p=[...touches.values()];if(p.length!==2||!gesture)return;const m={x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2};const dist=Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),ang=Math.atan2(p[1].y-p[0].y,p[1].x-p[0].x);
const s=Math.max(.15,Math.min(6,gesture.start.s*(dist/Math.max(1,gesture.len)))),theta=gesture.start.theta+ang-gesture.ang;const a=gesture.anchor,c=Math.cos(theta),sin=Math.sin(theta);
view={tx:m.x-s*(c*a.x-sin*a.y),ty:m.y-s*(sin*a.x+c*a.y),s,theta};applyView();}
vw.addEventListener('pointerdown',e=>{record(e);vw.setPointerCapture(e.pointerId);const pos=local(e);if(e.pointerType==='touch'){touches.set(e.pointerId,pos);beginGesture();stats();return;}
 if(canDraw(e)){if(warpDisplay){resetWarpPreview();drawBitmap(current);}penTouches++;active={id:e.pointerId,points:[docXY(pos)],radius:13};drawPreview();}
 else if(e.shiftKey||e.button===1)mousePan={id:e.pointerId,pos};stats();});
vw.addEventListener('pointermove',e=>{record(e);const pos=local(e);
 if(e.pointerType==='touch'&&touches.has(e.pointerId)){
   const old=touches.get(e.pointerId);touches.set(e.pointerId,pos);
   if(touches.size===1){view={...view,tx:view.tx+pos.x-old.x,ty:view.ty+pos.y-old.y};applyView();}
   else if(touches.size===2)touchUpdate();stats();return;
 }
 if(mousePan&&mousePan.id===e.pointerId){view={...view,tx:view.tx+pos.x-mousePan.pos.x,ty:view.ty+pos.y-mousePan.pos.y};mousePan.pos=pos;applyView();}
 if(active&&active.id===e.pointerId){const evt=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[];const samples=evt.length?evt:[e];for(const s of samples){const v=docXY(local(s));const old=active.points.at(-1);if(!old||Math.hypot(old.x-v.x,old.y-v.y)>.55)active.points.push(v);}drawPreview();}stats();});
function endPointer(e,isCancel){record(e);if(e.pointerType==='touch'){touches.delete(e.pointerId);beginGesture();}
if(mousePan?.id===e.pointerId)mousePan=null;
if(active?.id===e.pointerId){const line=active;active=null;penTouches=Math.max(0,penTouches-1);if(!isCancel){pending.push(line);drain();}drawPreview();}
if(isCancel)cancelCount++;stats();}
vw.addEventListener('pointerup',e=>endPointer(e,false));vw.addEventListener('pointercancel',e=>endPointer(e,true));vw.addEventListener('lostpointercapture',e=>{if(active?.id===e.pointerId)endPointer(e,true);});
async function drain(){if(rendering)return;rendering=true;while(pending.length){const line=pending[0],start=performance.now();const windowRecord={kind:line.points.length>=1500?'heavy-stroke':'stroke',startAtMs:Math.round((start-labStart)*10)/10,endAtMs:null};workWindows.push(windowRecord);const t=await C.strokeChunked(current,line.points,line.radius,[241,74,54],180,4);windowRecord.endAtMs=Math.round((performance.now()-labStart)*10)/10;lastYield=t.yields;commitTotal+=performance.now()-start;commits++;pending.shift();drawBitmap(current);drawPreview();stats();}
rendering=false;}
function reset(){resetWarpPreview();if(rendering){text('live-status','描画中は初期化できません。正式線が完成してから実行してください。');return;}current=C.fixture(W,H,213);src=C.clone(current);active=null;pending=[];drawBitmap(current);drawPreview();initialView();text('live-status','初期化完了。タブレットのペンと指で同時操作を試せます。');}
$('reset').addEventListener('click',reset);
$('heavy').addEventListener('click',()=>{if(warpDisplay){resetWarpPreview();drawBitmap(current);}const points=C.strokePoints(W,H,1700);pending.push({points,radius:45});drawPreview();drain();text('live-status','太い線1700点の正式計算を分割中。指でキャンバスを動かしてください。');});
$('warp-strength').addEventListener('input',e=>text('warp-strength-value',e.target.value));
$('run-warp').addEventListener('click',async()=>{if(rendering){text('live-status','ブラシ確定後に変形を試してください。');return;}const token=++transformId,source=C.clone(current),strength=Number($('warp-strength').value);
 const t=performance.now();const approx=C.warpPreview(source,strength,4);const previewMs=performance.now()-t;
 const tiny=document.createElement('canvas');tiny.width=approx.w;tiny.height=approx.h;tiny.getContext('2d').putImageData(new ImageData(approx.data,approx.w,approx.h),0,0);
 wx.clearRect(0,0,W,H);wx.imageSmoothingEnabled=true;wx.drawImage(tiny,0,0,W,H);warpDisplay=true;
 text('live-status','変形の仮画像 '+previewMs.toFixed(1)+'ms。精細な正式画像を別途計算中（原本は保持）。');
 const start=performance.now();const exact=await C.warpChunked(source,strength,4,()=>token!==transformId);
 if(token!==transformId||exact.cancelled)return;
 drawBitmap(exact.dst);wx.clearRect(0,0,W,H); // exact display, source remains original for future work
 text('live-status','正式な変形表示 '+(performance.now()-start).toFixed(1)+'ms、分割yield '+exact.yields+'回。元画像は変更せず、次の描画でこの試行表示を解除します。');
});
function ms(x){return Number(x).toFixed(2)+' ms';}
function compareOrFail(a,b){const d=C.compare(a,b);return d.equal?{pass:true,label:'一致'}:{pass:false,label:'差 '+d.different+'要素 / 最大'+d.maxDifference,diff:d};}
function tableRow(name,ref,other,ok,info){const tr=document.createElement('tr');for(const [i,v] of [name,ref,other,ok.label,info].entries()){const td=document.createElement('td');td.textContent=v;if(i===3)td.className=ok.pass?'pass':'fail';tr.append(td);}return tr;}
function sleep(){return new Promise(r=>setTimeout(r,30));}
async function runAll(){const button=$('run-all');if(button.disabled)return;button.disabled=true;$('export').disabled=true;const workload=Number($('workload').value),items=[];const tbody=$('results');tbody.replaceChildren();text('result-notes','測定中です。同期計算方式では一時的に画面が停止する場合があります。');
 const statsAtStart={maxGap,events:ptrCount,cancels:cancelCount};
 const record=(kind,method,baselineMs,alternativeMs,correctness,conditions,extra)=>{items.push({kind,method,baselineMs,alternativeMs,correctness,conditions,...extra});tbody.append(tableRow(kind,ms(baselineMs),ms(alternativeMs),correctness,conditions));};
 const measure=fn=>{const t=performance.now(),v=fn();return {ms:performance.now()-t,value:v};};
 try{
 await sleep();{
  const src=C.fixture(workload,workload,1),pts=C.strokePoints(workload,workload,Math.round(workload*2.8)),a=C.clone(src),b=C.clone(src);
  const t1=measure(()=>C.strokeSync(a,pts,19));const start=performance.now(),step=await C.strokeChunked(b,pts,19,undefined,170,4);
  record('ブラシ','同期→分割',t1.ms,performance.now()-start,compareOrFail(a,b),workload+'² / '+pts.length+'点; 分割 '+step.yields+'回',{yields:step.yields,comparison:'synchronous time vs chunked wall time; responsiveness measured separately'});
 }
 await sleep();{
  const src=C.fixture(workload,workload,3),x=Math.floor(workload/2),y=Math.floor(workload/2),t=180;
  const a=measure(()=>C.fillBfs(src,x,y,t)),b=measure(()=>C.fillScanline(src,x,y,t));record('塗りつぶし','BFS→走査線',a.ms,b.ms,compareOrFail(a.value,b.value),workload+'² / 色差 '+t,{reference_pixels:a.value.length});
 }
 await sleep();{
  const n=Math.min(workload,265),p=C.polygonPath(n,n,420),a=measure(()=>C.lassoPoint(n,n,p)),b=measure(()=>C.lassoScanline(n,n,p));
  record('投げ縄','点内判定→走査線',a.ms,b.ms,compareOrFail(a.value,b.value),n+'² / 輪郭420点');
 }
 await sleep();{
  const n=Math.min(workload,180),src=C.fixture(n,n,17),r=10,a=measure(()=>C.blurDirect(src,r)),b=measure(()=>C.blurSeparable(src,r));
  record('箱型ぼかし','2D直接→分離型',a.ms,b.ms,compareOrFail(a.value,b.value),n+'² / 半径 '+r+'; Gaussianではない');
 }
 await sleep();{
  const src=C.fixture(workload,workload,26),strength=26,aa=measure(()=>C.warpFull(src,strength)),bb=measure(()=>C.warpPreview(src,strength,4));const start=performance.now();const final=await C.warpChunked(src,strength,4),exact=compareOrFail(aa.value,final.dst);
  record('歪み変形','全画素→1/4仮画像',aa.ms,bb.ms,exact,workload+'²; 正式分割 '+ms(performance.now()-start)+' / yield '+final.yields,{previewApproximation:true,formalMatch:exact.pass,formalElapsedMs:performance.now()-start,previewWidth:bb.value.w,previewHeight:bb.value.h});
 }
 const finishStats={maxGap,events:ptrCount,cancels:cancelCount};
 report={schema:2,source:'illustro-independent-performance-lab',date:new Date().toISOString(),environment:{userAgent:navigator.userAgent,deviceMemory:navigator.deviceMemory??null,hardwareConcurrency:navigator.hardwareConcurrency??null,devicePixelRatio:window.devicePixelRatio??null,viewport:{width:innerWidth,height:innerHeight},visibility:document.visibilityState},workload,metrics:{start:statsAtStart,end:finishStats,pointerEventDeliveryToHandlerMaxMs:eventLagMax,overallRafGapMaxMs:maxGap,note:'JS measurements are NOT pen-to-photon or OS touch capture'},results:items,interaction:interactionSnapshot(),limits:['CPU JS-only; not production renderer','Only box blur not Gaussian','Warp preview intentionally lower fidelity; quality equality is verified for full image vs chunked final','Device memory usage not instrumented','No real app Save/Undo, ICC, multilayer compositing','Benchmark done sequentially; actual multitasking requires manual pointer interaction']};
 const fail=items.filter(x=>!x.correctness.pass);text('result-notes','完了：'+items.length+'件。正式結果の差分検査 '+(items.length-fail.length)+'/'+items.length+'件一致。'+(fail.length?'不一致を確認：最適化採用不可。':'この試験条件では一致。')+' 仮画像は低解像度のため正式結果と同画質ではありません。');
 $('export').disabled=false;
 }catch(e){console.error(e);text('result-notes','検査失敗：'+String(e));}finally{button.disabled=false;}
}
$('run-all').addEventListener('click',runAll);
$('export').addEventListener('click',()=>{if(!report)return;report.interaction=interactionSnapshot();report.exportedAt=new Date().toISOString();const blob=new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='illustro-bench-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);});
window.addEventListener('resize',()=>{if(!active&&touches.size===0)initialView();});
window.addEventListener('error',e=>{text('live-status','エラー: '+e.message)});
drawBitmap(current);initialView();
})();
