import {FEATURE_CATEGORIES,RIGHT_BOXES} from './shell';

type ShellControl={workspace:HTMLElement;drawer:HTMLButtonElement;openBox:(id:string)=>void;close:(focus?:boolean)=>void;setLayerPage:(value:boolean)=>void;layerPageOpen:()=>boolean;refreshWidth:()=>void};
const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const safeRead=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};
const safeWrite=(key:string,value:string)=>{try{localStorage.setItem(key,value)}catch{/* private browsing may disallow storage */}};
const WIDTH_KEY='illustro.m07.rightWidth',BOX_KEY='illustro.m07.boxExpansion';
const actionLabels:Readonly<Record<string,readonly [string,string][]>>={
  drawing:[['ブラシ','paint'],['消しゴム','erase']],
  'layers-compositing':[['レイヤー画面','layer'],['レイヤー追加','addLayer']],
  'history-automation':[['元に戻す','undo'],['やり直す','redo']],
  'document-output':[['新規キャンバス','new'],['作品を開く','open'],['作品を保存','save'],['別名保存','saveCopy'],['自動保存から戻す','recover'],['PNG / JPEG / WebP','exportImage']],
  'workspace-settings':[['右側の表示を切り替え','workspaceToggle']],
};
export function installShellUi():ShellControl{
  const workspace=byId<HTMLElement>('workspace'),rightDock=byId<HTMLElement>('rightDock'),page=byId<HTMLElement>('layerPage');
  const drawer=byId<HTMLButtonElement>('drawer'),compact=matchMedia('(max-width:760px)'),coarse=matchMedia('(any-pointer:coarse)'),touch=()=>coarse.matches||navigator.maxTouchPoints>0;
  const toggle=byId<HTMLButtonElement>('workspaceToggle'),layer=byId<HTMLButtonElement>('layer');
  let width=touch()?360:344,resizing:{pointerId:number;original:number}|null=null,layerOpen=false,expanded:Record<string,boolean>={};
  const savedWidth=Number(safeRead(WIDTH_KEY));if(Number.isFinite(savedWidth)&&savedWidth>0)width=savedWidth;
  try{expanded=JSON.parse(safeRead(BOX_KEY)||'{}') as Record<string,boolean>;}catch{expanded={};}
  const minimum=()=>touch()?320:288;
  const defaultWidth=()=>touch()?360:344;
  const clamp=(value:number)=>Math.min(440,Math.max(minimum(),Math.round(value)));
  const syncPresentation=()=>{
    const isCompact=compact.matches,shown=isCompact?rightDock.classList.contains('open'):!document.body.classList.contains('right-collapsed');
    if(isCompact){document.body.classList.remove('right-collapsed','right-overlay');}
    else{document.body.classList.toggle('right-overlay',shown&&innerWidth-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail'))-width<720);}
    workspace.style.display=layerOpen?'none':'';
    page.hidden=!layerOpen;
    workspace.inert=!shown||layerOpen;page.inert=!shown||!layerOpen;
    workspace.setAttribute('aria-hidden',String(!shown||layerOpen));
    page.setAttribute('aria-hidden',String(!shown||!layerOpen));
    drawer.setAttribute('aria-expanded',String(isCompact?shown:false));
    toggle.setAttribute('aria-expanded',String(shown));
    layer.setAttribute('aria-expanded',String(layerOpen));
    layer.classList.toggle('selected',layerOpen);
  };
  const applyWidth=(value:number,persist=false)=>{
    width=clamp(value);document.documentElement.style.setProperty('--workspace',width+'px');
    const slider=byId<HTMLInputElement>('width');slider.min=String(minimum());slider.max='440';slider.value=String(width);
    byId<HTMLOutputElement>('widthValue').textContent=width+'px';
    const splitter=byId('splitter');splitter.setAttribute('aria-valuemin',String(minimum()));splitter.setAttribute('aria-valuenow',String(width));
    syncPresentation();if(persist)safeWrite(WIDTH_KEY,String(width));
  };
  const setLayerPage=(open:boolean)=>{
    layerOpen=open;if(open){document.body.classList.remove('right-collapsed');if(compact.matches)rightDock.classList.add('open');}
    syncPresentation();if(open)byId<HTMLButtonElement>('closeLayerPage').focus({preventScroll:true});
    else if(document.activeElement&&page.contains(document.activeElement))layer.focus({preventScroll:true});
  };
  layer.onclick=()=>setLayerPage(!layerOpen);
  byId('closeLayerPage').onclick=()=>setLayerPage(false);
  const close=(focus=false)=>{
    if(layerOpen)setLayerPage(false);
    if(compact.matches)rightDock.classList.remove('open');else document.body.classList.add('right-collapsed');
    syncPresentation();if(focus)(compact.matches?drawer:toggle).focus({preventScroll:true});
  };
  function openBox(id:string){
    setLayerPage(false);
    if(compact.matches)rightDock.classList.add('open');else document.body.classList.remove('right-collapsed');
    syncPresentation();
    const section=byId(id+'Body')?.closest<HTMLElement>('.workspace-box');
    if(section){const button=section.querySelector<HTMLButtonElement>('.box-toggle');if(button?.getAttribute('aria-expanded')==='false')button.click();section.scrollIntoView({block:'nearest'});}
  }
  toggle.onclick=()=>{
    if(compact.matches){rightDock.classList.toggle('open');if(!rightDock.classList.contains('open'))layerOpen=false;}
    else{if(layerOpen)setLayerPage(false);document.body.classList.toggle('right-collapsed');}
    syncPresentation();
  };
  drawer.onclick=()=>{rightDock.classList.toggle('open');if(!rightDock.classList.contains('open'))layerOpen=false;syncPresentation();};
  byId('close').onclick=e=>close(e.detail===0);
  byId('layersPage').onclick=()=>setLayerPage(true);
  byId('colorPage').onclick=()=>openBox('colorBox');
  byId('brushPage').onclick=()=>openBox('brushBox');
  const persistBoxes=()=>safeWrite(BOX_KEY,JSON.stringify(expanded));
  const setBoxExpansion=(section:HTMLElement,open:boolean)=>{
    const id=section.dataset.boxId;if(!id)return;
    const control=section.querySelector<HTMLButtonElement>('.box-toggle');
    const body=section.querySelector<HTMLElement>('.box-body');
    if(!control||!body)return;
    control.setAttribute('aria-expanded',String(open));body.hidden=!open;expanded[id]=open;persistBoxes();
  };
  for(const [id,,domId,defaultOpen] of RIGHT_BOXES){
    const section=byId(domId+'Body')?.closest<HTMLElement>('.workspace-box');if(!section)continue;
    const control=section.querySelector<HTMLButtonElement>('.box-toggle')!;
    control.onclick=()=>setBoxExpansion(section,control.getAttribute('aria-expanded')!=='true');
    const more=section.querySelector<HTMLButtonElement>('.box-more')!,menu=section.querySelector<HTMLElement>('.box-more-menu')!;
    more.onclick=()=>{menu.hidden=!menu.hidden;more.setAttribute('aria-expanded',String(!menu.hidden));};
    menu.querySelector<HTMLButtonElement>('[data-collapse-box]')!.onclick=()=>{setBoxExpansion(section,false);menu.hidden=true;more.setAttribute('aria-expanded','false');control.focus();};
    menu.querySelector<HTMLButtonElement>('[data-expand-box]')!.onclick=()=>{setBoxExpansion(section,true);menu.hidden=true;more.setAttribute('aria-expanded','false');control.focus();};
    setBoxExpansion(section,typeof expanded[id]==='boolean'?expanded[id]:defaultOpen);
  }
  const splitter=byId<HTMLElement>('splitter');
  splitter.addEventListener('pointerdown',e=>{
    if(compact.matches||document.body.classList.contains('right-collapsed')||resizing)return;
    // Pen/touch resizing must explicitly begin on the visible grip, never on canvas.
    if(e.pointerType!=='mouse'&&!(e.target instanceof Element&&e.target.closest('.resize-grip')))return;
    resizing={pointerId:e.pointerId,original:width};
    splitter.setPointerCapture(e.pointerId);splitter.classList.add('dragging');e.preventDefault();
  });
  splitter.addEventListener('pointermove',e=>{if(resizing?.pointerId===e.pointerId)applyWidth(innerWidth-e.clientX);});
  const finish=(cancel=false)=>{if(!resizing)return;const original=resizing.original;resizing=null;splitter.classList.remove('dragging');if(cancel)applyWidth(original);else applyWidth(width,true);};
  splitter.addEventListener('pointerup',e=>{if(resizing?.pointerId===e.pointerId)finish();});
  splitter.addEventListener('pointercancel',e=>{if(resizing?.pointerId===e.pointerId)finish(true);});
  splitter.addEventListener('lostpointercapture',()=>{if(resizing)finish(true);});
  splitter.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&resizing){finish(true);return;}
    const keys:Record<string,number>={ArrowLeft:10,ArrowRight:-10,Home:defaultWidth()-width};
    if(e.key in keys){e.preventDefault();applyWidth(width+keys[e.key]!,true);}
  });
  byId<HTMLInputElement>('width').oninput=e=>applyWidth(Number((e.target as HTMLInputElement).value),true);
  byId('narrower').onclick=()=>applyWidth(width-24,true);
  byId('wider').onclick=()=>applyWidth(width+24,true);
  byId('resetWidth').onclick=()=>applyWidth(defaultWidth(),true);
  byId('hideWorkspace').onclick=()=>close(true);
  window.addEventListener('resize',()=>applyWidth(width));
  compact.addEventListener('change',()=>{if(!compact.matches)rightDock.classList.remove('open');syncPresentation();});
  const featurePanel=byId<HTMLElement>('allFeaturesPanel'),featureButton=byId<HTMLButtonElement>('allFeatures');
  const categories=byId<HTMLElement>('featuresCategories'),actions=byId<HTMLElement>('featuresActions'),items=byId<HTMLElement>('featuresItems');
  const showFeature=(open:boolean)=>{
    featurePanel.hidden=!open;featureButton.setAttribute('aria-expanded',String(open));
    if(open){categories.hidden=false;actions.hidden=true;}
    else if(featurePanel.contains(document.activeElement))featureButton.focus({preventScroll:true});
  };
  featureButton.onclick=()=>showFeature(featurePanel.hidden!==false);
  byId('featuresClose').onclick=()=>showFeature(false);
  byId('featuresBack').onclick=()=>{categories.hidden=false;actions.hidden=true;};
  categories.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(button=>{
    button.onclick=()=>{
      const id=button.dataset.category||'',cat=FEATURE_CATEGORIES.find(entry=>entry[1]===id);
      byId('featuresTitle').textContent=cat?.[0]||'機能';
      items.replaceChildren();
      for(const [label,action] of actionLabels[id]||[]){
        const btn=document.createElement('button');btn.type='button';btn.textContent=label;
        btn.onclick=()=>{showFeature(false);byId<HTMLButtonElement>(action)?.click();};items.append(btn);
      }
      if(!(actionLabels[id]?.length)){
        const info=document.createElement('p');info.className='unavailable';info.textContent='このカテゴリの機能は後のマイルストーンで利用できます。';items.append(info);
      }
      categories.hidden=true;actions.hidden=false;
    };
  });
  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button=>button.onclick=()=>byId<HTMLButtonElement>(button.dataset.action||'')?.click());
  document.addEventListener('pointerdown',event=>{const t=event.target;if(!featurePanel.hidden&&t instanceof Node&&!featurePanel.contains(t)&&!featureButton.contains(t))showFeature(false);});
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||event.defaultPrevented)return;
    if(resizing){finish(true);event.preventDefault();return;}
    if(!featurePanel.hidden){showFeature(false);event.preventDefault();return;}
    if(layerOpen){setLayerPage(false);event.preventDefault();return;}
    if(compact.matches&&rightDock.classList.contains('open')){close(true);event.preventDefault();}
  },{capture:true});
  // M07 QA is initially expanded; the persistent topbar entry remains reachable
  // even when the floating checklist is closed by its header or regression tests.
  const qaEntry=document.getElementById('qaEntry') as HTMLButtonElement|null;
  const qaCard=document.getElementById('qaSummary') as HTMLDetailsElement|null;
  const qaPanel=document.getElementById('qaPanel') as HTMLDetailsElement|null;
  if(qaEntry&&qaCard&&qaPanel){
    const syncQa=()=>qaEntry.setAttribute('aria-expanded',String(qaCard.open&&qaPanel.open));
    qaEntry.onclick=()=>{const next=!(qaCard.open&&qaPanel.open);qaCard.open=next;if(next)qaPanel.open=true;syncQa();};
    qaCard.addEventListener('toggle',syncQa);
    qaPanel.addEventListener('toggle',syncQa);
    syncQa();
  }
  applyWidth(width);syncPresentation();
  return {workspace,drawer,openBox,close,setLayerPage,layerPageOpen:()=>layerOpen,refreshWidth:()=>applyWidth(width)};
}
