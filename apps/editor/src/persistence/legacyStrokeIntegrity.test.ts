import {describe,expect,it} from 'vitest';
import type {StrokeRecord} from '@illustro/brush-rt';
import type {SemanticOperation} from '@illustro/core';
import {assertLegacyStrokeIntegrity} from './legacyStrokeIntegrity';

const record=(color:number)=>({
  version:3,engine:'engine-test',preset:{id:'custom'},raw:[{x:1,y:2,pressure:0.5}],
  commands:[[1,2,3,color]],foundation:{brush:{nested:[1,2,{color}]}}
}) as unknown as StrokeRecord;
const operation=(stroke:StrokeRecord)=>({
  kind:'brush.stroke',parameters:{strokeRecord:stroke}
}) as unknown as SemanticOperation;

describe('C03-010 legacy stroke preservation',()=>{
  it('accepts unchanged nested brush settings and original stroke order',()=>{
    const a=record(12),b=record(31);
    expect(()=>assertLegacyStrokeIntegrity([a,b],[operation(a),operation(b)])).not.toThrow();
    expect(()=>assertLegacyStrokeIntegrity([a],[operation(JSON.parse(JSON.stringify(a)) as StrokeRecord)])).not.toThrow();
  });
  it('rejects a changed brush parameter, dropped stroke and wrong stroke order',()=>{
    const a=record(12),b=record(31);
    expect(()=>assertLegacyStrokeIntegrity([a],[operation(b)])).toThrow('描線・ブラシ設定');
    expect(()=>assertLegacyStrokeIntegrity([a,b],[operation(a)])).toThrow('描線の数');
    expect(()=>assertLegacyStrokeIntegrity([a,b],[operation(b),operation(a)])).toThrow('描線・ブラシ設定');
  });
});
