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
