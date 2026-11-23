import {validateArtworkGuides,validateDocumentInfo,type ArtworkGuide} from '@illustro/core';
import {parsePalette} from './color/model';

/** Physical size and DPI validation for new documents. */
export type DocumentUnit='px'|'mm';
export type DocumentDimensions=Readonly<{width:number;height:number;dpi:number}>;
export function resolveDocumentDimensions(width:number,height:number,unit:DocumentUnit,dpi:number):DocumentDimensions{
 if(!Number.isInteger(dpi)||dpi<1||dpi>2400)throw new Error('解像度は1〜2400 DPIの整数で指定してください。');
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('幅と高さは正の数で指定してください。');
 if(unit!=='px'&&unit!=='mm')throw new Error('単位が正しくありません。');
 if(unit==='px'&&(!Number.isInteger(width)||!Number.isInteger(height)))throw new Error('pxでは幅と高さを整数で指定してください。');
 const w=unit==='px'?width:Math.round(width*dpi/25.4);
 const h=unit==='px'?height:Math.round(height*dpi/25.4);
 if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<1||h<1||w>8192||h>8192)throw new Error('換算後の幅と高さを1〜8192pxにしてください。');
 return {width:w,height:h,dpi};
}
export function pixelToMillimeters(px:number,dpi:number){return Math.round(px*25.4/dpi*1e6)/1e6;}
export type TemplateContent=Readonly<{guides?:readonly ArtworkGuide[];palette?:string;title?:string;author?:string;description?:string}>;
export type CreationTemplate=Readonly<DocumentDimensions&{name:string;background:'white'|'transparent';content?:TemplateContent}>;

function parseTemplateContent(input:unknown):TemplateContent|undefined{
 if(input===undefined)return undefined;
 if(!input||typeof input!=='object')throw Error('テンプレートの追加設定を確認してください。');
 const value=input as TemplateContent;
 const content:{-readonly [K in keyof TemplateContent]:TemplateContent[K]}={};
 if(value.guides!==undefined)content.guides=validateArtworkGuides(value.guides);
 if(value.palette!==undefined){
  if(typeof value.palette!=='string'||new TextEncoder().encode(value.palette).length>262144)
   throw Error('テンプレートのパレットは256KBまでです。');
  parsePalette(value.palette);content.palette=value.palette;
 }
 for(const item of [value.title,value.author,value.description]){
  if(item!==undefined&&typeof item!=='string')throw Error('テンプレートの作品情報を確認してください。');
 }
 const info=validateDocumentInfo({name:value.title??'新しい作品',author:value.author??'',description:value.description??'',dpi:null});
 if(value.title!==undefined)content.title=info.name;
 if(value.author!==undefined)content.author=info.author;
 if(value.description!==undefined)content.description=info.description;
 return content;
}
const STORAGE_KEY='illustro.creation-templates.v1';
type TemplateStore=Pick<Storage,'getItem'|'setItem'>;
export function listCreationTemplates(storage:Pick<Storage,'getItem'>|null):CreationTemplate[]{
 try{
  const source:unknown=JSON.parse(storage?.getItem(STORAGE_KEY)??'[]');
  if(!Array.isArray(source))return [];
  const out:CreationTemplate[]=[];
  for(const value of source.slice(0,50)){
   if(!value||typeof value!=='object')continue;
   const v=value as Record<string,unknown>;
   if(typeof v.name!=='string'||!v.name.trim()||v.name.length>80||(v.background!=='white'&&v.background!=='transparent'))continue;
   try{const dimensions=resolveDocumentDimensions(Number(v.width),Number(v.height),'px',Number(v.dpi));
    const content=parseTemplateContent(v.content);
    if(!out.some(x=>x.name===v.name))out.push({...dimensions,name:v.name,background:v.background,...(content?{content}:{})});
   }catch{}
  }
  return out.slice(0,30);
 }catch{return [];}
}
export function storeCreationTemplate(storage:TemplateStore|null,template:CreationTemplate):CreationTemplate[]{
 const name=template.name.trim();if(!name||name.length>80)throw new Error('テンプレート名は1〜80文字で指定してください。');
 if(!storage)throw new Error('端末の設定保存が使えません。');
 const dimensions=resolveDocumentDimensions(template.width,template.height,'px',template.dpi);
 const content=parseTemplateContent(template.content);
 const values=[{...dimensions,name,background:template.background,...(content?{content}:{})},...listCreationTemplates(storage).filter(x=>x.name!==name)].slice(0,30);
 storage.setItem(STORAGE_KEY,JSON.stringify(values));
 return values;
}
export function removeCreationTemplate(storage:TemplateStore|null,name:string):CreationTemplate[]{
 if(!storage)throw new Error('端末の設定保存が使えません。');
 const values=listCreationTemplates(storage).filter(x=>x.name!==name);
 storage.setItem(STORAGE_KEY,JSON.stringify(values));
 return values;
}
