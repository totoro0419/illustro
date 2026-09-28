import { revisionId,type RevisionId,type TransactionId } from './ids';

export type Command=Readonly<{label:string;operations:readonly string[]}>;
export type Revision<T>=Readonly<{
  id:RevisionId;parent:RevisionId|null;transactionId:TransactionId|null;
  root:T;command:Command|null;committedAt:number;
}>;

export class RevisionHistory<T>{
  readonly revisions=new Map<RevisionId,Revision<T>>();
  head:RevisionId=revisionId(0);next=1;redoStack:RevisionId[]=[];
  constructor(root:T,at=0){this.revisions.set(this.head,{id:this.head,parent:null,transactionId:null,root,command:null,committedAt:at});}
  get current(){const r=this.revisions.get(this.head);if(!r)throw new Error('missing revision');return r;}
  has(id:RevisionId){return this.revisions.has(id);}
  assertHead(id:RevisionId){if(id!==this.head)throw new Error('stale transaction');}
  publish(base:RevisionId,tx:TransactionId,root:T,command:Command,at:number){
    this.assertHead(base);const id=revisionId(this.next++);
    const r={id,parent:this.head,transactionId:tx,root,command,committedAt:at} as Revision<T>;
    this.revisions.set(id,r);this.head=id;this.redoStack=[];return r;
  }
  undo(){const p=this.current.parent;if(p===null)return this.current;this.redoStack.push(this.head);this.head=p;return this.current;}
  redo(){const n=this.redoStack.pop();if(n===undefined)return this.current;this.head=n;return this.current;}
}
