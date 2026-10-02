import {revisionId,type LayerId,type RevisionId,type TransactionId} from './ids';
export type CommandOperation=Readonly<{kind:'raster.tiles';layerId:LayerId;tileCount:number}>|Readonly<{kind:'layer.metadata';layerId:LayerId}>|Readonly<{kind:'brush.stroke';layerId:LayerId;recordJson:string}>;
export type Command=Readonly<{version:1;kind:'core.transaction';label:string;operations:readonly CommandOperation[]}>;
export type Revision<T>=Readonly<{id:RevisionId;parentIds:readonly RevisionId[];transactionId:TransactionId|null;root:T;command:Command|null;committedAt:number}>;
export class RevisionHistory<T>{
 private revisions=new Map<RevisionId,Revision<T>>();private h=revisionId(0);private next=1;private redoIds:RevisionId[]=[];
 constructor(root:T,at=0){this.revisions.set(this.h,Object.freeze({id:this.h,parentIds:Object.freeze([]),transactionId:null,root,command:null,committedAt:at}));}
 get head(){return this.h;}get current(){const r=this.revisions.get(this.h);if(!r)throw new Error('missing revision');return r;}get count(){return this.revisions.size;}has(id:RevisionId){return this.revisions.has(id);}assertHead(id:RevisionId){if(id!==this.h)throw new Error('stale transaction');}
 publish(base:RevisionId,tx:TransactionId,root:T,command:Command,at:number){this.assertHead(base);const id=revisionId(this.next++),cmd=Object.freeze({...command,operations:Object.freeze([...command.operations])});const r=Object.freeze({id,parentIds:Object.freeze([this.h]),transactionId:tx,root,command:cmd,committedAt:at}) as Revision<T>;this.revisions.set(id,r);this.h=id;this.redoIds=[];return r;}
 undo(){const p=this.current.parentIds[0];if(p===undefined)return this.current;this.redoIds.push(this.h);this.h=p;return this.current;}redo(){const n=this.redoIds.pop();if(n===undefined)return this.current;this.h=n;return this.current;}
}
