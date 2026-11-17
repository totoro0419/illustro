import {describe,expect,it} from 'vitest';
import {layerCommandsFromArtwork,type LayerCommandSource} from './commandPalette';

describe('C04-003 model-driven layer commands',()=>{
  it('indexes 200 layers, including hidden and UI-unmounted ones',()=>{
    const seen:string[]=[];
    const rows=Array.from({length:200},(_,index)=>({
      id:'layer-'+index,name:'作品レイヤー '+index,visible:index%2===0,
    }));
    const source:LayerCommandSource={layers:()=>rows,selectLayer:id=>{seen.push(id);}};
    const commands=layerCommandsFromArtwork(source);
    expect(commands).toHaveLength(200);
    expect(commands[199]?.label).toContain('（非表示）');
    expect(commands[199]?.availability()).toBeNull();
    commands[199]?.execute();
    expect(seen).toEqual(['layer-199']);
  });
  it('rejects stale removed-layer commands after a new work opens',()=>{
    let rows=[{id:'old',name:'Before',visible:true}];
    const source:LayerCommandSource={layers:()=>rows,selectLayer:()=>{}};
    const [command]=layerCommandsFromArtwork(source);
    rows=[{id:'new',name:'After',visible:true}];
    expect(command?.availability()).toMatch(/ありません/);
    expect(layerCommandsFromArtwork(source)[0]?.id).toBe('layer:new');
  });
});
