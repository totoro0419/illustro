import {describe,it,expect} from 'vitest';
import {CoreDocument} from './coreDocument';
import {createDeterministicIdFactory} from './ids';

function setup(){
  const doc=new CoreDocument({width:8,height:8,ids:createDeterministicIdFactory()});
  const base=doc.defaultRasterLayerId;
  const tx=doc.begin('setup group layers');
  const a=tx.addRasterLayerAbove(base);
  const b=tx.addRasterLayerAbove(a);
  const c=tx.addRasterLayerAbove(b);
  tx.commit();
  return {doc,base,a,b,c};
}
describe('C03-011 non-adjacent layer grouping',()=>{
  it('packs selected layers in one revision after explicit approval; Undo/Redo and persistence preserve order',()=>{
    const {doc,base,a,b,c}=setup();
    const original=[base,a,b,c];
    const tx=doc.begin('group selected');
    expect(tx.createLayerGroup(new Set([a,c]),'まとめ',true)).toBe(true);
    tx.commit();
    expect(doc.root.rootLayerIds).toEqual([base,a,c,b]);
    expect(doc.root.layerGroups.some(group=>group.name==='まとめ'&&group.members.join()===a+','+c)).toBe(true);
    doc.undo();
    expect(doc.root.rootLayerIds).toEqual(original);
    expect(doc.root.layerGroups).toHaveLength(0);
    doc.redo();
    expect(doc.root.rootLayerIds).toEqual([base,a,c,b]);
    const saved=doc.capturePersistenceSnapshot();
    const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(saved)),blockPayloads:doc.persistenceBlockPayloads(saved)});
    expect(restored.root.rootLayerIds).toEqual([base,a,c,b]);
    expect(restored.root.layerGroups[0]?.members).toEqual([a,c]);
  });
  it('rejects nonadjacent grouping without approval, without committing a change',()=>{
    const {doc,base,a,b,c}=setup();
    const before=doc.head;
    const tx=doc.begin('group without confirmation');
    expect(()=>tx.createLayerGroup(new Set([a,c]),'まとめ')).toThrow(/重なり順/);
    tx.cancel();
    expect(doc.head).toBe(before);
    expect(doc.root.rootLayerIds).toEqual([base,a,b,c]);
  });
  it('keeps an existing inner group intact and rejects any packing that would split it',()=>{
    const {doc,a,b,c}=setup();
    const setupGroup=doc.begin('existing group');
    setupGroup.createLayerGroup(new Set([a,b]),'元のグループ');
    setupGroup.commit();
    const before=doc.head;
    const attempt=doc.begin('unsafe group');
    expect(()=>attempt.createLayerGroup(new Set([a,c]),'新しいグループ',true)).toThrow(/既存グループ/);
    attempt.cancel();
    expect(doc.head).toBe(before);
    expect(doc.root.layerGroups).toHaveLength(1);
  });
});
