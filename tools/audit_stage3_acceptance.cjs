'use strict';
/* Stage③: independent review of the 247 *design obligations*, not product PASS.
 * It intentionally exits 0 when schema is consistent but acceptance stays draft.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const j=read('docs/detailed-design/FEATURE_CONTRACT_CROSSWALK_247.json');
const scope=read('docs/product-planning/FINAL_PRODUCT_SCOPE.json');
const rows=j.rows, byId=new Map(rows.map(x=>[x.id,x]));
const source=new Map(scope.feature_rows.map(x=>[x.id,x]));
const obligations=['entry','behavior','history','persistence','cross_feature','failure'];
const knownOwners=new Set(['document','view','settings','test-pad-history','reference-history','document-history','session-history','document-manager-history','clipboard','lifecycle','assets']);
const findings=[],byGroup={},entryCounts={};
assert.equal(rows.length,247);assert.equal(byId.size,247);
let actionVariantRows=0,variantCount=0,drafts=0,unverifiedDevice=0;
for(const f of rows){
 const label=f.id+': ';
 const original=source.get(f.id);assert(original,label+'absent in approved scope');
 assert.equal(f.name,original.name,label+'name changed');
 assert.equal(f.scope,original.final_scope,label+'scope changed');
 assert.equal(f.category,original.category,label+'category changed');
 assert.equal(f.command_namespace,'feature.'+f.id,label+'command identifier');
 for(const key of obligations){
  assert.equal(typeof f.acceptance_test_draft?.[key],'string',label+'missing '+key);
  assert(f.acceptance_test_draft[key].trim().length>0,label+'empty '+key);
 }
 for(const id of f.related){assert(byId.has(id),label+'unknown linked feature '+id)}
 for(const view of ['pc','tablet','phone']){
  assert(Array.isArray(f.device_entries?.[view]?.steps),label+'missing '+view+' route');
 }
 if(f.verification.design_review.includes('draft'))drafts++;
 if(f.verification.device==='unverified')unverifiedDevice++;
 const vs=f.action_variants||[];
 if(vs.length)actionVariantRows++;
 const seenActions=new Set();
 for(const v of vs){
  assert(v.action&&!seenActions.has(v.action),label+'duplicate/empty variant');
  assert(knownOwners.has(v.owner),label+'unknown variant owner '+v.owner);
  assert.equal(v.entry_independent,true,label+'entry dependent action '+v.action);
  seenActions.add(v.action);variantCount++;
 }
 entryCounts[f.initial_entry?.id]=(entryCounts[f.initial_entry?.id]||0)+1;
 const category=f.category;byGroup[category]??={features:0,draft_acceptance:0,device_unverified:0,action_variants:0};
 byGroup[category].features++;
 if(f.verification.design_review.includes('draft'))byGroup[category].draft_acceptance++;
 if(f.verification.device==='unverified')byGroup[category].device_unverified++;
 byGroup[category].action_variants+=vs.length;
}
assert.equal(Object.keys(byGroup).length,30);
assert.equal(drafts,247,'a feature unexpectedly marked approved without cross-verified evidence');
assert.equal(unverifiedDevice,247,'a device unexpectedly marked verified');
assert.equal(actionVariantRows,13,'variant roster changed; re-review special cases');
const open=require(path.join(root,'docs/detailed-design/AUDIT_REMEDIATION.json')).findings.filter(x=>!x.closed).map(x=>x.id);
assert.deepEqual(open.slice().sort(),['AUD-008','AUD-010','AUD-016','AUD-017','AUD-019']);
const report={
 schema_version:1,
 kind:'DESIGN-COVERAGE-ONLY',
 source:'docs/detailed-design/FEATURE_CONTRACT_CROSSWALK_247.json',
 total_features:rows.length,
 scope_counts:Object.fromEntries(['included','included_limited','deferred','excluded_suite'].map(s=>[s,rows.filter(x=>x.scope===s).length])),
 category_counts:byGroup,
 acceptance_dimensions_per_feature:obligations,
 acceptance_draft_count:drafts,
 device_unverified_count:unverifiedDevice,
 action_variant_features:actionVariantRows,
 action_variant_count:variantCount,
 action_variant_roster:rows.filter(x=>x.action_variants?.length).map(x=>({id:x.id,variants:x.action_variants})),
 remaining_audits:open,
 main_entry_coverage:'Declared entry exists as text. Real 247 shortest/normal UI routes and steps are NOT verified.',
 verification:'247 source identity and basic six-field acceptance presence only; no image kernels, GPU, real-user usability or numeric thresholds verified.',
 additional_design_work:[
  'Promote each feature acceptance draft to reproducible condition with observable state and expected result, without rewriting approved scope.',
  'Specify numerical kernel boundary/edge/precision for each effect before claiming algorithmic implementation readiness.',
  'Run real-document user-task trials for discovery, history scope, mid-width layout and touch targets.',
  'Review cross-scope action variants individually for Undo/Save/Cancel and non-destructive reediting.'
 ]
};
fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
fs.writeFileSync(path.join(root,'test-results/stage3-feature-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'SCHEMA_PASS_ONLY',features:rows.length,categories:Object.keys(byGroup).length,draft_acceptance:drafts,unverified_devices:unverifiedDevice,variant_features:actionVariantRows,variant_actions:variantCount,open_audits:open}));
