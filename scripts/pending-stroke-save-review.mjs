// Reuse the exact stage-gated verification setup, adding portable-save roundtrips
// after interruption/Redo branching without changing the tested application.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const source=await fs.readFile(new URL('./pending-stroke-undo-review.mjs',import.meta.url),'utf8');
const marker='pair.builds[mode]={...undone,redo,';
if(!source.includes(marker))throw Error('Pending Undo test hook changed; review save verification');
const extra=`
let portableSave;
if(mode==='after'){
 const expected=await p.evaluate(async()=>{const m=window.__pending;return {revision:m.c.document.head,pixels:await m.hash(),strokes:m.port.read().strokes};});
 await p.evaluate(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}));
 const download=p.waitForEvent('download',{timeout:90000});await p.evaluate(()=>document.getElementById('save').click());const bytes=await fs.readFile(await(await download).path());assert.ok(bytes.length>1000);await p.evaluate(async()=>{const m=window.__pending;m.draw({seed:11});await m.idle();});
 await p.locator('#openFile').setInputFiles({name:'interrupted-undo.illustro',mimeType:'application/octet-stream',buffer:bytes});
 await p.waitForFunction(rev=>document.getElementById('canvas').dataset.revisionId===rev&&document.getElementById('canvas').dataset.historyBusy==='false'&&!!window.__illustroPerformance.probe()?.renderer,expected.revision,{timeout:120000});
 const pixels=await p.evaluate(async()=>{const {renderer:r,controller:c}=window.__illustroPerformance.probe();await r.drain();const result=[];for(const layer of c.layers){const bytes=await r.backend.read(layer.surface.descriptor.surfaceId);result.push(Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).join(','));}return result;});
 assert.deepEqual(pixels,expected.pixels,'Save/reload after interrupted Undo and new branch preserves every layer pixel');assert.equal(Number(await p.locator('#canvas').getAttribute('data-committed-strokes')),expected.strokes);portableSave={bytes:bytes.length,exactLayerPixels:true,revision:expected.revision};
}
`;
const generated=source.replace(marker,extra+'pair.builds[mode]={portableSave,...undone,redo,');
const temp=path.join(process.env.PENDING_SAVE_TEMP??'/tmp','illustro-pending-save-check.mjs');await fs.writeFile(temp,generated);
const child=spawn(process.execPath,[temp],{stdio:'inherit',env:{...process.env,PENDING_MODES:'after',PENDING_STAGES:'partial,natural',PENDING_OUTPUT:process.env.PENDING_SAVE_OUTPUT??'/tmp/pending-stroke-save/report.json'}});const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});if(code!==0)throw Error('Pending save checks failed: '+code);
