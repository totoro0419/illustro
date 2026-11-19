import {describe,expect,it} from 'vitest';
import {vectorMaskCoverage,type EditableGradient,type LayerId} from '@illustro/core';
import {renderArtwork,applyRenderedPathMask} from './render';
import {layerMaskCoverage} from '@illustro/brush-rt';
import {roundedRectanglePoints,regularPolygonPoints,reverseGradientStops,shapeGradientInitialMask,shapeGradientPreviewMask,applyShapePreviewMask,rectanglePreviewCoverage,ellipsePreviewCoverage,smallPathPreviewCoverage,moveShapeAnchor,moveShapeHandle,gradientStopPointerPosition,gradientStopKeyboardPosition,shapeAnchorFieldValues,safeGradientStopValue,shapeLivePreviewDimensions,shapeLiveMaskOnMainThread,shouldCancelStaleShapePreview,gradientStopCssColor,gradientStopSwatchBackground} from './shapeGradient';

describe('C09-004 mask coverage in shape previews',()=>{
  it('clips selection-outside alpha without modifying original color bytes',()=>{
    const pixels=new Uint8ClampedArray(4*4*4);
    for(let i=0;i<16;i++)pixels.set([21,42,63,200],i*4);
    const mask={shape:'rectangle',x:1,y:1,width:2,height:2,enabled:true,inverted:false,density:1} as const;
    applyShapePreviewMask(pixels,mask,4,4,4,4,(_mask,x,y)=>vectorMaskCoverage(mask,x,y));
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){
      const i=(y*4+x)*4;
      expect(Array.from(pixels.subarray(i,i+3))).toEqual([21,42,63]);
      expect(pixels[i+3]).toBe(x>=1&&x<3&&y>=1&&y<3?200:0);
    }
  });
  it('uses document coordinates when preview is scaled and respects mask density',()=>{
    const pixels=new Uint8ClampedArray([12,34,56,201,12,34,56,201]);
    const mask={shape:'rectangle',x:0,y:0,width:2,height:2,enabled:true,inverted:false,density:.5} as const;
    applyShapePreviewMask(pixels,mask,4,2,2,1,(_mask,x,y)=>vectorMaskCoverage(mask,x,y));
    expect(pixels[3]).toBe(201);
    expect(pixels[7]).toBe(101);
    const disabled={...mask,enabled:false};
    const unchanged=pixels.slice();
    applyShapePreviewMask(pixels,disabled,4,2,2,1);
    expect(pixels).toEqual(unchanged);
  });
});


describe('C09-004/C09-005/C09-015 shared gradient and path preview masking',()=>{
  const gradient:EditableGradient={
    kind:'gradient',mode:'linear',start:{x:0,y:0},end:{x:4,y:0},
    stops:[{at:0,color:'#000000',opacity:1,midpoint:.5},
      {at:1,color:'#ffffff',opacity:1,midpoint:.5}]
  };
  const renderUnmasked=()=>renderArtwork(gradient,{
    width:4,height:4,outputWidth:2,outputHeight:2,previewMask:false
  },{} as HTMLCanvasElement);

  it('keeps a subpixel rectangle visible in a gradient preview, without masking twice',()=>{
    const mask={shape:'rectangle',x:1,y:1,width:1,height:1,
      enabled:true,inverted:false,density:1} as const;
    const pixels=renderUnmasked();
    expect([pixels[3],pixels[7],pixels[11],pixels[15]]).toEqual([255,255,255,255]);
    applyShapePreviewMask(pixels,mask,4,4,2,2);
    expect([pixels[3],pixels[7],pixels[11],pixels[15]]).toEqual([64,0,0,0]);
  });
  it('preserves the same even-odd subpixel path coverage for gradients',()=>{
    const mask={shape:'path',points:[{x:.2,y:.2},{x:.7,y:.2},{x:.2,y:.7}],
      enabled:true,inverted:false,density:1} as const;
    const pixels=renderUnmasked();
    applyShapePreviewMask(pixels,mask,4,4,2,2);
    expect([pixels[3],pixels[7],pixels[11],pixels[15]]).toEqual([8,0,0,0]);
  });
  it('does not change unmasked gradient pixels or colors',()=>{
    const pixels=renderUnmasked(),original=pixels.slice();
    applyShapePreviewMask(pixels,null,4,4,2,2);
    expect(pixels).toEqual(original);
  });
});


