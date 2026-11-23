type Confirmation='apply'|'cancel';

export function toolConfirmation(button:HTMLButtonElement,action:Confirmation,priority=0){
  button.dataset.toolConfirm=action;
  button.dataset.toolConfirmPriority=String(priority);
  return button;
}

export function installToolConfirmation(context:HTMLElement,app:HTMLElement,activePanel:()=>Element|null){
  const footer=document.createElement('div');footer.className='phone-tool-confirmation';footer.hidden=true;
  footer.setAttribute('role','group');footer.setAttribute('aria-label','操作の確定と取消');
  const actions=(['apply','cancel'] as const).map(action=>{
    const button=document.createElement('button');button.type='button';
    button.textContent=action==='apply'?'確定':'取消';
    footer.append(button);
    return {action,button,target:null as HTMLButtonElement|null};
  });
  context.append(footer);
  function sync(){
    const panel=activePanel();
    let hasAction=false;
    for(const entry of actions){
      const candidates=panel?[...panel.querySelectorAll<HTMLButtonElement>('[data-tool-confirm="'+entry.action+'"]')]
        .filter(button=>!button.hidden&&!button.disabled):[];
      entry.target=candidates.sort((a,b)=>Number(b.dataset.toolConfirmPriority)-Number(a.dataset.toolConfirmPriority))[0]??null;
      entry.button.disabled=!entry.target;
      hasAction||=!!entry.target;
    }
    footer.hidden=!hasAction;
  }
  for(const entry of actions)entry.button.onclick=()=>{if(entry.target?.isConnected&&!entry.target.disabled)entry.target.click();};
  let frame=0;
  function schedule(){
    if(!frame)frame=requestAnimationFrame(()=>{frame=0;sync();});
  }
  const observer=new MutationObserver(entries=>{
    if(entries.some(({target})=>target instanceof Element&&
      (target instanceof HTMLDetailsElement||target.hasAttribute('data-tool-confirm')||target===app||target===context)))
      schedule();
  });
  observer.observe(app,{attributes:true,subtree:true,attributeFilter:['open','disabled','hidden','data-active-tool-panel','class']});
  return schedule;
}
