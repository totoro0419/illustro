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
