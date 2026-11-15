import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const expected={
 C01:'CAN-001 CAN-002 CAN-003 CAN-004 CAN-009 INP-001 INP-002 BRU-001 BRU-002 COL-001 UI-001 DEV-001 DEV-002 DEV-003 GST-001 HIS-001 SAV-003'.split(' '),
 C02:'CAN-008 INP-003 INP-004 INP-005 INP-006 INP-007 BRU-003 BRU-004 BRU-005 BRU-006 BRU-007 BRU-008 BRU-009 BRU-010 BRU-011 BRU-012 GST-003 GST-004'.split(' ')
};
const features=JSON.parse(fs.readFileSync('docs/product-planning/features.json','utf8'));
const sourceIds=new Set(features.map(feature=>feature.id));
assert.equal(features.length,247,'original product requirements must remain intact');
assert.equal(new Set(features.map(f=>f.id)).size,247,'duplicate source feature ID');
const all=Object.values(expected).flat();
assert.equal(new Set(all).size,35,'C01/C02 must contain exactly 35 distinct IDs');
for(const [chunk,ids] of Object.entries(expected)){
 const html=fs.readFileSync('qa/'+chunk.toLowerCase()+'-completion/index.html','utf8');
 const match=html.match(/const questions=([\s\S]*?);const key=/);
 assert.ok(match,chunk+' missing QA question data');
 const questions=JSON.parse(match[1]);
 assert.deepEqual(questions.map(x=>x[0]),ids,chunk+' QA must cover every official feature in order');
 for(const [,text] of questions)assert.ok(text.length>8);
 assert.ok(html.includes('./app/#home'),chunk+' must lead to a full editor build');
 assert.ok(html.includes('inputTrace=1'),chunk+' must expose real-device input diagnostic');
 assert.ok(html.includes('__COMMIT__'),chunk+' must stamp build commit');
 const code=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(code,chunk+' QA script missing');
 new vm.Script(code,{filename:chunk+' QA inline script'});
 for(const id of ids)assert.ok(sourceIds.has(id),id+' is not in the archived canonical specification');
 console.log(chunk+': '+ids.length+' canonical IDs, '+questions.length+' independent physical-device questions, script syntax OK');
}
console.log('SCOPE_REVIEW: 35 unique C01/C02 features; static QA integrity PASS (not functional acceptance)');
