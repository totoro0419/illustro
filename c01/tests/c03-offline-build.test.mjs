import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
test('SAV-007 offline shell is versioned and contains the app',async()=>{
 execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'pipe'});
 const sw=await readFile('dist/sw.js','utf8'),html=await readFile('dist/index.html','utf8');
 assert.match(sw,/illustro-c03-[a-f0-9]{20}/);
 assert.match(sw,/cache\.addAll/);
 assert.match(sw,/new Request\(new URL\(path,self\.registration\.scope\)/);
 assert.match(sw,/ignoreSearch:true/);
 assert.match(sw,/catch\(error\)\{await caches\.delete\(CACHE\)/);
 assert.match(html,/serviceWorker\.register\('\.\/sw\.js'/);
 assert.match(html,/Illustro · C03/);
});
