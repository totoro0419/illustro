import {describe,it,expect} from 'vitest';
import {buildRegions,fillMask,type FillSettings} from '../fill/pixels';
import {selectFromPixels} from './autoSelect';
describe('D-028: line selection and line fill agree',()=>{
  for(const opaque of [false,true])it('selects only the closed region on '+(opaque?'white':'transparent')+' canvas',()=>{
    const width=48,height=32,pixels=new Uint8Array(width*height*4);
    if(opaque)pixels.fill(255);
    for(const [left,right] of [[5,20],[27,42]])for(let y=5;y<=25;y++)for(let x=left;x<=right;x++){
      if(x===left||x===right||y===5||y===25)pixels.set([0,0,0,255],(y*width+x)*4);
    }
    const graph=buildRegions(pixels,width,height,18,0,[]);
    const settings:FillSettings={method:'line',tolerance:18,gap:0,opacity:1,color:'#ff0000',erase:false,contiguous:true,closedOnly:true};
    const options={action:'lineRegion' as const,width,height,seedX:12,seedY:12,tolerance:18,connected:true,brightnessMin:0,brightnessMax:255};
    const selection=selectFromPixels(pixels,options);
    const fill=fillMask(pixels,width,height,settings,[{x:12,y:12}],graph,null);
    expect(selection.alpha).toEqual(fill.alpha);
    expect(selection.alpha[12*width+12]).toBe(255);
    expect(selection.alpha[12*width+34]).toBe(0);
    expect(selection.alpha[0]).toBe(0);
    expect(()=>selectFromPixels(pixels,{...options,seedX:0,seedY:0})).toThrow();
  });
});
