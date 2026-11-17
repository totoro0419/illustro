import {describe,it,expect} from 'vitest';
import {CANONICAL_TILE_SIZE as TILE} from '@illustro/core';
import {forEachPastedTile} from './pasteTiles';

describe('C06-015 tile-bounded clipboard paste',()=>{
  it('writes only one tile for a tiny image on a large 4000px canvas',()=>{
    const pixels=Uint8Array.from({length:4*4*4},(_,i)=>i%4===3?255:100);
    const tiles:Array<{x:number;y:number;bytes:Uint8Array}>=[];
    const count=forEachPastedTile({width:4,height:4,pixels},{width:4000,height:4000},
      1700,2000,(x,y,bytes)=>tiles.push({x,y,bytes}));
    expect(count).toBe(1);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]!.bytes.byteLength).toBe(TILE*TILE*4);
    const index=((2000-tiles[0]!.y*TILE)*TILE+1700-tiles[0]!.x*TILE)*4;
    expect(Array.from(tiles[0]!.bytes.subarray(index,index+4))).toEqual([100,100,100,255]);
  });
  it('copies original pixel bytes when crossing four tile boundaries',()=>{
    const pixels=Uint8Array.from({length:4*4*4},(_,i)=>i%4===3?255:i%251);
    const output=new Uint8Array(300*300*4);
    const touched:number[]=[];
    forEachPastedTile({width:4,height:4,pixels},{width:300,height:300},
      TILE-2,TILE-2,(tx,ty,tile)=>{
        touched.push(ty*10+tx);
        for(let y=0;y<TILE;y++)for(let x=0;x<TILE;x++){
          const px=tx*TILE+x,py=ty*TILE+y;
          if(px>=300||py>=300)continue;
          output.set(tile.subarray((y*TILE+x)*4,(y*TILE+x)*4+4),(py*300+px)*4);
        }
      });
    expect(touched).toHaveLength(4);
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){
      const from=(y*4+x)*4,at=((y+TILE-2)*300+x+TILE-2)*4;
      expect(output.subarray(at,at+4)).toEqual(pixels.subarray(from,from+4));
    }
  });
  it('clips only the off-canvas portion without corrupting inside pixels',()=>{
    const pixels=Uint8Array.of(
      1,2,3,255,4,5,6,255,
      7,8,9,255,10,11,12,255
    );
    let tile:Uint8Array|undefined;
    forEachPastedTile({width:2,height:2,pixels},{width:4,height:4},
      -1,-1,(_,__,bytes)=>{tile=bytes;});
    expect(Array.from(tile!.subarray(0,4))).toEqual([10,11,12,255]);
  });
  it('skips fully zero tiles and rejects broken input sizes',()=>{
    let called=0;
    expect(forEachPastedTile({width:1,height:1,pixels:new Uint8Array(4)},
      {width:4000,height:4000},0,0,()=>{called++;})).toBe(0);
    expect(called).toBe(0);
    expect(()=>forEachPastedTile({width:3,height:3,pixels:new Uint8Array(5)},
      {width:4000,height:4000},0,0,()=>{})).toThrow();
  });
});
