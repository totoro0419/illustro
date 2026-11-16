/** C05 personal asset library, independent of artwork layers. */
import {ASSET_KINDS,ASSET_LABELS,type AssetInfo,type AssetKind,listAssets,getAsset,addAsset,
  updateAsset,removeAsset,restoreAsset,markAssetUsed,duplicateAsset,createAssetVersion} from './library';
import {exportAssetPack,readAssetPack,previewAssetPack,importAssetPack,type PackManifest,type PackImportResult} from './packs';

type PanelOptions=Readonly<{openReference:(assetId:string)=>Promise<void>}>;
function button(text:string,handler:()=>void,css=''){
  const b=document.createElement('button');b.type='button';b.textContent=text;b.className=css;b.onclick=handler;return b;
}
const textInput=(placeholder:string)=>{
  const e=document.createElement('input');e.type='text';e.placeholder=placeholder;e.maxLength=100;return e;
};
const saveBlob=(name:string,file:Blob)=>{
  const url=URL.createObjectURL(file),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
};
export function installAssetPanel(opts:PanelOptions){
  const host=document.getElementById('assetsBoxBody');
  if(!host)return {refresh:async()=>{}};
  host.replaceChildren();
  const root=document.createElement('section');root.className='c05-asset-panel';
  const title=document.createElement('h4');title.textContent='素材庫';
  const lead=document.createElement('p');
  lead.textContent='手元の素材を種類ごとに整理します。作品から独立して保存します。';
  const query=document.createElement('input');query.type='search';query.placeholder='素材名・フォルダー・タグで検索';
  query.setAttribute('aria-label','素材を検索');
  const kind=document.createElement('select');kind.setAttribute('aria-label','素材の種類');
  kind.add(new Option('すべての素材','all'));
  for(const type of ASSET_KINDS)kind.add(new Option(ASSET_LABELS[type],type));
  const filter=document.createElement('select');filter.setAttribute('aria-label','素材の絞り込み');
  for(const [value,label] of [['normal','保存した素材'],['favorites','お気に入り'],['hidden','非表示'],['trash','ゴミ箱'],['recent','最近使った']] as const)
    filter.add(new Option(label,value));
  const search=document.createElement('div');search.className='c05-asset-search';search.append(query,kind,filter);
  const importFile=document.createElement('input');importFile.type='file';importFile.hidden=true;
  const packFile=document.createElement('input');packFile.type='file';packFile.accept='application/json,.json';packFile.hidden=true;
  const importKind=document.createElement('select');importKind.setAttribute('aria-label','取り込む素材の種類');
  for(const type of ASSET_KINDS)importKind.add(new Option(ASSET_LABELS[type],type));
  const add=button('素材を追加',()=>importFile.click());
  const importPack=button('素材セットを読み込む',()=>packFile.click());
  const exportPack=button('表示中をまとめて書き出す',()=>void doExport());
  const retryButton=button('失敗した素材だけ再試行',()=>void run(async()=>{
    const state=retry;if(!state)return;
    const result=await importAssetPack(state.manifest,{
      onlyIds:state.failedIds,resolvedIds:state.resolvedIds,
      onItem:(index,total)=>{status.textContent='失敗分を再試行中 '+index+'/'+total;}
    });
    showImportResult(result,state.manifest);
    await refresh();
  }));
  retryButton.hidden=true;
  const actions=document.createElement('div');actions.className='c05-asset-actions';
  actions.append(importKind,add,importPack,exportPack,retryButton);
  const results=document.createElement('div');results.className='c05-asset-results';
  const count=document.createElement('small'),status=document.createElement('output');status.setAttribute('role','status');
  const failedBox=document.createElement('details'),failedTitle=document.createElement('summary'),failedList=document.createElement('pre');
  failedTitle.textContent='読み込めなかった素材の詳細';
  failedBox.append(failedTitle,failedList);failedBox.hidden=true;
  const info=document.createElement('small');info.textContent='削除はゴミ箱へ移動します。資料やブラシの実際の適用先は種類ごとに確認します。';
  root.append(title,lead,search,actions,count,results,info,status,failedBox,importFile,packFile);host.append(root);
  let all:AssetInfo[]=[],visible:AssetInfo[]=[],busy=false,displayLimit=200;
  let retry:Readonly<{manifest:PackManifest;failedIds:readonly string[];resolvedIds:Readonly<Record<string,string>>}>|null=null;
  const error=(e:unknown)=>status.textContent=e instanceof Error?e.message:String(e);
  const run=async(action:()=>Promise<void>)=>{
    if(busy)return;
    busy=true;add.disabled=importPack.disabled=exportPack.disabled=retryButton.disabled=true;
    try{await action();}catch(e){error(e);}
    finally{busy=false;add.disabled=importPack.disabled=exportPack.disabled=retryButton.disabled=false;}
  };
  async function refresh(){
    try{all=await listAssets(true);render();}
    catch(e){error(e);}
  }
  const sort=(a:AssetInfo,b:AssetInfo)=>b.updatedAt-a.updatedAt;
  function render(){
    const q=query.value.trim().toLocaleLowerCase('ja-JP');
    visible=all.filter(a=>{
      if(kind.value!=='all'&&a.kind!==kind.value)return false;
      if(filter.value==='trash'){
        if(!a.deleted)return false;
      }else{
        if(a.deleted)return false;
        if(filter.value==='favorites'&&!a.favorite)return false;
        if(filter.value==='hidden'&&!a.hidden)return false;
        if(filter.value==='normal'&&a.hidden)return false;
      }
      const haystack=[a.name,a.kind,a.folder,a.tags.join(' '),a.notes].join(' ').toLocaleLowerCase('ja-JP');
      return !q||haystack.includes(q);
    }).sort(filter.value==='recent'?(a,b)=>(b.lastUsedAt??0)-(a.lastUsedAt??0):sort);
    results.replaceChildren();
    count.textContent=visible.length+'件 / '+all.length+'件（ゴミ箱を含む）';
    if(!visible.length){
      const empty=document.createElement('p');
      empty.textContent=all.length?'この条件に合う素材はありません。絞り込みを変えてください。':'素材はまだありません。画像や素材ファイルを追加できます。';
      results.append(empty);return;
    }
    for(const item of visible.slice(0,displayLimit)){
      const card=document.createElement('article');card.className='c05-asset-entry';
      const head=document.createElement('div');head.className='c05-asset-entry-head';
      const h=document.createElement('strong');h.textContent=item.name;
      const meta=document.createElement('small');
      meta.textContent=[ASSET_LABELS[item.kind],item.folder,item.tags.join(' / '),
        '第'+item.version+'版',item.parentId?'旧版 '+item.parentId.slice(0,8):'',
        Math.round(item.bytes/1024)+'KB',item.license?'利用条件あり':''].filter(Boolean).join(' · ');
      head.append(h,meta);
      if(!['brush','palette','reference'].includes(item.kind)){
        const hint=document.createElement('small');
        hint.textContent='保管・整理・書き出しに対応。作品への直接適用は未接続です。';
        head.append(hint);
      }
      const controls=document.createElement('div');controls.className='c05-asset-entry-actions';
      const edit=button('整理',()=>void run(async()=>editMetadata(item)));
      if(item.deleted){
        controls.append(button('ゴミ箱から戻す',()=>void run(async()=>{
          await restoreAsset(item.id);status.textContent='素材を元に戻しました。';await refresh();
        })));
      }else{
        controls.append(edit);
        controls.append(button('複製',()=>void run(async()=>{
          const copy=await duplicateAsset(item.id);status.textContent='「'+copy.name+'」を複製しました。';await refresh();
        })));
        controls.append(button('新版を保存',()=>chooseNewVersion(item)));
        controls.append(button(item.favorite?'★ お気に入り解除':'☆ お気に入り',()=>void run(async()=>{
          await updateAsset(item.id,{favorite:!item.favorite});await refresh();
        })));
        controls.append(button(item.hidden?'再表示':'非表示',()=>void run(async()=>{
          await updateAsset(item.id,{hidden:!item.hidden});await refresh();
        })));
        if(item.mime.startsWith('image/'))controls.append(button('プレビュー',()=>void run(async()=>previewAsset(item.id))));
        if(item.kind==='reference')controls.append(button('参考資料として開く',()=>void run(async()=>{
          await opts.openReference(item.id);await markAssetUsed(item.id);await refresh();
        })));
        if(item.kind==='brush'||item.kind==='palette')controls.append(button(
          item.kind==='brush'?'ブラシに読み込む':'色セットに読み込む',()=>void run(async()=>{
          await useAsset(item);await markAssetUsed(item.id);await refresh();
        })));
        controls.append(button('ファイルを出す',()=>void run(async()=>{
          const saved=await getAsset(item.id);if(!saved)throw Error('素材がありません。');
          saveBlob(saved.name,saved.data);await markAssetUsed(item.id);
        })));
        controls.append(button('ゴミ箱へ',()=>void run(async()=>{
          const descendants=all.filter(other=>other.parentId===item.id&&!other.deleted).length;
          const warning=descendants?'この素材を旧版として参照する新版が'+descendants+'件あります。\n':'';
          if(!window.confirm('「'+item.name+'」をゴミ箱へ移しますか？\n'+warning+
            '作品や参考資料で使用中の可能性は確認できません。\n'+
            'ゴミ箱へ移しても素材の中身は消さず、後から復元できます。'))return;
          await removeAsset(item.id);status.textContent='素材をゴミ箱へ移しました。';await refresh();
        })));
      }
      card.append(head,controls);results.append(card);
    }
    if(visible.length>displayLimit){
      results.append(button('さらに'+Math.min(200,visible.length-displayLimit)+'件表示',()=>{
        displayLimit+=200;render();
      }));
    }
  }
  async function editMetadata(item:AssetInfo){
    const name=window.prompt('素材名',item.name);if(name===null)return;
    if(!name.trim())throw Error('素材名は空にできません。');
    const folder=window.prompt('フォルダー名（空白なら未分類）',item.folder);if(folder===null)return;
    const tags=window.prompt('タグ（カンマ区切り）',item.tags.join(', '));if(tags===null)return;
    const license=window.prompt('利用条件や使用許諾（例：自作、許可済み等）',item.license);if(license===null)return;
    const origin=window.prompt('配布元・作成元（入力は任意）',item.origin);if(origin===null)return;
    const notes=window.prompt('素材についてのメモ',item.notes);if(notes===null)return;
    await updateAsset(item.id,{name,folder,tags:tags.split(/[,、，]+/),license,origin,notes});
    status.textContent='素材の情報を更新しました。';await refresh();
  }
  async function useAsset(item:AssetInfo){
    const targetId=item.kind==='brush'?'brushImportFile':'colorPaletteFile';
    const target=document.getElementById(targetId) as HTMLInputElement|null;
    if(!target)throw Error('この素材を使用する機能がまだ開かれていません。');
    const entry=await getAsset(item.id);if(!entry)throw Error('素材が見つかりません。');
    const blob=new File([entry.data],entry.name.endsWith('.json')?entry.name:entry.name+'.json',{
      type:entry.mime||'application/json'
    });
    const transfer=new DataTransfer();transfer.items.add(blob);
    target.files=transfer.files;
    target.dispatchEvent(new Event('change',{bubbles:true}));
    status.textContent=item.kind==='brush'?'ブラシの読み込み画面へ渡しました。':'色パレットの読み込み画面へ渡しました。';
  }
  async function previewAsset(assetId:string){
    const item=await getAsset(assetId);if(!item||!item.mime.startsWith('image/'))return;
    const dialog=document.createElement('dialog');dialog.className='c05-asset-preview';
    const title=document.createElement('h3');title.textContent=item.name;
    const image=document.createElement('img');image.alt=item.name;
    const url=URL.createObjectURL(item.data);image.src=url;
    const metadata=document.createElement('p');
    metadata.textContent=[ASSET_LABELS[item.kind],item.license,item.origin,item.notes].filter(Boolean).join(' · ');
    const close=button('閉じる',()=>dialog.close());
    dialog.append(title,image,metadata,close);document.body.append(dialog);
    dialog.addEventListener('close',()=>{URL.revokeObjectURL(url);dialog.remove();},{once:true});
    dialog.showModal();
  }
  function chooseNewVersion(item:AssetInfo){
    const file=document.createElement('input');file.type='file';file.hidden=true;file.accept=item.mime||'*/*';
    document.body.append(file);
    file.onchange=()=>{
      const blob=file.files?.[0];file.remove();if(!blob)return;
      void run(async()=>{
        if(!window.confirm('「'+item.name+'」の新版として別の素材IDで保存します。旧版は残ります。続けますか？'))return;
        const next=await createAssetVersion(item.id,blob);
        status.textContent='新版「'+next.name+'」を保存しました。旧版も使えます。';
        await refresh();
      });
    };
    file.addEventListener('cancel',()=>file.remove(),{once:true});
    file.click();
  }
  const resetView=()=>{displayLimit=200;render();};
  query.oninput=kind.onchange=filter.onchange=resetView;
  const syncImportAccept=()=>{
    importFile.accept=importKind.value==='reference'?'image/png,image/jpeg,image/webp,image/avif,image/gif':
      'image/*,application/json,.json';
  };
  importKind.onchange=syncImportAccept;
  syncImportAccept();
  importFile.onchange=()=>{
    const files=[...(importFile.files??[])];importFile.value='';
    void run(async()=>{
      for(const file of files){
        try{
          const added=await addAsset({kind:importKind.value as AssetKind,name:file.name,data:file});
          status.textContent='「'+added.name+'」を保存しました。';
        }catch(e){error(e);}
      }
      await refresh();
    });
  };
  async function doExport(){
    await run(async()=>{
      const ids=visible.filter(a=>!a.deleted).map(a=>a.id);
      if(!ids.length){status.textContent='書き出す素材がありません。';return;}
      const pack=await exportAssetPack(ids,{includeAncestors:true});
      const included=(await readAssetPack(pack)).items.length;
      saveBlob('illustro-assets-'+new Date().toISOString().slice(0,10)+'.json',pack);
      status.textContent=included+'件（旧版を含む）の書き出しを開始しました。保存先を確認してください。';
    });
  }
  function showImportResult(result:PackImportResult,manifest:PackManifest){
    retry=result.failedIds.length?{manifest,failedIds:result.failedIds,resolvedIds:result.resolvedIds}:null;
    retryButton.hidden=!retry;
    failedBox.hidden=!result.failures.length;
    failedList.textContent=result.failures.join('\n');
    status.textContent='今回'+result.imported.length+'件追加。失敗'+result.failures.length+'件。'+
      (result.unresolvedParents.length?' 旧版が見つからない素材'+result.unresolvedParents.length+'件。':'')+
      (retry?'「失敗した素材だけ再試行」で残りを再実行できます。':'');
  }
  packFile.onchange=()=>{
    const file=packFile.files?.[0];packFile.value='';if(!file)return;
    void run(async()=>{
      const manifest=await readAssetPack(file),summary=await previewAssetPack(manifest);
      const titles=summary.items.slice(0,12).map(i=>
        '・'+i.name+(i.conflict?'（同じIDあり：別IDで保存）':'')).join('\n');
      if(!window.confirm(summary.items.length+'件の素材を読み込みます。合計'+Math.round(summary.totalBytes/1024)+'KB。\n'+
        '元の素材を上書きしません。\n'+titles+'\n\n読み込みますか？'))return;
      const result=await importAssetPack(manifest,{onItem:(index,total)=>{
        status.textContent='素材を読み込み中 '+index+'/'+total;
      }});
      showImportResult(result,manifest);
      await refresh();
    });
  };
  void refresh();
  return {refresh};
}
