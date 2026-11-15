import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CanonicalBuilder,validateRecord,referenceBrushes} from '../dist/rt/index.mjs';
function line({count=2,size=30,type='touch',pressure=.5,duration=100,length=300,adaptive=true}={}){
 const p=structuredClone(referenceBrushes[0]);p.size=size;p.stabilization.constant=p.stabilization.fast=0;
 const b=new CanonicalBuilder(p,[12,34],0,adaptive?{forceFadeGeometry:'adaptive-v1'}:{});
 for(let n=0;n<count;n++)b.accept({x:length*n/(count-1),y:40,t:duration*n/(count-1),pressure,pointerType:type});b.finish();return b.record();
}
const widthAt=(r,d)=>{const c=r.commands.find(c=>c[21]>=d)??r.commands.at(-1),previous=r.commands[Math.max(0,r.commands.indexOf(c)-1)],a=previous[21],f=c[21]>a?(d-a)/(c[21]-a):1;return c[18]*2+(c[2]-c[18]*2)*f;};
test('two-point finger strokes contain the full body and both configured pointed ends',()=>{
 for(const size of [4,30,64,512])for(const length of [5,30,300,5000]){
  const r=line({size,length});assert.ok(Math.max(...r.commands.map(c=>c[2]))>=size*.99);
  assert.ok(r.commands[0][2]<=size*.031);assert.ok(r.commands.at(-1)[2]<=size*.031);
  for(let i=1;i<r.commands.length;i++){assert.equal(r.commands[i][16],r.commands[i-1][0]);assert.equal(r.commands[i][17],r.commands[i-1][1]);assert.equal(r.commands[i][18]*2,r.commands[i-1][2]);}
  assert.deepEqual(validateRecord(r),r);assert.equal(r.raw.length,2);
 }
});
test('forced solid contours are consistent across sparse/dense input, device, pressure and duration',()=>{
 for(const size of [4,30,512]){const sparse=line({size}),dense=line({size,count:101});
  for(let d=0;d<=300;d+=.5)assert.ok(Math.abs(widthAt(sparse,d)-widthAt(dense,d))<.41,`profile ${size}/${d}`);
  for(const type of ['touch','pen','mouse'])for(const pressure of [0,.5,1])for(const duration of [30,3000]){
   const r=line({size,type,pressure,duration});assert.deepEqual(r.commands.map(c=>[c[0],c[1],c[2],c[18]]),sparse.commands.map(c=>[c[0],c[1],c[2],c[18]]));
  }
 }
});
test('pre-adaptive saved forced strokes replay byte for byte without adopting the new shape',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-adaptive-force-fade.json',import.meta.url),'utf8'));
 assert.equal(fixture.source,'45d93027eabdd3d17fd74db185146c2533994f51');assert.deepEqual(validateRecord(fixture.record),fixture.record);
 const old=line({adaptive:false});assert.equal(old.commands.length,2);assert.ok(Math.max(...old.commands.map(c=>c[2]))<1);
});
