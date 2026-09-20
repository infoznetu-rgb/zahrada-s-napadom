const POST_CMS_URL="https://bkyappgttwjxakkwycub.supabase.co";
const POST_CMS_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const postDb=window.supabase.createClient(POST_CMS_URL,POST_CMS_KEY);

async function loadPost(){
  const slug=new URLSearchParams(location.search).get("slug");
  if(!slug){showError("Príspevok sa nenašiel.");return}
  const {data,error}=await postDb.from("zahrada_posts").select("*").eq("slug",slug).eq("status","published").maybeSingle();
  if(error||!data){showError("Príspevok sa nenašiel alebo ešte nie je zverejnený.");return}
  document.title=data.title+" | Záhrada s nápadom";
  document.querySelector("#post-category").textContent=data.category||"Nápad";
  document.querySelector("#post-title").textContent=data.title;
  document.querySelector("#post-excerpt").textContent=data.excerpt||"";
  const coverWrap=document.querySelector("#post-cover-wrap");
  const cover=document.querySelector("#post-cover");
  if(data.cover_url){cover.src=data.cover_url;cover.alt=data.title}else{coverWrap.hidden=true}
  const body=document.querySelector("#post-body");
  body.innerHTML="";
  String(data.content||"").split(/\n\s*\n/).filter(Boolean).forEach(text=>{
    const p=document.createElement("p");p.textContent=text.trim();body.appendChild(p);
  });
  const gallery=document.querySelector("#post-gallery");
  gallery.innerHTML="";
  const images=Array.isArray(data.gallery)?data.gallery:[];
  images.forEach((url,i)=>{
    const fig=document.createElement("figure");
    fig.className="dynamic-gallery-item";
    const img=document.createElement("img");
    img.src=url;img.alt=data.title+" – fotografia "+(i+1);img.loading="lazy";
    fig.appendChild(img);gallery.appendChild(fig);
  });
  if(!images.length)gallery.hidden=true;
  document.querySelector("#post-loading").hidden=true;
  document.querySelector("#post-content").hidden=false;
}
function showError(text){
  const loading=document.querySelector("#post-loading");
  loading.querySelector("h1").textContent=text;
}
loadPost();