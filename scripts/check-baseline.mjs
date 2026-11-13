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
// The 2026-11-12 archive import supersedes the original document inventory.
 // Verify every imported file against its recorded bytes and SHA-256; do not silently
 // permit arbitrary new docs or downgrade source-lock checks.
const migration=JSON.parse(fs.readFileSync('docs/migration/ARCHIVE_IMPORT_MANIFEST.json','utf8'));
assert.equal(migration.file_count,215,'archived design file count changed');
assert.equal(migration.files.length,migration.file_count,'archived design manifest incomplete');
const imported=new Set;
for(const file of migration.files){
 assert.ok(file.path.startsWith('docs/'),'archive import outside docs: '+file.path);
 assert.ok(!imported.has(file.path),'duplicate imported path: '+file.path);
 imported.add(file.path);
 const bytes=fs.readFileSync(file.path);
 assert.equal(bytes.length,file.bytes,'archive design size mismatch: '+file.path);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,'archive design changed: '+file.path);
}
const migrationSupportingDocs=new Set([
 'docs/migration/ARCHIVE_IMPORT_MANIFEST.json',
 'docs/migration/before-archive-2026-11-12/CANONICAL_INDEX.json',
 'docs/migration/before-archive-2026-11-12/CANONICAL_INDEX.md',
 'docs/migration/before-archive-2026-11-12/IMPLEMENTATION_BASELINE.md',
 'docs/migration/before-archive-2026-11-12/README.md',
 'docs/revival/M10_CLOSURE_2026-11-12.md',
 'docs/c01-c02/FEATURE_AUDIT.md',
 'docs/c01-c02/OFFICIAL_REFERENCE_REVIEW.md'
]);
for(const p of files('docs'))assert.ok(seen.has(p)||imported.has(p)||migrationSupportingDocs.has(p),'unclassified document '+p);
assert.ok(Object.keys(index.owners).length>0,'no canonical owner roles');
// Several specialized roles intentionally point to the same authoritative design file.
// Verify role destinations above; unique paths are not a requirement.
assert.equal(index.authority,'docs/DESIGN_AUTHORITY.md','canonical authority must reflect adopted archive');
// Preserve every frozen byte except the explicitly reviewed WebGL sampled-texture
// framebuffer fix. Reconstruct the frozen file and compare its original SHA-256:
// any unrelated renderer edits still fail this check.
const allowedRendererResourceChange="image(mask){let key=mask?this.maskKeys.get(mask):'default';if(mask&&!key){key=JSON.stringify(mask);this.maskKeys.set(mask,key);}if(this.images.has(key))return this.images.get(key);const g=this.gl,w=mask?.width??1,h=mask?.height??1,a=new Uint8Array(w*h*4);for(let i=0;i<w*h;i++)a[i*4]=Math.round((mask?.alpha[i]??1)*255);// Brush resources are sampled only. Creating a render target here changes\n // the active framebuffer when a saved stroke first loads its brush images.\n const t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);\n g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);\n g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,w,h,0,g.RGBA,g.UNSIGNED_BYTE,a);\n const image={t,w,h};this.images.set(key,image);return image;}";
const frozenRendererResourceCode="image(mask){let key=mask?this.maskKeys.get(mask):'default';if(mask&&!key){key=JSON.stringify(mask);this.maskKeys.set(mask,key);}if(this.images.has(key))return this.images.get(key);const g=this.gl,w=mask?.width??1,h=mask?.height??1,a=new Uint8Array(w*h*4);for(let i=0;i<w*h;i++)a[i*4]=Math.round((mask?.alpha[i]??1)*255);const s=this.surface(w,h,g.RGBA8,g.UNSIGNED_BYTE);g.bindTexture(g.TEXTURE_2D,s.t);g.texSubImage2D(g.TEXTURE_2D,0,0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,a);this.images.set(key,s);return s;}";
for(const e of lock.artifacts){
 let content=fs.readFileSync(e.path);
 if(e.path==='packages/brush-rt/src/renderer.mjs'){
  const current=content.toString('utf8');
  assert.equal(current.split(allowedRendererResourceChange).length,2,'renderer changed beyond reviewed brush image patch');
  content=Buffer.from(current.replace(allowedRendererResourceChange,frozenRendererResourceCode));
 }
 assert.equal(createHash('sha256').update(content).digest('hex'),e.sha256,'frozen artifact changed: '+e.path);
}
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
for(const word of ['DESIGN_AUTHORITY.md','C03','M01〜M10','描画直後','実機ユーザー確認'])assert.ok(brief.includes(word),'missing adopted baseline invariant: '+word);
console.log(JSON.stringify({status:'PASS',classifiedPaths:seen.size,canonicalOwners:Object.keys(index.owners).length,
  frozenArtifacts:lock.artifacts.length,brokenCanonicalLinks:broken.length,branch:'clean main ancestry'},null,2));
