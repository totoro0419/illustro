import type {CoreDocument} from '@illustro/core';
import {appConfirm,appPrompt} from '../ui/appDialogs';
import type {WorkEntry} from '../persistence/workLibrary';
import {captureExport,exportFileName,exportImage,type ImageFormat} from './basicExport';

const presetKey='illustro.batch-export.presets.v1';
type BatchPreset={name:string;format:ImageFormat;prefix:string};
function readPresets():BatchPreset[]{
  try{
    const data=JSON.parse(localStorage.getItem(presetKey)??'[]') as BatchPreset[];
    return Array.isArray(data)?data.filter(row=>row&&typeof row.name==='string'&&row.name.length<=48&&
      ['png','jpeg','webp'].includes(row.format)&&typeof row.prefix==='string'&&row.prefix.length<=40).slice(0,16):[];
  }catch{return [];}
}

export function openBatchExport(works:readonly WorkEntry[],load:(id:string)=>Promise<CoreDocument>){
  if(!works.length)return;
  const dialog=document.createElement('dialog');dialog.className='export-dialog artwork-history-dialog';
  dialog.setAttribute('aria-label','選んだ作品を一括で書き出す');
  const section=document.createElement('section'),title=document.createElement('h2');
  title.textContent='作品の一括出力';
  const label=document.createElement('label'),format=document.createElement('select');
  format.append(new Option('PNG','png'),new Option('JPEG','jpeg'),new Option('WebP','webp'));
  label.append('形式',format);
  const naming=document.createElement('label'),prefix=document.createElement('input');
  prefix.maxLength=40;prefix.placeholder='例：提出用';
  naming.append('ファイル名の先頭に付ける文字（任意）',prefix);
  const queue=document.createElement('ol'),status=document.createElement('output');
  const presetLabel=document.createElement('label'),preset=document.createElement('select'),presets=readPresets();
  presetLabel.append('保存済み設定',preset);
  function presentPresets(value=''){
    preset.replaceChildren(new Option('選ぶ', ''),...presets.map((item,index)=>new Option(item.name,String(index))));
    preset.value=value;
  }
  presentPresets();
  let folder:FileSystemDirectoryHandle|null=null;
  const chooseFolder=(window as Window&{showDirectoryPicker?: (options:{mode:'readwrite'})=>Promise<FileSystemDirectoryHandle>}).showDirectoryPicker;
  status.setAttribute('role','status');
  type Row={work:WorkEntry;state:HTMLOutputElement;link:HTMLAnchorElement;url:string|null;planned:HTMLElement;name:string;failed:boolean};
  const rows:Row[]=works.map(work=>{
    const item=document.createElement('li'),name=document.createElement('strong');
    name.textContent=work.name+' ';
    const state=document.createElement('output');state.textContent='待機中';
    const link=document.createElement('a');link.hidden=true;link.textContent='画像を保存';
    const planned=document.createElement('small');
    item.append(name,planned,' ',state,' ',link);queue.append(item);
    return {work,state,link,url:null,planned,name:'',failed:false};
  });
  let active:AbortController|null=null;
  const button=(text:string,handler:()=>void)=>{
    const control=document.createElement('button');
    control.type='button';control.textContent=text;control.onclick=handler;return control;
  };
  function outputPlan(){
    const names=new Set<string>(),stem=prefix.value.trim(),kind=format.value as ImageFormat;
    for(const row of rows){
      const base=exportFileName((stem?stem+'-':'')+row.work.name,kind),extension=base.lastIndexOf('.');
      let name=base;
      for(let i=2;names.has(name.toLowerCase());i++)name=base.slice(0,extension)+'-'+i+base.slice(extension);
      names.add(name.toLowerCase());row.name=name;row.planned.textContent=' → '+name;
    }
  }
  function optionsChanged(){
    for(const row of rows){
      if(row.url)URL.revokeObjectURL(row.url);
      row.url=null;row.failed=false;row.link.hidden=true;row.state.textContent='待機中';
    }
    retry.disabled=true;outputPlan();
  }
  prefix.oninput=format.onchange=optionsChanged;
  preset.onchange=()=>{
    if(!preset.value)return;
    const choice=presets[Number(preset.value)];
    if(choice){format.value=choice.format;prefix.value=choice.prefix;optionsChanged();}
  };
  const savePreset=button('設定に名前を付けて保存',()=>{void (async()=>{
    const name=(await appPrompt('一括出力の設定名'))?.trim().slice(0,48);
    if(!name||!dialog.open)return;
    const next=[...presets.filter(item=>item.name!==name),{name,format:format.value as ImageFormat,prefix:prefix.value}].slice(-16);
    try{localStorage.setItem(presetKey,JSON.stringify(next));presets.splice(0,presets.length,...next);presentPresets(String(presets.length-1));}
    catch{status.textContent='この端末に設定を保存できませんでした。';}
  })();});
  const destination=button('保存先フォルダーを選ぶ',()=>{void (async()=>{
    if(!chooseFolder)return;
    try{
      const chosen=await chooseFolder.call(window,{mode:'readwrite'});
      if(!dialog.open)return;
      folder=chosen;destination.textContent='保存先 '+chosen.name+'（選び直す）';
    }catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))status.textContent='フォルダーを利用できません。';}
  })();});
  destination.hidden=!chooseFolder;
  const note=document.createElement('p');note.textContent='作成したコピーを各行から保存できます。フォルダーを選んだ場合は、同名ファイルごとに上書きを確認します。';
  const all=button('画像をまとめて作成',()=>{void run(rows);});
  const retry=button('失敗・中止分を再試行',()=>{void run(rows.filter(row=>!row.url||row.failed));});
  const stop=button('中止',()=>active?.abort());
  const close=button('閉じる',()=>dialog.close());
  const actions=document.createElement('div');actions.className='export-actions';
  actions.append(all,retry,stop,close);section.append(title,label,naming,presetLabel,savePreset,destination,note,queue,status,actions);dialog.append(section);
  retry.disabled=stop.disabled=true;outputPlan();
  async function run(items:readonly Row[]){
    if(active||!items.length)return;
    const abort=new AbortController();active=abort;
    const kind=format.value as ImageFormat,outputFolder=folder;
    all.disabled=retry.disabled=format.disabled=prefix.disabled=preset.disabled=savePreset.disabled=destination.disabled=true;stop.disabled=false;
    let count=0,failures=0;
    try{
      for(const row of items){
        if(abort.signal.aborted)break;
        try{
          row.failed=false;row.state.textContent='作成中…';
          const artwork=await load(row.work.documentId);
          abort.signal.throwIfAborted();
          const result=await exportImage(captureExport(artwork),kind);
          abort.signal.throwIfAborted();
          if(!dialog.open)return;
          const filename=row.name;
          if(row.url)URL.revokeObjectURL(row.url);
          row.url=URL.createObjectURL(result.blob);row.link.href=row.url;row.link.download=filename;row.link.hidden=false;
          let disk='';
          if(outputFolder){
            let handle:FileSystemFileHandle|null=null;
            try{handle=await outputFolder.getFileHandle(filename);}
            catch(error){if(!(error instanceof DOMException&&error.name==='NotFoundError'))throw error;}
            if(handle&&!await appConfirm('「'+outputFolder.name+'」の「'+filename+'」を上書きしますか？')){
              row.state.textContent='元ファイルを保持。作成したコピーはリンクから保存できます。';count++;continue;
            }
            abort.signal.throwIfAborted();
            handle??=await outputFolder.getFileHandle(filename,{create:true});
            const stream=await handle.createWritable();
            try{abort.signal.throwIfAborted();await stream.write(result.blob);abort.signal.throwIfAborted();await stream.close();}
            catch(error){await stream.abort().catch(()=>{});throw error;}
            disk='・フォルダーに保存';
          }
          row.state.textContent='作成済み '+result.width+'×'+result.height+'px'+disk;count++;
        }catch(error){
          row.failed=true;
          if(abort.signal.aborted){row.state.textContent='中止';break;}
          row.state.textContent=error instanceof Error?error.message:'作成に失敗';failures++;
        }
      }
      status.textContent=count+'件を作成'+(failures?' ／ '+failures+'件で失敗':'')+(abort.signal.aborted?' ／ 中止しました':'')+'。';
    }finally{
      active=null;all.disabled=format.disabled=prefix.disabled=preset.disabled=savePreset.disabled=destination.disabled=false;stop.disabled=true;
      retry.disabled=rows.every(row=>row.url!==null&&!row.failed);
    }
  }
  dialog.onclose=()=>{
    active?.abort();
    for(const row of rows)if(row.url)URL.revokeObjectURL(row.url);
    dialog.remove();
  };
  document.body.append(dialog);dialog.showModal();
}
