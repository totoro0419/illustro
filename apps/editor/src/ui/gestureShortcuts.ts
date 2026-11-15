/** GST-001: opt-in multi-finger taps that never replace normal navigation. */
type GesturePreferences=Readonly<{twoFingerUndo:boolean;threeFingerRedo:boolean}>;
const KEY='illustro.c04.touch-gestures.v1';
function read():GesturePreferences{
  try{
    const item=JSON.parse(localStorage.getItem(KEY)||'null') as Record<string,unknown>|null;
    if(item?.version===1&&typeof item.twoFingerUndo==='boolean'&&typeof item.threeFingerRedo==='boolean')
      return {twoFingerUndo:item.twoFingerUndo,threeFingerRedo:item.threeFingerRedo};
  }catch{/* storage unavailable */}
  return {twoFingerUndo:false,threeFingerRedo:false};
}
function write(value:GesturePreferences){try{localStorage.setItem(KEY,JSON.stringify({version:1,...value}));}catch{/* storage unavailable */}}
type Contact=Readonly<{x:number;y:number;started:number}>;
export function installGestureShortcuts(){
  const workspace=document.getElementById('workspaceBoxBody');
  const viewport=document.querySelector<HTMLElement>('.surface');
  if(!workspace||!viewport)return;
  let settings=read();
  const details=document.createElement('details');details.className='c04-gesture-settings';
  const title=document.createElement('summary');title.textContent='指で戻す・やり直す';
  const message=document.createElement('p');
  message.textContent='指でキャンバスを動かす操作はそのまま使えます。誤って戻さないよう、短い同時タップだけを判定します。初期設定はオフです。';
  const undo=document.createElement('input'),redo=document.createElement('input');
  undo.type=redo.type='checkbox';undo.checked=settings.twoFingerUndo;redo.checked=settings.threeFingerRedo;
  const undoLabel=document.createElement('label');undoLabel.append(undo,document.createTextNode(' 二本指で短くタップして元に戻す'));
  const redoLabel=document.createElement('label');redoLabel.append(redo,document.createTextNode(' 三本指で短くタップしてやり直す'));
  const status=document.createElement('output');status.setAttribute('role','status');
  details.append(title,message,undoLabel,redoLabel,status);workspace.append(details);
  undo.onchange=redo.onchange=()=>{
    settings={twoFingerUndo:undo.checked,threeFingerRedo:redo.checked};write(settings);
    status.textContent='操作を変更しました。通常のUndo・Redoボタンも利用できます。';
  };
  let sequence:{
    started:number;lastDown:number;
    active:Map<number,Contact>;count:number;cancelled:boolean;finished:number;
  }|null=null;
  const cancel=()=>{sequence=null;};
  const checkTouch=(e:PointerEvent)=>e.pointerType==='touch'&&!!(e.target instanceof Element&&e.target.closest('.surface'))&&!e.isPrimary&&false;
  void checkTouch; // pointerType is used directly; no primary-pointer restriction.
  viewport.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch'||(!settings.twoFingerUndo&&!settings.threeFingerRedo))return;
    if(e.target instanceof Element&&e.target.closest('button,input,select,textarea,[contenteditable]'))return;
    const now=performance.now();
    if(!sequence||sequence.active.size===0){
      sequence={started:now,lastDown:now,active:new Map(),count:0,cancelled:false,finished:0};
    }
    const run=sequence;
    if(now-run.started>180||run.active.size>=3||Math.max(e.width,e.height)>=45)run.cancelled=true;
    run.active.set(e.pointerId,{x:e.clientX,y:e.clientY,started:now});
    run.count++;run.lastDown=now;
  },{capture:true,passive:true});
  viewport.addEventListener('pointermove',e=>{
    const run=sequence;if(!run||e.pointerType!=='touch'||run.cancelled)return;
    const first=run.active.get(e.pointerId);
    if(first&&Math.hypot(first.x-e.clientX,first.y-e.clientY)>10)run.cancelled=true;
  },{capture:true,passive:true});
  const finish=(e:PointerEvent,cancelled=false)=>{
    const run=sequence;
    if(!run||e.pointerType!=='touch'||!run.active.has(e.pointerId))return;
    const first=run.active.get(e.pointerId)!;
    if(cancelled||Math.hypot(first.x-e.clientX,first.y-e.clientY)>10)run.cancelled=true;
    run.active.delete(e.pointerId);run.finished=performance.now();
    if(run.active.size>0)return;
    sequence=null;
    if(run.cancelled||run.count<2||run.count>3||run.finished-run.started>260||run.lastDown-run.started>140)return;
    if(run.count===2&&!settings.twoFingerUndo||run.count===3&&!settings.threeFingerRedo)return;
    // Process after the canvas receives the last pointerup. Do not intercept or
    // delay native navigation pointer events and do not act during a stroke.
    queueMicrotask(()=>{
      if(document.querySelector('dialog[open]'))return;
      if((document.getElementById('finger') as HTMLInputElement|null)?.checked)return;
      const button=document.getElementById(run.count===2?'undo':'redo') as HTMLButtonElement|null;
      if(button&&!button.disabled){button.click();status.textContent=run.count===2?'二本指で元に戻しました。':'三本指でやり直しました。';}
    });
  };
  viewport.addEventListener('pointerup',e=>finish(e),{capture:true,passive:true});
  viewport.addEventListener('pointercancel',e=>finish(e,true),{capture:true,passive:true});
  window.addEventListener('blur',cancel);
}
