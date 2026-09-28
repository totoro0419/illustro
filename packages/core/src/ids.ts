type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type DocumentId = Brand<string, 'DocumentId'>;
export type LayerId = Brand<string, 'LayerId'>;
export type TransactionId = Brand<string, 'TransactionId'>;
export type RevisionId = Brand<number, 'RevisionId'>;
export type BlockId = Brand<number, 'BlockId'>;

export interface IdFactory {
  document(): DocumentId;
  layer(): LayerId;
  transaction(): TransactionId;
}

type CryptoLike = {
  randomUUID?: () => string;
};

function randomUuid(): string {
  const cryptoLike = (globalThis as { crypto?: CryptoLike }).crypto;
  if (!cryptoLike?.randomUUID) {
    throw new Error('crypto.randomUUID is required unless a custom IdFactory is supplied');
  }
  return cryptoLike.randomUUID();
}

export const cryptoIdFactory: IdFactory = {
  document: () => randomUuid() as DocumentId,
  layer: () => randomUuid() as LayerId,
  transaction: () => randomUuid() as TransactionId,
};

export function createDeterministicIdFactory(prefix = 'test'): IdFactory {
  let documentSequence = 0;
  let layerSequence = 0;
  let transactionSequence = 0;

  return {
    document: () => (prefix + ':document:' + documentSequence++) as DocumentId,
    layer: () => (prefix + ':layer:' + layerSequence++) as LayerId,
    transaction: () => (prefix + ':transaction:' + transactionSequence++) as TransactionId,
  };
}

export function revisionId(value: number): RevisionId {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('revision id must be a non-negative safe integer');
  return value as RevisionId;
}

export function blockId(value: number): BlockId {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('block id must be a positive safe integer');
  return value as BlockId;
}
