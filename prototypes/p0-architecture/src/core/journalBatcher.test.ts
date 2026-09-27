import { describe, expect, it } from 'vitest';
import { JournalBatcher } from './journalBatcher';

describe('JournalBatcher', () => {
  it('signals when the configured byte threshold is reached', () => {
    const batcher = new JournalBatcher(10);
    expect(batcher.push(new Uint8Array(4))).toBe(false);
    expect(batcher.push(new Uint8Array(6))).toBe(true);
    expect(batcher.recordCount).toBe(2);
    expect(batcher.take()?.byteLength).toBe(10);
    expect(batcher.recordCount).toBe(0);
  });
});
