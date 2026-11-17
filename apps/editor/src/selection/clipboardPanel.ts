/** C06 explicit copy/cut/paste controls; no duplicate drawing renderer. */
import {ArtworkClipboard} from './clipboard';
import type {BrushSurface} from '../brushSurface';
export type ClipboardUI=Readonly<{refresh:()=>void;clipboard:ArtworkClipboard}>;
type Actions=Readonly<{
  canEdit:()=>boolean;
  hasSelection:()=>boolean;
  copy:(merged:boolean,selection:boolean)=>Promise<void>;
  copyGroup:()=>Promise<void>;
  cut:()=>Promise<void>;
  paste:(placement:'center'|'original'|Readonly<{x:number;y:number}>)=>Promise<void>;
  getView:()=>Readonly<{drawing:BrushSurface;width:number;height:number}>|null;
  exportPng:()=>Promise<void>;
  importFile:(file:File)=>Promise<void>;
  readSystem:()=>Promise<void>;
  writeSystem:()=>Promise<void>;
}>;
export function installClipboardPanel(actions:Actions,clipboard:ArtworkClipboard):ClipboardUI{
  const host=document.getElementById('documentBoxBody');
  if(!host)return {refresh:()=>{},clipboard};
  const panel=document.createElement('details');panel.className='c06-clipboard-panel';
  const summary=document.createElement('summary');summary.textContent='コピー・切り取り・貼り付け';
  const intro=document.createElement('p');intro.textContent='コピーは作品を変えません。貼り付けは新しいレイヤーを作ります。';
  const commands=document.createElement('div');commands.className='c06-clipboard-grid';
  const imageFile=document.createElement('input');imageFile.type='file';imageFile.hidden=true;
  imageFile.accept='image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';
  const message=document.createElement('output');message.setAttribute('role','status');
  const description=document.createElement('small');
  const buttons=new Map<string,HTMLButtonElement>();
  const make=(id:string,label:string,callback:()=>Promise<void>)=>{
    const control=document.createElement('button');control.type='button';control.textContent=label;control.id=id;
    control.onclick=async()=>{
      if(control.disabled)return;
      control.disabled=true;
      try{await callback();message.textContent=label+' を実行しました。';}
      catch(error){message.textContent=error instanceof Error?error.message:String(error);}
      finally{refresh();}
    };
    buttons.set(id,control);commands.append(control);
  };
  make('c06CopySelection','選択範囲をコピー',()=>actions.copy(false,true));
  make('c06CopyLayer','レイヤー全体をコピー',()=>actions.copy(false,false));
  make('c06CopyGroup','現在のグループをコピー',actions.copyGroup);
  make('c06CopyMerged','見えている絵をコピー',()=>actions.copy(true,false));
  make('c06CopyMergedSelection','選択範囲の見た目をコピー',()=>actions.copy(true,true));
  make('c06CutSelection','選択範囲を切り取る',actions.cut);
  make('c06Paste','中央に貼り付け',()=>actions.paste('center'));
  make('c06PasteInPlace','元の位置に貼り付け',()=>actions.paste('original'));
  const previewButton=document.createElement('button');
  previewButton.type='button';previewButton.id='c06PastePreview';
  previewButton.textContent='位置を見ながら貼り付け';
  commands.append(previewButton);buttons.set(previewButton.id,previewButton);
  make('c06CopyPng','コピーをPNGで取り出す',actions.exportPng);
  make('c06ImportImage','画像ファイルを貼り付け用に読む',async()=>imageFile.click());
  make('c06SystemCopy','端末へ画像をコピー',actions.writeSystem);
  make('c06SystemPaste','端末から画像を読む',actions.readSystem);
  let placementOverlay:HTMLElement|null=null;
  let placementCleanup:(()=>void)|null=null;
  function closePlacement(){
    const cleanup=placementCleanup;placementCleanup=null;
    cleanup?.();
    placementOverlay?.remove();
    placementOverlay=null;
    previewButton.disabled=!clipboard.hasContent||!actions.canEdit();
  }
  function beginPlacement(){
    if(placementOverlay){closePlacement();return;}
    const surface=document.querySelector<HTMLElement>('.surface'),view=actions.getView();
    const item=clipboard.preview();
    if(!surface||!view||!item||!actions.canEdit())return;
    const originalId=clipboard.snapshotId;
    let x=Math.round((view.width-item.width)/2),y=Math.round((view.height-item.height)/2);
    let working=false,frame=0;
    const overlay=document.createElement('section');overlay.className='c06-placement-preview';
    overlay.setAttribute('role','group');
    overlay.setAttribute('aria-label','貼り付ける画像の位置を決める');
    const image=document.createElement('canvas');image.className='c06-placement-image';
    image.width=item.previewWidth;image.height=item.previewHeight;
    image.style.width=item.width+'px';image.style.height=item.height+'px';
    if(item.pixels){
      const context=image.getContext('2d');
      context?.putImageData(new ImageData(new Uint8ClampedArray(item.pixels),item.previewWidth,item.previewHeight),0,0);
    }else{
      const context=image.getContext('2d');
      if(context){context.fillStyle='#75baf255';context.fillRect(0,0,image.width,image.height);}
    }
    const bar=document.createElement('div');bar.className='c06-placement-toolbar';
    const caption=document.createElement('output');caption.setAttribute('role','status');
    const commit=document.createElement('button'),cancel=document.createElement('button');
    commit.type=cancel.type='button';commit.textContent='この位置に確定';cancel.textContent='取り消す';
    bar.append(caption,commit,cancel);overlay.append(image,bar);surface.append(overlay);
    placementOverlay=overlay;
    for(const name of ['pointerdown','pointermove','pointerup','pointercancel'] as const)
      overlay.addEventListener(name,event=>event.stopPropagation());
    function position(){
      const live=actions.getView();
      if(!live||!placementOverlay||clipboard.snapshotId!==originalId||!actions.canEdit()){
        closePlacement();return;
      }
      const base=live.drawing.documentToScreen({x,y});
      const alongX=live.drawing.documentToScreen({x:x+1,y});
      const alongY=live.drawing.documentToScreen({x,y:y+1});
      const matrix='matrix('+[
        alongX.x-base.x,alongX.y-base.y,alongY.x-base.x,alongY.y-base.y,
        base.x,base.y
      ].join(',')+')';
      if(image.style.transform!==matrix)image.style.transform=matrix;
      caption.textContent=item.sourceName+' · X '+x+' / Y '+y+
        (item.editable?' · 複数レイヤーの場合は貼り付け前の枠を表示':' · 半透明の配置案');
    }
    const tick=()=>{
      if(placementOverlay!==overlay)return;
      position();
      if(placementOverlay===overlay)frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    const cleanup=()=>closePlacement();
    const keyGuard=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&placementOverlay===overlay){
        event.preventDefault();event.stopPropagation();cleanup();
      }
    };
    document.addEventListener('keydown',keyGuard,true);
    placementCleanup=()=>{
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown',keyGuard,true);
    };
    let drag:{id:number;screen:{x:number;y:number};x:number;y:number}|null=null;
    image.addEventListener('pointerdown',event=>{
      if(event.button!==0||working)return;
      event.preventDefault();event.stopPropagation();
      const live=actions.getView();if(!live)return;
      const rect=surface.getBoundingClientRect();
      drag={id:event.pointerId,screen:live.drawing.screenToDocument({
        x:event.clientX-rect.left,y:event.clientY-rect.top
      }),x,y};
      image.setPointerCapture(event.pointerId);
    });
    image.addEventListener('pointermove',event=>{
      if(!drag||drag.id!==event.pointerId)return;
      event.preventDefault();event.stopPropagation();
      const live=actions.getView();if(!live)return;
      const rect=surface.getBoundingClientRect();
      const next=live.drawing.screenToDocument({x:event.clientX-rect.left,y:event.clientY-rect.top});
      x=drag.x+Math.round(next.x-drag.screen.x);
      y=drag.y+Math.round(next.y-drag.screen.y);
      position();
    });
    const endDrag=(event:PointerEvent)=>{
      if(drag?.id!==event.pointerId)return;
      event.preventDefault();event.stopPropagation();drag=null;
    };
    image.addEventListener('pointerup',endDrag);
    image.addEventListener('pointercancel',endDrag);
    image.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();});
    cancel.onclick=cleanup;
    commit.onclick=async()=>{
      if(working)return;
      if(clipboard.snapshotId!==originalId||!actions.canEdit()){
        cleanup();message.textContent='コピー元や作品が変わったため、貼り付けを中止しました。';return;
      }
      working=true;commit.disabled=cancel.disabled=true;
      try{
        await actions.paste({x,y});
        message.textContent='選んだ位置に画像を貼り付けました。';
        cleanup();refresh();
      }catch(error){
        caption.textContent=error instanceof Error?error.message:String(error);
      }finally{working=false;commit.disabled=cancel.disabled=false;}
    };
    position();
  }
  previewButton.onclick=beginPlacement;
  imageFile.onchange=()=>{
    const file=imageFile.files?.[0];imageFile.value='';if(!file)return;
    void actions.importFile(file).then(()=>{message.textContent='画像を読み込みました。貼り付けできます。';})
      .catch(error=>{message.textContent=error instanceof Error?error.message:String(error);})
      .finally(refresh);
  };
  function refresh(){
    const ready=actions.canEdit(),selected=actions.hasSelection(),has=clipboard.hasContent;
    if(placementOverlay&&(!has||!ready))closePlacement();
    for(const [id,button] of buttons)button.disabled=!ready||(
      (id==='c06CopySelection'||id==='c06CopyMergedSelection'||id==='c06CutSelection')&&!selected
    )||((id==='c06Paste'||id==='c06PasteInPlace'||id==='c06PastePreview'||id==='c06CopyPng'||id==='c06SystemCopy')&&!has);
    const current=clipboard.summary;
    if(current?.group){buttons.get('c06CopyPng')!.disabled=true;buttons.get('c06SystemCopy')!.disabled=true;}
    description.textContent=current?
      'コピー済み：'+current.name+' · '+current.width+'×'+current.height+'px'+(current.selected?' · 選択範囲':current.editable?` · 編集できるレイヤー ${current.editable} 枚`:''):
      'まだコピーした画像はありません。';
  }
  panel.append(summary,intro,commands,imageFile,description,message);host.append(panel);
  const editing=(target:EventTarget|null)=>target instanceof HTMLElement&&!!target.closest(
    'input,textarea,select,[contenteditable="true"],dialog[open]'
  );
  // Native paste events carry OS images without an extra clipboard permission
  // prompt. The editor's own copied pixels remain a fallback when no file
  // is present. Text inputs and dialogs keep their normal browser behavior.
  document.addEventListener('paste',event=>{
    if(!panel.isConnected||!actions.canEdit()||editing(event.target)||
      document.querySelector('dialog[open]'))return;
    const file=Array.from(event.clipboardData?.items??[])
      .filter(item=>item.kind==='file'&&item.type.startsWith('image/'))
      .map(item=>item.getAsFile()).find((item):item is File=>item!==null);
    if(file){
      event.preventDefault();
      message.textContent='端末から画像を読み込んでいます。';
      void actions.importFile(file).then(()=>actions.paste('center'))
        .then(()=>{message.textContent='端末の画像を新しいレイヤーへ貼り付けました。';})
        .catch(error=>{message.textContent=error instanceof Error?error.message:String(error);})
        .finally(refresh);
    }else if(clipboard.hasContent){
      event.preventDefault();buttons.get('c06Paste')?.click();
    }
  },{capture:true});
  // Keep standard text editing intact, including on Home and in dialogs.
  document.addEventListener('keydown',event=>{
    if(!panel.isConnected||!actions.canEdit()||editing(event.target)||event.altKey||!(event.ctrlKey||event.metaKey)||
      document.querySelector('dialog[open]'))return;
    const code=event.key.toLowerCase();
    // Ctrl/⌘+V must reach the native paste event to see OS clipboard images.
    if(code==='v')return;
    if(code==='c'||code==='x'){
      event.preventDefault();
      const target=code==='c'?(actions.hasSelection()?'c06CopySelection':'c06CopyLayer'):'c06CutSelection';
      buttons.get(target)?.click();
    }
  },{capture:true});
  refresh();
  return {refresh,clipboard};
}
