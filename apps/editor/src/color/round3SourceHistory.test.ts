import {describe,it,expect,vi} from 'vitest';
import {ForegroundColor,fromHex} from './model';
describe('D-027: source information survives restart without changing RGB history',()=>{
  it('persists source, reads old history and clears metadata with history',()=>{
    const data=new Map<string,string>();
    vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)});
    try{
      const red=fromHex('#AA3311')!,blue=fromHex('#1133AA')!;
      const source={assetId:'asset-a',boardItemId:'board-a',documentId:'doc-a',name:'資料',origin:'作者のメモ'};
      const first=new ForegroundColor();
      first.choose(red,source);first.choose(blue);
      const restored=new ForegroundColor();
      expect(restored.sourceFor(red)).toEqual(source);
      expect(restored.sourceFor(blue)).toBeNull();
      expect(restored.history).toContainEqual(red);
      restored.clearHistory();
      expect(new ForegroundColor().sourceFor(red)).toBeNull();
      data.set('illustro.workspace.colors.m09.v1',JSON.stringify({version:1,current:red,history:[red]}));
      const legacy=new ForegroundColor();
      expect(legacy.history).toContainEqual(red);
      expect(legacy.sourceFor(red)).toBeNull();
    }finally{vi.unstubAllGlobals();}
  });
});
