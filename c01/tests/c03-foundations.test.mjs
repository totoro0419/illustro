import test from 'node:test';
import assert from 'node:assert/strict';
import {RevisionGraph} from '../app/revision-graph.mjs';
import {createLayerTree,addRasterLayer,selectLayer,freezeDrawTarget,assertDrawTarget,setLayerOpacity,setLayerVisibility} from '../app/layer-tree.mjs';

test('revision graph: undo, redo and new branch preserve pinned roots',()=>{
 const h=new RevisionGraph(Object.freeze({v:0}));
 h.accept(Object.freeze({v:1}),'A');
 const a=h.cursor;
 h.snapshot('original');
 h.accept(Object.freeze({v:2}),'B');
 assert.equal(h.current.root.v,2);
 assert.equal(h.undo(),true);
 assert.equal(h.current.root.v,1);
 h.branch('alternate');
 h.checkout('alternate');
 h.accept(Object.freeze({v:3}),'C');
 assert.equal(h.current.root.v,3);
 assert.equal(h.snapshots.get('original').revision,a);
 assert.equal(h.inspect(a).root.v,1);
 assert.equal(h.redo(),false);
 h.checkout('main');
 assert.equal(h.current.root.v,2);
});
test('save fence keeps the accepted root across later edits',()=>{
 const h=new RevisionGraph(Object.freeze({v:0}));
 h.accept(Object.freeze({v:1}),'A');
 const fence=h.saveFence();
 h.accept(Object.freeze({v:2}),'B');
 assert.equal(fence.root.v,1);
 assert.equal(fence.revision,1);
 assert.equal(h.current.root.v,2);
});
test('layer draw target is frozen independently of selection',()=>{
 const tree=createLayerTree();
 const a=addRasterLayer(tree,'A');
 const frozen=freezeDrawTarget(tree);
 const b=addRasterLayer(tree,'B');
 assert.equal(tree.selectedId,b.id);
 assert.equal(assertDrawTarget(tree,frozen).id,a.id);
 selectLayer(tree,a.id);
 assert.equal(setLayerOpacity(tree,a.id,0.5).previous,1);
 assert.equal(setLayerVisibility(tree,a.id,false).previous,true);
 assert.throws(()=>setLayerOpacity(tree,a.id,2),RangeError);
 a.locks.pixels=true;
 assert.throws(()=>assertDrawTarget(tree,frozen),/locked/);
});
