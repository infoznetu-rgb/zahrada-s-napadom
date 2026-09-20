const BLOG_URL="https://bkyappgttwjxakkwycub.supabase.co";
const BLOG_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const blogDb=window.supabase.createClient(BLOG_URL,BLOG_KEY);

function blogEsc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}

async function loadBlog(){
  const root=document.querySelector("#cms-blog-list");
  const empty=document.querySelector("#blog-empty");
  const {data,error}=await blogDb.from("zahrada_posts")
    .select("slug,title,excerpt,category,cover_url,published_at,tags")
    .eq("status","published")
    .eq("content_type","blog")
    .order("published_at",{ascending:false})
    .limit(100);
  if(error||!data||!data.length){
    if(empty)empty.hidden=false;
    return;
  }
  root.innerHTML=data.map(p=>`<article class="cms-post-card is-blog">
    <a class="cms-post-image" href="prispevok.html?slug=${encodeURIComponent(p.slug)}">
      ${p.cover_url?`<img src="${blogEsc(p.cover_url)}" alt="${blogEsc(p.title)}" loading="lazy">`:`<div class="cms-post-placeholder">BLOG · ${blogEsc(p.category||"Tip")}</div>`}
    </a>
    <div class="cms-post-body">
      <span class="tag">BLOG · ${blogEsc(p.category||"Tip")}</span>
      <h3><a href="prispevok.html?slug=${encodeURIComponent(p.slug)}">${blogEsc(p.title)}</a></h3>
      <p>${blogEsc(p.excerpt||"")}</p>
      <div class="cms-card-actions">
        <a class="project-link" href="prispevok.html?slug=${encodeURIComponent(p.slug)}">Čítať blog →</a>
      </div>
    </div>
  </article>`).join("");
}
loadBlog();