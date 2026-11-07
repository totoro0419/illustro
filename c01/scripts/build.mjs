import {cp,mkdir,readdir,stat,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('dist/app',{recursive:true});
const paths=['index.html','input-test.html',...(await readdir('app')).filter(name=>/\.(mjs|css)$/.test(name)).map(name=>'app/'+name)];
const hash=createHash('sha256');
for(const path of paths){
 const info=await stat(path);
 if(!info.size)throw Error('Empty '+path);
 const content=await readFile(path);hash.update(path);hash.update(content);
 await cp(path,'dist/'+path);
}
const version=hash.digest('hex').slice(0,20);
const precache=paths.map(p=>'./'+p);
const sw=`const CACHE='illustro-c03-${version}';
const PREFIX='illustro-c03-';
const SHELL=${JSON.stringify(precache)};
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{await cache.addAll(SHELL.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})));}
  catch(error){await caches.delete(CACHE);throw error;}
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const saved=await cache.match(event.request,{ignoreSearch:true});
  return saved||fetch(event.request);
 })());
});
`;
await writeFile('dist/sw.js',sw);
let html=await readFile('dist/index.html','utf8');
html=html.replace('</head>','<link rel="stylesheet" href="./app/c03.css"></head>');
html=html.replace(/Illustro · C02/g,'Illustro · C03').replace(/<small> C02<\/small>/g,'<small> C03 alpha<\/small>');
const registration=`<script>if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')){addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(error=>console.warn('Offline cache unavailable',error)),{once:true})}</script>`;
html=html.replace('</body>',registration+'</body>');
await writeFile('dist/index.html',html);
console.log('Build OK: C03 static app; immutable offline shell '+version);
