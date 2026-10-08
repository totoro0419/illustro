const params=new URL(self.location.href).searchParams;
const build=(params.get('build')||'dev').replace(/[^A-Za-z0-9._-]/g,'_');
const CACHE_PREFIX='illustro-m05-';
const CACHE_NAME=CACHE_PREFIX+build;
const scopeUrl=new URL('./',self.location.href).href;
const indexUrl=new URL('./index.html',self.location.href).href;

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const response=await fetch(scopeUrl,{cache:'reload'});
    if(!response.ok)throw new Error('M05 app shell fetch failed');
    await cache.put(scopeUrl,response.clone());
    await cache.put(indexUrl,response.clone());
    const html=await response.text(),urls=new Set([scopeUrl,indexUrl]);
    for(const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
      const raw=match[1];if(!raw||raw.startsWith('data:')||raw.startsWith('#'))continue;
      const url=new URL(raw,scopeUrl);if(url.origin===self.location.origin&&url.href.startsWith(scopeUrl))urls.add(url.href);
    }
    await Promise.all([...urls].map(async url=>{
      if(url===scopeUrl||url===indexUrl)return;
      try{const asset=await fetch(url,{cache:'reload'});if(asset.ok)await cache.put(url,asset);}catch{}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin||!url.href.startsWith(scopeUrl))return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const fresh=await fetch(request);
        if(fresh.ok){await cache.put(scopeUrl,fresh.clone());await cache.put(indexUrl,fresh.clone());}
        return fresh;
      }catch{
        return (await cache.match(scopeUrl))??(await cache.match(indexUrl))??Response.error();
      }
    })());return;
  }
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME),cached=await cache.match(request,{ignoreSearch:false});
    if(cached)return cached;
    try{
      const fresh=await fetch(request);
      if(fresh.ok&&(fresh.type==='basic'||fresh.type==='cors'))await cache.put(request,fresh.clone());
      return fresh;
    }catch{
      const withoutSearch=new Request(url.origin+url.pathname,{method:'GET',headers:request.headers,mode:'same-origin',credentials:'same-origin'});
      return (await cache.match(withoutSearch,{ignoreSearch:true}))??Response.error();
    }
  })());
});
