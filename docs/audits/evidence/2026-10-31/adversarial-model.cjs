// Run from the repository root: node docs/audits/evidence/2026-10-31/adversarial-model.cjs
// Independent counterexamples; never changes the audited prototype.
const path=require('node:path');
const root=path.resolve(__dirname,'../../../..');
const {createModel}=require(path.join(root,'qa/ui-prototype/model.js'));
require(path.join(root,'qa/ui-prototype/routes.js'));
const registry=globalThis.ILLUSTRO_ROUTES;
const checks=[];
function probe(id,name,fn){checks.push({id,name,...fn()});}
probe('M01','Same Undo intent through fixed versus search/apply',()=>{
 const fixed=createModel(registry),search=createModel(registry);
 for(const m of [fixed,search])m.commit('A');
 fixed.undo();search.navigate('HIS-001','search');search.begin('HIS-001');search.apply();
 return {expected:'both have zero operations',fixed:fixed.state.past.map(x=>x.label),search:search.state.past.map(x=>x.label),contractHolds:search.state.past.length===fixed.state.past.length};
});
probe('M02','A setting dialog consumes the global Undo entry',()=>{
 const m=createModel(registry);m.commit('A');m.begin('COL-001');const before=m.state.past.length;m.undo();
 return {expected:'global Undo remains available separately',session:m.state.session.feature,sessionUndoDepth:m.state.session.past.length,before,after:m.state.past.length,contractHolds:false,qualification:'UI binds every Undo to the session; the model has a private global=true escape that UI does not expose'};
});
probe('M03','Save fence stays fixed across Undo and new branch',()=>{
 const m=createModel(registry);const a=m.acceptPending('A');const save=m.save();m.undo();m.commit('C');m.finish(a.id);m.completeSave(save.id);
 return {expected:'save includes A, current contains C',save:save.operationIds,current:m.state.past.map(x=>x.label),contractHolds:save.operationIds.includes(a.id)&&m.state.past[0].label==='C'};
});
probe('M04','Session cancellation preserves independent C',()=>{
 const m=createModel(registry);m.begin('TRN-001');m.edit('x','10');m.state.layer='色';m.commit('C');m.cancel();
 return {expected:'C remains',current:m.state.past.map(x=>x.label),contractHolds:m.state.past[0].label==='C'};
});
probe('M05','Off-center pinch invariant under implemented equations',()=>{
 // app.js uses art-center transform-origin, centroid delta only for translation.
 const origin=500,centroid=700,originalPoint=700,ratio=2;
 const actual=origin+(originalPoint-origin)*ratio;
 const neededTranslation=centroid-actual;
 return {origin,centroid,ratio,actual,expected:centroid,errorPx:actual-centroid,neededTranslation,contractHolds:actual===centroid,qualification:'mathematical counterexample to code, not a real touch-device trial'};
});
probe('M06','RGBA source-over cannot implement erase postPaint',()=>{
 const baseAlpha=1,overlayAlpha=0;
 const sourceOverAlpha=overlayAlpha+baseAlpha*(1-overlayAlpha);
 return {baseAlpha,overlayAlpha,sourceOverAlpha,expectedEraseAlpha:0,contractHolds:false,qualification:'counterexample only to naive RGBA overlay; the design has not selected that implementation. Requires an erase operator/mask/replacement contract'};
});
probe('M07','One dense 8192-square RGBA16 surface',()=>{
 const bytes=8192*8192*4*2;
 return {bytes,MiB:bytes/1024**2,fiveSurfacesMiB:5*bytes/1024**2,qualification:'capacity arithmetic, not measured memory; sparse residency may be much smaller',contractHolds:true};
});
console.log(JSON.stringify({target:'fc14afdde2d25ee61e2f05e4d89a387ab5ca3c04',checks},null,2));
