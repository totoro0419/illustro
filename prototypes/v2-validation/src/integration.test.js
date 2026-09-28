import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Brush reference hot path has no synchronous Region dependency',async()=>{
  const source=await readFile(new URL('./brush.js',import.meta.url),'utf8');
  assert.equal(/from ['"]\.\/region\.js['"]/.test(source),false);
});
