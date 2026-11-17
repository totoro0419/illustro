import {describe,it,expect} from 'vitest';
import {materialUseRoute,materialUseLabel} from './materialUseRouting';
describe('C05-020 real asset application routes',()=>{
  it('routes every reusable image material to an actual layer-placement action',()=>{
    for(const kind of ['tip','paper','texture','pattern','shape','gradient','reference']){
      expect(materialUseRoute({kind:kind as never,mime:'image/png'})).toBe('image-layer');
    }
  });
  it('sends declarative artwork and settings to their own validation paths',()=>{
    expect(materialUseRoute({kind:'shape',mime:'application/json'})).toBe('editable-artwork');
    expect(materialUseRoute({kind:'gradient',mime:'application/json'})).toBe('editable-artwork');
    expect(materialUseRoute({kind:'macro',mime:'application/json'})).toBe('macro');
    expect(materialUseRoute({kind:'workspace',mime:'application/json'})).toBe('workspace');
    expect(materialUseLabel('macro')).toBe('操作セットとして読み込む');
  });
  it('does not pretend unsupported executable code or mismatched files can be applied',()=>{
    expect(materialUseRoute({kind:'tip',mime:'application/javascript'})).toBeNull();
    expect(materialUseRoute({kind:'macro',mime:'text/html'})).toBeNull();
    expect(materialUseRoute({kind:'shape',mime:'application/octet-stream'})).toBeNull();
  });
});
