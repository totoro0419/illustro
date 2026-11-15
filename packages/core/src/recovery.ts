import type {BlockId,DocumentId,OperationKey,ResourceId,RevisionId,TransactionId,WriterEpochId} from './ids';
import type {CommitStamp} from './history';
export type DocumentRootRef=Readonly<{documentId:DocumentId;revisionId:RevisionId}>;
export type PersistenceHandoff=Readonly<{
  schemaVersion:2;commitStamp:CommitStamp;transactionId:TransactionId;parentRevisionIds:readonly RevisionId[];resultRevisionId:RevisionId;
  documentRootRef:DocumentRootRef;semanticOperationRefs:readonly OperationKey[];requiredBlockIds:readonly BlockId[];requiredResourceIds:readonly ResourceId[];
  requiredAlgorithmVersionRefs:readonly string[];closureState:'pending';
}>;
export class ProtectionTracker{
  private readonly verified=new Set<bigint>();protectedThrough=0n;
  constructor(readonly writerEpochId:WriterEpochId){}
  acknowledge(stamp:CommitStamp,closureVerified:boolean){if(stamp.writerEpochId!==this.writerEpochId)throw new Error('writer epoch mismatch');
    if(stamp.commitSequence<=0n)throw new Error('invalid commit sequence');if(closureVerified)this.verified.add(stamp.commitSequence);
    while(this.verified.delete(this.protectedThrough+1n))this.protectedThrough++;return this.protectedThrough;}
}