describe('C09-004/C09-005 pixel-mask preview direct sampling',()=>{
  it('matches the committed mask coverage across source tiles and fractional mask transforms',()=>{
    const original=new Uint8ClampedArray(4*2*4);
    for(let i=0;i<8;i++)original.set([10,20,30,201],i*4);
    for(const inverted of [false,true]){
      const mask={shape:'pixels',x:.25,y:.5,scaleX:2,scaleY:1.5,
        tiles:{'0,0':'80','1,0':'40'},enabled:true,inverted,density:.5} as const;
      const pixels=original.slice();
      const expected=original.slice();
      for(let y=0;y<2;y++)for(let x=0;x<4;x++){
        const at=(y*4+x)*4,docX=(x+.5)*64,docY=(y+.5)*2;
        expected[at+3]=Math.round(201*layerMaskCoverage(mask,docX,docY));
      }
      applyShapePreviewMask(pixels,mask,256,4,4,2);
      expect(pixels).toEqual(expected);
    }
  });
});


describe('C09-004 sparse pixel-mask area coverage at 4K fit zoom',()=>{
  it('keeps a small erased tile visible even when the preview center misses it',()=>{
    const original=new Uint8ClampedArray([11,22,33,255]);
    const mask={shape:'pixels',x:0,y:0,scaleX:1,scaleY:1,
      tiles:{'0,0':'00'},enabled:true,inverted:false,density:1} as const;
    const pixels=original.slice();
    applyShapePreviewMask(pixels,mask,256,256,1,1);
    expect(Array.from(pixels)).toEqual([11,22,33,239]);
    const inverted=original.slice();
    applyShapePreviewMask(inverted,{...mask,inverted:true},256,256,1,1);
    expect(inverted[3]).toBe(16);
    const half=original.slice();
    applyShapePreviewMask(half,{...mask,density:.5},256,256,1,1);
    expect(half[3]).toBe(247);
  });
  it('area-averages more than 16 sparse source tiles without losing subpixel edges',()=>{
    const tiles=Object.fromEntries(Array.from({length:17},(_,i)=>[i+',0','00']));
    const mask={shape:'pixels',x:60,y:0,scaleX:1,scaleY:1,
      tiles,enabled:true,inverted:false,density:1} as const;
    const pixels=new Uint8ClampedArray(32*16*4);
    for(let i=0;i<32*16;i++)pixels[i*4+3]=255;
    applyShapePreviewMask(pixels,mask,2048,1024,32,16);
    // The first changed tile only covers 4 of this output pixel's 64 columns.
    // Center sampling would incorrectly leave it fully opaque.
    expect(pixels[3]).toBe(239);
    expect(pixels[7]).toBe(0);
    expect(pixels[(16)*4+3]).toBe(0);
    const inverted=new Uint8ClampedArray([10,20,30,255]);
    applyShapePreviewMask(inverted,{...mask,inverted:true},2048,1024,1,1);
    expect(inverted[3]).toBeGreaterThan(0);
    expect(inverted[3]).toBeLessThan(255);
  });
  it('ignores changed tiles outside the document when indexing preview cells',()=>{
    const mask={shape:'pixels',x:60,y:0,scaleX:1,scaleY:1,
      tiles:{'0,0':'00','99,99':'00'},enabled:true,inverted:false,density:1} as const;
    const pixels=new Uint8ClampedArray([10,20,30,255]);
    applyShapePreviewMask(pixels,mask,64,64,1,1);
    expect(pixels[3]).toBe(239);
  });
  it('uses the committed integer source-pixel coverage under fractional transforms',()=>{
    const mask={shape:'pixels',x:.25,y:.25,scaleX:.5,scaleY:.5,
      tiles:{'0,0':'00'},enabled:true,inverted:false,density:1} as const;
    const pixels=new Uint8ClampedArray([0,0,0,255]);
    applyShapePreviewMask(pixels,mask,64,64,1,1);
    expect(pixels[3]).toBe(191);
  });
});

