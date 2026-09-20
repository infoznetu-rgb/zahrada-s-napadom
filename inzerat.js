const DETAIL_URL="https://bkyappgttwjxakkwycub.supabase.co";
const DETAIL_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const detailDb=window.supabase.createClient(DETAIL_URL,DETAIL_KEY);
const TYPE_LABELS={sell:"Predám",give:"Darujem",exchange:"Vymením",wanted:"Hľadám"};
const CONDITION_LABELS={used:"Použité",unused:"Nové / nepoužité",repair:"Na opravu / diely",not_applicable:"Netýka sa"};
const $=s=>document.querySelector(s);
let currentAd=null;
let currentImages=[];

function safeHttpUrl(value){try{const u=new URL(String(value||""),location.href);return u.protocol==="https:"||u.protocol==="http:"?u.href:""}catch{return""}}
function euro(value){return new Intl.NumberFormat("sk-SK",{style:"currency",currency:"EUR",maximumFractionDigits:2}).format(Number(value)||0)}
function dateSk(v){return v?new Intl.DateTimeFormat("sk-SK",{day:"numeric",month:"long",year:"numeric"}).format(new Date(v)):""}
function priceText(ad){if(ad.price_mode==="free")return"Zadarmo";if(ad.price_mode==="exchange")return"Výmena";if(ad.price_mode==="not_listed")return"Cena neuvedená";if(ad.price_mode==="negotiable")return ad.price!=null?`${euro(ad.price)} · dohoda`:"Dohodou";return ad.price!=null?euro(ad.price):"Cena neuvedená"}
function setStatus(text,error=false){const el=$("#ad-detail-status");el.textContent=text;el.className="bazar-status"+(error?" error":"");el.hidden=false}
function contactLink(type,value){
  if(type==="email")return `<a class="contact-link" href="mailto:${encodeURIComponent(value)}">✉ ${escapeText(value)}</a>`;
  const normalized=String(value).replace(/[^+0-9]/g,"");
  return `<a class="contact-link" href="tel:${encodeURIComponent(normalized)}">☎ ${escapeText(value)}</a>`;
}
function escapeText(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function showImage(index){
  const root=$("#ad-main-image"), url=currentImages[index];
  root.innerHTML=url?`<img src="${escapeText(url)}" alt="${escapeText(currentAd?.title||"Fotografia inzerátu")}">`:'<div class="bazar-card-placeholder">Záhrada s nápadom<br>komunitný bazár</div>';
  document.querySelectorAll(".bazar-thumb").forEach((b,i)=>b.classList.toggle("active",i===index));
}
function renderImages(){
  currentImages=(Array.isArray(currentAd.images)?currentAd.images:[]).map(safeHttpUrl).filter(Boolean);
  showImage(0);
  const thumbs=$("#ad-thumbs");
  thumbs.innerHTML=currentImages.length>1?currentImages.map((url,i)=>`<button class="bazar-thumb ${i===0?"active":""}" type="button" data-img-index="${i}" aria-label="Zobraziť fotografiu ${i+1}"><img src="${escapeText(url)}" alt=""></button>`).join(""):"";
  thumbs.querySelectorAll("[data-img-index]").forEach(b=>b.addEventListener("click",()=>showImage(Number(b.dataset.imgIndex))));
}
function renderAd(){
  const ad=currentAd;
  document.title=`${ad.title} | Bazár | Záhrada s nápadom`;
  $("#ad-type").textContent=TYPE_LABELS[ad.listing_type]||ad.listing_type;
  $("#ad-category").textContent=ad.category||"";
  $("#ad-title").textContent=ad.title||"";
  $("#ad-price").textContent=priceText(ad);
  $("#ad-meta").textContent=`📍 ${ad.location}, ${ad.region} · ${CONDITION_LABELS[ad.item_condition]||ad.item_condition} · zverejnené ${dateSk(ad.published_at)}${ad.expires_at?` · platí do ${dateSk(ad.expires_at)}`:""}`;
  $("#ad-description").textContent=ad.description||"";
  $("#ad-contact-name").textContent=ad.contact_name||"Inzerent";
  const links=[];if(ad.contact_email)links.push(contactLink("email",ad.contact_email));if(ad.contact_phone)links.push(contactLink("phone",ad.contact_phone));
  $("#ad-contact-links").innerHTML=links.join("");
  const share=$("#ad-share");share.dataset.shareTitle=ad.title;share.dataset.shareUrl=location.href;
  renderImages();
  $("#ad-detail-status").hidden=true;$("#ad-detail").hidden=false;
}
async function loadAd(){
  const id=new URLSearchParams(location.search).get("id");
  if(!id){setStatus("Inzerát nebol nájdený.",true);return}
  const {data,error}=await detailDb.from("zahrada_bazar_ads").select("id,title,description,category,listing_type,item_condition,price,price_mode,region,location,contact_name,contact_email,contact_phone,images,published_at,expires_at,status").eq("id",id).eq("status","published").gt("expires_at",new Date().toISOString()).maybeSingle();
  if(error||!data){setStatus("Tento inzerát už nie je dostupný alebo čaká na schválenie.",true);return}
  currentAd=data;renderAd();
}

$("#report-open")?.addEventListener("click",()=>{$("#report-box").hidden=false;$("#report-box").scrollIntoView({behavior:"smooth",block:"center"})});
$("#report-cancel")?.addEventListener("click",()=>{$("#report-box").hidden=true;$("#report-message").textContent=""});
$("#report-form")?.addEventListener("submit",async e=>{
  e.preventDefault();if(!currentAd)return;
  const msg=$("#report-message");msg.className="bazar-form-message";msg.textContent="Odosielam nahlásenie…";
  const {error}=await detailDb.from("zahrada_bazar_reports").insert({ad_id:currentAd.id,reason:$("#report-reason").value,detail:$("#report-detail").value.trim(),status:"new"});
  if(error){msg.className="bazar-form-message error";msg.textContent="Nahlásenie sa nepodarilo odoslať. Skús to neskôr.";return}
  msg.className="bazar-form-message ok";msg.textContent="Ďakujeme. Nahlásenie bolo odoslané správcovi.";$("#report-form").reset();
});

loadAd();