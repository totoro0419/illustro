import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]??'.');
function replace(file,old,value){const p=path.join(root,file),s=fs.readFileSync(p,'utf8');if(!s.includes(old))throw Error('Instrumentation anchor missing: '+file);fs.writeFileSync(p,s.replace(old,value));}
// Read-only access for timing wrappers in the matched benchmark. No scheduling changes.
replace('apps/editor/src/brushSurface.ts','  get performanceDiagnostics(){','  handoffProbe(){return {renderer:this.renderer,session:this.session,controller:this.controller};}\n  get performanceDiagnostics(){');
replace('apps/editor/src/main.ts','  checkpoint:(fullSeed=false)=>','  probe:()=>surface?.handoffProbe(),\n  checkpoint:(fullSeed=false)=>');
