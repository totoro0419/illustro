import test from 'node:test';
import assert from 'node:assert/strict';
import {DrawingSessionPort} from '../dist/rt/drawing-host.mjs';

test('C06-001: drawing port forwards selected-stroke preview suppression to the drawing worker',()=>{
  const sent=[],host={backend:{viewTransform:null},send:(method,args)=>sent.push({method,args})};
  const session=new DrawingSessionPort(host);
  session.begin({id:'brush'},0,{},'selected-layer',false);
  assert.equal(sent.length,1);
  assert.equal(sent[0].method,'begin');
  assert.equal(sent[0].args.showPreview,false);
});
test('ordinary strokes retain preview by default',()=>{
  const sent=[],host={backend:{viewTransform:null},send:(method,args)=>sent.push({method,args})};
  const session=new DrawingSessionPort(host);
  session.begin({id:'brush'},0,{},'ordinary-layer');
  assert.equal(sent[0].args.showPreview,true);
});

test('C06-001: a selection is uploaded once per immutable alpha reference',()=>{
 const sent=[],host={backend:{viewTransform:null},send:(method,args)=>sent.push({method,args})};
 const session=new DrawingSessionPort(host);
 const selection={width:4,height:4,alpha:new Uint8Array(16).fill(128)};
 session.begin({id:'brush'},0,{},'layer',true,selection);
 session.active=null;
 session.begin({id:'brush'},0,{},'layer',true,selection);
 assert.equal(sent[0].args.selection.alpha,selection.alpha);
 assert.equal(sent[1].args.selection.alpha,undefined);
 assert.equal(sent[0].args.selection.id,sent[1].args.selection.id);
 assert.equal(sent[1].args.showPreview,true);
});
