import { describe, expect, it } from 'vitest';
import { ActivePointerGate } from './activePointer';

describe('ActivePointerGate', () => {
  it('ignores pointer movement before an explicit begin', () => {
    const gate = new ActivePointerGate();
    expect(gate.accepts(7)).toBe(false);
  });

  it('owns exactly one pointer until it ends', () => {
    const gate = new ActivePointerGate();
    expect(gate.begin(7)).toBe(true);
    expect(gate.begin(8)).toBe(false);
    expect(gate.accepts(7)).toBe(true);
    expect(gate.accepts(8)).toBe(false);
    expect(gate.end(8)).toBe(false);
    expect(gate.end(7)).toBe(true);
    expect(gate.activePointerId).toBeNull();
  });
});
