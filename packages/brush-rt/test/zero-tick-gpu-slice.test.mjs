import test from 'node:test';
import assert from 'node:assert/strict';
import {TileDocument,boundedFormalJobs} from '../dist/rt/renderer.mjs';

const fixture=()=>{
 const document=new TileDocument(512,512);
 const preset={__foundation:{solid:false}};
 const commands=Array.from({length:13},(_,i)=>{
  const c=Array(22).fill(0);c[20]=i;return c;
 });
 document.jobs.push({id:11,key:'0,0',surfaceKey:'layer-a',preset,commands,offset:0,commit:false});
 document.count=commands.length;
 return document;
};

test('four-command formal chunks preserve sequence across independent GPU submissions',()=>{
 const document=fixture();
 const first=boundedFormalJobs(document,Infinity,1,4);
 assert.deepEqual(first.map(j=>j.commands.map(c=>c[20])),[[0,1,2,3]]);
 document.complete(first[0]);
 assert.equal(document.count,9);
 assert.deepEqual(boundedFormalJobs(document,Infinity,2,4).map(j=>j.commands.map(c=>c[20])),[[4,5,6,7],[8,9,10,11]]);
 for(const part of boundedFormalJobs(document,Infinity,4,4))document.complete(part);
 assert.equal(document.count,0);
 assert.equal(document.jobs.length,0);
});

test('canonical jobs still support exact historical default sixteen-command chunk',()=>{
 const document=fixture();
 assert.equal(document.peekMany(1)[0].commands.length,13);
 assert.deepEqual(document.peekMany(4,4).map(j=>j.commands.length),[4,4,4,1]);
 assert.throws(()=>document.peekMany(1,0),/quantum/);
});
