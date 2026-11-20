import {describe,expect,it} from 'vitest';
import {visibleFillReferenceIds} from './reference';

describe('C08-009 visible artwork excluding one layer',()=>{
  const rows=[{id:'bottom',visible:true},{id:'hidden',visible:false},
    {id:'paint',visible:true},{id:'top',visible:true}];
  it('returns only visible layers apart from the excluded layer in stable order',()=>{
    expect(visibleFillReferenceIds(rows,'paint')).toEqual(['bottom','top']);
    expect(visibleFillReferenceIds(rows,'bottom')).toEqual(['paint','top']);
  });
  it('never silently includes hidden or unknown exclusions',()=>{
    expect(()=>visibleFillReferenceIds(rows,'hidden')).toThrow('表示中');
    expect(()=>visibleFillReferenceIds(rows,'missing')).toThrow('表示中');
    expect(()=>visibleFillReferenceIds(rows,'')).toThrow('表示中');
    expect(()=>visibleFillReferenceIds([{id:'only',visible:true}],'only')).toThrow('残りません');
  });
});
