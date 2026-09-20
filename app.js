(()=>{
  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  let deferredPrompt=null;
  let toastTimer=null;

  function toast(message){
    let el=document.querySelector('.app-toast');
    if(!el){el=document.createElement('div');el.className='app-toast';el.setAttribute('role','status');document.body.appendChild(el)}
    el.textContent=message;el.classList.add('is-visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('is-visible'),2600);
  }

  function installPrompt(){
    let el=document.querySelector('.app-install-prompt');
    if(el)return el;
    el=document.createElement('aside');
    el.className='app-install-prompt';
    el.hidden=true;
    el.innerHTML='<img src="app-icon.svg?v=4" alt=""><div class="app-install-copy"><strong>Záhrada ako aplikácia</strong><span>Rýchly prístup, offline režim a app navigácia.</span></div><button class="app-install-action" type="button">Nainštalovať</button><button class="app-install-close" type="button" aria-label="Zavrieť">×</button>';
    document.body.appendChild(el);
    el.querySelector('.app-install-close').addEventListener('click',()=>{el.hidden=true;localStorage.setItem('pwa-install-dismissed',String(Date.now()))});
    el.querySelector('.app-install-action').addEventListener('click',async()=>{
      if(deferredPrompt){
        deferredPrompt.prompt();
        const choice=await deferredPrompt.userChoice.catch(()=>null);
        deferredPrompt=null;el.hidden=true;
        if(choice?.outcome==='accepted')toast('Aplikácia sa inštaluje.');
        return;
      }
      if(isIOS())showIOSSheet();
    });
    return el;
  }

  function showInstallPrompt(){
    if(isStandalone())return;
    const dismissed=Number(localStorage.getItem('pwa-install-dismissed')||0);
    if(dismissed&&Date.now()-dismissed<7*24*60*60*1000)return;
    const el=installPrompt();
    if(deferredPrompt||isIOS())setTimeout(()=>{el.hidden=false},1400);
  }

  function showIOSSheet(){
    let sheet=document.querySelector('.app-sheet');
    if(!sheet){
      sheet=document.createElement('div');sheet.className='app-sheet';sheet.hidden=true;
      sheet.innerHTML='<button class="app-sheet-backdrop" type="button" aria-label="Zavrieť"></button><section class="app-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="app-sheet-title"><div class="app-sheet-head"><div><span class="kicker">APLIKÁCIA</span><h2 id="app-sheet-title">Pridať na plochu</h2></div><button class="app-sheet-close" type="button" aria-label="Zavrieť">×</button></div><div class="app-sheet-steps"><div class="app-sheet-step"><b>1</b><p>V Safari otvor tlačidlo <strong>Zdieľať</strong>.</p></div><div class="app-sheet-step"><b>2</b><p>Vyber <strong>Pridať na plochu</strong>.</p></div><div class="app-sheet-step"><b>3</b><p>Potvrď <strong>Pridať</strong>. Záhrada sa potom otvorí ako samostatná aplikácia.</p></div></div></section>';
      document.body.appendChild(sheet);
      sheet.querySelectorAll('.app-sheet-close,.app-sheet-backdrop').forEach(x=>x.addEventListener('click',()=>sheet.hidden=true));
    }
    sheet.hidden=false;
  }

  function bottomNav(){
    if(!isStandalone())return;
    if(document.querySelector('.app-bottom-nav'))return;
    const path=location.pathname.split('/').pop()||'index.html';
    const nav=document.createElement('nav');nav.className='app-bottom-nav';nav.setAttribute('aria-label','Navigácia aplikácie');
    nav.innerHTML='<a href="index.html" data-app-route="home"><svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg><span>Domov</span></a><a href="blog.html" data-app-route="blog"><svg viewBox="0 0 24 24"><path d="M5 4.5h10a4 4 0 0 1 4 4v11H8a3 3 0 0 1-3-3z"/><path d="M8 19.5a3 3 0 0 1 3-3h8M8 8h7M8 11.5h7"/></svg><span>Blog</span></a><a href="index.html#projekty" data-app-route="ideas"><svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M8.5 14.5C7.3 13.5 6 12 6 9.5a6 6 0 1 1 12 0c0 2.5-1.3 4-2.5 5"/></svg><span>Nápady</span></a><a href="bazar.html" data-app-route="market"><svg viewBox="0 0 24 24"><path d="M4 8h16l-1 12H5zM7 8V6a5 5 0 0 1 10 0v2"/></svg><span>Bazár</span></a>';
    document.body.appendChild(nav);
    const active=path==='blog.html'||path==='prispevok.html'?'blog':path==='bazar.html'||path==='inzerat.html'?'market':'home';
    nav.querySelector('[data-app-route="'+active+'"]')?.classList.add('is-active');
  }

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;showInstallPrompt()});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;document.querySelector('.app-install-prompt')?.setAttribute('hidden','');toast('Aplikácia je nainštalovaná.')});
  window.addEventListener('online',()=>toast('Pripojenie je obnovené.'));
  window.addEventListener('offline',()=>toast('Si offline. Zobrazujem dostupný obsah.'));

  if('serviceWorker' in navigator){
    window.addEventListener('load',async()=>{
      try{
        const reg=await navigator.serviceWorker.register('./sw.js');
        if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
      }catch(e){}
    });
  }

  document.documentElement.classList.toggle('pwa-standalone',isStandalone());
  bottomNav();
  showInstallPrompt();
})();