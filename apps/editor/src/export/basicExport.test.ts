import {describe,it,expect} from 'vitest';
// @ts-ignore: Node test-only import; browser application intentionally excludes Node types.
import {inflateSync} from 'node:zlib';
import {CoreDocument} from '@illustro/core';
import type {StrokeRecord} from '@illustro/brush-rt';
import {EditorController} from '../controller';
import {captureExport,compositeLayer,encodePng,exportFileName,flattenOnWhite} from './basicExport';

describe('M06 exact export pixel and state contracts',()=>{
  it('composites formal layer order using straight alpha, including partial alpha',()=>{
    const under=new Uint8ClampedArray([255,0,0,255, 0,0,0,0, 100,10,20,255]);
    const upper=new Uint8Array([0,0,255,128, 10,20,30,128, 200,0,0,255]);
    compositeLayer(under,upper,1);
    expect([...under]).toEqual([127,0,128,255, 10,20,30,128, 200,0,0,255]);
  });
  it('does not turn empty or erased pixels black in JPEG white-matte policy',()=>{
    const result=flattenOnWhite(new Uint8ClampedArray([22,33,44,0, 0,0,0,255, 100,40,20,128]));
    expect([...result.slice(0,8)]).toEqual([255,255,255,255,0,0,0,255]);
    expect([...result.slice(8)]).toEqual([177,147,137,255]);
  });
  it('encodes hidden RGB and partial alpha losslessly to valid RGBA PNG',async()=>{
    const width=2,height=2,pixels=new Uint8ClampedArray([
      31,42,53,0, 100,200,30,128,
      0,0,0,255, 255,255,255,0
    ]);
    const blob=await encodePng(pixels,width,height),bytes=new Uint8Array(await blob.arrayBuffer());
    expect(blob.type).toBe('image/png');
    expect([...bytes.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
    expect([...bytes.slice(16,24)]).toEqual([0,0,0,2,0,0,0,2]);
    expect([...bytes.slice(24,29)]).toEqual([8,6,0,0,0]);
    let at=8,zipped=new Uint8Array();
    while(at<bytes.length){const len=(bytes[at]!<<24|bytes[at+1]!<<16|bytes[at+2]!<<8|bytes[at+3]!)>>>0;
      const type=String.fromCharCode(...bytes.slice(at+4,at+8));
      if(type==='IDAT')zipped=bytes.slice(at+8,at+8+len);
      at+=12+len;
    }
    const raw=inflateSync(zipped);
    expect([...raw]).toEqual([0,...pixels.slice(0,8),0,...pixels.slice(8)]);
  });
  it('freezes root and layer ordering at revision without altering history or save logic',()=>{
    const doc=new CoreDocument({width:64,height:48,name:'Drawing',colorProfileId:'srgb'});
    const before=doc.head,sequence=doc.commitSequence,old=captureExport(doc);
    expect(old.revision).toBe(before);
    expect(old.layers).toHaveLength(1);
    doc.addRasterLayerAbove(doc.defaultRasterLayerId);
    expect(old.layers).toHaveLength(1);
    expect(old.revision).not.toBe(doc.head);
    expect(doc.commitSequence).toBe(sequence+1n);
    const next=captureExport(doc);
    expect(next.layers).toHaveLength(2);
    expect(next.width).toBe(64);
    expect(next.height).toBe(48);
    expect(doc.canUndo).toBe(true);
  });
  it('normalizes filename extension for all three formats',()=>{
    expect(exportFileName('あいう.illustro','png')).toBe('あいう.png');
    expect(exportFileName('x.jpeg','webp')).toBe('x.webp');
    expect(exportFileName('x.png','jpeg')).toBe('x.jpg');
  });
  it('freezes real stroke A before an additional real stroke B and leaves history unchanged',async()=>{
    const controller=new EditorController(128,128);
    const record=(x:number):StrokeRecord=>{
      const command=Array(24).fill(0);command[0]=command[16]=x;command[1]=command[17]=32;command[2]=12;command[18]=6;command[19]=1;
      return {version:2,engine:'illustro-rt-2.5',smoothing:'local-regression-adaptive-48ms-bounded-2',fast:0,random:'philox4x32-10',seed:[1,2],preset:{id:'paint',blend:'normal'},raw:[{x,y:32,t:1,pressure:1,pointerType:'pen'}],geometry:[],commands:[command]} as unknown as StrokeRecord;
    };
    await controller.finishStroke(controller.target(),record(18));
    const fixed=captureExport(controller.document),headA=fixed.revision,sequenceA=controller.document.commitSequence;
    await controller.finishStroke(controller.target(),record(98));
    expect(fixed.strokes).toHaveLength(1);
    expect(fixed.strokes[0]?.record.commands[0]?.[0]).toBe(18);
    expect(fixed.revision).toBe(headA);
    expect(controller.document.head).not.toBe(headA);
    expect(controller.document.commitSequence).toBe(sequenceA+1n);
    expect(controller.document.canUndo).toBe(true);
  });
  it('encodes a large PNG at requested pixel dimensions without a rendered screenshot',async()=>{
    const width=2048,height=1024,pixels=new Uint8ClampedArray(width*height*4);
    pixels.set([33,77,191,128],(width*490+1020)*4);
    const blob=await encodePng(pixels,width,height),bytes=new Uint8Array(await blob.slice(0,29).arrayBuffer());
    expect(blob.type).toBe('image/png');
    expect([...bytes.slice(16,24)]).toEqual([0,0,8,0,0,0,4,0]);
    expect(blob.size).toBeGreaterThan(200);
  });

});
