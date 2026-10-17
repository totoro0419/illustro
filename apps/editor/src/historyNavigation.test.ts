import {describe,it,expect} from 'vitest';
import {HistoryNavigation,type HistoryDirection} from './historyNavigation';
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>resolve=r);return {promise,resolve};};
describe('continuous history navigation',()=>{
 it('accepts repeats while earlier presentation is held, preserving mixed command order',async()=>{
  const gate=deferred(),applied:HistoryDirection[]=[],states:boolean[]=[],errors:string[]=[];let first=true;
  const q=new HistoryNavigation({prepare:async()=>{},apply:async ds=>{applied.push(...ds);if(first){first=false;await gate.promise;}},state:()=>states.push(q.pending),failed:m=>errors.push(m)});
  q.enqueue('undo');await Promise.resolve();for(const d of ['undo','undo','redo','undo'] as const)expect(q.enqueue(d)).toBe(true);const barrier=q.barrier();gate.resolve();await barrier;
  expect(applied).toEqual(['undo','undo','undo','redo','undo']);expect(errors).toEqual([]);expect(q.diagnostics.accepted).toBe(5);expect(states).toContain(true);
 });
 it('bounds admission explicitly without discarding any previously accepted command',async()=>{
  const gate=deferred(),applied:HistoryDirection[]=[],errors:string[]=[];const q=new HistoryNavigation({prepare:()=>gate.promise,apply:async ds=>{applied.push(...ds);},state:()=>{},failed:m=>errors.push(m)},false,3);
  expect(q.enqueue('undo')).toBe(true);expect(q.enqueue('redo')).toBe(true);expect(q.enqueue('undo')).toBe(true);expect(q.enqueue('redo')).toBe(false);expect(errors).toHaveLength(1);gate.resolve();await q.barrier();expect(applied).toEqual(['undo','redo','undo']);expect(q.diagnostics.refused).toBe(1);
 });
 it('reports failed work and rejects save barriers instead of pretending completion',async()=>{
  const errors:Array<[string,number]>=[];const q=new HistoryNavigation({prepare:async()=>{throw Error('GPU unavailable');},apply:async()=>{},state:()=>{},failed:(m,n)=>errors.push([m,n])});q.enqueue('undo');q.enqueue('redo');await expect(q.barrier()).rejects.toThrow('GPU unavailable');expect(errors).toEqual([['GPU unavailable',2]]);expect(q.diagnostics.accepted).toBe(2);expect(q.diagnostics.fault).toBe('GPU unavailable');
 });
 it('projects an admitted burst once, including commands beyond the old 32-item slice',async()=>{
  const gate=deferred(),batches:HistoryDirection[][]=[];const q=new HistoryNavigation({prepare:()=>gate.promise,apply:async ds=>{batches.push([...ds]);},state:()=>{},failed:m=>{throw Error(m);}},true);
  const commands=Array.from({length:96},(_,i)=>i%3===0?'redo':'undo') as HistoryDirection[];
  for(const d of commands)expect(q.enqueue(d)).toBe(true);
  let saved=false;const save=q.barrier().then(()=>{saved=true;});await Promise.resolve();expect(saved).toBe(false);
  gate.resolve();await save;expect(batches).toEqual([commands]);expect(q.diagnostics.batches).toBe(1);expect(q.diagnostics.traces.map(t=>t.sequence)).toEqual(commands.map((_,i)=>i+1));
 });
});
