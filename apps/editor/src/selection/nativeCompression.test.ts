import {beforeEach,describe,it,expect,vi} from 'vitest';
import type {PreservedPortableData} from '../persistence/portable';
import type {SavedSelection} from './store';

const state=vi.hoisted(()=>({saved:[] as unknown[]}));
vi.mock('./store',()=>({
  listSavedSelections:async()=>state.saved,
  saveNamedSelection:async(doc:string,name:string,mask:{width:number;height:number;alpha:Uint8Array})=>{
    const entry={
      id:'saved:'+name,documentId:doc,name,width:mask.width,height:mask.height,
      createdAt:0,modifiedAt:0,alpha:new Blob([mask.alpha.slice().buffer as ArrayBuffer])
    };
    state.saved.push(entry);return entry;
  }
}));
import {exportSelectionSections,importSelectionSections} from './native';

beforeEach(()=>{state.saved.length=0;});
describe('C06-006 .illustro native selection preservation',()=>{
  it('exports sparse active and named selections compactly and restores exact pixels',async()=>{
    const width=1024,height=1024,alpha=new Uint8Array(width*height);
    alpha[77]=255;alpha[200000]=125;alpha[width*height-1]=255;
    state.saved.push({
      id:'first',name:'細い線',documentId:'work',width,height,
      createdAt:123,modifiedAt:456,alpha:new Blob([alpha.slice().buffer as ArrayBuffer])
    } satisfies SavedSelection);
    const sections=await exportSelectionSections('work',width,height,{width,height,alpha});
    const active=sections.find(s=>s.id==='c06.selection.active');
    const named=sections.find(s=>s.id==='c06.selection.saved.first');
    expect(active?.type).toBe('selection.alpha.rle.v2');
    expect(named?.type).toBe('selection.alpha.rle.v2');
    expect(sections.reduce((sum,s)=>sum+s.bytes.byteLength,0)).toBeLessThan(25000);
    state.saved.length=0;
    const imported=await importSelectionSections(
      {manifestExtras:{},optionalSections:sections} as PreservedPortableData,
      'second-work',width,height
    );
    expect(imported).not.toBeUndefined();
    expect(imported?.alpha).toEqual(alpha);
    expect(state.saved).toHaveLength(1);
    const restored=state.saved[0] as SavedSelection;
    expect(new Uint8Array(await restored.alpha.arrayBuffer())).toEqual(alpha);
  });
  it('continues reading legacy raw v1 mask sections without conversion loss',async()=>{
    const alpha=Uint8Array.of(0,23,255,127),width=2,height=2;
    const index={schema:'illustro.selection',version:1,width,height,active:true,saved:[]};
    const sections=[
      {id:'c06.selection.active',type:'selection.alpha.v1',required:false,bytes:alpha},
      {id:'c06.selection.index',type:'selection.index.v1',required:false,
        bytes:new TextEncoder().encode(JSON.stringify(index))}
    ];
    const restored=await importSelectionSections(
      {manifestExtras:{},optionalSections:sections} as PreservedPortableData,'work',width,height
    );
    expect(restored?.alpha).toEqual(alpha);
  });
  it('rejects corrupt compressed selections rather than restoring incorrect pixels',async()=>{
    const alpha=Uint8Array.of(1,2,3,4),index={
      schema:'illustro.selection',version:1,width:2,height:2,active:true,saved:[]
    };
    const sections=[
      {id:'c06.selection.active',type:'selection.alpha.rle.v2',required:false,bytes:Uint8Array.of(255,0)},
      {id:'c06.selection.index',type:'selection.index.v1',required:false,
        bytes:new TextEncoder().encode(JSON.stringify(index))}
    ];
    await expect(importSelectionSections(
      {manifestExtras:{},optionalSections:sections} as PreservedPortableData,'work',2,2
    )).rejects.toThrow();
    expect(alpha).toHaveLength(4);
  });
});
