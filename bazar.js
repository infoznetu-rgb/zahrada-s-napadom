const BAZAR_URL="https://bkyappgttwjxakkwycub.supabase.co";
const BAZAR_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const bazarDb=window.supabase.createClient(BAZAR_URL,BAZAR_KEY);

const BAZAR_CATEGORIES=[
  "Rastliny a sadenice","Semená","Náradie","Materiál","Záhradná technika",
  "Nábytok a dekorácie","Dielňa a hobby","Iné zo záhrady a dielne"
];
const BAZAR_REGIONS=[
  "Bratislavský kraj","Trnavský kraj","Trenčiansky kraj","Nitriansky kraj",
  "Žilinský kraj","Banskobystrický kraj","Prešovský kraj","Košický kraj","Celé Slovensko"
];
const TYPE_LABELS={sell:"Predám",give:"Darujem",exchange:"Vymením",wanted:"Hľadám"};
const CONDITION_LABELS={used:"Použité",unused:"Nové / nepoužité",repair:"Na opravu / diely",not_applicable:"Netýka sa"};
const STATUS_LABELS={pending:"Čaká na schválenie",published:"Zverejnené",rejected:"Odmietnuté",closed:"Ukončené"};

const $=s=>document.querySelector(s);
let publicAds=[];
let currentUser=null;
let currentOwnAds=[];
let imageState=[];
let originalRemoteUrls=[];

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function safeHttpUrl(value){try{const u=new URL(String(value||""),location.href);return u.protocol==="https:"||u.protocol==="http:"?u.href:""}catch{return""}}
function euro(value){return new Intl.NumberFormat("sk-SK",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(Number(value)||0)}
function dateSk(v){if(!v)return"";return new Intl.DateTimeFormat("sk-SK",{day:"numeric",month:"numeric",year:"numeric"}).format(new Date(v))}
function setMessage(el,text,type=""){if(!el)return;el.textContent=text||"";el.className="bazar-form-message"+(type?" "+type:"")}
function storagePathFromUrl(url){
  try{
    const u=new URL(url);
    const marker="/storage/v1/object/public/zahrada-bazar/";
    const i=u.pathname.indexOf(marker);
    return i>=0?decodeURIComponent(u.pathname.slice(i+marker.length)):null;
  }catch{return null}
}
function priceText(ad){
  if(ad.price_mode==="free")return"Zadarmo";
  if(ad.price_mode==="exchange")return"Výmena";
  if(ad.price_mode==="not_listed")return"Cena neuvedená";
  if(ad.price_mode==="negotiable")return ad.price!=null?`${euro(ad.price)} · dohoda`:"Dohodou";
  return ad.price!=null?euro(ad.price):"Cena neuvedená";
}
function firstImage(ad){
  const list=Array.isArray(ad.images)?ad.images:[];
  return list.map(safeHttpUrl).find(Boolean)||"";
}
function publicCard(ad){
  const image=firstImage(ad);
  const href=`inzerat.html?id=${encodeURIComponent(ad.id)}`;
  const desc=String(ad.description||"").replace(/\s+/g," ").trim();
  return `<article class="bazar-card">
    <a class="bazar-card-image" href="${href}">${image?`<img src="${esc(image)}" alt="${esc(ad.title)}" loading="lazy">`:'<div class="bazar-card-placeholder">Záhrada s nápadom<br>komunitný bazár</div>'}</a>
    <div class="bazar-card-body">
      <div class="bazar-card-top"><span class="tag">${esc(TYPE_LABELS[ad.listing_type]||ad.listing_type)}</span><span class="soft-tag">${esc(ad.category)}</span></div>
      <h3><a href="${href}">${esc(ad.title)}</a></h3>
      <p class="bazar-card-text">${esc(desc)}</p>
      <div class="bazar-card-price">${esc(priceText(ad))}</div>
      <div class="bazar-card-meta"><span>📍 ${esc(ad.location)}, ${esc(ad.region)}</span><span>·</span><span>${esc(dateSk(ad.published_at))}</span></div>
      <a class="bazar-card-link" href="${href}">Pozrieť inzerát →</a>
    </div>
  </article>`;
}

function fillSelects(){
  const catFilter=$("#bazar-category-filter"), regionFilter=$("#bazar-region-filter"), adCat=$("#ad-category"), adRegion=$("#ad-region");
  if(catFilter)catFilter.insertAdjacentHTML("beforeend",BAZAR_CATEGORIES.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join(""));
  if(regionFilter)regionFilter.insertAdjacentHTML("beforeend",BAZAR_REGIONS.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join(""));
  if(adCat)adCat.innerHTML=BAZAR_CATEGORIES.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
  if(adRegion)adRegion.innerHTML=BAZAR_REGIONS.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
}

async function loadPublicAds(){
  const status=$("#bazar-status");
  if(status){status.className="bazar-status";status.textContent="Načítavam inzeráty…"}
  const {data,error}=await bazarDb.from("zahrada_bazar_ads")
    .select("id,title,description,category,listing_type,item_condition,price,price_mode,region,location,images,published_at,expires_at")
    .eq("status","published").gt("expires_at",new Date().toISOString()).order("published_at",{ascending:false}).limit(100);
  if(error){if(status){status.className="bazar-status error";status.textContent="Inzeráty sa teraz nepodarilo načítať."}return}
  publicAds=data||[];
  renderPublicAds();
}
function renderPublicAds(){
  const root=$("#bazar-list"), status=$("#bazar-status");if(!root)return;
  const q=$("#bazar-search")?.value.trim().toLocaleLowerCase("sk")||"";
  const type=$("#bazar-type-filter")?.value||"", cat=$("#bazar-category-filter")?.value||"", region=$("#bazar-region-filter")?.value||"";
  let list=publicAds.filter(a=>{
    const hay=`${a.title||""} ${a.description||""} ${a.location||""} ${a.category||""}`.toLocaleLowerCase("sk");
    return(!q||hay.includes(q))&&(!type||a.listing_type===type)&&(!cat||a.category===cat)&&(!region||a.region===region);
  });
  const sort=$("#bazar-sort")?.value||"newest";
  if(sort!=="newest"){
    const priceSort=a=>a.price_mode==="free"?0:(a.price!=null?Number(a.price):(sort==="price_asc"?Number.POSITIVE_INFINITY:Number.NEGATIVE_INFINITY));
    list=[...list].sort((a,b)=>sort==="price_asc"?priceSort(a)-priceSort(b):priceSort(b)-priceSort(a));
  }
  root.innerHTML=list.map(publicCard).join("");
  if(status){status.hidden=!!list.length;status.className="bazar-status";status.textContent=publicAds.length?"Pre zvolené filtre sme nenašli žiadny inzerát.":"Zatiaľ tu nie sú žiadne schválené inzeráty. Môžeš pridať prvý."}
}
["#bazar-search","#bazar-type-filter","#bazar-category-filter","#bazar-region-filter","#bazar-sort"].forEach(s=>$(s)?.addEventListener(s==="#bazar-search"?"input":"change",renderPublicAds));

async function refreshAuth(){
  const {data:{session}}=await bazarDb.auth.getSession();
  currentUser=session?.user||null;
  const auth=$("#bazar-auth-box"), area=$("#bazar-user-area");
  if(currentUser){
    if(auth)auth.hidden=true;if(area)area.hidden=false;
    if($("#bazar-user-email"))$("#bazar-user-email").textContent=currentUser.email||"";
    await loadMyAds();
  }else{
    if(auth)auth.hidden=false;if(area)area.hidden=true;
    currentOwnAds=[];
  }
}
$("#bazar-login-form")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const email=$("#bazar-login-email").value.trim(), msg=$("#bazar-auth-message");
  setMessage(msg,"Posielam prihlasovací odkaz…");
  const redirect=new URL("bazar.html#pridat",location.href).href;
  const {error}=await bazarDb.auth.signInWithOtp({email,options:{emailRedirectTo:redirect,shouldCreateUser:true}});
  if(error){setMessage(msg,"Odkaz sa nepodarilo odoslať. Skontroluj e-mail a skús to znova.","error");return}
  setMessage(msg,"Prihlasovací odkaz je odoslaný. Otvor e-mail a klikni naň; potom sa vrátiš do bazára.","ok");
});
$("#bazar-logout")?.addEventListener("click",async()=>{await bazarDb.auth.signOut();resetAdForm();await refreshAuth()});
bazarDb.auth.onAuthStateChange((_event,session)=>{
  const uid=session?.user?.id||null;
  if(uid!==currentUser?.id)setTimeout(refreshAuth,0);
});

