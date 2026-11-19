import {describe,it,expect} from 'vitest';
import {selectionBrushPreviewDabs,selectionBrushPreviewRaster,selectionBrushPreviewRequestKey} from './brushPreview';
import {brushSelection,type SelectionBrushPoint} from './mask';

describe('C06-007 live selection-brush footprint',()=>{
  it('shows a visible dab for a single tap rather than an empty SVG move',()=>{
    expect(selectionBrushPreviewDabs([{x:5,y:8,pressure:1}],20))
      .toEqual([{x:5,y:8,radius:10}]);
  });
  it('varies the diameter along the line as pressure changes',()=>{
    const dots=selectionBrushPreviewDabs([
      {x:0,y:0,pressure:0},
      {x:20,y:0,pressure:1}
    ],20);
    expect(dots[0]?.radius).toBeCloseTo(2.5);
    expect(dots.at(-1)?.radius).toBeCloseTo(10);
    expect(dots.at(-1)?.x).toBe(20);
    expect(dots.every(dot=>dot.radius>=2.5&&dot.radius<=10)).toBe(true);
  });
  it('bounds preview allocations for long strokes and rejects invalid settings',()=>{
    const points=Array.from({length:10_000},(_,i)=>({x:i,y:1,pressure:.5}));
    const dots=selectionBrushPreviewDabs(points,28,64);
    expect(dots.length).toBeLessThanOrEqual(64);
    expect(dots.at(-1)?.x).toBe(9_999);
    expect(selectionBrushPreviewDabs(points,0)).toEqual([]);
    expect(selectionBrushPreviewDabs(points,28,0)).toEqual([]);
  });
});

describe('C06-007 exact bounded selection preview',()=>{
 const settings={size:15,opacity:.55,hardness:.3,mode:'add' as const};
 it('returns the exact committed mask difference for pressure, overlap and half opacity',()=>{
  const width=100,height=80,alpha=new Uint8Array(width*height);
  for(let y=12;y<60;y++)for(let x=18;x<65;x++)alpha[y*width+x]=(x+y)%2?64:192;
  const prior={width,height,alpha},points:SelectionBrushPoint[]=[
   {x:20.5,y:16.8,pressure:.1},{x:27.1,y:20.5,pressure:.8},
   {x:29.5,y:27.8,pressure:1},{x:25,y:24,pressure:.2}
  ];
  const raster=selectionBrushPreviewRaster(prior,points,settings,width,height);
  expect(raster).not.toBeNull();
  const committed=brushSelection(prior,points,settings);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const expected=Math.abs(committed.alpha[y*width+x]!-alpha[y*width+x]!);
   const actual=raster&&x>=raster.x&&x<raster.x+raster.width&&
    y>=raster.y&&y<raster.y+raster.height
      ?raster.alpha[(y-raster.y)*raster.width+x-raster.x]:0;
   expect(actual).toBe(expected);
  }
 });
 it('shows the exact removed amount for subtraction, not just a geometric brush disc',()=>{
  const width=90,height=72,prior={width,height,alpha:new Uint8Array(width*height).fill(255)};
  const points=[{x:36,y:30,pressure:1},{x:42,y:30,pressure:.6}];
  const subtract={...settings,mode:'subtract' as const};
  const raster=selectionBrushPreviewRaster(prior,points,subtract,width,height)!;
  const committed=brushSelection(prior,points,subtract);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const actual=x>=raster.x&&x<raster.x+raster.width&&
     y>=raster.y&&y<raster.y+raster.height
      ?raster.alpha[(y-raster.y)*raster.width+x-raster.x]:0;
   expect(actual).toBe(255-committed.alpha[y*width+x]!);
  }
 });
 it('keeps exact alpha previews for moderately long, narrow strokes',()=>{
  const width=100,height=30,prior={width,height,alpha:new Uint8Array(width*height).fill(90)};
  const points=Array.from({length:120},(_,i)=>({x:10+i*.4,y:12,pressure:.5}));
  const small={...settings,size:6};
  const preview=selectionBrushPreviewRaster(prior,points,small,width,height);
  expect(preview).not.toBeNull();
  const committed=brushSelection(prior,points,small);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const actual=preview&&x>=preview.x&&x<preview.x+preview.width&&
    y>=preview.y&&y<preview.y+preview.height
      ?preview.alpha[(y-preview.y)*preview.width+x-preview.x]:0;
   expect(actual).toBe(Math.abs(committed.alpha[y*width+x]!-prior.alpha[y*width+x]!));
  }
 });
 it('rejects corrupt saved masks and unsupported modes instead of previewing wrong pixels',()=>{
  const points=[{x:12,y:12,pressure:1}],alpha=new Uint8Array(32*32);
  expect(selectionBrushPreviewRaster({width:32,height:32,alpha:new Uint8Array(5)},
    points,settings,32,32)).toBeNull();
  expect(selectionBrushPreviewRaster({width:32,height:32,alpha},
    points,{...settings,mode:'invalid' as 'add'},32,32)).toBeNull();
  expect(selectionBrushPreviewRaster({width:32,height:32,alpha},
    points,settings,32,32)).not.toBeNull();
 });
 it('falls back to lightweight SVG when live processing would exceed the budget',()=>{
  const points=Array.from({length:500},(_,i)=>({x:10+i*.5,y:100,pressure:.75}));
  expect(selectionBrushPreviewRaster(null,points,settings,4000,4000)).toBeNull();
  expect(selectionBrushPreviewRaster(null,[{x:200,y:200,pressure:1}],
    {...settings,size:800},4000,4000)).toBeNull();
 });
});

describe('C06-007 coalesced-pointer preview request identity',()=>{
 const settings='size:12;opacity:.5';
 const points=Array.from({length:100},(_,i)=>({x:i,y:i%13,pressure:.5}));
 it('changes the request when a recent point moves without changing the point count',()=>{
  const first=selectionBrushPreviewRequestKey(points,settings);
  const moved=points.map(p=>({...p}));
  moved[48]={...moved[48]!,x:90};
  expect(selectionBrushPreviewRequestKey(moved,settings)).not.toBe(first);
  moved[48]={...points[48]!,pressure:.8};
  expect(selectionBrushPreviewRequestKey(moved,settings)).not.toBe(first);
  expect(selectionBrushPreviewRequestKey(points,settings)).toBe(first);
 });
 it('invalidates corrections to the first sample of a 100-point exact preview',()=>{
  const first=selectionBrushPreviewRequestKey(points,settings);
  const moved=points.map(p=>({...p}));
  moved[0]={...moved[0]!,y:75};
  expect(selectionBrushPreviewRequestKey(moved,settings)).not.toBe(first);
  const longer=Array.from({length:350},(_,i)=>({x:i,y:1,pressure:.5}));
  const earlier=longer.map(p=>({...p}));
  earlier[3]={...earlier[3]!,pressure:.2};
  expect(selectionBrushPreviewRequestKey(earlier,settings))
   .not.toBe(selectionBrushPreviewRequestKey(longer,settings));
 });
 it('invalidates on append and settings changes while keeping a bounded input window',()=>{
  const first=selectionBrushPreviewRequestKey(points,settings);
  expect(selectionBrushPreviewRequestKey([...points,{x:100,y:0,pressure:1}],settings)).not.toBe(first);
  expect(selectionBrushPreviewRequestKey(points,'size:15;opacity:.5')).not.toBe(first);
  expect(selectionBrushPreviewRequestKey(points.map(p=>({...p})),settings)).toBe(first);
 });
});
