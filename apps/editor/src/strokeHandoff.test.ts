import {describe,it,expect} from 'vitest';
import type {StrokeRecord} from '@illustro/brush-rt';
import {EditorController} from './controller';
import {StrokeHandoff} from './strokeHandoff';
function record(x=30):StrokeRecord{const c=Array(24).fill(0);Object.assign(c,{0:x,1:30,2:12,16:x,17:30,18:6,19:1});return {version:2,engine:'illustro-rt-2.5',smoothing:'local-regression-adaptive-48ms-bounded-2',fast:0,random:'philox4x32-10',seed:[1,2],preset:{id:'test',blend:'normal'},raw:[],geometry:[],commands:[c]} as unknown as StrokeRecord;}
describe('ordered stroke handoff',()=>{
 it('accepts the next stroke before prior finalization, preserves commit order and Undo/Redo',async()=>{
  const c=new EditorController(),order:number[]=[],q=new StrokeHandoff(c,r=>order.push(r.sequence)),a=q.reserve(c.target()),b=q.reserve(c.target()),start=c.document.head;
  const second=q.release(b,record(60));expect(c.committedStrokeCount).toBe(0);await q.release(a,record());await second;await q.barrier();expect(order).toEqual([1,2]);expect(c.committedStrokeCount).toBe(2);
  c.undo();expect(c.committedStrokeCount).toBe(1);c.undo();expect(c.document.head).toBe(start);c.redo();c.redo();expect(c.committedStrokeCount).toBe(2);
 });
 it('holds each captured layer independently of current selection',async()=>{
  const c=new EditorController(),first=c.selectedLayerId,second=c.addRasterLayer(),q=new StrokeHandoff(c,()=>{});c.selectLayer(first);const a=q.reserve(c.target());c.selectLayer(second);const b=q.reserve(c.target());
  await q.release(a,record());await q.release(b,record(70));expect(c.strokeCountForLayer(first)).toBe(1);expect(c.strokeCountForLayer(second)).toBe(1);
 });
 it('retains Core stale revision protection for an unrelated edit',async()=>{
  const c=new EditorController(),q=new StrokeHandoff(c,()=>{}),a=q.reserve(c.target());c.addRasterLayer();await expect(q.release(a,record())).rejects.toThrow('作品の状態');expect(c.committedStrokeCount).toBe(0);
 });
 it('continues after an off-canvas no-op or an unreleased cancellation',async()=>{
  const c=new EditorController(),q=new StrokeHandoff(c,()=>{}),a=q.reserve(c.target()),b=q.reserve(c.target());await expect(q.release(a,record(-100))).rejects.toThrow('確定できる線');await q.release(b,record());const cancelled=q.reserve(c.target());q.cancel(cancelled);await q.barrier();expect(c.committedStrokeCount).toBe(1);expect(q.pending).toBe(0);
 });
});

describe('reserved history before record completion',()=>{
 it('Undo completes before any record exists; a late record stays hidden until Redo',async()=>{
  const c=new EditorController(),order:number[]=[],q=new StrokeHandoff(c,r=>order.push(r.sequence)),base=c.document.head,a=q.reserve(c.target());
  expect(q.undoPending()).toBe(a);await q.barrier();expect(c.document.head).toBe(base);expect(q.canRedo).toBe(true);
  await q.release(a,record());expect(order).toEqual([]);expect(c.document.head).toBe(base);
  expect(q.redoPending()).toBe(a);q.resume();await q.barrier();expect(order).toEqual([1]);expect(c.committedStrokeCount).toBe(1);
 });
 it('orders two unready entries through Undo B, Undo A, Redo A, Redo B',async()=>{
  const c=new EditorController(),order:number[]=[],q=new StrokeHandoff(c,r=>order.push(r.sequence)),a=q.reserve(c.target()),b=q.reserve(c.target());
  expect(q.undoPending()).toBe(b);expect(q.undoPending()).toBe(a);await q.barrier();
  await q.release(b,record(60));await q.release(a,record());expect(c.committedStrokeCount).toBe(0);
  expect(q.redoPending()).toBe(a);q.resume();await q.barrier();expect(q.redoPending()).toBe(b);q.resume();await q.barrier();
  expect(order).toEqual([1,2]);expect(c.committedStrokeCount).toBe(2);c.undo();c.undo();expect(c.committedStrokeCount).toBe(0);
 });
 it('keeps A visible and publishes it while unready B is undone',async()=>{
  const c=new EditorController(),order:number[]=[],q=new StrokeHandoff(c,r=>order.push(r.sequence)),a=q.reserve(c.target()),b=q.reserve(c.target());
  expect(q.undoPending()).toBe(b);await q.release(a,record());await q.barrier();expect(order).toEqual([1]);expect(c.committedStrokeCount).toBe(1);
  await q.release(b,record(60));expect(order).toEqual([1]);
 });
 it('new input discards only reserved Redo, including late worker records',async()=>{
  const c=new EditorController(),discarded:StrokeRecord[]=[],q=new StrokeHandoff(c,()=>{},r=>discarded.push(r)),a=q.reserve(c.target());q.undoPending();const b=q.reserve(c.target());
  await q.release(a,record());await q.release(b,record(60));await q.barrier();expect(q.canRedo).toBe(false);expect(c.committedStrokeCount).toBe(1);expect(discarded).toHaveLength(1);
 });
 it('cancels an in-flight document publication without sending authoritative GPU work',async()=>{
  const c=new EditorController(),port=c.ports.document!,commit=port.commitStroke.bind(port);let resume!:()=>void;const gate=new Promise<void>(r=>resume=r);
  port.commitStroke=async(...args)=>{await gate;return commit(...args);};const flags:boolean[]=[],q=new StrokeHandoff(c,(_r,_s,_a,_v,undone)=>flags.push(!!undone)),a=q.reserve(c.target()),released=q.release(a,record());
  expect(q.undoPending()).toBe(a);expect(q.canRedo).toBe(true);resume();await released;await q.barrier();expect(flags).toEqual([true]);expect(c.committedStrokeCount).toBe(0);expect(c.canRedo).toBe(true);expect(q.canRedo).toBe(false);
 });
});

it('a different document edit discards reserved Redo before the worker record arrives',async()=>{
 const c=new EditorController(),discarded:StrokeRecord[]=[],q=new StrokeHandoff(c,()=>{},r=>discarded.push(r)),a=q.reserve(c.target());q.undoPending();q.discardRedo();c.addRasterLayer();await q.release(a,record());expect(q.canRedo).toBe(false);expect(discarded).toHaveLength(1);expect(c.committedStrokeCount).toBe(0);
});
