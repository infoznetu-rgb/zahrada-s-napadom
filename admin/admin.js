const SUPABASE_URL="https://bkyappgttwjxakkwycub.supabase.co";
const SUPABASE_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let posts=[];
let gallery=[];
let postVideos=[];
let homeVideos=[];
let siteSettings={};
let currentPost=null;
let mediaLoaded=false;

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
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+name));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  document.querySelector(".sidebar").classList.remove("open");
  if(name==="media"&&!mediaLoaded)loadMediaLibrary();
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
  postVideos=Array.isArray(currentPost?.videos)?[...currentPost.videos]:[];
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
  renderPostVideos();
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
  box.innerHTML=gallery.map((url,i)=>`<div class="gallery-item"><img src="${esc(url)}" alt=""><div class="gallery-controls">
    <button type="button" data-gallery-left="${i}" aria-label="Posunúť doľava" ${i===0?"disabled":""}>←</button>
    <button type="button" data-gallery-right="${i}" aria-label="Posunúť doprava" ${i===gallery.length-1?"disabled":""}>→</button>
    <button type="button" data-remove-gallery="${i}" aria-label="Odstrániť">×</button>
  </div></div>`).join("");
  box.querySelectorAll("[data-remove-gallery]").forEach(b=>b.addEventListener("click",()=>{gallery.splice(Number(b.dataset.removeGallery),1);renderGallery()}));
  box.querySelectorAll("[data-gallery-left]").forEach(b=>b.addEventListener("click",()=>moveItem(gallery,Number(b.dataset.galleryLeft),-1,renderGallery)));
  box.querySelectorAll("[data-gallery-right]").forEach(b=>b.addEventListener("click",()=>moveItem(gallery,Number(b.dataset.galleryRight),1,renderGallery)));
}

function moveItem(list,index,delta,render){
  const next=index+delta;if(next<0||next>=list.length)return;
  [list[index],list[next]]=[list[next],list[index]];render();
}

function renderPostVideos(){
  const box=$("#post-videos-preview");
  if(!box)return;
  if(!postVideos.length){box.innerHTML='<div class="empty compact">Zatiaľ bez videa.</div>';return}
  box.innerHTML=postVideos.map((url,i)=>`<div class="admin-video-item"><video src="${esc(url)}" controls preload="metadata"></video><div class="post-video-controls">
    <button type="button" data-post-video-up="${i}" aria-label="Posunúť hore" ${i===0?"disabled":""}>↑</button>
    <button type="button" data-post-video-down="${i}" aria-label="Posunúť dole" ${i===postVideos.length-1?"disabled":""}>↓</button>
    <button type="button" data-remove-post-video="${i}" aria-label="Odstrániť video">×</button>
  </div></div>`).join("");
  box.querySelectorAll("[data-remove-post-video]").forEach(b=>b.addEventListener("click",()=>{postVideos.splice(Number(b.dataset.removePostVideo),1);renderPostVideos()}));
  box.querySelectorAll("[data-post-video-up]").forEach(b=>b.addEventListener("click",()=>moveItem(postVideos,Number(b.dataset.postVideoUp),-1,renderPostVideos)));
  box.querySelectorAll("[data-post-video-down]").forEach(b=>b.addEventListener("click",()=>moveItem(postVideos,Number(b.dataset.postVideoDown),1,renderPostVideos)));
}

