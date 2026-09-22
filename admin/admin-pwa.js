(()=>{
  const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  let deferredPrompt=null;

  const installButtons=()=>[...document.querySelectorAll('[data-admin-install]')];

  function setInstallVisible(visible){
    installButtons().forEach(btn=>btn.hidden=!visible);
  }

  function showIOSHelp(){
    let sheet=document.querySelector('#admin-install-sheet');
    if(!sheet){
      sheet=document.createElement('div');
      sheet.id='admin-install-sheet';
      sheet.className='admin-install-sheet';
      sheet.innerHTML='<button class="admin-install-backdrop" type="button" aria-label="Zavrieť"></button><section class="admin-install-panel" role="dialog" aria-modal="true" aria-labelledby="admin-install-title"><div class="admin-install-head"><div><span>SPRÁVA WEBU</span><h2 id="admin-install-title">Pridať admin appku na plochu</h2></div><button class="admin-install-x" type="button" aria-label="Zavrieť">×</button></div><ol><li>V Safari otvor tlačidlo <strong>Zdieľať</strong>.</li><li>Vyber <strong>Pridať na plochu</strong>.</li><li>Potvrď <strong>Pridať</strong>.</li></ol></section>';
      document.body.appendChild(sheet);
      sheet.querySelectorAll('.admin-install-backdrop,.admin-install-x').forEach(el=>el.addEventListener('click',()=>sheet.remove()));
    }
  }

  async function install(){
    if(deferredPrompt){
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(()=>null);
      deferredPrompt=null;
      setInstallVisible(false);
      return;
    }
    if(isIOS())showIOSHelp();
  }

  installButtons().forEach(btn=>btn.addEventListener('click',install));

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    deferredPrompt=event;
    setInstallVisible(!isStandalone());
  });
  window.addEventListener('appinstalled',()=>setInstallVisible(false));

  function buildBottomNav(){
    if(!isStandalone()||document.querySelector('.admin-bottom-nav'))return;
    const nav=document.createElement('nav');
    nav.className='admin-bottom-nav';
    nav.setAttribute('aria-label','Navigácia admin aplikácie');
    nav.innerHTML='<button type="button" data-view="dashboard" data-admin-tab="dashboard"><span>⌂</span><b>Prehľad</b></button><button type="button" data-view="posts" data-admin-tab="posts"><span>▤</span><b>Príspevky</b></button><button type="button" data-new-post="1" data-admin-tab="new" class="admin-bottom-new"><span>＋</span><b>Nový</b></button><button type="button" data-view="bazar" data-admin-tab="bazar"><span>↔</span><b>Bazár</b></button><button type="button" data-view="settings" data-admin-tab="settings"><span>⚙</span><b>Texty</b></button>';
    document.body.appendChild(nav);

    const setActive=(name)=>{
      nav.querySelectorAll('[data-admin-tab]').forEach(x=>x.classList.toggle('active',x.dataset.adminTab===name));
    };
    setActive('dashboard');

    nav.addEventListener('click',event=>{
      const btn=event.target.closest('[data-admin-tab]');
      if(!btn)return;
      setActive(btn.dataset.adminTab);
    });

    document.addEventListener('click',event=>{
      const view=event.target.closest('[data-view]');
      const fresh=event.target.closest('[data-new-post]');
      if(fresh){setActive('new');return}
      if(view&&['dashboard','posts','bazar','settings'].includes(view.dataset.view))setActive(view.dataset.view);
    });

    const adminApp=document.querySelector('#admin-app');
    const syncVisibility=()=>{nav.hidden=!!adminApp?.hidden};
    syncVisibility();
    if(adminApp)new MutationObserver(syncVisibility).observe(adminApp,{attributes:true,attributeFilter:['hidden']});
  }

  function handleShortcutHash(){
    const hash=location.hash.replace('#','');
    if(!hash)return;
    window.addEventListener('load',()=>{
      setTimeout(()=>{
        if(hash==='new')document.querySelector('[data-new-post]')?.click();
        else if(hash==='import')document.querySelector('[data-scroll-target="bazar-import-panel"]')?.click();
        else if(['dashboard','posts','bazar','settings'].includes(hash))document.querySelector('[data-view="'+hash+'"]')?.click();
        history.replaceState(null,'',location.pathname+location.search);
      },350);
    });
  }

  if('serviceWorker' in navigator){
    let reloading=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(reloading)return;
      reloading=true;
      location.reload();
    });
    window.addEventListener('load',async()=>{
      try{
        const reg=await navigator.serviceWorker.register('./admin-sw.js?v=13',{scope:'./',updateViaCache:'none'});
        reg.update().catch(()=>{});
      }catch(e){}
    });
  }

  if(isIOS()&&!isStandalone())setInstallVisible(true);
  else setInstallVisible(false);

  document.documentElement.classList.toggle('admin-standalone',isStandalone());
  buildBottomNav();
  handleShortcutHash();
})();
