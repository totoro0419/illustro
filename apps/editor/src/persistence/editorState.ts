import type {SelectionRect} from '../strokeSelection';

/** The editor-state section is independent of undoable artwork revisions.
 * New selection shapes can extend the tagged union without invalidating v1 files. */
export type NativeSelection=Readonly<{kind:'rectangle';rect:SelectionRect}>|null;
export type EditorStateV2=Readonly<{version:2;selectedLayerId:string;selection:NativeSelection}>;
export type EditorStateRead=Readonly<{selectedLayerId:string|null;selection:SelectionRect|null;sourceVersion:0|1|2}>;

function rectangle(value:unknown,width:number,height:number):SelectionRect{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('保存された選択範囲が正しくありません。');
  const rect=value as Record<string,unknown>;
  const fields=[rect.x,rect.y,rect.width,rect.height];
  if(fields.some(field=>typeof field!=='number'||!Number.isFinite(field))||
    (rect.width as number)<=0||(rect.height as number)<=0||
    (rect.x as number)<0||(rect.y as number)<0||
    (rect.x as number)+(rect.width as number)>width+1e-5||
    (rect.y as number)+(rect.height as number)>height+1e-5){
    throw new Error('保存された選択範囲がキャンバスの外にあります。');
  }
  return Object.freeze({x:rect.x as number,y:rect.y as number,width:rect.width as number,height:rect.height as number});
}

export function nativeSelection(selection:SelectionRect|null,width:number,height:number):NativeSelection{
  if(!selection)return null;
  return Object.freeze({kind:'rectangle' as const,rect:rectangle(selection,width,height)});
}
export function readEditorState(value:unknown,width:number,height:number):EditorStateRead{
  if(value===undefined||value===null)return {selectedLayerId:null,selection:null,sourceVersion:0};
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('編集状態の形式が正しくありません。');
  const raw=value as Record<string,unknown>;
  if(raw.version!==1&&raw.version!==2)throw new Error('未対応の編集状態形式です。');
  const selectedLayerId=typeof raw.selectedLayerId==='string'?raw.selectedLayerId:null;
  if(raw.version===1)return {selectedLayerId,selection:null,sourceVersion:1};
  if(raw.selection===null)return {selectedLayerId,selection:null,sourceVersion:2};
  if(!raw.selection||typeof raw.selection!=='object'||Array.isArray(raw.selection))throw new Error('選択範囲の形式が正しくありません。');
  const shape=raw.selection as Record<string,unknown>;
  if(shape.kind!=='rectangle')throw new Error('この作品の選択範囲の種類には未対応です。');
  return {selectedLayerId,selection:rectangle(shape.rect,width,height),sourceVersion:2};
}
export function makeEditorState(selectedLayerId:string,selection:SelectionRect|null,width:number,height:number):EditorStateV2{
  return Object.freeze({version:2 as const,selectedLayerId,selection:nativeSelection(selection,width,height)});
}
