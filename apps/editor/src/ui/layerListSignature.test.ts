import {describe,it,expect} from 'vitest';
import {layerListSignature} from './layerListSignature';

describe('C03-013 layer list redraw key',()=>{
  const base={
    documentId:'doc',selectedId:'layer-1',documentReady:true,
    batchMode:false,batchIds:[],collapsedGroups:[],query:'',tagFilter:'',kindFilter:'',
    groups:[],rows:[['layer-1','Drawing',true,false,false]],
  };
  it('stays unchanged across ink-only revisions with identical displayed metadata',()=>{
    expect(layerListSignature(base)).toBe(layerListSignature({...base,rows:[...base.rows.map(x=>[...x])]}));
  });
  it('invalidates when selection, visibility or grouping changes',()=>{
    const original=layerListSignature(base);
    expect(layerListSignature({...base,selectedId:'layer-2'})).not.toBe(original);
    expect(layerListSignature({...base,rows:[['layer-1','Drawing',false,false,false]]})).not.toBe(original);
    expect(layerListSignature({...base,groups:[['group','Name',['layer-1'],true,false]]})).not.toBe(original);
  });
  it('invalidates when filtering, batch selection or collapse changes',()=>{
    const original=layerListSignature(base);
    expect(layerListSignature({...base,query:'draw'})).not.toBe(original);
    expect(layerListSignature({...base,batchIds:['layer-1'],batchMode:true})).not.toBe(original);
    expect(layerListSignature({...base,collapsedGroups:['group']})).not.toBe(original);
  });
});
