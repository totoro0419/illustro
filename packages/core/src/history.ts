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

export class RevisionHistory<T>{
  private readonly revisions=new Map<RevisionId,Revision<T>>();private headValue:RevisionId;private readonly redoIds:RevisionId[]=[];
  constructor(root:T,private readonly ids:IdFactory,at=0){const id=ids.revision();this.headValue=id;this.revisions.set(id,Object.freeze({id,parentIds:Object.freeze([]),transactionId:null,root,command:null,commitStamp:null,committedAt:at}));}
  get head(){return this.headValue;}get current(){const r=this.revisions.get(this.headValue);if(!r)throw new Error('missing revision');return r;}get count(){return this.revisions.size;}
  get canUndo(){return this.current.parentIds[0]!==undefined;}get canRedo(){return this.redoIds.length>0;}
  has(id:RevisionId){return this.revisions.has(id);}get(id:RevisionId){const r=this.revisions.get(id);if(!r)throw new Error('missing revision');return r;}
  assertHead(id:RevisionId){if(id!==this.headValue)throw new Error('stale transaction');}
  publish(base:RevisionId,tx:TransactionId,root:T,command:Command,at:number,commitStamp:CommitStamp){this.assertHead(base);const id=this.ids.revision();
    const operations=Object.freeze(command.operations.map(x=>Object.freeze(x)));const cmd=Object.freeze({...command,operations});
    const revision=Object.freeze({id,parentIds:Object.freeze([this.headValue]),transactionId:tx,root,command:cmd,commitStamp,committedAt:at}) as Revision<T>;
    this.revisions.set(id,revision);this.headValue=id;this.redoIds.length=0;return revision;}
  undo(){const parent=this.current.parentIds[0];if(parent===undefined)return this.current;this.redoIds.push(this.headValue);this.headValue=parent;return this.current;}
  redo(){const next=this.redoIds.pop();if(next===undefined)return this.current;this.headValue=next;return this.current;}
}
export function finalizeOperation(transactionId:TransactionId,operationOrdinal:number,draft:SemanticOperationDraft):SemanticOperation{
  if(!draft.kind.trim()||!Number.isSafeInteger(draft.schemaVersion)||draft.schemaVersion<=0)throw new Error('invalid semantic operation');
  return Object.freeze({...draft,key:operationKey(transactionId,operationOrdinal),targetEntityIds:Object.freeze([...draft.targetEntityIds]),
    parameters:Object.freeze({...draft.parameters}),algorithmVersionRefs:Object.freeze([...draft.algorithmVersionRefs]),resourceRefs:Object.freeze([...draft.resourceRefs]),
    sourceRevisionIds:Object.freeze([...draft.sourceRevisionIds]),selectionSnapshotRefs:Object.freeze([...draft.selectionSnapshotRefs]),
    resultValueRefs:Object.freeze([...draft.resultValueRefs]),dirtyFootprint:Object.freeze(draft.dirtyFootprint.map(x=>Object.freeze({...x,bounds:Object.freeze({...x.bounds})})))});
}
