import type {CoreDocument,LayerId} from '@illustro/core';
import {button,paintPreview,selectField} from '../artwork/tools';
import {captureExport,exportFileName,exportImage,flattenOnWhite,renderFrozenArtworkTiledPreview,type FrozenExport,type ImageFormat} from './basicExport';

const kinds=[['png','PNG・透明度あり'],['jpeg','JPEG・高画質・白背景'],['webp','WebP・高画質']] as const;

export function openLayerBatch(artwork:CoreDocument,selected:ReadonlySet<LayerId>){
  const root=artwork.root,frozen=captureExport(artwork);
  const dialog=document.createElement('dialog');dialog.className='export-dialog';
  dialog.setAttribute('aria-label','レイヤーを別々の画像に書き出す');
  const fields=document.createElement('div');fields.className='c06-clipboard-grid';
  const status=document.createElement('output');status.setAttribute('role','status');
  const scope=selectField(fields,'対象',[['selection','選んだレイヤー'],['visible','表示中のレイヤー']]);
  const format=selectField(fields,'画像の設定',kinds);
  const list=document.createElement('ol');
  const note=document.createElement('p');note.textContent='開始時点の作品から、各レイヤーの画像を作ります。色の調整レイヤーは作品全体の書き出しで反映されます。';
  const buttonRow=document.createElement('div');buttonRow.className='box-actions';
  let current:AbortController|null=null;
  type Row={scene:FrozenExport;name:string;image:HTMLCanvasElement;status:HTMLOutputElement;link:HTMLAnchorElement};
  let rows:Row[]=[];
  const urls=new Set<string>();
  function clearUrls(){for(const url of urls)URL.revokeObjectURL(url);urls.clear();}
  function update(){
    if(current)return;
    clearUrls();rows=[];list.replaceChildren();
    const names=new Set<string>(),kind=format.value as ImageFormat;
    for(const id of root.rootLayerIds){
      const layer=root.getLayer(id);
      if(!(scope.value==='selection'?selected.has(id):root.isLayerVisible(id))||layer.blend?.gradientMap||layer.blend?.adjustment)continue;
      const descriptor=frozen.layers.find(item=>item.surfaceId===layer.surface.descriptor.surfaceId)!;
      const {clipSurfaceId:_clip,isolation:_group,blend:_blend,...source}=descriptor;
      const scene={...frozen,layers:[{...source,visible:true}],basePixels:frozen.basePixels?.filter(item=>item.surfaceId===source.surfaceId)??[],
        strokes:frozen.strokes.filter(item=>item.surfaceId===source.surfaceId)};
      const base=exportFileName(frozen.name+'-'+layer.name,kind);
      const point=base.lastIndexOf('.');
      let name=base;
      for(let i=2;names.has(name.toLowerCase());i++)name=base.slice(0,point)+'-'+i+base.slice(point);
      names.add(name.toLowerCase());
      const item=document.createElement('li'),image=document.createElement('canvas'),result=document.createElement('output'),link=document.createElement('a');
      image.hidden=true;image.setAttribute('aria-label',layer.name+'の縮小結果');image.style.cssText='display:block;max-width:100%;height:auto';
      link.hidden=true;link.textContent='画像を保存';
      item.append(name,' ',result,' ',link,image);list.append(item);
      rows.push({scene,name,image,status:result,link});
    }
    status.textContent=rows.length?rows.length+'枚を出力できます。':'書き出せるレイヤーがありません。';
  }
  async function process(preview:boolean){
    if(current||!rows.length)return;
    const abort=new AbortController();current=abort;scope.disabled=format.disabled=true;
    try{
      for(const row of rows){
        abort.signal.throwIfAborted();
        row.status.textContent='処理中…';
        try{
          if(preview){
            const scale=Math.min(1,100/Math.max(frozen.width,frozen.height));
            const w=Math.max(1,Math.round(frozen.width*scale)),h=Math.max(1,Math.round(frozen.height*scale));
            const bytes=await renderFrozenArtworkTiledPreview(row.scene,w,h);
            abort.signal.throwIfAborted();
            if(!bytes)throw Error('この画像の縮小表示には対応していません。');
            paintPreview(row.image,format.value==='jpeg'?new Uint8ClampedArray(flattenOnWhite(bytes)):new Uint8ClampedArray(bytes),w,h);row.status.textContent='縮小表示を作成しました。';
          }else{
            const blob=(await exportImage(row.scene,format.value as ImageFormat,.92)).blob;
            abort.signal.throwIfAborted();
            if(row.link.href&&urls.delete(row.link.href))URL.revokeObjectURL(row.link.href);
            const url=URL.createObjectURL(blob);urls.add(url);row.link.href=url;row.link.download=row.name;row.link.hidden=false;
            row.status.textContent='作成済み';
          }
        }catch(error){
          if(abort.signal.aborted){row.status.textContent='中止';throw error;}
          row.status.textContent=error instanceof Error?error.message:String(error);
        }
      }
      status.textContent='処理が終わりました。各ファイルの結果を確認できます。';
    }catch(error){if(!abort.signal.aborted)throw error;status.textContent='処理を中止しました。';}
    finally{current=null;scope.disabled=format.disabled=false;}
  }
  buttonRow.append(button('縮小表示を作る',()=>process(true),status),button('画像を作成',()=>process(false),status),
    button('中止',()=>current?.abort(),status),button('閉じる',()=>dialog.close(),status));
  fields.append(note,list,buttonRow,status);dialog.append(fields);
  dialog.onclose=()=>{current?.abort();clearUrls();dialog.remove();};
  scope.onchange=format.onchange=update;
  document.body.append(dialog);dialog.showModal();update();
}
