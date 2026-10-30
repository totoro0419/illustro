const assert=require('node:assert/strict');
const {createModel}=require('./model.js');require('./routes.js');
const R=globalThis.ILLUSTRO_ROUTES;const checks=[];
function test(name,fn){fn();checks.push(name);}
test('全247 ID・名称・通常/限定/保留/対象外の件数',()=>{
 assert.equal(R.features.length,247);assert.equal(new Set(R.features.map(f=>f.id)).size,247);
 const counts={};R.features.forEach(f=>counts[f.final_scope]=(counts[f.final_scope]||0)+1);
 assert.deepEqual(counts,{included:234,included_limited:2,deferred:10,excluded_suite:1});
});
test('247機能×4入口のモデル到達・現在作品を変更しない',()=>{
 const m=createModel(R);m.commit('既存筆');const before=JSON.stringify(m.state.past);
 for(const f of R.features)for(const entry of ['primary','catalog','search','related']){
  const result=m.navigate(f.id,entry);assert.equal(result.feature.id,f.id);assert.equal(m.state.feature,f.id);
  assert.equal(result.type==='scope',!f.availability.executable);assert.equal(JSON.stringify(m.state.past),before);
 }
});
test('全247 IDの検索・全30カテゴリ・全12Panelからの到達',()=>{
 const m=createModel(R);
 for(const f of R.features){assert.equal(m.search(f.id)[0].id,f.id);assert(m.search('',f.category).some(x=>x.id===f.id));assert(R.features.filter(x=>x.panel===f.panel).some(x=>x.id===f.id));}
 assert.equal(Object.keys(R.categories).length,30);assert.equal(Object.keys(R.panels).length,12);
 assert.equal(new Set(R.features.map(x=>x.panel)).size,12);
});
test('保留/対象外11件に実行Sessionを作らない',()=>{
 const m=createModel(R);const rows=R.features.filter(x=>!x.availability.executable);assert.equal(rows.length,11);
 for(const f of rows){assert.equal(m.begin(f.id),false);assert.equal(m.state.session,null);}
});
test('限定水彩とCMYK/基本文字の既決能力の接続',()=>{
 const m=createModel(R);assert(m.feature('WET-002').parameters.includes('時間拡散なし'));
 assert(!m.feature('WET-002').while_operating.includes('濡れ状態と色の表示を分離'));
 assert(m.feature('COL-010').related_features.includes('COL-008'));assert(m.feature('VEC-008').related_features.includes('VEC-005'));
});
test('候補内Undo/Redoと取消は独立した別層編集を残す',()=>{
 const m=createModel(R);m.begin('TRN-003');m.edit('point','A');m.edit('point','B');m.undo();assert.equal(m.state.session.values.point,'A');m.redo();assert.equal(m.state.session.values.point,'B');
 m.state.layer='別層';m.commit('独立C');m.cancel();assert.equal(m.state.past[0].label,'独立C');assert.equal(m.state.session,null);
});
test('Session適用は開始時対象へ一操作・設定は作品Undo外',()=>{
 const m=createModel(R);m.begin('TRN-001');m.edit('x','10');m.state.layer='別層';m.apply();assert.equal(m.state.past.length,1);assert.equal(m.state.past[0].layer,'線画');assert.equal(m.state.layer,'別層');
 m.begin('UI-006');m.edit('width','360');m.apply();assert.equal(m.state.past.length,1);assert.equal(m.state.settings['UI-006'].width,'360');
});
test('未完A→B→Undoは最後に受理したBを戻す',()=>{
 const m=createModel(R),a=m.acceptPending('A'),b=m.acceptPending('B');m.undo();assert.deepEqual(m.state.past.map(x=>x.id),[a.id]);assert.equal(m.finish(b.id),false);assert.equal(m.finish(a.id),true);
});
test('Save(A)→Undo(A)→新筆C→旧完了でも固定保存対象はA',()=>{
 const m=createModel(R),a=m.acceptPending('A'),s=m.save();m.undo();const c=m.commit('C');assert.equal(m.finish(a.id),false);m.completeSave(s.id);
 assert.deepEqual(s.operationIds,[a.id]);assert.deepEqual(m.state.past.map(x=>x.id),[c.id]);assert.equal(m.state.future.length,0);
});
test('Save(A)とSave(A+B)の要求別固定・新しい編集を混ぜない',()=>{
 const m=createModel(R);const a=m.commit('A'),s1=m.save(),b=m.commit('B'),s2=m.save();m.undo();m.completeSave(s2.id);m.completeSave(s1.id);
 assert.deepEqual(s1.operationIds,[a.id]);assert.deepEqual(s2.operationIds,[a.id,b.id]);assert.equal(m.state.saves.at(-1).id,s2.id);
});
test('view設定・検索・Panel移動は作品Undoへ入らない',()=>{
 const m=createModel(R);m.state.view.zoom=2;m.search('色');m.navigate('UI-002');assert.equal(m.state.past.length,0);
});
test('未知IDを黙って別機能へ補わない',()=>{const m=createModel(R);assert.throws(()=>m.navigate('UNKNOWN-999'));assert.equal(m.search('絶対に存在しない検索文字').length,0);});
const result={kind:'ui-route-and-state-model',checks:checks.length,passed:checks,failed:[],limits:['No browser/device assertion','No pixels/GPU/Worker/ICC','Mock in-memory save is not durable persistence']};
console.log(JSON.stringify(result,null,2));
