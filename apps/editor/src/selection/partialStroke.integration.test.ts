import {describe,it,expect} from 'vitest';
import {CoreDocument} from '@illustro/core';
import {CanonicalBuilder,createPreset,cpuReference,type StrokeRecord} from '@illustro/brush-rt';
import {captureSelectedLayerTiles,type InspectableDrawingRenderer} from './tileCapture';
import {selectedStrokeReadbackPlan,renderSelectedStrokeTiles} from './tileStroke';
import {strokeTilesForCanvas,describeStroke} from '../strokeCommit';
import {captureExport} from '../export/basicExport';
import {createPortableDocument,openPortableDocument} from '../persistence/portable';
import {decodeIllustroFile} from '../persistence/format';

const T=128;
function stroke(x:number,y:number):StrokeRecord{
 const preset=createPreset('partial-stroke-test','Partial stroke',{size:12,opacity:1,
  stabilization:{constant:0,fast:0,post:0},forceFade:{enabled:false}});
 const b=new CanonicalBuilder(preset,[5,6]);
 b.accept({x,y,t:0,pressure:1,pointerType:'pen',tilt:0,azimuth:0,twist:0});b.finish();return b.record();
}
function byteEqual(a:Uint8Array|Uint8ClampedArray,b:Uint8Array|Uint8ClampedArray){
 expect(a.length).toBe(b.length);
 for(let i=0;i<a.length;i++)if(a[i]!==b[i])throw Error(`RGBA differs at ${i}: ${a[i]} vs ${b[i]}`);
}
describe('C06-002 first selected stroke with no materialized snapshot',()=>{
 for(const erase of [false,true])it(`reads four tiles, preserves the other 1020, and restores exact ${erase?'eraser':'paint'} pixels at 4K`,async()=>{
  const width=4000,height=4000,doc=new CoreDocument({width,height}),id=doc.defaultRasterLayerId;
  const oldRecords=Array.from({length:1024},(_,i)=>stroke(
   Math.min(width-8,(i%32)*T+64),Math.min(height-8,Math.floor(i/32)*T+64)));
  const fullMask=new Uint8Array(width*height);fullMask.fill(255);
  const oldTiles=renderSelectedStrokeTiles(width,height,fullMask,[],oldRecords)!;
  const tileMap=new Map(oldTiles.map(tile=>[tile.key,tile.pixels]));
  const spread=(tiles:ReadonlyMap<string,Uint8Array>)=>{
   const out=new Uint8ClampedArray(width*height*4);
   for(const [key,pixels] of tiles){
    const [x=0,y=0]=key.split(',').map(Number),w=Math.min(T,width-x*T),h=Math.min(T,height-y*T);
    for(let row=0;row<h;row++)out.set(pixels.subarray(row*T*4,row*T*4+w*4),((y*T+row)*width+x*T)*4);
   }
   return out;
  };
  const source=spread(tileMap),original=doc.begin('many old semantic strokes');
  for(const old of oldRecords)original.recordRasterOperation(id,describeStroke(old,false),await strokeTilesForCanvas(old,width,height));
  original.commit();
  expect(doc.canonicalBlockCount).toBe(0);
  const beforeHead=doc.head,surfaceId=doc.root.getLayer(id).surface.descriptor.surfaceId;
  const requests:string[]=[];
  const renderer:InspectableDrawingRenderer={drain:async()=>{},inspect:async()=>{},backend:{
   tiles:new Map(oldRecords.map((_,i)=>[String(i),{surfaceKey:surfaceId,key:`${i%32},${Math.floor(i/32)}`} ])),
   readTiles:async list=>list.map(item=>{
    requests.push(item.key);const [x=0,y=0]=item.key.split(',').map(Number),pixels=new Uint8Array(T*T*4);
    for(let row=0;row<Math.min(T,height-y*T);row++){
     const start=((y*T+row)*width+x*T)*4,w=Math.min(T,width-x*T);
     pixels.set(source.subarray(start,start+w*4),row*T*4);
    }
    return {...item,pixels};
   })
  }};
  const alpha=new Uint8Array(width*height);
  for(let y=182;y<202;y++)for(let x=182;x<202;x++)alpha[y*width+x]=x%2?128:255;
  const sample=stroke(191,191),selected={...sample,preset:{...sample.preset,blend:erase?'erase' as const:'normal' as const,color:[1,0,0] as [number,number,number]}};
  const plan=selectedStrokeReadbackPlan(width,height,alpha,[selected])!;
  expect(plan.blockKeys).toEqual(['0,0']);expect(plan.rendererKeys.size).toBe(4);
  const start=performance.now();
  const oldCapture=await captureSelectedLayerTiles(renderer,surfaceId,width,height,()=>true);
  const beforeMs=performance.now()-start,beforeRequests=requests.length;
  requests.length=0;
  const fastStart=performance.now();
  const capture=await captureSelectedLayerTiles(renderer,surfaceId,width,height,()=>true,undefined,undefined,undefined,[],plan.rendererKeys);
  const afterMs=performance.now()-fastStart;
  expect(beforeRequests).toBe(1024);expect(requests).toHaveLength(4);
  const expectedTiles=renderSelectedStrokeTiles(width,height,alpha,oldCapture,[selected])!;
  const occupied=new Map(capture.map(t=>[t.key,t]));
  const complete=[...plan.rendererKeys].map(key=>occupied.get(key)??{key,pixels:new Uint8Array(T*T*4)});
  const updated=renderSelectedStrokeTiles(width,height,alpha,complete,[selected])!;
  expect(updated).not.toBeNull();
  for(const tile of updated)byteEqual(tile.pixels,expectedTiles.find(t=>t.key===tile.key)!.pixels);
  const tx=doc.begin('selected patch');tx.patchLayerRasterTiles(id,plan.blockKeys,updated);tx.commit();
  expect(doc.canonicalBlockCount).toBe(1);expect(doc.canonicalRasterBytes).toBe(256*256*4);
  const frozen=captureExport(doc),keys=new Set(frozen.strokes.flatMap(stroke=>stroke.keys!));
  expect(keys.size).toBe(1020);expect([...keys].some(key=>plan.rendererKeys.has(key))).toBe(false);
  const replay=(document:CoreDocument)=>{
   const view=captureExport(document),tiles=new Map(document.readBaseRasterTiles(id,document.head,'replay').map(t=>[t.key,t.pixels]));
   for(const item of view.strokes){
    const clip=new Set(item.keys!),input=[...clip].flatMap(key=>tiles.has(key)?[{key,pixels:tiles.get(key)!}]:[]);
    const rendered=renderSelectedStrokeTiles(width,height,fullMask,input,[item.record]);
    for(const tile of rendered??[])if(clip.has(tile.key))tiles.set(tile.key,tile.pixels);
   }
   return spread(tiles);
  };
  const expected=cpuReference(selected,width,height,source,alpha);
  byteEqual(replay(doc),expected);
  doc.undo();expect(doc.head).toBe(beforeHead);expect(doc.rasterReplayPlan().operations.filter(o=>o.kind==='brush.stroke')).toHaveLength(1024);
  doc.redo();byteEqual(replay(doc),expected);
  const saved=doc.capturePersistenceSnapshot(),restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(saved)),blockPayloads:doc.persistenceBlockPayloads(saved)});
  byteEqual(replay(restored),expected);
  if(!erase){
   const native=await createPortableDocument({document:doc,selectedLayerId:id});
   await expect(decodeIllustroFile(native.bytes,{knownRequiredTypes:new Set(['document.core.v1','raster.block.v1'])})).rejects.toThrow();
   const opened=await openPortableDocument(native.bytes);
   expect(opened.selectedLayerId).toBe(id);byteEqual(replay(opened.document),expected);
  }
  console.info('C06-002 readback fixture',JSON.stringify({erase,width,height,beforeRequests,afterRequests:requests.length,
   beforeBytes:beforeRequests*T*T*4,afterBytes:requests.length*T*T*4,beforeMs,afterMs,rgbaDifferentBytes:0}));
 },60000);
});
