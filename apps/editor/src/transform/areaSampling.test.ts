import {describe,expect,it} from 'vitest';
import {initialTransform,transformRaster} from './geometry';

describe('C07 adaptive area interpolation',()=>{
  it('averages every parity of an 8×8 checkerboard reduced to one pixel',()=>{
    const width=8,height=8,source=new Uint8Array(width*height*4);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const index=(y*width+x)*4,level=(x+y)%2?255:0;
      source[index]=source[index+1]=source[index+2]=level;
      source[index+3]=255;
    }
    const output=transformRaster(source,width,height,
      {...initialTransform,interpolation:'area'},null,1,1);
    expect(output[0]).toBeGreaterThanOrEqual(125);
    expect(output[0]).toBeLessThanOrEqual(130);
    expect(output[1]).toBe(output[0]);
    expect(output[3]).toBe(255);
  });
});
