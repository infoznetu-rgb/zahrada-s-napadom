const VERSION='26';
const STATIC_CACHE='zahrada-static-v'+VERSION;
const RUNTIME_CACHE='zahrada-runtime-v'+VERSION;
const OFFLINE_URL='./offline.html';
const PRECACHE=[
  './','./index.html','./moja-zahrada.html','./blog.html','./prispevok.html','./bazar.html','./inzerat.html',
  './zahrada.css','./studio-2026.css','./spring-2026.css','./typography-2026.css','./bazar.css','./app.css',
  './zahrada.js','./studio-2026.js','./cms-public.js','./blog.js','./prispevok.js','./bazar.js','./inzerat.js','./app.js','./moja-zahrada.js',
  './zahrada.webmanifest','./offline.html','./app-icon.svg','./app-icon-maskable.svg','./brand-mark.svg',
  './assets/hero-ziva-zahrada.png','./assets/posts/terasova-hojdacia-lavicka/hlavna.webp'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('zahrada-')&&![STATIC_CACHE,RUNTIME_CACHE].includes(k)).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

async function navigationResponse(request){
  try{
    const fresh=await fetch(request);
    if(fresh&&fresh.ok){
      const cache=await caches.open(RUNTIME_CACHE);
      cache.put(request,fresh.clone());
    }
    return fresh;
  }catch(e){
    return (await caches.match(request,{ignoreSearch:true})) ||
      (await caches.match('./index.html')) ||
      (await caches.match(OFFLINE_URL));
  }
}

async function staleWhileRevalidate(request){
  const cached=await caches.match(request,{ignoreSearch:true});
  const network=fetch(request).then(async response=>{
    if(response&&response.ok){
      const cache=await caches.open(RUNTIME_CACHE);
      cache.put(request,response.clone());
    }
    return response;
  }).catch(()=>null);
  return cached || (await network) || new Response('',{status:504,statusText:'Offline'});
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.includes('/admin/'))return;

  if(request.mode==='navigate'){
    event.respondWith(navigationResponse(request));
    return;
  }

  if(['style','script','image','font'].includes(request.destination)){
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(
    fetch(request).catch(()=>caches.match(request,{ignoreSearch:true}))
  );
});