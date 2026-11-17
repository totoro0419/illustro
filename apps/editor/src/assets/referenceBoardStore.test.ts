import {describe,it,expect} from 'vitest';
import {decodeBoardRecord,newBoardItem} from './referenceBoardStore';

describe('C05 reference-board data safety',()=>{
  const doc='test-document';
  const valid=()=>({version:1,documentId:doc,hidden:false,items:[newBoardItem('image-1',0)]});
  it('treats only an absent record as an empty reference board',()=>{
    expect(decodeBoardRecord(doc,undefined)).toEqual({version:1,documentId:doc,hidden:false,items:[]});
    expect(()=>decodeBoardRecord(doc,null)).toThrow();
    expect(()=>decodeBoardRecord(doc,{version:2,documentId:doc,items:[]})).toThrow();
    expect(()=>decodeBoardRecord(doc,{version:1,documentId:'other',items:[]})).toThrow();
  });
  it('keeps every valid image reference and its position',()=>{
    const first=newBoardItem('image-1',0),second=newBoardItem('image-2',1);
    const result=decodeBoardRecord(doc,{version:1,documentId:doc,hidden:true,items:[first,second]});
    expect(result.items).toHaveLength(2);
    expect(result.items.map(item=>item.assetId)).toEqual(['image-1','image-2']);
    expect(result.items[1]?.x).toBe(second.x);
    expect(result.hidden).toBe(true);
  });
  it('preserves a reference resized wider than 1000px after reload',()=>{
    const original=newBoardItem('large-reference',0);
    const record=valid();
    const result=decodeBoardRecord(doc,{...record,items:[{
      ...original,width:1840,height:1150,x:750,zoom:1.4
    }]});
    expect(result.items[0]).toMatchObject({width:1840,height:1150,x:750,zoom:1.4});
  });
  it('rejects damaged visibility flags instead of treating a string as true',()=>{
    const record=valid(),original=record.items[0]!;
    expect(()=>decodeBoardRecord(doc,{...record,hidden:'false'})).toThrow();
    expect(()=>decodeBoardRecord(doc,{...record,items:[{...original,pinned:'false'}]})).toThrow();
  });
  it('refuses partial, duplicate, invalid and oversized records rather than silently erasing images',()=>{
    const record=valid(),first=record.items[0]!;
    expect(()=>decodeBoardRecord(doc,{...record,items:[first,{...first}]})).toThrow();
    expect(()=>decodeBoardRecord(doc,{...record,items:[{...first,assetId:''}]})).toThrow();
    expect(()=>decodeBoardRecord(doc,{...record,items:[{...first,zoom:NaN}]})).toThrow();
    expect(()=>decodeBoardRecord(doc,{...record,items:[{...first,panX:Infinity}]})).toThrow();
    expect(()=>decodeBoardRecord(doc,{...record,items:[{...first,group:{unexpected:true}}]})).toThrow();
    expect(()=>decodeBoardRecord(doc,{...record,items:[{...first,width:0}]})).toThrow();
    expect(()=>decodeBoardRecord(doc,{...record,items:[{...first,x:undefined}]})).toThrow();
    expect(()=>decodeBoardRecord(doc,{...record,items:Array.from({length:81},(_,n)=>({...first,id:String(n)}))})).toThrow();
  });
});