describe('C09-004 large sparse mask preview work budget',()=>{
  it('keeps accurate fractional edges across 129 visible source tiles',()=>{
    const tiles=Object.fromEntries(Array.from({length:129},(_,i)=>[
      (i%16)+','+Math.floor(i/16),'00'
    ]));
    const mask={shape:'pixels',x:60,y:0,scaleX:1,scaleY:1,
      tiles,enabled:true,inverted:false,density:1} as const;
    const pixels=new Uint8ClampedArray(32*16*4);
    for(let i=0;i<32*16;i++)pixels[i*4+3]=255;
    applyShapePreviewMask(pixels,mask,2048,1024,32,16);
    expect(pixels[3]).toBe(239);
    expect(pixels[7]).toBe(0);
  });
  it('does not count offscreen source tiles against the preview budget',()=>{
    const tiles=Object.fromEntries([
      ['0,0','00'],
      ...Array.from({length:128},(_,i)=>[(100+i)+',0','00'])
    ]);
    const mask={shape:'pixels',x:0,y:0,scaleX:1,scaleY:1,
      tiles,enabled:true,inverted:false,density:1} as const;
    const pixels=new Uint8ClampedArray([1,2,3,255]);
    applyShapePreviewMask(pixels,mask,256,256,1,1);
    expect(pixels[3]).toBe(239);
  });
  it('falls back to bounded center sampling for dense masks above one million source pixels',()=>{
    const tiles=Object.fromEntries(Array.from({length:289},(_,i)=>[
      (i%17)+','+Math.floor(i/17),'00'
    ]));
    const mask={shape:'pixels',x:60,y:0,scaleX:1,scaleY:1,
      tiles,enabled:true,inverted:false,density:1} as const;
    const pixels=new Uint8ClampedArray(32*32*4);
    for(let i=0;i<32*32;i++)pixels[i*4+3]=255;
    applyShapePreviewMask(pixels,mask,2048,2048,32,32);
    expect(pixels[3]).toBe(255);
  });
});

describe('C09-005/C09-015 safe cubic handle preview and commit',()=>{
  const points=[{x:10,y:20,inX:8,inY:18,outX:12,outY:22},{x:30,y:40}];
  it('moves only the intended handle without changing anchors or neighbors',()=>{
    expect(moveShapeHandle(points,0,'in',{x:7.5,y:17.25})).toEqual([
      {x:10,y:20,inX:7.5,inY:17.25,outX:12,outY:22},points[1]
    ]);
    expect(moveShapeHandle(points,0,'out',{x:15,y:24})).toEqual([
      {x:10,y:20,inX:8,inY:18,outX:15,outY:24},points[1]
    ]);
    expect(points[0]).toEqual({x:10,y:20,inX:8,inY:18,outX:12,outY:22});
  });
  it('rejects non-finite pointer positions and incomplete legacy handles',()=>{
    expect(moveShapeHandle(points,0,'in',{x:NaN,y:3})).toEqual(points);
    expect(moveShapeHandle(points,0,'out',{x:Infinity,y:3})).toEqual(points);
    expect(moveShapeHandle(points,1,'in',{x:1,y:2})).toEqual(points);
    expect(moveShapeHandle([{x:0,y:0,inX:1}],0,'in',{x:2,y:3}))
      .toEqual([{x:0,y:0,inX:1}]);
    expect(moveShapeHandle(points,99,'out',{x:1,y:2})).toEqual(points);
  });
});

describe('C09-005/C09-015 live gradient preview responsiveness',()=>{
  it('keeps large gradient mask work in the renderer and avoids a second UI pass',()=>{
    expect(shapeLiveMaskOnMainThread('gradient',1024,1024)).toBe(false);
    expect(shapeLiveMaskOnMainThread('gradient',512,512)).toBe(false);
    expect(shapeLiveMaskOnMainThread('gradient',260,260)).toBe(true);
    expect(shapeLiveMaskOnMainThread('path',1024,1024)).toBe(false);
    expect(shapeLiveMaskOnMainThread('path',260,260)).toBe(true);
  });
});

