import {describe,expect,it} from 'vitest';
import {brushSelection,type MaskData,type SelectionBrushPoint} from './mask';
import {LiveSelectionBrushPreview} from './liveBrushPreview';

describe('C06-007 original-resolution long selection-brush preview',()=>{
 const settings={size:18,opacity:.37,hardness:.3,mode:'add' as const};
 const width=180,height=120;
 const points:SelectionBrushPoint[]=Array.from({length:600},(_,i)=>({
  x:20+(i%100)*1.3,y:15+Math.floor(i/100)*15,pressure:.1+(i%17)/20}));
 function verify(prior:MaskData,live:LiveSelectionBrushPreview,end:number,options:Parameters<typeof brushSelection>[2]){
  const input=points.slice(0,end),preview=live.render(input,options,512);
  const committed=brushSelection(prior,input,options);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const actual=x>=preview.x&&y>=preview.y&&x<preview.x+preview.width&&y<preview.y+preview.height
    ?preview.alpha[(y-preview.y)*preview.width+x-preview.x]:0;
   expect(actual).toBe(Math.abs(committed.alpha[y*width+x]!-prior.alpha[y*width+x]!));
  }
 }
 it('matches commit for every old and newly appended segment without double-painting joins',()=>{
  const prior={width,height,alpha:new Uint8Array(width*height).fill(60)},live=new LiveSelectionBrushPreview(prior);
  for(const end of [1,97,360,600])verify(prior,live,end,settings);
  expect(prior.alpha.every(value=>value===60)).toBe(true);
 });
 it('restarts exact accumulation when brush settings or stroke length change',()=>{
  const prior={width,height,alpha:new Uint8Array(width*height).fill(190)},live=new LiveSelectionBrushPreview(prior);
  verify(prior,live,300,settings);
  const subtract={...settings,size:42,mode:'subtract' as const};
  verify(prior,live,450,subtract);verify(prior,live,10,subtract);
 });
 it('recalculates an updated last point instead of leaving a stale stroke',()=>{
  const prior={width,height,alpha:new Uint8Array(width*height)};
  const live=new LiveSelectionBrushPreview(prior);
  const first=points.slice(0,100);
  live.render(first,settings,512);
  const moved=[...first.slice(0,-1),{...first[99]!,x:95,y:70}];
  const preview=live.render(moved,settings,512);
  const expected=brushSelection(prior,moved,settings).alpha;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const actual=x>=preview.x&&y>=preview.y&&x<preview.x+preview.width&&y<preview.y+preview.height
    ?preview.alpha[(y-preview.y)*preview.width+x-preview.x]:0;
   expect(actual).toBe(expected[y*width+x]);
  }
 });
 it('reduces only display coverage and preserves the entire long-stroke bounds',()=>{
  const prior={width:4000,height:40,alpha:new Uint8Array(4000*40)},live=new LiveSelectionBrushPreview(prior);
  const preview=live.render([{x:8,y:20,pressure:1},{x:3990,y:20,pressure:1}],settings,512);
  expect(preview.width).toBe(512);expect(preview.scaleX).toBeGreaterThan(7);
  expect(preview.alpha.some(Boolean)).toBe(true);
  expect(preview.alpha.filter(Boolean).length).toBeGreaterThan(400);
 });
});
