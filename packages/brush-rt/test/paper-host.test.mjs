import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DrawingHost} from '../dist/rt/drawing-host.mjs';

test('late formal replies cannot reuse a reserved stroke identity or brush seed',()=>{
 const host=Object.create(DrawingHost.prototype);
 Object.assign(host,{localFaults:[],document:{jobs:{length:0}},backend:{},session:{id:28,seedSequence:4,pendingRawCount:17,rawAccepted:100,browserPredictions:4,recordsByToken:new Map}});
 const state=(id,seedSequence)=>({info:{},errors:[],completions:[],document:{width:512,height:512,count:0,jobs:0},session:{id,seedSequence,pendingRawCount:0,rawAccepted:0,browserPredictions:0}});
 host.update(state(19,3));assert.equal(host.session.id,28);assert.equal(host.session.seedSequence,4);
 host.update(state(37,5));assert.equal(host.session.id,37);assert.equal(host.session.seedSequence,5);
 host.update(state(28,4));assert.equal(host.session.id,37);assert.equal(host.session.seedSequence,5);
 assert.equal(host.session.pendingRawCount,17);assert.equal(host.session.rawAccepted,100);assert.equal(host.session.browserPredictions,4);
});
