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
  const ANALYTICS_URL='https://bkyappgttwjxakkwycub.supabase.co/rest/v1/site_events';
  const ANALYTICS_KEY='sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4';
  const POSTS_API='https://bkyappgttwjxakkwycub.supabase.co/rest/v1/zahrada_posts';
  let searchPostsCache=null;
  let searchTimer=null;
  const VISITOR_KEY='zahrada-visitor-v1';
  const ANALYTICS_SESSION_PREFIX='zahrada-analytics:';
  let currentArticleSlug='';


  const BOOKMARK_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h11v15l-5.5-3.4-5.5 3.4z"/></svg>';
  const SEARCH_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.2 4.2"></path></svg>';

  function escHtml(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[ch]));
  }

  function normalizeSearch(value){
    return String(value||'')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().trim();
  }

  async function loadSearchPosts(){
    if(Array.isArray(searchPostsCache))return searchPostsCache;
    const query='?select=slug,title,excerpt,category,cover_url,content_type,tags,content,published_at&status=eq.published&order=published_at.desc&limit=150';
    const response=await fetch(POSTS_API+query,{headers:{apikey:ANALYTICS_KEY}});
    if(!response.ok)throw new Error('search_posts_'+response.status);
    searchPostsCache=await response.json();
    return searchPostsCache;
  }

  function rankSearchPost(post,query){
    const q=normalizeSearch(query);
    if(!q)return 0;
    const title=normalizeSearch(post.title);
    const category=normalizeSearch(post.category);
    const excerpt=normalizeSearch(post.excerpt);
    const content=normalizeSearch(post.content);
    const tags=normalizeSearch(Array.isArray(post.tags)?post.tags.join(' '):post.tags);
    let score=0;
    if(title===q)score+=80;
    if(title.startsWith(q))score+=45;
    if(title.includes(q))score+=30;
    if(tags.includes(q))score+=20;
    if(category.includes(q))score+=15;
    if(excerpt.includes(q))score+=10;
    if(content.includes(q))score+=4;
    q.split(/\s+/).filter(Boolean).forEach(word=>{
      if(title.includes(word))score+=8;
      if(tags.includes(word))score+=5;
      if(excerpt.includes(word))score+=3;
      if(content.includes(word))score+=1;
    });
    return score;
  }

  function ensureSearchModal(){
    let modal=document.querySelector('#global-search-modal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='global-search-modal';
    modal.className='global-search-modal';
    modal.hidden=true;
    modal.innerHTML=`
      <button class="global-search-backdrop" type="button" data-search-close aria-label="Zavrieť vyhľadávanie"></button>
      <section class="global-search-panel" role="dialog" aria-modal="true" aria-labelledby="global-search-title">
        <div class="global-search-head">
          <div><span class="kicker">VYHĽADÁVANIE</span><h2 id="global-search-title">Nájdi článok alebo nápad</h2></div>
          <button class="global-search-close" type="button" data-search-close aria-label="Zavrieť">×</button>
        </div>
        <label class="global-search-field">
          <span class="sr-only">Hľadať</span>
          ${SEARCH_ICON}
          <input id="global-search-input" type="search" autocomplete="off" placeholder="Napr. trávnik, kompost, kov, terasa…">
          <button id="global-search-clear" type="button" aria-label="Vymazať" hidden>×</button>
        </label>
        <p id="global-search-status" class="global-search-status" aria-live="polite">Začni písať názov alebo tému.</p>
        <div id="global-search-results" class="global-search-results"></div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-search-close]').forEach(btn=>btn.addEventListener('click',closeSearch));
    modal.addEventListener('keydown',event=>{if(event.key==='Escape')closeSearch()});
    const input=modal.querySelector('#global-search-input');
    const clear=modal.querySelector('#global-search-clear');
    input.addEventListener('input',()=>{
      clear.hidden=!input.value;
      clearTimeout(searchTimer);
      searchTimer=setTimeout(()=>renderSearch(input.value),120);
    });
    clear.addEventListener('click',()=>{input.value='';clear.hidden=true;renderSearch('');input.focus()});
    return modal;
  }

  async function renderSearch(query){
    const modal=ensureSearchModal();
    const status=modal.querySelector('#global-search-status');
    const results=modal.querySelector('#global-search-results');
    const q=String(query||'').trim();
    if(q.length<2){
      status.textContent=q?'Napíš aspoň 2 znaky.':'Začni písať názov alebo tému.';
      results.innerHTML='';
      return;
    }
    status.textContent='Hľadám…';
    try{
      const posts=await loadSearchPosts();
      const found=posts
        .map(post=>({post,score:rankSearchPost(post,q)}))
        .filter(x=>x.score>0)
        .sort((a,b)=>b.score-a.score)
        .slice(0,14)
        .map(x=>x.post);
      trackEvent('search_used',{label:q});
      if(!found.length){
        status.textContent='Nenašiel som žiadny článok pre „'+q+'“.';
        results.innerHTML='<div class="global-search-empty">Skús kratšie slovo alebo inú tému.</div>';
        return;
      }
      status.textContent=found.length===1?'Našiel sa 1 výsledok.':'Nájdených '+found.length+' výsledkov.';
      results.innerHTML=found.map(post=>{
        const p=normalizePost(post);
        const rawCover=String(post.cover_url||'');
        const cover=rawCover?(rawCover.startsWith('http')?rawCover:(rawCover.startsWith('/')?rawCover:'/'+rawCover)):'';
        const type=post.content_type==='blog'?'BLOG':'NÁPAD';
        return `<a class="global-search-result" href="${escHtml(p.url)}">
          <span class="global-search-thumb">${cover?`<img src="${escHtml(cover)}" alt="" loading="lazy">`:'<b>✦</b>'}</span>
          <span class="global-search-copy">
            <small>${type} · ${escHtml(post.category||'')}</small>
            <strong>${escHtml(post.title||'Príspevok')}</strong>
            <span>${escHtml(post.excerpt||'')}</span>
          </span>
          <i aria-hidden="true">›</i>
        </a>`;
      }).join('');
    }catch(error){
      console.error(error);
      status.textContent='Vyhľadávanie sa momentálne nepodarilo načítať.';
      results.innerHTML='';
    }
  }

  function openSearch(initialQuery=''){
    const modal=ensureSearchModal();
    const input=modal.querySelector('#global-search-input');
    modal.hidden=false;
    document.body.classList.add('global-search-open');
    input.value=String(initialQuery||'');
    modal.querySelector('#global-search-clear').hidden=!input.value;
    renderSearch(input.value);
    setTimeout(()=>input.focus(),0);
  }

  function closeSearch(){
    const modal=document.querySelector('#global-search-modal');
    if(!modal)return;
    modal.hidden=true;
    document.body.classList.remove('global-search-open');
  }

  function addGlobalSearchButton(){
    const top=document.querySelector('.site-header .top');
    if(!top||top.querySelector('.site-search-trigger'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='site-search-trigger';
    button.setAttribute('aria-label','Vyhľadať článok');
    button.title='Vyhľadať článok';
    button.innerHTML=SEARCH_ICON+'<span>Hľadať</span>';
    button.addEventListener('click',()=>openSearch());
    const menu=top.querySelector('.menu');
    top.insertBefore(button,menu||null);
  }

  function visitorId(){
    try{
      let id=localStorage.getItem(VISITOR_KEY);
      if(!id){
        id=(crypto.randomUUID?.()||('v-'+Date.now()+'-'+Math.random().toString(36).slice(2)));
        localStorage.setItem(VISITOR_KEY,id);
      }
      return id;
    }catch(e){
      window.__zahradaVisitor=window.__zahradaVisitor||(crypto.randomUUID?.()||('s-'+Date.now()+'-'+Math.random().toString(36).slice(2)));
      return window.__zahradaVisitor;
    }
  }

  function analyticsOnce(key){
    try{
      const k=ANALYTICS_SESSION_PREFIX+key;
      if(sessionStorage.getItem(k))return false;
      sessionStorage.setItem(k,'1');
      return true;
    }catch(e){return true}
  }

  function trackEvent(eventType,{label='',articleSlug='',onceKey=''}={}){
    if(onceKey&&!analyticsOnce(onceKey))return;
    const payload={
      path:(location.pathname+location.search).slice(0,500),
      article_slug:(articleSlug||currentArticleSlug||'').slice(0,160)||null,
      referrer:(document.referrer||'').slice(0,1000)||null,
      visitor_id:visitorId().slice(0,80),
      event_type:eventType,
      event_label:String(label||'').slice(0,500)||null
    };
    fetch(ANALYTICS_URL,{
      method:'POST',
      headers:{
        apikey:ANALYTICS_KEY,
        'Content-Type':'application/json',
        Prefer:'return=minimal'
      },
      body:JSON.stringify(payload),
      keepalive:true
    }).catch(()=>{});
  }

  function setupArticleReading(post){
    const slug=String(post?.slug||currentArticleSlug||'').trim();
    if(!slug)return;
    const title=String(post?.title||document.querySelector('#post-title,h1')?.textContent||slug).trim();
    const thresholds=[25,50,75,100];
    const fired=new Set();
    const check=()=>{
      const article=document.querySelector('#post-content:not([hidden]),.post-page,.article-page main article');
      if(!article)return;
      const rect=article.getBoundingClientRect();
      const top=rect.top+window.scrollY;
      const height=Math.max(article.scrollHeight||rect.height,1);
      const viewBottom=window.scrollY+window.innerHeight;
      const pct=Math.max(0,Math.min(100,((viewBottom-top)/height)*100));
      thresholds.forEach(t=>{
        if(pct>=t&&!fired.has(t)){
          fired.add(t);
          trackEvent('read_'+t,{articleSlug:slug,label:title,onceKey:'read:'+slug+':'+t});
        }
      });
    };
    window.addEventListener('scroll',check,{passive:true});
    window.addEventListener('resize',check,{passive:true});
    setTimeout(check,700);
    setTimeout(()=>{
      if(document.visibilityState==='visible'){
        trackEvent('engaged_30s',{articleSlug:slug,label:title,onceKey:'engaged30:'+slug});
      }
    },30000);
  }

  function videoLabel(video){
    return String(
      video.closest('.cms-video-card')?.querySelector('h3')?.textContent||
      video.getAttribute('aria-label')||
      video.closest('.post-video-item')?.getAttribute('aria-label')||
      video.currentSrc?.split('/').pop()||
      'Video'
    ).trim().slice(0,500);
  }

  function wireVideoAnalytics(video){
    if(video.dataset.analyticsReady==='1')return;
    video.dataset.analyticsReady='1';
    const state={played:false,q25:false,q50:false,q75:false,complete:false};
    video.addEventListener('play',()=>{
      if(state.played)return;
      state.played=true;
      trackEvent('video_play',{label:videoLabel(video)});
    });
    video.addEventListener('timeupdate',()=>{
      if(!Number.isFinite(video.duration)||video.duration<=0)return;
      const pct=(video.currentTime/video.duration)*100;
      [[25,'q25','video_25'],[50,'q50','video_50'],[75,'q75','video_75']].forEach(([at,key,type])=>{
        if(pct>=at&&!state[key]){
          state[key]=true;
          trackEvent(type,{label:videoLabel(video)});
        }
      });
    });
    video.addEventListener('ended',()=>{
      if(state.complete)return;
      state.complete=true;
      trackEvent('video_complete',{label:videoLabel(video)});
    });
  }

  function wireAnalyticsMedia(root=document){
    root.querySelectorAll?.('video').forEach(wireVideoAnalytics);
  }


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
      url:String(post.url||(window.ZahradaSEO?.postHref?.(post)||('/prispevok.html?slug='+encodeURIComponent(slug))))
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
    el.innerHTML='<img src="/app-icon.svg?v=4" alt=""><div class="app-install-copy"><strong>Záhrada ako aplikácia</strong><span>Uložené články, história, offline režim a rýchla navigácia.</span></div><button class="app-install-action" type="button">Nainštalovať</button><button class="app-install-close" type="button" aria-label="Zavrieť">×</button>';
    document.body.appendChild(el);
    el.querySelector('.app-install-close').addEventListener('click',()=>{trackEvent('install_dismissed',{label:'install_prompt'});el.hidden=true;localStorage.setItem('pwa-install-dismissed',String(Date.now()))});
    el.querySelector('.app-install-action').addEventListener('click',async()=>{
      trackEvent('install_clicked',{label:'install_prompt'});
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
    if(deferredPrompt||isIOS())setTimeout(()=>{el.hidden=false;trackEvent('install_offer_shown',{label:'install_prompt',onceKey:'install-offer:prompt'})},1400);
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
    trackEvent('install_clicked',{label:'promo_banner'});
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
    showInstallHelp();
    return false;
  }

  function showInstallHelp(){
    let sheet=document.querySelector('.app-install-help');
    if(!sheet){
      sheet=document.createElement('div');
      sheet.className='app-sheet app-install-help';
      sheet.hidden=true;
      sheet.innerHTML='<button class="app-sheet-backdrop" type="button" aria-label="Zavrieť"></button><section class="app-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="install-help-title"><div class="app-sheet-head"><div><span class="kicker">INŠTALÁCIA APLIKÁCIE</span><h2 id="install-help-title">Ako nainštalovať Záhradu</h2></div><button class="app-sheet-close" type="button" aria-label="Zavrieť">×</button></div><div class="app-sheet-steps"><div class="app-sheet-step"><b>1</b><p>Ak si v <strong>Inkognito / anonymnom režime</strong>, otvor stránku v normálnom okne prehliadača. V anonymnom režime sa aplikácia nedá nainštalovať.</p></div><div class="app-sheet-step"><b>2</b><p>V Chrome hľadaj ikonu <strong>inštalácie vpravo v adresnom riadku</strong>, prípadne otvor menu <strong>⋮</strong> a vyber možnosť na inštaláciu aplikácie.</p></div><div class="app-sheet-step"><b>3</b><p>Na iPhone/iPade otvor v Safari <strong>Zdieľať → Pridať na plochu</strong>.</p></div></div></section>';
      document.body.appendChild(sheet);
      sheet.querySelectorAll('.app-sheet-close,.app-sheet-backdrop').forEach(x=>x.addEventListener('click',()=>sheet.hidden=true));
    }
    sheet.hidden=false;
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
            <img src="/brand-mark.svg?v=1" alt="">
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
      <div class="app-promo-logo"><img src="/brand-mark.svg?v=1" alt=""><span>NAŠA APLIKÁCIA</span></div>
      <div class="app-promo-copy">
        <h2>Maj Záhradu vždy po ruke.</h2>
        <p>Nainštaluj si aplikáciu a zapni upozornenia na nové blogy a komunitný bazár.</p>
        <div class="app-promo-actions">
          <button class="app-promo-primary" type="button" data-promo-install>
            <span aria-hidden="true">↓</span> Stiahnuť aplikáciu
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
      trackEvent('install_dismissed',{label:'promo_banner'});
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

    const installAvailable=!installed;
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
      requestAnimationFrame(()=>requestAnimationFrame(()=>{banner.classList.add('is-visible');trackEvent('install_offer_shown',{label:'promo_banner',onceKey:'install-offer:promo'})}));
    },4200);
  }

  function bottomNav(){
    if(!isStandalone())return;
    if(document.querySelector('.app-bottom-nav'))return;
    const pathname=location.pathname;
    const path=pathname.split('/').pop()||'index.html';
    const nav=document.createElement('nav');nav.className='app-bottom-nav';nav.setAttribute('aria-label','Navigácia aplikácie');
    nav.innerHTML='<a href="/moja-zahrada.html" data-app-route="home"><svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg><span>Domov</span></a><a href="/blog.html" data-app-route="blog"><svg viewBox="0 0 24 24"><path d="M5 4.5h10a4 4 0 0 1 4 4v11H8a3 3 0 0 1-3-3z"/><path d="M8 19.5a3 3 0 0 1 3-3h8M8 8h7M8 11.5h7"/></svg><span>Blog</span></a><a href="/#projekty" data-app-route="ideas"><svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M8.5 14.5C7.3 13.5 6 12 6 9.5a6 6 0 1 1 12 0c0 2.5-1.3 4-2.5 5"/></svg><span>Nápady</span></a><a href="/moja-zahrada.html#ulozene" data-app-route="saved"><svg viewBox="0 0 24 24"><path d="M6.5 4.5h11v15l-5.5-3.4-5.5 3.4z"/></svg><span>Uložené</span></a><a href="/bazar.html" data-app-route="market"><svg viewBox="0 0 24 24"><path d="M4 8h16l-1 12H5zM7 8V6a5 5 0 0 1 10 0v2"/></svg><span>Bazár</span></a>';
    document.body.appendChild(nav);
    const active=pathname.endsWith('/moja-zahrada.html')?(location.hash==='#ulozene'?'saved':'home'):(pathname==='/blog.html'||pathname.startsWith('/blog/')||pathname==='/prispevok.html')?'blog':(pathname==='/bazar.html'||pathname==='/inzerat.html')?'market':'ideas';
    nav.querySelector('[data-app-route="'+active+'"]')?.classList.add('is-active');
  }

  function postFromCard(card){
    const link=card.querySelector('h3 a,.cms-post-image');
    if(!link)return null;
    let url;
    try{url=new URL(link.getAttribute('href'),location.href)}catch(e){return null}
    let slug=String(card.dataset.postSlug||url.searchParams.get('slug')||'').trim();
    if(!slug){
      const segment=url.pathname.split('/').filter(Boolean).pop()||'';
      const known=[...(window.ZahradaSEO?.STATIC_SLUGS||[])];
      slug=known.find(s=>window.ZahradaSEO?.cleanSlug?.(s)===segment)||segment;
    }
    if(!slug)return null;
    const tag=card.querySelector('.tag')?.textContent||'';
    const contentType=card.dataset.postType||(/BLOG/i.test(tag)?'blog':'project');
    return normalizePost({
      slug,
      title:card.querySelector('h3')?.textContent||'Príspevok',
      category:tag,
      excerpt:card.querySelector('.cms-post-body p')?.textContent||'',
      cover_url:card.querySelector('.cms-post-image img')?.getAttribute('src')||'',
      content_type:contentType,
      url:window.ZahradaSEO?.postHref?.({slug,content_type:contentType})||('/prispevok.html?slug='+encodeURIComponent(slug))
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


  function repairBrokenImages(root=document){
    root.querySelectorAll?.('img').forEach(img=>{
      if(img.dataset.zahradaImageGuard==='1')return;
      img.dataset.zahradaImageGuard='1';
      const fallback=()=>{
        if(img.dataset.zahradaFallbackUsed==='1')return;
        img.dataset.zahradaFallbackUsed='1';
        img.src='/assets/blog/fallback-cover.svg';
      };
      img.addEventListener('error',fallback,{once:true});
      if(img.complete&&img.naturalWidth===0)fallback();
    });
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
    currentArticleSlug=post.slug;
    trackEvent('article_open',{articleSlug:post.slug,label:post.title});
    setupArticleReading(post);
    addArticleSaveButton(post);
    setTimeout(()=>addHistory(post),3500);
  });
  window.addEventListener('zahrada:library-change',()=>enhanceCards());

  const observer=new MutationObserver(mutations=>{
    for(const m of mutations)for(const node of m.addedNodes){
      if(node.nodeType!==1)continue;
      if(node.matches?.('.cms-post-card'))enhanceCard(node);
      repairBrokenImages(node);
      enhanceCards(node);
      wireAnalyticsMedia(node);
    }
  });
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  repairBrokenImages();
  enhanceCards();
  wireAnalyticsMedia();
  addGlobalSearchButton();

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;updatePromoBanner()});
  window.addEventListener('appinstalled',()=>{trackEvent('app_installed',{label:'pwa'});deferredPrompt=null;document.querySelector('.app-install-prompt')?.setAttribute('hidden','');toast('Aplikácia je nainštalovaná.');updatePromoBanner()});
  window.addEventListener('online',()=>toast('Pripojenie je obnovené.'));
  window.addEventListener('offline',()=>toast('Si offline. Zobrazujem dostupný obsah.'));

  if('serviceWorker' in navigator){
    window.addEventListener('load',async()=>{
      try{
        const reg=await navigator.serviceWorker.register('/sw.js');
        if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
      }catch(e){}
    });
  }

  function loadCommentsFeature(){
    if(!document.querySelector('link[data-comments-css]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='/comments.css?v=2';
      link.dataset.commentsCss='1';
      document.head.appendChild(link);
    }
    if(!document.querySelector('script[data-comments-js]')){
      const script=document.createElement('script');
      script.src='/comments.js?v=2';
      script.defer=true;
      script.dataset.commentsJs='1';
      document.head.appendChild(script);
    }
  }

  loadCommentsFeature();

  window.ZahradaApp={
    getSaved,getHistory,isSaved,savePost,removeSaved,toggleSaved,addHistory,clearHistory,clearSaved,
    toast,normalizePost,requestInstall,requestNotifications,getPushSubscription,openSearch,closeSearch,trackEvent
  };

  document.documentElement.classList.toggle('pwa-standalone',isStandalone());
  bottomNav();
  maybeShowPromoBanner();
  trackEvent('page_view',{label:document.title});

  document.addEventListener('click',event=>{
    const photo=event.target.closest?.('.idea-gallery-card img,.dynamic-gallery-item img');
    if(photo){
      const label=photo.getAttribute('alt')||photo.closest('figure')?.querySelector('figcaption strong')?.textContent||'Fotografia';
      trackEvent('photo_open',{label});
    }
    const share=event.target.closest?.('[data-share-card],.share-button,.share-btn,[data-share]');
    if(share)trackEvent('share_click',{label:share.getAttribute('data-share-title')||document.title});
  },true);

  // legacy-blog-route-guard
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('a[href]');
    if(!link)return;
    let url;
    try{url=new URL(link.getAttribute('href'),location.href)}catch(e){return}
    if(url.origin!==location.origin)return;
    const m=url.pathname.match(/^\/blog\/([^/]+)(?:\/index\.html)?\/?$/);
    if(!m)return;
    event.preventDefault();
    location.href='/clanok-'+m[1]+'.html'+url.search+url.hash;
  },true);

})();