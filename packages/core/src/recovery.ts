import type { BlockId,RevisionId,TransactionId } from './ids';
export type PersistenceHandoff=Readonly<{
  revisionId:RevisionId;parentRevisionId:RevisionId;transactionId:TransactionId;
  changedBlockIds:readonly BlockId[];
}>;
export class RecoveryState{
  latest:RevisionId|null=null;
  mark(id:RevisionId){if(this.latest===null||id>this.latest)this.latest=id;return this.latest;}
}
