import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {buildRegions,inspectLocalGaps} from './pixels';
describe('LIN-006 original audit fixture',()=>{
  it.skipIf(!process.env.R2_ROUND4_FIXTURE_DIR)('finds both gaps from the original local audit fixture',()=>{
    const data=new Uint8Array(readFileSync(join(process.env.R2_ROUND4_FIXTURE_DIR,'line-art.rgba')));
    const graph=buildRegions(data,128,96,15,8,[]);
    for(const at of [{x:62,y:8},{x:100,y:8}]){
      const result=inspectLocalGaps(graph,at,8,[]);
      expect(result.some(g=>Math.abs((g.from.y+g.to.y)/2-at.y)<=2&&Math.abs((g.from.x+g.to.x)/2-at.x)<=3)).toBe(true);
    }
  });
});
