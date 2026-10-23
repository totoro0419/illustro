import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=process.env.ZERO_WAIT_EVIDENCE??'/tmp/zero-wait-evidence';
const [idle,loaded]=await Promise.all(['idle','real-gpu'].map(name=>fs.readFile(root+'/'+name+'/report.json','utf8').then(JSON.parse)));
assert.equal(idle.cases.length,loaded.cases.length,'The idle control and real GPU set must have matching cases');
const key=c=>[c.backend,c.route,c.brush,c.width,c.cpuRate,c.points,c.strokes].join('/');
const controls=new Map(idle.cases.map(c=>[key(c),c]));
const values=[];
for(const heavy of loaded.cases){
 const control=controls.get(key(heavy));assert.ok(control,'Missing idle control '+key(heavy));
 assert.equal(heavy.gated,false,'A completion-gated Worker is NOT real GPU load');
 assert.equal(heavy.strokes,2,'This comparison must use two full 512px strokes');
 assert.ok(heavy.final.formal.some(x=>x.jobs>0),'Actual formal drawing work must have executed');
 const overlap=heavy.initial?.diag?.handoff?.pendingGpu>0||heavy.initial?.diag?.handoff?.pendingLogical>0;
 const idleOverlap=control.initial?.diag?.handoff?.pendingGpu>0||control.initial?.diag?.handoff?.pendingLogical>0;
 assert.equal(idleOverlap,false,'Idle baseline still has pending formal drawing');
 const c=control.metrics,h=heavy.metrics;
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 assert.ok(finite(c.composedFirstMotionMs)&&finite(h.composedFirstMotionMs),'Both composed frames must contain measurable movement');
 const differenceMs=h.composedFirstMotionMs-c.composedFirstMotionMs;
 const maxFrameDifferenceMs=finite(c.composedMotionIntervalMaxMs)&&finite(h.composedMotionIntervalMaxMs)?h.composedMotionIntervalMaxMs-c.composedMotionIntervalMaxMs:null;
 values.push({backend:heavy.backend,brush:heavy.brush,width:heavy.width,
  formalOverlapped:overlap,realGpuJobs:heavy.final.formal.filter(x=>x.jobs>0).length,
  idle:{firstMotionMs:c.composedFirstMotionMs,maxFrameMs:c.composedMotionIntervalMaxMs,receiptP95Ms:c.inputReceiptP95Ms},
  loaded:{firstMotionMs:h.composedFirstMotionMs,maxFrameMs:h.composedMotionIntervalMaxMs,receiptP95Ms:h.inputReceiptP95Ms},
  additionalFirstMotionMs:differenceMs,additionalMaxFrameMs:maxFrameDifferenceMs,
  zeroExtraStopProven:false});
}
const report={kind:'actual formal GPU activity against completed, idle baseline',source:loaded.source,
 findings:values,allWorkloadOverlapped:values.every(x=>x.formalOverlapped),
 status:'measured only — no absolute zero-wait, hardware-compositor or physical-phone guarantee',
 limitations:['software GPU','CPU slowdown browser emulation','single pass per brush/backend','compositor screenshot not physical display','no exact pixel/content historical roundtrip in this comparison (separate test)']};
await fs.writeFile(root+'/comparison.json',JSON.stringify(report,null,2));
console.log('ZERO_WAIT_COMPARISON '+JSON.stringify(report));
