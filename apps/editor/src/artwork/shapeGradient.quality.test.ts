import {describe,expect,it} from 'vitest';
import {vectorMaskCoverage,type LayerId} from '@illustro/core';
import {roundedRectanglePoints,regularPolygonPoints,reverseGradientStops,shapeGradientInitialMask,applyShapePreviewMask,rectanglePreviewCoverage,ellipsePreviewCoverage,moveShapeAnchor,gradientStopPointerPosition,gradientStopKeyboardPosition,shapeAnchorFieldValues,safeGradientStopValue,shapeLivePreviewDimensions,gradientStopCssColor,gradientStopSwatchBackground} from './shapeGradient';

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
