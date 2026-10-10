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
  // Browsers can leave :hover visually latched after a touchscreen tap.
  // Track the ACTUAL last pointing device, not just viewport width / UA:
  // Android tablets can attach a mouse, and a pen may not offer hover.
  // Keyboard focus-visible remains independent of this pointer state.
  const root=document.documentElement;
  const setInput=(mode:'hover'|'touch')=>{
    if(root.dataset.uiInput!==mode)root.dataset.uiInput=mode;
  };
  setInput(matchMedia('(hover:hover) and (pointer:fine)').matches?'hover':'touch');
  document.addEventListener('pointerdown',event=>{
    setInput(event.pointerType==='mouse'?'hover':'touch');
  },{capture:true});
  document.addEventListener('pointermove',event=>{
    if(event.pointerType==='mouse')setInput('hover');
  },{capture:true});
  document.addEventListener('click',event=>{
    // Tapped buttons must not retain a pressed/focus halo. Do not blur
    // keyboard-triggered clicks (detail=0) or focus inside form controls.
    if(root.dataset.uiInput!=='touch'||event.detail===0)return;
    const button=event.target instanceof Element?event.target.closest('button'):null;
    if(button&&document.activeElement===button)button.blur();
  });

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
    if(!byId<HTMLElement>('allFeaturesPanel').hidden)positionFeature();
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
  // Box operation menus share the same light-dismiss behavior as floating
  // palettes. Only one may be expanded; their Box body state is independent.
  const closeBoxMenus=(except:HTMLElement|null=null,returnFocus=false)=>{
    for(const menu of document.querySelectorAll<HTMLElement>('.box-more-menu')){
      if(menu.hidden||menu===except)continue;
      const opener=menu.closest('.workspace-box')?.querySelector<HTMLButtonElement>('.box-more');
      menu.hidden=true;opener?.setAttribute('aria-expanded','false');
      if(returnFocus&&menu.contains(document.activeElement))opener?.focus({preventScroll:true});
    }
  };
  const positionBoxMenu=(menu:HTMLElement)=>{
    const stack=byId<HTMLElement>('boxStack').getBoundingClientRect();
    const heading=menu.closest<HTMLElement>('.workspace-box')?.querySelector<HTMLElement>('.box-heading');
    if(!heading)return;
    // Floating menus never resize the Box stack; select the direction with
    // adequate visible room, including when the list has been scrolled.
    menu.dataset.placement='below';
    const rect=heading.getBoundingClientRect();
    const height=menu.getBoundingClientRect().height;
    const roomBelow=stack.bottom-rect.bottom-6,roomAbove=rect.top-stack.top-6;
    if(roomBelow<height&&roomAbove>roomBelow)menu.dataset.placement='above';
  };
  const persistBoxes=()=>safeWrite(BOX_KEY,JSON.stringify(expanded));
  const setBoxExpansion=(section:HTMLElement,open:boolean)=>{
    const id=section.dataset.boxId;if(!id)return;
    const control=section.querySelector<HTMLButtonElement>('.box-toggle');
    const body=section.querySelector<HTMLElement>('.box-body');
    if(!control||!body)return;
    control.setAttribute('aria-expanded',String(open));
    control.setAttribute('aria-label',section.querySelector('.box-name')?.textContent+'を'+(open?'折りたたむ':'開く'));
    body.hidden=!open;expanded[id]=open;persistBoxes();
  };
  for(const [id,,domId,defaultOpen] of RIGHT_BOXES){
    const section=byId(domId+'Body')?.closest<HTMLElement>('.workspace-box');if(!section)continue;
    const control=section.querySelector<HTMLButtonElement>('.box-toggle')!;
    // Only the separate chevron button owns expand/collapse.
    // Heading text and summary are not inside a button, and never trigger it.
    control.onclick=()=>setBoxExpansion(section,control.getAttribute('aria-expanded')!=='true');
    const heading=section.querySelector<HTMLElement>('.box-heading')!;
    heading.addEventListener('click',event=>{
      if(!(event.target instanceof Element))return;
      if(event.target.closest('.box-title,.box-summary'))section.focus({preventScroll:true});
    });
    const more=section.querySelector<HTMLButtonElement>('.box-more')!,menu=section.querySelector<HTMLElement>('.box-more-menu')!;
    more.onclick=event=>{
      const opening=menu.hidden;
      closeBoxMenus();
      menu.hidden=!opening;
      more.setAttribute('aria-expanded',String(opening));
      if(opening){
        positionBoxMenu(menu);
        if(event.detail===0)menu.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
      }
    };
    menu.querySelector<HTMLButtonElement>('[data-collapse-box]')!.onclick=()=>{setBoxExpansion(section,false);menu.hidden=true;more.setAttribute('aria-expanded','false');if(document.documentElement.dataset.uiInput==='hover')control.focus({preventScroll:true});};
    menu.querySelector<HTMLButtonElement>('[data-expand-box]')!.onclick=()=>{setBoxExpansion(section,true);menu.hidden=true;more.setAttribute('aria-expanded','false');if(document.documentElement.dataset.uiInput==='hover')control.focus({preventScroll:true});};
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
  // Keep the palette beside its launcher and inside the usable viewport.
  // Its height is capped and the category list scrolls rather than covering
  // the entire artwork or opening up at an unrelated screen position.
  function positionFeature(){
    if(featurePanel.hidden)return;
    const trigger=featureButton.getBoundingClientRect();
    const styles=getComputedStyle(document.documentElement);
    const railEdge=Number.parseFloat(styles.getPropertyValue('--rail'))||68;
    const topInset=Number.parseFloat(styles.getPropertyValue('--top'))||56;
    const margin=8,left=railEdge+margin,topLimit=topInset+margin;
    const dockEdge=compact.matches||document.body.classList.contains('right-collapsed')
      ?innerWidth:rightDock.getBoundingClientRect().left;
    const available=Math.max(170,Math.min(innerWidth,dockEdge)-left-2*margin);
    const panelWidth=Math.min(348,available);
    const limitHeight=Math.max(150,Math.min(548,innerHeight-topLimit-2*margin));
    featurePanel.style.setProperty('--features-left',left+'px');
    featurePanel.style.setProperty('--features-width',panelWidth+'px');
    featurePanel.style.setProperty('--features-max-height',limitHeight+'px');
    const panelHeight=featurePanel.getBoundingClientRect().height;
    const targetTop=trigger.bottom-panelHeight;
    const panelTop=Math.max(topLimit,Math.min(targetTop,innerHeight-margin-panelHeight));
    featurePanel.style.setProperty('--features-top',Math.round(panelTop)+'px');
  }
  let previousCategory:HTMLButtonElement|null=null;
  const showFeature=(open:boolean,returnFocus=false,keyboardOpen=false)=>{
    if(open)closeBoxMenus();
    const focusWasInside=featurePanel.contains(document.activeElement);
    featurePanel.hidden=!open;featureButton.setAttribute('aria-expanded',String(open));
    if(open){
      categories.hidden=false;actions.hidden=true;
      const qa=document.getElementById('qaSummary') as HTMLDetailsElement|null;
      if(qa?.open)qa.open=false; // no overlapping floating panels
      positionFeature();featurePanel.scrollTop=0;
      if(keyboardOpen)categories.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
    }else if(focusWasInside){
      if(returnFocus)featureButton.focus({preventScroll:true});
      else if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
    }
  };
  featureButton.onclick=event=>showFeature(featurePanel.hidden!==false,false,event.detail===0);
  byId('featuresClose').onclick=event=>showFeature(false,event.detail===0);
  byId('featuresBack').onclick=event=>{
    categories.hidden=false;actions.hidden=true;positionFeature();
    if(event.detail===0)previousCategory?.focus({preventScroll:true});
  };
  categories.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(button=>{
    button.onclick=event=>{
      previousCategory=button;
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
      categories.hidden=true;actions.hidden=false;positionFeature();
      if(event.detail===0){
        (items.querySelector<HTMLButtonElement>('button')||byId<HTMLButtonElement>('featuresBack')).focus({preventScroll:true});
      }
    };
  });
  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button=>button.onclick=()=>byId<HTMLButtonElement>(button.dataset.action||'')?.click());
  // ONE light-dismiss coordinator for temporary surfaces. Keep persistent
  // inline Workspace untouched; only the tablet-overlay / compact drawer close
  // when the user returns to artwork. Pointerdown is intentionally not blocked:
  // the same first pen/finger contact can begin a real Canvas stroke.
  const qaEntry=document.getElementById('qaEntry') as HTMLButtonElement|null;
  const qaCard=document.getElementById('qaSummary') as HTMLDetailsElement|null;
  const qaPanel=document.getElementById('qaPanel') as HTMLDetailsElement|null;
  // M07 QA checklist stays reachable from its topbar button. On touch-first
  // devices it must NOT open as a floating sheet over the artwork by default.
  // Desktop mouse QA retains the historically visible initial checklist.
  if(touch()&&qaCard)qaCard.open=false;
  const syncQa=()=>{if(qaEntry&&qaCard&&qaPanel)qaEntry.setAttribute('aria-expanded',String(qaCard.open&&qaPanel.open));};
  const closeQa=()=>{
    if(!qaCard?.open)return;
    qaCard.open=false;
    syncQa();
  };
  if(qaEntry&&qaCard&&qaPanel){
    qaEntry.onclick=()=>{
      const next=!(qaCard.open&&qaPanel.open);
      if(next){closeBoxMenus();showFeature(false);qaCard.open=true;qaPanel.open=true;}
      else qaCard.open=false;
      syncQa();
    };
    qaCard.addEventListener('toggle',syncQa);
    qaPanel.addEventListener('toggle',syncQa);
    syncQa();
  }
  const floatingDockOpen=()=>compact.matches
    ?rightDock.classList.contains('open')
    :document.body.classList.contains('right-overlay')&&!document.body.classList.contains('right-collapsed');
  document.addEventListener('pointerdown',event=>{
    if(document.querySelector('dialog:modal'))return; // native modal owns dismissal
    const t=event.target;
    if(!(t instanceof Node))return;
    if(!featurePanel.hidden&&!featurePanel.contains(t)&&!featureButton.contains(t))showFeature(false);
    if(qaCard?.open&&!qaCard.contains(t)&&!qaEntry?.contains(t))closeQa();
    // When drawing/outside the dock, dismiss on pointerdown so the same
    // stroke reaches Canvas. Inside the dock, DON'T fold a menu until click:
    // removing its inline layout during pointerdown shifts neighboring More
    // buttons away from pointerup and silently loses the click.
    if(!rightDock.contains(t))closeBoxMenus();
    if(floatingDockOpen()&&t instanceof Element&&t.closest('#canvas')){
      // Artwork does not change position on dismiss. Closing here leaves the
      // initiating pen/touch pointerdown available to the Canvas renderer.
      close(false);
    }
  },{capture:true});
  document.addEventListener('click',event=>{
    const t=event.target;
    if(!(t instanceof Node))return;
    // Finish clicks on OTHER controls before moving a floating Workspace:
    // moving QA / feature launchers on pointerdown causes a lost pointerup
    // and accidental non-activation, especially at tablet overlay widths.
    if(floatingDockOpen()&&!rightDock.contains(t)&&!toggle.contains(t)&&!drawer.contains(t))close(false);
    if(!rightDock.contains(t))return;
    if(t instanceof Element&&t.closest('.box-more'))return;
    for(const menu of document.querySelectorAll<HTMLElement>('.box-more-menu')){
      if(!menu.hidden&&!menu.contains(t)){
        const opener=menu.closest('.workspace-box')?.querySelector<HTMLButtonElement>('.box-more');
        menu.hidden=true;opener?.setAttribute('aria-expanded','false');
      }
    }
  });
  // Keyboard Tab away from a transient surface dismisses it just as a
  // pointer tap outside does, without trapping focus or requiring Esc.
  document.addEventListener('focusin',event=>{
    const target=event.target;
    if(!(target instanceof Node)||document.querySelector('dialog:modal'))return;
    if(!featurePanel.hidden&&!featurePanel.contains(target)&&!featureButton.contains(target))showFeature(false);
    if(qaCard?.open&&!qaCard.contains(target)&&!qaEntry?.contains(target))closeQa();
    for(const menu of document.querySelectorAll<HTMLElement>('.box-more-menu')){
      if(menu.hidden||menu.contains(target))continue;
      const opener=menu.closest('.workspace-box')?.querySelector<HTMLButtonElement>('.box-more');
      if(!opener?.contains(target)){menu.hidden=true;opener?.setAttribute('aria-expanded','false');}
    }
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||event.defaultPrevented||document.querySelector('dialog:modal'))return;
    if(resizing){finish(true);event.preventDefault();return;}
    // Escape dismisses only the most immediate surface, then its parent.
    const openMenu=[...document.querySelectorAll<HTMLElement>('.box-more-menu')].find(menu=>!menu.hidden);
    if(openMenu){closeBoxMenus(null,true);event.preventDefault();return;}
    if(!featurePanel.hidden){showFeature(false,true);event.preventDefault();return;}
    if(qaCard?.open){closeQa();qaEntry?.focus({preventScroll:true});event.preventDefault();return;}
    if(floatingDockOpen()){close(true);event.preventDefault();return;}
    if(layerOpen){setLayerPage(false);event.preventDefault();}
  },{capture:true});

  applyWidth(width);syncPresentation();
  return {workspace,drawer,openBox,close,setLayerPage,layerPageOpen:()=>layerOpen,refreshWidth:()=>applyWidth(width)};
}
