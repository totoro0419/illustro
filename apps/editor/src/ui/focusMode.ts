/** C04 UI-007: screen focus is personal UI state, not artwork transformation. */
export function installFocusMode(){
  const topbar=document.querySelector<HTMLElement>('.topbar');
  const strip=document.querySelector<HTMLElement>('.canvas-view-strip');
  if(!topbar||!strip)return;
  const focus=document.createElement('button'),fullscreen=document.createElement('button'),exit=document.createElement('button'),quick=document.createElement('button');
  focus.id='c04FocusToggle';fullscreen.id='c04FullscreenToggle';exit.id='c04FocusExit';
  focus.type=fullscreen.type=exit.type='button';
  focus.textContent='集中表示';fullscreen.textContent='画面いっぱい';exit.textContent='集中表示を終了';
  exit.hidden=true;exit.setAttribute('aria-label','集中表示を終了');
  quick.id='c04FocusQuick';quick.type='button';quick.textContent='Quick';
  quick.hidden=true;quick.setAttribute('aria-label','集中表示中にQuick Controllerを開く');
  quick.onclick=()=>document.getElementById('quickControllerOpen')?.click();
  strip.append(focus,fullscreen);topbar.append(quick,exit);
  const refresh=()=>{
    const active=document.body.classList.contains('illustro-focus-mode');
    focus.textContent=active?'通常の画面に戻す':'集中表示';
    focus.setAttribute('aria-pressed',String(active));exit.hidden=!active;quick.hidden=!active;
    fullscreen.textContent=document.fullscreenElement?'全画面を終了':'画面いっぱい';
    fullscreen.setAttribute('aria-pressed',String(!!document.fullscreenElement));
    window.dispatchEvent(new Event('resize'));
  };
  const toggle=()=>{
    document.body.classList.toggle('illustro-focus-mode');
    refresh();
  };
  focus.onclick=toggle;exit.onclick=toggle;
  fullscreen.onclick=async()=>{
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    }catch(error){
      const status=document.getElementById('status');
      if(status)status.textContent='全画面表示を切り替えられませんでした。'+(error instanceof Error?error.message:'');
    }finally{refresh();}
  };
  document.addEventListener('fullscreenchange',refresh);
  // Native Escape exits fullscreen. Focus mode has a permanent visible exit
  // even when the operating system does not provide keyboard access.
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.key!=='Escape'||document.fullscreenElement)return;
    if(document.body.classList.contains('illustro-focus-mode')&&!document.querySelector('dialog[open]')){
      event.preventDefault();toggle();
    }
  });
  refresh();
}
