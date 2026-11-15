type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type DocumentId = Brand<string, 'DocumentId'>;
export type LayerId = Brand<string, 'LayerId'>;
export type RasterSurfaceId = Brand<string, 'RasterSurfaceId'>;
export type TransactionId = Brand<string, 'TransactionId'>;
export type RevisionId = Brand<string, 'RevisionId'>;
export type WriterEpochId = Brand<string, 'WriterEpochId'>;
export type BlockId = Brand<string, 'BlockId'>;
export type ResourceId = Brand<string, 'ResourceId'>;
export type RuntimeBlockHandle = Brand<number, 'RuntimeBlockHandle'>;

export type OperationKey = Readonly<{transactionId:TransactionId;operationOrdinal:number}>;

export interface IdFactory {
  document():DocumentId;
  layer():LayerId;
  surface():RasterSurfaceId;
  transaction():TransactionId;
  revision():RevisionId;
  writerEpoch():WriterEpochId;
  block():BlockId;
  resource():ResourceId;
}

type CryptoLike={randomUUID?:()=>string};
function randomUuid():string{
  const cryptoLike=(globalThis as {crypto?:CryptoLike}).crypto;
  if(!cryptoLike?.randomUUID)throw new Error('crypto.randomUUID is required unless a custom IdFactory is supplied');
  return cryptoLike.randomUUID();
}
const uuid=<T extends string>()=>randomUuid() as T;
export const cryptoIdFactory:IdFactory={
  document:()=>uuid<DocumentId>(),layer:()=>uuid<LayerId>(),surface:()=>uuid<RasterSurfaceId>(),
  transaction:()=>uuid<TransactionId>(),revision:()=>uuid<RevisionId>(),writerEpoch:()=>uuid<WriterEpochId>(),
  block:()=>uuid<BlockId>(),resource:()=>uuid<ResourceId>(),
};

export function createDeterministicIdFactory(_prefix='test'):IdFactory{
  let sequence=1;
  const next=()=>`00000000-0000-4000-8000-${(sequence++).toString(16).padStart(12,'0')}`;
  return {
    document:()=>next() as DocumentId,layer:()=>next() as LayerId,surface:()=>next() as RasterSurfaceId,
    transaction:()=>next() as TransactionId,revision:()=>next() as RevisionId,writerEpoch:()=>next() as WriterEpochId,
    block:()=>next() as BlockId,resource:()=>next() as ResourceId,
  };
}

export function operationKey(transactionId:TransactionId,operationOrdinal:number):OperationKey{
  if(!Number.isSafeInteger(operationOrdinal)||operationOrdinal<0||operationOrdinal>0xffffffff)throw new Error('invalid operation ordinal');
  return Object.freeze({transactionId,operationOrdinal});
}

export function runtimeBlockHandle(value:number):RuntimeBlockHandle{
  if(!Number.isSafeInteger(value)||value<=0)throw new Error('runtime block handle must be a positive safe integer');
  return value as RuntimeBlockHandle;
}
