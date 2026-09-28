import { revisionId,type RevisionId,type TransactionId } from './ids';

export type Command=Readonly<{label:string;operations:readonly string[]}>;
export type Revision<T>=Readonly<{
  id:RevisionId;parentIds:readonly RevisionId[];transactionId:TransactionId|null;
  root:T;command:Command|null;committedAt:number;
}>;

export class RevisionHistory<T>{
  private readonly revisions=new Map<RevisionId,Revision<T>>();
  private headValue:RevisionId=revisionId(0);private next=1;private redoStack:RevisionId[]=[];
  constructor(root:T,at=0){this.revisions.set(this.headValue,{id:this.headValue,parentIds:[],transactionId:null,root,command:null,committedAt:at});}
  get head(){return this.headValue;} get current(){const r=this.revisions.get(this.headValue);if(!r)throw new Error('missing revision');return r;}
  get count(){return this.revisions.size;} has(id:RevisionId){return this.revisions.has(id);}
  assertHead(id:RevisionId){if(id!==this.headValue)throw new Error('stale transaction');}
  publish(base:RevisionId,tx:TransactionId,root:T,command:Command,at:number){
    this.assertHead(base);const id=revisionId(this.next++);
    const r={id,parentIds:[this.headValue],transactionId:tx,root,command,committedAt:at} as Revision<T>;
    this.revisions.set(id,r);this.headValue=id;this.redoStack=[];return r;
  }
  undo(){const p=this.current.parentIds[0];if(p===undefined)return this.current;this.redoStack.push(this.headValue);this.headValue=p;return this.current;}
  redo(){const n=this.redoStack.pop();if(n===undefined)return this.current;this.headValue=n;return this.current;}
}
