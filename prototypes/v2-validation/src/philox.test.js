import test from 'node:test';
import assert from 'node:assert/strict';
import { philox4x32_10 } from './philox.js';

test('Philox4x32-10 Random123 zero vector',()=>{
  assert.deepEqual(philox4x32_10([0,0,0,0],[0,0]),[0x6627e8d5,0xe169c58d,0xbc57ac4c,0x9b00dbd8]);
});
