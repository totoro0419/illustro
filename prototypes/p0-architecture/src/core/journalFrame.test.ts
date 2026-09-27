import { describe, expect, it } from 'vitest';
import { encodePrototypeJournalFrame, scanPrototypeJournal } from './journalFrame';

const limits = { maxPayloadBytes: 1024 * 1024, maxFrames: 1000 };

describe('prototype journal framing', () => {
  it('round-trips complete frames in order', () => {
    const a = encodePrototypeJournalFrame(1, new Uint8Array([1, 2, 3]));
    const b = encodePrototypeJournalFrame(2, new Uint8Array([4, 5]));
    const bytes = new Uint8Array(a.byteLength + b.byteLength);
    bytes.set(a, 0); bytes.set(b, a.byteLength);
    const scan = scanPrototypeJournal(bytes, limits);
    expect(scan.issue).toBeNull();
    expect(scan.frames.map((frame) => frame.sequence)).toEqual([1, 2]);
    expect(scan.validBytes).toBe(bytes.byteLength);
  });

  it('never accepts a torn second frame', () => {
    const a = encodePrototypeJournalFrame(1, new Uint8Array([1, 2, 3]));
    const b = encodePrototypeJournalFrame(2, new Uint8Array(64).fill(9));
    const full = new Uint8Array(a.byteLength + b.byteLength);
    full.set(a, 0); full.set(b, a.byteLength);
    for (let cut = a.byteLength; cut < full.byteLength; cut += 1) {
      const scan = scanPrototypeJournal(full.slice(0, cut), limits);
      expect(scan.frames.map((frame) => frame.sequence)).toEqual([1]);
      expect(scan.validBytes).toBe(a.byteLength);
    }
  });

  it('stops at a bad trailer instead of searching later magic', () => {
    const frame = encodePrototypeJournalFrame(7, new Uint8Array([7, 7, 7]));
    const trailerIndex = frame.length - 12;
    frame[trailerIndex] = (frame[trailerIndex] ?? 0) ^ 0xff;
    const scan = scanPrototypeJournal(frame, limits);
    expect(scan.frames).toHaveLength(0);
    expect(scan.issue).toBe('invalid-trailer');
  });
});
