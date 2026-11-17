import {describe,it,expect} from 'vitest';
import {HistoryPreviewQueue} from './historyPreviewQueue';

describe('C03-007 serial history rendering',()=>{
  it('never overlaps large pixel renders and prioritizes user comparison',async()=>{
    const queue=new HistoryPreviewQueue();
    const sequence:string[]=[];
    let release:()=>void=()=>{};
    const gate=new Promise<void>(resolve=>{release=resolve;});
    let active=0,maxActive=0;
    const task=(name:string,block=false)=>async()=>{
      active++;maxActive=Math.max(active,maxActive);sequence.push(name);
      if(block)await gate;
      active--;return name;
    };
    const first=queue.run(task('thumbnail-1',true));
    await Promise.resolve();
    const other=queue.run(task('thumbnail-2'));
    const urgent=queue.run(task('comparison'),'foreground');
    release();
    expect(await Promise.all([first,other,urgent])).toEqual(['thumbnail-1','thumbnail-2','comparison']);
    expect(sequence).toEqual(['thumbnail-1','comparison','thumbnail-2']);
    expect(maxActive).toBe(1);
  });
  it('continues after a failed render',async()=>{
    const queue=new HistoryPreviewQueue();
    const bad=queue.run(async()=>{throw new Error('GPU unavailable');});
    const good=queue.run(async()=>77);
    await expect(bad).rejects.toThrow('GPU unavailable');
    await expect(good).resolves.toBe(77);
  });
});
