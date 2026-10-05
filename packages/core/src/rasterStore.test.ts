import {expect,it} from 'vitest';
import {createDeterministicIdFactory} from './ids';
import {CanonicalTileStore} from './raster/store';
it('keeps canonical block bytes immutable to callers and uses stable block ids',()=>{const s=new CanonicalTileStore(createDeterministicIdFactory()),b=new Uint8Array(4);b[0]=41;const batch=s.prepareBatch([{bytes:b,descriptor:{sampleEncoding:'rgba.unorm8.v1',bounds:{x0:0,y0:0,x1:1,y1:1}}}]);const id=s.publishPrepared(batch)[0]!;expect(b.byteLength).toBe(0);expect(typeof id).toBe('string');const copy=s.readCopy(id);copy[0]=99;expect(s.readCopy(id)[0]).toBe(41);});
