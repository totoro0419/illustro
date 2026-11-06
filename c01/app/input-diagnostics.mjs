/* Opt-in input delivery tracing. Never bypasses OS/browser palm rejection. */
export function enableInputDiagnostics(stage, state) {
 if(!new URLSearchParams(location.search).has('inputDebug'))return ()=>{};
 const entries=[],counts={touchstart:0,pointerTouch:0,stageTouch:0,navigation:0,penEnd:0};
 let lastPenEnd=NaN,lastRaf=0,lastTimer=performance.now(),maxRafGapMs=0,maxTimerGapMs=0;
 const longTasks=[];
 if(typeof PerformanceObserver==='function'&&PerformanceObserver.supportedEntryTypes?.includes('longtask'))new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push({start:e.startTime,duration:e.duration});if(longTasks.length>120)longTasks.splice(0,longTasks.length-120)}).observe({type:'longtask'});
 const heartbeat=t=>{if(!document.hidden&&lastRaf)maxRafGapMs=Math.max(maxRafGapMs,t-lastRaf);lastRaf=t;requestAnimationFrame(heartbeat)};requestAnimationFrame(heartbeat);
 setInterval(()=>{const now=performance.now();if(!document.hidden)maxTimerGapMs=Math.max(maxTimerGapMs,now-lastTimer);lastTimer=now},100);
 const panel=document.createElement('aside');panel.id='input-diagnostics';
 panel.setAttribute('aria-label','入力イベント診断');
 panel.innerHTML='<strong>入力診断（実機イベント）</strong><p id="input-diagnostic-summary"></p><pre id="input-diagnostic-events"></pre><button id="input-diagnostic-export" type="button">診断ログを保存</button><p>指が反応しないとき、記録にもイベントが無ければOS・ブラウザーから入力が届いていない可能性があります。</p>';
 document.body.append(panel);
 const summary=panel.querySelector('#input-diagnostic-summary'),events=panel.querySelector('#input-diagnostic-events');
 function record(kind,e=null){
  const now=performance.now(),msSincePen=Number.isFinite(lastPenEnd)?Math.round(now-lastPenEnd):null;
  if(kind==='pen-up'||kind==='pen-cancel'||kind==='pen-lost'){lastPenEnd=now;counts.penEnd++}
  if(kind==='touchstart')counts.touchstart++;
  if(kind==='pointer-touch-down')counts.pointerTouch++;
  if(kind==='stage-touch-down')counts.stageTouch++;
  if(kind==='nav-move')counts.navigation++;
  const stamp=e?.timeStamp,normalized=Number.isFinite(stamp)?(stamp>1e12?stamp-performance.timeOrigin:stamp):null;
  entries.push({time:Math.round(now),eventTime:normalized,deliveryLagMs:normalized===null?null:Math.max(0,now-normalized),trusted:e?.isTrusted??null,kind,pointerType:e?.pointerType||null,pointerId:e?.pointerId??null,msSincePen,nav:state().nav,active:state().active,rasterPending:state().rasterPending??null});
  if(entries.length>120)entries.shift();
  summary.textContent='TouchEvent開始 '+counts.touchstart+' / PointerEvent指開始 '+counts.pointerTouch+' / Canvas指開始 '+counts.stageTouch+' / 移動処理 '+counts.navigation+' / ペン終了 '+counts.penEnd;
  events.textContent=entries.slice(-9).map(x=>x.time+'ms '+x.kind+(x.msSincePen===null?'':' (+'+x.msSincePen+'ms)')+' id='+(x.pointerId??'-')+' nav='+x.nav).join('\n');
 }
 window.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')record('pointer-touch-down',e)},{capture:true,passive:true});
 window.addEventListener('touchstart',e=>record('touchstart',e),{capture:true,passive:true});
 window.addEventListener('pointercancel',e=>{if(e.pointerType==='touch')record('pointer-touch-cancel',e)},{capture:true,passive:true});
 window.addEventListener('lostpointercapture',e=>{if(e.pointerType==='pen')record('pen-lost',e)},{capture:true,passive:true});
 panel.querySelector('#input-diagnostic-export').addEventListener('click',()=>{
  const output={version:2,scope:'Browser-delivered events. No physical contact/scanout measurement. Missing events alone do not establish an OS cause.',maxRafGapMs,maxTimerGapMs,longTasks,createdAt:new Date().toISOString(),userAgent:navigator.userAgent,counts,entries,screen:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},maxTouchPoints:navigator.maxTouchPoints};
  const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='illustro-input-events.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 document.addEventListener('visibilitychange',()=>{lastRaf=0;lastTimer=performance.now();record('visibility-'+document.visibilityState)});
 record('diagnostics-start');
 return (kind,e)=>record(kind,e);
}
