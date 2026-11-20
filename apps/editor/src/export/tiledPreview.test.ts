import {describe,it,expect,vi,afterEach} from 'vitest';
import {createTiledPreviewAccumulator,canUseTiledHistoryPreview,yieldHistoryRender} from './tiledPreview';
import {compositeLayer} from './basicExport';

afterEach(()=>vi.unstubAllGlobals());

describe('C03-007 background history rendering',()=>{
  it('keeps progressing when the browser suspends animation frames',async()=>{
    const frame=vi.fn();
    vi.stubGlobal('document',{visibilityState:'hidden'});
    vi.stubGlobal('requestAnimationFrame',frame);
    await yieldHistoryRender();
    expect(frame).not.toHaveBeenCalled();
  });
  it('yields to animation frames when the document is visible',async()=>{
    const frame=vi.fn((callback:FrameRequestCallback)=>{callback(0);return 1;});
    vi.stubGlobal('document',{visibilityState:'visible'});
    vi.stubGlobal('requestAnimationFrame',frame);
    await yieldHistoryRender();
    expect(frame).toHaveBeenCalledOnce();
  });
});

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
  it('keeps fractional alpha and colors within one byte after float32 accumulation',()=>{
    const width=5,height=3,targetWidth=2,targetHeight=1,tileSize=2;
    const pixels=new Uint8Array(width*height*4);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4;
      pixels.set([x*41+y*9,240-x*31,15+y*67,(x*37+y*53)%256],i);
    }
    const acc=createTiledPreviewAccumulator(width,height,targetWidth,targetHeight);
    for(let y=0;y<height;y+=tileSize)for(let x=0;x<width;x+=tileSize){
      const tile=new Uint8Array(tileSize*tileSize*4);
      for(let dy=0;dy<tileSize&&y+dy<height;dy++)
        for(let dx=0;dx<tileSize&&x+dx<width;dx++)
          tile.set(pixels.subarray(((y+dy)*width+x+dx)*4,((y+dy)*width+x+dx+1)*4),
            (dy*tileSize+dx)*4);
      acc.addTile(tile,x,y,tileSize);
    }
    const result=acc.finish();
    for(let ox=0;ox<targetWidth;ox++){
      let alpha=0,red=0,green=0,blue=0;
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const overlap=Math.max(0,Math.min(x+1,(ox+1)*width/targetWidth)-
          Math.max(x,ox*width/targetWidth))/ (width/targetWidth*height);
        const i=(y*width+x)*4,a=pixels[i+3]!/255*overlap;
        alpha+=a;red+=pixels[i]!*a;green+=pixels[i+1]!*a;blue+=pixels[i+2]!*a;
      }
      const i=ox*4,expected=[Math.round(red/alpha),Math.round(green/alpha),
        Math.round(blue/alpha),Math.round(alpha*255)];
      for(let c=0;c<4;c++)expect(Math.abs(result[i+c]!-expected[c]!)).toBeLessThanOrEqual(1);
    }
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
  it('matches full-canvas mask coverage on the second 128px tile',()=>{
    const width=256,height=128,tileSize=128;
    const mask={enabled:true,inverted:false,density:1,shape:'rectangle' as const,
      x:128,y:0,width:128,height:128};
    const source=new Uint8ClampedArray(width*height*4);
    for(let i=0;i<source.length;i+=4)source.set([210,25,70,255],i);
    const full=new Uint8ClampedArray(source.length);
    compositeLayer(full,source,1,undefined,{width,mask});
    for(const originX of [0,128]){
      const tile=new Uint8ClampedArray(tileSize*tileSize*4);
      const ink=new Uint8ClampedArray(tile.length);
      for(let y=0;y<height;y++)ink.set(source.subarray((y*width+originX)*4,(y*width+originX+tileSize)*4),y*tileSize*4);
      compositeLayer(tile,ink,1,undefined,{width:tileSize,mask,originX,originY:0});
      for(let y=0;y<height;y++)
        expect(tile.subarray(y*tileSize*4,(y+1)*tileSize*4))
          .toEqual(full.subarray((y*width+originX)*4,(y*width+originX+tileSize)*4));
    }
  });
  it('keeps advanced dissolve blend anchored in global artwork coordinates',()=>{
    const width=256,height=128,tileSize=128;
    const blend={mode:'dissolve' as const,space:'encoded' as const,seed:31};
    const source=new Uint8ClampedArray(width*height*4);
    const base=new Uint8ClampedArray(source.length);
    for(let i=0;i<source.length;i+=4){
      source.set([244,87,10,145],i);
      base.set([15,66,187,255],i);
    }
    const full=new Uint8ClampedArray(base);
    compositeLayer(full,source,0.8,undefined,{width,blend});
    for(const originX of [0,128]){
      const tile=new Uint8ClampedArray(tileSize*tileSize*4);
      const ink=new Uint8ClampedArray(tile.length);
      for(let y=0;y<height;y++){
        const start=(y*width+originX)*4,end=start+tileSize*4,offset=y*tileSize*4;
        tile.set(base.subarray(start,end),offset);ink.set(source.subarray(start,end),offset);
      }
      compositeLayer(tile,ink,0.8,undefined,{width:tileSize,blend,originX,originY:0});
      for(let y=0;y<height;y++)
        expect(tile.subarray(y*tileSize*4,(y+1)*tileSize*4))
          .toEqual(full.subarray((y*width+originX)*4,(y*width+originX+tileSize)*4));
    }
  });
  it('supports complicated groups, masks, clipping and seeded raster data with pixel-exact per-tile composite',()=>{
    const layer={surfaceId:'ink',visible:true,opacity:1};
    const simple={width:4000,height:4000,layers:[layer]};
    expect(canUseTiledHistoryPreview(simple,160,120)).toBe(true);
    expect(canUseTiledHistoryPreview({...simple,layers:[{...layer,clipSurfaceId:'under'}]},160,120)).toBe(true);
    expect(canUseTiledHistoryPreview({...simple,basePixels:[{surfaceId:'ink',pixels:new Uint8Array(4)}]},160,120)).toBe(true);
    expect(canUseTiledHistoryPreview({...simple,layers:[{...layer,isolation:['g']}]},160,120)).toBe(true);
    // 4K comparison images now use tile replay instead of allocating a
    // 4000x4000 CPU composite for every visible layer.
    expect(canUseTiledHistoryPreview(simple,1600,1200)).toBe(true);
    // Avoid tile overhead for 1:1 images, and bound accumulator allocations.
    expect(canUseTiledHistoryPreview({...simple,width:1600,height:1200},1600,1200)).toBe(false);
    expect(canUseTiledHistoryPreview(simple,2000,1200)).toBe(false);
    expect(canUseTiledHistoryPreview(simple,0,1200)).toBe(false);
    expect(canUseTiledHistoryPreview({...simple,width:NaN},160,120)).toBe(false);
  });
});
