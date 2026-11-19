import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {createCanvas} from '@napi-rs/canvas';
import {CoreDocument,mapArtworkPoint,validateEditableArtwork,type EditableArtwork,type EditablePath,type EditableText,type LayerDeformation,type LayerId} from '@illustro/core';
import {editableGroupTransform,groupTransformPlan} from './groupTransform';
import {initialTransform,transformRaster} from './geometry';
import {transformLinkedMask} from './mask';
import {renderArtwork} from '../artwork/render';
import {vectorPointDrag} from '../artwork/vectorPointDrag';
import {appendPathStroke,combineShapes} from '../artwork/pathOperations';
import {linkedBooleanUpdates} from '../artwork/linkedBooleans';
import {compositeLayer} from '../export/basicExport';
import {createPortableDocument,openPortableDocument} from '../persistence/portable';
import {decodeIllustroFile,encodeIllustroFile} from '../persistence/format';
const width=96,height=96;
const rect:EditablePath={kind:'path',shape:'rectangle',points:[{x:12,y:12},{x:32,y:32}],closed:true,stroke:'#123456',fill:'#abcdef',width:0};
const text:EditableText={kind:'text',text:'Ab',origin:{x:15,y:30},vertical:false,size:12,family:'sans-serif',color:'#301080',align:'left',spacing:0,lineHeight:1.2,
 styleRanges:[{start:1,end:2,bold:true,color:'#0033ff'}]};
const paint=(content:EditableArtwork,w=width,h=height)=>renderArtwork(content,{width:w,height:h,outputWidth:w,outputHeight:h},createCanvas(w,h) as unknown as HTMLCanvasElement);
const shifted=(pixels:Uint8Array|Uint8ClampedArray,dx:number,dy:number)=>transformRaster(new Uint8Array(pixels),width,height,{...initialTransform,dx,dy,interpolation:'nearest'});

