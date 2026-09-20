const SUPABASE_URL="https://bkyappgttwjxakkwycub.supabase.co";
const SUPABASE_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let posts=[];
let gallery=[];
let currentPost=null;

const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const authScreen=$("#auth-screen");
const app=$("#admin-app");
const authMessage=$("#auth-message");
const saveState=$("#save-state");

function setMessage(el,text,type=""){el.textContent=text||"";el.className="message "+type}
function setSave(text){saveState.textContent=text}
function slugify(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90)}
function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function formatDate(v){if(!v)return"—";return new Intl.DateTimeFormat("sk-SK",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(v))}

async function checkAdmin(){
  const {data:{session}}=await db.auth.getSession();
  if(!session){showAuth();return}
  const {data,error}=await db.from("zahrada_admins").select("user_id").eq("user_id",session.user.id).maybeSingle();
  if(error||!data){await db.auth.signOut();showAuth();setMessage(authMessage,"Tento účet nemá oprávnenie správcu.","error");return}
  showApp(session.user);
  await loadAll();
}
function showAuth(){authScreen.hidden=false;app.hidden=true}
function showApp(user){authScreen.hidden=true;app.hidden=false;$("#admin-email").textContent=user.email||""}

$("#login-form").addEventListener("submit",async(e)=>{
  e.preventDefault();setMessage(authMessage,"Prihlasujem…");
  const {error}=await db.auth.signInWithPassword({email:$("#login-email").value.trim(),password:$("#login-password").value});
  if(error){setMessage(authMessage,"Prihlásenie sa nepodarilo. Skontroluj e-mail a heslo.","error");return}
  await checkAdmin();
});

$("#logout-btn").addEventListener("click",async()=>{await db.auth.signOut();location.reload()});
db.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT")showAuth()});

function activateView(name){
  $$(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+name));
  $$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  document.querySelector(".sidebar").classList.remove("open");
}
document.addEventListener("click",(e)=>{
  const newBtn=e.target.closest("[data-new-post]");
  if(newBtn){openEditor();return}
  const viewBtn=e.target.closest("[data-view]");
  if(viewBtn){activateView(viewBtn.dataset.view)}
});
$("#sidebar-toggle").addEventListener("click",()=>document.querySelector(".sidebar").classList.toggle("open"));
$("#editor-cancel").addEventListener("click",()=>activateView("posts"));

async function loadAll(){
  setSave("Načítavam…");
  await Promise.all([loadPosts(),loadSettings()]);
  setSave("Pripravené");
}

async function loadPosts(){
  const {data,error}=await db.from("zahrada_posts").select("*").order("created_at",{ascending:false});
  if(error){setSave("Chyba načítania");return}
  posts=data||[];
  renderStats();
  renderPosts();
}

function renderStats(){
  $("#stat-published").textContent=posts.filter(p=>p.status==="published").length;
  $("#stat-drafts").textContent=posts.filter(p=>p.status==="draft").length;
  $("#stat-total").textContent=posts.length;
  renderPostRows($("#recent-posts"),posts.slice(0,5));
}

function renderPosts(){
  const q=$("#post-search").value.trim().toLowerCase();
  const f=$("#post-filter").value;
  const filtered=posts.filter(p=>(f==="all"||p.status===f)&&(!q||p.title.toLowerCase().includes(q)||p.category.toLowerCase().includes(q)));
  renderPostRows($("#posts-list"),filtered);
}
$("#post-search").addEventListener("input",renderPosts);
$("#post-filter").addEventListener("change",renderPosts);

function renderPostRows(container,list){
  if(!list.length){container.innerHTML='<div class="empty">Zatiaľ tu nie sú žiadne príspevky.</div>';return}
  container.innerHTML=list.map(p=>`<article class="post-row">
    ${p.cover_url?`<img class="post-thumb" src="${esc(p.cover_url)}" alt="">`:'<div class="post-thumb"></div>'}
    <div class="post-meta"><h4>${esc(p.title)}</h4><p>${p.content_type==="blog"?"Blog":"Projekt"} · ${esc(p.category)} · ${formatDate(p.published_at||p.created_at)} · <span class="badge ${p.status}">${p.status==="published"?"Publikované":"Koncept"}</span></p></div>
    <div class="post-actions"><button class="mini-btn" data-edit-id="${p.id}">Upraviť</button>${p.status==="published"?`<a class="mini-btn" href="../prispevok.html?slug=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">Pozrieť</a>`:""}</div>
  </article>`).join("");
  container.querySelectorAll("[data-edit-id]").forEach(b=>b.addEventListener("click",()=>openEditor(b.dataset.editId)));
}

function openEditor(id=null){
  currentPost=id?posts.find(p=>p.id===id):null;
  gallery=Array.isArray(currentPost?.gallery)?[...currentPost.gallery]:[];
  $("#post-id").value=currentPost?.id||"";
  $("#post-title").value=currentPost?.title||"";
  $("#post-slug").value=currentPost?.slug||"";
  $("#post-content-type").value=currentPost?.content_type||"project";
  $("#post-category").value=currentPost?.category||"Záhrada";
  $("#post-tags").value=Array.isArray(currentPost?.tags)?currentPost.tags.join(", "):"";
  $("#post-excerpt").value=currentPost?.excerpt||"";
  $("#post-content").value=currentPost?.content||"";
  $("#post-cover-url").value=currentPost?.cover_url||"";
  $("#editor-title").textContent=currentPost?"Upraviť príspevok":"Nový príspevok";
  $("#current-status").textContent=currentPost?.status==="published"?"Publikované":"Koncept";
  $("#delete-post-btn").hidden=!currentPost;
  renderCover();
  renderGallery();
  activateView("editor");
}