function syncPriceUi(){
  const type=$("#ad-listing-type")?.value, mode=$("#ad-price-mode")?.value, label=$("#ad-price-label"), input=$("#ad-price");
  if(type==="give"&&mode!=="free"){$("#ad-price-mode").value="free"}
  if(type==="exchange"&&$("#ad-price-mode").value!=="exchange"){$("#ad-price-mode").value="exchange"}
  const finalMode=$("#ad-price-mode")?.value;
  const show=finalMode==="fixed"||finalMode==="negotiable";
  if(label)label.hidden=!show;
  if(input){input.required=finalMode==="fixed";if(!show)input.value=""}
}
$("#ad-listing-type")?.addEventListener("change",syncPriceUi);
$("#ad-price-mode")?.addEventListener("change",syncPriceUi);

async function fileToWebp(file){
  if(!/^image\/(jpeg|png|webp)$/i.test(file.type))throw new Error("Podporované sú iba JPG, PNG a WebP fotografie.");
  if(file.size>20*1024*1024)throw new Error("Fotografia je príliš veľká.");
  let bitmap;
  try{bitmap=await createImageBitmap(file,{imageOrientation:"from-image"})}catch{
    const url=URL.createObjectURL(file);
    bitmap=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url});
    URL.revokeObjectURL(url);
  }
  const max=1600, w=bitmap.width, h=bitmap.height, scale=Math.min(1,max/Math.max(w,h));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
  const ctx=canvas.getContext("2d");ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Fotografiu sa nepodarilo spracovať.")),"image/webp",.82));
  return new File([blob],"foto.webp",{type:"image/webp"});
}
function clearObjectPreviews(){imageState.forEach(x=>{if(x.kind==="file"&&x.preview)URL.revokeObjectURL(x.preview)})}
function renderImageState(){
  const box=$("#ad-images-preview");if(!box)return;
  box.innerHTML=imageState.map((x,i)=>`<div class="bazar-image-item"><img src="${esc(x.kind==="remote"?safeHttpUrl(x.url):x.preview)}" alt="Náhľad fotografie"><button type="button" data-remove-image="${i}" aria-label="Odstrániť fotografiu">×</button>${i===0?'<span class="cover-mark">HLAVNÁ</span>':""}</div>`).join("");
  box.querySelectorAll("[data-remove-image]").forEach(btn=>btn.addEventListener("click",()=>{
    const i=Number(btn.dataset.removeImage), item=imageState[i];if(item?.kind==="file"&&item.preview)URL.revokeObjectURL(item.preview);imageState.splice(i,1);renderImageState();
  }));
}
$("#ad-images")?.addEventListener("change",e=>{
  const files=[...(e.target.files||[])];
  const left=Math.max(0,6-imageState.length);
  files.slice(0,left).forEach(file=>imageState.push({kind:"file",file,preview:URL.createObjectURL(file)}));
  if(files.length>left)setMessage($("#bazar-form-message"),"Jeden inzerát môže mať najviac 6 fotografií.","error");
  e.target.value="";renderImageState();
});

