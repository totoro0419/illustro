import {describe,expect,it} from 'vitest';
import {quickPinTarget,invokeCommandAsync,type CommandDefinition} from './commandPalette';
import {HistoryNavigation} from '../historyNavigation';
import {invokeMacroSequence,parseSimpleMacroFile} from './simpleMacros';
import {holdRestoreAllowed,validateShortcutSettings} from './shortcutSettings';
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

describe('C04-001 held-tool and Quick release ordering',()=>{
  it('unrelated Quick hold does not suppress eraser return after key release',()=>{
    const latest=new Map([['erase',1],['quickControllerOpen',2]]);
    const active=new Map<string,unknown>([['quickControllerOpen',{}]]);
    expect(holdRestoreAllowed('erase',1,active,latest)).toBe(true);
  });
  it('a new hold of the same tool suppresses the earlier release',()=>{
    const latest=new Map([['erase',4]]);
    expect(holdRestoreAllowed('erase',3,new Map(),latest)).toBe(false);
    expect(holdRestoreAllowed('erase',4,new Map([['erase',{}]]),latest)).toBe(false);
    expect(holdRestoreAllowed('erase',4,new Map(),latest)).toBe(true);
  });
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
  it('stops dependent steps when an earlier completion cannot be confirmed',async()=>{
    const calls:string[]=[];
    const result=await invokeMacroSequence(['undo','redo'],async id=>{
      calls.push(id);return succeed(false);
    });
    expect(calls).toEqual(['undo']);
    expect(result.ok).toBe(false);
    expect(result.failedStep).toBe(1);
    expect(result.unfinished).toBe(true);
    expect(result.reason).toMatch(/確認できない/);
  });
  it('does not describe a final dispatch-only command as confirmed complete',async()=>{
    const result=await invokeMacroSequence(['undo'],async()=>succeed(false));
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


describe('C04-002 completed macro operations',()=>{
  const command=(id:string,execute:CommandDefinition['execute']):CommandDefinition=>({
    id,label:id,category:'test',aliases:'',availability:()=>null,execute
  });
  it('waits for real Undo presentation before admitting Redo',async()=>{
    const events:string[]=[];let release!:()=>void;
    const history=new HistoryNavigation({prepare:async()=>{},state:()=>{},failed:()=>{},
      apply:async steps=>{events.push(steps[0]!);if(steps[0]==='undo')await new Promise<void>(r=>release=r);events.push(steps[0]+' complete');}});
    const invoke=async(id:string)=>invokeCommandAsync(command(id,async()=>{
      history.enqueue(id as 'undo'|'redo');await history.barrier();
    }));
    const running=invokeMacroSequence(['undo','redo'],invoke);
    await Promise.resolve();await Promise.resolve();
    expect(events).toEqual(['undo']);release();
    expect((await running).ok).toBe(true);
    expect(events).toEqual(['undo','undo complete','redo','redo complete']);
  });
  it('keeps brush, saved exact color and tool operations in order',async()=>{
    const events:string[]=[];
    const file=parseSimpleMacroFile({schema:'illustro.macros.simple',version:1,items:[{
      id:'legacy',name:'旧セット',steps:['brush:pen','color:#123456','erase']}]});
    const result=await invokeMacroSequence(file[0]!.steps,async id=>invokeCommandAsync(command(id,()=>{events.push(id);})));
    expect(result.ok).toBe(true);expect(events).toEqual(file[0]!.steps);
  });
  it('stops on thrown or rejected command errors and releases the execution lock',async()=>{
    const calls:string[]=[];
    const invoke=async(id:string)=>{calls.push(id);throw Error('failed');};
    expect((await invokeMacroSequence(['undo','redo'],invoke)).ok).toBe(false);
    expect(calls).toEqual(['undo']);
    await invokeMacroSequence(['redo'],invoke);expect(calls).toEqual(['undo','redo']);
  });
  it('refuses a second macro while the first command is pending',async()=>{
    let release!:()=>void;
    const invoke=async()=>{await new Promise<void>(r=>release=r);return succeed(true);};
    const running=invokeMacroSequence(['undo'],invoke);
    expect((await invokeMacroSequence(['redo'],invoke)).reason).toMatch(/実行中/);
    release();expect((await running).ok).toBe(true);
  });
  it.each(['cancel','work'] as const)('stops after a pending operation on %s',async mode=>{
    const abort=new AbortController();let work:unknown={};let release!:()=>void;
    const calls:string[]=[];
    const invoke=async(id:string)=>{calls.push(id);await new Promise<void>(r=>release=r);return succeed(true);};
    const running=invokeMacroSequence(['undo','redo'],invoke,{contextKey:()=>work,signal:abort.signal});
    if(mode==='cancel')abort.abort();else work={};
    release();expect((await running).ok).toBe(false);expect(calls).toEqual(['undo']);
  });
  it('does not report a command as complete if its work changed',async()=>{
    let work:unknown={};
    const result=await invokeCommandAsync(command('undo',()=>{work={};}),()=>work);
    expect(result.ok).toBe(false);expect(result.settled).toBe(false);
  });
});
