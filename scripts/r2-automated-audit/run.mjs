import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const specs=JSON.parse(await readFile(new URL('./manifest.json',import.meta.url),'utf8'));
const out=resolve(process.env.R2_AUDIT_OUT??'r2-audit-evidence'),fixture=resolve(process.env.R2_FIXTURE_DIR??'r2-audit-fixtures');
const selector=(process.argv[2]??'all').trim();
assert.equal(specs.length,26);assert.equal(new Set(specs.map(x=>x.id)).size,26);
const selected=selector==='all'?specs:specs.filter(x=>selector.split(',').map(x=>x.trim()).some(v=>v===x.id||v===x.group));
if(!selected.length||selector!=='all'&&selector.split(',').some(v=>!specs.some(x=>x.id===v.trim()||x.group===v.trim())))throw Error('Unknown selection: '+selector);
await mkdir(out,{recursive:true});
const files=[...new Set(selected.flatMap(x=>x.unit))];
let unitReport=null,unitError=null;
if(files.length){
 const file=join(out,'vitest.json');
 const u=spawnSync('npx',['--no-install','vitest','run',...files,'--reporter=json','--outputFile='+file],{encoding:'utf8',timeout:240000,maxBuffer:16*1024*1024});
 await writeFile(join(out,'vitest.log'),(u.stdout??'')+(u.stderr??''));
 try{unitReport=JSON.parse(await readFile(file,'utf8'));}catch(e){unitError=String(u.error??e);}
}
function unitFor(path){
 const t=unitReport?.testResults?.find(x=>x.name?.endsWith('/'+path)||x.name===path);
 if(!t)return {path,status:'ERROR',reason:unitError??'No test result'};
 const a=t.assertionResults??[];return {path,status:a.some(x=>x.status==='failed')?'FAIL':t.status==='passed'&&a.some(x=>x.status==='passed')?'PASS':'ERROR',tests:a.map(x=>({name:x.fullName??x.title,status:x.status,failure:x.failureMessages}))};
}
let legacy=null;
const results=[];
for(const spec of selected){
 const dir=join(out,spec.id);await mkdir(dir,{recursive:true});
 const unit=spec.unit.map(unitFor);
 let b=null;
 if(spec.browser){
  const p=spawnSync(process.execPath,['scripts/r2-automated-audit/browser.mjs',spec.browser],{encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024,env:{...process.env,R2_CASE_DIR:dir,R2_FIXTURE_DIR:fixture}});
  await writeFile(join(dir,'browser.log'),(p.stdout??'')+(p.stderr??'')+String(p.error??''));
  try{b=JSON.parse(await readFile(join(dir,'browser.json'),'utf8'));}catch(e){b={status:'ERROR',reason:String(p.error??e)};}
 }
 if(spec.legacy&&!legacy){
  const p=spawnSync(process.execPath,['scripts/r2-audit-fixes-round2-browser-smoke.mjs',spec.legacy],{encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});
  await writeFile(join(out,'legacy-D-016.log'),(p.stdout??'')+(p.stderr??''));
  legacy={status:p.status===0&&p.stdout?.includes('SAVED-MACRO-REPLAYED-REAL-STROKE')?'PASS':'ERROR',reason:p.status===0?'D-016 regression subchecks only':String(p.error??'Legacy smoke failed; triage required')};
 }
 const checks=[...unit,...(b?[b]:[]),...(spec.legacy?[legacy]:[])];
 // A passing subcheck never promotes an unfinished feature. Infrastructure failures
 // remain ERROR. Only measured assertions from a specific browser case are feature FAIL.
 const status=b?.status==='FAIL'?'FAIL':b?.status==='BLOCKED'?'BLOCKED':b?.status==='ENV_LIMIT'?'ENV_LIMIT':spec.pending.length||!checks.length||checks.some(x=>x.status!=='PASS')?'ERROR':'PASS';
 const result={id:spec.id,group:spec.group,status,commit:process.env.EXPECTED_COMMIT_SHA??'unknown',checks,pending:spec.pending,reason:spec.pending.length?'Coverage not complete: '+spec.pending.join('; '):undefined};
 results.push(result);await writeFile(join(dir,'result.json'),JSON.stringify(result,null,2));console.log(spec.id,status,spec.pending.join('; '));
}
const csv=s=>'"'+String(s??'').replaceAll('"','""')+'"';
await writeFile(join(out,'results.json'),JSON.stringify(results,null,2));
await writeFile(join(out,'results.csv'),['id,group,status,commit,pending',...results.map(r=>[r.id,r.group,r.status,r.commit,r.pending.join('; ')].map(csv).join(','))].join('\n')+'\n');
await writeFile(join(out,'summary.md'),'# R2 automated audit (partial until all required assertions implemented)\n\n|ID|Result|Pending|\n|---|---|---|\n'+results.map(r=>'|'+r.id+'|'+r.status+'|'+r.pending.join('; ')+'|').join('\n')+'\n');
if(process.env.GITHUB_STEP_SUMMARY){const {appendFile}=await import('node:fs/promises');await appendFile(process.env.GITHUB_STEP_SUMMARY,await readFile(join(out,'summary.md')));}
if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
