/** The handle owns vertical dragging. The rest of the row still scrolls. */
export function bindLayerReorder(
 handle:HTMLButtonElement,list:HTMLElement,source:HTMLElement,
 canDrop:(row:HTMLElement)=>boolean,drop:(row:HTMLElement)=>void,step:(direction:1|-1)=>void,
){
 let active:number|null=null,startY=0,point:PointerEvent|null=null,target:HTMLElement|null=null,frame=0;
 const setTarget=(next:HTMLElement|null)=>{
  if(next===target)return;
  target?.classList.remove('layer-drop-target');
  target=next;
  target?.classList.add('layer-drop-target');
 };
 const hit=()=>{
  if(!point)return;
  const row=document.elementFromPoint(point.clientX,point.clientY)?.closest<HTMLElement>('[data-layer-drop],[data-group-drop]');
  setTarget(row&&row!==source&&list.contains(row)&&canDrop(row)?row:null);
 };
 const scroll=()=>{
  if(!point||active===null||!source.isConnected)return;
  const rect=list.getBoundingClientRect(),y=point.clientY;
  if(y<rect.top+30)list.scrollTop-=8;
  else if(y>rect.bottom-30)list.scrollTop+=8;
  hit();
  frame=requestAnimationFrame(scroll);
 };
 const clear=()=>{
  const row=target;
  active=null;point=null;setTarget(null);
  cancelAnimationFrame(frame);
  source.classList.remove('layer-dragging');
  return row;
 };
 handle.onpointerdown=event=>{
  if(event.button!==0||active!==null)return;
  active=event.pointerId;startY=event.clientY;
  handle.setPointerCapture(event.pointerId);
 };
 handle.onpointermove=event=>{
  if(active!==event.pointerId||!point&&Math.abs(startY-event.clientY)<5)return;
  const first=!point;point=event;
  if(first){source.classList.add('layer-dragging');scroll();}
  else hit();
 };
 handle.onpointerup=event=>{
  if(active!==event.pointerId)return;
  const row=clear();
  if(row)drop(row);
 };
 handle.onpointercancel=handle.onlostpointercapture=clear;
 handle.onkeydown=event=>{
  if(event.key!=='ArrowUp'&&event.key!=='ArrowDown')return;
  event.preventDefault();
  step(event.key==='ArrowUp'?1:-1);
 };
}
