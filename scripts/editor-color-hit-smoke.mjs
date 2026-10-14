/** Actual painted pixels, SVG hit ownership and trusted touch, including phone widths. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.RT_PLAYWRIGHT_PATH??'playwright');
const baseline=process.env.COLOR_HIT_BASELINE==='1',out=process.env.COLOR_HIT_EVIDENCE??'/tmp/color-hit-evidence';
const root=path.resolve(process.env.COLOR_HIT_APP_ROOT??'apps/editor/dist');let base=process.env.COLOR_HIT_PUBLIC_URL??'',server;
await fs.mkdir(out,{recursive:true});
if(!base){server=http.createServer(async(req,res)=>{try{const q=(req.url??'/').split('?')[0],file=path.resolve(root,'.'+(q==='/'?'/index.html':q));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base='http://127.0.0.1:'+server.address().port+'/';}
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let activePage=null;const report={commit:process.env.EXPECTED_COMMIT_SHA??null,baseline,scope:'Color UI and trusted Chromium touch emulation; physical Android unverified',cases:[],errors:[]};
try{for(const [width,dpr,touch] of (baseline?[[1440,2,false]]:[[390,3,true],[600,2,true],[900,2,true],[1440,1,false],[1440,3,false]])){
 const context=await browser.newContext({viewport:{width,height:touch?1100:1000},deviceScaleFactor:dpr,hasTouch:touch,isMobile:touch}),p=await context.newPage();activePage=p;const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+(base.includes('?')?'&':'?')+'m09=1&perf=1');
 if(await p.locator('#workspaceToggle').getAttribute('aria-expanded')==='false')await p.locator('#workspaceToggle').click();
 await p.waitForFunction(()=>{const el=document.getElementById('rightDock'),s=getComputedStyle(el),r=el.getBoundingClientRect();return Number(s.opacity)>.99&&s.transform==='none'&&r.top<innerHeight;},null,{timeout:10000});
 const mode=p.locator('#colorPickerMode'),wheel=p.locator('#colorOrbitWheel'),hex=p.locator('#colorHex'),plane=p.locator('#colorOrbitPlane');
 await mode.selectOption('orbit');
 if(await p.locator('#qaEntry').getAttribute('aria-expanded')==='true')await p.locator('#qaEntry').click();
 const ready=async()=>{await wheel.scrollIntoViewIfNeeded();await p.evaluate(()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok))));};
 const red=async()=>{await hex.fill('#FF0000');await hex.press('Enter');await ready();};
 await red();
 const hit=await wheel.evaluate(el=>{
  const b=el.getBoundingClientRect(),ctx=el.getContext('2d'),points=[],plane=el.parentElement.querySelector('#colorOrbitPlane');
  // Independent samples of the renderer's published ellipse, across its full
  // width. The old smoke sampled only the middle line, missing outer edges.
  for(let angle=0;angle<360;angle+=15)for(const t of [.02,.08,.5,.92,.98]){
   const a=angle*Math.PI/180,x=160+(97+49*t)*Math.cos(a),y=73+(31+20*t)*Math.sin(a),sx=b.left+x*b.width/320,sy=b.top+y*b.height/160;
   const pixel=ctx.getImageData(Math.floor(x*el.width/320),Math.floor(y*el.height/160),1,1).data,target=document.elementFromPoint(sx,sy);
   points.push({angle,t,alpha:pixel[3],target:target?.id,coveredBySv:angle>180&&!!target&&plane.contains(target)});
  }
  for(const x of [110,160,210]){const y=73+51*Math.sqrt(1-((x-160)/146)**2)+10,px=b.left+x*b.width/320,py=b.top+y*b.height/160;points.push({frontFace:true,x,y,alpha:ctx.getImageData(Math.floor(x*el.width/320),Math.floor(y*el.height/160),1,1).data[3],target:document.elementFromPoint(px,py)?.id});}
  return {bounds:{left:b.left,top:b.top,width:b.width,height:b.height,viewport:[innerWidth,innerHeight]},count:points.length,backOccluded:points.filter(pt=>pt.coveredBySv).length,backExposed:points.filter(pt=>pt.angle>180&&pt.target==='colorOrbitTopArc').length,misses:points.filter(pt=>pt.alpha>200&&!pt.coveredBySv&&!['colorOrbitTopArc','colorOrbitFrontArc'].includes(pt.target)),points};
 });
 report.activeCase={width,dpr,touch,hit};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 const before=Number(await wheel.getAttribute('aria-valuenow')),b=await wheel.boundingBox(),x=b.x+(160+97+49*.98)*b.width/320,y=b.y+73*b.height/160;
 await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x-45,y-6,{steps:8});await p.mouse.up();
 const outerHue=Number(await wheel.getAttribute('aria-valuenow'));
 assert.deepEqual(errors,[]);
 if(baseline){assert.ok(hit.misses.length>0);assert.equal(outerHue,before,'old outer visible band must reproduce the ignored drag');report.cases.push({width,dpr,touch,hit,outerHue,errors});await context.close();continue;}
 assert.deepEqual(hit.misses,[],'every visible colored rim pixel must own hue input');assert.ok(hit.backExposed>5,'upper rim must keep accessible clockwise rotation arcs');assert.ok(hit.backOccluded>0,'SV must physically cover some of the rear rim');assert.notEqual(outerHue,before,'visible outer edge must start hue drag');
 await plane.scrollIntoViewIfNeeded();
 const sv=await plane.evaluate(el=>{
  const r=el.getBoundingClientRect(),side=el.offsetWidth,wheel=el.parentElement.querySelector('#colorOrbitWheel'),b=wheel.getBoundingClientRect(),ctx=wheel.getContext('2d'),misses=[];let checked=0;const clip={left:0,top:0,right:innerWidth,bottom:innerHeight};for(let parent=el.parentElement;parent;parent=parent.parentElement){const style=getComputedStyle(parent),box=parent.getBoundingClientRect(),paint=style.contain.includes('paint');if(paint||/hidden|clip|scroll|auto/.test(style.overflowX)){clip.left=Math.max(clip.left,box.left);clip.right=Math.min(clip.right,box.right);}if(paint||/hidden|clip|scroll|auto/.test(style.overflowY)){clip.top=Math.max(clip.top,box.top);clip.bottom=Math.min(clip.bottom,box.bottom);}}
  for(let s=.02;s<.99;s+=.04)for(let v=.02;v<.99;v+=.04){
   const dx=(s-.5)*side,dy=(.5-v)*side,x=r.left+r.width/2+(dx-dy)/Math.SQRT2,y=r.top+r.height/2+(dx+dy)/Math.SQRT2,wx=(x-b.left)*wheel.width/b.width,wy=(y-b.top)*wheel.height/b.height;
   if(x<clip.left||y<clip.top||x>=clip.right||y>=clip.bottom)continue;
   const neighborhood=wx>=0&&wy>=0&&wx<wheel.width&&wy<wheel.height?ctx.getImageData(Math.floor(wx)-1,Math.floor(wy)-1,3,3).data:null;const alpha=neighborhood?Math.max(...Array.from({length:9},(_,i)=>neighborhood[i*4+3])):0;
   // Border anti-aliasing can cover a fraction of a pixel. Fully transparent
   // wheel pixels above a visible diamond must never acquire hue input.
   if(alpha!==0&&wy>=wheel.height*73/160)continue;checked++;const target=document.elementFromPoint(x,y);if(!el.contains(target))misses.push({s,v,target:target?.id});
  }
  return {checked,misses,naturalSize:[el.offsetWidth,el.offsetHeight],rotation:getComputedStyle(el).transform};
 });
 assert.ok(sv.checked>100);assert.deepEqual(sv.misses,[],'visible SV pixels must not be stolen by the transparent hue overlay');assert.ok(Math.abs(sv.naturalSize[0]-sv.naturalSize[1])<1);
 await red();const box=await wheel.boundingBox();const arc=deg=>({x:box.x+box.width*(160+121.5*Math.cos(deg*Math.PI/180))/320,y:box.y+box.height*(73+41*Math.sin(deg*Math.PI/180))/160});
 const cdp=touch?await context.newCDPSession(p):null;
 const down=async pt=>cdp?cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...pt}]}):(await p.mouse.move(pt.x,pt.y),p.mouse.down());
 const move=async pt=>cdp?cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,...pt}]}):p.mouse.move(pt.x,pt.y);
 const up=async()=>cdp?cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}):p.mouse.up();
 const cancel=async()=>{if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else{await p.evaluate(()=>document.getElementById('colorOrbitPicker').releasePointerCapture(1));await p.mouse.up();}};
 const trace=()=>p.evaluate(()=>({h:Number(document.getElementById('colorOrbitWheel').getAttribute('aria-valuenow')),s:Number(document.getElementById('colorNumber1').value),v:Number(document.getElementById('colorNumber2').value),color:document.getElementById('colorCode').textContent,gesture:document.getElementById('colorOrbitPicker').dataset.orbitGesture}));
 await down(arc(-130));const hues=[];for(let a=-125;a<=-50;a+=5){await move(arc(a));hues.push((await trace()).h);}await up();const rotation=await trace();
 assert.ok(rotation.h>265&&rotation.h<295);assert.equal(rotation.s,100);assert.equal(rotation.v,100);assert.ok(hues.every((h,i)=>i===0||h<=hues[i-1]),'upper right motion must rotate continuously clockwise');
 // Capture retains the initial wheel owner when crossing into visible SV.
 await red();const wb=await wheel.boundingBox(),pr=await plane.boundingBox();await down(arc(-130));await move({x:pr.x+pr.width/2,y:pr.y+pr.height/2});await up();const cross=await trace();assert.equal(cross.s,100);assert.equal(cross.v,100);
 await red();const rb=await wheel.boundingBox();await down({x:rb.x+rb.width*.5,y:rb.y+rb.height*114/160});await move({x:rb.x+rb.width*.5+40,y:rb.y+rb.height*114/160});await up();const slide=await trace();assert.ok(slide.h>=44&&slide.h<=48);
 await red();const cb=await wheel.boundingBox();await down({x:cb.x+cb.width*(160+121.5*Math.cos(-130*Math.PI/180))/320,y:cb.y+cb.height*(73+41*Math.sin(-130*Math.PI/180))/160});await move({x:cb.x+cb.width*.6,y:cb.y+cb.height*32/160});await cancel();assert.equal((await trace()).color,'#FF0000','cancelled color edits return to the previous color');
 if(cdp){
  // Real Chromium touch events: follow the complete ellipse through both
  // visible arcs, the hidden rear overlap, the front rim and angle wrap.
  // Mouse-only tests cannot establish that Android touch-action is correct.
  await red();
  const fullBounds=await wheel.boundingBox();
  const fullAt=deg=>({x:fullBounds.x+fullBounds.width*(160+121.5*Math.cos(deg*Math.PI/180))/320,
                     y:fullBounds.y+fullBounds.height*(73+41*Math.sin(deg*Math.PI/180))/160});
  // The browser must dispatch touchStart before the first motion sample.
  // CDP acknowledges dispatch before the rendered page processes the event;
  // without this synchronization an artificial test can silently start 10°
  // into the path, producing a false missing-samples failure.
  await p.evaluate(()=>{delete document.getElementById('colorOrbitPicker').dataset.orbitGesture;});
  await down(fullAt(-130));
  await p.waitForFunction(()=>document.getElementById('colorOrbitPicker')?.dataset.orbitGesture==='rotate',null,{timeout:5000});
  const fullCheck=[];
  for(let deg=-120;deg<=230;deg+=10){
   await move(fullAt(deg));
   // Chromium's CDP send acknowledgment can precede delivery of pointermove
   // to the page. Sample AFTER an animation frame, not the previous 10° step.
   await p.evaluate(()=>new Promise(ok=>requestAnimationFrame(ok)));
   if([-40,50,140,230].includes(deg))fullCheck.push(await trace());
  }
  await up();
  assert.equal(fullCheck.length,4,'Touch full-circle checkpoints');
  assert.ok(fullCheck.every(t=>t.gesture==='rotate'),'Full touch circle must not switch to SV or slider');
  assert.ok(fullCheck[3].h<8||fullCheck[3].h>352,'Touch tracing one full wheel lap must return to the initial hue: '+JSON.stringify(fullCheck));
  assert.equal(fullCheck[3].s,100);assert.equal(fullCheck[3].v,100);
  await p.setViewportSize({width,height:700});await p.locator('#colorOrbitPicker').scrollIntoViewIfNeeded();const blank=await p.locator('#colorOrbitPicker').evaluate(el=>{const r=el.getBoundingClientRect();let scroll=el.parentElement;while(scroll&&scroll.scrollHeight<=scroll.clientHeight+2)scroll=scroll.parentElement;if(!scroll)throw Error('no workspace scroll container');return {x:r.left+r.width*.08,y:r.top+r.height*.26,before:scroll.scrollTop};});
  const blankColor=(await trace()).color;await down({x:blank.x,y:blank.y});for(let i=1;i<=8;i++)await move({x:blank.x,y:blank.y-i*12});await up();
  await p.waitForFunction(before=>{let el=document.getElementById('colorOrbitPicker').parentElement;while(el&&el.scrollHeight<=el.clientHeight+2)el=el.parentElement;return el&&el.scrollTop>before+8;},blank.before,{timeout:6000});assert.equal((await trace()).color,blankColor,'blank space must scroll without changing color');
 }
 const selected=(await trace()).color;await mode.selectOption('classic');assert.equal(await p.locator('#colorCode').textContent(),selected);await mode.selectOption('orbit');assert.equal(await p.locator('#colorCode').textContent(),selected);
 await p.screenshot({path:path.join(out,'color-'+width+'-'+dpr+'.png')});report.cases.push({width,dpr,touch,hit,sv,rotation,slide,cross,errors});await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await context.close();
 }assert.deepEqual(report.errors,[]);assert.equal(report.cases.length,baseline?1:5);
}catch(e){report.errors.push(e.stack);if(activePage)await activePage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw e;}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();server?.close();}
console.log(JSON.stringify({commit:report.commit,baseline,cases:report.cases.map(c=>({width:c.width,dpr:c.dpr,touch:c.touch,ringMisses:c.hit.misses.length,svMisses:c.sv?.misses.length,rotation:c.rotation?.h,slide:c.slide?.h,errors:c.errors})),errors:report.errors}));