describe('C09-005/C09-015 worker path mask raster consistency',()=>{
  it('masks large path preview pixels using committed document coordinates',()=>{
    const mask={shape:'rectangle',x:0,y:0,width:2,height:2,
      enabled:true,inverted:false,density:1} as const;
    const pixels=new Uint8ClampedArray(2*2*4);
    for(let i=0;i<4;i++)pixels.set([12,34,56,200],i*4);
    applyRenderedPathMask(pixels,mask,4,4,2,2);
    expect([pixels[3],pixels[7],pixels[11],pixels[15]]).toEqual([200,0,0,0]);
    expect(Array.from(pixels.subarray(0,3))).toEqual([12,34,56]);
  });
  it('retains alpha density and ignores disabled masks',()=>{
    const mask={shape:'rectangle',x:0,y:0,width:2,height:2,
      enabled:true,inverted:false,density:.5} as const;
    const pixels=new Uint8ClampedArray([10,20,30,200,10,20,30,200]);
    applyRenderedPathMask(pixels,mask,4,2,2,1);
    expect([pixels[3],pixels[7]]).toEqual([200,100]);
    const copy=pixels.slice();
    applyRenderedPathMask(pixels,{...mask,enabled:false},4,2,2,1);
    expect(pixels).toEqual(copy);
  });
});

describe('C09-004 long thin and dense small path coverage',()=>{
  it('retains a long narrow selection that misses all downscaled pixel centers',()=>{
    const mask={shape:'path',points:[
      {x:0,y:.25},{x:4000,y:.25},{x:4000,y:.75},{x:0,y:.75}
    ],enabled:true,inverted:false,density:1} as const;
    const pixels=new Uint8ClampedArray(200*200*4);
    for(let i=0;i<200*200;i++)pixels[i*4+3]=200;
    applyShapePreviewMask(pixels,mask,4000,4000,200,200);
    for(let x=0;x<200;x++)expect(pixels[x*4+3]).toBe(5);
    expect(pixels[(200+100)*4+3]).toBe(0);
  });
  it('preserves small polygons with more than 64 vertices',()=>{
    const points=Array.from({length:80},(_,i)=>({
      x:1+Math.cos(i*Math.PI/40),y:1+Math.sin(i*Math.PI/40)
    }));
    const mask={shape:'path',points,enabled:true,inverted:false,density:1} as const;
    const pixels=new Uint8ClampedArray([10,20,30,255]);
    applyShapePreviewMask(pixels,mask,20,20,1,1);
    expect(pixels[3]).toBeGreaterThan(0);
    expect(pixels[3]).toBeLessThan(4);
  });
});
describe('C09-005/C09-015 slow live render cancellation policy',()=>{
  it('keeps quick in-flight frames and aborts only sufficiently stale frames',()=>{
    expect(shouldCancelStaleShapePreview(0)).toBe(false);
    expect(shouldCancelStaleShapePreview(119.9)).toBe(false);
    expect(shouldCancelStaleShapePreview(120)).toBe(true);
    expect(shouldCancelStaleShapePreview(250)).toBe(true);
    expect(shouldCancelStaleShapePreview(NaN)).toBe(false);
    expect(shouldCancelStaleShapePreview(Infinity)).toBe(false);
  });
});

describe('C09-004/C09-005 transparent preview fast path',()=>{
  it('skips mask sampling for transparent shape pixels without changing RGB',()=>{
    const mask={shape:'rectangle',x:0,y:0,width:2,height:2,enabled:true,inverted:false,density:1} as const;
    const pixels=new Uint8ClampedArray([40,50,60,0,70,80,90,200]);
    const samples:number[]=[];
    applyShapePreviewMask(pixels,mask,2,1,2,1,(_mask,x)=>{
      samples.push(x);
      return .5;
    });
    expect(samples).toEqual([1.5]);
    expect(Array.from(pixels)).toEqual([40,50,60,0,70,80,90,100]);
  });
});

describe('C09-004 empty-density mask fast path',()=>{
  it('does not rasterize an inactive path mask or change preview colors',()=>{
    const mask={shape:'path',points:[{x:0,y:0},{x:2,y:0},{x:0,y:2}],
      enabled:true,inverted:false,density:0} as const;
    const pixels=new Uint8ClampedArray([10,20,30,200]);
    applyShapePreviewMask(pixels,mask,4000,4000,1,1,()=>{
      throw Error('Zero-density masks must not trigger a pixel-mask lookup.');
    });
    expect(Array.from(pixels)).toEqual([10,20,30,200]);
  });
});

