
function recipeMinutes(value){
  const n=Number(String(value||"").match(/\d+/)?.[0]||0);
  return n>0?"PT"+n+"M":null;
}
function parseRecipeText(content){
  const labels={portions:/^PORCIE\s*:\s*(.*)$/i,prep:/^PRÍPRAVA\s*:\s*(.*)$/i,cook:/^VARENIE\s*:\s*(.*)$/i,ingredients:/^SUROVINY\s*:\s*(.*)$/i,steps:/^POSTUP\s*:\s*(.*)$/i,tips:/^TIP\s*:\s*(.*)$/i};
  const lines=String(content||"").split(/\r?\n/);
  const starts=[];
  lines.forEach((line,index)=>{for(const [key,re] of Object.entries(labels)){const match=line.match(re);if(match){starts.push({key,index,value:(match[1]||"").trim()});break}}});
  const marker=starts.length?starts[0].index:lines.length;
  const out={intro:lines.slice(0,marker).join(" ").trim(),portions:"",prep:"",cook:"",ingredients:[],steps:[],tips:[]};
  for(let i=0;i<starts.length;i++){
    const section=starts[i],next=starts[i+1]?.index??lines.length;
    const values=[section.value,...lines.slice(section.index+1,next)].map(x=>x.trim()).filter(Boolean).map(x=>x.replace(/^[-•]\s*/,"").replace(/^\d+[.)]\s*/,""));
    if(section.key==="portions")out.portions=values.join(" ");
    else if(section.key==="prep")out.prep=values.join(" ");
    else if(section.key==="cook")out.cook=values.join(" ");
    else if(section.key==="ingredients")out.ingredients=values;
    else if(section.key==="steps")out.steps=values;
    else if(section.key==="tips")out.tips=values;
  }
  return out;
}
function renderRecipeContent(body,data){
  const recipe=parseRecipeText(data.content);
  if(recipe.intro){const p=document.createElement("p");p.textContent=recipe.intro;body.appendChild(p)}
  const card=document.createElement("section");card.className="recipe-card";card.setAttribute("aria-label","Recept");
  const heading=document.createElement("h2");heading.textContent="Recept";card.appendChild(heading);
  const facts=document.createElement("div");facts.className="recipe-facts";
  [[recipe.portions?"Porcie: "+recipe.portions:""],[recipe.prep?"Príprava: "+recipe.prep:""],[recipe.cook?"Varenie: "+recipe.cook:""]].flat().filter(Boolean).forEach(text=>{const span=document.createElement("span");span.textContent=text;facts.appendChild(span)});
  if(facts.childNodes.length)card.appendChild(facts);
  if(recipe.ingredients.length){
    const ih=document.createElement("h3");ih.textContent="Suroviny";card.appendChild(ih);
    const ul=document.createElement("ul");ul.className="recipe-ingredients";
    recipe.ingredients.forEach(item=>{const li=document.createElement("li"),label=document.createElement("label"),input=document.createElement("input"),span=document.createElement("span");input.type="checkbox";span.textContent=item;label.append(input,span);li.appendChild(label);ul.appendChild(li)});
    card.appendChild(ul);
  }
  if(recipe.steps.length){
    const sh=document.createElement("h3");sh.textContent="Postup";card.appendChild(sh);
    const ol=document.createElement("ol");ol.className="recipe-steps";
    recipe.steps.forEach(item=>{const li=document.createElement("li");li.textContent=item;ol.appendChild(li)});
    card.appendChild(ol);
  }
  const print=document.createElement("button");print.type="button";print.className="recipe-print";print.textContent="Vytlačiť recept";print.addEventListener("click",()=>window.print());card.appendChild(print);
  body.appendChild(card);
  recipe.tips.forEach(item=>{const p=document.createElement("p");p.textContent="Tip: "+item;body.appendChild(p)});
  if(data.cover_url&&recipe.ingredients.length&&recipe.steps.length){
    const jsonLd={"@context":"https://schema.org","@type":"Recipe","name":data.title,"image":[data.cover_url],"description":data.excerpt||"","recipeIngredient":recipe.ingredients,"recipeInstructions":recipe.steps.map(text=>({"@type":"HowToStep","text":text}))};
    const prep=recipeMinutes(recipe.prep),cook=recipeMinutes(recipe.cook);
    if(prep)jsonLd.prepTime=prep;if(cook)jsonLd.cookTime=cook;
    if(prep&&cook){const total=Number(prep.match(/\d+/)[0])+Number(cook.match(/\d+/)[0]);jsonLd.totalTime="PT"+total+"M"}
    if(recipe.portions)jsonLd.recipeYield=recipe.portions;
    if(data.published_at)jsonLd.datePublished=String(data.published_at).slice(0,10);
    const script=document.createElement("script");script.type="application/ld+json";script.textContent=JSON.stringify(jsonLd);script.id="recipe-jsonld";document.head.appendChild(script);
  }
}
const POST_CMS_URL="https://bkyappgttwjxakkwycub.supabase.co";
const POST_CMS_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const postDb=window.supabase.createClient(POST_CMS_URL,POST_CMS_KEY);

