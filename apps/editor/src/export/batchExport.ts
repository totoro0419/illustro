import type {CoreDocument} from '@illustro/core';
import type {WorkEntry} from '../persistence/workLibrary';
import {captureExport,exportFileName,exportImage,type ImageFormat} from './basicExport';

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
  status.setAttribute('role','status');
  type Row={work:WorkEntry;state:HTMLOutputElement;link:HTMLAnchorElement;url:string|null};
  const rows:Row[]=works.map(work=>{
    const item=document.createElement('li'),name=document.createElement('strong');
    name.textContent=work.name+' ';
    const state=document.createElement('output');state.textContent='待機中';
    const link=document.createElement('a');link.hidden=true;link.textContent='画像を保存';
    item.append(name,state,' ',link);queue.append(item);
    return {work,state,link,url:null};
  });
  let active:AbortController|null=null;
  const button=(text:string,handler:()=>void)=>{
    const control=document.createElement('button');
    control.type='button';control.textContent=text;control.onclick=handler;return control;
  };
  const all=button('画像をまとめて作成',()=>{void run(rows);});
  const retry=button('失敗・中止分を再試行',()=>{void run(rows.filter(row=>!row.url));});
  const stop=button('中止',()=>active?.abort());
  const close=button('閉じる',()=>dialog.close());
  const actions=document.createElement('div');actions.className='export-actions';
  actions.append(all,retry,stop,close);section.append(title,label,naming,queue,status,actions);dialog.append(section);
  retry.disabled=stop.disabled=true;
  async function run(items:readonly Row[]){
    if(active||!items.length)return;
    const abort=new AbortController();active=abort;
    const kind=format.value as ImageFormat,stem=prefix.value.trim(),names=new Set(rows.filter(row=>row.url&&!items.includes(row)).map(row=>row.link.download));
    all.disabled=retry.disabled=format.disabled=prefix.disabled=true;stop.disabled=false;
    let count=0,failures=0;
    try{
      for(const row of items){
        if(abort.signal.aborted)break;
        try{
          row.state.textContent='作成中…';
          const artwork=await load(row.work.documentId);
          abort.signal.throwIfAborted();
          const result=await exportImage(captureExport(artwork),kind);
          abort.signal.throwIfAborted();
          if(!dialog.open)return;
          const name=(stem?stem+'-':'')+artwork.root.name;
          const base=exportFileName(name,kind),index=base.lastIndexOf('.');
          let filename=base,suffix=2;
          while(names.has(filename)){
            filename=base.slice(0,index)+'-'+suffix+base.slice(index);suffix++;
          }
          names.add(filename);
          if(row.url)URL.revokeObjectURL(row.url);
          row.url=URL.createObjectURL(result.blob);row.link.href=row.url;row.link.download=filename;row.link.hidden=false;
          row.state.textContent='作成済み '+result.width+'×'+result.height+'px';count++;
        }catch(error){
          if(abort.signal.aborted){row.state.textContent='中止';break;}
          row.state.textContent=error instanceof Error?error.message:'作成に失敗';failures++;
        }
      }
      status.textContent=count+'件を作成'+(failures?' ／ '+failures+'件で失敗':'')+(abort.signal.aborted?' ／ 中止しました':'')+'。';
    }finally{
      active=null;all.disabled=format.disabled=prefix.disabled=false;stop.disabled=true;
      retry.disabled=rows.every(row=>row.url!==null);
    }
  }
  dialog.onclose=()=>{
    active?.abort();
    for(const row of rows)if(row.url)URL.revokeObjectURL(row.url);
    dialog.remove();
  };
  document.body.append(dialog);dialog.showModal();
}
