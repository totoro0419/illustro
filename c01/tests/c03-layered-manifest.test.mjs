import test from 'node:test';
import assert from 'node:assert/strict';
import {createLayeredManifest,readLayeredManifest} from '../app/layered-manifest.mjs';
import {createManifest} from '../app/model.mjs';
const meta={name:'Test',width:16,height:16,dpi:300};
const png='data:image/png;base64,AA==';
const layer=id=>({id,type:'raster',name:id,visible:true,opacity:1,png});
test('v3 multilayer manifest roundtrip',()=>{
 const a=createLayeredManifest(meta,[layer('a'),layer('b')],7);
 assert.equal(a.formatVersion,3);
 assert.equal(readLayeredManifest(JSON.stringify(a)).layers.length,2);
 assert.equal(a.savedRevision,7);
});
test('legacy C01 manifest remains readable',()=>{
 const legacy=createManifest(meta,png,1);
 assert.equal(readLayeredManifest(legacy).formatVersion,1);
});
test('duplicate nested layer ids are rejected',()=>{
 const group={id:'g',type:'group',name:'Group',visible:true,opacity:1,children:[layer('a')]};
 assert.throws(()=>createLayeredManifest(meta,[group,layer('a')],1),/duplicate/);
});
test('invalid opacity and malformed raster are rejected',()=>{
 assert.throws(()=>createLayeredManifest(meta,[{...layer('a'),opacity:2}],1),/opacity/);
 assert.throws(()=>createLayeredManifest(meta,[{...layer('a'),png:'broken'}],1),/PNG/);
});
