export class PagedMap<K extends string, V> {
  private readonly map: ReadonlyMap<K, V>;
  constructor(map: ReadonlyMap<K, V> = new Map()) { this.map = map; }
  get(key: K): V | undefined { return this.map.get(key); }
  set(key: K, value: V): PagedMap<K, V> { const next = new Map(this.map); next.set(key, value); return new PagedMap(next); }
}
