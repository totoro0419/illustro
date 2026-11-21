import {icon} from './icons';

export function installWorkspaceDetails(title:string,belongsTo:string,opener:HTMLButtonElement){
  const dock=document.getElementById('rightDock')!;
  const detail=document.createElement('aside');
  detail.className='workspace-details-pane';
  detail.setAttribute('aria-label',title);
  detail.hidden=true;

  const header=document.createElement('header');
  const label=document.createElement('strong');label.textContent=title;
  const close=document.createElement('button');close.type='button';close.innerHTML=icon('back');
  close.setAttribute('aria-label',title+'だけ閉じる');
  header.append(close,label);

  const body=document.createElement('div');
  body.className='workspace-details-body';
  detail.append(header,body);dock.append(detail);

  const belongs=()=>dock.dataset.panel===belongsTo&&!dock.classList.contains('dock-collapsed');
  const show=(open:boolean)=>{
    detail.hidden=!(open&&belongs());
    opener.setAttribute('aria-expanded',String(!detail.hidden));
    dock.classList.toggle('with-workspace-details',Boolean(dock.querySelector('.workspace-details-pane:not([hidden])')));
  };
  opener.setAttribute('aria-expanded','false');
  opener.onclick=()=>show(detail.hidden===true);
  close.onclick=()=>{show(false);opener.focus({preventScroll:true});};
  detail.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!document.querySelector(':popover-open')){
      event.preventDefault();close.click();
    }
  });
  new MutationObserver(()=>{
    if(!detail.hidden&&!belongs())show(false);
  }).observe(dock,{attributes:true,attributeFilter:['class','data-panel']});
  return {body,show};
}
