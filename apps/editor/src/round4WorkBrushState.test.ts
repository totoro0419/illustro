import {describe,expect,it} from 'vitest';
import {referenceBrushes} from '@illustro/brush-rt';
import {withBrushMaterial} from './assets/brushMaterial';
import {decodeWorkBrushState,encodeWorkBrushState,readLocalWorkBrushState,saveLocalWorkBrushState,type WorkBrushState} from './workBrushSettings';

describe('BRU-011 portable work brush state',()=>{
  const original=()=>structuredClone(referenceBrushes.find(p=>p.id==='foundation-technical')!);
  it('captures the exact edited preset and freezes the bytes at save start',()=>{
    const preset=original();preset.size=9;preset.opacity=.42;preset.pressure.smoothing=.37;preset.stabilization.constant=.61;
    const state:WorkBrushState={version:1,preset,commonStabilization:.35};
    const section=encodeWorkBrushState(state);
    preset.size=16;preset.opacity=.9;
    const restored=decodeWorkBrushState(section);
    expect(restored.preset).toMatchObject({id:'foundation-technical',size:9,opacity:.42});
    expect(restored.preset.pressure.smoothing).toBe(.37);
    expect(restored.preset.stabilization.constant).toBe(.61);
    expect(restored.commonStabilization).toBe(.35);
  });
  it('embeds a self-contained custom tip without modifying the source preset',()=>{
    const preset=withBrushMaterial(original(),'tip',{kind:'mask',width:2,height:2,alpha:[1,0,1,0]});
    preset.id='user-brush-round4';
    const state:WorkBrushState={version:1,preset,commonStabilization:.25};
    const restored=decodeWorkBrushState(encodeWorkBrushState(state));
    expect(restored.preset).toEqual(preset);
    expect(restored.preset.resources[restored.preset.tip.resource!]?.alpha).toEqual([1,0,1,0]);
  });
  it('separates latest work settings and safely ignores malformed state',()=>{
    const entries=new Map<string,string>(),storage={getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>{entries.set(key,value);}};
    const a=original(),b=original();a.size=9;b.size=17;
    expect(saveLocalWorkBrushState(storage,'a',{version:1,preset:a,commonStabilization:.1})).toBe(true);
    expect(saveLocalWorkBrushState(storage,'b',{version:1,preset:b,commonStabilization:.9})).toBe(true);
    expect(readLocalWorkBrushState(storage,'a')?.preset.size).toBe(9);
    expect(readLocalWorkBrushState(storage,'b')?.preset.size).toBe(17);
    expect(readLocalWorkBrushState(storage,'old')).toBeNull();
    expect(()=>decodeWorkBrushState({id:'brush.editing-state',type:'brush.editing-state.v1',bytes:new TextEncoder().encode('{"version":999}')})).toThrow();
    expect(()=>decodeWorkBrushState({id:'brush.editing-state',type:'brush.editing-state.v1',bytes:new Uint8Array()})).toThrow();
  });
});
