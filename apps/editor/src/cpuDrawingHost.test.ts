import {afterEach,expect,it,vi} from 'vitest';
import {createCanvas} from '@napi-rs/canvas';
import {createPreset,TILE} from '@illustro/brush-rt';
import {CpuDrawingHost} from './cpuDrawingHost';
import {renderFrozenArtworkOnCpu,type FrozenExport} from './export/basicExport';

afterEach(()=>vi.unstubAllGlobals());

it('commits and restores a canonical mark across CPU tiles',async()=>{
  const make=()=>createCanvas(1,1);
  vi.stubGlobal('document',{createElement:make});
  vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{});
  const canvas=make(),element={getContext:(mode:string)=>mode==='2d'?canvas.getContext('2d'):null};
  const host=new CpuDrawingHost(element as unknown as HTMLCanvasElement,140,15);
  const {session}=host,preset=createPreset('cpu-test','CPU test',{color:[0,0,0],size:12});
  session.begin(preset,0,{},'paint');
  session.accept({x:127,y:7,t:0,pressure:1});
  session.accept({x:136,y:7,t:10,pressure:1});
  const record=(await session.end(null))!;
  await host.waitStroke(session.commitRecord(record,[],'paint'));
  const before=await host.read('paint');
  expect(before[(7*140+127)*4+3]).toBeGreaterThan(0);
  expect(before[(7*140+129)*4+3]).toBeGreaterThan(0);
  const request=[{surfaceId:'paint',key:'0,0'},{surfaceId:'paint',key:'1,0'}];
  const tiles=await host.backend.readTiles(request);
  expect(tiles[0]!.pixels.length).toBe(TILE*TILE*4);
  const frozen={revision:'test' as FrozenExport['revision'],name:'CPU test',colorProfileId:'srgb',width:140,height:15,layers:[{surfaceId:'paint',visible:true,opacity:1}],
    strokes:[{surfaceId:'paint',record}]} as FrozenExport;
  expect(await renderFrozenArtworkOnCpu(frozen)).toEqual(new Uint8ClampedArray(before));
  await host.restore([]);
  expect((await host.read('paint')).some(Boolean)).toBe(false);
  await host.restore([{record,surfaceKey:'paint',keys:['0,0','1,0']}]);
  expect(await host.read('paint')).toEqual(before);
  host.destroy();
});
