import type {DocumentRoot} from '@illustro/core';
import {addAsset,getAsset} from '../assets/library';
import type {PreservedPortableData} from '../persistence/portable';
import type {PortableSectionInput} from '../persistence/format';
import {fontFamily,registerLoadedFont} from './fonts';
import {textFontAssetIds} from './textStyles';

const PREFIX='c10.font.',TYPE='font.asset.v1',LIMIT=48*1024*1024;
const validId=(id:string)=>/^[a-f0-9-]{36}$/i.test(id);
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});

export async function exportFonts(root:DocumentRoot,preserved?:PreservedPortableData):Promise<readonly PortableSectionInput[]>{
  const ids=new Set<string>();
  for(const id of root.rootLayerIds){
    const editable=root.getLayer(id).editable;
    if(editable?.kind==='text'&&editable.embedFont)for(const fontId of textFontAssetIds(editable))if(validId(fontId))ids.add(fontId);
  }
  const sections:PortableSectionInput[]=[];
  let total=0;
  for(const id of ids){
    const asset=await getAsset(id);
    if(!asset||asset.deleted||asset.kind!=='font'){
      const original=preserved?.optionalSections.find(section=>section.id===PREFIX+id&&section.type===TYPE&&!section.required);
      if(!original)throw Error('同梱するフォントが見つかりません。フォントを選び直すか、同梱を解除してください。');
      total+=original.bytes.length;
      if(total>LIMIT)throw Error('作品に同梱するフォントの合計を48MB以下にしてください。');
      sections.push(original);continue;
    }
    const identifier=encoder.encode(asset.name.slice(0,100));
    const blob=new Uint8Array(await asset.data.arrayBuffer());
    const bytes=new Uint8Array(2+identifier.length+blob.length);
    new DataView(bytes.buffer).setUint16(0,identifier.length);
    bytes.set(identifier,2);bytes.set(blob,identifier.length+2);
    total+=bytes.length;
    if(total>LIMIT)throw Error('作品に同梱するフォントの合計を48MB以下にしてください。');
    sections.push({id:PREFIX+id,type:TYPE,required:false,bytes});
  }
  return sections;
}

export async function importFonts(root:DocumentRoot,preserved:PreservedPortableData){
  const ids=new Set<string>();
  for(const id of root.rootLayerIds){
    const editable=root.getLayer(id).editable;
    if(editable?.kind==='text')for(const fontId of textFontAssetIds(editable))if(validId(fontId))ids.add(fontId);
  }
  let total=0;
  for(const id of ids){
    const section=preserved.optionalSections.find(item=>item.id===PREFIX+id&&item.type===TYPE&&!item.required);
    if(!section)continue;
    const size=section.bytes.byteLength;
    total+=size;
    if(size<4||size>25*1024*1024||total>LIMIT)throw Error('同梱フォントのサイズが正しくありません。');
    const bytes=new Uint8Array(section.bytes);
    const nameSize=new DataView(bytes.buffer).getUint16(0);
    if(!nameSize||nameSize>400||nameSize+2>=size)throw Error('同梱フォント名に対応していません。');
    const fontName=decoder.decode(bytes.subarray(2,nameSize+2)),fontBytes=bytes.slice(nameSize+2);
    const existing=await getAsset(id);
    if(existing){
      const local=new Uint8Array(await existing.data.arrayBuffer());
      if(existing.kind!=='font'||local.length!==fontBytes.length||local.some((value,index)=>value!==fontBytes[index]))
        throw Error('同じIDの別フォントがあります。既存のフォントは上書きしていません。文字編集で確認してください。');
      continue;
    }
    const font=await new FontFace(fontFamily(id),fontBytes).load();
    await addAsset({id,kind:'font',name:fontName,data:new Blob([fontBytes]),origin:'Illustro作品ファイル'});
    registerLoadedFont(id,font);
  }
}
