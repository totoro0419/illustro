import {describe,expect,it} from 'vitest';
import type {StrokeRecord} from '@illustro/brush-rt';
import {EditorController} from './controller';

function command(x:number,y:number,size=24){const c=Array(24).fill(0);c[0]=c[16]=x;c[1]=c[17]=y;c[2]=size;c[18]=size/2;c[19]=1;return c;}
function record(blend:'normal'|'erase',id:string):StrokeRecord{return {
  version:2,engine:'illustro-rt-2.5',smoothing:'local-regression-adaptive-48ms-bounded-2',fast:0,random:'philox4x32-10',seed:[1,2],
  preset:{id,blend},raw:[{x:64,y:64,t:1,pressure:1,pointerType:'pen'}],geometry:[],commands:[command(64,64)]
} as unknown as StrokeRecord;}

describe('M04 formal Eraser integration',()=>{
  it('records erase as the existing brush.stroke semantic operation and one Revision',async()=>{
    const c=new EditorController(),before=c.document.revisionCount,layer=c.selectedLayerId;
    await c.finishStroke(c.target(),record('erase','foundation-hard-eraser'));
    expect(c.document.revisionCount).toBe(before+1);expect(c.committedStrokeCount).toBe(1);expect(c.committedEraserStrokeCount).toBe(1);
    const operation=c.document.currentRevision.command?.operations[0];expect(operation?.kind).toBe('brush.stroke');expect(operation?.targetEntityIds).toEqual([layer]);
    expect(operation?.parameters.action).toBe('erase');expect(operation?.parameters.brushId).toBe('foundation-hard-eraser');
  });

  it('keeps erase isolated to the selected Raster Layer and preserves stable identities through History',async()=>{
    const c=new EditorController(),layer1=c.selectedLayerId,surface1=c.selectedLayer.surface.descriptor.surfaceId;
    await c.finishStroke(c.target(),record('normal','paint'));
    const layer2=c.addRasterLayer(),surface2=c.selectedLayer.surface.descriptor.surfaceId;
    await c.finishStroke(c.target(),record('normal','paint'));await c.finishStroke(c.target(),record('erase','foundation-hard-eraser'));
    expect(c.document.getTileValue(layer1,0,0)?.mutations).toHaveLength(1);expect(c.document.getTileValue(layer2,0,0)?.mutations).toHaveLength(2);
    expect(c.committedStrokeCount).toBe(3);expect(c.committedEraserStrokeCount).toBe(1);
    const undo=c.undo();expect(undo.changed).toBe(true);expect(c.committedStrokeCount).toBe(2);expect(c.committedEraserStrokeCount).toBe(0);
    expect(c.document.root.getLayer(layer1).surface.descriptor.surfaceId).toBe(surface1);expect(c.document.root.getLayer(layer2).surface.descriptor.surfaceId).toBe(surface2);
    const redo=c.redo();expect(redo.changed).toBe(true);expect(c.committedStrokeCount).toBe(3);expect(c.committedEraserStrokeCount).toBe(1);
    expect(c.document.root.getLayer(layer1).surface.descriptor.surfaceId).toBe(surface1);expect(c.document.root.getLayer(layer2).surface.descriptor.surfaceId).toBe(surface2);
  });

  it('drops the old erase Redo branch after a new formal edit',async()=>{
    const c=new EditorController();await c.finishStroke(c.target(),record('normal','paint'));await c.finishStroke(c.target(),record('erase','foundation-hard-eraser'));
    c.undo();expect(c.canRedo).toBe(true);await c.finishStroke(c.target(),record('normal','paint-2'));expect(c.canRedo).toBe(false);expect(c.redo().changed).toBe(false);
  });

  it('keeps Layer selection outside artwork Revision',()=>{
    const c=new EditorController(),first=c.selectedLayerId,second=c.addRasterLayer(),head=c.document.head,count=c.document.revisionCount;
    c.selectLayer(first);c.selectLayer(second);expect(c.document.head).toBe(head);expect(c.document.revisionCount).toBe(count);
  });
});
