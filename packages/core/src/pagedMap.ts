import { pageIndex } from './hash';

export class PagedMap<K extends string,V>{
  constructor(
    readonly pages:ReadonlyMap<number,ReadonlyMap<K,V>>=new Map(),
    readonly size=0,
  ){}
  static empty<K extends string,V>(){return new PagedMap<K,V>();}
  get(key:K){return this.pages.get(pageIndex(key))?.get(key);}
  edit(){return new PagedMapEdit(this);}
}
export class PagedMapEdit<K extends string,V>{
  readonly base:PagedMap<K,V>;
  readonly changed=new Map<number,Map<K,V>>();
  count:number;
  constructor(base:PagedMap<K,V>){this.base=base;this.count=base.size;}
  set(key:K,value:V){
    const i=pageIndex(key);
    let p=this.changed.get(i);
    if(!p){p=new Map(this.base.pages.get(i)??[]);this.changed.set(i,p);}
    if(!p.has(key))this.count++;
    p.set(key,value);
  }
  commit(){
    if(!this.changed.size)return this.base;
    const pages=new Map(this.base.pages);
    for(const [i,p] of this.changed)pages.set(i,p);
    return new PagedMap<K,V>(pages,this.count);
  }
}
