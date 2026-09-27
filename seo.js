(()=>{const SITE_URL='https://zahradasnapadom.sk';const SITE_NAME='Záhrada s nápadom';const STATIC_SLUGS=new Set(["zelene-hnojenie-na-jesen","vysadba-ovocnych-stromov-na-jesen","sadenie-cesnaku-na-jesen","jesenna-starostlivost-o-travnik","jesenne-prace-v-zahrade-pred-zimou","cim-naplnit-vyvyseny-zahon-vrstvy","terasova-hojdacia-lavicka","mulcovanie-zahonov-bez-zbytocnych-chyb","dazdova-voda-jednoduchy-system-zo-suda","vyvyseny-zahon-co-premysliet-pred-stavbou","kompost-bez-zapachu-rovnovaha-materialov","prakticky-kutik-na-presadzanie-rastlin","rucne-naradie-na-jednej-stene","stare-drevene-debnicky-ako-ulozny-system","opory-pre-paradajky-z-konarov","strkova-cesticka-medzi-zahonmi","bylinkovy-kut-pri-kuchyni","zahrada-v-tieni-napady-pre-menej-slnka","listovka-z-jesenneho-listia","oznacovanie-zahonov-na-celu-sezonu","priprava-zahradneho-naradia-na-zimu","jarny-start-zahrady-bez-chaosu","letne-polievanie-s-mensou-spotrebou","zber-semien-z-vlastnej-zahrady","jednoduche-sito-na-kompost","drziak-na-zahradnu-hadicu","maly-pracovny-stol-do-dielne","odrezky-dreva-v-zahrade","kvetinace-z-vedier-a-nadob","mala-nadoba-s-vodou-pre-vtaky","jednoduchy-plan-vysadby-zahona","ulozny-box-na-zahradne-drobnosti","stojan-na-topanky-do-zahrady","ochrana-dreva-v-exterieri-priprava","cisty-kut-na-brusenie","ako-fotit-hobby-projekt-pre-navod","pat-malych-vylepseni-pre-pracu-v-zahrade","male-pestovanie-na-balkone","jednoduchy-zberac-na-drobne-ovocie","poriadok-v-zahradnom-domceku-za-hodinu","jednoducha-zastena-pre-kompost","male-sedenie-v-rohu-zahrady","regal-na-kvetinace-z-latiek","jednoduchy-dennik-zahrady","pracovny-pas-na-zahradne-drobnosti","ako-vyuzit-priestor-pod-pracovnym-stolom","zahradny-kut-na-odkladanie-dreva"]);const cleanSlug=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');const postHref=p=>{const raw=String(p?.slug||'');const slug=cleanSlug(raw);if(p?.content_type==='blog')return '/blog/'+slug+'/';if(STATIC_SLUGS.has(raw)||STATIC_SLUGS.has(slug))return '/napady/'+slug+'/';return '/prispevok.html?slug='+encodeURIComponent(raw)};window.ZahradaSEO={SITE_URL,SITE_NAME,STATIC_SLUGS,cleanSlug,postHref,postUrl:p=>new URL(postHref(p),SITE_URL).href};})();
;(()=>{
  const normalize=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const addPlantSupportContact=()=>{
    const article=document.querySelector("article.post-page");
    const body=article?.querySelector(".post-rich-text");
    if(!article||!body||article.querySelector(".plant-support-email"))return;

    const title=document.querySelector(".post-dynamic-head h1, article h1")?.textContent||"";
    const text=normalize(title+" "+body.textContent);

    const mentionsSupport=/\bopor(?:a|u|ou|y|e|ami|ach|am)?\b/.test(text);
    const mentionsPlants=/rastlin|hortenz|pivon|paradajk|fazul|hrach|kvet|stonk|ker|popinav|uhork|paprik|georgin|ru[zž]/.test(text);
    if(!mentionsSupport||!mentionsPlants)return;

    const note=document.createElement("p");
    note.className="plant-support-email";
    note.setAttribute("aria-label","Kontakt k oporám pre rastliny");
    note.innerHTML='Kontakt k oporám: <a href="mailto:kamgardensk@gmail.com">kamgardensk@gmail.com</a>';
    Object.assign(note.style,{
      margin:"2.2rem 0 .4rem",
      paddingTop:".9rem",
      borderTop:"1px solid rgba(49,83,58,.16)",
      fontSize:".86rem",
      lineHeight:"1.5",
      color:"#6f786f",
      opacity:".88"
    });
    const link=note.querySelector("a");
    Object.assign(link.style,{
      color:"inherit",
      textDecoration:"none",
      borderBottom:"1px dotted currentColor"
    });
    body.appendChild(note);
  };

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",addPlantSupportContact,{once:true});
  }else{
    addPlantSupportContact();
  }
  window.addEventListener("zahrada:article-loaded",()=>setTimeout(addPlantSupportContact,0));
})();
