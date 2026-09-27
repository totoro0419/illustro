import { JournalBatcher } from '../core/journalBatcher';
import { encodePrototypeJournalFrame, scanPrototypeJournal } from '../core/journalFrame';

type ConfigureMessage = Readonly<{ type: 'configure'; maxBatchBytes: number; batchDelayMs: number }>;
type AppendMessage = Readonly<{ type: 'append'; bytes: Uint8Array; sequence: number }>;
type FlushMessage = Readonly<{ type: 'flush' }>;
type ResetMessage = Readonly<{ type: 'reset'; requestId: number }>;
type InspectMessage = Readonly<{ type: 'inspect'; requestId: number }>;
type InjectTornFrameMessage = Readonly<{ type: 'inject-torn-frame'; requestId: number; sequence: number; payloadBytes: number; keepBytes: number }>;
type CloseMessage = Readonly<{ type: 'close'; requestId: number }>;
type Incoming = ConfigureMessage | AppendMessage | FlushMessage | ResetMessage | InspectMessage | InjectTornFrameMessage | CloseMessage;

type Backend = 'opfs-sync-access' | 'memory-fallback';

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
let lastBackend: Backend | null = null;
let lastRepair: Readonly<{ validBytes: number; tailBytes: number; issue: string | null }> | null = null;

async function openSyncHandle(): Promise<FileSystemSyncAccessHandle | null> {
  if (accessHandle) return accessHandle;
  const storage = navigator.storage as StorageManager & { getDirectory?: () => Promise<FileSystemDirectoryHandle> };
  if (!storage.getDirectory) return null;
  const root = await storage.getDirectory();
  const handle = await root.getFileHandle('illustro-p0-journal.bin', { create: true });
  const sync = await (handle as SyncHandleCapableFile).createSyncAccessHandle?.();
  if (!sync) return null;
  accessHandle = sync;
  writeOffset = repairInvalidTail(sync);
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
    let backend: Backend;
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
    lastBackend = backend;

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

async function resetStore(requestId: number): Promise<void> {
  requestFlush();
  await flushChain;
  clearFlushTimer();
  pendingSequences = [];
  batcher = null;
  fallbackBatches = [];
  lastRepair = null;

  const sync = accessHandle ?? await openSyncHandle();
  if (sync) {
    sync.truncate(0);
    sync.flush();
    writeOffset = 0;
    lastBackend = 'opfs-sync-access';
  } else {
    lastBackend = 'memory-fallback';
  }

  self.postMessage({ type: 'reset-done', requestId, backend: lastBackend });
}

async function inspectStore(requestId: number): Promise<void> {
  requestFlush();
  await flushChain;

  let bytes: Uint8Array;
  const sync = accessHandle ?? await openSyncHandle();
  let backend: Backend;
  if (sync) {
    const size = sync.getSize();
    bytes = new Uint8Array(size);
    if (size > 0) {
      const read = sync.read(bytes, { at: 0 });
      if (read !== size) throw new Error(`short OPFS read: ${read}/${size}`);
    }
    backend = 'opfs-sync-access';
  } else {
    bytes = concatBytes(fallbackBatches);
    backend = 'memory-fallback';
  }
  lastBackend = backend;

  const scan = scanPrototypeJournal(bytes, {
    maxPayloadBytes: 16 * 1024 * 1024,
    maxFrames: 100_000,
  });

  self.postMessage({
    type: 'inspect-done',
    requestId,
    backend,
    size: bytes.byteLength,
    frameCount: scan.frames.length,
    sequences: scan.frames.map((frame) => frame.sequence),
    validBytes: scan.validBytes,
    tailBytes: scan.tailBytes,
    issue: scan.issue,
    repair: lastRepair,
  });
}

async function injectTornFrame(message: InjectTornFrameMessage): Promise<void> {
  requestFlush();
  await flushChain;

  const payload = new Uint8Array(message.payloadBytes);
  payload.fill(0x5a);
  const full = encodePrototypeJournalFrame(message.sequence, payload);
  const keepBytes = Math.max(1, Math.min(message.keepBytes, full.byteLength - 1));
  const partial = full.slice(0, keepBytes);

  const sync = accessHandle ?? await openSyncHandle();
  let backend: Backend;
  if (sync) {
    const written = sync.write(partial, { at: writeOffset });
    if (written !== partial.byteLength) throw new Error(`short torn-tail write: ${written}/${partial.byteLength}`);
    writeOffset += written;
    sync.flush();
    backend = 'opfs-sync-access';
  } else {
    fallbackBatches.push(partial);
    backend = 'memory-fallback';
  }
  lastBackend = backend;
  self.postMessage({ type: 'inject-torn-done', requestId: message.requestId, backend, bytes: partial.byteLength });
}

async function closeStore(requestId: number): Promise<void> {
  requestFlush();
  await flushChain;
  accessHandle?.close();
  accessHandle = null;
  self.postMessage({ type: 'closed', requestId, backend: lastBackend });
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
    void resetStore(message.requestId).catch((error) => self.postMessage({ type: 'control-error', requestId: message.requestId, message: String(error) }));
    return;
  }

  if (message.type === 'inspect') {
    void inspectStore(message.requestId).catch((error) => self.postMessage({ type: 'control-error', requestId: message.requestId, message: String(error) }));
    return;
  }

  if (message.type === 'inject-torn-frame') {
    void injectTornFrame(message).catch((error) => self.postMessage({ type: 'control-error', requestId: message.requestId, message: String(error) }));
    return;
  }

  if (message.type === 'close') {
    void closeStore(message.requestId).catch((error) => self.postMessage({ type: 'control-error', requestId: message.requestId, message: String(error) }));
  }
};

function repairInvalidTail(sync: FileSystemSyncAccessHandle): number {
  const size = sync.getSize();
  if (size <= 0) {
    lastRepair = null;
    return 0;
  }

  const bytes = new Uint8Array(size);
  const read = sync.read(bytes, { at: 0 });
  if (read !== size) throw new Error(`short OPFS recovery read: ${read}/${size}`);

  const scan = scanPrototypeJournal(bytes, {
    maxPayloadBytes: 16 * 1024 * 1024,
    maxFrames: 100_000,
  });

  if (scan.tailBytes > 0 || scan.issue !== null) {
    sync.truncate(scan.validBytes);
    sync.flush();
    lastRepair = {
      validBytes: scan.validBytes,
      tailBytes: scan.tailBytes,
      issue: scan.issue,
    };
    return scan.validBytes;
  }

  lastRepair = null;
  return size;
}

function concatBytes(parts: ReadonlyArray<Uint8Array>): Uint8Array {
  let total = 0;
  for (const part of parts) total += part.byteLength;
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}
