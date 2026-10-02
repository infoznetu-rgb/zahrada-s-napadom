/* Static articles share the existing, device-local saved/history format. */
(()=>{
  const article=document.querySelector('article.post-page, article, .article-page main');
  const heading=article?.querySelector('h1');
  if(!article||!heading||document.querySelector('#post-loading'))return;
  const canonical=document.querySelector('link[rel="canonical"]')?.href||location.href;
  const url=new URL(canonical,location.href);
  if(url.hostname!=='zahradasnapadom.sk')return;
  const slug=url.pathname.replace(/\/$/,'').split('/').pop().replace(/^clanok-/,'').replace(/\.html$/,'');
  if(!slug)return;
  const item={slug,title:heading.textContent.trim(),category:'Článok',excerpt:document.querySelector('meta[name="description"]')?.content||'',cover_url:document.querySelector('meta[property="og:image"]')?.content||'',content_type:'blog',url:url.pathname+url.search};
  const read=key=>{try{const list=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(list)?list:[]}catch{return []}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));window.dispatchEvent(new CustomEvent('zahrada:library-change'));return true}catch{return false}};
  write('zahrada-history-v1',[{...item,read_at:Date.now()},...read('zahrada-history-v1').filter(x=>x.slug!==slug)].slice(0,30));
  if(article.querySelector('[data-static-library]'))return;
  const bar=document.createElement('nav');bar.dataset.staticLibrary='';bar.setAttribute('aria-label','Čítanie a aplikácia');
  bar.className='static-article-library';
  const back=document.createElement('a');back.href='/moja-zahrada.html#app-history';back.textContent='← Späť do aplikácie';
  const save=document.createElement('button');save.type='button';
  const status=document.createElement('span');status.setAttribute('role','status');
  const update=()=>{const saved=read('zahrada-saved-v1').some(x=>x.slug===slug);save.textContent=saved?'Uložené – zrušiť uloženie':'Uložiť na neskôr';save.setAttribute('aria-pressed',String(saved));};
  save.addEventListener('click',()=>{
    const items=read('zahrada-saved-v1'),saved=items.some(x=>x.slug===slug);
    const next=items.filter(x=>x.slug!==slug);if(!saved)next.unshift({...item,saved_at:Date.now()});
    const ok=write('zahrada-saved-v1',next.slice(0,100));update();
    status.textContent=ok?(saved?'Uloženie bolo zrušené.':'Článok je uložený v tomto zariadení.'):'Prehliadač neumožnil uloženie.';
  });
  bar.append(back,save,status);heading.after(bar);update();
  const style=document.createElement('style');
  style.textContent='.static-article-library{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:20px 0;max-width:100%}.static-article-library a,.static-article-library button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;box-sizing:border-box;border:1px solid #426e48;border-radius:14px;background:#fffdf8;color:#285638;font:inherit;font-weight:750;text-decoration:none;cursor:pointer}.static-article-library button[aria-pressed="true"]{background:#285638;color:white}.static-article-library [role="status"]{flex-basis:100%;font-size:.85rem}.static-article-library a:focus-visible,.static-article-library button:focus-visible{outline:3px solid #93c887;outline-offset:3px}';
  style.textContent+='@media print{.static-article-library{display:none!important}}';
  document.head.appendChild(style);
})();
