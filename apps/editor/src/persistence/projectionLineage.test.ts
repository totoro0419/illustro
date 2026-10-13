import {describe,it,expect} from 'vitest';
import {canExtendProjection} from './projectionLineage';
const op=(key:string,kind='brush.stroke')=>({key:{transactionId:key,operationOrdinal:0},kind}) as unknown as Parameters<typeof canExtendProjection>[0][number];
describe('checkpoint image lineage',()=>{
 it('extends only missing strokes and new blank layers',()=>{expect(canExtendProjection([op('a')],[op('a'),op('b'),op('c','layer.add-raster')])).toBe(true);});
 it('rejects an image ahead of the current Undo position',()=>{expect(canExtendProjection([op('a'),op('b')],[op('a')])).toBe(false);});
 it('rejects stale images from another history branch',()=>{expect(canExtendProjection([op('a'),op('b')],[op('a'),op('c')])).toBe(false);});
 it('rejects same-size geometry changes after the checkpoint',()=>{expect(canExtendProjection([op('a')],[op('a'),op('b','document.crop')])).toBe(false);});
 it('accepts an exact geometry checkpoint without replaying its old strokes',()=>{const list=[op('a'),op('b','document.crop'),op('c')];expect(canExtendProjection(list,list)).toBe(true);});
});
