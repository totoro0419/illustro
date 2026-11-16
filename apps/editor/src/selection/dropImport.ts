/** C06 explicit image drop routing. Never turn an unconfirmed file into pixels. */
type Route='paste'|'reference'|'asset';
type Destination=Readonly<{
  canEdit:()=>boolean;
  place:(file:File)=>Promise<void>;
  reference:(file:File)=>Promise<void>;
  asset:(file:File)=>Promise<void>;
}>;
const supported=(file:File)=>/^image\/(png|jpeg|webp|avif|gif)$/.test(file.type)||
  /\.(png|jpe?g|webp|avif|gif)$/i.test(file.name);
export function installImageDropRouting(options:Destination){
  const surface=document.querySelector<HTMLElement>('.surface');
  if(!surface)return;
  const overlay=document.createElement('div');overlay.className='c06-drop-overlay';overlay.hidden=true;
  overlay.textContent='画像を受け取れます。指を離して保存先を選んでください。';
  surface.append(overlay);
  const dialog=document.createElement('dialog');dialog.className='c06-drop-dialog';
  const title=document.createElement('h3');title.textContent='画像をどこで使いますか？';
  const description=document.createElement('p');description.textContent='画像の配置先を選んでください。元の画像ファイルは変更しません。';
  const info=document.createElement('output');info.setAttribute('role','status');
  const actions=document.createElement('div');actions.className='c06-drop-actions';
  let current:File|null=null,busy=false,hover=0;
  const close=document.createElement('button');close.type='button';close.textContent='キャンセル';
  close.onclick=()=>{if(!busy)dialog.close();};
  for(const [route,label]of [
    ['paste','作品に新しいレイヤーとして貼る'],
    ['reference','参考資料として開く'],
    ['asset','素材庫に保存する']
  ] as const){
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.onclick=async()=>{
      if(!current||busy||!options.canEdit())return;
      busy=true;
      for(const control of actions.querySelectorAll<HTMLButtonElement>('button'))control.disabled=true;
      info.textContent='画像を確認しています。';
      try{
        if(route==='paste')await options.place(current);
        else if(route==='reference')await options.reference(current);
        else await options.asset(current);
        dialog.close();
      }catch(error){info.textContent=error instanceof Error?error.message:String(error);}
      finally{
        busy=false;
        for(const control of actions.querySelectorAll<HTMLButtonElement>('button'))control.disabled=false;
      }
    };
    actions.append(button);
  }
  actions.append(close);dialog.append(title,description,info,actions);
  document.body.append(dialog);
  dialog.addEventListener('close',()=>{current=null;info.textContent='';});
  const isFile=(event:DragEvent)=>event.dataTransfer?.types.includes('Files')??false;
  surface.addEventListener('dragenter',event=>{
    if(!isFile(event))return;
    event.preventDefault();
    if(!options.canEdit())return;
    hover++;overlay.hidden=false;
  });
  surface.addEventListener('dragover',event=>{
    if(!isFile(event))return;
    event.preventDefault();
    if(event.dataTransfer)event.dataTransfer.dropEffect=options.canEdit()?'copy':'none';
  });
  surface.addEventListener('dragleave',()=>{if(--hover<=0){hover=0;overlay.hidden=true;}});
  surface.addEventListener('drop',event=>{
    hover=0;overlay.hidden=true;
    if(!isFile(event))return;
    // Always suppress the browser's default file navigation, even when locked.
    event.preventDefault();event.stopPropagation();
    if(!options.canEdit()){
      info.textContent='編集中ではないため画像を取り込めません。';
      dialog.showModal();return;
    }
    const candidates=[...(event.dataTransfer?.files??[])].filter(supported);
    if(!candidates.length){
      info.textContent='PNG・JPEG・WebP・AVIF・GIF画像を選んでください。';dialog.showModal();return;
    }
    current=candidates[0]!;
    info.textContent=current.name+' · '+Math.round(current.size/1024)+'KB'+
      (candidates.length>1?'（最初の1件を扱います）':'');
    dialog.showModal();
  });
  window.addEventListener('dragend',()=>{hover=0;overlay.hidden=true;});
}
