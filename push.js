(()=>{
  const API="https://bkyappgttwjxakkwycub.supabase.co/functions/v1/push-subscribe";
  const PREF_KEY="zahrada-push-prefs-v1";
  const els={
    status:document.querySelector("#push-status"),
    help:document.querySelector("#push-help"),
    blog:document.querySelector("#push-blog"),
    bazar:document.querySelector("#push-bazar"),
    enable:document.querySelector("#push-enable"),
    disable:document.querySelector("#push-disable"),
    test:document.querySelector("#push-test")
  };
  if(!els.status)return;

  const isStandalone=()=>window.matchMedia?.("(display-mode: standalone)").matches||window.navigator.standalone===true;
  const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  const supported=()=>("serviceWorker" in navigator)&&("PushManager" in window)&&("Notification" in window);

  function readPrefs(){
    try{
      const x=JSON.parse(localStorage.getItem(PREF_KEY)||"{}");
      return {blog:x.blog!==false,bazar:x.bazar===true};
    }catch{return {blog:true,bazar:false}}
  }
  function writePrefs(){
    const pref={blog:!!els.blog.checked,bazar:!!els.bazar.checked};
    localStorage.setItem(PREF_KEY,JSON.stringify(pref));
    return pref;
  }
  function b64ToUint8Array(base64String){
    const padding="=".repeat((4-base64String.length%4)%4);
    const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
    const raw=atob(base64);
    return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
  }
  async function api(body){
    const options=body?{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(body)
    }:{method:"GET"};
    const response=await fetch(API,options);
    if(!response.ok)throw new Error("push_api_"+response.status);
    return response.json();
  }
  async function subscription(){
    const reg=await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }
  async function syncSubscription(sub){
    const pref=writePrefs();
    await api({
      action:"subscribe",
      subscription:sub.toJSON(),
      preferences:pref
    });
  }
  function setState(mode,text,help){
    els.status.className="push-status "+(mode?"is-"+mode:"");
    els.status.textContent=text;
    if(help)els.help.textContent=help;
  }
  async function refresh(){
    const pref=readPrefs();
    els.blog.checked=pref.blog;
    els.bazar.checked=pref.bazar;

    if(!supported()){
      setState("unsupported","Nedostupné",isIOS()&&!isStandalone()
        ?"Na iPhone/iPade najprv nainštaluj aplikáciu cez Pridať na plochu."
        :"Tento prehliadač nepodporuje webové push upozornenia.");
      els.enable.hidden=true;els.disable.hidden=true;els.test.hidden=true;
      els.blog.disabled=true;els.bazar.disabled=true;
      return;
    }

    if(Notification.permission==="denied"){
      setState("blocked","Zablokované","Upozornenia sú zablokované v nastavení prehliadača alebo systému.");
      els.enable.hidden=true;els.disable.hidden=true;els.test.hidden=true;
      return;
    }

    const sub=await subscription();
    if(sub&&Notification.permission==="granted"){
      setState("active","Zapnuté","Zmeny tém sa ukladajú automaticky.");
      els.enable.hidden=true;els.disable.hidden=false;els.test.hidden=false;
      return;
    }

    setState("off","Vypnuté","Povolenie si vypýta samotné zariadenie až po stlačení tlačidla.");
    els.enable.hidden=false;els.disable.hidden=true;els.test.hidden=true;
  }

  async function enable(){
    els.enable.disabled=true;
    setState("working","Zapínam…","Čakám na povolenie zariadenia.");
    try{
      const permission=await Notification.requestPermission();
      if(permission!=="granted"){await refresh();return}

      const {publicKey}=await api();
      if(!publicKey)throw new Error("missing_vapid_key");

      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub){
        sub=await reg.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:b64ToUint8Array(publicKey)
        });
      }
      await syncSubscription(sub);
      window.ZahradaApp?.toast?.("Upozornenia sú zapnuté.");
      await refresh();
    }catch(error){
      console.error(error);
      setState("error","Chyba","Upozornenia sa nepodarilo zapnúť. Skús to znova o chvíľu.");
    }finally{
      els.enable.disabled=false;
    }
  }

  async function disable(){
    els.disable.disabled=true;
    try{
      const sub=await subscription();
      if(sub){
        await api({action:"unsubscribe",subscription:{endpoint:sub.endpoint}});
        await sub.unsubscribe();
      }
      window.ZahradaApp?.toast?.("Upozornenia sú vypnuté.");
      await refresh();
    }catch(error){
      console.error(error);
      setState("error","Chyba","Upozornenia sa nepodarilo vypnúť.");
    }finally{
      els.disable.disabled=false;
    }
  }

  async function updatePreferences(){
    writePrefs();
    if(!supported()||Notification.permission!=="granted")return;
    try{
      const sub=await subscription();
      if(sub)await syncSubscription(sub);
    }catch(error){console.error(error)}
  }

  async function testNotification(){
    try{
      const reg=await navigator.serviceWorker.ready;
      await reg.showNotification("Záhrada s nápadom",{
        body:"Takto bude vyzerať upozornenie na nový obsah.",
        icon:"./app-icon.svg?v=4",
        badge:"./brand-mark.svg?v=1",
        tag:"zahrada-test",
        data:{url:"moja-zahrada.html"}
      });
    }catch(error){
      console.error(error);
      window.ZahradaApp?.toast?.("Skúšobné upozornenie sa nepodarilo zobraziť.");
    }
  }

  els.enable.addEventListener("click",enable);
  els.disable.addEventListener("click",disable);
  els.test.addEventListener("click",testNotification);
  els.blog.addEventListener("change",updatePreferences);
  els.bazar.addEventListener("change",updatePreferences);

  refresh().catch(()=>setState("error","Chyba","Stav upozornení sa nepodarilo načítať."));
})();