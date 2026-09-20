const CMS_URL="https://bkyappgttwjxakkwycub.supabase.co";
const CMS_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const cms=window.supabase.createClient(CMS_URL,CMS_KEY);

function cmsEsc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}

async function loadSiteSettings(){
  const {data,error}=await cms.from("zahrada_site_settings").select("key,value");
  if(error||!data)return;
  const map=Object.fromEntries(data.map(x=>[x.key,x.value]));
  const hero=map.hero||{};
  if(hero.eyebrow&&document.querySelector("#cms-hero-eyebrow"))document.querySelector("#cms-hero-eyebrow").textContent=hero.eyebrow;
  if(hero.title&&document.querySelector("#cms-hero-title"))document.querySelector("#cms-hero-title").textContent=hero.title;
  if(hero.text&&document.querySelector("#cms-hero-text"))document.querySelector("#cms-hero-text").textContent=hero.text;
  const contact=map.contact||{};
  if(contact.title&&document.querySelector("#cms-contact-title"))document.querySelector("#cms-contact-title").textContent=contact.title;
  if(contact.text&&document.querySelector("#cms-contact-text"))document.querySelector("#cms-contact-text").textContent=contact.text;
  if(contact.facebook&&document.querySelector("#cms-contact-facebook"))document.querySelector("#cms-contact-facebook").href=contact.facebook;
}

async function loadPublishedPosts(){
  const projectRoot=document.querySelector("#cms-projects");
  const blogRoot=document.querySelector("#cms-blog-home");
  if(!projectRoot&&!blogRoot)return;

  const {data,error}=await cms.from("zahrada_posts")
    .select("slug,title,excerpt,category,cover_url,published_at,content_type,tags")
    .eq("status","published")
    .order("published_at",{ascending:false})
    .limit(60);

  if(error||!data||!data.length)return;

  const projects=data.filter(p=>p.content_type!=="blog");
  const blogs=data.filter(p=>p.content_type==="blog");

  const renderCard=(p)=>`<article class="cms-post-card ${p.content_type==="blog"?"is-blog":"is-project"}">
    <a class="cms-post-image" href="prispevok.html?slug=${encodeURIComponent(p.slug)}">
      ${p.cover_url?`<img src="${cmsEsc(p.cover_url)}" alt="${cmsEsc(p.title)}" loading="lazy">`:'<div class="cms-post-placeholder">Záhrada s nápadom</div>'}
    </a>
    <div class="cms-post-body">
      <span class="tag">${p.content_type==="blog"?"BLOG · ":""}${cmsEsc(p.category||"Nápad")}</span>
      <h3><a href="prispevok.html?slug=${encodeURIComponent(p.slug)}">${cmsEsc(p.title)}</a></h3>
      <p>${cmsEsc(p.excerpt||"")}</p>
      <div class="cms-card-actions">
        <a class="project-link" href="prispevok.html?slug=${encodeURIComponent(p.slug)}">${p.content_type==="blog"?"Čítať blog":"Pozrieť projekt"} →</a>
        <button class="card-share-btn" type="button"
          data-share-card
          data-share-url="prispevok.html?slug=${encodeURIComponent(p.slug)}"
          data-share-title="${cmsEsc(p.title)}"
          aria-label="Zdieľať príspevok ${cmsEsc(p.title)}"
          title="Zdieľať príspevok">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="19" r="2.5"></circle><path d="M8.2 10.9 15.8 6.1M8.2 13.1l7.6 4.8"></path></svg>
        </button>
      </div>
    </div>
  </article>`;

  // Najnovších 6 blogov má vlastnú sekciu a neopakuje sa vo výbere pri projektoch.
  const latestBlogs=blogs.slice(0,6);
  const selectedBlogs=blogs.slice(6,10);

  if(blogRoot){
    blogRoot.innerHTML=latestBlogs.map(renderCard).join("");
  }

  if(projectRoot){
    const mixed=[];
    const count=Math.max(projects.length,selectedBlogs.length);
    for(let i=0;i<count;i++){
      if(projects[i])mixed.push(projects[i]);
      if(selectedBlogs[i])mixed.push(selectedBlogs[i]);
    }
    projectRoot.innerHTML=mixed.slice(0,8).map(renderCard).join("");

    const fallback=document.querySelector("#static-project-fallback");
    if(fallback&&projects.length)fallback.hidden=true;
  }
}

loadSiteSettings();
loadPublishedPosts();