export class JournalBatcher {
  readonly maxBatchBytes: number;
  #parts: Uint8Array[] = [];
  #bytes = 0;

  constructor(maxBatchBytes: number) {
    if (!Number.isInteger(maxBatchBytes) || maxBatchBytes <= 0) throw new Error('maxBatchBytes must be a positive integer');
    this.maxBatchBytes = maxBatchBytes;
  }

  get byteLength(): number {
    return this.#bytes;
  }

  get recordCount(): number {
    return this.#parts.length;
  }

  push(frame: Uint8Array): boolean {
    this.#parts.push(frame);
    this.#bytes += frame.byteLength;
    return this.#bytes >= this.maxBatchBytes;
  }

  take(): Uint8Array | null {
    if (this.#parts.length === 0) return null;
    const batch = new Uint8Array(this.#bytes);
    let offset = 0;
    for (const part of this.#parts) {
      batch.set(part, offset);
      offset += part.byteLength;
    }
    this.#parts = [];
    this.#bytes = 0;
    return batch;
  }
}
