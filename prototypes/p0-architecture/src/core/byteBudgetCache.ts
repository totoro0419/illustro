export type CacheEntry<V> = {
  readonly value: V;
  readonly bytes: number;
  pinned: boolean;
  lastUse: number;
};

export class ByteBudgetLru<K, V> {
  #budgetBytes: number;
  #clock = 0;
  readonly #entries = new Map<K, CacheEntry<V>>();
  #usedBytes = 0;

  constructor(budgetBytes: number) {
    if (!Number.isFinite(budgetBytes) || budgetBytes < 0) throw new Error('budgetBytes must be >= 0');
    this.#budgetBytes = budgetBytes;
  }

  get usedBytes(): number {
    return this.#usedBytes;
  }

  get size(): number {
    return this.#entries.size;
  }

  setBudget(bytes: number): void {
    if (!Number.isFinite(bytes) || bytes < 0) throw new Error('budgetBytes must be >= 0');
    this.#budgetBytes = bytes;
    this.evictToBudget();
  }

  set(key: K, value: V, bytes: number, pinned = false): boolean {
    if (!Number.isFinite(bytes) || bytes < 0) throw new Error('entry bytes must be >= 0');
    const existing = this.#entries.get(key);
    if (existing) this.#usedBytes -= existing.bytes;
    this.#entries.set(key, { value, bytes, pinned, lastUse: ++this.#clock });
    this.#usedBytes += bytes;
    this.evictToBudget();
    return this.#entries.has(key);
  }

  get(key: K): V | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    entry.lastUse = ++this.#clock;
    return entry.value;
  }

  pin(key: K, pinned = true): void {
    const entry = this.#entries.get(key);
    if (!entry) return;
    entry.pinned = pinned;
    entry.lastUse = ++this.#clock;
    if (!pinned) this.evictToBudget();
  }

  has(key: K): boolean {
    return this.#entries.has(key);
  }

  private evictToBudget(): void {
    while (this.#usedBytes > this.#budgetBytes) {
      let victimKey: K | undefined;
      let oldest = Number.POSITIVE_INFINITY;
      for (const [key, entry] of this.#entries) {
        if (entry.pinned) continue;
        if (entry.lastUse < oldest) {
          oldest = entry.lastUse;
          victimKey = key;
        }
      }
      if (victimKey === undefined) break;
      const victim = this.#entries.get(victimKey);
      if (!victim) break;
      this.#entries.delete(victimKey);
      this.#usedBytes -= victim.bytes;
    }
  }
}
