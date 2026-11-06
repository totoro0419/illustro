import {cp,mkdir,readdir,stat} from 'node:fs/promises';
await mkdir('dist/app',{recursive:true});
const paths=['index.html','input-test.html',...(await readdir('app')).filter(name=>/\.(mjs|css)$/.test(name)).map(name=>'app/'+name)];
for(const path of paths){
 const info=await stat(path);
 if(!info.size)throw Error('Empty '+path);
 await cp(path,'dist/'+path);
}
console.log('Build OK: static app dist/');
