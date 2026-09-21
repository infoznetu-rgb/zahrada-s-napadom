const bazarAdminDb=db;
const BA$=s=>document.querySelector(s);
let bazarAdminAds=[];
let bazarAdminReports=[];
const BA_TYPE={sell:"Predám",give:"Darujem",exchange:"Vymením",wanted:"Hľadám"};
const BA_STATUS={pending:"Čaká",published:"Zverejnené",rejected:"Odmietnuté",closed:"Ukončené"};
const BA_SELLER={private:"Súkromná osoba",business:"Firma / podnikateľ"};
const BA_REASON={commercial:"Nevhodná reklama (staré hlásenie)",spam:"Spam / nevhodná reklama",prohibited:"Zakázaný alebo nebezpečný obsah",misleading:"Zavádzajúci obsah",seller:"Nesprávne označený inzerent / firemné údaje",sold:"Zrejme neaktuálny",other:"Iné"};
function baEsc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function baDate(v){return v?new Intl.DateTimeFormat("sk-SK",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(v)):"—"}
function baPrice(ad){if(ad.price_mode==="free")return"Zadarmo";if(ad.price_mode==="exchange")return"Výmena";if(ad.price_mode==="not_listed")return"Bez ceny";if(ad.price==null)return"Dohodou";return new Intl.NumberFormat("sk-SK",{style:"currency",currency:"EUR"}).format(Number(ad.price))+(ad.price_mode==="negotiable"?" · dohoda":"")}
function baImage(ad){try{const u=new URL(Array.isArray(ad.images)?ad.images[0]||"":"");return /^https?:$/.test(u.protocol)?u.href:""}catch{return""}}
async function isBazarAdmin(){
  const {data:{session}}=await bazarAdminDb.auth.getSession();if(!session)return false;
  const {data}=await bazarAdminDb.from("zahrada_admins").select("user_id").eq("user_id",session.user.id).maybeSingle();return!!data;
}
async function loadBazarAdmin(){
  if(!BA$("#view-bazar")||!await isBazarAdmin())return;
  const [adsRes,reportsRes]=await Promise.all([
    bazarAdminDb.from("zahrada_bazar_ads").select("*").order("created_at",{ascending:false}).limit(300),
    bazarAdminDb.from("zahrada_bazar_reports").select("*").order("created_at",{ascending:false}).limit(300)
  ]);
  if(adsRes.error){BA$("#bazar-admin-list").innerHTML='<div class="bazar-admin-empty">Bazár sa nepodarilo načítať.</div>';return}
  bazarAdminAds=adsRes.data||[];bazarAdminReports=reportsRes.data||[];renderBazarAdmin();renderBazarReports();
}
function renderBazarStats(){
  const now=Date.now();
  BA$("#bazar-stat-pending").textContent=bazarAdminAds.filter(a=>a.status==="pending").length;
  BA$("#bazar-stat-live").textContent=bazarAdminAds.filter(a=>a.status==="published"&&a.expires_at&&new Date(a.expires_at).getTime()>now).length;
  BA$("#bazar-stat-expired").textContent=bazarAdminAds.filter(a=>a.status==="published"&&(!a.expires_at||new Date(a.expires_at).getTime()<=now)).length;
  BA$("#bazar-stat-reports").textContent=bazarAdminReports.filter(r=>r.status==="new").length;
}
function renderBazarAdmin(){
  renderBazarStats();
  const q=(BA$("#bazar-admin-search")?.value||"").trim().toLocaleLowerCase("sk"), status=BA$("#bazar-admin-status")?.value||"", type=BA$("#bazar-admin-type")?.value||"", seller=BA$("#bazar-admin-seller")?.value||"";
  const list=bazarAdminAds.filter(a=>{
    const hay=`${a.title||""} ${a.description||""} ${a.location||""} ${a.contact_name||""} ${a.contact_email||""} ${a.contact_phone||""} ${a.business_name||""} ${a.business_ico||""}`.toLocaleLowerCase("sk");
    return(!q||hay.includes(q))&&(!status||a.status===status)&&(!type||a.listing_type===type)&&(!seller||a.seller_type===seller);
  });
  const root=BA$("#bazar-admin-list");if(!root)return;
  if(!list.length){root.innerHTML='<div class="bazar-admin-empty">Pre tento filter tu nie sú žiadne inzeráty.</div>';return}
  root.innerHTML=list.map(ad=>{
    const image=baImage(ad), expired=ad.status==="published"&&(!ad.expires_at||new Date(ad.expires_at)<=new Date());
    return `<article class="bazar-admin-row">
      ${image?`<img class="bazar-admin-thumb" src="${baEsc(image)}" alt="">`:'<div class="bazar-admin-thumb"></div>'}
      <div class="bazar-admin-copy">
        <div class="bazar-admin-tags"><span class="bazar-admin-tag ${baEsc(ad.status)}">${baEsc(BA_STATUS[ad.status]||ad.status)}${expired?" · po platnosti":""}</span><span class="bazar-admin-tag">${baEsc(BA_TYPE[ad.listing_type]||ad.listing_type)}</span><span class="bazar-admin-tag">${baEsc(ad.category)}</span><span class="bazar-admin-tag seller-${baEsc(ad.seller_type||"private")}">${baEsc(BA_SELLER[ad.seller_type]||"Súkromná osoba")}</span></div>
        <h4>${baEsc(ad.title)}</h4>${ad.seller_type==="business"?`<p><strong>${baEsc(ad.business_name||"Firma")}</strong> · IČO ${baEsc(ad.business_ico||"—")}</p>`:""}<p>${baEsc(baPrice(ad))} · ${baEsc(ad.location)}, ${baEsc(ad.region)} · ${baEsc(ad.contact_name)}${ad.contact_email?` · ${baEsc(ad.contact_email)}`:""}${ad.contact_phone?` · ${baEsc(ad.contact_phone)}`:""}</p>
        <p>Vložené ${baEsc(baDate(ad.created_at))}${ad.published_at?` · zverejnené ${baEsc(baDate(ad.published_at))}`:""}${ad.expires_at?` · do ${baEsc(baDate(ad.expires_at))}`:""}</p>
        ${ad.moderation_note?`<p class="admin-note">Poznámka: ${baEsc(ad.moderation_note)}</p>`:""}
      </div>
      <div class="bazar-admin-actions">
        ${ad.status==="pending"||expired?`<button class="approve" type="button" data-ba-approve="${ad.id}">${expired?"Obnoviť 60 dní":"Schváliť"}</button>`:""}
        ${ad.status==="pending"?`<button class="reject" type="button" data-ba-reject="${ad.id}">Odmietnuť</button>`:""}
        ${ad.status==="published"&&!expired?`<a href="../inzerat.html?id=${encodeURIComponent(ad.id)}" target="_blank" rel="noopener">Pozrieť</a><button class="close" type="button" data-ba-close="${ad.id}">Ukončiť</button>`:""}
        ${ad.status==="rejected"||ad.status==="closed"?`<button class="approve" type="button" data-ba-approve="${ad.id}">Zverejniť</button>`:""}
        <button class="reject" type="button" data-ba-delete="${ad.id}">Vymazať</button>
      </div>
    </article>`;
  }).join("");
  root.querySelectorAll("[data-ba-approve]").forEach(b=>b.addEventListener("click",()=>approveBazarAd(b.dataset.baApprove)));
  root.querySelectorAll("[data-ba-reject]").forEach(b=>b.addEventListener("click",()=>rejectBazarAd(b.dataset.baReject)));
  root.querySelectorAll("[data-ba-close]").forEach(b=>b.addEventListener("click",()=>closeBazarAd(b.dataset.baClose)));
  root.querySelectorAll("[data-ba-delete]").forEach(b=>b.addEventListener("click",()=>deleteBazarAd(b.dataset.baDelete)));
}
function renderBazarReports(){
  renderBazarStats();const root=BA$("#bazar-report-list");if(!root)return;
  if(!bazarAdminReports.length){root.innerHTML='<div class="bazar-admin-empty">Zatiaľ neprišlo žiadne nahlásenie.</div>';return}
  root.innerHTML=bazarAdminReports.map(r=>{
    const ad=bazarAdminAds.find(a=>a.id===r.ad_id);
    return `<article class="bazar-report-row ${r.status==="new"?"new":""}"><div><h4>${baEsc(BA_REASON[r.reason]||r.reason)} · ${baEsc(ad?.title||"Inzerát už bol odstránený")}</h4><p>${baEsc(r.detail||"Bez doplňujúcej poznámky")}</p><p>${baEsc(baDate(r.created_at))} · ${r.status==="new"?"nové":"vyriešené"}</p></div>${r.status==="new"?`<button type="button" data-ba-resolve="${r.id}">Označiť vyriešené</button>`:""}</article>`;
  }).join("");
  root.querySelectorAll("[data-ba-resolve]").forEach(b=>b.addEventListener("click",()=>resolveBazarReport(b.dataset.baResolve)));
}
async function approveBazarAd(id){
  const now=new Date(), expires=new Date(now.getTime()+60*24*60*60*1000);
  const {error}=await bazarAdminDb.from("zahrada_bazar_ads").update({status:"published",moderation_note:null,moderated_at:now.toISOString(),published_at:now.toISOString(),expires_at:expires.toISOString()}).eq("id",id);
  if(error){alert("Inzerát sa nepodarilo schváliť: "+error.message);return}await loadBazarAdmin();
}
async function rejectBazarAd(id){
  const reason=prompt("Dôvod odmietnutia, ktorý uvidí inzerent:","Tento inzerát nezodpovedá pravidlám komunitného bazára.");if(reason===null)return;
  const {error}=await bazarAdminDb.from("zahrada_bazar_ads").update({status:"rejected",moderation_note:reason.trim()||"Inzerát nezodpovedá pravidlám bazára.",moderated_at:new Date().toISOString(),published_at:null,expires_at:null}).eq("id",id);
  if(error){alert("Inzerát sa nepodarilo odmietnuť: "+error.message);return}await loadBazarAdmin();
}
async function closeBazarAd(id){
  if(!confirm("Ukončiť verejné zobrazovanie tohto inzerátu?"))return;
  const {error}=await bazarAdminDb.from("zahrada_bazar_ads").update({status:"closed",moderated_at:new Date().toISOString()}).eq("id",id);if(error){alert("Inzerát sa nepodarilo ukončiť.");return}await loadBazarAdmin();
}
async function deleteBazarAd(id){
  if(!confirm("Natrvalo vymazať tento inzerát z databázy?"))return;
  const ad=bazarAdminAds.find(a=>a.id===id);
  const {error}=await bazarAdminDb.from("zahrada_bazar_ads").delete().eq("id",id);if(error){alert("Inzerát sa nepodarilo vymazať.");return}
  const paths=(Array.isArray(ad?.images)?ad.images:[]).map(url=>{try{const u=new URL(url),marker="/storage/v1/object/public/zahrada-bazar/",i=u.pathname.indexOf(marker);return i>=0?decodeURIComponent(u.pathname.slice(i+marker.length)):null}catch{return null}}).filter(Boolean);
  if(paths.length)await bazarAdminDb.storage.from("zahrada-bazar").remove(paths);await loadBazarAdmin();
}
async function resolveBazarReport(id){
  const {error}=await bazarAdminDb.from("zahrada_bazar_reports").update({status:"resolved",resolved_at:new Date().toISOString()}).eq("id",id);if(error){alert("Nahlásenie sa nepodarilo označiť ako vyriešené.");return}await loadBazarAdmin();
}
BA$("#bazar-admin-search")?.addEventListener("input",renderBazarAdmin);
BA$("#bazar-admin-status")?.addEventListener("change",renderBazarAdmin);
BA$("#bazar-admin-type")?.addEventListener("change",renderBazarAdmin);
BA$("#bazar-admin-seller")?.addEventListener("change",renderBazarAdmin);

async function startBazarAdminWhenReady(){
  if(await isBazarAdmin())await loadBazarAdmin();
}
bazarAdminDb.auth.onAuthStateChange((event,session)=>{
  if(event==="SIGNED_IN"||event==="TOKEN_REFRESHED"||event==="INITIAL_SESSION"){
    if(session)setTimeout(startBazarAdminWhenReady,0);
  }
  if(event==="SIGNED_OUT"){
    bazarAdminAds=[];bazarAdminReports=[];
  }
});
startBazarAdminWhenReady();