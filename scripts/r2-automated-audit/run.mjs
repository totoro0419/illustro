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
const legacyRuns=new Map();
const results=[];
for(const spec of selected){
 const dir=join(out,spec.id);await mkdir(dir,{recursive:true});
 const unit=spec.unit.map(unitFor);
 let b=null;
 if(spec.browser){
  const scenarios=[spec.browser,...(spec.additionalBrowsers??[])],parts=[];
  for(const scenario of scenarios){
   const caseDir=scenarios.length===1?dir:join(dir,scenario);await mkdir(caseDir,{recursive:true});
   const p=spawnSync(process.execPath,['scripts/r2-automated-audit/browser.mjs',scenario],{encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024,env:{...process.env,R2_CASE_DIR:caseDir,R2_FIXTURE_DIR:fixture}});
   await writeFile(join(caseDir,'browser.log'),(p.stdout??'')+(p.stderr??'')+String(p.error??''));
   let part;try{part=JSON.parse(await readFile(join(caseDir,'browser.json'),'utf8'));}catch(e){part={id:scenario,status:'ERROR',reason:String(p.error??e)};}
   if(part.id!==scenario||p.status!==0&&part.status==='PASS'||part.status==='PASS'&&(!part.checks?.length||part.checks.some(c=>JSON.stringify(c.actual)!==JSON.stringify(c.expected))))part={...part,status:'ERROR',reason:'Inconsistent scenario output'};
   parts.push(part);
  }
  b=parts.length===1?parts[0]:{id:spec.id,status:['FAIL','BLOCKED','ENV_LIMIT','ERROR'].find(status=>parts.some(part=>part.status===status))??(parts.every(part=>part.status==='PASS')?'PASS':'ERROR'),checks:parts.flatMap(part=>part.checks??[]),parts,reason:parts.map(part=>part.id+': '+part.status+' '+(part.reason??'')).join(' / ')};
  await writeFile(join(dir,'browser.json'),JSON.stringify(b,null,2));
 }
 if(spec.legacy&&!legacyRuns.has(spec.legacy)){
  const safety=spec.legacy==='SAVE-SAFETY';
  const args=safety?['scripts/editor-works-safety-smoke.mjs']:['scripts/r2-audit-fixes-round2-browser-smoke.mjs',spec.legacy];
  const p=spawnSync(process.execPath,args,{encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024,env:{...process.env,...(safety?{HOME_PUBLIC_URL:process.env.R2_AUDIT_FIX_URL,HOME_EVIDENCE_DIRECTORY:dir,CHROMIUM_EXECUTABLE:process.env.CHROMIUM_EXECUTABLE??'/usr/bin/google-chrome'}:{})}});
  await writeFile(join(out,'legacy-'+spec.legacy+'.log'),(p.stdout??'')+(p.stderr??'')+String(p.error??''));
  const marker=safety?'INDEXEDDB-FALLBACK-QUOTA-FAILURE-RETRY-PREVIOUS-INTACT':'SAVED-MACRO-REPLAYED-REAL-STROKE';
  legacyRuns.set(spec.legacy,{status:p.status===0&&p.stdout?.includes(marker)?'PASS':'ERROR',reason:p.status===0?'Existing regression subchecks only':String(p.error??'Legacy smoke failed; triage required')});
 }
 const checks=[...unit,...(b?[b]:[]),...(spec.legacy?[legacyRuns.get(spec.legacy)]:[])];
 // A passing subcheck never promotes an unfinished feature. Infrastructure failures
 // remain ERROR. Only measured assertions from a specific browser case are feature FAIL.
 const status=b?.status==='FAIL'?'FAIL':b?.status==='BLOCKED'?'BLOCKED':b?.status==='ENV_LIMIT'?'ENV_LIMIT':spec.pending.length||!checks.length||checks.some(x=>x.status!=='PASS')?'ERROR':'PASS';
 const result={id:spec.id,group:spec.group,status,commit:process.env.EXPECTED_COMMIT_SHA??'unknown',checks,pending:spec.pending,reason:spec.pending.length?'Coverage not complete: '+spec.pending.join('; '):undefined};
 results.push(result);await writeFile(join(dir,'result.json'),JSON.stringify(result,null,2));console.log(spec.id,status,spec.pending.join('; '));
 if(b){console.log('BROWSER',spec.id,b.status,String(b.reason??'').slice(0,1300));for(const c of b.checks??[])if(JSON.stringify(c.actual)!==JSON.stringify(c.expected))console.log('MISMATCH',spec.id,JSON.stringify(c).slice(0,1500));}
}
const csv=s=>'"'+String(s??'').replaceAll('"','""')+'"';
await writeFile(join(out,'results.json'),JSON.stringify(results,null,2));
await writeFile(join(out,'results.csv'),['id,group,status,commit,pending',...results.map(r=>[r.id,r.group,r.status,r.commit,r.pending.join('; ')].map(csv).join(','))].join('\n')+'\n');
await writeFile(join(out,'summary.md'),'# R2 automated audit (partial until all required assertions implemented)\n\n|ID|Result|Pending|\n|---|---|---|\n'+results.map(r=>'|'+r.id+'|'+r.status+'|'+r.pending.join('; ')+'|').join('\n')+'\n');
if(process.env.GITHUB_STEP_SUMMARY){const {appendFile}=await import('node:fs/promises');await appendFile(process.env.GITHUB_STEP_SUMMARY,await readFile(join(out,'summary.md')));}
if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
