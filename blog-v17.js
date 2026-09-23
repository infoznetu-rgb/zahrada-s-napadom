const BLOG_URL="https://bkyappgttwjxakkwycub.supabase.co";
const BLOG_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const blogDb=window.supabase.createClient(BLOG_URL,BLOG_KEY);

const BLOG_CATEGORY_ORDER=[
  "Záhrada",
  "Dielňa",
  "Dom a záhrada",
  "Vychytávky",
  "Sezónne tipy",
  "Recyklácia",
  "Hobby"
];

const blogState={
  posts:[],
  activeCategory:"Všetko",
  query:""
};

function blogEsc(value){
  return String(value??"").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));
}

function blogHref(p){const s=String(p?.slug||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");return "/blog/"+s+"/"}

function blogCoverUrl(value){
  const url=String(value||"");
  return url;
}


function blogCountLabel(count){
  if(count===1)return "1 článok";
  if(count>=2&&count<=4)return `${count} články`;
  return `${count} článkov`;
}

function blogNormalize(value){
  return String(value||"")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().trim();
}

function blogMatchesQuery(post,query){
  const q=blogNormalize(query);
  if(!q)return true;
  const hay=blogNormalize([
    post.title,post.excerpt,post.category,
    Array.isArray(post.tags)?post.tags.join(" "):post.tags,
    post.content
  ].filter(Boolean).join(" "));
  return q.split(/\s+/).filter(Boolean).every(word=>hay.includes(word));
}

function renderBlogCard(p){
  return `<article class="cms-post-card is-blog" data-blog-category="${blogEsc(p.category||"Tip")}" data-post-slug="${blogEsc(p.slug)}" data-post-type="blog">
    <a class="cms-post-image" href="${blogEsc(blogHref(p))}">
      ${p.cover_url
        ? `<img src="${blogEsc(blogCoverUrl(p.cover_url))}" alt="${blogEsc(p.title)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/assets/blog/fallback-cover.svg'">`
        : `<div class="cms-post-placeholder">BLOG · ${blogEsc(p.category||"Tip")}</div>`}
    </a>
    <div class="cms-post-body">
      <span class="tag">BLOG · ${blogEsc(p.category||"Tip")}</span>
      <h3><a href="${blogEsc(blogHref(p))}">${blogEsc(p.title)}</a></h3>
      <p>${blogEsc(p.excerpt||"")}</p>
      <div class="cms-card-actions">
        <a class="project-link" href="${blogEsc(blogHref(p))}">Čítať blog →</a>
      </div>
    </div>
  </article>`;
}

function orderedCategories(posts){
  const counts=new Map();
  posts.forEach(p=>{
    const category=(p.category||"Ostatné").trim()||"Ostatné";
    counts.set(category,(counts.get(category)||0)+1);
  });

  return [...counts.entries()].sort(([a],[b])=>{
    const ai=BLOG_CATEGORY_ORDER.indexOf(a);
    const bi=BLOG_CATEGORY_ORDER.indexOf(b);
    if(ai!==-1||bi!==-1){
      if(ai===-1)return 1;
      if(bi===-1)return -1;
      return ai-bi;
    }
    return a.localeCompare(b,"sk");
  });
}

function setCategory(category,{updateUrl=true}={}){
  const valid=new Set(["Všetko",...orderedCategories(blogState.posts).map(([name])=>name)]);
  blogState.activeCategory=valid.has(category)?category:"Všetko";

  document.querySelectorAll("[data-blog-filter]").forEach(btn=>{
    const active=btn.dataset.blogFilter===blogState.activeCategory;
    btn.classList.toggle("is-active",active);
    btn.setAttribute("aria-pressed",String(active));
  });

  renderVisiblePosts();

  if(updateUrl){
    const url=new URL(window.location.href);
    if(blogState.activeCategory==="Všetko")url.searchParams.delete("kategoria");
    else url.searchParams.set("kategoria",blogState.activeCategory);
    history.replaceState(null,"",url.pathname+url.search+url.hash);
  }
}

function renderFilters(){
  const filters=document.querySelector("#blog-category-filters");
  if(!filters)return;

  const categories=orderedCategories(blogState.posts);
  const allButton=`<button type="button" class="blog-filter-chip" data-blog-filter="Všetko" aria-pressed="false">
    <span>Všetko</span><b>${blogState.posts.length}</b>
  </button>`;

  const categoryButtons=categories.map(([name,count])=>`
    <button type="button" class="blog-filter-chip" data-blog-filter="${blogEsc(name)}" aria-pressed="false">
      <span>${blogEsc(name)}</span><b>${count}</b>
    </button>`).join("");

  filters.innerHTML=allButton+categoryButtons;

  filters.addEventListener("click",event=>{
    const button=event.target.closest("[data-blog-filter]");
    if(!button)return;
    setCategory(button.dataset.blogFilter);
  });
}

function renderVisiblePosts(){
  const root=document.querySelector("#cms-blog-list");
  const empty=document.querySelector("#blog-empty");
  const summary=document.querySelector("#blog-filter-summary");
  if(!root)return;

  let filtered=blogState.activeCategory==="Všetko"
    ? blogState.posts
    : blogState.posts.filter(p=>(p.category||"Ostatné")===blogState.activeCategory);

  filtered=filtered.filter(p=>blogMatchesQuery(p,blogState.query));

  root.innerHTML=filtered.map(renderBlogCard).join("");
  if(empty){
    empty.hidden=filtered.length>0;
    if(!filtered.length)empty.textContent=blogState.query
      ? "Pre toto hľadanie som nenašiel žiadny článok."
      : "V tejto kategórii zatiaľ nie sú články.";
  }

  if(summary){
    const prefix=blogState.activeCategory==="Všetko"?"":blogState.activeCategory+" · ";
    summary.textContent=prefix+(blogState.query
      ? blogCountLabel(filtered.length)+" pre „"+blogState.query+"“"
      : "Zobrazených "+blogCountLabel(filtered.length));
  }
}

async function loadBlog(){
  const empty=document.querySelector("#blog-empty");
  const summary=document.querySelector("#blog-filter-summary");

  const {data,error}=await blogDb.from("zahrada_posts")
    .select("slug,title,excerpt,category,cover_url,published_at,tags,content")
    .eq("status","published")
    .eq("content_type","blog")
    .order("published_at",{ascending:false})
    .limit(300);

  let localPosts=[];
  try{
    const response=await fetch("/data/seo-blog-100-list.json",{cache:"no-cache"});
    if(response.ok)localPosts=await response.json();
  }catch(_){}

  const remotePosts=(!error&&Array.isArray(data))?data:[];
  const merged=new Map();
  [...remotePosts,...(Array.isArray(localPosts)?localPosts:[])].forEach(post=>{
    if(post?.slug&&!merged.has(post.slug))merged.set(post.slug,post);
  });
  blogState.posts=[...merged.values()].sort((a,b)=>
    String(b.published_at||"").localeCompare(String(a.published_at||""))
  );

  if(!blogState.posts.length){
    if(empty)empty.hidden=false;
    if(summary)summary.textContent="Blog sa momentálne nepodarilo načítať.";
    return;
  }

  renderFilters();

  const params=new URLSearchParams(window.location.search);
  const requested=params.get("kategoria");
  blogState.query=(params.get("q")||"").trim();
  const search=document.querySelector("#blog-search");
  const clear=document.querySelector("#blog-search-clear");
  if(search)search.value=blogState.query;
  if(clear)clear.hidden=!blogState.query;
  setCategory(requested||"Všetko",{updateUrl:false});
}

const blogSearch=document.querySelector("#blog-search");
const blogSearchClear=document.querySelector("#blog-search-clear");
let blogSearchTrackTimer=null;

function setBlogQuery(value,{updateUrl=true}={}){
  blogState.query=String(value||"").trim();
  if(blogSearchClear)blogSearchClear.hidden=!blogState.query;
  renderVisiblePosts();
  if(updateUrl){
    const url=new URL(window.location.href);
    if(blogState.query)url.searchParams.set("q",blogState.query);
    else url.searchParams.delete("q");
    history.replaceState(null,"",url.pathname+url.search+url.hash);
  }
}

blogSearch?.addEventListener("input",()=>{
  setBlogQuery(blogSearch.value);
  clearTimeout(blogSearchTrackTimer);
  const q=blogSearch.value.trim();
  if(q.length>=2)blogSearchTrackTimer=setTimeout(()=>window.ZahradaApp?.trackEvent?.("search_used",{label:q}),500);
});
blogSearchClear?.addEventListener("click",()=>{
  if(blogSearch)blogSearch.value="";
  setBlogQuery("");
  blogSearch?.focus();
});

loadBlog();
