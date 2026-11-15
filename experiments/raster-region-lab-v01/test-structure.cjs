const assert=require('node:assert/strict');
const engine=require('./engine.js');
const outcomes=[];
function check(name,fn){const t=Date.now();fn();outcomes.push({name,status:'PASS',ms:Date.now()-t});}
function graph(lines,w=100,h=100){return engine.faces(engine.planarize(lines.map(([a,b])=>({a:{x:a[0],y:a[1]},b:{x:b[0],y:b[1]},source:'manual'}))),w,h);}
const square=(x,y,s)=>[[[x,y],[x+s,y]],[[x+s,y],[x+s,y+s]],[[x+s,y+s],[x,y+s]],[[x,y+s],[x,y]]];
check('empty exterior',()=>{let r=graph([]);assert.equal(r.regions.length,1);assert.equal(r.regions[0].pixels,10000)});
check('exact square face and query',()=>{let r=graph(square(10,10,80));assert.equal(r.regions.length,2);assert.equal(r.regions[1].area,6400);assert.equal(r.labels[50*100+50],1);assert.equal(r.regions[1].neighbors[0],0)});
check('nested loops holes and exterior',()=>{let r=graph([...square(10,10,80),...square(30,30,40)]);assert.equal(r.regions.length,3);let shell=r.regions.find(r=>r.area===4800),core=r.regions.find(r=>r.area===1600);assert.equal(shell.holes.length,1);assert.equal(r.labels[15*100+15],shell.id);assert.equal(r.labels[50*100+50],core.id);assert.deepEqual(shell.neighbors,[0,core.id].sort((a,b)=>a-b));});
check('T splits adjacent regions, dangling slit does not split',()=>{let r=graph([...square(10,10,80),[[10,50],[90,50]],[[50,50],[50,75]]]);assert.equal(r.regions.length,3);assert.equal(r.regions.slice(1).reduce((a,r)=>a+r.area,0),6400)});
check('crossing boundaries are split and all four faces exist',()=>{let r=graph([...square(10,10,80),[[10,50],[90,50]],[[50,10],[50,90]]]);assert.equal(r.regions.length,5);assert.equal(r.vertices.find(v=>v.x===50&&v.y===50).out.length,4)});
check('overlapping segments do not duplicate boundaries',()=>{let r=graph([...square(10,10,80),[[10,10],[50,10]],[[30,10],[90,10]]]);assert.equal(r.regions.length,2);assert.equal(r.regions[1].area,6400)});
check('subpixel region is retained in authoritative graph',()=>{let r=graph(square(50.1,50.1,.2));assert.equal(r.regions.length,2);assert.ok(Math.abs(r.regions[1].area-.04)<1e-5);assert.equal(r.regions[1].pixels,0)});
check('three nested loops attach negative cycles correctly',()=>{let r=graph([...square(5,5,90),...square(20,20,60),...square(40,40,20)]);assert.equal(r.regions.length,4);assert.deepEqual(r.regions.slice(1).map(r=>r.area).sort((a,b)=>a-b),[400,3200,4500]);});
check('independent loops share one exterior',()=>{let r=graph([...square(5,5,20),...square(60,60,20)]);assert.equal(r.regions.length,3);assert.equal(r.regions[0].holes.length,2);});
check('all foreground pixels can be analyzed without nontermination',()=>{let w=64,h=64,a=new Uint8ClampedArray(w*h*4);for(let i=3;i<a.length;i+=4)a[i]=255;let r=engine.analyze(a,w,h,{gap:8});assert.ok(r.regions.length>=1)});
check('same raster repeats with identical geometry and labels',()=>{let w=80,h=80,a=new Uint8ClampedArray(w*h*4);for(let y=10;y<=60;y++)for(let x=10;x<=60;x++)if(x===10||x===60||y===10||y===60)a[(y*w+x)*4+3]=255;let r=engine.analyze(a,w,h),s=engine.analyze(a,w,h);assert.equal(r.diagnostics.hash,s.diagnostics.hash);assert.deepEqual(r.edges,s.edges);assert.equal(r.regions.length,2)});
check('transparent empty raster and unsupported sizes',()=>{let r=engine.analyze(new Uint8ClampedArray(100*100*4),100,100);assert.equal(r.regions.length,1);assert.throws(()=>engine.analyze(new Uint8Array(1),100,100));});
check('512 exhaustive 3x3 raster topology configurations',()=>{for(let bits=0;bits<512;bits++){let a=new Uint8ClampedArray(7*7*4);for(let k=0;k<9;k++)if(bits&(1<<k))a[((2+Math.floor(k/3))*7+2+k%3)*4+3]=255;engine.analyze(a,7,7,{mode:'none'});}});
console.log(JSON.stringify({kind:'structural verification only; human quality pending',tests:outcomes},null,2));
