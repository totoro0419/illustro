import { JournalBatcher } from '../core/journalBatcher';
import { encodePrototypeJournalFrame } from '../core/journalFrame';

type ConfigureMessage = Readonly<{ type: 'configure'; maxBatchBytes: number; batchDelayMs: number }>;
type AppendMessage = Readonly<{ type: 'append'; bytes: Uint8Array; sequence: number }>;
type FlushMessage = Readonly<{ type: 'flush' }>;
type ResetMessage = Readonly<{ type: 'reset' }>;
type CloseMessage = Readonly<{ type: 'close' }>;
type Incoming = ConfigureMessage | AppendMessage | FlushMessage | ResetMessage | CloseMessage;

type SyncHandleCapableFile = FileSystemFileHandle & {
  createSyncAccessHandle?: () => Promise<FileSystemSyncAccessHandle>;
};

let batcher: JournalBatcher | null = null;
let batchDelayMs = 0;
let pendingSequences: number[] = [];
let flushTimer: number | null = null;
let flushChain: Promise<void> = Promise.resolve();
let accessHandle: FileSystemSyncAccessHandle | null = null;
let writeOffset = 0;
let fallbackBatches: Uint8Array[] = [];

async function openSyncHandle(): Promise<FileSystemSyncAccessHandle | null> {
  if (accessHandle) return accessHandle;
  const storage = navigator.storage as StorageManager & { getDirectory?: () => Promise<FileSystemDirectoryHandle> };
  if (!storage.getDirectory) return null;
  const root = await storage.getDirectory();
  const handle = await root.getFileHandle('illustro-p0-journal.bin', { create: true });
  const sync = await (handle as SyncHandleCapableFile).createSyncAccessHandle?.();
  if (!sync) return null;
  accessHandle = sync;
  writeOffset = sync.getSize();
  return sync;
}

function clearFlushTimer(): void {
  if (flushTimer === null) return;
  clearTimeout(flushTimer);
  flushTimer = null;
}

function requestFlush(): void {
  clearFlushTimer();
  flushChain = flushChain.then(flushPending, flushPending);
}

function scheduleFlush(): void {
  if (flushTimer !== null || !batcher || batcher.recordCount === 0) return;
  flushTimer = self.setTimeout(requestFlush, batchDelayMs);
}

async function flushPending(): Promise<void> {
  const localBatcher = batcher;
  if (!localBatcher) return;
  const batch = localBatcher.take();
  if (!batch) return;
  const sequences = pendingSequences;
  pendingSequences = [];
  const started = performance.now();

  try {
    const sync = await openSyncHandle();
    let backend: 'opfs-sync-access' | 'memory-fallback';
    if (sync) {
      const written = sync.write(batch, { at: writeOffset });
      if (written !== batch.byteLength) throw new Error(`short OPFS write: ${written}/${batch.byteLength}`);
      writeOffset += written;
      sync.flush();
      backend = 'opfs-sync-access';
    } else {
      fallbackBatches.push(batch.slice());
      backend = 'memory-fallback';
    }

    self.postMessage({
      type: 'batch-done',
      sequences,
      records: sequences.length,
      bytes: batch.byteLength,
      backend,
      duration: performance.now() - started,
    });
  } catch (error) {
    self.postMessage({
      type: 'batch-error',
      sequences,
      message: String(error),
      duration: performance.now() - started,
    });
  }
}

async function resetStore(): Promise<void> {
  requestFlush();
  await flushChain;
  clearFlushTimer();
  pendingSequences = [];
  batcher = null;
  fallbackBatches = [];
  if (accessHandle) {
    accessHandle.truncate(0);
    accessHandle.flush();
    accessHandle.close();
    accessHandle = null;
  }
  writeOffset = 0;
  self.postMessage({ type: 'reset-done' });
}

self.onmessage = (event: MessageEvent<Incoming>) => {
  const message = event.data;
  if (message.type === 'configure') {
    if (!Number.isInteger(message.maxBatchBytes) || message.maxBatchBytes <= 0) {
      self.postMessage({ type: 'configure-error', message: 'invalid maxBatchBytes' });
      return;
    }
    if (!Number.isFinite(message.batchDelayMs) || message.batchDelayMs < 0) {
      self.postMessage({ type: 'configure-error', message: 'invalid batchDelayMs' });
      return;
    }
    if (batcher?.recordCount) requestFlush();
    batcher = new JournalBatcher(message.maxBatchBytes);
    batchDelayMs = message.batchDelayMs;
    self.postMessage({ type: 'configured', maxBatchBytes: message.maxBatchBytes, batchDelayMs: message.batchDelayMs });
    return;
  }

  if (message.type === 'append') {
    if (!batcher) {
      self.postMessage({ type: 'batch-error', sequences: [message.sequence], message: 'persistence worker is not configured' });
      return;
    }
    try {
      const frame = encodePrototypeJournalFrame(message.sequence, message.bytes);
      pendingSequences.push(message.sequence);
      if (batcher.push(frame)) requestFlush();
      else scheduleFlush();
    } catch (error) {
      self.postMessage({ type: 'batch-error', sequences: [message.sequence], message: String(error) });
    }
    return;
  }

  if (message.type === 'flush') {
    requestFlush();
    return;
  }

  if (message.type === 'reset') {
    void resetStore();
    return;
  }

  if (message.type === 'close') {
    requestFlush();
    void flushChain.then(() => {
      accessHandle?.close();
      accessHandle = null;
      self.postMessage({ type: 'closed' });
    });
  }
};
