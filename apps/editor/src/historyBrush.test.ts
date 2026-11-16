import {describe,expect,it} from 'vitest';
import {restoreHistoryPixels} from './historyBrush';

const setup=()=>{
  const width=8,height=8;
  const target=new Uint8Array(width*height*4);
  const source=new Uint8ClampedArray(width*height*4);
  for(let i=0;i<width*height;i++){target[i*4+3]=255;source[i*4]=255;source[i*4+3]=255;}
  return {width,height,target,source};
};
const pixel=(bytes:Uint8Array|Uint8ClampedArray,x:number,y:number)=>[...bytes.subarray((y*8+x)*4,(y*8+x+1)*4)];

describe('C03-003 history brush respects C06 per-pixel selection',()=>{
  it('only restores selected pixels inside a free-form selection',()=>{
    const {width,height,target,source}=setup();
    const alpha=new Uint8Array(width*height);alpha[4*width+4]=255;
    const changed=restoreHistoryPixels(target,source,[{x:4.5,y:4.5,pressure:1}],{
      width,height,sourceWidth:width,sourceHeight:height,size:7,opacity:1,
      selection:null,selectionMask:{width,height,alpha},lockAlpha:false,
    });
    expect(changed).toBe(true);
    expect(pixel(target,4,4)).toEqual([255,0,0,255]);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)
      if(x!==4||y!==4)expect(pixel(target,x,y)).toEqual([0,0,0,255]);
  });
  it('uses feathered selection alpha as proportional restoration strength',()=>{
    const {width,height,target,source}=setup();
    const alpha=new Uint8Array(width*height);alpha[4*width+4]=128;
    restoreHistoryPixels(target,source,[{x:4.5,y:4.5,pressure:1}],{
      width,height,sourceWidth:width,sourceHeight:height,size:7,opacity:1,
      selection:null,selectionMask:{width,height,alpha},lockAlpha:false,
    });
    expect(pixel(target,4,4)[0]).toBeGreaterThan(110);
    expect(pixel(target,4,4)[0]).toBeLessThan(145);
    expect(pixel(target,3,4)).toEqual([0,0,0,255]);
  });
  it('rejects a selection mask from another canvas size without changing pixels',()=>{
    const {width,height,target,source}=setup();
    const before=target.slice();
    expect(()=>restoreHistoryPixels(target,source,[{x:4,y:4,pressure:1}],{
      width,height,sourceWidth:width,sourceHeight:height,size:7,opacity:1,
      selection:null,selectionMask:{width:7,height,alpha:new Uint8Array(56)},lockAlpha:false,
    })).toThrow();
    expect(target).toEqual(before);
  });
});
