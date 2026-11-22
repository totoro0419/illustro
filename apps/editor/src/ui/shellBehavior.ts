import {FEATURE_CATEGORIES,RIGHT_BOXES} from './shell';
import './paintingWorkspace.css';

export type ShellControl={workspace:HTMLElement;drawer:HTMLButtonElement;openBox:(id:string)=>void;close:(focus?:boolean)=>void;setLayerPage:(value:boolean)=>void;layerPageOpen:()=>boolean;refreshWidth:()=>void};
const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const safeRead=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};
const safeWrite=(key:string,value:string)=>{try{localStorage.setItem(key,value)}catch{/* private browsing may disallow storage */}};
const WIDTH_KEY='illustro.m07.rightWidth',BOX_KEY='illustro.m07.boxExpansion';
const actionLabels:Readonly<Record<string,readonly [string,string][]>>={
  drawing:[['ブラシ','paint'],['消しゴム','erase'],['ぼかし・混色','smudge']],
  'fill-color-region':[['スマート塗り','smartFill'],['スポイト','eyedropper'],['色を選ぶ','colorPage']],
  'vector-text-shape':[['図形・グラデーション','shapes']],
  'guides-rulers':[['定規・ガイド','rulers']],
  'adjust-filter-retouch':[['補正・効果','workspaceEffects']],
  'selection-transform':[['選択範囲','selection'],['変形','transform'],['レイヤーを移動','move']],
  'layers-compositing':[['レイヤー画面','layer'],['レイヤー追加','addLayerPage']],
  'canvas-view':[['画面を移動する','panView'],['全体表示','fitView'],['回転を戻す','resetRotation']],
  'history-automation':[['元に戻す','undo'],['やり直す','redo']],
  'document-output':[['新規キャンバス','new'],['作品を開く','open'],['作品情報','documentInfoOpen'],['作品を保存','save'],['別名保存','saveCopy'],['自動保存から戻す','recover'],['PNG / JPEG / WebP','exportImage']],
  'workspace-settings':[['右側の表示を切り替え','workspaceToggle']],
};
export function installShellUi(onLayerPageChange?:(open:boolean)=>void):ShellControl{
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

  const colorButton=byId<HTMLButtonElement>('colorPage'),brushButton=byId<HTMLButtonElement>('brushPage');
  const collapse=byId<HTMLButtonElement>('close'), mobileToggle=byId<HTMLButtonElement>('dockCompactToggle');
  const panelButtons=[...rightDock.querySelectorAll<HTMLButtonElement>('[data-workspace-panel]')];
  let dockOpen=!compact.matches,panel='brushBox',dockTrigger:HTMLElement=layer;
  const boxId=(domId:string)=>RIGHT_BOXES.find(box=>box[2]===domId)?.[0]??'';
  let width=touch()?360:344,resizing:{pointerId:number;original:number}|null=null,layerOpen=false,expanded:Record<string,boolean>={};
  const savedWidth=Number(safeRead(WIDTH_KEY));if(Number.isFinite(savedWidth)&&savedWidth>0)width=savedWidth;
  try{expanded=JSON.parse(safeRead(BOX_KEY)||'{}') as Record<string,boolean>;}catch{expanded={};}
  const minimum=()=>touch()?320:288;
  const defaultWidth=()=>touch()?360:344;
  const clamp=(value:number)=>Math.min(440,Math.max(minimum(),Math.round(value)));
  const syncPresentation=()=>{
    const isCompact=compact.matches;
    rightDock.classList.toggle('open',dockOpen);
    rightDock.dataset.panel=layerOpen?'layers':panel;
    rightDock.dataset.box=boxId(panel);
    // When a specific tool/settings panel is selected, show only its section.
    // The general workspace view (panel='') keeps the full configurable stack.
    const selectedBox=boxId(panel);
    for(const section of rightDock.querySelectorAll<HTMLElement>('#boxStack > .workspace-box')){
      section.hidden=Boolean(selectedBox&&section.dataset.boxId!==selectedBox);
    }
    rightDock.classList.toggle('dock-collapsed',!dockOpen);
    document.body.classList.toggle('right-collapsed',!isCompact&&!dockOpen);
    const overlay=dockOpen&&!isCompact&&innerWidth-width<620;
    document.body.classList.toggle('right-overlay',overlay);
    workspace.style.display=layerOpen?'none':'';
    page.hidden=!layerOpen;
    workspace.inert=!dockOpen||layerOpen;
    page.inert=!dockOpen||!layerOpen;
    drawer.setAttribute('aria-expanded',String(dockOpen&&!layerOpen&&!panel));
    toggle.setAttribute('aria-expanded',String(dockOpen&&!layerOpen&&!panel));
    layer.setAttribute('aria-expanded',String(dockOpen&&layerOpen));
    byId('workspaceLayers').setAttribute('aria-pressed',String(dockOpen&&layerOpen));
    collapse.setAttribute('aria-expanded',String(dockOpen));
    collapse.setAttribute('aria-label',dockOpen?'作業パネルを折りたたむ':'作業パネルを広げる');
    mobileToggle.setAttribute('aria-expanded',String(dockOpen));
    for(const button of panelButtons)button.setAttribute('aria-pressed',String(dockOpen&&!layerOpen&&button.dataset.workspacePanel===panel));
    colorButton.setAttribute('aria-expanded',String(dockOpen&&panel==='colorBox'&&!layerOpen));
    brushButton.setAttribute('aria-expanded',String(dockOpen&&panel==='brushBox'&&!layerOpen));
  };
  const applyWidth=(value:number,persist=false)=>{
    if(!compact.matches&&value<minimum()-36&&resizing){dockOpen=false;syncPresentation();return;}
    width=clamp(value);document.documentElement.style.setProperty('--workspace',width+'px');
    const slider=byId<HTMLInputElement>('width');slider.min=String(minimum());slider.max='440';slider.value=String(width);
    byId<HTMLOutputElement>('widthValue').textContent=width+'px';
    const splitter=byId('splitter');splitter.setAttribute('aria-valuemin',String(minimum()));splitter.setAttribute('aria-valuenow',String(width));
    syncPresentation();if(persist)safeWrite(WIDTH_KEY,String(width));
    if(!byId<HTMLElement>('allFeaturesPanel').hidden)positionFeature();
  };
  const layerMenu=byId('layerActionsMenu'),layerTrigger=byId<HTMLButtonElement>('layerSettingsTrigger');
  const positionLayerMenu=()=>{
    const box=page.getBoundingClientRect();
    layerMenu.style.left=Math.max(8,box.left+8)+'px';
    layerMenu.style.width=Math.max(170,Math.min(box.width-16,360))+'px';
    const top=Math.max(8,Math.min(box.top+48,innerHeight-144));
    layerMenu.style.top=top+'px';
    layerMenu.style.maxHeight=Math.min(480,innerHeight-top-12)+'px';
  };
  layerMenu.addEventListener('beforetoggle',event=>{
    if((event as ToggleEvent).newState==='open')positionLayerMenu();
  });
  window.addEventListener('resize',()=>{if(layerMenu.matches(':popover-open'))positionLayerMenu();});
  const setLayerPage=(open:boolean,keyboardNavigation=false)=>{
    if(layerOpen===open&&(!open||dockOpen))return;
    if(!open&&layerMenu.matches(':popover-open'))layerMenu.hidePopover();
    layerOpen=open;
    if(open)dockOpen=true;
    if(open)dockTrigger=layer;
    syncPresentation();
    onLayerPageChange?.(open);
    if(keyboardNavigation)(open?byId('closeLayerPage'):layer).focus({preventScroll:true});
  };
  layer.onclick=event=>setLayerPage(!layerOpen||!dockOpen,event.detail===0);
  byId<HTMLButtonElement>('workspaceLayers').onclick=event=>setLayerPage(!layerOpen||!dockOpen,event.detail===0);
  byId('closeLayerPage').onclick=event=>setLayerPage(false,event.detail===0);
  const vectorMask=byId<HTMLDetailsElement>('layerVectorMask');
  vectorMask.addEventListener('illustro:open-layer-settings',()=>{
    if(!layerOpen||!dockOpen)setLayerPage(true);
    if(!layerMenu.matches(':popover-open'))layerMenu.showPopover({source:layerTrigger});
  });
  const close=(focus=false)=>{
    if(layerMenu.matches(':popover-open'))layerMenu.hidePopover();
    dockOpen=false;
    syncPresentation();
    if(focus){
      const target=dockTrigger.isConnected&&dockTrigger.checkVisibility()?dockTrigger:byId('allFeatures');
      target.focus({preventScroll:true});
    }
  };
  function openBox(id:string,trigger?:HTMLElement,keyboard=false){
    if(id==='documentBox')delete byId('documentBoxBody').dataset.activeToolPanel;
    setLayerPage(false);
    dockOpen=true;
    panel=boxId(id)?id:'';
    dockTrigger=trigger??(panel==='colorBox'?colorButton:panel==='brushBox'?brushButton:byId('allFeatures'));
    const section=byId(id+'Body')?.closest<HTMLElement>('.workspace-box');
    if(section?.classList.contains('c04-panel-float')){dockOpen=false;panel='';}
    syncPresentation();
    onLayerPageChange?.(false);
    if(section){
      const button=section.querySelector<HTMLButtonElement>('.box-toggle');
      if(button?.getAttribute('aria-expanded')==='false')button.click();
      section.scrollIntoView({block:'nearest'});
      if(keyboard)(id==='brushBox'?section.querySelector<HTMLElement>('.brush-catalog button')??section.querySelector<HTMLElement>('.box-toggle'):section.querySelector<HTMLElement>('.box-toggle'))?.focus({preventScroll:true});
    }
  }
  const toggleWorkspace=(event:MouseEvent)=>{
    if(dockOpen){close(event.detail===0);return;}
    setLayerPage(false);
    dockOpen=true;panel='';dockTrigger=byId('allFeatures');
    showFeature(false);syncPresentation();
    if(event.detail===0)byId('close').focus({preventScroll:true});
  };
  toggle.onclick=toggleWorkspace;
  drawer.onclick=toggleWorkspace;
  mobileToggle.onclick=toggleWorkspace;
  collapse.onclick=()=>{if(dockOpen)close();else{dockOpen=true;syncPresentation();if(layerOpen)onLayerPageChange?.(true);}};
  for(const button of panelButtons)button.onclick=()=>{
    setLayerPage(false);dockOpen=true;
    const target=button.dataset.workspacePanel;
    if(target)openBox(target,button);
    else{panel='';delete byId('documentBoxBody').dataset.activeToolPanel;syncPresentation();}
  };
  byId('layersPage').onclick=event=>setLayerPage(true,event.detail===0);
  const togglePanel=(id:string,button:HTMLElement,event:MouseEvent)=>{
    if(dockOpen&&!layerOpen&&panel===id)close(event.detail===0);
    else openBox(id,button,event.detail===0);
  };
  colorButton.onclick=event=>togglePanel('colorBox',colorButton,event);
  brushButton.onclick=event=>togglePanel('brushBox',brushButton,event);
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
    if(heading.closest('.c04-panel-float')){
      menu.dataset.placement='below';
      menu.style.removeProperty('--box-menu-above');
      return;
    }
    // Floating menus never resize the Box stack; select the direction with
    // adequate visible room, including when the list has been scrolled.
    menu.dataset.placement='below';
    const rect=heading.getBoundingClientRect();
    const height=menu.getBoundingClientRect().height;
    const roomBelow=stack.bottom-rect.bottom-6,roomAbove=rect.top-stack.top-6;
    if(roomBelow<height&&roomAbove>roomBelow){
      menu.dataset.placement='above';
      // Offset is measured from the Box TOP, not from its full height.
      // This keeps the opener visible even for tall expanded Boxes.
      menu.style.setProperty('--box-menu-above',Math.round(-height-4)+'px');
    }
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
    // Titles and summaries are static labels. They must neither collapse the
    // Box nor move keyboard focus when tapped, especially on Android.
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
  splitter.addEventListener('pointermove',e=>{if(resizing?.pointerId===e.pointerId)applyWidth(document.body.classList.contains('workspace-left-handed')?e.clientX:innerWidth-e.clientX);});
  const finish=(cancel=false)=>{if(!resizing)return;const original=resizing.original;resizing=null;splitter.classList.remove('dragging');if(cancel)applyWidth(original);else applyWidth(width,true);};
  splitter.addEventListener('pointerup',e=>{if(resizing?.pointerId===e.pointerId)finish();});
  splitter.addEventListener('pointercancel',e=>{if(resizing?.pointerId===e.pointerId)finish(true);});
  splitter.addEventListener('lostpointercapture',()=>{if(resizing)finish(true);});
  splitter.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&resizing){finish(true);return;}
    const flipped=document.body.classList.contains('workspace-left-handed');
    const keys:Record<string,number>={ArrowLeft:flipped?-10:10,ArrowRight:flipped?10:-10,Home:defaultWidth()-width};
    if(e.key in keys){e.preventDefault();applyWidth(width+keys[e.key]!,true);}
  });
  byId<HTMLInputElement>('width').oninput=e=>applyWidth(Number((e.target as HTMLInputElement).value),true);
  byId('narrower').onclick=()=>applyWidth(width-24,true);
  byId('wider').onclick=()=>applyWidth(width+24,true);
  byId('resetWidth').onclick=()=>applyWidth(defaultWidth(),true);
  byId('hideWorkspace').onclick=event=>close(event.detail===0);
  window.addEventListener('resize',()=>applyWidth(width));
  compact.addEventListener('change',syncPresentation);
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
    const mirrored=document.body.classList.contains('workspace-left-handed');
    const dockEdge=compact.matches||document.body.classList.contains('right-collapsed')
      ?(mirrored?0:innerWidth):(mirrored?rightDock.getBoundingClientRect().right:rightDock.getBoundingClientRect().left);
    const available=Math.max(170,mirrored?innerWidth-railEdge-dockEdge-3*margin:Math.min(innerWidth,dockEdge)-left-2*margin);
    const panelWidth=Math.min(348,available);
    const limitHeight=Math.max(150,Math.min(548,innerHeight-topLimit-2*margin));
    featurePanel.style.setProperty('--features-left',left+'px');
    featurePanel.style.setProperty('--features-right',(railEdge+margin)+'px');
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
    if(!actionLabels[button.dataset.category??'']?.length){button.hidden=true;return;}
    button.onclick=event=>{
      previousCategory=button;
      const id=button.dataset.category||'',cat=FEATURE_CATEGORIES.find(entry=>entry[1]===id);
      byId('featuresTitle').textContent=cat?.[0]||'機能';
      items.replaceChildren();
      for(const [label,action] of actionLabels[id]||[]){
        const btn=document.createElement('button');btn.type='button';btn.textContent=label;
        const control=byId<HTMLButtonElement>(action);
        btn.disabled=!control||control.disabled;
        btn.onclick=event=>{showFeature(false,event.detail===0);control?.click();};items.append(btn);
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
  const floatingDockOpen=()=>dockOpen&&compact.matches;
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
    if(!rightDock.contains(t)&&!(t instanceof Element&&t.closest('.c04-panel-float')))closeBoxMenus();
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
    // A swatch action may replace its button before this bubbling click arrives.
    // The event path still identifies the original dock; a detached target does not.
    const path=event.composedPath();
    if(path.some(node=>node instanceof HTMLDialogElement))return;
    const clickedInsideDock=path.includes(rightDock)||
      (t instanceof Element&&!!t.closest('.c04-panel-float'));
    if(floatingDockOpen()&&!clickedInsideDock&&
      ![toggle,drawer,layer,colorButton,brushButton,mobileToggle,featurePanel].some(trigger=>trigger.contains(t)))close(false);
    if(!clickedInsideDock)return;
    if(t instanceof Element&&t.closest('.box-more'))return;
    for(const menu of document.querySelectorAll<HTMLElement>('.box-more-menu')){
      if(!menu.hidden&&!event.composedPath().includes(menu)){
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
    if(event.target instanceof Element&&event.target.closest('.workspace-details-pane,#quickControllerPanel'))return;
    if(event.key!=='Escape'||event.defaultPrevented||document.querySelector('dialog:modal,.workspace-options:popover-open,#quickControllerPanel:not([hidden])'))return;
    if(layerMenu.matches(':popover-open')){
      layerMenu.hidePopover();layerTrigger.focus({preventScroll:true});event.preventDefault();return;
    }
    if(resizing){finish(true);event.preventDefault();return;}
    // Escape dismisses only the most immediate surface, then its parent.
    const openMenu=[...document.querySelectorAll<HTMLElement>('.box-more-menu')].find(menu=>!menu.hidden);
    if(openMenu){closeBoxMenus(null,true);event.preventDefault();return;}
    if(!featurePanel.hidden){showFeature(false,true);event.preventDefault();return;}
    if(qaCard?.open){closeQa();qaEntry?.focus({preventScroll:true});event.preventDefault();return;}
    if(floatingDockOpen()){close(true);event.preventDefault();return;}
    if(layerOpen){setLayerPage(false);event.preventDefault();}
  },{capture:true});

  // Keep feedback available without reserving a permanent row of status text.
  const status=byId('status');
  let statusTimer=0;
  const refreshStatus=()=>{
    const text=status.textContent?.trim()??'';
    clearTimeout(statusTimer);
    const quiet=!text||text==='線を作品に反映しました。'||/^(描画できます。|新規キャンバスを開くか、)/.test(text);
    status.classList.toggle('visible-message',!quiet);
    if(!quiet&&!/失敗|できません|ありません|エラー|不足|確認してください/.test(text))
      statusTimer=window.setTimeout(()=>status.classList.remove('visible-message'),3600);
  };
  new MutationObserver(refreshStatus).observe(status,{childList:true,characterData:true,subtree:true});
  const files=byId<HTMLElement>('fileActions');
  const fileButton=byId('fileActionsOpen'),saveState=byId('saveState');
  new MutationObserver(()=>{
    const error=/保存できません|保存待ち/.test(saveState.textContent??'');
    fileButton.toggleAttribute('data-storage-error',error);
    fileButton.setAttribute('aria-label',error?'作品・自動保存に問題があります':'作品');
  }).observe(saveState,{childList:true,characterData:true,subtree:true});
  const view=byId<HTMLElement>('viewActions');
  files.addEventListener('click',event=>{
    if(event.target instanceof Element&&event.target.closest('#new,#open,#recover,#saveCopy,#exportImage'))files.hidePopover();
  });
  view.addEventListener('click',event=>{
    if(event.target instanceof Element&&event.target.closest('#panView,#c04FocusToggle,#c04FullscreenToggle'))view.hidePopover();
  });
  applyWidth(width);syncPresentation();
  return {workspace,drawer,openBox,close,setLayerPage,layerPageOpen:()=>dockOpen&&layerOpen,refreshWidth:()=>applyWidth(width)};
}