async function uploadMedia(file,prefix){
  if(file.size>100*1024*1024)throw new Error("Súbor je väčší ako 100 MB.");
  const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"");
  const path=`${prefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const {error}=await db.storage.from("zahrada-media").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type||undefined});
  if(error)throw error;
  return db.storage.from("zahrada-media").getPublicUrl(path).data.publicUrl;
}

async function uploadImage(file,slug){
  return uploadMedia(file,`posts/${slug||"obrazky"}`);
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

$("#post-video-files").addEventListener("change",async(e)=>{
  const files=[...(e.target.files||[])];if(!files.length)return;
  try{
    setSave("Nahrávam video…");
    const slug=slugify($("#post-slug").value||$("#post-title").value)||"prispevok";
    for(const file of files)postVideos.push(await uploadMedia(file,`posts/${slug}/video`));
    renderPostVideos();setSave("Video nahrané");
  }catch(err){alert("Video sa nepodarilo nahrať: "+err.message);setSave("Chyba")}
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
    videos:postVideos,
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
  if(error){setSave("Chyba nastavení");return}
  siteSettings=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
  const hero=siteSettings.hero||{};
  const contact=siteSettings.contact||{};
  const sections=siteSettings.home_sections||{};
  const social=siteSettings.social||{};
  const footer=siteSettings.footer||{};
  const seo=siteSettings.seo||{};
  const visible=siteSettings.visibility||{};
  homeVideos=Array.isArray(siteSettings.home_videos?.items)?siteSettings.home_videos.items:[];

  $("#hero-eyebrow-input").value=hero.eyebrow||"";
  $("#hero-title-input").value=hero.title||"";
  $("#hero-text-input").value=hero.text||"";

  const fillSection=(name)=>{
    const section=sections[name]||{};
    const k=$("#"+name+"-kicker-input"),t=$("#"+name+"-title-input"),x=$("#"+name+"-text-input");
    if(k)k.value=section.kicker||"";
    if(t)t.value=section.title||"";
    if(x)x.value=section.text||"";
  };
  ["projects","blog","videos","community"].forEach(fillSection);

  $("#contact-title-input").value=contact.title||"";
  $("#contact-text-input").value=contact.text||"";
  $("#contact-facebook-input").value=contact.facebook||social.facebook||"";

  $("#social-facebook-input").value=social.facebook||contact.facebook||"";
  $("#social-instagram-input").value=social.instagram||"";
  $("#social-youtube-input").value=social.youtube||"";
  $("#footer-text-input").value=footer.text||"";
  $("#footer-copyright-input").value=footer.copyright||"";
  $("#seo-title-input").value=seo.title||"";
  $("#seo-description-input").value=seo.description||"";

  const defaults={season:true,maker:true,projects:true,blog:true,videos:true,community:true,facebook:true,contact:true};
  Object.keys(defaults).forEach(key=>{
    const el=$("#visible-"+key);
    if(el)el.checked=visible[key]!==false;
  });
  renderHomeVideos();
}

$("#settings-form").addEventListener("submit",async(e)=>{
  e.preventDefault();setSave("Ukladám stránku…");
  const hero={eyebrow:$("#hero-eyebrow-input").value.trim(),title:$("#hero-title-input").value.trim(),text:$("#hero-text-input").value.trim()};
  const sectionValue=(name)=>({kicker:$("#"+name+"-kicker-input").value.trim(),title:$("#"+name+"-title-input").value.trim(),text:$("#"+name+"-text-input").value.trim()});
  const home_sections={projects:sectionValue("projects"),blog:sectionValue("blog"),videos:sectionValue("videos"),community:sectionValue("community")};
  const social={facebook:$("#social-facebook-input").value.trim(),instagram:$("#social-instagram-input").value.trim(),youtube:$("#social-youtube-input").value.trim()};
  const contact={title:$("#contact-title-input").value.trim(),text:$("#contact-text-input").value.trim(),facebook:$("#contact-facebook-input").value.trim()||social.facebook};
  const footer={text:$("#footer-text-input").value.trim(),copyright:$("#footer-copyright-input").value.trim()};
  const seo={title:$("#seo-title-input").value.trim(),description:$("#seo-description-input").value.trim()};
  const visibility={};
  ["season","maker","projects","blog","videos","community","facebook","contact"].forEach(key=>visibility[key]=$("#visible-"+key).checked);
  const rows=[
    {key:"hero",value:hero},
    {key:"contact",value:contact},
    {key:"home_sections",value:home_sections},
    {key:"social",value:social},
    {key:"footer",value:footer},
    {key:"seo",value:seo},
    {key:"visibility",value:visibility}
  ];
  const {error}=await db.from("zahrada_site_settings").upsert(rows,{onConflict:"key"});
  if(error){alert("Nastavenia sa nepodarilo uložiť: "+error.message);setSave("Chyba");return}
  siteSettings={...siteSettings,hero,contact,home_sections,social,footer,seo,visibility};
  setSave("Stránka uložená");
});

function renderHomeVideos(){
  const box=$("#home-videos-list");
  if(!box)return;
  if(!homeVideos.length){box.innerHTML='<div class="empty">Zatiaľ tu nie sú žiadne videá.</div>';return}
  box.innerHTML=homeVideos.map((v,i)=>`<article class="admin-home-video">
    <video src="${esc(v.url)}" controls preload="metadata"></video>
    <div><strong>${esc(v.title||"Video")}</strong><p>${esc(v.description||"")}</p></div>
    <div class="admin-video-actions">
      <button type="button" class="mini-btn" data-video-up="${i}" ${i===0?"disabled":""}>↑</button>
      <button type="button" class="mini-btn" data-video-down="${i}" ${i===homeVideos.length-1?"disabled":""}>↓</button>
      <button type="button" class="mini-btn danger-mini" data-video-remove="${i}">Odstrániť</button>
    </div>
  </article>`).join("");
  box.querySelectorAll("[data-video-up]").forEach(b=>b.addEventListener("click",()=>moveHomeVideo(Number(b.dataset.videoUp),-1)));
  box.querySelectorAll("[data-video-down]").forEach(b=>b.addEventListener("click",()=>moveHomeVideo(Number(b.dataset.videoDown),1)));
  box.querySelectorAll("[data-video-remove]").forEach(b=>b.addEventListener("click",()=>removeHomeVideo(Number(b.dataset.videoRemove))));
}

async function saveHomeVideos(message="Videá uložené"){
  const {error}=await db.from("zahrada_site_settings").upsert([{key:"home_videos",value:{items:homeVideos}}],{onConflict:"key"});
  if(error){alert("Videá sa nepodarilo uložiť: "+error.message);setSave("Chyba");return false}
  siteSettings.home_videos={items:homeVideos};
  renderHomeVideos();setSave(message);return true;
}

async function moveHomeVideo(index,delta){
  const next=index+delta;if(next<0||next>=homeVideos.length)return;
  [homeVideos[index],homeVideos[next]]=[homeVideos[next],homeVideos[index]];
  await saveHomeVideos();
}

async function removeHomeVideo(index){
  if(!confirm("Odstrániť toto video zo stránky? Súbor zostane v knižnici médií."))return;
  homeVideos.splice(index,1);await saveHomeVideos("Video odstránené zo stránky");
}

$("#home-video-add").addEventListener("click",async()=>{
  const file=$("#home-video-file").files?.[0];
  const title=$("#home-video-title").value.trim();
  if(!file){alert("Najprv vyber video.");return}
  try{
    setSave("Nahrávam video…");
    const url=await uploadMedia(file,"videos/home");
    homeVideos.push({id:crypto.randomUUID(),title:title||file.name,description:$("#home-video-description").value.trim(),url});
    if(await saveHomeVideos("Video pridané")){
      $("#home-video-title").value="";$("#home-video-description").value="";$("#home-video-file").value="";
      mediaLoaded=false;
    }
  }catch(err){alert("Video sa nepodarilo nahrať: "+err.message);setSave("Chyba")}
});

async function listMediaFolder(prefix,depth=0){
  const {data,error}=await db.storage.from("zahrada-media").list(prefix,{limit:100,sortBy:{column:"created_at",order:"desc"}});
  if(error)throw error;
  let out=[];
  for(const item of data||[]){
    const path=prefix?prefix+"/"+item.name:item.name;
    if(item.metadata||item.id){
      out.push({path,name:item.name,metadata:item.metadata||{},created_at:item.created_at||item.updated_at||""});
    }else if(depth<2){
      out=out.concat(await listMediaFolder(path,depth+1));
    }
  }
  return out;
}

async function loadMediaLibrary(){
  const box=$("#media-library");if(!box)return;
  box.innerHTML='<div class="empty">Načítavam médiá…</div>';
  try{
    const [postsMedia,videosMedia]=await Promise.all([listMediaFolder("posts"),listMediaFolder("videos")]);
    const files=[...postsMedia,...videosMedia].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
    if(!files.length){box.innerHTML='<div class="empty">Zatiaľ tu nie sú žiadne médiá.</div>';mediaLoaded=true;return}
    box.innerHTML=files.map(file=>{
      const url=db.storage.from("zahrada-media").getPublicUrl(file.path).data.publicUrl;
      const type=String(file.metadata?.mimetype||"");
      const isVideo=type.startsWith("video/")||/\.(mp4|webm|mov)$/i.test(file.name);
      return `<article class="media-card">
        <div class="media-preview">${isVideo?`<video src="${esc(url)}" muted controls preload="metadata"></video>`:`<img src="${esc(url)}" alt="">`}</div>
        <strong>${esc(file.name)}</strong>
        <small>${esc(file.path)}</small>
        <button class="mini-btn" type="button" data-copy-media="${esc(url)}">Kopírovať odkaz</button>
      </article>`;
    }).join("");
    box.querySelectorAll("[data-copy-media]").forEach(btn=>btn.addEventListener("click",async()=>{
      try{await navigator.clipboard.writeText(btn.dataset.copyMedia);btn.textContent="Skopírované"}catch(e){prompt("Skopíruj odkaz:",btn.dataset.copyMedia)}
    }));
    mediaLoaded=true;
  }catch(err){box.innerHTML='<div class="empty">Médiá sa nepodarilo načítať.</div>';setSave("Chyba médií")}
}
$("#media-refresh").addEventListener("click",()=>{mediaLoaded=false;loadMediaLibrary()});

checkAdmin();