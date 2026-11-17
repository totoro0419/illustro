import {describe,it,expect} from 'vitest';
import {CanonicalBuilder,createPreset,cpuReference} from '@illustro/brush-rt';
import {renderSelectedStrokeTiles} from './tileStroke';
import type {StrokeRecord} from '@illustro/brush-rt';

const point=(x:number,y:number,t:number)=>({x,y,t,pressure:.8,pointerType:'pen',tilt:0,azimuth:0,twist:0});
const stroke=(coords:readonly [number,number,number][]):StrokeRecord=>{
 const preset=createPreset('selected-test','Selected',{
  size:14,opacity:1,stabilization:{constant:0,fast:0,post:0},
  forceFade:{enabled:false}
 });
 const builder=new CanonicalBuilder(preset,[5,6]);
 for(const [x,y,t] of coords)builder.accept(point(x,y,t));
 builder.finish();return builder.record();
};
const TILE=128;
function spread(tiles:readonly {key:string;pixels:Uint8Array}[],w:number,h:number){
 const out=new Uint8Array(w*h*4);
 for(const tile of tiles){
  const [tx=0,ty=0]=tile.key.split(',').map(Number),x=tx*TILE,y=ty*TILE;
  const cw=Math.min(TILE,w-x),ch=Math.min(TILE,h-y);
  for(let row=0;row<ch;row++)out.set(tile.pixels.subarray(row*TILE*4,row*TILE*4+cw*4),((y+row)*w+x)*4);
 }
 return out;
}
describe('C06-002: tile-only selected brush processor',()=>{
 it('paints on boundary tiles without changing unselected pixels, and retains existing ink',()=>{
  const w=300,h=155,alpha=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=100;x<150;x++)alpha[y*w+x]=255;
  const initial=new Uint8Array(TILE*TILE*4);
  initial.set([8,16,32,255],(10*TILE+10)*4);
  const existing=[{key:'0,0',pixels:initial}];
  const result=renderSelectedStrokeTiles(w,h,alpha,existing,[
   stroke([[116,40,0],[132,40,10],[146,40,20]])
  ]);
  expect(result).not.toBeNull();
  const full=spread(result!,w,h);
  expect(Array.from(full.slice((10*w+10)*4,(10*w+10)*4+4))).toEqual([8,16,32,255]);
  expect(full[(40*w+120)*4+3]).toBeGreaterThan(0);
  expect(full[(40*w+135)*4+3]).toBeGreaterThan(0);
  expect(full[(40*w+155)*4+3]).toBe(0);
  expect(full[(40*w+90)*4+3]).toBe(0);
  expect(full[(40*w+152)*4+3]).toBe(0);
 });
 it('does not generate a snapshot for a stroke outside the mask',()=>{
  const w=300,h=200,alpha=new Uint8Array(w*h);alpha[0]=255;
  const tiles=[{key:'0,0',pixels:new Uint8Array(TILE*TILE*4)}];
  const record=stroke([[200,100,0],[250,100,10]]);
  expect(renderSelectedStrokeTiles(w,h,alpha,tiles,[record])).toBeNull();
 });
 it('rejects truncated, repeated or out-of-range incoming tiles',()=>{
  const mask=new Uint8Array(300*300);
  const tile={key:'0,0',pixels:new Uint8Array(TILE*TILE*4)};
  expect(()=>renderSelectedStrokeTiles(300,300,mask,[tile,tile],[])).toThrow(/正しく/);
  expect(()=>renderSelectedStrokeTiles(300,300,mask,[{key:'0,0',pixels:new Uint8Array(3)}],[])).toThrow(/正しく/);
  expect(()=>renderSelectedStrokeTiles(300,300,mask,[{key:'3,0',pixels:tile.pixels}],[])).toThrow(/作品の外/);
 });
});


describe('C06-002 pixel-equivalence against the full-canvas CPU reference',()=>{
 it('preserves exact color, opacity, brush edges and masks across 128px boundaries',()=>{
  const width=300,height=150,alpha=new Uint8Array(width*height);
  for(let y=8;y<130;y++)for(let x=102;x<270;x++)
   alpha[y*width+x]=x<130?255:x<190?128:255;
  const tiles:Array<{key:string;pixels:Uint8Array}>=[];
  const baseline=new Uint8ClampedArray(width*height*4);
  baseline.set([31,60,90,255],(25*width+27)*4);
  const first=new Uint8Array(TILE*TILE*4);
  first.set([31,60,90,255],(25*TILE+27)*4);
  tiles.push({key:'0,0',pixels:first});
  const record=stroke([[110,55,0],[132,55,5],[145,75,10],[256,79,35]]);
  const expected=cpuReference(record,width,height,baseline,alpha);
  const actualTiles=renderSelectedStrokeTiles(width,height,alpha,tiles,[record]);
  expect(actualTiles).not.toBeNull();
  const actual=spread(actualTiles!,width,height);
  for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i])
   throw new Error('Different rendered pixel at RGBA offset '+i+
    ': tiles='+actual[i]+' full='+expected[i]);
 });
});
