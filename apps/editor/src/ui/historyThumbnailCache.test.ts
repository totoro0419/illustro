import {describe,expect,it} from 'vitest';
import {HistoryThumbnailCache} from './historyThumbnailCache';

describe('C03-007 history preview render deduplication',()=>{
  it('shares the same in-flight render even after the completed LRU fills',async()=>{
    const cache=new HistoryThumbnailCache<number,string>(2);
    let resolve!: (value:string)=>void;
    let renders=0;
    const first=cache.get(1,()=>{renders++;return new Promise<string>(done=>{resolve=done;});});
    await Promise.resolve();
    await cache.get(2,async()=> 'two');
    await cache.get(3,async()=> 'three');
    const same=cache.get(1,async()=>{renders++;return 'duplicate';});
    expect(same).toBe(first);
    expect(renders).toBe(1);
    resolve('one');
    expect(await first).toBe('one');
    expect(await same).toBe('one');
  });
  it('evicts only completed entries in least-recently-used order',async()=>{
    const cache=new HistoryThumbnailCache<number,string>(2);
    let count=0;
    const get=(key:number)=>cache.get(key,async()=>{count++;return String(key);});
    await get(1);await get(2);await get(1);await get(3);
    expect(await get(1)).toBe('1');
    expect(count).toBe(3);
    expect(await get(2)).toBe('2');
    expect(count).toBe(4);
  });
  it('retries a failed render instead of caching its rejection',async()=>{
    const cache=new HistoryThumbnailCache<number,string>(1);
    await expect(cache.get(1,async()=>{throw Error('temporary');})).rejects.toThrow('temporary');
    expect(await cache.get(1,async()=> 'recovered')).toBe('recovered');
  });
});
