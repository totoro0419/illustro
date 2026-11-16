import {describe,expect,it} from 'vitest';
import {quickPinTarget} from './commandPalette';
import {invokeMacroSequence} from './simpleMacros';
import {validateShortcutSettings} from './shortcutSettings';
import {validateWorkspaceProfiles} from './workspaceProfiles';

const succeed=(settled:boolean)=>({ok:true,reason:null,settled});
const validBinding={
  commandId:'paint',key:'p',code:'KeyP',ctrl:false,shift:true,alt:false,meta:false,
  physical:false,mode:'press' as const
};
const shortcuts=(bindings:unknown[])=>({
  schema:'illustro.user.shortcuts',version:1,bindings
});
const layout=()=>({
  width:340,leftHanded:false,compact:false,boxes:['right.layers'],
  expanded:{'right.layers':true},floats:[],tools:{order:[],hidden:[]}
});
const workspaces=(profiles:unknown[])=>({
  schema:'illustro.workspace.profiles',version:1,profiles
});

describe('C04 Quick Controller replacement safety',()=>{
  it('does not overwrite one of six occupied slots without choosing it',()=>{
    expect(quickPinTarget(['undo','redo','paint','erase','layer','save'],'fitView',null)).toBeNull();
  });
  it('uses an empty slot and keeps an existing pin stable',()=>{
    const slots=['undo','redo','','erase','layer','save'];
    expect(quickPinTarget(slots,'fitView',null)).toBe(2);
    expect(quickPinTarget(slots,'redo',null)).toBe(1);
  });
  it('supports explicit slot replacement and rejects invalid indices',()=>{
    const full=['undo','redo','paint','erase','layer','save'];
    expect(quickPinTarget(full,'fitView',4)).toBe(4);
    expect(quickPinTarget(full,'fitView',6)).toBeNull();
  });
});

describe('C04 sequential macro dispatch',()=>{
  it('waits for promised command completion before the next step',async()=>{
    let release!:(result:ReturnType<typeof succeed>)=>void;
    const waiting=new Promise<ReturnType<typeof succeed>>(resolve=>{release=resolve;});
    const calls:string[]=[];
    const pending=invokeMacroSequence(['paint','erase'],id=>{
      calls.push(id);
      return id==='paint'?waiting:Promise.resolve(succeed(true));
    });
    expect(calls).toEqual(['paint']);
    release(succeed(true));
    expect(await pending).toEqual({ok:true,reason:null,failedStep:null,unfinished:false});
    expect(calls).toEqual(['paint','erase']);
  });
  it('stops when a command fails instead of continuing',async()=>{
    const calls:string[]=[];
    const outcome=await invokeMacroSequence(['paint','undo','redo'],async id=>{
      calls.push(id);
      return id==='undo'?{ok:false,reason:'history unavailable',settled:false}:succeed(true);
    });
    expect(calls).toEqual(['paint','undo']);
    expect(outcome).toEqual({ok:false,reason:'history unavailable',failedStep:2,unfinished:false});
  });
  it('never treats a dispatch-only DOM command as confirmed complete',async()=>{
    const result=await invokeMacroSequence(['paint','erase'],async id=>succeed(id==='erase'));
    expect(result.ok).toBe(true);
    expect(result.unfinished).toBe(true);
  });
  it('rejects disallowed steps without execution',async()=>{
    let called=false;
    const result=await invokeMacroSequence(['open'],async()=>{called=true;return succeed(true);});
    expect(called).toBe(false);
    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe(1);
  });
});

describe('C04 imported workspace and shortcut validation',()=>{
  it('accepts a valid separate version-1 workspace and shortcut file',()=>{
    expect(()=>validateWorkspaceProfiles(workspaces([{name:'Drawing',layout:layout()}]),['right.layers'])).not.toThrow();
    expect(()=>validateShortcutSettings(shortcuts([validBinding]))).not.toThrow();
  });
  it('rejects malformed workspace profiles and duplicated shortcuts',()=>{
    expect(()=>validateWorkspaceProfiles(workspaces([
      {name:'Same',layout:layout()},{name:'Same',layout:layout()}
    ]),['right.layers'])).toThrow();
    expect(()=>validateShortcutSettings(shortcuts([validBinding,validBinding]))).toThrow();
    expect(()=>validateShortcutSettings({schema:'invalid',version:1,bindings:[]})).toThrow();
  });
});
