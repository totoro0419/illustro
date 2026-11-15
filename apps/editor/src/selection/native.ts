/**
 * C06 portable selections. Every mask is a binary optional section so a large
 * artwork does not need megabytes of base64 JSON. Unknown versions are kept by
 * the existing portable-preservation pipeline, never silently upgraded.
 */
import type {PortableSectionInput} from '../persistence/format';
import type {PreservedPortableData} from '../persistence/portable';
import type {MaskData} from './mask';
import {listSavedSelections,saveNamedSelection,loadNamedSelection} from './store';

const META='c06.selection.index',ACTIVE='c06.selection.active',PREFIX='c06.selection.saved.';
const INDEX_TYPE='selection.index.v1',ALPHA_TYPE='selection.alpha.v1',MAX_TOTAL=160*1024*1024;
export const C06_SELECTION_PREFIX='c06.selection.';
type Index=Readonly<{
  schema:'illustro.selection';version:1;width:number;height:number;active:boolean;
  saved:readonly Readonly<{id:string;name:string;width:number;height:number;createdAt:number;modifiedAt:number}>[];
}>;
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const textSection=(index:Index):PortableSectionInput=>({
  id:META,type:INDEX_TYPE,required:false,bytes:encoder.encode(JSON.stringify(index))
});
function validateMask(mask:MaskData,width:number,height:number){
  if(mask.width!==width||mask.height!==height||mask.alpha.length!==width*height)
    throw Error('選択範囲の画像サイズが作品と一致しません。');
}
export async function exportSelectionSections(
  documentId:string,width:number,height:number,active:MaskData|null
):Promise<readonly PortableSectionInput[]>{
  if(!documentId||width<1||height<1||!Number.isSafeInteger(width*height))
    throw Error('保存する作品の大きさが正しくありません。');
  if(active)validateMask(active,width,height);
  const saved=await listSavedSelections(documentId);
  let total=active?.alpha.byteLength??0;
  const items:Index['saved'][number][]=[],sections:PortableSectionInput[]=[];
  if(active)sections.push({id:ACTIVE,type:ALPHA_TYPE,required:false,bytes:active.alpha.slice()});
  for(const entry of saved){
    const bytes=new Uint8Array(await entry.alpha.arrayBuffer());
    if(bytes.byteLength!==entry.width*entry.height)throw Error('「'+entry.name+'」の保存された範囲が壊れています。');
    total+=bytes.byteLength;
    if(total>MAX_TOTAL)throw Error('作品内の選択範囲の合計が160MBを超えています。範囲の保存件数を減らしてください。');
    items.push({id:entry.id,name:entry.name,width:entry.width,height:entry.height,createdAt:entry.createdAt,modifiedAt:entry.modifiedAt});
    sections.push({id:PREFIX+entry.id,type:ALPHA_TYPE,required:false,bytes});
  }
  sections.push(textSection({schema:'illustro.selection',version:1,width,height,active:!!active,saved:items}));
  return sections;
}
export async function importSelectionSections(
  preserved:PreservedPortableData|undefined,
  documentId:string,width:number,height:number
):Promise<MaskData|null|undefined>{
  const meta=preserved?.optionalSections.find(s=>s.id===META);
  if(!meta)return undefined;
  if(meta.type!==INDEX_TYPE||meta.required)throw Error('作品内の選択範囲の形式が正しくありません。');
  if(meta.bytes.length>250_000)throw Error('選択範囲の目次が大きすぎます。');
  const unknown:unknown=JSON.parse(decoder.decode(meta.bytes));
  if(!unknown||typeof unknown!=='object'||Array.isArray(unknown))throw Error('選択範囲の目次が壊れています。');
  const index=unknown as Index;
  if(index.schema!=='illustro.selection'||index.version!==1||!Array.isArray(index.saved)||index.saved.length>32)
    throw Error('この作品の選択範囲の保存形式には対応していません。');
  if(index.width!==width||index.height!==height)throw Error('選択範囲と作品の大きさが異なります。');
  const from=(id:string,expectedPixels:number):Uint8Array=>{
    const entry=preserved!.optionalSections.find(s=>s.id===id&&s.type===ALPHA_TYPE);
    if(!entry||entry.bytes.byteLength!==expectedPixels)throw Error('保存した範囲の画素情報が不足しています。');
    return entry.bytes.slice();
  };
  let selection:MaskData|null=null;
  if(index.active)selection={width,height,alpha:from(ACTIVE,width*height)};
  const existing=await listSavedSelections(documentId);
  for(const item of index.saved){
    if(!item||typeof item.id!=='string'||!item.id||item.id.length>120||
      typeof item.name!=='string'||!item.name||item.name.length>120)
      throw Error('作品内の選択範囲の名前が不正です。');
    const current=existing.find(e=>e.name===item.name);
    if(current)continue; // Never overwrite a locally edited saved selection.
    if(!Number.isInteger(item.width)||!Number.isInteger(item.height)||item.width<1||item.height<1||item.width*item.height>64_000_000)
      throw Error('名前付き選択範囲のサイズが不正です。');
    const saved=from(PREFIX+item.id,item.width*item.height);
    await saveNamedSelection(documentId,item.name,{width:item.width,height:item.height,alpha:saved});
  }
  return selection;
}
