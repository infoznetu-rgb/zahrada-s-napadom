const VERSION='81';
const STATIC_CACHE='zahrada-static-v'+VERSION;
const RUNTIME_CACHE='zahrada-runtime-v'+VERSION;
const OFFLINE_URL='./offline.html';
const PRECACHE=[
  './','./index.html','./moja-zahrada.html','./blog.html','./pomocky.html','./kalkulacka-farby.html','./kalkulacka-betonu.html','./hmozdinky-vrtaky.html','./rezaci-plan-dreva.html','./kalkulacka-dlazby.html','./pravy-uhol.html','./kalkulacka-strku.html','./kalkulacka-mulcu.html','./kalkulacka-sklonu.html','./kalkulacka-lazury.html','./kalkulacka-dazdovej-vody.html','./kalkulacka-zeminy-kompostu.html','./prevodnik-jednotiek.html','./projektovy-planovac.html','./kalkulacka-zavlahy.html','./kalkulacka-travnikoveho-osiva.html','./kalkulacka-plotovych-lat.html','./kalkulacka-terasovych-dosiek.html','./kalkulacka-ceny-vyrobku.html','./kalendar.html','./kalkulacka-vyvyseny-zahon.html','./prispevok.html','./bazar.html','./inzerat.html','./sutaz.html',
  './zahrada.css','./studio-2026.css','./spring-2026.css','./growth-2026.css','./typography-2026.css','./bazar.css','./app.css','./comments.css','./sutaz.css','./facebook-widget.css',
  './zahrada.js','./studio-2026.js','./garden-tools.js','./majster-tools.js','./cena-vyrobku.js','./cms-public.js','./blog.js','./prispevok.js','./bazar.js','./inzerat.js','./app.js','./comments.js','./sutaz.js','./moja-zahrada.js','./push.js','./facebook-widget.js',
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
