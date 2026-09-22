const CACHE='zahrada-admin-v17';
const FILES=[
  './',
  './index.html',
  './admin.css',
  './admin.js',
  './bazar.css',
  './bazar.js',
  './bazar-import.css',
  './bazar-import.js',
  './admin-pwa.js',
  './admin.webmanifest',
  './admin-icon.svg',
  '../brand-mark.svg',
  '../app-icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('zahrada-admin-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.match('./index.html')));
    return;
  }

  const isAdminAsset=url.pathname.includes('/admin/')||url.pathname.endsWith('/brand-mark.svg')||url.pathname.endsWith('/app-icon.svg');
  if(!isAdminAsset)return;

  event.respondWith(
    fetch(request).then(response=>{
      if(response&&response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));
      return response;
    }).catch(()=>caches.match(request).then(cached=>cached||caches.match(url.pathname.split('/').pop()?('./'+url.pathname.split('/').pop()):'./')))
  );
});
