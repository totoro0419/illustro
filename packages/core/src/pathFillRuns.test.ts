import {describe,expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {validateEditableArtwork,moveEditableArtwork,type EditablePath} from './editableArtwork';
const path:EditablePath={kind:'path',shape:'bezier',closed:false,width:0,stroke:'#ff0000',fill:'#ff0000',
 points:[{x:0,y:0,move:true},{x:10,y:0},{x:10,y:10},{x:0,y:10,close:true},
 {x:20,y:0,move:true},{x:30,y:0},{x:30,y:10},{x:20,y:10,close:true}],
 fillRuns:[{start:0,end:4,color:'#ff0000'},{start:4,end:8,color:'#0000ff'}]};
describe('C10-012 ordered multicolor outlines',()=>{
 it('retains glyph colors through point movement, Undo/Redo and persistent restoration',()=>{
  const checked=validateEditableArtwork(path) as EditablePath;
  expect(Object.isFrozen(checked.fillRuns)).toBe(true);
  const moved=moveEditableArtwork(checked,5,7) as EditablePath;
  expect(moved.fillRuns).toEqual(path.fillRuns);expect(moved.points[4]!.x).toBe(25);
  const doc=new CoreDocument({width:64,height:64}),id=doc.defaultRasterLayerId;
  const tx=doc.begin('multicolor outline');tx.setEditableArtwork(id,moved);tx.commit();
  doc.undo();expect(doc.root.getLayer(id).editable).toBeUndefined();doc.redo();
  const snapshot=doc.capturePersistenceSnapshot();
  const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(snapshot)),blockPayloads:doc.persistenceBlockPayloads(snapshot)});
  expect(restored.root.getLayer(id).editable).toEqual(moved);
 });
 it('rejects gaps, overlap, invalid colors and ranges cutting through a connected contour',()=>{
  for(const fillRuns of [[],[{start:0,end:4,color:'#bad'}],
   [{start:0,end:4,color:'#ff0000'},{start:3,end:8,color:'#0000ff'}],
   [{start:0,end:3,color:'#ff0000'},{start:3,end:8,color:'#0000ff'}]])
   expect(()=>validateEditableArtwork({...path,fillRuns})).toThrow();
  const {fillRuns:_,...legacy}=path;expect(validateEditableArtwork(legacy)).toEqual(legacy);
 });
});
