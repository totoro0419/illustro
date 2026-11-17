import {describe,it,expect,vi} from 'vitest';
const vault=vi.hoisted(()=>new Map<string,Record<string,any>>());
vi.mock('./library',()=>({
  ASSET_KINDS:['reference'],
  listAssets:async()=>[...vault.values()],
  getAsset:async(id:string)=>vault.get(id)??null,
  addAsset:async(spec:Record<string,any>)=>{
    if(vault.has(spec.id))throw Error('existing ID');
    const entry={...spec,deleted:false,bytes:spec.data.size,mime:spec.data.type};
    vault.set(spec.id,entry);
    return entry;
  }
}));
import {importAssetPack,readAssetPack} from './packs';

async function source(){
  return readAssetPack(new Blob([JSON.stringify({
    schema:'illustro.asset-pack',version:1,createdAt:0,items:[
      {id:'one',kind:'reference',name:'first',folder:'',tags:[],
        license:'',origin:'',notes:'',mime:'image/png',bytes:2,dataBase64:'AQI=',version:1},
      {id:'two',kind:'reference',name:'second',folder:'',tags:[],
        license:'',origin:'',notes:'',mime:'image/png',bytes:2,dataBase64:'AwQ=',version:2,parentId:'one'}
    ]
  })]));
}
describe('C05-015 crash-safe resume of asset packs',()=>{
  it('recognizes an already-saved first item by its exact bytes instead of duplicating it',async()=>{
    vault.clear();
    const manifest=await source();
    let mapping:Readonly<Record<string,string>>={};
    await expect(importAssetPack(manifest,{
      onResolvedIds:ids=>{mapping={...ids};},
      onItemSucceeded:id=>{if(id==='one')throw Error('simulated tab close');}
    })).rejects.toThrow('simulated tab close');
    expect(vault.size).toBe(1);
    const recovered=await importAssetPack(manifest,{
      resolvedIds:mapping,onlyIds:['one','two'],resumeExisting:true
    });
    expect(recovered.failures).toEqual([]);
    expect(vault.size).toBe(2);
    expect(vault.get(recovered.renamedIds.two!)?.parentId).toBe(recovered.renamedIds.one);
  });
  it('never treats an asset with altered bytes as a valid recovered import',async()=>{
    vault.clear();
    const manifest=await source();
    vault.set('one',{
      id:'one',kind:'reference',name:'first',deleted:false,version:1,
      mime:'image/png',bytes:2,data:new Blob([Uint8Array.of(9,9)],{type:'image/png'})
    });
    const result=await importAssetPack(manifest,{
      onlyIds:['one'],resolvedIds:{one:'one',two:'two'},resumeExisting:true
    });
    expect(result.failedIds).toEqual(['one']);
    expect(vault.size).toBe(1);
    expect(new Uint8Array(await vault.get('one')!.data.arrayBuffer())).toEqual(Uint8Array.of(9,9));
  });
});
