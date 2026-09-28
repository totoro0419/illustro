export class PagedMap<K extends string,V>{
  constructor(readonly map:ReadonlyMap<K,V>=new Map()){}
  static empty<K extends string,V>(){return new PagedMap<K,V>();}
  get(key:K){return this.map.get(key);}
  set(key:K,value:V){const next=new Map(this.map);next.set(key,value);return new PagedMap<K,V>(next);}
}
