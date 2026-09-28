import {expect,it} from 'vitest';
import {CanonicalTileStore} from './raster/store';
it('keeps canonical tile bytes immutable to callers',()=>{const s=new CanonicalTileStore(),b=new Uint8Array(16);b[0]=41;const id=s.adoptBatch([b])[0]!;expect(b.byteLength).toBe(0);const copy=s.readCopy(id);copy[0]=99;expect(s.readCopy(id)[0]).toBe(41);});