describe('C09-004 area-averaged rectangular mask previews',()=>{
  it('retains a narrow selection that falls between preview pixel centers',()=>{
    const mask={shape:'rectangle',x:1,y:1,width:1,height:1,enabled:true,inverted:false,density:1} as const;
    const pixels=new Uint8ClampedArray(2*2*4);
    for(let i=0;i<4;i++)pixels.set([10,20,30,200],i*4);
    applyShapePreviewMask(pixels,mask,4,4,2,2);
    expect([pixels[3],pixels[7],pixels[11],pixels[15]]).toEqual([50,0,0,0]);
    expect(Array.from(pixels.subarray(0,3))).toEqual([10,20,30]);
  });
  it('keeps inverted and fractional-density masks consistent at mixed edges',()=>{
    const mask={shape:'rectangle',x:1,y:1,width:1,height:1,enabled:true,inverted:false,density:.5} as const;
    expect(rectanglePreviewCoverage(mask,0,0,2,2)).toBeCloseTo(.625);
    expect(rectanglePreviewCoverage({...mask,inverted:true},0,0,2,2)).toBeCloseTo(.875);
    expect(rectanglePreviewCoverage(mask,2,2,4,4)).toBeCloseTo(.5);
    expect(rectanglePreviewCoverage({...mask,inverted:true},2,2,4,4)).toBeCloseTo(1);
  });
});

describe('C09-004 exact small path coverage at low zoom',()=>{
  it('keeps a subpixel triangular selection that the center sample misses',()=>{
    const mask={shape:'path',points:[{x:.2,y:.2},{x:.7,y:.2},{x:.2,y:.7}],
      enabled:true,inverted:false,density:1} as const;
    const pixels=new Uint8ClampedArray(2*2*4);
    for(let i=0;i<4;i++)pixels.set([12,34,56,200],i*4);
    applyShapePreviewMask(pixels,mask,4,4,2,2);
    // Triangle area is 0.125 document pixels; preview pixel covers 4.
    expect(pixels[3]).toBe(6);
    expect([pixels[7],pixels[11],pixels[15]]).toEqual([0,0,0]);
    expect(Array.from(pixels.slice(0,3))).toEqual([12,34,56]);
    expect(smallPathPreviewCoverage(mask,0,0,2,2)).toBeCloseTo(.125/4,9);
  });
  it('respects even-odd fill for self-crossing paths and inverted density',()=>{
    const mask={shape:'path',points:[{x:0,y:0},{x:2,y:2},{x:0,y:2},{x:2,y:0}],
      enabled:true,inverted:false,density:1} as const;
    expect(smallPathPreviewCoverage(mask,0,0,2,2)).toBeCloseTo(.5,9);
    expect(smallPathPreviewCoverage({...mask,inverted:true},0,0,2,2)).toBeCloseTo(.5,9);
    expect(smallPathPreviewCoverage({...mask,density:.5},0,0,2,2)).toBeCloseTo(.75,9);
    expect(smallPathPreviewCoverage({...mask,inverted:true,density:.5},0,0,2,2)).toBeCloseTo(.75,9);
    expect(smallPathPreviewCoverage(mask,3,3,4,4)).toBe(0);
    expect(smallPathPreviewCoverage({...mask,inverted:true},3,3,4,4)).toBe(1);
  });
});

describe('C09-004/C09-015 mask stability while editing',()=>{
  it('retains the edited layer mask if selection moves to another layer',()=>{
    const original={shape:'rectangle',x:1,y:2,width:5,height:7,enabled:true,inverted:false,density:1} as const;
    const other={...original,x:100};
    const editing='original' as LayerId;
    expect(shapeGradientPreviewMask(editing,{id:editing,mask:original},original,null)).toBe(original);
    expect(shapeGradientPreviewMask(editing,{id:'other' as LayerId,mask:other},original,null)).toBe(original);
    expect(shapeGradientPreviewMask(editing,null,original,null)).toBe(original);
    expect(shapeGradientPreviewMask(undefined,{id:editing,mask:original},original,other)).toBe(other);
  });
});

