(()=>{
  const SAVED_KEY='zahrada-saved-v1';
  const HISTORY_KEY='zahrada-history-v1';
  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  let deferredPrompt=null;
  let toastTimer=null;
  const PUSH_API='https://bkyappgttwjxakkwycub.supabase.co/functions/v1/push-subscribe';
  const PUSH_PREF_KEY='zahrada-push-prefs-v1';
  const PROMO_DISMISS_KEY='zahrada-app-promo-dismissed-v1';

  const BOOKMARK_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h11v15l-5.5-3.4-5.5 3.4z"/></svg>';

  function safeRead(key){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'[]');
      return Array.isArray(value)?value:[];
    }catch(e){return []}
  }
  function safeWrite(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){return false}
  }
  function normalizePost(post){
    if(!post)return null;
    const slug=String(post.slug||'').trim();
    if(!slug)return null;
    return {
      slug,
      title:String(post.title||'Príspevok').trim(),
      category:String(post.category||'Nápad').replace(/^BLOG\s*·\s*/i,'').trim(),
      excerpt:String(post.excerpt||'').trim(),
      cover_url:String(post.cover_url||'').trim(),
      content_type:post.content_type==='project'?'project':'blog',
      url:String(post.url||('prispevok.html?slug='+encodeURIComponent(slug)))
    };
  }
  function getSaved(){return safeRead(SAVED_KEY)}
  function getHistory(){return safeRead(HISTORY_KEY)}
  function isSaved(slug){return getSaved().some(x=>x.slug===slug)}
  function dispatchLibraryChange(){
    window.dispatchEvent(new CustomEvent('zahrada:library-change',{detail:{saved:getSaved(),history:getHistory()}}));
  }
  function savePost(post){
    const p=normalizePost(post);if(!p)return false;
    const items=getSaved().filter(x=>x.slug!==p.slug);
    items.unshift({...p,saved_at:Date.now()});
    safeWrite(SAVED_KEY,items.slice(0,100));
    dispatchLibraryChange();
    return true;
  }
  function removeSaved(slug){
    safeWrite(SAVED_KEY,getSaved().filter(x=>x.slug!==slug));
    dispatchLibraryChange();
  }
  function toggleSaved(post){
    const p=normalizePost(post);if(!p)return false;
    if(isSaved(p.slug)){removeSaved(p.slug);return false}
    savePost(p);return true;
  }
  function addHistory(post){
    const p=normalizePost(post);if(!p)return;
    const items=getHistory().filter(x=>x.slug!==p.slug);
    items.unshift({...p,read_at:Date.now()});
    safeWrite(HISTORY_KEY,items.slice(0,30));
    dispatchLibraryChange();
  }
  function clearHistory(){safeWrite(HISTORY_KEY,[]);dispatchLibraryChange()}
  function clearSaved(){safeWrite(SAVED_KEY,[]);dispatchLibraryChange()}

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
    el.innerHTML='<img src="app-icon.svg?v=4" alt=""><div class="app-install-copy"><strong>Záhrada ako aplikácia</strong><span>Uložené články, história, offline režim a rýchla navigácia.</span></div><button class="app-install-action" type="button">Nainštalovať</button><button class="app-install-close" type="button" aria-label="Zavrieť">×</button>';
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


  async function requestInstall(){
    if(isStandalone()){
      toast('Aplikáciu už máš nainštalovanú.');
      return true;
    }
    if(deferredPrompt){
      deferredPrompt.prompt();
      const choice=await deferredPrompt.userChoice.catch(()=>null);
      if(choice?.outcome==='accepted'){
        deferredPrompt=null;
        toast('Aplikácia sa inštaluje.');
        updatePromoBanner();
        return true;
      }
      return false;
    }
    if(isIOS()){
      showIOSSheet();
      return false;
    }
    toast('Inštaláciu otvor cez ponuku prehliadača.');
    return false;
  }

  function pushSupported(){
    return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
  }

  function b64ToUint8Array(base64String){
    const padding='='.repeat((4-base64String.length%4)%4);
    const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base64);
    return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
  }

  async function pushApi(body){
    const response=await fetch(PUSH_API,body?{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)
    }:{method:'GET'});
    if(!response.ok)throw new Error('push_api_'+response.status);
    return response.json();
  }

  async function getPushSubscription(){
    if(!pushSupported())return null;
    const reg=await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }

  async function requestNotifications(){
    if(!pushSupported()){
      toast('Toto zariadenie nepodporuje webové upozornenia.');
      return false;
    }
    if(Notification.permission==='denied'){
      toast('Upozornenia sú zablokované v nastavení zariadenia.');
      return false;
    }
    try{
      const permission=Notification.permission==='granted'
        ?'granted'
        :await Notification.requestPermission();
      if(permission!=='granted'){
        updatePromoBanner();
        return false;
      }

      const {publicKey}=await pushApi();
      if(!publicKey)throw new Error('missing_vapid');

      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub){
        sub=await reg.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:b64ToUint8Array(publicKey)
        });
      }

      const preferences={blog:true,bazar:true};
      localStorage.setItem(PUSH_PREF_KEY,JSON.stringify(preferences));
      await pushApi({
        action:'subscribe',
        subscription:sub.toJSON(),
        preferences
      });
      toast('Upozornenia sú zapnuté.');
      updatePromoBanner();
      return true;
    }catch(error){
      console.error(error);
      toast('Upozornenia sa nepodarilo zapnúť.');
      return false;
    }
  }

  function createPromoPhone(){
    return `
      <div class="promo-phone" aria-hidden="true">
        <div class="promo-phone-speaker"></div>
        <div class="promo-phone-screen">
          <div class="promo-phone-brand">
            <img src="brand-mark.svg?v=1" alt="">
            <b>Záhrada<br><span>s nápadom</span></b>
          </div>
          <div class="promo-phone-label">Dnes pre teba</div>
          <div class="promo-phone-card">
            <div class="promo-phone-photo"><span>✿</span></div>
            <strong>Praktické tipy zo záhrady</strong>
            <small>Nové články každý týždeň</small>
          </div>
          <div class="promo-phone-icons">
            <span>☘<small>Blog</small></span>
            <span>✦<small>Nápady</small></span>
            <span>↔<small>Bazár</small></span>
          </div>
        </div>
      </div>`;
  }

  function promoBanner(){
    if(document.querySelector('.app-promo-banner'))return document.querySelector('.app-promo-banner');
    const banner=document.createElement('aside');
    banner.className='app-promo-banner';
    banner.setAttribute('aria-label','Aplikácia Záhrada s nápadom');
    banner.innerHTML=`
      <button class="app-promo-close" type="button" aria-label="Zavrieť">×</button>
      <div class="app-promo-logo"><img src="brand-mark.svg?v=1" alt=""><span>NAŠA APLIKÁCIA</span></div>
      <div class="app-promo-copy">
        <h2>Maj Záhradu vždy po ruke.</h2>
        <p>Nainštaluj si aplikáciu a zapni upozornenia na nové blogy a komunitný bazár.</p>
        <div class="app-promo-actions">
          <button class="app-promo-primary" type="button" data-promo-install>
            <span aria-hidden="true">↓</span> Nainštalovať aplikáciu
          </button>
          <button class="app-promo-secondary" type="button" data-promo-notify>
            <span aria-hidden="true">♢</span> Zapnúť upozornenia
          </button>
        </div>
        <small class="app-promo-note">Bez reklám · nastavenia môžeš kedykoľvek zmeniť</small>
      </div>
      <div class="app-promo-visual">${createPromoPhone()}</div>`;
    document.body.appendChild(banner);

    banner.querySelector('.app-promo-close').addEventListener('click',()=>{
      banner.classList.remove('is-visible');
      localStorage.setItem(PROMO_DISMISS_KEY,String(Date.now()));
      setTimeout(()=>banner.remove(),500);
    });
    banner.querySelector('[data-promo-install]').addEventListener('click',requestInstall);
    banner.querySelector('[data-promo-notify]').addEventListener('click',requestNotifications);
    return banner;
  }

  async function updatePromoBanner(){
    const banner=document.querySelector('.app-promo-banner');
    if(!banner)return;

    const installBtn=banner.querySelector('[data-promo-install]');
    const notifyBtn=banner.querySelector('[data-promo-notify]');
    const installed=isStandalone();
    let subscribed=false;
    try{subscribed=!!(await getPushSubscription())&&Notification.permission==='granted'}catch(e){}

    const installAvailable=!installed&&(!!deferredPrompt||isIOS());
    installBtn.hidden=!installAvailable;

    if(!pushSupported()||subscribed){
      notifyBtn.hidden=true;
    }else{
      notifyBtn.hidden=false;
      notifyBtn.disabled=Notification.permission==='denied';
      notifyBtn.innerHTML=Notification.permission==='denied'
        ?'<span aria-hidden="true">×</span> Upozornenia sú blokované'
        :'<span aria-hidden="true">♢</span> Zapnúť upozornenia';
    }

    if(installed&&subscribed){
      banner.classList.remove('is-visible');
      setTimeout(()=>banner.remove(),450);
    }
  }

  function maybeShowPromoBanner(){
    const path=location.pathname.split('/').pop()||'index.html';
    if(path==='moja-zahrada.html')return;
    const dismissed=Number(localStorage.getItem(PROMO_DISMISS_KEY)||0);
    if(dismissed&&Date.now()-dismissed<3*24*60*60*1000)return;

    setTimeout(async()=>{
      let subscribed=false;
      try{subscribed=!!(await getPushSubscription())&&Notification.permission==='granted'}catch(e){}
      if(isStandalone()&&subscribed)return;

      const banner=promoBanner();
      await updatePromoBanner();
      requestAnimationFrame(()=>requestAnimationFrame(()=>banner.classList.add('is-visible')));
    },4200);
  }

  function bottomNav(){
    if(!isStandalone())return;
    if(document.querySelector('.app-bottom-nav'))return;
    const path=location.pathname.split('/').pop()||'index.html';
    const nav=document.createElement('nav');nav.className='app-bottom-nav';nav.setAttribute('aria-label','Navigácia aplikácie');
    nav.innerHTML='<a href="moja-zahrada.html" data-app-route="home"><svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg><span>Domov</span></a><a href="blog.html" data-app-route="blog"><svg viewBox="0 0 24 24"><path d="M5 4.5h10a4 4 0 0 1 4 4v11H8a3 3 0 0 1-3-3z"/><path d="M8 19.5a3 3 0 0 1 3-3h8M8 8h7M8 11.5h7"/></svg><span>Blog</span></a><a href="index.html#projekty" data-app-route="ideas"><svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M8.5 14.5C7.3 13.5 6 12 6 9.5a6 6 0 1 1 12 0c0 2.5-1.3 4-2.5 5"/></svg><span>Nápady</span></a><a href="moja-zahrada.html#ulozene" data-app-route="saved"><svg viewBox="0 0 24 24"><path d="M6.5 4.5h11v15l-5.5-3.4-5.5 3.4z"/></svg><span>Uložené</span></a><a href="bazar.html" data-app-route="market"><svg viewBox="0 0 24 24"><path d="M4 8h16l-1 12H5zM7 8V6a5 5 0 0 1 10 0v2"/></svg><span>Bazár</span></a>';
    document.body.appendChild(nav);
    const active=path==='moja-zahrada.html'?(location.hash==='#ulozene'?'saved':'home'):path==='blog.html'||path==='prispevok.html'?'blog':path==='bazar.html'||path==='inzerat.html'?'market':'ideas';
    nav.querySelector('[data-app-route="'+active+'"]')?.classList.add('is-active');
  }

  function postFromCard(card){
    const link=card.querySelector('h3 a[href*="slug="],.cms-post-image[href*="slug="]');
    if(!link)return null;
    let url;
    try{url=new URL(link.getAttribute('href'),location.href)}catch(e){return null}
    const slug=url.searchParams.get('slug');if(!slug)return null;
    const tag=card.querySelector('.tag')?.textContent||'';
    return normalizePost({
      slug,
      title:card.querySelector('h3')?.textContent||'Príspevok',
      category:tag,
      excerpt:card.querySelector('.cms-post-body p')?.textContent||'',
      cover_url:card.querySelector('.cms-post-image img')?.getAttribute('src')||'',
      content_type:/BLOG/i.test(tag)?'blog':'project',
      url:'prispevok.html?slug='+encodeURIComponent(slug)
    });
  }

  function updateSaveButton(button,post){
    const saved=isSaved(post.slug);
    button.classList.toggle('is-saved',saved);
    button.setAttribute('aria-pressed',String(saved));
    button.setAttribute('aria-label',saved?'Odstrániť z uložených':'Uložiť na neskôr');
    button.title=saved?'Odstrániť z uložených':'Uložiť na neskôr';
  }

  function enhanceCard(card){
    if(card.dataset.appSaveReady==='1')return;
    const post=postFromCard(card);if(!post)return;
    const actions=card.querySelector('.cms-card-actions');if(!actions)return;
    const button=document.createElement('button');
    button.type='button';button.className='app-save-btn';button.innerHTML=BOOKMARK_ICON;
    button.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      const saved=toggleSaved(post);
      updateSaveButton(button,post);
      toast(saved?'Uložené na neskôr.':'Odstránené z uložených.');
    });
    actions.appendChild(button);
    updateSaveButton(button,post);
    card.dataset.appSaveReady='1';
  }

  function enhanceCards(root=document){
    root.querySelectorAll?.('.cms-post-card').forEach(enhanceCard);
  }

  function addArticleSaveButton(post){
    const head=document.querySelector('.post-dynamic-head');
    if(!head||head.querySelector('.app-article-save'))return;
    const button=document.createElement('button');
    button.type='button';button.className='app-article-save';
    button.innerHTML=BOOKMARK_ICON+'<span>Uložiť na neskôr</span>';
    const update=()=>{
      const saved=isSaved(post.slug);
      button.classList.toggle('is-saved',saved);
      button.setAttribute('aria-pressed',String(saved));
      button.querySelector('span').textContent=saved?'Uložené':'Uložiť na neskôr';
    };
    button.addEventListener('click',()=>{
      const saved=toggleSaved(post);update();toast(saved?'Článok je uložený.':'Článok bol odstránený z uložených.');
    });
    head.appendChild(button);update();
  }

  window.addEventListener('zahrada:article-loaded',event=>{
    const post=normalizePost(event.detail);if(!post)return;
    addArticleSaveButton(post);
    setTimeout(()=>addHistory(post),3500);
  });
  window.addEventListener('zahrada:library-change',()=>enhanceCards());

  const observer=new MutationObserver(mutations=>{
    for(const m of mutations)for(const node of m.addedNodes){
      if(node.nodeType!==1)continue;
      if(node.matches?.('.cms-post-card'))enhanceCard(node);
      enhanceCards(node);
    }
  });
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  enhanceCards();

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;updatePromoBanner()});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;document.querySelector('.app-install-prompt')?.setAttribute('hidden','');toast('Aplikácia je nainštalovaná.');updatePromoBanner()});
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

  window.ZahradaApp={
    getSaved,getHistory,isSaved,savePost,removeSaved,toggleSaved,addHistory,clearHistory,clearSaved,
    toast,normalizePost,requestInstall,requestNotifications,getPushSubscription
  };

  document.documentElement.classList.toggle('pwa-standalone',isStandalone());
  bottomNav();
  maybeShowPromoBanner();
})();