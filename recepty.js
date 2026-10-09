const RECIPE_URL="https://bkyappgttwjxakkwycub.supabase.co";
const RECIPE_KEY="sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4";
const recipeDb=window.supabase.createClient(RECIPE_URL,RECIPE_KEY);
const recipeRoot=document.querySelector("#recipe-list");
const recipeFilters=recipeRoot?(()=>{const el=document.createElement("div");el.id="recipe-category-filters";el.className="blog-category-filters";el.setAttribute("role","group");el.setAttribute("aria-label","Kategórie receptov");recipeRoot.parentNode.insertBefore(el,recipeRoot);return el})():null;
const recipeEmpty=document.querySelector("#recipe-empty");
const recipeSearch=document.querySelector("#recipe-search");
const recipeClear=document.querySelector("#recipe-search-clear");
const recipeCategories=["Hlavné jedlá","Polievky","Prílohy","Šaláty","Raňajky","Placky a slané koláče","Koláče a dezerty","Omáčky, pesta a nátierky","Zaváranie a čatní"];
let recipes=[];
let uniqueRecipeImages={};
function recipeCover(post){return uniqueRecipeImages[String(post.slug||"").trim()]||post.cover_url||""}

let activeRecipeCategory="Všetko";

function recipeEsc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function recipeNorm(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function recipeHref(slug){return "/recepty/"+encodeURIComponent(String(slug||"").trim())+"/"}
function recipeCategory(post){
  const tags=(Array.isArray(post.tags)?post.tags:[]).map(recipeNorm);
  const title=recipeNorm(post.title);
  const has=(...values)=>values.some(value=>tags.includes(recipeNorm(value)));
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
function recipeCard(post){
  const category=recipeCategory(post);
  const cover=recipeCover(post);
  return '<article class="cms-post-card is-blog recipe-tile" data-recipe-category="'+recipeEsc(category)+'"><a class="cms-post-image" href="'+recipeHref(post.slug)+'">'+(cover?'<img src="'+recipeEsc(cover)+'" alt="'+recipeEsc(post.title)+'" loading="lazy" decoding="async">':'<div class="recipe-tile-placeholder" aria-hidden="true">🍅</div>')+'</a><div class="cms-post-body"><span class="tag">RECEPT · '+recipeEsc(category)+'</span><h2><a href="'+recipeHref(post.slug)+'">'+recipeEsc(post.title)+'</a></h2><p>'+recipeEsc(post.excerpt||"")+'</p><div class="cms-card-actions"><a class="project-link" href="'+recipeHref(post.slug)+'">Otvoriť recept →</a></div></div></article>';
}
function renderRecipeFilters(){
  if(!recipeFilters)return;
  const counts=new Map(recipeCategories.map(category=>[category,0]));
  recipes.forEach(post=>counts.set(recipeCategory(post),(counts.get(recipeCategory(post))||0)+1));
  const options=[["Všetko",recipes.length],...recipeCategories.filter(category=>counts.get(category)>0).map(category=>[category,counts.get(category)])];
  recipeFilters.innerHTML=options.map(([category,count])=>'<button type="button" class="blog-filter-chip'+(category===activeRecipeCategory?' is-active':'')+'" data-recipe-filter="'+recipeEsc(category)+'" aria-pressed="'+String(category===activeRecipeCategory)+'"><span>'+recipeEsc(category)+'</span><b>'+count+'</b></button>').join("");
}
function renderRecipes(){
  const q=recipeNorm(recipeSearch?.value||"");
  let filtered=activeRecipeCategory==="Všetko"?recipes:recipes.filter(post=>recipeCategory(post)===activeRecipeCategory);
  if(q)filtered=filtered.filter(p=>recipeNorm([p.title,p.excerpt,p.content,Array.isArray(p.tags)?p.tags.join(" "):""].join(" ")).includes(q));
  if(recipeRoot)recipeRoot.innerHTML=filtered.map(recipeCard).join("");
  if(recipeEmpty)recipeEmpty.hidden=filtered.length>0;
  const title=document.querySelector("#recipe-empty-title");
  const copy=document.querySelector("#recipe-empty-text");
  if(!filtered.length&&recipes.length&&title&&copy){title.textContent="V tejto kategórii sa nenašli recepty.";copy.textContent="Skús inú kategóriu alebo surovinu."}
  if(document.querySelector("#recipe-summary")){const prefix=activeRecipeCategory==="Všetko"?"Recepty":"Recepty · "+activeRecipeCategory;document.querySelector("#recipe-summary").textContent=recipes.length?(prefix+" · zobrazených "+filtered.length+" z "+recipes.length):"Recepty pripravujeme."}
}
recipeFilters?.addEventListener("click",event=>{const button=event.target.closest("[data-recipe-filter]");if(!button)return;activeRecipeCategory=button.dataset.recipeFilter;renderRecipeFilters();renderRecipes()});
recipeSearch?.addEventListener("input",()=>{if(recipeClear)recipeClear.hidden=!recipeSearch.value;renderRecipes()});
recipeClear?.addEventListener("click",()=>{recipeSearch.value="";recipeClear.hidden=true;renderRecipes();recipeSearch.focus()});
async function loadRecipes(){
  const pageSize=100;
  const allRecipes=[];
  for(let from=0;;from+=pageSize){
    const {data,error}=await recipeDb.from("zahrada_posts")
      .select("slug,title,excerpt,content,category,cover_url,published_at,tags")
      .eq("status","published")
      .eq("content_type","blog")
      .eq("category","Recepty zo záhrady")
      .order("published_at",{ascending:false})
      .order("slug",{ascending:true})
      .range(from,from+pageSize-1);
    if(error){if(recipeEmpty)recipeEmpty.hidden=false;const title=document.querySelector("#recipe-empty-title"),copy=document.querySelector("#recipe-empty-text");if(title)title.textContent="Recepty sa nepodarilo načítať.";if(copy)copy.textContent="Skús stránku obnoviť o chvíľu.";return}
    const batch=Array.isArray(data)?data:[];
    allRecipes.push(...batch);
    if(batch.length<pageSize)break;
  }
  recipes=allRecipes;
  try {
    const response=await fetch("/data/recipe-unique-image-map.json",{cache:"no-cache"});
    if(response.ok){const map=await response.json();if(map&&typeof map==="object"&&!Array.isArray(map))uniqueRecipeImages=map}
  } catch(error){console.warn("Recipe image map unavailable; using original covers.",error)}
  renderRecipeFilters();
  renderRecipes();
}
loadRecipes();