describe('C09-004 shape selection snapshot',()=>{
  it('commits the mask used for a new shape preview even if the active selection changes',()=>{
    const original={shape:'rectangle',x:12,y:20,width:100,height:60,enabled:true,inverted:false,density:1} as const;
    const changed={...original,x:300};
    const snapshot=original;
    expect(shapeGradientInitialMask(undefined,snapshot)).toBe(original);
    expect(shapeGradientInitialMask(undefined,snapshot)).not.toBe(changed);
  });
  it('preserves an explicitly empty selection and existing editable-layer masks',()=>{
    const mask={shape:'ellipse',x:0,y:0,width:20,height:20,enabled:true,inverted:false,density:.5} as const;
    expect(shapeGradientInitialMask(undefined,null)).toBeNull();
    expect(shapeGradientInitialMask('existing-layer' as LayerId,mask)).toBeUndefined();
  });
});

describe('C09 editable shape geometry',()=>{
  it('generates a closed eight-anchor rounded rectangle with tangent handles',()=>{
    const points=roundedRectanglePoints({x:0,y:0},{x:100,y:60},15);
    expect(points).toHaveLength(8);
    expect(points[0]).toMatchObject({x:15,y:0});
    expect(points[1]!.outX).toBeGreaterThan(85);
    expect(points[2]!.inY).toBeLessThan(15);
    expect(points[7]!.outY).toBeGreaterThan(0);
  });
  it('limits the corner radius to half the shorter side',()=>{
    const points=roundedRectanglePoints({x:80,y:40},{x:0,y:0},1000);
    expect(points[0]!.x).toBe(20);
    expect(points[2]!.y).toBe(20);
  });
  it('supports sharp corners when radius is zero',()=>{
    const points=roundedRectanglePoints({x:0,y:0},{x:12,y:8},0);
    expect(points).toHaveLength(4);
    expect(points[2]).toEqual({x:12,y:8});
  });
  it('creates evenly spaced editable vertices for regular polygons',()=>{
    const points=regularPolygonPoints({x:0,y:0},{x:100,y:100},6);
    expect(points).toHaveLength(6);
    expect(points[0]!.x).toBeCloseTo(50);
    expect(points[0]!.y).toBeCloseTo(0);
    for(const point of points)expect(Math.hypot(point.x-50,point.y-50)).toBeCloseTo(50,8);
  });
  it('clamps the number of vertices to the supported editing limit',()=>{
    expect(regularPolygonPoints({x:0,y:0},{x:100,y:100},2)).toHaveLength(3);
    expect(regularPolygonPoints({x:0,y:0},{x:100,y:100},500)).toHaveLength(64);
  });
  it('reverses color-stop positions and interval midpoints without changing original data',()=>{
    const original=[
      {at:0,color:'#112233',opacity:0.25,midpoint:0.2},
      {at:0.3,color:'#223344',opacity:0.7,midpoint:0.8},
      {at:1,color:'#334455',opacity:1,midpoint:0.5}
    ];
    const reverse=reverseGradientStops(original);
    expect(reverse.map(stop=>stop.at)).toEqual([0,0.7,1]);
    expect(reverse.map(stop=>stop.color)).toEqual(['#334455','#223344','#112233']);
    const midpoint=reverse.map(stop=>stop.midpoint);
    expect(midpoint[0]).toBeCloseTo(0.2,12);
    expect(midpoint.slice(1)).toEqual([0.8,0.2]);
    const restored=reverseGradientStops(reverse);
    expect(restored[0]!.midpoint).toBeCloseTo(0.2,12);
    expect(restored[1]!.midpoint).toBeCloseTo(0.8,12);
    expect(original[0]!.at).toBe(0);
  });
});

