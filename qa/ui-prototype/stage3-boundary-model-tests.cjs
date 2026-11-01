'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {createModel}=require('./model.js');require('./routes.js');const R=globalThis.ILLUSTRO_ROUTES;
const m=createModel(R),cases=[
 ['線のガタガタを直したい',['BRU-003']],['手の震えを抑える',['BRU-003']],
 ['ストロークを滑らかにする',['BRU-003']],['筆をもっと太くする',['BRU-002']],
 ['ブラシサイズを小さくする',['BRU-002']],['色がはみだすのを防いで塗る',['LAY-004','SEL-001']],
 ['塗るとき外に出ないようにする',['LAY-004','SEL-001']],['レイヤーの部分を非表示にする',['LAY-005']],
 ['層の一部を隠す',['LAY-005']],['バケツの漏れを止める',['FIL-002','LIN-006']],
 ['線画のすきまを塞ぐ',['FIL-002','LIN-006']],['塗りつぶしの穴をなくす',['FIL-002','LIN-006']],
 ['バックを透過して出力',['IO-002']],['背景なしの透明画像を書き出す',['IO-002']],
 ['表示だけひっくり返す',['CAN-003']],['左右を裏返して確認したい',['CAN-003']],
 ['選択部分をひっくり返す',['TRN-001']],['レイヤーを反転',['TRN-001']],
 ['ツールの左右を入れ替える',['UI-006']],['配置を反転させる',['UI-006']],
 ['写真の色を取りたい',['COL-003']],['資料から色を採りたい',['COL-003']],
 ['見本を並べたい',['REF-001']],['参考を横に置く',['REF-001']],
 ['別名で保存する',['SAV-003']],['名前を変えて保存する',['SAV-003']],
 ['保存できたか知りたい',['SAV-004']],['保存済か確認する',['SAV-004']],
 ['描いた操作を元に戻したい',['HIS-001']],['線を取り消したい',['HIS-001']],
 ['反転',['FX-112','CAN-003','TRN-001','UI-006','SEL-004']],['ひっくり返す',['CAN-003','TRN-001','UI-006']],
 ['はみ出ず色を塗りたい',['LAY-004','SEL-001']]
];
for(const [goal,expected] of cases){const ids=m.search(goal).map(x=>x.id);assert.equal(ids[0],expected[0],goal);for(const id of expected)assert(ids.includes(id),goal+' missing alternative '+id);}
for(const query of ['作業効率を上げたいqz649','知らない機能qz983'])assert.equal(m.search(query).length,0);
// This is an executable *logical* sidecar contract. It is not Native storage.
let assertions=0;const scopes=['test-pad','reference','document-manager'];
for(const s of scopes)m.scopeEdit(s,s+' first');
m.addLayer('saved-layer');const save=m.completeSave(m.save().id);
m.begin('TRN-003');m.edit('point','a');m.edit('point','b');
m.scopeEdit('reference','after-save');m.undo(true);m.redo(true);
assert.equal(m.state.session.values.point,'b');m.undo();assert.equal(m.state.session.values.point,'a');m.cancel();
assert.equal(m.state.scopedHistory.reference.entries.length,2);
m.newDocument();m.scopeEdit('reference','new-document');m.scopeEdit('document-manager','manager-latest');
assert(m.loadSave(save.id));
assert.equal(m.state.scopedHistory.reference.entries.length,2,'artwork load must select its own sidecar, not leak new document or rewind to save time');
assert.equal(m.state.scopedHistory['test-pad'].entries.length,1);
assert.equal(m.state.scopedHistory['document-manager'].entries.length,2,'manager history stays current');
assert.equal(m.state.session,null);assert.equal(m.state.past.length,1);
// Independent oracle over 5,000 interleaved edits/undo/redo/branch/save/cancel.
const oracle=Object.fromEntries(scopes.map(s=>[s,JSON.parse(JSON.stringify(m.state.scopedHistory[s]))]));
let seed=71719;
for(let n=0;n<5000;n++){
 seed=(1664525*seed+1013904223)>>>0;
 const s=scopes[seed%3],op=(seed>>>4)%7,h=oracle[s];
 const doc=JSON.stringify(m.state.past),session=JSON.stringify(m.state.session);
 if(op<3){const label=s+n;h.entries.push({id:++h.serial,label});h.future=[];m.scopeEdit(s,label);}
 else if(op===3){if(h.entries.length)h.future.push(h.entries.pop());m.scopeUndo(s);}
 else if(op===4){if(h.future.length)h.entries.push(h.future.pop());m.scopeRedo(s);}
 else if(op===5){m.completeSave(m.save().id);}
 else {m.begin('TRN-003');m.edit('point',n);m.cancel();}
 for(const k of scopes)assert.deepEqual(m.state.scopedHistory[k],oracle[k],n+' '+k);
 assert.equal(JSON.stringify(m.state.past),doc);
 if(op!==6)assert.equal(JSON.stringify(m.state.session),session);
 assertions+=5;
}
const result={kind:'deterministic design model, no actual user',paraphrases:cases.length,negativeQueries:2,scopeInterleavings:5000,oracleAssertions:assertions,sidecarSaveReload:'PASS logical model only',productionPersistence:'UNIMPLEMENTED',humanComprehension:'NOT_RUN'};
fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/stage3-boundary-model.json',JSON.stringify(result,null,2));console.log(result);
