import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {correctedPath,counterRandom,curve,evaluateDab,preset,strokeDabs,validateBrush} from '../app/brush-engine.mjs';
import {admit,PoseTimeline} from '../app/stroke-input.mjs';
import {createManifest,readManifest} from '../app/model.mjs';

const raw=(x,y,t,p=1)=>({x,y,t,p,tiltX:null,tiltY:null,azimuth:null,twist:null});
const points=[raw(0,0,0),raw(20,0,25,.25),raw(20,12,50,.5)];
const stroke=(brush=preset('round'))=>({brush,points,seed:'f041123456789abc',pen:true,curve:1,
 correction:{mode:'off'},size:10,opacity:1,flow:1,color:[4,17,90],colorAlpha:1});
test('BRU-003 causal EMA, exact off identity and raw endpoint',()=>{
 const off=correctedPath(points,{mode:'off'});
 assert.deepEqual(off.map(p=>[p.x,p.y,p.p]),points.map(p=>[p.x,p.y,p.p]));
 const result=correctedPath(points,{mode:'light'});
 assert.ok(Math.abs(result[1].x-20*(1-Math.exp(-2)))<1e-12);
 assert.deepEqual([result[2].x,result[2].y],[20,12]);
 assert.equal(result[1].p,.25);
 const pressure=correctedPath(points,{mode:'custom',positionTau:0,speedTau:0,pressureTau:.025});
 assert.ok(Math.abs(pressure[1].p-(1-.75*(1-Math.exp(-1))))<1e-12);
});
test('BRU-006 SHA-256 counter agrees with independent Node crypto',()=>{
 const seed='f041123456789abc', indexes=[0,42,2**32+12];
 for(const index of indexes)for(const channel of [0,1,19]){
  const values=Buffer.alloc(24);
  values.writeBigUInt64BE(BigInt('0x'+seed));values.writeBigInt64BE(BigInt(index),8);values.writeBigInt64BE(BigInt(channel),16);
  const hash=createHash('sha256').update('Illustro.Numeric.v1\0').update(values).digest();
  assert.equal(counterRandom(seed,index,channel),Number(hash.readBigUInt64BE()>>11n)/2**53);
 }
});
test('BRU-006 knot curve, ordered mappings, unavailable sensors and distance spacing',()=>{
 const knots=[[0,0],[.25,.5],[1,1]];
 assert.equal(curve(knots,.125),.25);
 const make=(source,operation,min,max,constant)=>({source,output:'size',operation,min,max,constant,knots,invert:false,enabled:true,scale:1});
 const brush=preset('round');
 brush.maps=[make('pressure','add',2,2),make('tilt','replace',80,80),make('pressure','multiply',2,2)];
 validateBrush(brush);
 assert.equal(evaluateDab(stroke(brush),{...points[0],distance:0},0,0).size,24);
 brush.maps[1].constant=.5;
 assert.equal(evaluateDab(stroke(brush),{...points[0],distance:0},0,0).size,160);
 const dabs=[...strokeDabs(stroke())];
 assert.equal(dabs.length,33);
 assert.deepEqual(dabs.slice(0,4).map(d=>d.x),[0,1,2,3]);
 assert.deepEqual([dabs.at(-1).x,dabs.at(-1).y],[20,12]);
});
test('BRU-008 short taper, disable and deterministic scatter',()=>{
 const brush={...preset('round'),scatter:3,taper:true,minWidth:.2,start:40,end:40,taperAlpha:.5};
 const s=stroke(brush),dabs=[...strokeDabs(s)];
 assert.deepEqual([...strokeDabs(s)],dabs);
 assert.ok(dabs.every(d=>d.size>=.2&&d.size<=10));
 assert.equal(dabs.at(-1).size,.2);
 assert.equal(dabs.at(-1).opacity,.5);
 assert.equal([...strokeDabs(stroke({...brush,taper:false}))].at(-1).size,10);
});
test('INP-007 pressure-only samples, reversed time and coalesced pose selection',()=>{
 const accepted=[];
 assert.ok(admit(accepted,raw(0,0,10,0)));
 assert.ok(admit(accepted,raw(0,0,15,.7)));
 assert.ok(admit(accepted,raw(0,0,15,.8)));
 assert.equal(admit(accepted,raw(0,1,14,1)),false);
 assert.ok(admit(accepted,raw(0,0,25,.8)),'Elapsed stationary contact affects time modulation and EMA');
 assert.deepEqual(accepted.map(p=>p.p),[0,.8,.8]);
 const contact=[raw(20,30,60,0)];
 assert.ok(admit(contact,raw(30,30,60,.4)),'Equal-time pen motion must not replace pointerdown');
 assert.equal(contact.length,2);
 assert.equal(contact[0].x,20,'First physical pen contact is preserved');
 assert.equal(contact[1].x,30);
 const timeline=new PoseTimeline(),rect={left:20,top:0};
 const view={x:0,y:0,scale:1,rotation:0,flipX:false,flipY:false};
 timeline.record(5,view,rect);
 timeline.record(20,{...view,x:10},rect);
 const event={pointerType:'pen',clientX:40,clientY:20,timeStamp:10,pressure:0};
 assert.equal(timeline.sample(event,{}).x,20);
 assert.equal(timeline.sample({...event,timeStamp:22},{}).x,10);
 assert.equal(timeline.sample({...event,timeStamp:2},{}),null);
});
test('BRU-011 both native versions open, V2 carries the frozen descriptor',()=>{
 const meta={name:'Test',width:16,height:16,dpi:72};
 const png='data:image/png;base64,AA';
 const descriptor=stroke(preset('pencil'));
 const legacy=createManifest(meta,png,1);
 assert.equal(readManifest(legacy).formatVersion,1);
 const native=createManifest(meta,png,2,[descriptor]);
 assert.deepEqual(readManifest(JSON.stringify(native)).brushArchive.strokes,[descriptor]);
 assert.throws(()=>readManifest({...native,brushArchive:null}));
 assert.throws(()=>validateBrush({...preset('pencil'),tip:'bitmap'}),/先端素材/);
});
