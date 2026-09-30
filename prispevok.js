
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
  loadRelatedRecipes(data);
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
function detailRecipeNorm(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function detailRecipeCategory(post){
  const tags=(Array.isArray(post.tags)?post.tags:[]).map(detailRecipeNorm);
  const title=detailRecipeNorm(post.title);
  const has=(...values)=>values.some(value=>tags.includes(detailRecipeNorm(value)));
  if(has("breakfast","raňajky")||title.includes("ranajk"))return "Raňajky";
  if(has("soup","polievka","polievky")||title.includes("polievk"))return "Polievky";
  if(has("salad","šalát","šaláty")||title.includes("salat"))return "Šaláty";
  if(has("pickle","chutney","zaváranie","čatní")||title.includes("catni")||title.includes("naleve"))return "Zaváranie a čatní";
  if(has("fritter","quiche","placky","slaný koláč")||title.includes("plack")||title.includes("slany kolac"))return "Placky a slané koláče";
  if(has("cake","muffin","fruit","dezert","dezerty","koláč")||title.includes("kolac")||title.includes("muffin")||title.includes("dezert")||title.includes("crumble")||title.includes("panna cotta")||title.includes("fool"))return "Koláče a dezerty";
  if(has("pesto","sauce","omáčka","nátierka")||title.includes("pesto")||title.includes("natierk")||title.includes("omack"))return "Omáčky, pesta a nátierky";
  if(has("roast","príloha","prílohy")||title.includes("pecena zelenina")||title.includes("dusen"))return "Prílohy";
  return "Hlavné jedlá";
}
const recipeIngredientStopWords=new Set("a aj alebo ako bez do dva dve jeden jedna jednu je jemne jemná jemné k kusy kusov l lyžica lyžice lyžička lyžičky malé malý na nadol niekoľko nový nové o od olivový olej oleja korenie podľa pohár pol polievková prášok pre s so soľ soľou strúčik strúčiky teplá teplej toho trochu veľká veľké veľký vody voda vňať z za čerstvá čerstvé čerstvý čierne mleté mletá mletý podľa chuti".split(" "));
const recipeGenericTags=new Set(["recept zo záhrady","breakfast","soup","salad","pickle","chutney","fritter","quiche","cake","muffin","fruit","pesto","sauce","roast","priloha","raňajky","polievka","polievky","šalát","šaláty","zaváranie","čatní","placky","slaný koláč","dezert","dezerty","koláč","omáčka","nátierka","príloha","prílohy","hlavné jedlo"]);
function recipeIngredientTokens(post){
  const ingredients=parseRecipeText(post.content).ingredients;
  const tokens=new Set();
  ingredients.forEach(item=>detailRecipeNorm(item).replace(/\d+(?:[.,]\d+)?/g," ").replace(/\b(?:kg|g|ml|cl|dl|l|ks|bal|lyzic|lyzick|hrnce[km]|polievkov|kavov)\w*\b/g," ").split(/[^a-z]+/).filter(word=>word.length>2&&!recipeIngredientStopWords.has(word)).forEach(word=>tokens.add(word)));
  return tokens;
}
async function loadRelatedRecipes(current){
  const section=document.querySelector("#related-recipes");
  const grid=document.querySelector("#related-recipes-grid");
  if(!section||!grid)return;
  try{
    const {data,error}=await postDb.from("zahrada_posts").select("slug,title,excerpt,content,cover_url,tags,published_at").eq("status","published").eq("content_type","blog").eq("category","Recepty zo záhrady").order("published_at",{ascending:false}).limit(300);
    if(error||!Array.isArray(data))return;
    const currentIngredients=recipeIngredientTokens(current);
    const currentTags=new Set((Array.isArray(current.tags)?current.tags:[]).map(detailRecipeNorm));
    const category=detailRecipeCategory(current);
    const ranked=data.filter(post=>post.slug&&post.slug!==current.slug).map(post=>{
      const candidateIngredients=recipeIngredientTokens(post);
      const sharedIngredients=[...currentIngredients].filter(word=>candidateIngredients.has(word));
      const sharedTags=(Array.isArray(post.tags)?post.tags:[]).map(detailRecipeNorm).filter(tag=>currentTags.has(tag)&&!recipeGenericTags.has(tag));
      const sameCategory=detailRecipeCategory(post)===category;
      return {post,score:sharedIngredients.length*4+sharedTags.length*2+(sameCategory?3:0),sameCategory,sharedIngredients:sharedIngredients.length};
    }).filter(item=>item.score>0);
    const sameCategory=ranked.filter(item=>item.sameCategory);
    const matches=(sameCategory.length>=3?sameCategory:ranked).sort((a,b)=>b.score-a.score||Number(b.sameCategory)-Number(a.sameCategory)||b.sharedIngredients-a.sharedIngredients||String(b.post.published_at||"").localeCompare(String(a.post.published_at||""))).slice(0,3);
    if(!matches.length)return;
    grid.replaceChildren();
    matches.forEach(({post})=>{
      const card=document.createElement("article");card.className="related-recipe-card";
      const link=document.createElement("a");link.className="related-recipe-image";link.href="/prispevok.html?slug="+encodeURIComponent(post.slug);link.setAttribute("aria-label","Otvoriť recept: "+post.title);
      if(post.cover_url){const img=document.createElement("img");img.src=post.cover_url;img.alt=post.title;img.loading="lazy";img.decoding="async";link.appendChild(img)}
      const content=document.createElement("div");content.className="related-recipe-content";
      const label=document.createElement("span");label.className="related-recipe-label";label.textContent=detailRecipeCategory(post);
      const title=document.createElement("h3"),titleLink=document.createElement("a");titleLink.href=link.href;titleLink.textContent=post.title;title.appendChild(titleLink);
      content.append(label,title);
      if(post.excerpt){const excerpt=document.createElement("p");excerpt.textContent=post.excerpt;content.appendChild(excerpt)}
      card.append(link,content);grid.appendChild(card);
    });
    section.hidden=false;
  }catch(error){console.warn("Podobné recepty sa nepodarilo načítať.",error)}
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
