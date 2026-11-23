import {operationKey,type IdFactory,type LayerId,type OperationKey,type ResourceId,type RevisionId,type TransactionId,type WriterEpochId} from './ids';
import type {LocalDirtyRect} from './raster/surface';

export type CommitStamp=Readonly<{writerEpochId:WriterEpochId;commitSequence:bigint}>;
export type DirtyFootprintHint=Readonly<{layerId:LayerId;tileX:number;tileY:number;bounds:LocalDirtyRect}>;
export type SemanticOperation=Readonly<{
  key:OperationKey;kind:string;schemaVersion:number;targetEntityIds:readonly LayerId[];parameters:Readonly<Record<string,unknown>>;
  algorithmVersionRefs:readonly string[];resourceRefs:readonly ResourceId[];sourceRevisionIds:readonly RevisionId[];
  selectionSnapshotRefs:readonly string[];resultValueRefs:readonly string[];dirtyFootprint:readonly DirtyFootprintHint[];
}>;
export type SemanticOperationDraft=Omit<SemanticOperation,'key'>;
export type Command=Readonly<{version:2;kind:'core.transaction.v2';label:string;operations:readonly SemanticOperation[]}>;
export type Revision<T>=Readonly<{id:RevisionId;parentIds:readonly RevisionId[];transactionId:TransactionId|null;root:T;command:Command|null;commitStamp:CommitStamp|null;committedAt:number}>;
export type RevisionHistoryState<T>=Readonly<{revisions:readonly Revision<T>[];head:RevisionId;redoIds:readonly RevisionId[]}>;

