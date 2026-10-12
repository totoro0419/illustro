// Geometry/execution regressions. Human intention and artwork quality are not graded.
const fs=require('fs'),assert=require('assert/strict'),E=require('./engine');
const tests=[];
function check(name,fn){fn();tests.push({name,status:'PASS'});}
function run(name,options={}){return E.analyze(new Uint8Array(fs.readFileSync('fixtures/'+name+'.rgba')),240,180,{mode:'generous',gap:24,...options});}
check('short converging sides: relaxed connects, former criteria do not',()=>{assert.equal(run('relaxed-short-taper',{mode:'balanced'}).diagnostics.accepted,0);assert.equal(run('relaxed-short-taper').diagnostics.accepted,1);});
check('both extended sides meet: join real endpoints, never draw to virtual intersection',()=>{let r=run('extension-both-forward'),c=r.candidates.find(c=>c.status==='accepted');assert.equal(c.extensionEvidence.type,'both-forward');assert.deepEqual(c.polyline,[c.a,c.b]);assert.notDeepEqual(c.polyline.at(-1),c.extensionEvidence.point);});
check('one extension: land on real boundary interior',()=>{let r=run('extension-one-to-interior'),c=r.candidates.find(c=>c.status==='accepted');assert.equal(c.extensionEvidence.type,'one-forward');assert.equal(c.polyline.at(-1).x,99.5);assert.ok(c.polyline.at(-1).y>40&&c.polyline.at(-1).y<130);});
check('a third boundary blocks the endpoint link; first boundary can receive it',()=>{let r=run('extension-obstructed');assert.ok(r.candidates.some(c=>c.ends.length===2&&c.status==='rejected'));assert.ok(r.candidates.filter(c=>c.status==='accepted').every(c=>c.polyline.at(-1).x===89.5));assert.equal(r.diagnostics.accepted,1);});
check('constant width parallel lines stay unconnected in relaxed mode',()=>{assert.equal(run('parallel-open').diagnostics.accepted,0);});
check('same taper facing a boundary: former holds, relaxed accepts',()=>{assert.equal(run('feedback-taper-with-boundary-ahead',{mode:'balanced',gap:12}).diagnostics.accepted,0);assert.equal(run('feedback-taper-with-boundary-ahead',{gap:12}).diagnostics.accepted,1);});
check('larger cap within new default gap closes; former default leaves open',()=>{assert.equal(run('tip-gap-24',{mode:'balanced',gap:12}).regions.length,1);assert.equal(run('tip-gap-24').regions.length,2);});
check('human blocked connection remains blocked',()=>{let r=run('relaxed-short-taper'),id=r.candidates.find(c=>c.status==='accepted').id;assert.equal(run('relaxed-short-taper',{blocked:[id]}).diagnostics.accepted,0);});
check('zero gap and no helpers produce no inferred boundaries',()=>{for(const name of ['extension-both-forward','extension-one-to-interior','relaxed-short-taper']){assert.equal(run(name,{gap:0}).diagnostics.accepted,0);assert.equal(run(name,{mode:'none'}).diagnostics.accepted,0);}});
check('same relaxed Raster repeats with same boundary and labels',()=>{for(const name of ['extension-both-forward','extension-one-to-interior','relaxed-short-taper']){let a=run(name),b=run(name);assert.equal(a.diagnostics.hash,b.diagnostics.hash);assert.deepEqual(a.edges,b.edges);assert.deepEqual(a.candidates,b.candidates);}});
console.log(JSON.stringify({kind:'Extension/relaxed mode execution and geometry checks; human quality pending',tests},null,2));
