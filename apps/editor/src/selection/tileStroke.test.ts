import {describe,it,expect} from 'vitest';
import {CanonicalBuilder,createPreset,cpuReference} from '@illustro/brush-rt';
import {renderSelectedStrokeTiles,validateRasterWorkerTiles,uniqueTransferableTileBuffers} from './tileStroke';
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

describe('C06-002 sparse mask cache regression',()=>{
 it('matches repeated CPU brush passes on the same tile and leaves empty tiles untouched',()=>{
  const width=270,height=140,alpha=new Uint8Array(width*height);
  for(let y=30;y<70;y++)for(let x=115;x<145;x++)
   alpha[y*width+x]=(x%3===0?128:255);
  const first=stroke([[118,40,0],[135,50,10]]);
  const second=stroke([[130,48,0],[142,52,10]]);
  const outside=stroke([[240,100,0],[255,100,10]]);
  const expected0=new Uint8ClampedArray(width*height*4);
  const expected1=cpuReference(first,width,height,expected0,alpha);
  const expected2=cpuReference(second,width,height,expected1,alpha);
  const expected3=cpuReference(outside,width,height,expected2,alpha);
  const actual=renderSelectedStrokeTiles(width,height,alpha,[],[first,second,outside]);
  expect(actual).not.toBeNull();
  expect(spread(actual!,width,height)).toEqual(new Uint8Array(expected3));
  expect(actual!.every(tile=>tile.key==='0,0'||tile.key==='1,0')).toBe(true);
 });
});

describe('C06-002/C06-015 selection Worker payload safety',()=>{
 it('rejects corrupt output before it can replace a layer snapshot',()=>{
  const pixels=new Uint8Array(TILE*TILE*4);
  expect(()=>validateRasterWorkerTiles(300,300,[{key:'0,0',pixels}])).not.toThrow();
  expect(()=>validateRasterWorkerTiles(300,300,[{key:'0,0',pixels},{key:'0,0',pixels}])).toThrow('正しく');
  expect(()=>validateRasterWorkerTiles(300,300,[{key:'03,0',pixels}])).toThrow('正しく');
  expect(()=>validateRasterWorkerTiles(300,300,[{key:'3,0',pixels}])).toThrow('作品の外');
  expect(()=>validateRasterWorkerTiles(300,300,[{key:'0,0',pixels:new Uint8Array(3)}])).toThrow('正しく');
  expect(()=>validateRasterWorkerTiles(300,300,[{key:'0,0',pixels:new Uint8Array(TILE*TILE*4+1)}])).toThrow('正しく');
 });
 it('transfers a shared tile backing buffer only once',()=>{
  const shared=new ArrayBuffer(TILE*TILE*4*2);
  const tiles=[
   {key:'0,0',pixels:new Uint8Array(shared,0,TILE*TILE*4)},
   {key:'1,0',pixels:new Uint8Array(shared,TILE*TILE*4,TILE*TILE*4)}
  ];
  expect(uniqueTransferableTileBuffers(tiles)).toEqual([shared]);
  expect(uniqueTransferableTileBuffers([])).toEqual([]);
  if(typeof SharedArrayBuffer!=='undefined'){
   const sharedMemory=new SharedArrayBuffer(TILE*TILE*4);
   expect(uniqueTransferableTileBuffers([
    ...tiles,{key:'2,0',pixels:new Uint8Array(sharedMemory)}
   ])).toEqual([shared]);
  }
 });
});

describe('C06-002 transfer only affected tiles, retain the complete snapshot',()=>{
 for(const erase of [false,true])it(`matches all RGBA bytes after a small 4K ${erase?'eraser':'brush'} stroke`,async()=>{
  const {partitionSelectedStrokeTiles}=await import('./tileStroke');
  const width=4000,height=4000,alpha=new Uint8Array(width*height);
  for(let y=160;y<180;y++)for(let x=160;x<180;x++)alpha[y*width+x]=128;
  const tiles=Array.from({length:256},(_,index)=>{
   const pixels=new Uint8Array(TILE*TILE*4);pixels.set([10,20,30,255],(40*TILE+40)*4);
   return {key:`${index%16},${Math.floor(index/16)}`,pixels};
  });
  const original=stroke([[167,167,0],[172,169,10]]);
  const record=erase?{...original,preset:{...original.preset,blend:'erase' as const}}:original;
  const expected=renderSelectedStrokeTiles(width,height,alpha,tiles.map(t=>({...t,pixels:t.pixels.slice()})),[record])!;
  const {affected,untouched}=partitionSelectedStrokeTiles(width,height,tiles,[record]);
  expect(affected.map(t=>t.key)).toEqual(['1,1']);expect(untouched).toHaveLength(255);
  const result=renderSelectedStrokeTiles(width,height,alpha,affected,[record])!;
  const merged=new Map([...untouched,...result].map(tile=>[tile.key,tile.pixels]));
  expect(expected.every(tile=>tile.pixels.every((value,i)=>value===merged.get(tile.key)![i]))).toBe(true);
  expect(untouched.every(tile=>tile.pixels.byteLength===TILE*TILE*4)).toBe(true);
 });
 it('uses the original full transfer for an unknown footprint',async()=>{
  const {partitionSelectedStrokeTiles}=await import('./tileStroke');
  const tile={key:'0,0',pixels:new Uint8Array(TILE*TILE*4)};
  const record=stroke([[10,10,0],[20,20,10]]),commands=record.commands.map(c=>[...c]);commands[0]![0]=NaN;
  const result=partitionSelectedStrokeTiles(4000,4000,[tile],[{...record,commands}]);
  expect(result.affected).toEqual([tile]);expect(result.untouched).toEqual([]);
 });
});

it('C06-002 keeps untouched tiles alive when readback tiles share an ArrayBuffer',async()=>{
 const {partitionSelectedStrokeTiles}=await import('./tileStroke');
 const buffer=new ArrayBuffer(TILE*TILE*4*2),first=new Uint8Array(buffer,0,TILE*TILE*4),second=new Uint8Array(buffer,TILE*TILE*4,TILE*TILE*4);
 second[0]=75;
 const split=partitionSelectedStrokeTiles(4000,4000,[{key:'1,1',pixels:first},{key:'2,2',pixels:second}],[stroke([[167,167,0],[172,169,10]])]);
 expect(split.affected[0]!.pixels.buffer).not.toBe(buffer);
 structuredClone(split.affected,{transfer:uniqueTransferableTileBuffers(split.affected)});
 expect(split.untouched[0]!.pixels.byteLength).toBe(TILE*TILE*4);
 expect(split.untouched[0]!.pixels[0]).toBe(75);
});

it('C06-002 plans disjoint symmetry copies and clipped edge blocks without capturing their bounding rectangle',async()=>{
 const {selectedStrokeReadbackPlan}=await import('./tileStroke');
 const width=4000,height=4000,alpha=new Uint8Array(width*height);alpha[40*width+40]=255;alpha[3998*width+3998]=128;
 const plan=selectedStrokeReadbackPlan(width,height,alpha,[stroke([[40,40,0],[42,42,10]]),stroke([[3996,3996,0],[3998,3998,10]])])!;
 expect(plan.blockKeys).toEqual(['0,0','15,15']);expect(plan.rendererKeys.size).toBe(8);
 expect(plan.rendererKeys.has('10,10')).toBe(false);
 const edgeMask=new Uint8Array(300*300);edgeMask[299*300+299]=255;
 expect([...selectedStrokeReadbackPlan(300,300,edgeMask,[stroke([[298,298,0],[299,299,10]])])!.rendererKeys]).toEqual(['2,2']);
});