async function uploadNewImages(adId){
  const uploaded=[], created=[];
  try{
    for(const item of imageState){
      if(item.kind==="remote"){uploaded.push(item.url);continue}
      const optimized=await fileToWebp(item.file);
      const path=`${currentUser.id}/${adId}/${crypto.randomUUID()}.webp`;
      const {error}=await bazarDb.storage.from("zahrada-bazar").upload(path,optimized,{contentType:"image/webp",cacheControl:"86400",upsert:false});
      if(error)throw error;
      created.push(path);
      uploaded.push(bazarDb.storage.from("zahrada-bazar").getPublicUrl(path).data.publicUrl);
    }
    return uploaded;
  }catch(err){
    if(created.length)await bazarDb.storage.from("zahrada-bazar").remove(created);
    throw err;
  }
}
async function removeImageUrls(urls){
  const paths=urls.map(storagePathFromUrl).filter(Boolean);if(!paths.length)return;
  await bazarDb.storage.from("zahrada-bazar").remove(paths);
}

function resetAdForm(){
  const form=$("#bazar-ad-form");if(form)form.reset();
  clearObjectPreviews();imageState=[];originalRemoteUrls=[];
  if($("#bazar-ad-id"))$("#bazar-ad-id").value="";
  if($("#bazar-form-title"))$("#bazar-form-title").textContent="Nový inzerát";
  if($("#bazar-submit-btn"))$("#bazar-submit-btn").textContent="Odoslať na schválenie";
  if($("#bazar-cancel-edit"))$("#bazar-cancel-edit").hidden=true;
  if($("#ad-listing-type"))$("#ad-listing-type").value="sell";
  if($("#ad-price-mode"))$("#ad-price-mode").value="fixed";
  if($("#ad-condition"))$("#ad-condition").value="used";
  if($("#ad-category"))$("#ad-category").value=BAZAR_CATEGORIES[0];
  if($("#ad-region"))$("#ad-region").value=BAZAR_REGIONS[0];
  renderImageState();syncPriceUi();setMessage($("#bazar-form-message"),"");
}
$("#bazar-cancel-edit")?.addEventListener("click",()=>resetAdForm());

