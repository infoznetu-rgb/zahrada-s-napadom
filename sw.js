const CACHE='zahrada-live-v5';
const ASSETS=[
  './',
  './index.html',
  './zahrada.css',
  './zahrada.js',
  './zahrada.webmanifest',
  './app-icon.svg',
  './projekty/hojdacia-lavicka.html',
  './assets/posts/terasova-hojdacia-lavicka/hlavna.webp',
  './assets/posts/terasova-hojdacia-lavicka/vyroba.webp',
  './assets/posts/terasova-hojdacia-lavicka/dielna.webp'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request).then(r=>{
    const copy=r.clone();
    caches.open(CACHE).then(c=>c.put(e.request,copy));
    return r;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./'))));
});