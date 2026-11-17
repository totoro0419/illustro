import {describe,it,expect} from 'vitest';
import {createTiledPreviewAccumulator,canUseTiledHistoryPreview} from './tiledPreview';
import {compositeLayer} from './basicExport';

describe('C03-007 bounded tile compositing',()=>{
  it('downsamples opaque checker tiles without allocating a full-size destination',()=>{
    const acc=createTiledPreviewAccumulator(4,4,2,2);
    const solid=(r:number,g:number,b:number)=>Uint8Array.from(Array.from({length:4},()=>[r,g,b,255]).flat());
    acc.addTile(solid(255,0,0),0,0,2);
    acc.addTile(solid(0,255,0),2,0,2);
    acc.addTile(solid(0,0,255),0,2,2);
    acc.addTile(solid(255,255,255),2,2,2);
    expect([...acc.finish()]).toEqual([255,0,0,255,0,255,0,255,0,0,255,255,255,255,255,255]);
  });
  it('averages premultiplied color to avoid dark halos around transparent ink',()=>{
    const acc=createTiledPreviewAccumulator(2,1,1,1);
    acc.addTile(Uint8Array.of(255,0,0,255,0,0,255,0,0,0,0,0,0,0,0,0),0,0,2);
    expect([...acc.finish()]).toEqual([255,0,0,128]);
  });
  it('handles partial edge tiles without bleeding past canvas bounds',()=>{
    const acc=createTiledPreviewAccumulator(3,2,1,1);
    acc.addTile(new Uint8Array(16).fill(255),0,0,2);
    acc.addTile(new Uint8Array(16).fill(255),2,0,2);
    expect([...acc.finish()]).toEqual([255,255,255,255]);
  });
  it('composites overlapping partial-alpha layers before shrink, matching full rendering',()=>{
    const originalW=4,originalH=4,tileSize=2;
    const bottom=new Uint8ClampedArray(originalW*originalH*4);
    const top=new Uint8ClampedArray(originalW*originalH*4);
    for(let y=0;y<originalH;y++)for(let x=0;x<originalW;x++){
      const i=(y*originalW+x)*4;
      bottom.set([45+x*21,80+y*18,140,170+x*7],i);
      top.set([208,20+y*26,12+x*11,(x+y)%2?95:206],i);
    }
    const full=new Uint8ClampedArray(bottom);
    compositeLayer(full,top,0.65);
    const acc=createTiledPreviewAccumulator(originalW,originalH,2,2);
    for(let y=0;y<originalH;y+=tileSize)for(let x=0;x<originalW;x+=tileSize){
      const lower=new Uint8ClampedArray(tileSize*tileSize*4);
      const upper=new Uint8ClampedArray(tileSize*tileSize*4);
      for(let dy=0;dy<tileSize;dy++)for(let dx=0;dx<tileSize;dx++){
        const from=((y+dy)*originalW+x+dx)*4,to=(dy*tileSize+dx)*4;
        lower.set(bottom.subarray(from,from+4),to);
        upper.set(top.subarray(from,from+4),to);
      }
      const tile=new Uint8ClampedArray(tileSize*tileSize*4);
      compositeLayer(tile,lower);
      compositeLayer(tile,upper,0.65);
      acc.addTile(tile,x,y,tileSize);
    }
    const preview=acc.finish();
    for(let oy=0;oy<2;oy++)for(let ox=0;ox<2;ox++){
      let ar=0,ag=0,ab=0,aa=0;
      for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
        const offset=((oy*2+dy)*4+ox*2+dx)*4,alpha=full[offset+3]!/255;
        ar+=full[offset]!*alpha;
        ag+=full[offset+1]!*alpha;
        ab+=full[offset+2]!*alpha;
        aa+=alpha;
      }
      const destination=(oy*2+ox)*4;
      const expected=[Math.round(ar/aa),Math.round(ag/aa),Math.round(ab/aa),Math.round(aa*255/4)];
      for(let c=0;c<4;c++)expect(Math.abs(preview[destination+c]!-expected[c]!)).toBeLessThanOrEqual(1);
    }
  });
  it('keeps advanced effects and saved raster bases on the exact fallback path',()=>{
    const layer={surfaceId:'ink',visible:true,opacity:1};
    const simple={width:4000,height:4000,layers:[layer]};
    expect(canUseTiledHistoryPreview(simple,160,120)).toBe(true);
    expect(canUseTiledHistoryPreview({...simple,layers:[{...layer,clipSurfaceId:'under'}]},160,120)).toBe(false);
    expect(canUseTiledHistoryPreview({...simple,basePixels:[{surfaceId:'ink',pixels:new Uint8Array(4)}]},160,120)).toBe(false);
    expect(canUseTiledHistoryPreview({...simple,layers:[{...layer,isolation:['g']}]},160,120)).toBe(false);
    expect(canUseTiledHistoryPreview(simple,1600,1200)).toBe(false);
  });
});
