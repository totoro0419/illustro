import {describe,it,expect} from 'vitest';
import {selectionBrushPreviewDabs,selectionBrushPreviewRaster} from './brushPreview';
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
 it('falls back to lightweight SVG when live processing would exceed the budget',()=>{
  const points=Array.from({length:500},(_,i)=>({x:10+i*.5,y:100,pressure:.75}));
  expect(selectionBrushPreviewRaster(null,points,settings,4000,4000)).toBeNull();
  expect(selectionBrushPreviewRaster(null,[{x:200,y:200,pressure:1}],
    {...settings,size:800},4000,4000)).toBeNull();
 });
});
