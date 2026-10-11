import {describe,it,expect} from 'vitest';
import {GpuRenderer} from '@illustro/brush-rt';
function stroke(x:number,y:number){
 const c=new Float64Array(24);c[0]=x;c[1]=y;c[2]=18;c[16]=x-3;c[17]=y;c[18]=9;c[19]=1;return c;
}
function state(stableSource:Float64Array[],id=5){
 return {id,stableSource,commands:[],preset:{hardness:1,blend:'normal'},
 tip:{x:515,y:192,t:100},inputTip:{x:515,y:192,t:100},previewTip:{x:515,y:192,t:100},finished:false};
}
describe('M08 seamless live rendering is incremental',()=>{
 it('keeps translated confirmed-command buffers instead of cloning the full stroke every input',()=>{
  const retired:number[]=[],backend={immediatePreview:false,retirePreview:(id:number)=>retired.push(id),destroy:()=>{}};
  const Renderer=GpuRenderer as unknown as new(b:unknown,w:number,h:number)=>any;
  const renderer=new Renderer(backend,512,384);renderer.setSeamlessPreview(true);
  const commands=[stroke(512,192)];
  renderer.setLive(state(commands));expect(renderer.previewStates.size).toBe(2);
  const copyId=renderer.wrapPreviews.get(5)[0],first=renderer.previewStates.get(copyId).stableSource;
  expect(first).toHaveLength(1);expect(first[0][0]).toBe(0);
  commands.push(stroke(514,192));renderer.setLive(state(commands));
  const second=renderer.previewStates.get(copyId).stableSource;
  expect(second).toBe(first);expect(second).toHaveLength(2);
  expect(second[1][0]).toBe(2);
  renderer.clearSeamlessPreviews(5);
  expect(renderer.previewStates.has(copyId)).toBe(false);
  expect(retired).toContain(copyId);renderer.destroy();
 });
 it('mirrors strokes near two edges into the opposite corner without document copies',()=>{
  const backend={immediatePreview:false,retirePreview:()=>{},destroy:()=>{}};
  const Renderer=GpuRenderer as unknown as new(b:unknown,w:number,h:number)=>any;
  const renderer=new Renderer(backend,512,384);renderer.setSeamlessPreview(true);
  renderer.setLive(state([stroke(511,383)],9));
  expect(renderer.wrapPreviews.get(9)).toHaveLength(3);
  renderer.clearSeamlessPreviews(9);renderer.destroy();
 });
});
describe('M08 view update race',()=>{
 it('preserves the latest viewport change until the next GPU presentation',async()=>{
  const draws:Array<()=>void>=[];
  const backend={immediatePreview:false,poll:()=>{},setViewTransform:()=>{},render:()=>new Promise<void>(resolve=>draws.push(resolve)),destroy:()=>{}};
  const Renderer=GpuRenderer as unknown as new(b:unknown,w:number,h:number)=>any;
  const renderer=new Renderer(backend,512,384);
  expect(renderer.frame(10)).toBe(true);expect(draws).toHaveLength(1);
  renderer.setViewTransform(new Float32Array([100,100,100,100,512,384,1,0,30,0,1,1,0,0,0,0]));
  draws[0]!();await Promise.resolve();await Promise.resolve();
  expect(renderer.needsFrame).toBe(true);
  expect(renderer.frame(20)).toBe(true);expect(draws).toHaveLength(2);
  draws[1]!();await Promise.resolve();await Promise.resolve();
  expect(renderer.needsFrame).toBe(false);
  renderer.destroy();
 });
});
