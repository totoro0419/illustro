import { pageIndex } from './hash';

export class PagedMap<K extends string,V>{
  readonly #pages:ReadonlyMap<number,ReadonlyMap<K,V>>;readonly size:number;
  constructor(pages:ReadonlyMap<number,ReadonlyMap<K,V>>=new Map(),size=0){
    this.#pages=pages;this.size=size;Object.freeze(this);
  }
  static empty<K extends string,V>(){return new PagedMap<K,V>();}
  get(key:K){return this.#pages.get(pageIndex(key))?.get(key);}
  entries():readonly (readonly [K,V])[]{
    const values:Array<readonly [K,V]>=[];for(const page of this.#pages.values())for(const entry of page)values.push(entry);
    values.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);return Object.freeze(values);
  }
  keys():readonly K[]{return Object.freeze(this.entries().map(([key])=>key));}
  edit(){return new PagedMapEdit(this);}
  _copyPage(i:number){return new Map(this.#pages.get(i)??[]);}
  _with(changed:ReadonlyMap<number,ReadonlyMap<K,V>>,size:number){
    const pages=new Map(this.#pages);for(const [i,p] of changed)pages.set(i,p);
    return new PagedMap<K,V>(pages,size);
  }
}
export class PagedMapEdit<K extends string,V>{
  readonly #changed=new Map<number,Map<K,V>>();#count:number;
  constructor(readonly base:PagedMap<K,V>){this.#count=base.size;}
  set(key:K,value:V){
    const i=pageIndex(key);let p=this.#changed.get(i);
    if(!p){p=this.base._copyPage(i);this.#changed.set(i,p);}
    if(!p.has(key))this.#count++;p.set(key,value);
  }
  commit(){return this.#changed.size?this.base._with(this.#changed,this.#count):this.base;}
}
