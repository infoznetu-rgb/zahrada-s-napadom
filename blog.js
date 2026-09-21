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
  activeCategory:"Všetko"
};

function blogEsc(value){
  return String(value??"").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));
}

function blogHref(p){const s=String(p?.slug||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");return "/clanok-"+s+".html"}

function blogCountLabel(count){
  if(count===1)return "1 článok";
  if(count>=2&&count<=4)return `${count} články`;
  return `${count} článkov`;
}

function renderBlogCard(p){
  return `<article class="cms-post-card is-blog" data-blog-category="${blogEsc(p.category||"Tip")}" data-post-slug="${blogEsc(p.slug)}" data-post-type="blog">
    <a class="cms-post-image" href="${blogEsc(blogHref(p))}">
      ${p.cover_url
        ? `<img src="${blogEsc(p.cover_url)}" alt="${blogEsc(p.title)}" loading="lazy" onerror="this.onerror=null;this.src='/assets/blog/fallback-cover.svg'">`
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

  const filtered=blogState.activeCategory==="Všetko"
    ? blogState.posts
    : blogState.posts.filter(p=>(p.category||"Ostatné")===blogState.activeCategory);

  root.innerHTML=filtered.map(renderBlogCard).join("");
  if(empty)empty.hidden=filtered.length>0;

  if(summary){
    summary.textContent=blogState.activeCategory==="Všetko"
      ? `Zobrazených ${blogCountLabel(filtered.length)}`
      : `${blogState.activeCategory} · ${blogCountLabel(filtered.length)}`;
  }
}

async function loadBlog(){
  const empty=document.querySelector("#blog-empty");
  const summary=document.querySelector("#blog-filter-summary");

  const {data,error}=await blogDb.from("zahrada_posts")
    .select("slug,title,excerpt,category,cover_url,published_at,tags")
    .eq("status","published")
    .eq("content_type","blog")
    .order("published_at",{ascending:false})
    .limit(100);

  if(error||!data||!data.length){
    if(empty)empty.hidden=false;
    if(summary)summary.textContent="Blog sa momentálne nepodarilo načítať.";
    return;
  }

  blogState.posts=data;
  renderFilters();

  const requested=new URLSearchParams(window.location.search).get("kategoria");
  setCategory(requested||"Všetko",{updateUrl:false});
}

loadBlog();
