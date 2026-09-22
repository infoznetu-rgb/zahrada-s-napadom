const CMS_URL="https://bkyappgttwjxakkwycub.supabase.co";
const CMS_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const cms=window.supabase.createClient(CMS_URL,CMS_KEY);

function cmsCoverUrl(value){
  const url=String(value||"");
  return /^\/assets\/blog\/(?:0[1-9]|[12][0-9]|3[0-9]|40)-.*\.svg$/i.test(url)
    ? url.replace(/\.svg$/i,".webp")
    : url;
}

function cmsHref(p){return window.ZahradaSEO?.postHref?.(p)||("prispevok.html?slug="+encodeURIComponent(p.slug))}

function cmsEsc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}

async function loadSiteSettings(){
  const {data,error}=await cms.from("zahrada_site_settings").select("key,value");
  if(error||!data)return;
  const map=Object.fromEntries(data.map(x=>[x.key,x.value]));

  const setText=(selector,value)=>{const el=document.querySelector(selector);if(el&&value)el.textContent=value};
  const setMeta=(selector,value)=>{const el=document.querySelector(selector);if(el&&value)el.setAttribute("content",value)};

  const hero=map.hero||{};
  setText("#cms-hero-eyebrow",hero.eyebrow);
  setText("#cms-hero-title",hero.title);
  setText("#cms-hero-text",hero.text);

  const sections=map.home_sections||{};
  ["projects","blog","videos","community"].forEach(name=>{
    const section=sections[name]||{};
    setText("#cms-"+name+"-kicker",section.kicker);
    setText("#cms-"+name+"-title",section.title);
    setText("#cms-"+name+"-text",section.text);
  });

  const contact=map.contact||{};
  setText("#cms-contact-title",contact.title);
  setText("#cms-contact-text",contact.text);
  const contactEmail=contact.email||"kamgardensk@gmail.com";
  const emailLink=document.querySelector("#cms-contact-email");
  if(emailLink){
    emailLink.href="mailto:"+contactEmail+"?subject="+encodeURIComponent("[Záhrada s nápadom] Správa zo stránky");
    emailLink.textContent="Napísať e-mail ↗";
  }

  const social=map.social||{};
  const facebook=social.facebook||contact.facebook||"";
  if(facebook){
    document.querySelectorAll(".nav-facebook,.mobile-facebook,.footer-facebook-link,.facebook-page-link,#cms-contact-facebook").forEach(el=>el.href=facebook);
    const iframe=document.querySelector(".facebook-page-iframe");
    if(iframe)iframe.src="https://www.facebook.com/plugins/page.php?href="+encodeURIComponent(facebook)+"&width=500&height=280&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true";
  }

  const footer=map.footer||{};
  setText("#cms-footer-text",footer.text);
  setText("#cms-footer-copyright",footer.copyright);

  const seo=map.seo||{};
  if(seo.title){
    document.title=seo.title;
    setMeta('meta[property="og:title"]',seo.title);
  }
  if(seo.description){
    setMeta('meta[name="description"]',seo.description);
    setMeta('meta[property="og:description"]',seo.description);
  }

  const visible=map.visibility||{};
  const sectionMap={
    season:"#teraz-v-zahrade",
    maker:".maker-home",
    projects:"#projekty",
    blog:"#blog-home",
    videos:"#videa",
    gallery:"#idea-gallery",
    community:"#komunita",
    facebook:"#facebook",
    contact:"#kontakt"
  };
  Object.entries(sectionMap).forEach(([key,selector])=>{
    const el=document.querySelector(selector);
    if(el&&visible[key]===false)el.hidden=true;
  });

  const gallerySettings=map.home_gallery||{};
  const galleryItems=Array.isArray(gallerySettings.items)?gallerySettings.items:[];
  const gallerySection=document.querySelector("#idea-gallery");
  const galleryRoot=document.querySelector("#cms-idea-gallery-grid");
  setText("#cms-gallery-kicker",gallerySettings.kicker);
  setText("#idea-gallery-title",gallerySettings.title);
  setText("#cms-gallery-text",gallerySettings.text);
  if(gallerySection&&galleryRoot){
    if(galleryItems.length&&visible.gallery!==false){
      const showAll=gallerySection.dataset.galleryLimit==="all";
      const visibleItems=showAll?galleryItems:galleryItems.slice(0,6);
      galleryRoot.innerHTML=visibleItems.map((item,i)=>`<figure class="idea-gallery-card">
        <a href="${cmsEsc(item.url||"")}" target="_blank" rel="noopener" aria-label="Otvoriť fotografiu ${i+1}">
          <img src="${cmsEsc(item.url||"")}" alt="${cmsEsc(item.title||item.caption||("Fotografia "+(i+1)))}" loading="lazy" decoding="async">
        </a>
        ${(item.title||item.caption)?`<figcaption>${item.title?`<strong>${cmsEsc(item.title)}</strong>`:""}${item.caption?`<span>${cmsEsc(item.caption)}</span>`:""}</figcaption>`:""}
      </figure>`).join("");
      gallerySection.hidden=false;
      const more=document.querySelector("#idea-gallery-more");
      if(more)more.hidden=showAll||galleryItems.length<=visibleItems.length;
    }else{
      gallerySection.hidden=true;
    }
  }

  const videos=Array.isArray(map.home_videos?.items)?map.home_videos.items:[];
  const videoRoot=document.querySelector("#cms-video-grid");
  if(videoRoot&&videos.length){
    videoRoot.innerHTML=videos.map((v,i)=>`<article class="video-card cms-video-card">
      <video controls preload="metadata" playsinline src="${cmsEsc(v.url||"")}" aria-label="${cmsEsc(v.title||"Video")}"></video>
      <small class="cms-video-no">${String(i+1).padStart(2,"0")} · VIDEO</small>
      <h3>${cmsEsc(v.title||"Video")}</h3>
      <p>${cmsEsc(v.description||"")}</p>
    </article>`).join("");
  }
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

  const renderCard=(p)=>`<article class="cms-post-card ${p.content_type==="blog"?"is-blog":"is-project"}" data-post-slug="${cmsEsc(p.slug)}" data-post-type="${p.content_type==="blog"?"blog":"project"}">
    <a class="cms-post-image" href="${cmsEsc(cmsHref(p))}">
      ${p.cover_url?`<img src="${cmsEsc(cmsCoverUrl(p.cover_url))}" alt="${cmsEsc(p.title)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/blog/fallback-cover.svg'">`:'<div class="cms-post-placeholder">Záhrada s nápadom</div>'}
    </a>
    <div class="cms-post-body">
      <span class="tag">${p.content_type==="blog"?"BLOG · ":""}${cmsEsc(p.category||"Nápad")}</span>
      <h3><a href="${cmsEsc(cmsHref(p))}">${cmsEsc(p.title)}</a></h3>
      <p>${cmsEsc(p.excerpt||"")}</p>
      <div class="cms-card-actions">
        <a class="project-link" href="${cmsEsc(cmsHref(p))}">${p.content_type==="blog"?"Čítať blog":"Pozrieť projekt"} →</a>
        <button class="card-share-btn" type="button"
          data-share-card
          data-share-url="${cmsEsc(cmsHref(p))}"
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
    projectRoot.innerHTML=mixed.slice(0,4).map(renderCard).join("");

    const fallback=document.querySelector("#static-project-fallback");
    if(fallback&&projects.length)fallback.hidden=true;
  }
}

loadSiteSettings();
loadPublishedPosts();
