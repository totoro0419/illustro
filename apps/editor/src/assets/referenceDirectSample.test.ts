import {describe,it,expect} from 'vitest';
import {referencePixelAtScreen} from './referenceDirectSample';

const area={left:30,top:40,width:300,height:200};
const base={panX:0,panY:0,zoom:1,rotation:0,flipX:false,flipY:false};
const point=(x:number,y:number,opts=base)=>
  referencePixelAtScreen(x,y,area,opts,200,100,4000,2000);
describe('C05-019 pixel-accurate reference tap geometry',()=>{
  it('maps a visual center to the original 4000px bitmap instead of the preview',()=>{
    expect(point(180,140)).toEqual({x:2000,y:1000});
    expect(point(130,115)).toEqual({x:1000,y:500});
    expect(point(79,140)).toBeNull();
  });
  it('reverses panning and zooming before sampling',()=>{
    expect(point(210,140,{...base,panX:30,zoom:2})).toEqual({x:2000,y:1000});
    expect(point(310,140,{...base,panX:30,zoom:2})).toEqual({x:3000,y:1000});
  });
  it('handles quarter turns and horizontal/vertical flips',()=>{
    expect(point(180,190,{...base,rotation:90})).toEqual({x:3000,y:1000});
    expect(point(130,115,{...base,flipX:true})).toEqual({x:3000,y:500});
    expect(point(130,115,{...base,flipY:true})).toEqual({x:1000,y:1500});
  });
  it('does not sample outside the actual displayed image',()=>{
    expect(point(-200,140)).toBeNull();
    expect(point(180,140,{...base,zoom:0})).toBeNull();
  });
});
