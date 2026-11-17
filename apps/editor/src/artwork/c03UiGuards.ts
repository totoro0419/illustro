import type {MaskData} from '../selection/mask';
import type {SelectionRect} from '../strokeSelection';

/** Use the actual C06 alpha mask for free-form selections, not its bounding rectangle. */
export function selectionCanCreateMask(mode:string,rectangle:SelectionRect|null,selection:MaskData|null,width:number,height:number):boolean{
  if(mode==='selection'&&selection)
    return selection.width===width&&selection.height===height&&selection.alpha.length===width*height;
  return rectangle!==null;
}

/** A browser download event is not evidence that the file reached durable storage. */
export function explicitSaveStatus(output:'picker'|'download',verified:boolean,asCopy:boolean,sizeLabel:string):string{
  if(output==='download')return 'ダウンロードを開始しました（'+sizeLabel+'）。端末に作品ファイルが保存されたか確認してください。自動保存状態には影響しません。';
  if(!verified)return '保存先の確認が取れていません。作品ファイルを確認してください。自動保存状態には影響しません。';
  return (asCopy?'別名の作品ファイルを保存しました':'作品ファイルを保存しました（'+sizeLabel+'）')+'。保存先の内容を確認済みです。自動保存状態には影響しません。';
}

/** Keep button availability and the execution guard on the same conditions. */
export function maskApplyAllowed(state:Readonly<{
  editable:boolean;maskEnabled:boolean;geometryReady:boolean;geometryBusy:boolean;historyPending:boolean;
}>):boolean{
  return state.editable&&state.maskEnabled&&state.geometryReady&&!state.geometryBusy&&!state.historyPending;
}