describe('C07-003 native geometry mixed with image layers',()=>{
 beforeAll(()=>vi.stubGlobal('OffscreenCanvas',class {constructor(w:number,h:number){return createCanvas(w,h);}}));
 afterAll(()=>vi.unstubAllGlobals());
 it('matches all RGBA pixels for a shared translation and masked/clipped composition, then restores one Undo and portable data',async()=>{
   const doc=new CoreDocument({width,height}),a=doc.defaultRasterLayerId;
   let tx=doc.begin('sources');const b=tx.addRasterSnapshotAbove(a,paint(rect),'図形'),c=tx.addRasterSnapshotAbove(b,paint(text),'文字');
   tx.setEditableArtwork(b,rect);tx.setEditableArtwork(c,text);tx.commit();tx=doc.begin('source settings');tx.setLayerClipping(c,true);
   tx.setLayerOpacity(c,.6);tx.setLayerBlend(c,{mode:'multiply',space:'encoded',seed:0});
   const mask={shape:'rectangle' as const,x:14,y:12,width:15,height:18,enabled:true,inverted:false,density:.7,linked:true};
   tx.setVectorLayerMask(b,mask);tx.setPixel(a,18,19,[200,50,20,180]);tx.commit();
   const head=doc.head,before=doc.root;
   const settings=groupTransformPlan([a,b,c].map(id=>({id,bounds:{x:12,y:12,width:25,height:25}})),width,height,
     {dx:7,dy:9,sx:1,sy:1,angle:0,interpolation:'nearest'}).settings;
   const bp=editableGroupTransform(rect,settings),cp=editableGroupTransform(text,settings);
   expect(paint(bp)).toEqual(shifted(paint(rect),7,9));expect(paint(cp)).toEqual(shifted(paint(text),7,9));
   const bmask=transformLinkedMask(mask,settings,width,height);
   const compose=(root:typeof before)=>{
     const out=new Uint8ClampedArray(width*height*4);
     for(const id of root.rootLayerIds){
       const layer=root.getLayer(id),source=id===a?doc.readBaseRasterPixels(a,root===before?head:doc.head):
         paint(layer.editable!);
       const clip=layer.clipSourceId?root.getLayer(layer.clipSourceId):null;
       compositeLayer(out,source,layer.opacity,clip?{pixels:paint(clip.editable!),opacity:clip.opacity,mask:clip.vectorMask??null}:undefined,
         {width,mask:layer.vectorMask??null,blend:layer.blend??null});
     }return out;
   };
   const beforePixels=compose(before);
   const deformation:LayerDeformation={version:1,sourceRevision:head,bounds:{x:18,y:19,width:1,height:1},mode:'affine',
     interpolation:'nearest',selection:null,linkedMask:false,affine:{dx:7,dy:9,sx:1,sy:1,angle:0,shear:0,cx:0,cy:0}};
   tx=doc.begin('mixed group');tx.replaceLayerDeformationsBatch([
     {id:a,pixels:shifted(doc.readBaseRasterPixels(a),7,9),deformation},
     {id:b,pixels:paint(bp),content:bp},{id:c,pixels:paint(cp),content:cp}]);tx.setVectorLayerMask(b,bmask);tx.commit();
   expect(compose(doc.root)).toEqual(shifted(beforePixels,7,9));
   expect(doc.root.getLayer(c).clipSourceId).toBe(b);expect(doc.root.getLayer(c).blend).toEqual(before.getLayer(c).blend);
   expect(doc.root.getLayer(b).editable?.kind).toBe('path');expect(doc.root.getLayer(c).editable?.kind).toBe('text');
   const result=doc.head;doc.undo();expect(doc.head).toBe(head);doc.redo();expect(doc.head).toBe(result);
   const file=await createPortableDocument({document:doc,selectedLayerId:c});
   const opened=await openPortableDocument(file.bytes);
   for(const id of [a,b,c])expect(opened.document.readBaseRasterPixels(id)).toEqual(doc.readBaseRasterPixels(id));
   expect(opened.document.root.getLayer(b).editable).toEqual(bp);expect(opened.document.root.getLayer(c).editable).toEqual(cp);
   expect(opened.document.root.getLayer(b).vectorMask).toEqual(bmask);
 });
 it('composes repeated rotations and unequal scales from original vector/text data',()=>{
   for(const original of [rect,text]){
     const first=editableGroupTransform(original,{...initialTransform,cx:48,cy:48,sx:2,sy:.5,angle:90});
     const second=editableGroupTransform(first,{...initialTransform,cx:48,cy:48,sx:2,sy:.5,angle:-90});
     expect(original.kind==='path'&&second.kind==='path'?second.points:second.kind==='text'?second.text:null)
       .toEqual(original.kind==='path'?original.points:original.text);
     const back=second.kind!=='gradient'?mapArtworkPoint({x:19,y:23},second.transform):null;
     expect(back!.x).toBeCloseTo(19,9);expect(back!.y).toBeCloseTo(23,9);
     expect(paint(second)).toEqual(paint(original));
   }
 });
 it('keeps transformed points editable in canvas coordinates and new strokes at their intended location',()=>{
   const path:EditablePath={...rect,shape:'bezier',closed:false,fill:null,width:3,
     points:[{x:4,y:5,outX:7,outY:9,pressure:.2},{x:15,y:10,inX:12,inY:8,pressure:.8}]};
   const transformed=editableGroupTransform(path,{...initialTransform,dx:10,dy:7,sx:2,sy:3,angle:90}) as EditablePath;
   const moved=vectorPointDrag(transformed,0,2,[],mapArtworkPoint({x:6,y:8},transformed.transform));
   expect(moved.points[0]).toEqual({...path.points[0],x:6,y:8,outX:9,outY:12});
   const added=appendPathStroke(transformed,{...path,points:[{x:70,y:50,pressure:.2},{x:80,y:60,pressure:.7}]});
   expect(mapArtworkPoint(added.points[2]!,added.transform).x).toBeCloseTo(70,9);
   expect(mapArtworkPoint(added.points[3]!,added.transform).y).toBeCloseTo(60,9);
   expect(added.points[2]!.move).toBe(true);
 });
 it('recomputes linked Boolean geometry in world coordinates after source transformation',async()=>{
   const a='a' as LayerId,b='b' as LayerId,r='result' as LayerId;
   const other={...rect,points:[{x:25,y:12},{x:45,y:32}]};
   const result=await combineShapes(rect,other,'union');
   const source=editableGroupTransform(rect,{...initialTransform,dx:5}) as EditablePath;
   const updates=await linkedBooleanUpdates([{id:a,content:rect},{id:b,content:other},{id:r,content:{...result,booleanOperands:{...result.booleanOperands!,sourceLayerIds:[a,b]}}}],a,source);
   const expected=await combineShapes({...rect,points:rect.points.map(p=>({...p,x:p.x+5}))},other,'union');
   expect(updates[0]!.content.points).toEqual(expected.points);expect(updates[0]!.content.transform).toBeUndefined();
 });
 it('rejects invalid native matrices and unsupported native content without changing a work',()=>{
   for(const transform of [{a:0,b:0,c:0,d:0,e:0,f:0},{a:1,b:0,c:0,d:1,e:Infinity,f:0}])
     expect(()=>validateEditableArtwork({...rect,transform})).toThrow();
   expect(()=>editableGroupTransform({kind:'gradient',mode:'linear',start:{x:0,y:0},end:{x:10,y:0},
     stops:[{at:0,color:'#000000',opacity:1,midpoint:.5},{at:1,color:'#ffffff',opacity:1,midpoint:.5}]},initialTransform)).toThrow('専用画面');
   const doc=new CoreDocument({width,height}),id=doc.defaultRasterLayerId;
   const setup=doc.begin('editable original');setup.setEditableArtwork(id,rect);setup.commit();const head=doc.head;
   const tx=doc.begin('invalid batch');
   expect(()=>tx.replaceLayerDeformationsBatch([{id,pixels:paint(rect),content:rect},{id:'absent' as LayerId,pixels:paint(text),content:text}])).toThrow();
   tx.cancel();expect(doc.head).toBe(head);expect(doc.root.getLayer(id).editable).toEqual(rect);
 });
 it('marks transformed geometry as required file support and refuses missing support metadata',async()=>{
   const doc=new CoreDocument({width,height}),id=doc.defaultRasterLayerId;
   const tx=doc.begin('native transform');tx.setEditableArtwork(id,editableGroupTransform(rect,{...initialTransform,dx:5}));tx.commit();
   const file=await createPortableDocument({document:doc,selectedLayerId:id});
   const known=new Set(['document.core.v1','raster.block.v1','document.partial-raster.v1']);
   await expect(decodeIllustroFile(file.bytes,{knownRequiredTypes:known})).rejects.toThrow('unknown required');
   known.add('document.editable-affine.v1');const decoded=await decodeIllustroFile(file.bytes,{knownRequiredTypes:known});
   const sections=[...decoded.sections.values()].filter(s=>s.descriptor.type!=='document.editable-affine.v1')
     .map(s=>({id:s.descriptor.id,type:s.descriptor.type,required:s.descriptor.required,bytes:s.bytes}));
   const bytes=await encodeIllustroFile({...decoded.manifest,sections});
   await expect(openPortableDocument(bytes)).rejects.toThrow('変形情報');
 });
});
