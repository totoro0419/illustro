const HEADER_MAGIC = 0x30504a49; // ASCII IJP0, prototype-only
const TRAILER_MAGIC = 0x454e4f44; // ASCII DONE, prototype-only
const VERSION = 1;
const HEADER_BYTES = 16;
const TRAILER_BYTES = 12;

export type PrototypeJournalFrame = Readonly<{
  sequence: number;
  payload: Uint8Array;
  byteLength: number;
}>;

export type JournalScanLimits = Readonly<{
  maxPayloadBytes: number;
  maxFrames: number;
}>;

export type JournalScanResult = Readonly<{
  frames: PrototypeJournalFrame[];
  validBytes: number;
  tailBytes: number;
  issue: null | 'invalid-header' | 'unsupported-version' | 'payload-too-large' | 'truncated-frame' | 'invalid-trailer' | 'frame-limit';
}>;

export function encodePrototypeJournalFrame(sequence: number, payload: Uint8Array): Uint8Array {
  if (!Number.isSafeInteger(sequence) || sequence < 0 || sequence > 0xffff_ffff) {
    throw new Error('prototype journal sequence must fit uint32');
  }
  if (payload.byteLength > 0xffff_ffff) throw new Error('prototype payload is too large');

  const total = HEADER_BYTES + payload.byteLength + TRAILER_BYTES;
  const bytes = new Uint8Array(total);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, HEADER_MAGIC, true);
  view.setUint16(4, VERSION, true);
  view.setUint16(6, HEADER_BYTES, true);
  view.setUint32(8, sequence, true);
  view.setUint32(12, payload.byteLength, true);
  bytes.set(payload, HEADER_BYTES);
  const trailer = HEADER_BYTES + payload.byteLength;
  view.setUint32(trailer, TRAILER_MAGIC, true);
  view.setUint32(trailer + 4, sequence, true);
  view.setUint32(trailer + 8, total, true);
  return bytes;
}

export function scanPrototypeJournal(bytes: Uint8Array, limits: JournalScanLimits): JournalScanResult {
  if (!Number.isFinite(limits.maxPayloadBytes) || limits.maxPayloadBytes < 0) throw new Error('invalid maxPayloadBytes');
  if (!Number.isInteger(limits.maxFrames) || limits.maxFrames <= 0) throw new Error('invalid maxFrames');

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const frames: PrototypeJournalFrame[] = [];
  let offset = 0;

  while (offset < bytes.byteLength) {
    if (frames.length >= limits.maxFrames) return finish('frame-limit');
    if (bytes.byteLength - offset < HEADER_BYTES) return finish('truncated-frame');
    if (view.getUint32(offset, true) !== HEADER_MAGIC || view.getUint16(offset + 6, true) !== HEADER_BYTES) {
      return finish('invalid-header');
    }
    if (view.getUint16(offset + 4, true) !== VERSION) return finish('unsupported-version');

    const sequence = view.getUint32(offset + 8, true);
    const payloadLength = view.getUint32(offset + 12, true);
    if (payloadLength > limits.maxPayloadBytes) return finish('payload-too-large');

    const total = HEADER_BYTES + payloadLength + TRAILER_BYTES;
    if (bytes.byteLength - offset < total) return finish('truncated-frame');

    const trailer = offset + HEADER_BYTES + payloadLength;
    if (
      view.getUint32(trailer, true) !== TRAILER_MAGIC ||
      view.getUint32(trailer + 4, true) !== sequence ||
      view.getUint32(trailer + 8, true) !== total
    ) {
      return finish('invalid-trailer');
    }

    const payloadStart = offset + HEADER_BYTES;
    const payload = bytes.slice(payloadStart, payloadStart + payloadLength);
    frames.push({ sequence, payload, byteLength: total });
    offset += total;
  }

  return finish(null);

  function finish(issue: JournalScanResult['issue']): JournalScanResult {
    return {
      frames,
      validBytes: offset,
      tailBytes: bytes.byteLength - offset,
      issue,
    };
  }
}
