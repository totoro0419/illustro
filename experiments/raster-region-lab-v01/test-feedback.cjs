// Regression checks for the mechanisms prompted by human feedback.
// These assertions measure topology and connection selection, never artistic quality.
const assert=require('node:assert/strict'),fs=require('node:fs'),engine=require('./engine');
const tests=[];
function check(name,fn){fn();tests.push({name,status:'PASS'});}
function raster(name,opt={}){return engine.analyze(new Uint8Array(fs.readFileSync('fixtures/'+name+'.rgba')),240,180,{mode:'balanced',...opt});}
check('separately drawn converging sides produce a tip connection',()=>{const r=raster('feedback-taper');assert.equal(r.diagnostics.accepted,1);assert.ok(r.candidates[0].kind.startsWith('先端を閉じる'));assert.ok(r.candidates[0].taper.farWidth>r.candidates[0].taper.nearWidth);assert.equal(r.regions.length,1);});
check('closure evidence uses an already accepted connection',()=>{const r=raster('feedback-contour');assert.equal(r.regions.length,2);const c=r.candidates.find(c=>c.requiresClosure);assert.equal(c.status,'accepted');assert.ok(c.closureEvidence.route>c.distance*4);assert.equal(c.whiteGap,16);assert.ok(c.newArea>c.distance*c.distance);});
check('turning off contour extension leaves the larger gap',()=>{const r=raster('feedback-contour',{contourClosure:false});assert.equal(r.regions.length,1);assert.equal(r.diagnostics.accepted,1);});
check('blocking the short support link prevents the larger closure',()=>{let r=raster('feedback-contour'),id=r.candidates.find(c=>!c.requiresClosure).id;r=raster('feedback-contour',{blocked:[id]});assert.equal(r.regions.length,1);assert.equal(r.diagnostics.accepted,0);assert.equal(r.candidates.find(c=>c.requiresClosure).status,'pending');});
check('same large gap between open continuation strokes stays pending',()=>{const r=raster('feedback-open-continuation');assert.equal(r.diagnostics.accepted,0);assert.ok(r.candidates.some(c=>c.requiresClosure&&c.status==='pending'));});
check('constant separation parallel strokes are not capped',()=>{assert.equal(raster('parallel-open').diagnostics.accepted,0);});
check('multiple comparable tips are held',()=>{let r=raster('feedback-competing-tips');assert.equal(r.diagnostics.accepted,0);assert.ok(r.diagnostics.pending>=2);});
check('shared boundary ahead holds an ambiguous root or tip',()=>{const r=raster('feedback-taper-with-boundary-ahead');assert.equal(r.diagnostics.accepted,0);assert.ok(r.candidates.some(c=>c.boundaryAhead&&c.status==='pending'));});
check('zero gap disables all inferred links and repeated geometry is deterministic',()=>{for(let name of ['feedback-taper','feedback-contour']){assert.equal(raster(name,{gap:0}).diagnostics.accepted,0);let a=raster(name),b=raster(name);assert.equal(a.diagnostics.hash,b.diagnostics.hash);assert.deepEqual(a.candidates,b.candidates);}});
console.log(JSON.stringify({kind:'Human-feedback mechanism regression; no image quality grading',tests},null,2));