describe('C09-004 area-averaged elliptical selection',()=>{
  it('keeps a tiny ellipse inside a downscaled pixel even when its center is missed',()=>{
    const mask={shape:'ellipse',x:1.25,y:1.25,width:.5,height:.5,enabled:true,inverted:false,density:1} as const;
    const pixels=new Uint8ClampedArray(2*2*4);
    for(let i=0;i<4;i++)pixels.set([31,47,63,200],i*4);
    applyShapePreviewMask(pixels,mask,4,4,2,2);
    expect(pixels[3]).toBe(Math.round(200*Math.PI*.25*.25/4));
    expect([pixels[7],pixels[11],pixels[15]]).toEqual([0,0,0]);
    expect(Array.from(pixels.subarray(0,3))).toEqual([31,47,63]);
  });
  it('integrates an ellipse contained by a pixel and respects inversion/density',()=>{
    const mask={x:0,y:0,width:2,height:2,density:.5,inverted:false};
    expect(ellipsePreviewCoverage(mask,0,0,2,2)).toBeCloseTo(1-.5*(1-Math.PI/4),8);
    expect(ellipsePreviewCoverage({...mask,inverted:true},0,0,2,2)).toBeCloseTo(1-.5*Math.PI/4,8);
    expect(ellipsePreviewCoverage(mask,2,0,4,2)).toBeCloseTo(.5,8);
  });
  it('uses the curved edge rather than the bounding rectangle for partial overlaps',()=>{
    const mask={x:0,y:0,width:4,height:4,density:1,inverted:false};
    const fraction=ellipsePreviewCoverage(mask,0,0,2,2);
    expect(fraction).toBeGreaterThan(.75);
    expect(fraction).toBeLessThan(.8);
    expect(ellipsePreviewCoverage({...mask,inverted:true},0,0,2,2)).toBeCloseTo(1-fraction,8);
  });
});
describe('C09-005/015 live handle geometry',()=>{
  it('moves a cubic anchor and both tangent handles without changing its neighbors',()=>{
    const points=[
      {x:10,y:20,inX:7,inY:18,outX:13,outY:22},
      {x:40,y:50,inX:37,inY:45,outX:42,outY:55}
    ];
    const next=moveShapeAnchor(points,0,{x:20,y:35});
    expect(next[0]).toEqual({x:20,y:35,inX:17,inY:33,outX:23,outY:37});
    expect(next[1]).toEqual(points[1]);
    expect(points[0]).toEqual({x:10,y:20,inX:7,inY:18,outX:13,outY:22});
  });
  it('keeps plain anchors free of synthesized handles and ignores stale indices',()=>{
    const points=[{x:1,y:2},{x:3,y:4}];
    expect(moveShapeAnchor(points,1,{x:8,y:9})).toEqual([{x:1,y:2},{x:8,y:9}]);
    expect(moveShapeAnchor(points,99,{x:5,y:6})).toEqual(points);
  });
});

describe('C09-009 precise gradient stop editing',()=>{
  it('maps touch and pen coordinates to the same 0.1% grid as the numeric field',()=>{
    expect(gradientStopPointerPosition(125,100,100)).toBe(.25);
    expect(gradientStopPointerPosition(50,100,100)).toBe(0);
    expect(gradientStopPointerPosition(250,100,100)).toBe(1);
    expect(gradientStopPointerPosition(133.34,100,100)).toBe(.333);
  });
  it('ignores invalid pointer geometry instead of corrupting the stop position',()=>{
    expect(gradientStopPointerPosition(120,100,0)).toBeNull();
    expect(gradientStopPointerPosition(NaN,100,100)).toBeNull();
    expect(gradientStopPointerPosition(120,Infinity,100)).toBeNull();
  });
  it('supports keyboard fine steps, accelerated steps, and range boundaries',()=>{
    expect(gradientStopKeyboardPosition(.5,'ArrowLeft')).toBe(.499);
    expect(gradientStopKeyboardPosition(.5,'ArrowRight',true)).toBe(.51);
    expect(gradientStopKeyboardPosition(0,'ArrowLeft')).toBe(0);
    expect(gradientStopKeyboardPosition(1,'ArrowRight')).toBe(1);
    expect(gradientStopKeyboardPosition(.2,'Home')).toBe(0);
    expect(gradientStopKeyboardPosition(.2,'End')).toBe(1);
    expect(gradientStopKeyboardPosition(.5,'Escape')).toBeNull();
    expect(gradientStopKeyboardPosition(NaN,'ArrowRight')).toBeNull();
  });
});

