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
 'docs/c01-c02/ACCEPTANCE_2026-11-15.md',
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

// Undo/Redo atomic display publication: only these exact two source edits
// are permitted in formerly frozen UI display files. We restore their original
// code in memory and verify the previously frozen SHA-256. Any unrelated change
// is still rejected (including the canonical brush/tiling shaders).
const atomicBuildOld="'presentation.worker','document-presentation','index'";
const atomicBuildNew="'presentation.worker','document-presentation','atomic-document-groups','index'";
const atomicDocumentImport="import {publishDocumentGroupsAtomically} from '@rt/atomic-document-groups';\n";
const atomicDocumentOldMethod=" // QA input-first presentation: yield between groups rather than submitting\n // every bitmap transfer in one uninterruptible main-thread task. The worker\n // still renders full-accuracy pixels and confirms the exact same version.\n async applyCooperatively(groups){\n  const groupCount=groups.length;\n  for(let i=0;i<groupCount;i++){\n   this.apply([groups[i]]);\n   if(i+1<groupCount){\n    // A new macrotask gives queued touchstart and pointerdown a chance to run.\n    // requestAnimationFrame can itself starve when the GPU is busy.\n    await new Promise(resolve=>setTimeout(resolve,0));\n   }\n  }\n }\n";
const atomicDocumentNewMethod=" // For a newly opened canvas there are no OLD image tiles to protect.\n // Fill this first scene directly, without duplicating all display canvases.\n // This also preserves the earlier low-allocation startup path.\n async applyCooperatively(groups,isCurrent){\n  if(groups.length<=1){\n   if(isCurrent&&!isCurrent()){for(const group of groups)group.bitmap?.close?.();return false;}\n   this.apply(groups);return true;\n  }\n  if(this.tiles.size===0){\n   let consumed=0,lastYield=performance.now();\n   try{\n    for(;consumed<groups.length;consumed++){\n     if(isCurrent&&!isCurrent())return false;\n     this.apply([groups[consumed]]);\n     if(consumed+1<groups.length&&performance.now()-lastYield>=8){\n      await new Promise(resolve=>setTimeout(resolve,0));\n      lastYield=performance.now();\n     }\n    }\n    return true;\n   }finally{\n    // A stale packet may be superseded while its next group has not been\n    // installed. Close only unconsumed transfers.\n    for(let i=consumed;i<groups.length;i++)groups[i]?.bitmap?.close?.();\n   }\n  }\n  // History and other changes to a displayed document stay atomic. Each\n  // replacement is prepared offscreen and the full set is swapped at once.\n  return publishDocumentGroupsAtomically(this,groups,isCurrent);\n }\n";
const cancelGpuInitOld=" static async create(canvas,width,height,backend,options,workerUrl,canonicalUrl,diagnostics=false,presentationUrl){\n  const host=new DrawingHost(canvas,workerUrl,presentationUrl);host.documentPresentation=new DocumentPresentation(canvas,width,height);host.documentVersion=0;try{";
const cancelGpuInitNew=" static async create(canvas,width,height,backend,options,workerUrl,canonicalUrl,diagnostics=false,presentationUrl,abortSignal=null){\n  if(abortSignal?.aborted)throw Error('Cancelled canvas initialization');\n  const host=new DrawingHost(canvas,workerUrl,presentationUrl);host.documentPresentation=new DocumentPresentation(canvas,width,height);host.documentVersion=0;\n  const abort=()=>host.destroy();\n  abortSignal?.addEventListener('abort',abort,{once:true});\n  try{";
const cancelGpuInitReturnOld="   host.update(state);return host;\n  }catch(error){host.destroy();throw error;}\n }";
const cancelGpuInitReturnNew="   if(abortSignal?.aborted||host.disposed)throw Error('Cancelled canvas initialization');\n   host.update(state);return host;\n  }catch(error){host.destroy();throw error;}\n  finally{abortSignal?.removeEventListener('abort',abort);}\n }";
const parallelGpuInitOld="  host.update(await host.call('init',{width:canvas.width,height:canvas.height,documentWidth:width,documentHeight:height,backend,options,canonicalUrl,diagnostics,timeOrigin:performance.timeOrigin}));\n   host.presentation.postMessage({method:'init',width:canvas.width,height:canvas.height,documentWidth:width,documentHeight:height,backend:host.info.selection.selected});await host.presentationReady;return host;";
const parallelGpuInitNew="  // Both workers own separate GPU resources. They can initialize in parallel:\n   // presenting a raster does not require the drawing worker's GPU selection.\n   // The previous sequential startup waited for two pipeline compilations.\n   const drawingInit=host.call('init',{width:canvas.width,height:canvas.height,documentWidth:width,documentHeight:height,backend,options,canonicalUrl,diagnostics,timeOrigin:performance.timeOrigin});\n   host.presentation.postMessage({method:'init',width:canvas.width,height:canvas.height,documentWidth:width,documentHeight:height,backend});\n   const [state]=await Promise.all([drawingInit,host.presentationReady]);\n   host.update(state);return host;";
const atomicHostOldComplete="    const complete=()=>{\n     if(accepted&&!this.disposed){\n      this.documentVersion=m.version;\n      const coverage=this.pendingCoverage.get(m.version);\n      if(!coverage?.covered)this.uncoveredVersion=Math.max(this.uncoveredVersion,m.version);\n      this.pendingCoverage.delete(m.version);\n      this.documentPresentation.update(this.viewportScene.baseView??this.backend.viewTransform);\n      this.syncVisibility();\n     }\n     const request=this.presentationRequests.get(m.request);\n     this.presentationRequests.delete(m.request);\n     request?.resolve({accepted:accepted&&!this.disposed});\n    };\n";
const atomicHostNewComplete="    const complete=(applied=accepted)=>{\n     const current=applied&&!this.disposed&&m.epoch===this.epoch&&m.version>=this.documentVersion;\n     if(current){\n      this.documentVersion=m.version;\n      const coverage=this.pendingCoverage.get(m.version);\n      if(!coverage?.covered)this.uncoveredVersion=Math.max(this.uncoveredVersion,m.version);\n      this.pendingCoverage.delete(m.version);\n      this.documentPresentation.update(this.viewportScene.baseView??this.backend.viewTransform);\n      this.syncVisibility();\n     }\n     const request=this.presentationRequests.get(m.request);\n     this.presentationRequests.delete(m.request);\n     request?.resolve({accepted:current});\n    };\n";
const atomicHostOldUpload="      await this.documentPresentation.applyCooperatively(m.tiles);\n      complete();";
const atomicHostNewUpload="      const applied=await this.documentPresentation.applyCooperatively(m.tiles,()=>!this.disposed&&m.epoch===this.epoch&&m.version>=this.documentVersion);\n      complete(applied);";
function undoApprovedDisplayDiff(content,oldValue,newValue,name){
 const text=content.toString('utf8');
 assert.equal(text.split(newValue).length,2,'Unapproved display source change: '+name);
 return Buffer.from(text.replace(newValue,oldValue));
}
for(const e of lock.artifacts){
 let content=fs.readFileSync(e.path);
 if(e.path==='prototypes/brush-rt/build.mjs')content=undoApprovedDisplayDiff(content,atomicBuildOld,atomicBuildNew,'build module registry');
 if(e.path==='packages/brush-rt/src/document-presentation.mjs'){
  content=undoApprovedDisplayDiff(content,atomicDocumentOldMethod,atomicDocumentNewMethod,'document atomic method');
  content=undoApprovedDisplayDiff(content,'',atomicDocumentImport,'document import');
 }
 if(e.path==='packages/brush-rt/src/drawing-host.mjs'){
  content=undoApprovedDisplayDiff(content,cancelGpuInitReturnOld,cancelGpuInitReturnNew,'abortable GPU startup return');
  content=undoApprovedDisplayDiff(content,cancelGpuInitOld,cancelGpuInitNew,'abortable GPU startup header');
  content=undoApprovedDisplayDiff(content,parallelGpuInitOld,parallelGpuInitNew,'parallel GPU startup');
  content=undoApprovedDisplayDiff(content,atomicHostOldUpload,atomicHostNewUpload,'host atomic apply');
  content=undoApprovedDisplayDiff(content,atomicHostOldComplete,atomicHostNewComplete,'host exact version ACK');
 }
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
