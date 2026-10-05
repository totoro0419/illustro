import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
const index=JSON.parse(fs.readFileSync('docs/CANONICAL_INDEX.json','utf8'));
const lock=JSON.parse(fs.readFileSync('docs/production-prep/source-lock.json','utf8'));
const statuses=new Set(['CANONICAL','ACCEPTED PROTOTYPE','EXPERIMENTAL','OBSOLETE','FUTURE']);
const seen=new Set(),byPath=new Map;
for(const e of index.entries){assert.ok(statuses.has(e.status),e.path);assert.ok(!seen.has(e.path),'duplicate classification '+e.path);
  seen.add(e.path);byPath.set(e.path,e.status);assert.ok(fs.existsSync(e.path),'missing classified path '+e.path);}
for(const p of Object.values(index.owners))assert.equal(byPath.get(p),'CANONICAL',p);
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const p of files('docs'))assert.ok(seen.has(p),'unclassified document '+p);
assert.equal(new Set(Object.values(index.owners)).size,Object.values(index.owners).length,'duplicate canonical owner');
assert.equal(index.authority,'docs/IMPLEMENTATION_BASELINE.md');
for(const e of lock.artifacts){assert.equal(createHash('sha256').update(fs.readFileSync(e.path)).digest('hex'),e.sha256,'frozen artifact changed: '+e.path);}
assert.ok(!fs.existsSync('docs/architecture/ADR-0005-lineart-region.md'),'obsolete Lineart ADR imported');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
assert.ok(git('merge-base','HEAD',lock.baseMain)===lock.baseMain,'main base changed');
for(const ref of ['origin/design/completion-audit-2026-09-28','origin/design/ui-gate-e-2026-09-29','origin/design/feature-integration-2026-10-04']){
  if(!git('branch','-r','--list',ref))continue;
  let ancestor=false;try{git('merge-base','--is-ancestor',ref,'HEAD');ancestor=true;}catch{}
  assert.equal(ancestor,false,'old branch imported as ancestor: '+ref);
}
const broken=[];
// Inspect local Markdown links across current canonical documents; external URL
// availability is researched independently, and historical evidence is separate.
for(const e of index.entries.filter(e=>e.status==='CANONICAL'&&e.path.endsWith('.md'))){
  const text=fs.readFileSync(e.path,'utf8');
  assert.ok(!/Production implementation:\s*\*\*LOCKED|Production implementation remains prohibited|Production remains stopped/.test(text),'stale implementation lock '+e.path);
  for(const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
    const target=m[1].split('#')[0];if(!target||/^(?:https?:|mailto:)/.test(target))continue;
    if(!fs.existsSync(path.resolve(path.dirname(e.path),target)))broken.push(`${e.path}: ${target}`);
  }
}
assert.deepEqual(broken,[],'broken canonical links');
const brief=fs.readFileSync('docs/IMPLEMENTATION_BASELINE.md','utf8');
for(const word of ['Core Drawing Slice','Recovery','256','128','Compact','Undo','Save','Export'])assert.ok(brief.includes(word),word);
console.log(JSON.stringify({status:'PASS',classifiedPaths:seen.size,canonicalOwners:Object.keys(index.owners).length,
  frozenArtifacts:lock.artifacts.length,brokenCanonicalLinks:broken.length,branch:'clean main ancestry'},null,2));
