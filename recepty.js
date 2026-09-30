const RECIPE_URL="https://bkyappgttwjxakkwycub.supabase.co";
const RECIPE_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const recipeDb=window.supabase.createClient(RECIPE_URL,RECIPE_KEY);
const recipeRoot=document.querySelector("#recipe-list");
const recipeEmpty=document.querySelector("#recipe-empty");
const recipeSearch=document.querySelector("#recipe-search");
const recipeClear=document.querySelector("#recipe-search-clear");
let recipes=[];

function recipeEsc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function recipeNorm(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function recipeHref(slug){return "/blog/"+encodeURIComponent(String(slug||"").trim())+"/"}
function recipeCard(post){
  const tags=Array.isArray(post.tags)?post.tags:[];
  const hay=recipeEsc(tags.slice(0,4).join(" · "));
  return '<article class="cms-post-card is-blog recipe-tile"><a class="cms-post-image" href="'+recipeHref(post.slug)+'">'+(post.cover_url?'<img src="'+recipeEsc(post.cover_url)+'" alt="'+recipeEsc(post.title)+'" loading="lazy" decoding="async">':'<div class="recipe-tile-placeholder" aria-hidden="true">🍅</div>')+'</a><div class="cms-post-body"><span class="tag">RECEPT · '+hay+'</span><h2><a href="'+recipeHref(post.slug)+'">'+recipeEsc(post.title)+'</a></h2><p>'+recipeEsc(post.excerpt||"")+'</p><div class="cms-card-actions"><a class="project-link" href="'+recipeHref(post.slug)+'">Otvoriť recept →</a></div></div></article>';
}
function renderRecipes(){
  const q=recipeNorm(recipeSearch?.value||"");
  const filtered=q?recipes.filter(p=>recipeNorm([p.title,p.excerpt,p.content,Array.isArray(p.tags)?p.tags.join(" "):""].join(" ")).includes(q)):recipes;
  if(recipeRoot)recipeRoot.innerHTML=filtered.map(recipeCard).join("");
  if(recipeEmpty)recipeEmpty.hidden=filtered.length>0;
  const title=document.querySelector("#recipe-empty-title");
  const copy=document.querySelector("#recipe-empty-text");
  if(!filtered.length&&recipes.length&&title&&copy){title.textContent="Takú kombináciu som zatiaľ nenašiel.";copy.textContent="Skús inú surovinu alebo názov receptu."}
  if(document.querySelector("#recipe-summary"))document.querySelector("#recipe-summary").textContent=recipes.length?("Receptov: "+filtered.length):"Recepty pripravujeme.";
}
recipeSearch?.addEventListener("input",()=>{if(recipeClear)recipeClear.hidden=!recipeSearch.value;renderRecipes()});
recipeClear?.addEventListener("click",()=>{recipeSearch.value="";recipeClear.hidden=true;renderRecipes();recipeSearch.focus()});
async function loadRecipes(){
  const {data,error}=await recipeDb.from("zahrada_posts").select("slug,title,excerpt,content,category,cover_url,published_at,tags").eq("status","published").eq("content_type","blog").eq("category","Recepty zo záhrady").order("published_at",{ascending:false}).limit(100);
  if(error){if(recipeEmpty)recipeEmpty.hidden=false;const title=document.querySelector("#recipe-empty-title"),copy=document.querySelector("#recipe-empty-text");if(title)title.textContent="Recepty sa nepodarilo načítať.";if(copy)copy.textContent="Skús stránku obnoviť o chvíľu.";return}
  recipes=Array.isArray(data)?data:[];
  renderRecipes();
}
loadRecipes();