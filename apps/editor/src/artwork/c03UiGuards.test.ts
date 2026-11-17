import {describe,it,expect} from 'vitest';
import {explicitSaveStatus,selectionCanCreateMask} from './c03UiGuards';

describe('C03-002 selection-to-mask action gates',()=>{
  const selection={width:3,height:2,alpha:new Uint8Array([0,255,0,128,0,0])};
  const rectangle={x:0,y:0,width:3,height:2};
  it('accepts a free-form per-pixel selection without a rectangular selection',()=>{
    expect(selectionCanCreateMask('selection',null,selection,3,2)).toBe(true);
  });
  it('keeps rectangle and ellipse actions disabled without a rectangle',()=>{
    expect(selectionCanCreateMask('rectangle',null,selection,3,2)).toBe(false);
    expect(selectionCanCreateMask('ellipse',null,selection,3,2)).toBe(false);
    expect(selectionCanCreateMask('rectangle',rectangle,null,3,2)).toBe(true);
  });
  it('rejects selection data from a different canvas or wrong byte count',()=>{
    expect(selectionCanCreateMask('selection',null,selection,4,2)).toBe(false);
    expect(selectionCanCreateMask('selection',null,{...selection,alpha:new Uint8Array(1)},3,2)).toBe(false);
    expect(selectionCanCreateMask('selection',null,null,3,2)).toBe(false);
  });
});

describe('C03-004 save feedback',()=>{
  it('does not claim success when only a download was requested',()=>{
    const message=explicitSaveStatus('download',false,false,'4 MB');
    expect(message).toContain('ダウンロードを開始');
    expect(message).toContain('確認してください');
    expect(message).not.toContain('確認済み');
    expect(explicitSaveStatus('download',false,true,'4 MB')).toContain('ダウンロードを開始');
  });
  it('describes verified picker saves distinctly for save and save-as',()=>{
    expect(explicitSaveStatus('picker',true,false,'4 MB')).toContain('保存先の内容を確認済み');
    expect(explicitSaveStatus('picker',true,true,'4 MB')).toContain('別名');
    expect(explicitSaveStatus('picker',false,false,'4 MB')).not.toContain('確認済み');
  });
});