export class RevisionHistory<T>{
  private readonly revisions=new Map<RevisionId,Revision<T>>();private headValue:RevisionId;private readonly redoIds:RevisionId[]=[];private undoLimitValue:number|null=null;
  constructor(root:T,private readonly ids:IdFactory,at=0,hydrate?:RevisionHistoryState<T>){
    if(hydrate){
      if(!hydrate.revisions.length)throw new Error('history is empty');
      for(const revision of hydrate.revisions){if(this.revisions.has(revision.id))throw new Error('duplicate revision id');this.revisions.set(revision.id,freezeRevision(revision));}
      if(!this.revisions.has(hydrate.head))throw new Error('history head missing');this.headValue=hydrate.head;
      for(const id of hydrate.redoIds){if(!this.revisions.has(id))throw new Error('redo revision missing');this.redoIds.push(id);}
      validateGraph(this.revisions);return;
    }
    const id=ids.revision();this.headValue=id;this.revisions.set(id,Object.freeze({id,parentIds:Object.freeze([]),transactionId:null,root,command:null,commitStamp:null,committedAt:at}));
  }
  static hydrate<T>(state:RevisionHistoryState<T>,ids:IdFactory){const seed=state.revisions[0];if(!seed)throw new Error('history is empty');return new RevisionHistory(seed.root,ids,0,state);}
  get head(){return this.headValue;}get current(){const r=this.revisions.get(this.headValue);if(!r)throw new Error('missing revision');return r;}get count(){return this.revisions.size;}
  get canUndo(){return this.current.parentIds[0]!==undefined&&(this.undoLimitValue===null||this.redoIds.length<this.undoLimitValue);}
  get undoLimit(){return this.undoLimitValue;}
  setUndoLimit(limit:number|null){
    if(limit!==null&&(!Number.isSafeInteger(limit)||limit<1))throw new Error('履歴の件数が正しくありません。');
    this.undoLimitValue=limit;
  }get canRedo(){return this.redoIds.length>0;}
  get nextRedo(){const id=this.redoIds.at(-1);return id===undefined?null:this.get(id);}
  has(id:RevisionId){return this.revisions.has(id);}get(id:RevisionId){const r=this.revisions.get(id);if(!r)throw new Error('missing revision');return r;}
  snapshot():RevisionHistoryState<T>{return Object.freeze({revisions:Object.freeze([...this.revisions.values()]),head:this.headValue,redoIds:Object.freeze([...this.redoIds])});}
  previewNavigation(steps:readonly ('undo'|'redo')[]){
    let head=this.headValue;
    const redo=[...this.redoIds];
    for(const [index,step] of steps.entries()){
      if(step==='undo'){
        const parent=this.get(head).parentIds[0];
        if(!parent||this.undoLimitValue!==null&&redo.length>=this.undoLimitValue)
          throw Error((index+1)+'番目の手順で、これ以上元に戻せません。');
        redo.push(head);head=parent;
      }else{
        const next=redo.pop();
        if(!next)throw Error((index+1)+'番目の手順で、これ以上やり直せません。');
        head=next;
      }
    }
    return head;
  }
  assertHead(id:RevisionId){if(id!==this.headValue)throw new Error('stale transaction');}
  publish(base:RevisionId,tx:TransactionId,root:T,command:Command,at:number,commitStamp:CommitStamp,id=this.ids.revision(),expected=base){
    this.assertHead(expected);if(this.revisions.has(id))throw Error('duplicate revision id');
    const operations=Object.freeze(command.operations.map(x=>Object.freeze(x)));const cmd=Object.freeze({...command,operations});
    const revision=Object.freeze({id,parentIds:Object.freeze([base]),transactionId:tx,root,command:cmd,commitStamp,committedAt:at}) as Revision<T>;
    this.revisions.set(id,revision);this.headValue=id;this.redoIds.length=0;return revision;}
  undo(){const parent=this.current.parentIds[0];if(parent===undefined||!this.canUndo)return this.current;this.redoIds.push(this.headValue);this.headValue=parent;return this.current;}
  redo(){const next=this.redoIds.pop();if(next===undefined)return this.current;this.headValue=next;return this.current;}
}
export function finalizeOperation(transactionId:TransactionId,operationOrdinal:number,draft:SemanticOperationDraft):SemanticOperation{
  if(!draft.kind.trim()||!Number.isSafeInteger(draft.schemaVersion)||draft.schemaVersion<=0)throw new Error('invalid semantic operation');
  return Object.freeze({...draft,key:operationKey(transactionId,operationOrdinal),targetEntityIds:Object.freeze([...draft.targetEntityIds]),
    parameters:Object.freeze({...draft.parameters}),algorithmVersionRefs:Object.freeze([...draft.algorithmVersionRefs]),resourceRefs:Object.freeze([...draft.resourceRefs]),
    sourceRevisionIds:Object.freeze([...draft.sourceRevisionIds]),selectionSnapshotRefs:Object.freeze([...draft.selectionSnapshotRefs]),
    resultValueRefs:Object.freeze([...draft.resultValueRefs]),dirtyFootprint:Object.freeze(draft.dirtyFootprint.map(x=>Object.freeze({...x,bounds:Object.freeze({...x.bounds})})))});
}
function freezeRevision<T>(revision:Revision<T>):Revision<T>{return Object.freeze({...revision,parentIds:Object.freeze([...revision.parentIds]),command:revision.command?Object.freeze({...revision.command,operations:Object.freeze([...revision.command.operations])}):null,commitStamp:revision.commitStamp?Object.freeze({...revision.commitStamp}):null});}
function validateGraph<T>(revisions:ReadonlyMap<RevisionId,Revision<T>>){
  for(const revision of revisions.values())for(const parent of revision.parentIds){if(parent===revision.id)throw new Error('revision self-parent');if(!revisions.has(parent))throw new Error('revision parent missing');}
  const visiting=new Set<RevisionId>(),done=new Set<RevisionId>();
  const visit=(id:RevisionId)=>{if(done.has(id))return;if(visiting.has(id))throw new Error('revision cycle');visiting.add(id);const revision=revisions.get(id);if(!revision)throw new Error('revision missing');for(const parent of revision.parentIds)visit(parent);visiting.delete(id);done.add(id);};
  for(const id of revisions.keys())visit(id);
}