$("#bazar-ad-form")?.addEventListener("submit",async e=>{
  e.preventDefault();if(!currentUser)return;
  const msg=$("#bazar-form-message");setMessage(msg,"Kontrolujem a nahrávam inzerát…");
  if(!$("#ad-contact-email").value.trim()&&!$("#ad-contact-phone").value.trim()){setMessage(msg,"Uveď aspoň e-mail alebo telefón pre záujemcov.","error");return}
  if(!$("#ad-private-confirm").checked||!$("#ad-rules-confirm").checked||!$("#ad-contact-confirm").checked){setMessage(msg,"Potvrď všetky pravidlá pred odoslaním.","error");return}
  const existingId=$("#bazar-ad-id").value.trim();
  const id=existingId||crypto.randomUUID();
  let newImages=[];
  try{
    newImages=await uploadNewImages(id);
    const mode=$("#ad-price-mode").value;
    const priceRaw=$("#ad-price").value.trim();
    const payload={
      user_id:currentUser.id,
      title:$("#ad-title").value.trim(),description:$("#ad-description").value.trim(),category:$("#ad-category").value,
      listing_type:$("#ad-listing-type").value,item_condition:$("#ad-condition").value,
      price:(mode==="fixed"||mode==="negotiable")&&priceRaw!==""?Number(priceRaw):null,price_mode:mode,
      region:$("#ad-region").value,location:$("#ad-location").value.trim(),contact_name:$("#ad-contact-name").value.trim(),
      contact_email:$("#ad-contact-email").value.trim()||null,contact_phone:$("#ad-contact-phone").value.trim()||null,
      images:newImages,status:"pending",private_person_confirmed:true,commercial_activity:false,terms_accepted_at:new Date().toISOString(),
      moderation_note:null,moderated_at:null,published_at:null,expires_at:null
    };
    let result;
    if(existingId)result=await bazarDb.from("zahrada_bazar_ads").update(payload).eq("id",existingId).eq("user_id",currentUser.id).select().single();
    else result=await bazarDb.from("zahrada_bazar_ads").insert({id,...payload}).select().single();
    if(result.error)throw result.error;
    const removed=originalRemoteUrls.filter(x=>!newImages.includes(x));
    await removeImageUrls(removed);
    resetAdForm();await Promise.all([loadMyAds(),loadPublicAds()]);
    setMessage(msg,"Inzerát je uložený a čaká na schválenie. Po schválení bude zverejnený na 60 dní.","ok");
    document.querySelector("#pridat")?.scrollIntoView({behavior:"smooth",block:"start"});
  }catch(err){
    const newlyUploaded=newImages.filter(u=>!originalRemoteUrls.includes(u));await removeImageUrls(newlyUploaded);
    const text=String(err?.message||"");
    setMessage(msg,text.includes("5 aktívnych")?"Máš už 5 aktívnych alebo čakajúcich inzerátov. Najprv niektorý ukonči alebo vymaž.":"Inzerát sa nepodarilo uložiť. Skontroluj údaje a skús to znova.","error");
  }
});

