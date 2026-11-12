import {describe,it,expect} from 'vitest';
import {isProjectionCache} from './coordinator';

const pixels=()=>new Uint8Array(128*128*4);
const sparse=(tiles:readonly {key:string;pixels:Uint8Array}[])=>({version:2,revisionId:'revision',width:4000,height:4000,tileSize:128,layers:[{surfaceId:'surface',tiles}]});

describe('lossless, bounded sparse projection cache',()=>{
  it('accepts empty layers without allocating the whole canvas',()=>{
    expect(isProjectionCache(sparse([]))).toBe(true);
  });
  it('accepts exact tile bytes, including hidden RGB',()=>{
    const data=pixels();data[0]=57;
    expect(isProjectionCache(sparse([{key:'0,0',pixels:data}]))).toBe(true);
  });
  it('rejects duplicate, truncated and out-of-bounds tiles',()=>{
    expect(isProjectionCache(sparse([{key:'0,0',pixels:pixels()},{key:'0,0',pixels:pixels()}]))).toBe(false);
    expect(isProjectionCache(sparse([{key:'0,0',pixels:new Uint8Array(5)}]))).toBe(false);
    expect(isProjectionCache(sparse([{key:'32,0',pixels:pixels()}]))).toBe(false);
    expect(isProjectionCache(sparse([{key:'0,0x',pixels:pixels()}]))).toBe(false);
  });
  it('keeps backward compatible full RGBA checkpoints',()=>{
    const legacy={version:1,revisionId:'revision',width:5,height:5,layers:[{surfaceId:'surface',pixels:new Uint8Array(100)}]};
    expect(isProjectionCache(legacy)).toBe(true);
    expect(isProjectionCache({...legacy,layers:[{surfaceId:'surface',pixels:new Uint8Array(99)}]})).toBe(false);
  });
});
