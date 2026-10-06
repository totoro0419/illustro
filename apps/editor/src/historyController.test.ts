import {describe,expect,it} from 'vitest';
import {EditorController} from './controller';
import type {StrokeRecord} from '@illustro/brush-rt';

const record={
  version:2,engine:'illustro-rt-2.5',smoothing:'local-regression-adaptive-48ms-bounded-2',fast:0,random:'philox4x32-10',seed:[1,2],
  preset:{id:'m03-test',name:'M03',size:8,opacity:1,flow:1,hardness:1,spacing:.1,scatter:0,rotation:0,rotationJitter:0,sizeJitter:0,opacityJitter:0,flowJitter:0,tip:'round',aspect:1,grainKind:'paper',grainScale:1,grainRotation:0,blend:'normal',pressureSize:0,pressureOpacity:0,pressureFlow:0,velocitySize:0,tiltSize:0,taperStart:0,taperEnd:0,exposureMs:0,bristles:7},
  raw:[],geometry:[],commands:[[10,10,8,1,0,1,1,0,0,0,0,0,0,0,0,0,10,10,4,0,0,0,0,4]]
} as unknown as StrokeRecord;

describe('M03 editor history projection',()=>{
  it('repairs selection when undo removes the selected added layer and preserves it on redo',()=>{
    const c=new EditorController(),first=c.selectedLayerId,second=c.addRasterLayer();
    expect(c.selectedLayerId).toBe(second);expect(c.canUndo).toBe(true);
    const undo=c.undo();expect(undo.changed).toBe(true);expect(c.document.root.hasLayer(second)).toBe(false);expect(c.selectedLayerId).toBe(first);expect(c.canRedo).toBe(true);
    const redo=c.redo();expect(redo.changed).toBe(true);expect(c.document.root.hasLayer(second)).toBe(true);expect(c.selectedLayerId).toBe(first);
  });
  it('keeps layer selection outside artwork history',()=>{
    const c=new EditorController(),first=c.selectedLayerId,second=c.addRasterLayer();c.selectLayer(first);const head=c.document.head;
    c.selectLayer(second);expect(c.document.head).toBe(head);c.selectLayer(first);expect(c.document.head).toBe(head);
  });
  it('invalidates redo after undo followed by a new formal edit',()=>{
    const c=new EditorController(),first=c.selectedLayerId;c.addRasterLayer();c.undo();expect(c.canRedo).toBe(true);
    c.selectLayer(first);c.addRasterLayer();expect(c.canRedo).toBe(false);expect(c.redo().changed).toBe(false);
  });
});
