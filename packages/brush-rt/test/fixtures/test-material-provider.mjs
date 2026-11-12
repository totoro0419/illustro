import {rendererRegistry,compilePreset} from '../../dist/rt/foundation.mjs';

// A builtin-compatible provider example, not a wet-media simulation.
export function registerTestMaterial(){
 return rendererRegistry.register('worker-contract-provider',{compile(p,context){
  return compilePreset({...p,kind:'mono',renderer:'stamp',extensions:{},flow:p.extensions.test.flow},context);
 }});
}
