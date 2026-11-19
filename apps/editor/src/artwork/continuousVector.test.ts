import {describe,expect,it} from 'vitest';
import {CoreDocument,type EditablePath,type LayerId} from '@illustro/core';
import {continuousVectorSession} from './continuousVector';
import {saveArtworkSnapshot} from './saveSnapshot';
import {sampledPath} from './pathOperations';
import {locate,type ArtworkActions} from './tools';
import {BrushSurface} from '../brushSurface';

const stroke=(n:number):EditablePath=>({kind:'path',shape:'freehand',closed:false,stroke:'#123456',fill:null,width:3,
 lineStyle:'pressure',points:[{x:2,y:2+n*3,pressure:.2,outX:3,outY:2+n*3},
   {x:7,y:3+n*3,pressure:.9,inX:5,inY:3+n*3},{x:11,y:2+n*3,pressure:.1}]});
function fixture(){
 const doc=new CoreDocument({width:32,height:64});let selected=doc.defaultRasterLayerId;
 const drawing={} as BrushSurface;
 let contextKey:unknown=doc,hold:Promise<void>|null=null;
 const api:ArtworkActions={context:()=>({width:32,height:64,color:'#123456',drawing,documentKey:contextKey,
   selected:{id:selected,name:'test',content:doc.root.getLayer(selected).editable??null,mask:null},
   selectionMask:()=>null,paths:[],missingFontCandidates:[]}),
   save:async(content,name,id,_mask,_hidden,_output,_source,signal)=>{
     await hold;if(signal?.aborted)throw Error('cancelled');
     const tx=doc.begin('one stroke');
     selected=saveArtworkSnapshot(tx,selected,new Uint8Array(32*64*4),content,name,id,null);tx.commit();
   },rasterize:async()=>{}};
 return {doc,api,select:(id:LayerId)=>selected=id,hold:(value:Promise<void>|null)=>hold=value,changeWork:()=>contextKey={}};
}
describe('C10-001 continuous vector strokes',()=>{
 it('saves 12 independent strokes in one layer, with per-stroke history and editable restored curves',async()=>{
   const f=fixture(),session=continuousVectorSession(f.api,false,()=>{});
   for(let i=0;i<12;i++)await session.append(stroke(i));
   expect(f.doc.root.rootLayerIds).toHaveLength(2);
   const id=f.api.context()!.selected.id,path=f.doc.root.getLayer(id).editable as EditablePath;
   expect(path.points).toHaveLength(36);expect(path.points.filter(p=>p.move)).toHaveLength(11);
   expect(sampledPath(path)).toHaveLength(12);
   for(let i=0;i<12;i++)expect(path.points.slice(i*3,i*3+3).map(p=>({...p,move:undefined})))
     .toEqual(stroke(i).points.map(p=>({...p,move:undefined})));
   f.doc.undo();expect((f.doc.root.getLayer(id).editable as EditablePath).points).toHaveLength(33);
   f.doc.redo();expect(f.doc.root.getLayer(id).editable).toEqual(path);
   const snapshot=f.doc.capturePersistenceSnapshot();
   const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(snapshot)),blockPayloads:f.doc.persistenceBlockPayloads(snapshot)});
   expect(restored.root.getLayer(id).editable).toEqual(path);
   // The restored points remain normal editable data; changing one retains all other strokes.
   const tx=restored.begin('edit restored point');tx.setEditableArtwork(id,{...path,points:path.points.map((p,i)=>i===4?{...p,x:8}:p)});tx.commit();
   expect((restored.root.getLayer(id).editable as EditablePath).points[4]!.x).toBe(8);
   expect((restored.root.getLayer(id).editable as EditablePath).points[7]).toEqual(path.points[7]);
 });
 it('serializes queued strokes and creates an explicit new layer just once',async()=>{
   const f=fixture();let release!:()=>void;f.hold(new Promise<void>(r=>release=r));
   const session=continuousVectorSession(f.api,true,()=>{});
   const a=session.append(stroke(0)),b=session.append(stroke(1));release();
   await Promise.all([a,b]);expect(f.doc.root.rootLayerIds).toHaveLength(2);
   expect((f.api.context()!.selected.content as EditablePath).points).toHaveLength(6);
   await continuousVectorSession(f.api,true,()=>{}).append(stroke(2));
   expect(f.doc.root.rootLayerIds).toHaveLength(3);
 });
 it('appends to the current path after Undo rather than restoring stale strokes',async()=>{
   const f=fixture(),session=continuousVectorSession(f.api,false,()=>{});
   await session.append(stroke(0));await session.append(stroke(1));f.doc.undo();
   await session.append(stroke(2));
   const path=f.api.context()!.selected.content as EditablePath;
   expect(path.points).toHaveLength(6);expect(path.points[3]!.y).toBe(8);
 });
 it('rejects incompatible styles without making a new layer or losing existing curves',async()=>{
   const f=fixture(),session=continuousVectorSession(f.api,false,()=>{});
   await session.append(stroke(0));const head=f.doc.head;
   await expect(session.append({...stroke(1),stroke:'#ffffff'})).rejects.toThrow('色');
   expect(f.doc.head).toBe(head);expect(session.active).toBe(false);
 });
 it.each(['stop','work','selection'] as const)('cancels queued writes on %s',async mode=>{
   const f=fixture();let release!:()=>void;f.hold(new Promise<void>(r=>release=r));
   const session=continuousVectorSession(f.api,false,()=>{}),head=f.doc.head;
   const a=session.append(stroke(0)),b=session.append(stroke(1));
   if(mode==='stop')session.stop();else if(mode==='work')f.changeWork();else f.select('missing' as LayerId);
   release();await expect(a).rejects.toThrow();await expect(b).rejects.toThrow();expect(f.doc.head).toBe(head);
 });
 it('aborts an in-flight precommit render when its tool exits',async()=>{
   const f=fixture();let release!:()=>void;f.hold(new Promise<void>(r=>release=r));
   const session=continuousVectorSession(f.api,false,()=>{}),head=f.doc.head;
   const running=session.append(stroke(0));await Promise.resolve();session.stop();release();
   await expect(running).rejects.toThrow('cancelled');expect(f.doc.head).toBe(head);
 });
 it('keeps continuous locate armed and leaves existing one-shot tools one-shot',()=>{
   let current:Parameters<BrushSurface['setCanvasEditGesture']>[0]=null;
   const drawing={setCanvasEditGesture:(gesture:typeof current)=>{current=gesture;return ()=>{current=null;};}} as BrushSurface;
   locate(drawing,()=>{});current!.complete(stroke(0).points.map(p=>({...p,pressure:p.pressure??1})));expect(current).toBeNull();
   const stop=locate(drawing,()=>{},{continuous:true});
   for(let i=0;i<12;i++)current!.complete(stroke(i).points.map(p=>({...p,pressure:p.pressure??1})));
   expect(current).not.toBeNull();stop();expect(current).toBeNull();
 });
});
