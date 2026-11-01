'use strict';
// AUD008/AUD016 model contract: deterministic human-task index, named histories.
const assert=require('node:assert/strict');
const {createModel}=require('./model.js');
require('./routes.js');
const R=globalThis.ILLUSTRO_ROUTES, m=createModel(R);
let passed=0;
function check(label,fn){fn();passed++;console.log('PASS '+label);}
check('original 247 catalog/IDs and explicit availability still accessible',()=>{
 assert.equal(R.features.length,247);
 for(const f of R.features)assert.equal(m.search(f.id)[0]?.id,f.id);
});
const tasks=[
 ['下の色を残して暗く重ねる','LAY-002'],
 ['乗算','LAY-002'],
 ['クリッピング','LAY-004'],
 ['はみ出さないように塗る','LAY-004'],
 ['マスク','LAY-005'],
 ['隠した部分を後から戻す','LAY-005'],
 ['透明PNG','IO-002'],
 ['背景を透明にして保存','IO-002'],
 ['背景透過で書き出す','IO-002'],
 ['表示反転','CAN-003'],
 ['絵を裏返して確認','CAN-003'],
 ['選択した絵を左右反転','TRN-001'],
 ['新しいレイヤーに描く','LAY-001'],
 ['一つ前の操作に戻す','HIS-001'],
 ['画像の色を使う','COL-003'],
 ['線をきれいに細く終える','BRU-008']
];
check('16 task phrases map to intended primary feature without exposing an invented action',()=>{
 for(const [task,id] of tasks){
  const f=m.search(task);assert(f.some(x=>x.id===id),task+' → '+id);
  assert.equal(f[0].id,id,task+' top result');
 }
});
check('ambiguous left/right flip surfaces canvas/view, transform and workspace distinctly',()=>{
 const ids=m.search('左右反転').map(x=>x.id);
 for(const id of ['CAN-003','TRN-001','UI-006'])assert(ids.includes(id),id);
});
check('NFKC and English case aliases, no unknown-ID or no-match fabrication',()=>{
 assert.equal(m.search('ＭＵＬＴＩＰＬＹ')[0]?.id,'LAY-002');
 assert.equal(m.search('無意味な検索語qz6831').length,0);
 assert.equal(m.search('never-match',null).length,0);
});
check('category filter does not let task alias escape its category',()=>{
 const l=m.feature('LAY-004');
 assert(m.search('クリッピング',l.category).some(x=>x.id==='LAY-004'));
 assert(!m.search('クリッピング','not-a-category').length);
});
check('scopes never change document undo or pending Session undo',()=>{
 m.dispatch('layer.add',{name:'新規'});
 m.begin('TRN-003');m.edit('point','A');m.edit('point','B');
 const beforePast=m.state.past.map(x=>x.id),beforeRevision=m.state.revision;
 for(const scope of ['test-pad','reference','document-manager']){
  m.dispatch('scope.edit',{scope,label:'a'});
  m.dispatch('scope.edit',{scope,label:'b'});
 }
 assert.deepEqual(m.state.past.map(x=>x.id),beforePast);
 assert.equal(m.state.revision,beforeRevision);
 assert.equal(m.state.session.values.point,'B');
 m.dispatch('history.undo');
 assert.equal(m.state.past.length,0);
 assert(m.state.session);
 assert.equal(m.state.scopedHistory.reference.entries.length,2);
 m.dispatch('scope.undo',{scope:'test-pad'});
 assert.equal(m.state.scopedHistory['test-pad'].entries.length,1);
 assert.equal(m.state.scopedHistory.reference.entries.length,2);
 m.undo();assert.equal(m.state.session.values.point,'A');
 m.dispatch('scope.redo',{scope:'test-pad'});
 assert.equal(m.state.scopedHistory['test-pad'].entries.length,2);
 m.cancel();
 assert.equal(m.state.scopedHistory['test-pad'].entries.length,2);
});
check('each named history has isolated redo and no accidental document save inclusion',()=>{
 const s=m.save();
 m.dispatch('scope.undo',{scope:'reference'});
 m.dispatch('scope.edit',{scope:'reference',label:'new independent'});
 assert(!m.dispatch('scope.redo',{scope:'reference'}));
 assert.equal(m.state.scopedHistory['document-manager'].entries.length,2);
 assert.deepEqual(s.operationIds,[]);
 assert.equal(m.state.past.length,0);
 assert(!s.operations.some(op=>op.payload?.scope));
});
check('invalid named scope fails closed',()=>{
 assert.throws(()=>m.dispatch('scope.undo',{scope:'document'}),/unknown undo scope/);
 assert.throws(()=>m.dispatch('scope.edit',{scope:'random'}),/unknown undo scope/);
});
check('new work resets per-document pad/reference only; manager retains its own history',()=>{
 assert(m.state.scopedHistory.reference.entries.length>0);
 m.newDocument();
 assert.equal(m.state.scopedHistory.reference.entries.length,0);
 assert.equal(m.state.scopedHistory['test-pad'].entries.length,0);
 assert.equal(m.state.scopedHistory['document-manager'].entries.length,2);
});
console.log(JSON.stringify({scope:'Stage III UI prototype model only',passed,taskPhrases:tasks.length,unverified:['actual users','real pen/touch','Native storage','production feature implementations']}));
