import {describe,expect,it} from 'vitest';
import {CoreDocument} from './coreDocument';
import {moveEditableArtwork,validateEditableArtwork,type EditablePath} from './editableArtwork';
import {createDeterministicIdFactory} from './ids';

const rect=(x:number):EditablePath=>({
  kind:'path',shape:'rectangle',points:[{x,y:2},{x:x+20,y:22}],
  closed:true,stroke:'#123456',fill:'#123456',width:2
});

describe('C10 backwards-compatible vector data',()=>{
  it('reads older path data and multiple discontinuous strokes without a migration',()=>{
    const legacy:EditablePath={kind:'path',shape:'freehand',closed:false,stroke:'#112233',fill:null,width:4,
      points:[{x:1,y:2},{x:3,y:4},{x:10,y:11,move:true},{x:13,y:15}]};
    const checked=validateEditableArtwork(JSON.parse(JSON.stringify(legacy)));
    expect(checked).toEqual(legacy);
    expect(checked?.kind==='path'&&checked.points[2]?.move).toBe(true);
    if(!checked)throw Error('missing artwork');
    const moved=moveEditableArtwork(checked,6,-1);
    expect(moved.kind==='path'&&moved.points[2]?.x).toBe(16);
    expect(moved.kind==='path'&&moved.points[2]?.move).toBe(true);
  });
  it('preserves original boolean operands through validation and translation',()=>{
    const a=rect(0),b=rect(10);
    const composed:EditablePath={...rect(0),shape:'polyline',closed:false,
      points:[{x:0,y:2,move:true},{x:30,y:2},{x:30,y:22},{x:0,y:22,close:true}],
      booleanOperands:{mode:'union',a,b}};
    const validated=validateEditableArtwork(JSON.parse(JSON.stringify(composed)));
    expect(validated?.kind).toBe('path');
    if(validated?.kind!=='path')throw Error('not a path');
    expect(validated.booleanOperands?.a).toEqual(a);
    const moved=moveEditableArtwork(validated,5,7);
    expect(moved.kind==='path'&&moved.booleanOperands?.a.points[0]?.x).toBe(5);
    expect(moved.kind==='path'&&moved.booleanOperands?.b.points[0]?.y).toBe(9);
    expect(moved.kind==='path'&&moved.points[0]?.y).toBe(9);
    expect(()=>validateEditableArtwork({...composed,booleanOperands:{
      mode:'union',a:{...a,booleanOperands:composed.booleanOperands},b}})).toThrow();
  });
  it('keeps editable operand snapshots across save, undo, redo, and restore',()=>{
    const doc=new CoreDocument({width:64,height:64,ids:createDeterministicIdFactory()});
    const layer=doc.defaultRasterLayerId,base=doc.head;
    const content:EditablePath={...rect(0),booleanOperands:{mode:'intersection',a:rect(0),b:rect(8)}};
    const change=doc.begin('vector Boolean');change.setEditableArtwork(layer,content);change.commit();
    const committed=doc.head;
    expect(doc.root.getLayer(layer).editable).toEqual(validateEditableArtwork(content));
    doc.undo();expect(doc.head).toBe(base);
    expect(doc.root.getLayer(layer).editable).toBeNull();
    doc.redo();expect(doc.head).toBe(committed);
    const snapshot=doc.capturePersistenceSnapshot();
    const restored=CoreDocument.restore({snapshot:JSON.parse(JSON.stringify(snapshot)),blockPayloads:doc.persistenceBlockPayloads(snapshot)});
    expect(restored.root.getLayer(layer).editable).toEqual(validateEditableArtwork(content));
  });
});