describe('C09-005/015 full-precision handle coordinates',()=>{
  it('keeps subpixel anchor positions unchanged between preview and numeric fields',()=>{
    const points=[{x:10.125,y:20.875},{x:35.0625,y:40.9375}];
    expect(shapeAnchorFieldValues(points)).toEqual([10.125,20.875,35.0625,40.9375]);
    const moved=moveShapeAnchor(points,0,{x:10.0625,y:20.8125});
    expect(shapeAnchorFieldValues(moved)).toEqual([10.0625,20.8125,35.0625,40.9375]);
  });
  it('retains zero and does not invent positions for an empty path',()=>{
    expect(shapeAnchorFieldValues([{x:0,y:0}])).toEqual([0,0,0,0]);
    expect(shapeAnchorFieldValues([])).toEqual([0,0,0,0]);
  });
});
describe('C09-009 numeric stop edits',()=>{
  it('rejects temporary invalid values instead of storing NaN',()=>{
    expect(safeGradientStopValue(NaN,0,1,.35)).toBe(.35);
    expect(safeGradientStopValue(Infinity,0,1,.75)).toBe(.75);
    expect(safeGradientStopValue(-.5,0,1,.35)).toBe(0);
    expect(safeGradientStopValue(1.5,0,1,.35)).toBe(1);
    expect(safeGradientStopValue(.5,.01,.99,.25)).toBe(.5);
  });
});

describe('C09-005/015 invalid pointer geometry',()=>{
  it('ignores non-finite drag coordinates without corrupting saved anchors',()=>{
    const points=[{x:1.25,y:2.75,inX:1,inY:2},{x:9.5,y:10.5}];
    expect(moveShapeAnchor(points,0,{x:Infinity,y:5})).toEqual(points);
    expect(moveShapeAnchor(points,1,{x:3,y:NaN})).toEqual(points);
    expect(points[0]).toEqual({x:1.25,y:2.75,inX:1,inY:2});
  });
});

describe('C09-005/C09-015 malformed cubic handle safety',()=>{
  it('rejects incomplete and non-finite legacy handles without creating NaN points',()=>{
    const incomplete=[{x:1,y:2,inX:0},{x:10,y:20}];
    expect(moveShapeAnchor(incomplete,0,{x:5,y:6})).toEqual(incomplete);
    const invalid=[{x:1,y:2,outX:Infinity,outY:4},{x:10,y:20}];
    expect(moveShapeAnchor(invalid,0,{x:5,y:6})).toEqual(invalid);
  });
  it('rejects arithmetic overflow while preserving original cubic geometry',()=>{
    const points=[{x:-1e308,y:2,inX:-1e308,inY:2},{x:3,y:4}];
    expect(moveShapeAnchor(points,0,{x:1e308,y:3})).toEqual(points);
    const handles=[{x:0,y:0,inX:1e308,inY:0},{x:1,y:1}];
    expect(moveShapeAnchor(handles,0,{x:1e308,y:0})).toEqual(handles);
  });
});

describe('C09-005/015 zoom-aware and no-Worker live preview',()=>{
  it('uses a small preview at fit zoom and more pixels only when zoomed in',()=>{
    expect(shapeLivePreviewDimensions(4000,2000,.5,true)).toEqual({outputWidth:512,outputHeight:256});
    expect(shapeLivePreviewDimensions(4000,2000,2,true)).toEqual({outputWidth:768,outputHeight:384});
    expect(shapeLivePreviewDimensions(4000,2000,4,true)).toEqual({outputWidth:1024,outputHeight:512});
  });
  it('keeps the main-thread fallback bounded without losing small documents',()=>{
    expect(shapeLivePreviewDimensions(4000,2000,8,false)).toEqual({outputWidth:256,outputHeight:128});
    expect(shapeLivePreviewDimensions(200,100,4,true)).toEqual({outputWidth:200,outputHeight:100});
    expect(shapeLivePreviewDimensions(4000,2000,Infinity,true)).toEqual({outputWidth:512,outputHeight:256});
  });
});

describe('C09-009 transparent gradient stop controls',()=>{
  it('shows each stop with the same opacity as its saved data',()=>{
    expect(gradientStopCssColor({color:'#23252d',opacity:1})).toBe('rgba(35, 37, 45, 1)');
    expect(gradientStopCssColor({color:'#ff8000',opacity:.5})).toBe('rgba(255, 128, 0, 0.5)');
    expect(gradientStopCssColor({color:'#000000',opacity:0})).toBe('rgba(0, 0, 0, 0)');
  });
  it('uses a checkerboard beneath translucent marker colors',()=>{
    const swatch=gradientStopSwatchBackground({color:'#112233',opacity:.25});
    expect(swatch).toContain('rgba(17, 34, 51, 0.25)');
    expect(swatch).toContain('repeating-conic-gradient');
  });
});