async function loadMyAds(){
  if(!currentUser)return;
  const {data,error}=await bazarDb.from("zahrada_bazar_ads").select("*").eq("user_id",currentUser.id).order("created_at",{ascending:false});
  if(error){$("#my-ads-list").innerHTML='<div class="bazar-status error">Tvoje inzeráty sa nepodarilo načítať.</div>';return}
  currentOwnAds=data||[];renderMyAds();
}
function renderMyAds(){
  const root=$("#my-ads-list");if(!root)return;
  if(!currentOwnAds.length){root.innerHTML='<div class="bazar-status">Zatiaľ nemáš žiadny inzerát.</div>';return}
  root.innerHTML=currentOwnAds.map(ad=>{
    const image=firstImage(ad), canView=ad.status==="published"&&ad.expires_at&&new Date(ad.expires_at)>new Date();
    return `<article class="my-ad-row">
      ${image?`<img class="my-ad-thumb" src="${esc(image)}" alt="">`:'<div class="my-ad-thumb"></div>'}
      <div class="my-ad-info"><h3>${esc(ad.title)}</h3><p><span class="status-pill ${esc(ad.status)}">${esc(STATUS_LABELS[ad.status]||ad.status)}</span> · ${esc(priceText(ad))} · ${esc(ad.location)}${ad.status==="rejected"&&ad.moderation_note?`<br>Dôvod: ${esc(ad.moderation_note)}`:""}${ad.status==="published"&&ad.expires_at?`<br>Platí do ${esc(dateSk(ad.expires_at))}`:""}</p></div>
      <div class="my-ad-actions">${canView?`<a class="bazar-mini-btn" href="inzerat.html?id=${encodeURIComponent(ad.id)}" target="_blank" rel="noopener">Pozrieť</a>`:""}<button class="bazar-mini-btn" type="button" data-edit-ad="${ad.id}">Upraviť</button>${ad.status!=="closed"?`<button class="bazar-mini-btn" type="button" data-close-ad="${ad.id}">Ukončiť</button>`:""}<button class="bazar-mini-btn danger" type="button" data-delete-ad="${ad.id}">Vymazať</button></div>
    </article>`;
  }).join("");
  root.querySelectorAll("[data-edit-ad]").forEach(b=>b.addEventListener("click",()=>editAd(b.dataset.editAd)));
  root.querySelectorAll("[data-close-ad]").forEach(b=>b.addEventListener("click",()=>closeAd(b.dataset.closeAd)));
  root.querySelectorAll("[data-delete-ad]").forEach(b=>b.addEventListener("click",()=>deleteAd(b.dataset.deleteAd)));
}
function editAd(id){
  const ad=currentOwnAds.find(x=>x.id===id);if(!ad)return;
  resetAdForm();
  $("#bazar-ad-id").value=ad.id;$("#ad-title").value=ad.title||"";$("#ad-description").value=ad.description||"";$("#ad-category").value=ad.category;$("#ad-listing-type").value=ad.listing_type;$("#ad-condition").value=ad.item_condition;$("#ad-price-mode").value=ad.price_mode;$("#ad-price").value=ad.price??"";$("#ad-region").value=ad.region;$("#ad-location").value=ad.location||"";$("#ad-contact-name").value=ad.contact_name||"";$("#ad-contact-email").value=ad.contact_email||"";$("#ad-contact-phone").value=ad.contact_phone||"";
  $("#ad-private-confirm").checked=true;$("#ad-rules-confirm").checked=true;$("#ad-contact-confirm").checked=true;
  originalRemoteUrls=Array.isArray(ad.images)?ad.images.filter(safeHttpUrl):[];imageState=originalRemoteUrls.map(url=>({kind:"remote",url}));renderImageState();syncPriceUi();
  $("#bazar-form-title").textContent="Upraviť inzerát";$("#bazar-submit-btn").textContent=ad.status==="published"?"Uložiť a poslať znovu na schválenie":"Uložiť zmeny";$("#bazar-cancel-edit").hidden=false;
  $("#bazar-ad-form").scrollIntoView({behavior:"smooth",block:"start"});
}
async function closeAd(id){
  if(!confirm("Ukončiť tento inzerát? Prestane sa zobrazovať verejne."))return;
  const {error}=await bazarDb.from("zahrada_bazar_ads").update({status:"closed"}).eq("id",id).eq("user_id",currentUser.id);
  if(error){alert("Inzerát sa nepodarilo ukončiť.");return}await Promise.all([loadMyAds(),loadPublicAds()]);
}
async function deleteAd(id){
  const ad=currentOwnAds.find(x=>x.id===id);if(!ad||!confirm("Naozaj chceš inzerát natrvalo vymazať aj s fotografiami?"))return;
  const {error}=await bazarDb.from("zahrada_bazar_ads").delete().eq("id",id).eq("user_id",currentUser.id);
  if(error){alert("Inzerát sa nepodarilo vymazať.");return}
  await removeImageUrls(Array.isArray(ad.images)?ad.images:[]);if($("#bazar-ad-id").value===id)resetAdForm();await Promise.all([loadMyAds(),loadPublicAds()]);
}

fillSelects();
resetAdForm();
loadPublicAds();
refreshAuth();
