import { describe, expect, it } from 'vitest';
import { ByteBudgetLru } from './byteBudgetCache';

describe('ByteBudgetLru', () => {
  it('evicts the least recently used unpinned entry', () => {
    const cache = new ByteBudgetLru<string, string>(20);
    cache.set('a', 'a', 10);
    cache.set('b', 'b', 10);
    cache.get('a');
    cache.set('c', 'c', 10);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('c')).toBe(true);
  });

  it('never evicts pinned entries to satisfy a derived-cache budget', () => {
    const cache = new ByteBudgetLru<string, string>(10);
    cache.set('canonical', 'x', 10, true);
    cache.set('derived', 'y', 10);
    expect(cache.has('canonical')).toBe(true);
    expect(cache.has('derived')).toBe(false);
  });
});
