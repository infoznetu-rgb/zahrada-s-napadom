const CACHE='zahrada-live-v10';
const ASSETS=[
  './',
  './index.html',
  './zahrada.css',
  './assets/hero-modelka.webp',
  './zahrada.js',
  './cms-public.js',
  './prispevok.html',
  './prispevok.js',
  './bazar.html',
  './bazar.css',
  './bazar.js',
  './inzerat.html',
  './inzerat.js',
  './zahrada.webmanifest',
  './app-icon.svg',
  './brand-mark.svg',
  './assets/posts/terasova-hojdacia-lavicka/hlavna.webp'
];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.includes('/admin/'))return;
  e.respondWith(
    fetch(e.request).then(r=>{
      if(r.ok){
        const copy=r.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy));
      }
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./')))
  );
});