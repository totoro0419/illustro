import fs from 'node:fs';
import assert from 'node:assert/strict';
const log=fs.readFileSync(process.argv[2],'utf8').replace(/\x1b\[[0-9;]*m/g,'');
const get=key=>Number(log.match(new RegExp('(?:^|\\n)(?:#|ℹ) '+key+' +(\\d+)'))?.[1]??NaN);
assert.ok(get('tests')>=93,'baseline tests must remain present');
assert.equal(get('pass'),get('tests'),'all discovered tests must pass');
for(const key of ['fail','cancelled','skipped','todo'])assert.equal(get(key),0,key);
console.log('All '+get('tests')+' discovered brush tests passed.');
