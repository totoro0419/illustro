import {describe,it,expect} from 'vitest';
import {initialImportRecovery,updateImportRecovery,validateImportRecovery} from './assetImportRecovery';
import type {PackManifest} from './packs';

const pack:PackManifest={schema:'illustro.asset-pack',version:1,createdAt:1,items:[
  {id:'first',name:'A',kind:'reference',folder:'',tags:[],license:'',origin:'',notes:'',
    mime:'image/png',bytes:1,dataBase64:'AQ==',version:1},
  {id:'second',name:'B',kind:'reference',folder:'',tags:[],license:'',origin:'',notes:'',
    mime:'image/png',bytes:1,dataBase64:'Ag==',version:1,parentId:'first'}
]};
describe('C05-015 import recovery checkpoints',()=>{
  it('retains all source bytes and records the precise uncompleted IDs',()=>{
    const start=initialImportRecovery(pack);
    expect(start.remainingIds).toEqual(['first','second']);
    const mapped=updateImportRecovery(start,{resolvedIds:{first:'generated-1',second:'generated-2'}});
    const next=updateImportRecovery(mapped,{importedId:'first'});
    expect(next.remainingIds).toEqual(['second']);
    expect(next.manifest.items).toEqual(pack.items);
    expect(next.resolvedIds).toMatchObject({first:'generated-1',second:'generated-2'});
    expect(validateImportRecovery(next).remainingIds).toEqual(['second']);
  });
  it('rejects duplicate, unrelated and malformed recovery IDs rather than losing import progress',()=>{
    const start=initialImportRecovery(pack);
    expect(()=>validateImportRecovery({...start,remainingIds:['first','first']})).toThrow();
    expect(()=>validateImportRecovery({...start,remainingIds:['unknown']})).toThrow();
    expect(()=>validateImportRecovery({...start,resolvedIds:{unknown:'target'}})).toThrow();
    expect(()=>validateImportRecovery({...start,resolvedIds:{first:''}})).toThrow();
    expect(()=>validateImportRecovery({...start,resolvedIds:{first:'same',second:'same'}})).toThrow();
  });
});
