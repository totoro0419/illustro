'use strict';
// A tiny runtime boundary oracle. This is not the production command adapter.
function availability(intent,context){
 const needsDocument=intent.scope==='document'||intent.scope==='lifecycle'&&['save','export','close'].includes(intent.request);
 if(needsDocument){
  const id=intent.scope==='document'?intent.target.document:intent.context;
  if(!id||!context.document||id.id!==context.document.id||id.lifetime!==context.document.lifetime)return 'needs-target';
  if(intent.scope==='document'&&(!intent.basis||intent.basis.document.id!==id.id||intent.basis.document.lifetime!==id.lifetime))return 'stale-basis';
 }
 return 'ready';
}
const assert=require('node:assert/strict');
for(const context of [{},{document:{id:'A',lifetime:1}},{document:{id:'B',lifetime:1}}]){
 for(const request of ['new','open','list','recover'])assert.equal(availability({scope:'lifecycle',request},context),'ready');
 for(const scope of ['settings','view','assets'])assert.equal(availability({scope},context),'ready');
 for(const request of ['save','export','close']){
  assert.equal(availability({scope:'lifecycle',request,context:{id:'A',lifetime:1}},context),context.document?.id==='A'?'ready':'needs-target');
 }
}
assert.equal(availability({scope:'document',target:{document:{id:'A',lifetime:2}},basis:{document:{id:'A',lifetime:1}}},{document:{id:'A',lifetime:2}}),'stale-basis');
console.log('PASS: runtime no-document / one-document / switching lifecycle boundary');
