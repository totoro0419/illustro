import {expect,it,vi} from 'vitest';
import {importAssetPack,readAssetPack} from './packs';

const stored=vi.hoisted(()=>new Map<string,{id:string;parentId?:string;version?:number}>());

vi.mock('./library',()=>({
  ASSET_KINDS:['raster'],
  listAssets:async()=>[...stored.values()],
  getAsset:async(id:string)=>stored.get(id)??null,
  addAsset:async(asset:{id:string;parentId?:string;version?:number})=>{
    stored.set(asset.id,asset);
    return asset;
  },
  addAssetsAtomically:async(assets:readonly {id:string;name:string;parentId?:string;version?:number}[])=>{
    // Simulate the all-or-nothing IndexedDB transaction on a write failure.
    if(assets.some(item=>item.name==='QuotaFailure'))throw Error('disk quota');
    for(const asset of assets)stored.set(asset.id,asset);
    return assets;
  }
}));

it('restores a legacy asset ID and a newer asset that refers to it',async()=>{
  const fields={kind:'raster',folder:'',tags:[],license:'',origin:'',notes:'',
    mime:'image/png',bytes:1,dataBase64:'AA=='};
  const manifest=await readAssetPack(new Blob([JSON.stringify({
    schema:'illustro.asset-pack',version:1,createdAt:0,items:[
      {...fields,id:'__proto__',name:'Original'},
      {...fields,id:'constructor',name:'Updated',parentId:'__proto__',version:2}
    ]
  })]));
  const result=await importAssetPack(manifest);
  expect(result.failures).toEqual([]);
  expect(result.unresolvedParents).toEqual([]);
  expect(result.renamedIds['__proto__']).toBe('__proto__');
  expect(result.renamedIds['constructor']).toBe('constructor');
  expect(stored.get('__proto__')?.version).toBe(1);
  expect(stored.get('constructor')).toMatchObject({parentId:'__proto__',version:2});
});

it('imports a reference pack atomically with intact old-version links',async()=>{
  stored.clear();
  const fields={kind:'raster',folder:'',tags:[],license:'',origin:'',notes:'',
    mime:'image/png',bytes:1,dataBase64:'AA=='};
  const manifest=await readAssetPack(new Blob([JSON.stringify({
    schema:'illustro.asset-pack',version:1,createdAt:0,items:[
      {...fields,id:'ref-v1',name:'original',version:1},
      {...fields,id:'ref-v2',name:'revision',parentId:'ref-v1',version:2},
    ]
  })]));
  const result=await importAssetPack(manifest,{atomic:true});
  expect(result.failedIds).toEqual([]);
  expect(result.unresolvedParents).toEqual([]);
  expect(stored.get(result.renamedIds['ref-v2']!)).toMatchObject({
    version:2,parentId:result.renamedIds['ref-v1'],
  });
});

it('leaves no imported assets if any batched write fails',async()=>{
  stored.clear();
  const fields={kind:'raster',folder:'',tags:[],license:'',origin:'',notes:'',
    mime:'image/png',bytes:1,dataBase64:'AA=='};
  const manifest=await readAssetPack(new Blob([JSON.stringify({
    schema:'illustro.asset-pack',version:1,createdAt:0,items:[
      {...fields,id:'safe-item',name:'normal'},
      {...fields,id:'failed-item',name:'QuotaFailure'},
    ]
  })]));
  await expect(importAssetPack(manifest,{atomic:true})).rejects.toThrow('disk quota');
  expect(stored.has('safe-item')).toBe(false);
  expect(stored.has('failed-item')).toBe(false);
});
