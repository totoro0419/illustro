import {CoreDocument} from '@illustro/core';
import {exportPalette,rgb} from './color/model';
import {expect,it} from 'vitest';
import {resolveDocumentDimensions,pixelToMillimeters,listCreationTemplates,storeCreationTemplate,removeCreationTemplate} from './documentSetup';
it('converts A4 millimeter values to precise pixel dimensions',()=>{
 expect(resolveDocumentDimensions(210,297,'mm',300)).toEqual({width:2480,height:3508,dpi:300});
 expect(pixelToMillimeters(2480,300)).toBeCloseTo(2480*25.4/300,5);
 expect(resolveDocumentDimensions(pixelToMillimeters(8191,2400),pixelToMillimeters(384,2400),'mm',2400))
  .toEqual({width:8191,height:384,dpi:2400});
});
it('rejects silent truncation and invalid documents',()=>{
 expect(()=>resolveDocumentDimensions(1.5,30,'px',72)).toThrow();
 expect(()=>resolveDocumentDimensions(210,297,'mm',0)).toThrow();
 expect(()=>resolveDocumentDimensions(9000,10,'px',300)).toThrow();
 expect(()=>resolveDocumentDimensions(.01,10,'mm',72)).toThrow();
});
it('saves independent reusable templates and handles corrupt local data',()=>{
 const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
 storeCreationTemplate(storage,{name:'A4',width:2480,height:3508,dpi:300,background:'white'});
 storeCreationTemplate(storage,{name:'A4',width:1000,height:1000,dpi:300,background:'transparent'});
 expect(listCreationTemplates(storage)).toHaveLength(1);
 expect(listCreationTemplates(storage)[0]?.width).toBe(1000);
 removeCreationTemplate(storage,'A4');
 expect(listCreationTemplates(storage)).toEqual([]);
 values.set('illustro.creation-templates.v1','[{"name":"invalid","width":99999,"height":1,"dpi":72,"background":"white"}]');
 expect(listCreationTemplates(storage)).toEqual([]);
});

it('copies only selected document options and retains the original background after a reload',()=>{
 const values=new Map<string,string>();
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
 const palette=exportPalette({id:'work',name:'作品のパレット',swatches:[{id:'test',color:rgb(.2,.4,.6),tags:[]}]});
 const guides=[{id:'g1',name:'基準線',kind:'straight' as const,origin:{x:0,y:0},
   vanishing:[{x:1,y:1},{x:2,y:2}],activeAxis:0,angle:0,rx:1,ry:1,spacing:8,strength:1,range:0,
   enabled:true,locked:false,applyEraser:false}];
 const content={guides,palette,title:'元作品',author:'作者'};
 storeCreationTemplate(storage,{name:'見本',width:64,height:32,dpi:300,background:'white',content});
 const saved=listCreationTemplates(storage)[0]!;
 expect(saved.content).toEqual(content);
 const doc=new CoreDocument({width:saved.width,height:saved.height,creationBackground:saved.background,artworkGuides:guides});
 const snapshot=doc.capturePersistenceSnapshot();
 const reopened=CoreDocument.restore({snapshot,blockPayloads:doc.persistenceBlockPayloads(snapshot)});
 expect(reopened.root.metadata.creationBackground).toBe('white');
 expect(reopened.root.artworkGuides).toEqual(guides);
});
