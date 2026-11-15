/** C04 UI-002: movable, resizable panels, separate from artwork operations. */
export type FloatPlacement=Readonly<{id:string;x:number;y:number;width:number;height:number}>;
export type FloatingPanelService=Readonly<{
  snapshot:()=>readonly FloatPlacement[];
  restore:(placements:readonly FloatPlacement[])=>void;
  reset:()=>void;
}>;
const KEY='illustro.c04.floating-panels.v1';
const selector='.workspace-box[data-box-id]';
const widthLimit=()=>Math.max(240,innerWidth-16);
const heightLimit=()=>Math.max(170,innerHeight-16);
function safeRead(){
  try{const stored=JSON.parse(localStorage.getItem(KEY)||'[]') as unknown;
    return parsePlacements(stored);}catch{return [];}
}
function parsePlacements(value:unknown):FloatPlacement[]{
  if(!Array.isArray(value)||value.length>32)throw Error('パネル位置の数が正しくありません。');
  const found=new Set<string>();
  return value.map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item))throw Error('パネル位置が不正です。');
    const data=item as Record<string,unknown>;
    if(typeof data.id!=='string'||!data.id||data.id.length>80||found.has(data.id))throw Error('パネルIDが不正です。');
    found.add(data.id);
    for(const key of ['x','y','width','height'])if(typeof data[key]!=='number'||!Number.isFinite(data[key]))throw Error('パネル位置の数値が不正です。');
    return {id:data.id,x:data.x as number,y:data.y as number,width:data.width as number,height:data.height as number};
  });
}
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const all=()=>[...document.querySelectorAll<HTMLElement>(selector)];
const isFloat=(box:HTMLElement)=>box.classList.contains('c04-panel-float');
export function installFloatingPanels():FloatingPanelService{
  const stack=document.getElementById('boxStack');
  if(!stack)return {snapshot:()=>[],restore:()=>{},reset:()=>{}};
  const slots=new Map<string,HTMLElement>();
  const placements=new Map<string,FloatPlacement>();
  const controls=new Map<HTMLElement,{handle:HTMLButtonElement;resize:HTMLButtonElement}>();
  function save(){try{localStorage.setItem(KEY,JSON.stringify([...placements.values()]));}catch{/* unsupported storage */}}
  function enforce(box:HTMLElement,placement:FloatPlacement):FloatPlacement{
    const width=Math.min(widthLimit(),Math.max(240,Math.round(placement.width)));
    const height=Math.min(heightLimit(),Math.max(170,Math.round(placement.height)));
    const x=clamp(Math.round(placement.x),8,Math.max(8,innerWidth-width-8));
    const y=clamp(Math.round(placement.y),8,Math.max(8,innerHeight-height-8));
    box.style.left=x+'px';box.style.top=y+'px';box.style.width=width+'px';box.style.height=height+'px';
    return {id:placement.id,x,y,width,height};
  }
  function dock(box:HTMLElement,persist=true){
    if(!isFloat(box))return;
    const id=box.dataset.boxId??'';
    box.classList.remove('c04-panel-float');
    box.style.removeProperty('left');box.style.removeProperty('top');box.style.removeProperty('width');box.style.removeProperty('height');
    const slot=slots.get(id);
    if(slot?.isConnected)slot.replaceWith(box);
    else stack.append(box);
    slot?.remove();slots.delete(id);placements.delete(id);
    const actions=controls.get(box);
    if(actions){actions.handle.hidden=true;actions.resize.hidden=true;}
    const menu=box.querySelector<HTMLElement>('.box-more-menu');
    menu?.querySelector<HTMLButtonElement>('.c04-float-menu')?.replaceChildren(document.createTextNode('パネルを持ち出す'));
    if(persist)save();
  }
  function float(box:HTMLElement,initial?:FloatPlacement,persist=true){
    const id=box.dataset.boxId;if(!id)return;
    const current=box.getBoundingClientRect();
    if(!isFloat(box)){
      const slot=document.createElement('div');slot.className='c04-panel-placeholder';
      slot.dataset.placeholderFor=id;
      const title=box.querySelector('.box-name')?.textContent??'パネル';
      slot.textContent=title+'（持ち出し中）';
      const back=document.createElement('button');back.type='button';back.textContent='元に戻す';back.onclick=()=>dock(box);
      slot.append(back);box.replaceWith(slot);document.body.append(box);slots.set(id,slot);
      box.classList.add('c04-panel-float');
    }
    const pos=initial??{id,x:Math.max(8,Math.min(innerWidth-320-8,current.left)),y:Math.max(8,Math.min(innerHeight-360-8,current.top)),width:Math.max(240,Math.min(360,current.width)),height:360};
    placements.set(id,enforce(box,pos));
    const actions=controls.get(box);
    if(actions){actions.handle.hidden=false;actions.resize.hidden=false;}
    box.querySelector<HTMLElement>('.box-body')?.removeAttribute('hidden');
    const toggle=box.querySelector<HTMLButtonElement>('.box-toggle');
    if(toggle){toggle.setAttribute('aria-expanded','true');toggle.disabled=false;}
    const menu=box.querySelector<HTMLElement>('.box-more-menu');
    menu?.querySelector<HTMLButtonElement>('.c04-float-menu')?.replaceChildren(document.createTextNode('元の作業欄に戻す'));
    if(persist)save();
  }
  function dragButton(button:HTMLButtonElement,box:HTMLElement,resize:boolean){
    let drag:{pointer:number;x:number;y:number;original:FloatPlacement}|null=null;
    button.addEventListener('pointerdown',event=>{
      if(event.button!==0||!isFloat(box))return;
      const id=box.dataset.boxId??'',original=placements.get(id);if(!original)return;
      event.preventDefault();event.stopPropagation();
      drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,original};
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.pointer)return;
      const deltaX=event.clientX-drag.x,deltaY=event.clientY-drag.y;
      const old=drag.original;
      const next=resize?{...old,width:old.width+deltaX,height:old.height+deltaY}:{...old,x:old.x+deltaX,y:old.y+deltaY};
      placements.set(old.id,enforce(box,next));
    });
    const finish=(cancel:boolean)=>{
      if(!drag)return;
      const original=drag.original;drag=null;
      if(cancel)placements.set(original.id,enforce(box,original));
      save();
    };
    button.addEventListener('pointerup',()=>finish(false));
    button.addEventListener('pointercancel',()=>finish(true));
    button.addEventListener('lostpointercapture',()=>finish(true));
    button.addEventListener('keydown',event=>{
      if(!isFloat(box)||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
      const id=box.dataset.boxId??'',previous=placements.get(id);if(!previous)return;
      event.preventDefault();
      const amount=event.shiftKey?40:10;
      const dx=event.key==='ArrowLeft'?-amount:event.key==='ArrowRight'?amount:0;
      const dy=event.key==='ArrowUp'?-amount:event.key==='ArrowDown'?amount:0;
      placements.set(id,enforce(box,resize?{...previous,width:previous.width+dx,height:previous.height+dy}:{...previous,x:previous.x+dx,y:previous.y+dy}));
      save();
    });
  }
  for(const box of all()){
    const menu=box.querySelector<HTMLElement>('.box-more-menu');
    const heading=box.querySelector<HTMLElement>('.box-heading');
    if(!menu||!heading||!box.dataset.boxId)continue;
    const command=document.createElement('button');command.type='button';command.className='c04-float-menu';
    command.textContent='パネルを持ち出す';
    command.onclick=()=>{
      if(isFloat(box))dock(box);else float(box);
      menu.hidden=true;
      box.querySelector('.box-more')?.setAttribute('aria-expanded','false');
    };
    menu.append(command);
    const handle=document.createElement('button');
    handle.type='button';handle.hidden=true;handle.className='c04-float-handle';
    handle.textContent='移動';handle.title='ドラッグで移動、矢印キーでも移動';
    const resize=document.createElement('button');
    resize.type='button';resize.hidden=true;resize.className='c04-float-resize';
    resize.textContent='↘';resize.title='ドラッグで幅と高さを変更、矢印キーでも変更';
    heading.append(handle);box.append(resize);
    controls.set(box,{handle,resize});dragButton(handle,box,false);dragButton(resize,box,true);
  }
  function restore(input:readonly FloatPlacement[]){
    const validated=parsePlacements(input);
    const expected=new Map(validated.map(p=>[p.id,p]));
    for(const box of all()){
      const id=box.dataset.boxId??'',next=expected.get(id);
      if(next)float(box,next,false);
      else dock(box,false);
    }
    save();
  }
  function reset(){restore([]);}
  const saved=safeRead();
  restore(saved);
  window.addEventListener('resize',()=>{
    for(const box of all())if(isFloat(box)){
      const pos=placements.get(box.dataset.boxId??'');if(pos)placements.set(pos.id,enforce(box,pos));
    }
    save();
  });
  return {snapshot:()=>[...placements.values()],restore,reset};
}
