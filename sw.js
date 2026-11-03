const VERSION='125';
const STATIC_CACHE='zahrada-static-v'+VERSION;
const RUNTIME_CACHE='zahrada-runtime-v'+VERSION;
const OFFLINE_URL='./offline.html';
// Cache only the offline shell at installation. Visited pages and their
// assets are cached on demand, without downloading unrelated content.
const PRECACHE=[
  './offline.html', './app.css?v=1', './app-icon.svg?v=4', './brand-mark.svg?v=1'
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
    const fresh=await fetch(request,{cache:'no-cache'});
    if(fresh&&fresh.ok){
      const cache=await caches.open(RUNTIME_CACHE);
      cache.put(request,fresh.clone());
    }
    return fresh;
  }catch(e){
    return (await caches.match(request,{ignoreSearch:true})) ||
      (await caches.match(OFFLINE_URL));
  }
}

async function staleWhileRevalidate(request){
  const cached=await caches.match(request);
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

  if(url.pathname==='/search-index.json'){
    event.respondWith(fetch(request,{cache:'no-cache'}).then(async response=>{
      if(!response.ok)throw new Error('search_index_'+response.status);
      const cache=await caches.open(RUNTIME_CACHE);
      await cache.put(request,response.clone());
      return response;
    }).catch(()=>caches.match(request,{ignoreSearch:true})));
    return;
  }

  if(['style','script'].includes(request.destination)){
    event.respondWith(fetch(request).then(async response=>{if(response&&response.ok){const cache=await caches.open(RUNTIME_CACHE);cache.put(request,response.clone());}return response;}).catch(()=>caches.match(request,{ignoreSearch:true})));
    return;
  }

  if(['image','font'].includes(request.destination)){
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(
    fetch(request).catch(()=>caches.match(request,{ignoreSearch:true}))
  );
});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch(e){
    data={title:'Záhrada s nápadom',body:event.data?.text?.()||'Nový obsah je dostupný.',url:'moja-zahrada.html'};
  }
  const title=data.title||'Záhrada s nápadom';
  const options={
    body:data.body||'Nový obsah je dostupný.',
    icon:'./app-icon.svg?v=4',
    badge:'./brand-mark.svg?v=1',
    tag:data.tag||('zahrada-'+Date.now()),
    data:{url:data.url||'moja-zahrada.html',type:data.type||'general'},
    renotify:false,
    requireInteraction:false
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const relative=event.notification?.data?.url||'moja-zahrada.html';
  const target=new URL(relative,self.location.href).href;
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const client of list){
        if('focus' in client){
          if('navigate' in client)client.navigate(target).catch(()=>{});
          return client.focus();
        }
      }
      return clients.openWindow?clients.openWindow(target):undefined;
    })
  );
});

