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
