import {describe,it,expect} from 'vitest';
import {CanvasView} from './canvasView';
import {ZeroTickGesture} from './zeroTickGesture';

function environment(){
  const listeners=new Map<string,Array<(e:any)=>void>>();
  const target={
    addEventListener(type:string,fn:(e:any)=>void){const a=listeners.get(type)??[];a.push(fn);listeners.set(type,a);},
    getBoundingClientRect(){return {left:10,top:20};},
    setPointerCapture(_id:number){}
  };
  const oldWindow=(globalThis as any).window;
  (globalThis as any).window={addEventListener(){}};
  function event(type:string,pointerId:number,x:number,y:number){
    const e:any={type,pointerType:'touch',pointerId,button:0,clientX:x+10,clientY:y+20,cancelled:false,
      preventDefault(){this.cancelled=true;},stopImmediatePropagation(){this.stopped=true;}};
    listeners.get(type)?.forEach(cb=>{if(!e.stopped)cb(e);});
    return e;
  }
  return {target:target as unknown as HTMLElement,event,close:()=>{if(oldWindow===undefined)delete (globalThis as any).window;else (globalThis as any).window=oldWindow;}};
}
describe('M10 zero-tick camera ownership',()=>{
  it('moves the camera synchronously without talking to the drawing service',()=>{
    const dom=environment(),camera=new CanvasView(4000,4000);camera.resize(390,680);
    let paints=0,finished=0;const gesture=new ZeroTickGesture(dom.target,camera,()=>false,()=>false,()=>false,()=>paints++,()=>finished++,()=>{throw Error('unexpected stroke finish');});
    const before=camera.panX;
    const down=dom.event('pointerdown',1,150,120);const moved=dom.event('pointermove',1,185,120);
    expect(down.stopped).toBe(true);expect(moved.stopped).toBe(true);
    expect(camera.panX-before).toBeCloseTo(35);expect(paints).toBe(1);
    expect(finished).toBe(0);
    dom.event('pointerup',1,185,120);expect(finished).toBe(1);
    gesture.dispose();dom.close();
  });
  it('does not finalize a finger stroke before the first visible two-finger movement',()=>{
    const dom=environment(),camera=new CanvasView(4000,4000);camera.resize(390,680);
    let paints=0,finished=0,inkFinished=0;const gesture=new ZeroTickGesture(dom.target,camera,()=>true,()=>false,()=>false,()=>paints++,()=>finished++,()=>inkFinished++);
    const first=dom.event('pointerdown',1,120,180);
    expect(first.stopped).not.toBe(true);expect(inkFinished).toBe(0);
    const second=dom.event('pointerdown',2,250,180);
    expect(second.stopped).toBe(true);expect(inkFinished).toBe(0);
    const before=camera.zoom;
    dom.event('pointermove',2,300,180);
    expect(camera.zoom).toBeGreaterThan(before);
    expect(paints).toBe(1);expect(inkFinished).toBe(0);
    dom.event('pointerup',2,300,180);
    expect(inkFinished).toBe(0);
    dom.event('pointerup',1,120,180);
    expect(inkFinished).toBe(1);expect(finished).toBe(1);
    gesture.dispose();dom.close();
  });
});
