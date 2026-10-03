import assert from 'node:assert/strict';

export async function verifyFoundation(page,r,checkpoint,fresh,benchmark){
 const quick=process.env.RT_QUICK_TEST==='1',sizes=quick?[4,512]:[4,16,128,512,1024];
 for(let index=0;index<7;index++)for(const size of sizes){
  await fresh(1024);
  const value=await page.evaluate(async({index,size})=>{
   const {session,renderer,foundationPresets}=window.__rt,{CanonicalBuilder,cpuReference}=await import('@rt/model');
   const p=structuredClone(foundationPresets[index]);p.size=size;p.stabilization.constant=index%2?1:0;p.stabilization.fast=.5;p.prediction.enabled=false;session.prediction=false;
   let base=new Uint8ClampedArray(renderer.document.width*renderer.document.height*4);
   if(p.blend==='erase'){const under=structuredClone(foundationPresets[2]);under.size=1024;under.color=[.1,.4,.8];session.begin(under);session.accept({x:512,y:384,t:performance.now(),pointerType:'mouse'});await session.end();base=await renderer.read();}
   renderer.confirmDelay=Infinity;session.begin(p);const t=performance.now();
   for(let i=0;i<32;i++)session.accept({x:350+i*8,y:384+Math.sin(i/6)*15,t:t+i*1000/240,pressure:i<8?.12:i<24?.85:.06,pointerType:'pen',origin:'coalesced',tilt:.4,azimuth:i*.05,twist:i*.08});
   const b=new CanonicalBuilder(p,session.active.seed);for(const s of session.active.raw)b.accept(s);b.finish();const ref=cpuReference(b.record(),renderer.document.width,renderer.document.height,base);
   const wait=async()=>{const revision=renderer.mailbox.revision,deadline=performance.now()+30000;while(!renderer.completions.some(m=>m.revision>=revision)){if(performance.now()>deadline)throw Error('foundation latest display timeout');await new Promise(r=>requestAnimationFrame(r));}};
   const compare=(got,expected,premultiply=true)=>{let max=0,bad=0,missing=0;for(let i=0;i<got.length;i+=4){if(expected[i+3]>8&&got[i+3]<expected[i+3]-3)missing++;for(let j=0;j<4;j++){const d=Math.abs(got[i+j]-(premultiply&&j<3?expected[i+j]*expected[i+3]/255:expected[i+j]));max=Math.max(max,d);if(d>3)bad++;}}return {maxChannelError:max,channelsOver3:bad,missingPixels:missing};};
   await wait();const active=await renderer.backend.readViewport(),activeError=compare(active,ref);
   await session.end();await wait();const lifted=await renderer.backend.readViewport(),liftChange=compare(lifted,active,false);
   renderer.confirmDelay=0;await renderer.drain();await new Promise(r=>requestAnimationFrame(r));await renderer.drain();const confirmed=await renderer.backend.readViewport(),confirmationChange=compare(confirmed,lifted,false);
   const final=await window.__rt.compare();const saved=JSON.stringify(session.export());await session.undo();await session.redo();const historyExact=JSON.stringify(session.export())===saved;await session.load(JSON.parse(saved));const loadExact=JSON.stringify(session.export())===saved;
   return {brush:p.id,size,activeError,liftChange,confirmationChange,final,historyExact,loadExact,actualInputs:session.records.at(-1).raw.length,measurement:'GPU viewport readback; physical presentation/perceptibility unverified'};
  },{index,size});
  r.checks.push({name:'foundation-transition-'+index+'-'+size,...value});await checkpoint();
  if(value.activeError.channelsOver3||value.liftChange.channelsOver3||value.confirmationChange.channelsOver3||value.final.visualChannelsOver3||!value.historyExact||!value.loadExact)r.previewDifferences=(r.previewDifferences??[]).concat(value);
  console.log('RT_FOUNDATION:'+JSON.stringify({backend:r.backend,...value}));assert.equal(value.actualInputs,32);
 }
 // Image tip, rotated/relative/inverted filtered texture, variable color and scatter.
 await fresh(512);
 for(const variant of ['mask','texture','scatter','color','phase','absolute','build-up']){
  const value=await page.evaluate(async variant=>{
   const {createPreset}=await import('@rt/foundation'),{session,renderer}=window.__rt;session.records=[];await session.rebuild();renderer.confirmDelay=Infinity;session.prediction=false;
   const p=createPreset('advanced-'+variant,variant,{renderer:'stamp',size:24,opacity:.6,flow:.4});
   if(variant==='mask'){p.tip.shape='mask';p.tip.resource='mask';p.tip.direction=true;p.resources.mask={kind:'mask',width:4,height:4,alpha:Array.from({length:16},(_,i)=>i%3?1:0)};}
   if(variant==='texture'){p.texture.paper={...p.texture.paper,kind:'image',resource:'paper',strength:.7,minimum:.2,sizeMode:'relative',scale:.3,rotation:.2,space:'tip',followDirection:true,invert:true,aa:true};p.resources.paper={kind:'texture',width:4,height:4,alpha:Array.from({length:16},(_,i)=>i/15)};}
   if(variant==='scatter'){p.scatter={...p.scatter,enabled:true,density:4,radius:.3,particleSize:.3,bias:-.3,rotation:'center'};p.random=[{target:'size',amount:.2},{target:'rotation',amount:1}];}
   if(variant==='color')p.dynamics=[{source:'pressure',target:'opacity',mode:'multiply',min:.05,max:1,curve:[[0,0],[1,1]]},{source:'distance',target:'hue',mode:'add',min:0,max:.5,curve:[[0,0],[1,1]],input:[0,50]}];
   if(variant==='phase'){p.taper.opacity.start={mode:'ramp',unit:'distance',length:10,minimum:.1,curve:[[0,0],[1,1]]};p.taper.flow.end={mode:'fade',unit:'distance',length:80,minimum:.1,curve:[[0,0],[1,1]]};}
   if(variant==='build-up')p.paint='build-up';
   if(variant==='absolute')p.spacing={...p.spacing,unit:'absolute',value:4};
   session.begin(p);const t=performance.now();for(let i=0;i<16;i++)session.accept({x:50+i*5,y:100+Math.sin(i/4)*10,t:t+i*5,pressure:i<8?.2:.9,pointerType:'pen'});await session.end();const deadline=performance.now()+30000,revision=renderer.mailbox.revision;while(!renderer.completions.some(m=>m.revision>=revision)){if(performance.now()>deadline)throw Error('advanced live timeout');await new Promise(r=>requestAnimationFrame(r));}const live=await window.__rt.compareLive();renderer.confirmDelay=0;return {variant,live,final:await window.__rt.compare()};
  },variant);r.checks.push({name:'foundation-advanced-'+variant,...value});await checkpoint();if(value.live.channelsOver3||value.final.visualChannelsOver3)r.previewDifferences=(r.previewDifferences??[]).concat(value);
 }
 // Repeat small curves and rapid taps/2px/5px strokes on the new Foundation,
 // with formal rendering held back. No legacy PASS stands in for these cases.
 for(let index=0;index<7;index++){
  if(quick&&![4,6].includes(index))continue;
  await fresh(512);
  for(const shape of (quick?['small-circle','zigzag','short-burst']:['line','small-circle','s','zigzag','reversal','taper','short-burst'])){
   const value=await page.evaluate(async({index,shape})=>{
    const {session,renderer,foundationPresets,pattern}=window.__rt;
    session.records=[];await session.rebuild();renderer.confirmDelay=Infinity;session.prediction=false;
    const p=structuredClone(foundationPresets[index]);p.size=16;p.stabilization.constant=.75;p.prediction.enabled=false;
    if(p.blend==='erase'){const under=structuredClone(foundationPresets[2]);under.size=1024;session.begin(under);session.accept({x:256,y:192,t:performance.now(),pointerType:'mouse'});await session.end();}
    const t=performance.now();let expected=0;
    if(shape==='short-burst'){
     for(let i=0;i<24;i++){session.begin(p);session.accept({x:50+(i%8)*50,y:80+Math.floor(i/8)*80,t:t+i*10,pressure:.7,pointerType:'pen'});if(i%3)session.accept({x:50+(i%8)*50+(i%3===1?2:5),y:80+Math.floor(i/8)*80,t:t+i*10+1,pressure:.7,pointerType:'pen'});await session.end();expected+=i%3?2:1;}
    }else{session.begin(p);for(let i=0;i<48;i++)session.accept({...pattern(shape,i/47,512,384),t:t+i*1000/240});await session.end();expected=48;}
    const deadline=performance.now()+30000,revision=renderer.mailbox.revision;while(!renderer.completions.some(m=>m.revision>=revision)){if(performance.now()>deadline)throw Error('foundation curve display timeout');await new Promise(r=>requestAnimationFrame(r));}
    const live=await window.__rt.compareLive(),records=session.records.filter(v=>v.foundation?.id===p.id),actual=records.reduce((n,v)=>n+v.raw.length,0);renderer.confirmDelay=0;const final=await window.__rt.compare();return {brush:p.id,shape,expected,actual,strokes:records.length,live,final};
   },{index,shape});
   r.checks.push({name:'foundation-shape-'+index+'-'+shape,...value});await checkpoint();assert.equal(value.actual,value.expected);if(shape==='short-burst')assert.equal(value.strokes,24);
   if(value.live.channelsOver3||value.final.visualChannelsOver3)r.previewDifferences=(r.previewDifferences??[]).concat(value);
  }
 }
 // Wide sweep joins must remain exact while the replaceable endpoint advances.
 for(const index of [4,6])for(const size of (quick?[512]:[512,1024]))for(const shape of (quick?['slow-curve','reversal']:['slow-curve','zigzag','reversal'])){
  await fresh(1024);
  const value=await page.evaluate(async({index,size,shape})=>{
   const {session,renderer,foundationPresets,pattern}=window.__rt,{CanonicalBuilder,cpuReference}=await import('@rt/model');
   const p=structuredClone(foundationPresets[index]);p.size=size;p.stabilization.constant=0;p.stabilization.fast=0;p.prediction.enabled=false;session.prediction=false;
   let base=new Uint8ClampedArray(1024*768*4);
   if(p.blend==='erase'){const under=structuredClone(foundationPresets[2]);under.size=1024;session.begin(under);session.accept({x:512,y:384,t:performance.now(),pointerType:'mouse'});await session.end();base=await renderer.read();}
   renderer.confirmDelay=Infinity;session.begin(p);const t=performance.now();
   const wait=async()=>{const revision=renderer.mailbox.revision,deadline=performance.now()+30000;while(!renderer.completions.some(m=>m.revision>=revision)){if(performance.now()>deadline)throw Error('wide sweep streaming timeout');await new Promise(r=>requestAnimationFrame(r));}};
   for(let i=0;i<96;i++){session.accept({...pattern(shape,i/96,1024,768),t:t+i*1000/240,pressure:.8,pointerType:'pen'});if(i%8===7)await wait();}
   const b=new CanonicalBuilder(p,session.active.seed);for(const raw of session.active.raw)b.accept(raw);b.finish();const ref=cpuReference(b.record(),1024,768,base);
   const compare=(got,expected,premultiply)=>{let max=0,bad=0,missing=0;for(let i=0;i<got.length;i+=4){if(expected[i+3]>8&&got[i+3]<expected[i+3]-3)missing++;for(let j=0;j<4;j++){const d=Math.abs(got[i+j]-(premultiply&&j<3?expected[i+j]*expected[i+3]/255:expected[i+j]));max=Math.max(max,d);if(d>3)bad++;}}return {maxChannelError:max,channelsOver3:bad,missingPixels:missing};};
   await wait();const active=await renderer.backend.readViewport(),activeError=compare(active,ref,true),stableCommands=session.active.stableSource.length;
   await session.end();await wait();const lifted=await renderer.backend.readViewport(),liftChange=compare(lifted,active,false);renderer.confirmDelay=0;await renderer.drain();const confirmed=await renderer.backend.readViewport(),confirmationChange=compare(confirmed,lifted,false);
   return {brush:p.id,size,shape,stableCommands,activeError,liftChange,confirmationChange,actualInputs:session.records.at(-1).raw.length};
  },{index,size,shape});
  r.checks.push({name:'foundation-wide-streaming-'+index+'-'+size+'-'+shape,...value});await checkpoint();assert.equal(value.actualInputs,96);assert.ok(value.stableCommands>0);
  if(value.activeError.channelsOver3||value.liftChange.channelsOver3||value.confirmationChange.channelsOver3)r.previewDifferences=(r.previewDifferences??[]).concat(value);
  console.log('RT_SWEEP:'+JSON.stringify({backend:r.backend,...value}));
 }
 if(quick){for(const brushIndex of ['f:4','f:6'])await benchmark({size:512,hz:240,duration:4000,shape:'fast-curve',brushIndex,prediction:false});for(const brushIndex of ['f:3',4])await benchmark({size:1024,hz:240,duration:4000,shape:'fast-curve',brushIndex,prediction:false});return;}
 // New foundation performance runs use the same generator and latency-growth gate.
 if(process.env.RT_LONG_TEST==='1')await benchmark({size:1024,hz:240,duration:180000,shape:'long',brushIndex:'f:3',prediction:false});
 for(const size of sizes)await benchmark({size,hz:240,duration:4000,shape:'fast-curve',brushIndex:'f:0',prediction:false,stabilization:size<=16?0:1});
 for(const hz of [60,120,240])await benchmark({size:512,hz,duration:4000,shape:'fast-curve',brushIndex:'f:3',prediction:false});
 for(const brushIndex of ['f:4','f:5','f:6'])await benchmark({size:512,hz:240,duration:4000,shape:'fast-curve',brushIndex,prediction:false});
 await benchmark({size:16,hz:240,duration:4000,shape:'reversal',brushIndex:'f:0',prediction:true});
 for(const stabilization of [0,1])for(const prediction of [false,true])await benchmark({size:16,hz:240,duration:4000,shape:'small-circle',brushIndex:'f:1',prediction,stabilization});
}