async function loadPost(){
  const slug=new URLSearchParams(location.search).get("slug");
  if(!slug){showError("Príspevok sa nenašiel.");return}
  const {data,error}=await postDb.from("zahrada_posts").select("*").eq("slug",slug).eq("status","published").maybeSingle();
  if(error||!data){showError("Príspevok sa nenašiel alebo ešte nie je zverejnený.");return}
  const isBlog=data.content_type==="blog";
  document.body.classList.toggle("blog-article",isBlog);
  document.title=data.title+" | Záhrada s nápadom";
  const description=data.excerpt||String(data.content||"").split(/\r?\n/)[0]||"Praktický recept zo záhrady.";
  const descriptionMeta=document.querySelector('meta[name="description"]');
  if(descriptionMeta)descriptionMeta.content=description;
  const robotsMeta=document.querySelector('meta[name="robots"]');
  if(robotsMeta)robotsMeta.content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1";
  const canonicalUrl=location.origin+location.pathname+"?slug="+encodeURIComponent(data.slug);
  let canonical=document.querySelector('link[rel="canonical"]');
  if(!canonical){canonical=document.createElement("link");canonical.rel="canonical";document.head.appendChild(canonical)}
  canonical.href=canonicalUrl;
  [["og:type","article"],["og:title",data.title],["og:description",description],["og:url",canonicalUrl],["og:image",data.cover_url||""]].forEach(([property,content])=>{
    let meta=document.querySelector('meta[property="'+property+'"]');
    if(!meta){meta=document.createElement("meta");meta.setAttribute("property",property);document.head.appendChild(meta)}
    meta.content=content;
  });
  document.querySelector("#post-category").textContent=(isBlog?"BLOG · ":"")+(data.category||"Nápad");
  document.querySelectorAll(".back-link").forEach(link=>{
    const isRecipe=isBlog&&data.category==="Recepty zo záhrady";
    link.href=isRecipe?"/recepty.html":isBlog?"blog.html":"index.html#projekty";
    link.textContent=isRecipe?"← Späť na recepty":isBlog?"← Späť na blog":"← Späť na nápady";
  });
  document.querySelector("#post-title").textContent=data.title;
  document.querySelector("#post-excerpt").textContent=data.excerpt||"";
  const coverWrap=document.querySelector("#post-cover-wrap");
  const cover=document.querySelector("#post-cover");
  if(data.cover_url){cover.src=data.cover_url;cover.alt=data.title}else{coverWrap.hidden=true}
  const body=document.querySelector("#post-body");
  body.innerHTML="";
  if(isBlog&&data.category==="Recepty zo záhrady")renderRecipeContent(body,data);
  else String(data.content||"").split(/\n\s*\n/).filter(Boolean).forEach(text=>{
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

  const videosWrap=document.querySelector("#post-videos");
  if(videosWrap){
    const videos=Array.isArray(data.videos)?data.videos:[];
    videosWrap.innerHTML="";
    videos.forEach((url,i)=>{
      const figure=document.createElement("figure");
      figure.className="post-video-item";
      const video=document.createElement("video");
      video.src=url;video.controls=true;video.preload="metadata";video.playsInline=true;
      video.setAttribute("aria-label",data.title+" – video "+(i+1));
      figure.appendChild(video);videosWrap.appendChild(figure);
    });
    videosWrap.hidden=!videos.length;
  }

  document.querySelector("#post-loading").hidden=true;
  document.querySelector("#post-content").hidden=false;

  window.dispatchEvent(new CustomEvent("zahrada:article-loaded",{detail:{
    slug:data.slug,
    title:data.title,
    category:data.category||"Nápad",
    excerpt:data.excerpt||"",
    cover_url:data.cover_url||"",
    content_type:isBlog?"blog":"project",
    url:"prispevok.html?slug="+encodeURIComponent(data.slug)
  }}));
}
function showError(text){
  const loading=document.querySelector("#post-loading");
  loading.querySelector("h1").textContent=text;
}
loadPost();