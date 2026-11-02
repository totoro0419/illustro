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
assert.equal(drafts,0,'reviewed definitions unexpectedly reverted to drafts');
assert.equal(unverifiedDevice,247,'a device unexpectedly marked verified');
assert.equal(actionVariantRows,13,'variant roster changed; re-review special cases');
const open=require(path.join(root,'docs/detailed-design/AUDIT_REMEDIATION.json')).findings.filter(x=>!x.closed).map(x=>x.id);
assert(open.every(id=>['AUD-008','AUD-010','AUD-016','AUD-017','AUD-019'].includes(id)),'unexpected original audit open set');
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
 main_entry_coverage:'5928 normal routes measured independently by primary-route-browser-tests; category alternative measures only a bounded route minimum, not global shortest or novice discovery.',
 verification:'247 source identities and contract links checked here. CPU/Canvas numerical evidence is separate; no production GPU or real-user validation.',
 additional_design_work:[
  'Run the defined per-feature acceptance against the future product engine; preserve original scope.',
  'Validate each specified numerical variant on production CPU/GPU and arbitrary ICC before claiming product quality.',
  'Run real-document user-task trials for discovery, history scope, mid-width layout and touch targets.',
  'Review cross-scope action variants individually for Undo/Save/Cancel and non-destructive reediting.'
 ]
};
fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
fs.writeFileSync(path.join(root,'test-results/stage3-feature-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'SCHEMA_PASS_ONLY',features:rows.length,categories:Object.keys(byGroup).length,draft_acceptance:drafts,unverified_devices:unverifiedDevice,variant_features:actionVariantRows,variant_actions:variantCount,open_audits:open}));
// Missing representative semantics must fail CI, without treating schema as proof of completeness.
const fixtures=new Set();
for(const f of rows){
 const c=f.acceptance_case;assert(c,f.id+' missing specific acceptance case');
 assert.equal(c.case_id,f.id+'.specific.1');
 for(const key of ['given','when','then','boundary_precision'])assert(typeof c[key]==='string'&&c[key].trim().length>0,f.id+' missing '+key);
 const signature=[c.given,c.when,c.then,c.boundary_precision].join('|');
 assert(!fixtures.has(signature),f.id+' duplicated acceptance case');fixtures.add(signature);
 assert.equal(c.scope_executable,['included','included_limited'].includes(f.scope),f.id+' scope case mismatch');
 if(!c.scope_executable){assert(c.then.includes('No executable'),f.id+' deferred case implies execution');assert.equal(c.open_algorithm_definition,null,f.id+' deferred algorithm made a completion blocker');}
 assert(j.acceptance_inheritance.interaction,'missing shared interaction contract');
 assert(c.status.includes('AI-reviewed'),'missing explicit design-review provenance');
 assert.equal(f.contract_review?.human_verified,false);assert.equal(f.contract_review?.product_engine_verified,false);
 assert.equal(f.contract_review?.specific_case,c.case_id);
}
const openAlgorithms=rows.filter(f=>f.acceptance_case.open_algorithm_definition).map(f=>f.id);
assert.deepEqual(new Set(openAlgorithms),new Set(j.specific_case_coverage.open_algorithm_feature_ids));
report.additional_design_blockers=read('docs/detailed-design/AUDIT_REMEDIATION.json').additional_design_blockers;
report.specific_cases={count:fixtures.size,stage3_operation_definitions_reviewed:247,reviewer:'AI, not independent human approval',full_feature_acceptance_confirmed:false,open_algorithm_feature_ids:openAlgorithms};
fs.writeFileSync(path.join(root,'test-results/stage3-feature-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({specific_cases:fixtures.size,full_acceptance:'NOT_CONFIRMED',open_algorithm_definitions:openAlgorithms}));

const num=read('docs/detailed-design/NUMERIC_CONTRACTS_V1.json');
assert.equal(new Set(num.features.map(f=>f.feature_id)).size,num.features.length);
for(const f of num.features){
 assert(byId.has(f.feature_id));assert(byId.get(f.feature_id).acceptance_case.scope_executable);
 for(const k of ['inputs','algorithm','boundary_precision','dependencies','reference_coverage'])assert(f[k]?.length,f.feature_id+' missing numerical '+k);
 assert(f.variants.length);assert.equal(f.production_verification,'NOT_EXECUTED');
 if(f.algorithm_family_ref)assert(num.algorithm_families[f.algorithm_family_ref]?.applies_to.includes(f.feature_id),f.feature_id+' invalid shared algorithm link');
 assert.equal(byId.get(f.feature_id).acceptance_case.numerical_contract,'NUMERIC_CONTRACTS_V1.json#'+f.feature_id);
 for(const method of f.reference_functions){
  const [module,fn]=method.split('.');
  assert(fs.readFileSync(path.join(root,'experiments/stage3-reference',module+'.py'),'utf8').includes('def '+fn+'('),method+' missing reference');
 }
}
report.numerical_contracts={defined:num.features.length,full_production_validation:false};
fs.writeFileSync(path.join(root,'test-results/stage3-feature-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({numerical_definitions:num.features.length,production_verified:false,human_verified:false}));
