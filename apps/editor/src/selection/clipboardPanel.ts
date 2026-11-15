/** C06 explicit copy/cut/paste controls; no duplicate drawing renderer. */
import {ArtworkClipboard} from './clipboard';
export type ClipboardUI=Readonly<{refresh:()=>void;clipboard:ArtworkClipboard}>;
type Actions=Readonly<{
  canEdit:()=>boolean;
  hasSelection:()=>boolean;
  copy:(merged:boolean,selection:boolean)=>Promise<void>;
  cut:()=>Promise<void>;
  paste:(placement:'center'|'original')=>Promise<void>;
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
  make('c06CopyMerged','見えている絵をコピー',()=>actions.copy(true,false));
  make('c06CutSelection','選択範囲を切り取る',actions.cut);
  make('c06Paste','中央に貼り付け',()=>actions.paste('center'));
  make('c06PasteInPlace','元の位置に貼り付け',()=>actions.paste('original'));
  make('c06CopyPng','コピーをPNGで取り出す',actions.exportPng);
  make('c06ImportImage','画像ファイルを貼り付け用に読む',async()=>imageFile.click());
  make('c06SystemCopy','端末へ画像をコピー',actions.writeSystem);
  make('c06SystemPaste','端末から画像を読む',actions.readSystem);
  imageFile.onchange=()=>{
    const file=imageFile.files?.[0];imageFile.value='';if(!file)return;
    void actions.importFile(file).then(()=>{message.textContent='画像を読み込みました。貼り付けできます。';})
      .catch(error=>{message.textContent=error instanceof Error?error.message:String(error);})
      .finally(refresh);
  };
  function refresh(){
    const ready=actions.canEdit(),selected=actions.hasSelection(),has=clipboard.hasContent;
    for(const [id,button] of buttons)button.disabled=!ready||(
      (id==='c06CopySelection'||id==='c06CutSelection')&&!selected
    )||((id==='c06Paste'||id==='c06PasteInPlace'||id==='c06CopyPng'||id==='c06SystemCopy')&&!has);
    const current=clipboard.summary;
    description.textContent=current?
      'コピー済み：'+current.name+' · '+current.width+'×'+current.height+'px'+(current.selected?' · 選択範囲':''):
      'まだコピーした画像はありません。';
  }
  panel.append(summary,intro,commands,imageFile,description,message);host.append(panel);
  const editing=(target:EventTarget|null)=>target instanceof HTMLElement&&!!target.closest(
    'input,textarea,select,[contenteditable="true"],dialog[open]'
  );
  // Keep standard text editing intact, including on Home and in dialogs.
  document.addEventListener('keydown',event=>{
    if(!panel.isConnected||!actions.canEdit()||editing(event.target)||event.altKey||!(event.ctrlKey||event.metaKey)||
      document.querySelector('dialog[open]'))return;
    const code=event.key.toLowerCase();
    if(code==='c'||code==='x'||code==='v'){
      event.preventDefault();
      const target=code==='c'?(actions.hasSelection()?'c06CopySelection':'c06CopyLayer'):
        code==='x'?'c06CutSelection':'c06Paste';
      buttons.get(target)?.click();
    }
  },{capture:true});
  refresh();
  return {refresh,clipboard};
}
