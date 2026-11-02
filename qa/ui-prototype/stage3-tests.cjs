// Independent review-model assertions. Run baseline tests as well.
'use strict';
const assert=require('node:assert/strict');
const {createModel}=require('./model.js');
require('./routes.js');
const R=globalThis.ILLUSTRO_ROUTES;
let count=0;
function check(label,fn){fn();count++;console.log('PASS (model only): '+label);}
check('all 247 formal feature identities remain present',()=>{
 assert.equal(R.features.length,247);
 assert.equal(new Set(R.features.map(f=>f.id)).size,247);
});
check('all alternative Undo entries map to a single actual document action',()=>{
 const m=createModel(R);m.commit('A');
 for(const entry of ['primary','catalog','search','related']){
  const before=m.state.past.length;m.navigate('HIS-001',entry);
  assert.equal(m.state.past.length,before);
 }
 assert.equal(m.dispatch('history.undo'),true);assert.equal(m.state.past.length,0);
 assert.equal(m.dispatch('history.redo'),true);assert.equal(m.state.past.length,1);
});
check('adding a layer is a reversible document operation',()=>{
 const m=createModel(R),id=m.dispatch('layer.add',{name:'テスト'});
 assert.equal(m.state.layers.length,4);assert.equal(m.state.layerId,id);
 m.undo(true);assert.equal(m.state.layers.length,3);
 assert.equal(m.state.layers.some(l=>l.id===id),false);
 m.redo(true);assert.equal(m.state.layers.length,4);
 assert.equal(m.state.layers.some(l=>l.id===id),true);
});
check('visibility belongs to document model and does not reset on selection',()=>{
 const m=createModel(R),id=m.state.layers[0].id,other=m.state.layers[1].id;
 m.dispatch('layer.visibility',{id});m.dispatch('layer.select',{id:other});
 assert.equal(m.state.layers.find(l=>l.id===id).visible,false);
 m.undo(true);assert.equal(m.state.layers.find(l=>l.id===id).visible,true);
 m.redo(true);assert.equal(m.state.layers.find(l=>l.id===id).visible,false);
});
check('blend changes are reversible, while selecting layer does not add revisions',()=>{
 const m=createModel(R),id=m.state.layerId;
 m.dispatch('layer.blend',{id,blend:'乗算'});assert.equal(m.state.past.length,1);
 m.undo(true);assert.equal(m.state.layers.find(l=>l.id===id).blend,'通常');
 const before=m.state.past.length;m.dispatch('layer.select',{id:m.state.layers[1].id});
 assert.equal(m.state.past.length,before);
});
check('session-local Undo and explicit document Undo can coexist',()=>{
 const m=createModel(R);m.commit('existing A');m.begin('TRN-001');m.edit('x','5');
 m.undo(true);assert.equal(m.state.past.length,0);
 assert.equal(m.state.session.values.x,'5');
 m.undo();assert.equal(Object.keys(m.state.session.values).length,0);
 m.redo(true);assert.equal(m.state.past.length,1);
});
check('unknown generic command does not invent an artwork revision',()=>{
 const m=createModel(R);assert.equal(m.begin('HIS-001'),true);
 assert.equal(m.apply(),false);assert.equal(m.state.past.length,0);
});
check('save fence freezes layer properties and operations across undo',()=>{
 const m=createModel(R),id=m.state.layerId;m.commit('A');
 m.dispatch('layer.visibility',{id});const saved=m.save();
 assert.equal(saved.document.layers.find(l=>l.id===id).visible,false);
 m.undo(true);assert.equal(m.state.layers.find(l=>l.id===id).visible,true);
 assert.equal(saved.document.layers.find(l=>l.id===id).visible,false);
 assert.equal(saved.operationIds.length,2);
});
check('A B Undo Save A-complete Redo keeps saved prefix A',()=>{
 const m=createModel(R),a=m.acceptPending('A'),b=m.acceptPending('B');
 m.undo(true);const fence=m.save();
 assert.deepEqual(fence.operationIds,[a.id]);assert.equal(m.finish(a.id),true);
 assert.equal(m.finish(b.id),false);m.redo(true);
 assert.deepEqual(m.state.past.map(op=>op.id),[a.id,b.id]);
 assert.deepEqual(fence.operationIds,[a.id]);
});
check('explicit purpose queries return safe candidates, never auto-commit',()=>{
 const m=createModel(R);
 for(const [q,id] of [['乗算','LAY-002'],['クリップ','LAY-004'],['透明PNG','IO-002'],['左右反転','CAN-003']]){
  assert(m.search(q).some(f=>f.id===id),q+' -> '+id);
 }
 assert.equal(m.state.past.length,0);
});

check('removed Session target cannot be silently committed',()=>{
 const m=createModel(R);m.begin('TRN-001');const id=m.state.layerId;m.dispatch('layer.remove',{id});const before=m.state.past.length;
 assert.equal(m.apply().status,'session-conflict');assert.equal(m.state.past.length,before);assert(m.state.session);
 m.undo(true);assert.equal(m.apply(),true);
});
check('reopening a Session cannot erase its candidate values',()=>{
 const m=createModel(R);m.begin('TRN-001');m.edit('x','20');assert.equal(m.begin('TRN-001'),false);assert.equal(m.state.session.values.x,'20');
});

console.log(JSON.stringify({passed:count,kind:'review-model',browser:false,gpu:false,devices:false}));