$("#post-title").addEventListener("input",()=>{
  if(!currentPost||!$("#post-slug").dataset.touched) $("#post-slug").value=slugify($("#post-title").value);
});
$("#post-slug").addEventListener("input",()=>{$("#post-slug").dataset.touched="1";$("#post-slug").value=slugify($("#post-slug").value)});

function renderCover(){
  const url=$("#post-cover-url").value;
  $("#cover-preview").innerHTML=url?`<img src="${esc(url)}" alt="Náhľad hlavnej fotografie">`:"<span>Zatiaľ bez fotografie</span>";
}
function renderGallery(){
  const box=$("#gallery-preview");
  box.innerHTML=gallery.map((url,i)=>`<div class="gallery-item"><img src="${esc(url)}" alt=""><button type="button" data-remove-gallery="${i}" aria-label="Odstrániť">×</button></div>`).join("");
  box.querySelectorAll("[data-remove-gallery]").forEach(b=>b.addEventListener("click",()=>{gallery.splice(Number(b.dataset.removeGallery),1);renderGallery()}));
}

async function uploadImage(file,slug){
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
  const path=`posts/${slug||"obrazky"}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const {error}=await db.storage.from("zahrada-media").upload(path,file,{cacheControl:"3600",upsert:false});
  if(error)throw error;
  return db.storage.from("zahrada-media").getPublicUrl(path).data.publicUrl;
}

$("#post-cover-file").addEventListener("change",async(e)=>{
  const file=e.target.files?.[0];if(!file)return;
  try{setSave("Nahrávam fotografiu…");const url=await uploadImage(file,slugify($("#post-slug").value||$("#post-title").value));$("#post-cover-url").value=url;renderCover();setSave("Fotografia nahraná")}catch(err){alert("Fotografiu sa nepodarilo nahrať: "+err.message);setSave("Chyba")}
  e.target.value="";
});

$("#post-gallery-files").addEventListener("change",async(e)=>{
  const files=[...(e.target.files||[])];if(!files.length)return;
  try{setSave("Nahrávam galériu…");for(const file of files){gallery.push(await uploadImage(file,slugify($("#post-slug").value||$("#post-title").value)))}renderGallery();setSave("Galéria nahraná")}catch(err){alert("Niektorú fotografiu sa nepodarilo nahrať: "+err.message);setSave("Chyba")}
  e.target.value="";
});

async function savePost(status){
  const title=$("#post-title").value.trim();
  const slug=slugify($("#post-slug").value||title);
  if(!title||!slug){alert("Vyplň názov príspevku.");return}
  setSave("Ukladám…");
  const payload={
    title,slug,
    content_type:$("#post-content-type").value==="blog"?"blog":"project",
    category:$("#post-category").value.trim()||"Záhrada",
    tags:$("#post-tags").value.split(",").map(x=>x.trim()).filter(Boolean),
    excerpt:$("#post-excerpt").value.trim(),
    content:$("#post-content").value.trim(),
    cover_url:$("#post-cover-url").value||null,
    gallery,
    status,
    published_at:status==="published"?(currentPost?.published_at||new Date().toISOString()):null
  };
  let result;
  if(currentPost) result=await db.from("zahrada_posts").update(payload).eq("id",currentPost.id).select().single();
  else result=await db.from("zahrada_posts").insert(payload).select().single();
  if(result.error){setSave("Chyba");alert("Príspevok sa nepodarilo uložiť: "+result.error.message);return}
  currentPost=result.data;
  await loadPosts();
  openEditor(currentPost.id);
  setSave(status==="published"?"Publikované":"Koncept uložený");
}
$("#save-draft-btn").addEventListener("click",()=>savePost("draft"));
$("#publish-btn").addEventListener("click",()=>savePost("published"));

$("#delete-post-btn").addEventListener("click",async()=>{
  if(!currentPost)return;
  if(!confirm("Naozaj chceš tento príspevok vymazať?"))return;
  setSave("Vymazávam…");
  const {error}=await db.from("zahrada_posts").delete().eq("id",currentPost.id);
  if(error){alert("Príspevok sa nepodarilo vymazať: "+error.message);setSave("Chyba");return}
  await loadPosts();activateView("posts");setSave("Príspevok vymazaný");
});

async function loadSettings(){
  const {data,error}=await db.from("zahrada_site_settings").select("key,value");
  if(error)return;
  const map=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
  const hero=map.hero||{},contact=map.contact||{};
  $("#hero-eyebrow-input").value=hero.eyebrow||"";
  $("#hero-title-input").value=hero.title||"";
  $("#hero-text-input").value=hero.text||"";
  $("#contact-title-input").value=contact.title||"";
  $("#contact-text-input").value=contact.text||"";
  $("#contact-facebook-input").value=contact.facebook||"";
}

$("#settings-form").addEventListener("submit",async(e)=>{
  e.preventDefault();setSave("Ukladám texty…");
  const hero={eyebrow:$("#hero-eyebrow-input").value.trim(),title:$("#hero-title-input").value.trim(),text:$("#hero-text-input").value.trim()};
  const contact={title:$("#contact-title-input").value.trim(),text:$("#contact-text-input").value.trim(),facebook:$("#contact-facebook-input").value.trim()};
  const {error}=await db.from("zahrada_site_settings").upsert([{key:"hero",value:hero},{key:"contact",value:contact}],{onConflict:"key"});
  if(error){alert("Texty sa nepodarilo uložiť: "+error.message);setSave("Chyba");return}
  setSave("Texty uložené");
});

checkAdmin();