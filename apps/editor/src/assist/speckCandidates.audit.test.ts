import {describe,it,expect} from 'vitest';
import {analyzeImage} from './analyze';

function canvas(width:number,height:number,bg:[number,number,number,number]){
  const pixels=new Uint8Array(width*height*4);
  for(let i=0;i<width*height;i++)pixels.set(bg,i*4);
  return pixels;
}
function dot(pixels:Uint8Array,w:number,x:number,y:number,color:[number,number,number,number]){
  pixels.set(color,4*(y*w+x));
}
describe('R2 D-015 speck candidate parity',()=>{
  for(const background of ['transparent','opaque'] as const){
    it('finds two isolated small marks but not the connected larger mark on '+background,()=>{
      const width=36,height=36;
      const pixels=canvas(width,height,background==='transparent'?[0,0,0,0]:[255,255,255,255]);
      const ink:[number,number,number,number]=[0,0,0,255];
      dot(pixels,width,7,7,ink);dot(pixels,width,26,9,ink);
      for(let y=22;y<26;y++)for(let x=21;x<25;x++)dot(pixels,width,x,y,ink);
      const result=analyzeImage({kind:'specks',maxArea:3,background:background==='opaque',
        width,height,source:pixels});
      expect(result.kind).toBe('specks');
      if(result.kind!=='specks')return;
      expect(result.spots.map(spot=>[spot.x,spot.y])).toEqual([[7,7],[26,9]]);
      const modified=pixels.slice();
      for(const spot of result.spots)for(const index of spot.pixels)
        modified.set(spot.fill??[0,0,0,0],index*4);
      expect(modified[(7*width+7)*4+3]).toBe(background==='transparent'?0:255);
      expect(modified[(23*width+23)*4+3]).toBe(255);
    });
  }  for(const background of ['transparent','opaque'] as const){
    it('offers 64 manually selectable isolated points, not just the first 32, on '+background,()=>{
      const width=80,height=80;
      const pixels=canvas(width,height,background==='transparent'?[0,0,0,0]:[255,255,255,255]);
      for(let y=0;y<8;y++)for(let x=0;x<8;x++)
        dot(pixels,width,4+x*9,4+y*9,[0,0,0,255]);
      const result=analyzeImage({kind:'specks',maxArea:2,background:background==='opaque',
        width,height,source:pixels});
      expect(result.kind).toBe('specks');
      if(result.kind==='specks'){
        expect(result.spots).toHaveLength(64);
        expect(result.capped).toBe(false);
      }
    });
  }

});
