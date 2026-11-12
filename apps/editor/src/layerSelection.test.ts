import {describe,expect,it} from 'vitest';
import type {LayerId} from '@illustro/core';
import type {StrokeRecord} from '@illustro/brush-rt';
import {EditorController} from './controller';

function command(x:number,y:number,previousX=x,previousY=y,size=12){const c=Array(24).fill(0);c[0]=x;c[1]=y;c[2]=size;c[16]=previousX;c[17]=previousY;c[18]=size/2;c[19]=1;return c;}
function record(commands:number[][]):StrokeRecord{return {version:2,engine:'illustro-rt-2.5',smoothing:'local-regression-adaptive-48ms-bounded-2',fast:0,random:'philox4x32-10',seed:[1,2],preset:{id:'test-pen',blend:'normal'},raw:[{x:1,y:1,t:1,pressure:.5,pointerType:'pen'}],geometry:[],commands} as unknown as StrokeRecord;}

describe('M02 Layer selection and stroke routing',()=>{
  it('keeps selection outside Artwork Revision and auto-selects the newly added Raster Layer',()=>{
    const c=new EditorController(),first=c.selectedLayerId,initialHead=c.document.head,initialCount=c.document.revisionCount;
    expect(c.layers).toHaveLength(1);c.selectLayer(first);expect(c.document.head).toBe(initialHead);expect(c.document.revisionCount).toBe(initialCount);
    const second=c.addRasterLayer();expect(second).not.toBe(first);expect(c.selectedLayerId).toBe(second);expect(c.layers.map(x=>x.id)).toEqual([first,second]);expect(c.document.revisionCount).toBe(initialCount+1);
    const addHead=c.document.head;c.selectLayer(first);expect(c.selectedLayerId).toBe(first);c.selectLayer(second);expect(c.selectedLayerId).toBe(second);c.selectLayer(first);expect(c.document.head).toBe(addHead);expect(c.document.revisionCount).toBe(initialCount+1);
  });
  it('rejects selecting a Layer that is not in the current Document',()=>{
    const c=new EditorController(),before=c.selectedLayerId,head=c.document.head,missing='00000000-0000-4000-8000-ffffffffffff' as LayerId;
    expect(()=>c.selectLayer(missing)).toThrow(/存在/);expect(c.selectedLayerId).toBe(before);expect(c.document.head).toBe(head);
  });
  it('pins a stroke to the pointer-down target even if selection changes before commit',async()=>{
    const c=new EditorController(),first=c.selectedLayerId,second=c.addRasterLayer();c.selectLayer(first);const captured=c.target();c.selectLayer(second);
    await c.finishStroke(captured,record([command(40,40)]));expect(c.document.getTileValue(first,0,0)?.mutations).toHaveLength(1);expect(c.document.getTileValue(second,0,0)).toBeUndefined();
    const next=c.target();expect(next.layerId).toBe(second);await c.finishStroke(next,record([command(60,60)]));expect(c.document.getTileValue(second,0,0)?.mutations).toHaveLength(1);
  });
  it('draws Layer 1 -> Layer 2 -> Layer 1 without moving or losing prior strokes',async()=>{
    const c=new EditorController(),first=c.selectedLayerId;
    await c.finishStroke(c.target(),record([command(40,40)]));const firstRevision=c.document.head,second=c.addRasterLayer();expect(c.selectedLayerId).toBe(second);
    await c.finishStroke(c.target(),record([command(320,40)]));const secondRevision=c.document.head;c.selectLayer(first);expect(c.document.head).toBe(secondRevision);
    await c.finishStroke(c.target(),record([command(40,320)]));
    expect(c.document.getTileValue(first,0,0)?.mutations).toHaveLength(1);expect(c.document.getTileValue(first,0,1)?.mutations).toHaveLength(1);expect(c.document.getTileValue(first,1,0)).toBeUndefined();
    expect(c.document.getTileValue(second,1,0)?.mutations).toHaveLength(1);expect(c.document.getTileValue(second,0,0)).toBeUndefined();expect(c.document.getTileValue(second,0,1)).toBeUndefined();
    expect(c.committedStrokeCount).toBe(3);expect(c.strokeCountForLayer(first)).toBe(2);expect(c.strokeCountForLayer(second)).toBe(1);expect(c.document.head).not.toBe(firstRevision);
  });
});
