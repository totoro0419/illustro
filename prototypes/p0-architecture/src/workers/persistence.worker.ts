type AppendMessage = Readonly<{ type: 'append'; bytes: Uint8Array; sequence: number }>;
type ResetMessage = Readonly<{ type: 'reset' }>;
type Incoming = AppendMessage | ResetMessage;

let fallback: Uint8Array[] = [];

async function opfsRoot(): Promise<FileSystemDirectoryHandle | null> {
  const storage = navigator.storage as StorageManager & { getDirectory?: () => Promise<FileSystemDirectoryHandle> };
  if (!storage.getDirectory) return null;
  return storage.getDirectory();
}

async function appendOpfs(bytes: Uint8Array): Promise<number | null> {
  const root = await opfsRoot();
  if (!root) return null;
  const handle = await root.getFileHandle('illustro-p0-journal.bin', { create: true });
  const syncHandle = await (handle as FileSystemFileHandle & {
    createSyncAccessHandle?: () => Promise<FileSystemSyncAccessHandle>;
  }).createSyncAccessHandle?.();
  if (!syncHandle) return null;
  try {
    const offset = syncHandle.getSize();
    const written = syncHandle.write(bytes, { at: offset });
    syncHandle.flush();
    return written;
  } finally {
    syncHandle.close();
  }
}

self.onmessage = async (event: MessageEvent<Incoming>) => {
  const message = event.data;
  if (message.type === 'reset') {
    fallback = [];
    self.postMessage({ type: 'reset-done' });
    return;
  }
  const start = performance.now();
  try {
    const written = await appendOpfs(message.bytes);
    if (written === null) {
      fallback.push(message.bytes.slice());
      self.postMessage({
        type: 'append-done',
        sequence: message.sequence,
        backend: 'memory-fallback',
        bytes: message.bytes.byteLength,
        duration: performance.now() - start,
      });
    } else {
      self.postMessage({
        type: 'append-done',
        sequence: message.sequence,
        backend: 'opfs-sync-access',
        bytes: written,
        duration: performance.now() - start,
      });
    }
  } catch (error) {
    self.postMessage({ type: 'append-error', sequence: message.sequence, message: String(error) });
  }
};
