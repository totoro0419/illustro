'use strict';
// Independent structure and relationship validation for the Stage III design matrix.
// No product runtime or device test is performed here.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const scope=read('docs/product-planning/FINAL_PRODUCT_SCOPE.json');
const matrix=read('docs/detailed-design/FEATURE_CONTRACT_CROSSWALK_247.json');
const audit=read('docs/detailed-design/AUDIT_REMEDIATION.json');
const original=read('docs/audits/evidence/2026-10-31/findings.json');
const rows=matrix.rows;
const checks=[];const check=(name,fn)=>{fn();checks.push(name);};
check('247 unique IDs/30 categories',()=>{
 assert.equal(rows.length,247);assert.equal(new Set(rows.map(r=>r.id)).size,247);
 assert.equal(new Set(rows.map(r=>r.category)).size,30);
});
check('exact current user-approved status categories preserved',()=>{
 let counts={};for(let r of rows)counts[r.scope]=(counts[r.scope]||0)+1;
 assert.deepEqual(counts,{included:234,included_limited:2,deferred:10,excluded_suite:1});
});
check('one-to-one IDs, labels and scope against PR5',()=>{
 assert.equal(scope.feature_rows.length,247);
 const byId=new Map(scope.feature_rows.map(r=>[r.id,r]));
 for(let r of rows){const base=byId.get(r.id);assert(base,r.id);assert.equal(r.name,base.name,r.id);assert.equal(r.scope,base.final_scope,r.id);assert.equal(r.category,base.category,r.id);}
});
check('all rows contain essential distinct design contracts',()=>{
 for(let r of rows){
  for(const key of ['purpose','intended_action','initial_entry','parameters','prerequisites','command_namespace','canonical_data','native_persistence','apply_cancel','undo_contract','device_entries','acceptance_test_draft','verification']){
   assert(r[key]!==null&&r[key]!==undefined,r.id+' '+key);
  }
  assert.equal(r.verification.formal_engine,'not-implemented');
 }
});
check('review-finding crosswalk exists and is 19 unique findings',()=>{
 assert.equal(audit.findings.length,19);
 assert.equal(new Set(audit.findings.map(f=>f.id)).size,19);
 assert.equal(original.length,19);
 const byId=new Map(original.map(f=>[f.id,f]));
 for(let f of audit.findings){
  assert.equal(f.closed,false,f.id+' cannot be closed without source closure evidence');
  assert.equal(f.severity,byId.get(f.id).severity);assert.equal(f.title,byId.get(f.id).title);
  for(const id of f.affected_feature_ids)assert(rows.some(r=>r.id===id),f.id+' unknown '+id);
 }
});
check('finding references per feature match audit reverse graph',()=>{
 for(let r of rows){
  const expected=audit.findings.filter(f=>f.affected_feature_ids.includes(r.id)).map(f=>f.id).sort();
  assert.deepEqual(r.audit_findings.slice().sort(),expected,r.id);
 }
});
check('open severity counts computed rather than asserted',()=>{
 for(const level of ['P0','P1','P2','P3'])assert.equal(audit.open_by_severity[level],audit.findings.filter(f=>f.severity===level&&!f.closed).length);
});
console.log(JSON.stringify({kind:'structure-only',passed:checks.length,checks,feature_count:rows.length,open:audit.open_by_severity,claim:'not a device/product pass'},null,2));
