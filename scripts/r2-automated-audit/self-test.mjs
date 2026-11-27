import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const specs=JSON.parse(await readFile(new URL('./manifest.json',import.meta.url),'utf8'));
const ids='SAV-006 SAV-007 BRU-011 REF-006 GST-005 IO-006 FIL-005 LIN-006 LIN-007 SEL-001 TRN-005 TRN-006 PIX-001 PIX-002 VEC-004 INP-006 COL-008 LAY-005 NDE-002 FX-007 HIS-005 AUT-002 AUT-003 AUT-004 AUT-005 UI-007'.split(' ');
assert.deepEqual(specs.map(x=>x.id).sort(),ids.sort());
for(const s of specs){assert.ok(s.pending.length||s.browser,'empty gate');for(const p of s.unit)await readFile(p);}
for(const s of specs){const names=[s.browser,...(s.additionalBrowsers??[])].filter(Boolean);assert.equal(new Set(names).size,names.length);for(const name of names)assert.match(name,/^[A-Z]+-\d{3}(?:-tail)?$/);}
assert.throws(()=>assert.deepEqual([255,0,0,255],[0,255,0,255]));
console.log('26 unique feature IDs; referenced unit files exist; negative equality control passed');
