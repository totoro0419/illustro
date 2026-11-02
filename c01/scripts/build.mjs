import {cp,mkdir,stat} from 'node:fs/promises';
await mkdir('dist/app',{recursive:true});
for(const p of ['index.html','app/main.mjs','app/input-diagnostics.mjs','app/model.mjs','app/raster-worker.mjs','app/style.css']){const st=await stat(p);if(!st.size)throw new Error('Empty '+p);await cp(p,'dist/'+p)}
console.log('Build OK: static app dist/');
