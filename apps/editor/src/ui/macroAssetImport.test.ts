import {describe,it,expect} from 'vitest';
import {parseSimpleMacroFile} from './simpleMacros';

const file=(items:unknown[])=>({schema:'illustro.macros.simple',version:1,items});
const one={id:'basic',name:'表示の調整',steps:['fitView','zoomIn','resetRotation']};
describe('C05-020 safe macro asset import',()=>{
  it('accepts an existing approved macro format without executing its commands',()=>{
    expect(parseSimpleMacroFile(file([one]))).toEqual([one]);
  });
  it('refuses unsafe, duplicate or empty command sequences',()=>{
    expect(()=>parseSimpleMacroFile(file([{...one,steps:['arbitrary:code']}]))).toThrow();
    expect(()=>parseSimpleMacroFile(file([{...one,steps:[]}]))).toThrow();
    expect(()=>parseSimpleMacroFile(file([one,{...one,name:'another'}]))).toThrow();
    expect(()=>parseSimpleMacroFile(file([one,{...one,id:'other'}]))).toThrow();
  });
  it('refuses oversized and unknown formats before storing anything',()=>{
    expect(()=>parseSimpleMacroFile({...file([one]),version:999})).toThrow();
    expect(()=>parseSimpleMacroFile(file(Array.from({length:33},(_,i)=>({
      ...one,id:String(i),name:'Macro '+i
    }))))).toThrow();
  });
});
