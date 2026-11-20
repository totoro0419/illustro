import {afterEach,describe,expect,it,vi} from 'vitest';
import {CoreDocument,validateEditableArtwork,type DocumentRoot,type EditableText} from '@illustro/core';
import {applyTextSelectionStyle,layoutStyledText,rebaseTextStyles,textFontAssetIds} from './textStyles';
import {exportFonts,importFonts} from './fontAttachments';
import {getAsset,addAsset,type AssetEntry} from '../assets/library';
import type {PreservedPortableData} from '../persistence/portable';
vi.mock('../assets/library',()=>({getAsset:vi.fn(),addAsset:vi.fn(),listAssets:vi.fn()}));
afterEach(()=>vi.unstubAllGlobals());
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const base:EditableText={kind:'text',text:'ABCD',origin:{x:4,y:4},size:20,family:'sans-serif',
 color:'#123456',vertical:false,align:'left',spacing:0,lineHeight:1.2};
describe('C10-009 imported fonts in selected text',()=>{
 it('keeps per-range font identities through replacement, Undo/Redo and file restoration',()=>{
  const ranges=applyTextSelectionStyle(base.text,[],1,3,{fontAsset:a});
  const text={...base,text:'ABxCD',styleRanges:rebaseTextStyles(base.text,'ABxCD',ranges)};
  const checked=validateEditableArtwork(text) as EditableText;
  expect(textFontAssetIds(checked)).toEqual([a]);
  const families:string[]=[];
  layoutStyledText(checked,(_c,size,_b,_i,family)=>{families.push(family);return size;});
  expect(families).toEqual(['sans-serif','IllustroFont-'+a,'IllustroFont-'+a,'IllustroFont-'+a,'sans-serif']);
  const doc=new CoreDocument({width:64,height:64}),id=doc.defaultRasterLayerId;
  const tx=doc.begin('partial font');tx.setEditableArtwork(id,checked);tx.commit();
  doc.undo();expect(doc.root.getLayer(id).editable).toBeUndefined();doc.redo();
  const snapshot=doc.capturePersistenceSnapshot();
  const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(snapshot)),blockPayloads:doc.persistenceBlockPayloads(snapshot)});
  expect(restored.root.getLayer(id).editable).toEqual(checked);
  const reset=applyTextSelectionStyle(checked.text,checked.styleRanges!,1,4,{family:'serif',fontAsset:null});
  expect(textFontAssetIds({...checked,styleRanges:reset})).toEqual([]);
 });
 it('embeds and imports all partial fonts even if the base uses a generic font',async()=>{
  const text={...base,embedFont:true,styleRanges:[{start:0,end:1,fontAsset:a},{start:1,end:3,fontAsset:b},{start:3,end:4,fontAsset:a}]} as EditableText;
  const approved=validateEditableArtwork(text) as EditableText;
  expect(approved.embedFont).toBe(true);expect(textFontAssetIds(approved)).toEqual([a,b]);
  const root={rootLayerIds:['layer'],getLayer:()=>({editable:approved})} as unknown as DocumentRoot;
  vi.mocked(getAsset).mockImplementation(async id=>({id,kind:'font',name:id+'.woff2',data:new Blob(['font-'+id])} as AssetEntry));
  const sections=await exportFonts(root);
  expect(sections.map(s=>s.id)).toEqual(['c10.font.'+a,'c10.font.'+b]);
  vi.mocked(getAsset).mockResolvedValue(null);
  vi.mocked(addAsset).mockClear();
  vi.stubGlobal('FontFace',class {async load(){return this;}});
  const add=vi.fn();vi.stubGlobal('document',{fonts:{add}});
  await importFonts(root,{optionalSections:sections} as unknown as PreservedPortableData);
  expect(addAsset).toHaveBeenCalledTimes(2);expect(add).toHaveBeenCalledTimes(2);
 });
 it('rejects invalid imported-font identities rather than dropping them on save',()=>{
  for(const fontAsset of ['',42,{},'x'.repeat(129)])
   expect(()=>validateEditableArtwork({...base,styleRanges:[{start:0,end:1,fontAsset}]})).toThrow();
 });
});
