import {describe,expect,it} from 'vitest';
import {readWorkBrushSettings,saveWorkBrushSettings} from './workBrushSettings';

describe('work brush settings',()=>{
  it('keeps the selected brush and edited size separate for each work',()=>{
    const entries=new Map<string,string>();
    const storage={getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>{entries.set(key,value);}};
    const roundPen={presetId:'foundation-round-pen',size:28};
    const gPen={presetId:'foundation-g-pen',size:16};
    saveWorkBrushSettings(storage,'work-a',roundPen);
    saveWorkBrushSettings(storage,'work-b',gPen);
    expect(readWorkBrushSettings(storage,'work-a')).toEqual(roundPen);
    expect(readWorkBrushSettings(storage,'work-b')).toEqual(gPen);
    expect(readWorkBrushSettings(storage,'old-work')).toBeNull();
  });

  it.each(['{','null','{"presetId":"","size":28}','{"presetId":"pen","size":"28"}','{"presetId":"pen","size":4097}'])(
    'ignores invalid local settings %s',
    value=>{
      expect(readWorkBrushSettings({getItem:()=>value,setItem:()=>{}},'work')).toBeNull();
    },
  );

  it('can open a work when browser storage is unavailable',()=>{
    const unavailable=()=>{throw new Error('Storage unavailable');};
    const storage={getItem:unavailable,setItem:unavailable};
    expect(()=>saveWorkBrushSettings(storage,'work',{presetId:'pen',size:28})).not.toThrow();
    expect(readWorkBrushSettings(storage,'work')).toBeNull();
  });
});
