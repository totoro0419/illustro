import {describe,it,expect} from 'vitest';
import {NavigationBarrier} from './navigationBarrier';

describe('C03-008 navigation protection barrier',()=>{
  it('waits for all pending history-head writes, including newer writes',async()=>{
    const barrier=new NavigationBarrier();
    let releaseA:()=>void=()=>{},releaseB:()=>void=()=>{};
    const a=new Promise<void>(resolve=>{releaseA=resolve;});
    const b=new Promise<void>(resolve=>{releaseB=resolve;});
    barrier.track(a);
    let completed=false;
    const done=barrier.waitUntilIdle().then(()=>{completed=true;});
    await Promise.resolve();
    expect(completed).toBe(false);
    barrier.track(b);
    releaseA();
    await Promise.resolve();await Promise.resolve();
    expect(completed).toBe(false);
    releaseB();
    await done;
    expect(completed).toBe(true);
  });
  it('releases a failed task and does not permanently block future writes',async()=>{
    const barrier=new NavigationBarrier();
    const failure=Promise.reject(new Error('storage failure'));
    barrier.track(failure);
    await barrier.waitUntilIdle();
    barrier.track(Promise.resolve());
    await expect(barrier.waitUntilIdle()).resolves.toBeUndefined();
  });
});
