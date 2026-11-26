import {compilePreset,validateFoundation,type FoundationPreset} from '@illustro/brush-rt';

type WorkBrushSettings=Readonly<{presetId:string;size:number}>;
type BrushSettingsStorage=Pick<Storage,'getItem'|'setItem'>;
const key=(documentId:string)=>'illustro.work-brush.v1.'+documentId;

export function readWorkBrushSettings(storage:BrushSettingsStorage|null,documentId:string):WorkBrushSettings|null{
  try{
    const saved=JSON.parse(storage?.getItem(key(documentId))??'null');
    if(typeof saved?.presetId==='string'&&saved.presetId&&Number.isFinite(saved.size)
      &&saved.size>=.01&&saved.size<=4096){
      return {presetId:saved.presetId,size:saved.size};
    }
  }catch{/* The work can still open with its default brush. */}
  return null;
}

export function saveWorkBrushSettings(storage:BrushSettingsStorage|null,documentId:string,settings:WorkBrushSettings){
  try{storage?.setItem(key(documentId),JSON.stringify(settings));}
  catch{/* Browser storage limits do not interrupt brush editing. */}
}

export const WORK_BRUSH_SECTION='brush.editing-state';
export const WORK_BRUSH_TYPE='brush.editing-state.v1';
const MAX_STATE_BYTES=32*1024*1024;
export type WorkBrushState=Readonly<{version:1;preset:FoundationPreset;commonStabilization:number}>;
const stateKey=(documentId:string)=>'illustro.work-brush-state.v1.'+documentId;

export function validateWorkBrushState(value:unknown):WorkBrushState{
  if(!value||typeof value!=='object')throw Error('ブラシ設定の形式が正しくありません。');
  const state=value as WorkBrushState;
  if(state.version!==1||!Number.isFinite(state.commonStabilization)||state.commonStabilization<0||state.commonStabilization>1)
    throw Error('ブラシ設定の版または手ぶれ補正が正しくありません。');
  const preset=structuredClone(validateFoundation(state.preset));
  compilePreset(preset,{forceFadeGeometry:'adaptive-v1'});
  return {version:1,preset,commonStabilization:state.commonStabilization};
}
export function encodeWorkBrushState(state:WorkBrushState){
  const bytes=new TextEncoder().encode(JSON.stringify(state));
  if(bytes.length>MAX_STATE_BYTES)throw Error('ブラシ設定が大きすぎます。');
  return {id:WORK_BRUSH_SECTION,type:WORK_BRUSH_TYPE,required:false,bytes};
}
export function decodeWorkBrushState(section:{id:string;type:string;bytes:Uint8Array}):WorkBrushState{
  if(section.id!==WORK_BRUSH_SECTION||section.type!==WORK_BRUSH_TYPE||section.bytes.length>MAX_STATE_BYTES)
    throw Error('ブラシ設定を読み取れません。');
  return validateWorkBrushState(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(section.bytes)));
}
export function readLocalWorkBrushState(storage:BrushSettingsStorage|null,documentId:string):WorkBrushState|null{
  try{
    const text=storage?.getItem(stateKey(documentId));
    return text&&text.length<=MAX_STATE_BYTES?validateWorkBrushState(JSON.parse(text)):null;
  }catch{return null;}
}
export function saveLocalWorkBrushState(storage:BrushSettingsStorage|null,documentId:string,state:WorkBrushState):boolean{
  try{
    if(!storage)return false;
    const text=JSON.stringify(state);
    if(text.length>MAX_STATE_BYTES)return false;
    storage.setItem(stateKey(documentId),text);
    return true;
  }catch{return false;}
}
