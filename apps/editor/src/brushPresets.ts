import {exportPresets,importPresets,validateFoundation,type FoundationPreset} from '@illustro/brush-rt';

/**
 * Local, versioned user-brush collection. Only user presets are persisted;
 * shipped Foundation presets are immutable and keep their stable IDs.
 * Artwork/stroke history is intentionally independent of this collection.
 */
export const BRUSH_LIBRARY_KEY='illustro.user-brushes.v1';
const MAX_USER_PRESETS=192;
const copy=(preset:FoundationPreset)=>structuredClone(preset);
export class BrushPresetLibrary {
  private users:FoundationPreset[]=[];
  private builtInIds=new Set<string>();
  readonly storage:Storage|null;
  readonly loadError:string|null;
  constructor(storage?:Storage|null){
    let candidate:Storage|null=null,error:string|null=null;
    try{candidate=storage===undefined?(typeof localStorage==='undefined'?null:localStorage):storage;
      const stored=candidate?.getItem(BRUSH_LIBRARY_KEY);
      if(stored!==undefined&&stored!==null){
        const parsed=importPresets(stored);
        if(parsed.length>MAX_USER_PRESETS)throw Error('ブラシが多すぎます');
        this.users=parsed;
      }
    }catch(e){error=e instanceof Error?e.message:String(e);}
    this.storage=candidate;
    this.loadError=error;
  }
  all(builtIns:readonly FoundationPreset[]):FoundationPreset[]{
    this.builtInIds=new Set(builtIns.map(p=>p.id));
    for(const user of this.users)if(this.builtInIds.has(user.id))throw Error('標準ブラシと識別番号が重複しています');
    return [...builtIns,...this.users].map(copy);
  }
  get userPresets(){return this.users.map(copy);}
  isUser(id:string){return this.users.some(p=>p.id===id);}
  private persist(next:FoundationPreset[]){
    if(next.length>MAX_USER_PRESETS)throw Error('保存できるユーザーブラシ数を超えました');
    const data=exportPresets(next);
    if(!this.storage)throw Error('この端末ではブラシを保存できません');
    // Commit in-memory state only after persistent storage is successful.
    this.storage.setItem(BRUSH_LIBRARY_KEY,data);
    this.users=next.map(copy);
  }
  duplicate(source:FoundationPreset,name:string):FoundationPreset{
    const title=name.trim();
    if(!title||title.length>100)throw Error('ブラシ名は1～100文字にしてください');
    const created=copy(validateFoundation(source));
    created.id='user-brush-'+crypto.randomUUID();created.name=title;
    this.persist([...this.users,created]);
    return copy(created);
  }
  save(preset:FoundationPreset):FoundationPreset{
    const safe=copy(validateFoundation(preset));
    if(this.builtInIds.has(safe.id))throw Error('標準ブラシは複製してから保存してください');
    const index=this.users.findIndex(p=>p.id===safe.id);
    if(index<0)throw Error('保存対象のユーザーブラシがありません');
    const next=this.userPresets;next[index]=safe;
    this.persist(next);return copy(safe);
  }
  remove(id:string):void{
    if(!this.isUser(id))throw Error('削除できるユーザーブラシではありません');
    this.persist(this.users.filter(p=>p.id!==id));
  }
  importPack(json:string):number{
    const imported=importPresets(json);
    if(imported.some(p=>this.builtInIds.has(p.id)))throw Error('標準ブラシと識別番号が重複しています');
    const merged=new Map(this.users.map(p=>[p.id,copy(p)]));
    for(const p of imported)merged.set(p.id,copy(p));
    this.persist([...merged.values()]);
    return imported.length;
  }
  exportPack():string{return exportPresets(this.users);}
}
