import {expect,it} from 'vitest';
import {resolveDocumentDimensions,pixelToMillimeters,listCreationTemplates,storeCreationTemplate,removeCreationTemplate} from './documentSetup';
it('converts A4 millimeter values to precise pixel dimensions',()=>{
 expect(resolveDocumentDimensions(210,297,'mm',300)).toEqual({width:2480,height:3508,dpi:300});
 expect(pixelToMillimeters(2480,300)).toBe(209.97);
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
