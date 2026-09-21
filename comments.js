(()=>{
  const BASE='https://bkyappgttwjxakkwycub.supabase.co';
  const KEY='sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4';
  const ENDPOINT=BASE+'/rest/v1/zahrada_comments';
  const NAME_KEY='zahrada-comment-name-v1';
  const LAST_KEY='zahrada-comment-last-v1';
  const COOLDOWN=15000;

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[ch]));

  function cleanTargetId(value){
    return String(value||'').trim().slice(0,700);
  }

  function canonicalImageId(img){
    const raw=img?.currentSrc||img?.getAttribute('src')||'';
    if(!raw)return '';
    try{return new URL(raw,location.href).href.slice(0,700)}catch(e){return raw.slice(0,700)}
  }

  function dateLabel(value){
    try{
      return new Intl.DateTimeFormat('sk-SK',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
    }catch(e){return ''}
  }

  async function fetchComments(type,id){
    const q='?target_type=eq.'+encodeURIComponent(type)
      +'&target_id=eq.'+encodeURIComponent(id)
      +'&status=eq.published'
      +'&select=id,author_name,body,created_at,parent_id,is_admin'
      +'&order=created_at.asc';
    const res=await fetch(ENDPOINT+q,{headers:{apikey:KEY},cache:'no-store'});
    if(!res.ok)throw new Error('comments_'+res.status);
    const data=await res.json();
    return Array.isArray(data)?data:[];
  }

  function commentListHtml(items){
    if(!items.length)return '<div class="comments-empty">Zatiaľ bez komentárov. Môžeš byť prvý.</div>';
    const roots=items.filter(item=>!item.parent_id&&!item.is_admin);
    const replies=items.filter(item=>item.parent_id);
    return roots.map(item=>{
      const children=replies.filter(reply=>reply.parent_id===item.id);
      return `<article class="comment-item">
        <div class="comment-meta"><strong>${esc(item.author_name)}</strong><time>${esc(dateLabel(item.created_at))}</time></div>
        <p>${esc(item.body).replace(/\n/g,'<br>')}</p>
        ${children.length?`<div class="comment-admin-replies">${children.map(reply=>`
          <div class="comment-admin-reply">
            <div class="comment-meta"><strong>Záhrada s nápadom <span class="comment-admin-badge">autor</span></strong><time>${esc(dateLabel(reply.created_at))}</time></div>
            <p>${esc(reply.body).replace(/\n/g,'<br>')}</p>
          </div>`).join('')}</div>`:''}
      </article>`;
    }).join('');
  }

  async function insertComment(target,payload){
    const now=Date.now();
    let last=0;
    try{last=Number(localStorage.getItem(LAST_KEY)||0)}catch(e){}
    if(now-last<COOLDOWN)throw new Error('cooldown');

    const res=await fetch(BASE+'/rest/v1/rpc/zahrada_submit_comment',{
      method:'POST',
      headers:{
        apikey:KEY,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        p_target_type:target.type,
        p_target_id:target.id,
        p_target_label:String(target.label||'').slice(0,240),
        p_page_path:(location.pathname+location.search).slice(0,500),
        p_author_name:payload.name.trim().slice(0,60),
        p_body:payload.body.trim().slice(0,1200),
        p_email:payload.email?.trim()||null
      })
    });
    if(!res.ok){
      const detail=await res.text().catch(()=> '');
      throw new Error('insert_'+res.status+'_'+detail.slice(0,120));
    }
    try{
      localStorage.setItem(LAST_KEY,String(now));
      localStorage.setItem(NAME_KEY,payload.name.trim().slice(0,60));
    }catch(e){}
    return res.json().catch(()=>null);
  }

  function formHtml(targetId){
    let saved='';
    try{saved=localStorage.getItem(NAME_KEY)||''}catch(e){}
    return `<form class="comment-form" data-comment-form="${esc(targetId)}">
      <div class="comment-form-grid">
        <label>Meno alebo prezývka
          <input name="author" maxlength="60" required autocomplete="name" value="${esc(saved)}" placeholder="Ako ťa máme uviesť?">
        </label>
        <label>E-mail <span class="comment-optional">(nepovinný)</span>
          <input name="email" type="email" maxlength="254" autocomplete="email" placeholder="Ak chceš, aby som sa ti vedel ozvať">
        </label>
        <label class="comment-body-label">Komentár
          <textarea name="body" rows="3" minlength="2" maxlength="1200" required placeholder="Čo sa ti páči? Čo by si spravil inak?"></textarea>
        </label>
      </div>
      <label class="comment-hp" aria-hidden="true">Web<input name="website" tabindex="-1" autocomplete="off"></label>
      <div class="comment-form-actions">
        <small>E-mail sa nezverejňuje a nie je povinný. Odpoveď autora sa zobrazí priamo pod komentárom.</small>
        <button type="submit">Pridať komentár</button>
      </div>
      <p class="comment-form-status" role="status"></p>
    </form>`;
  }

  function wireForm(root,target,refresh){
    const form=root.querySelector('.comment-form');
    if(!form||form.dataset.ready==='1')return;
    form.dataset.ready='1';
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const status=form.querySelector('.comment-form-status');
      const button=form.querySelector('button[type="submit"]');
      const name=form.elements.author.value.trim();
      const email=form.elements.email?.value.trim()||'';
      const body=form.elements.body.value.trim();
      if(form.elements.website.value)return;
      if(name.length<1||body.length<2)return;
      button.disabled=true;
      status.textContent='Odosielam…';
      try{
        await insertComment(target,{name,email,body});
        form.elements.body.value='';
        status.textContent='Komentár bol pridaný.';
        await refresh();
      }catch(error){
        status.textContent=error.message==='cooldown'
          ? 'Skús ďalší komentár o pár sekúnd.'
          : 'Komentár sa nepodarilo odoslať. Skús to znova.';
      }finally{
        button.disabled=false;
      }
    });
  }

  async function renderThread(root,target){
    const list=root.querySelector('[data-comment-list]');
    const count=root.querySelector('[data-comment-count]');
    if(!list)return;
    list.innerHTML='<div class="comments-loading">Načítavam komentáre…</div>';
    try{
      const items=await fetchComments(target.type,target.id);
      list.innerHTML=commentListHtml(items);
      if(count)count.textContent=String(items.filter(item=>!item.parent_id&&!item.is_admin).length);
    }catch(e){
      list.innerHTML='<div class="comments-empty">Komentáre sa momentálne nepodarilo načítať.</div>';
    }
  }

  function installArticleComments(detail={}){
    const body=document.body;
    if(!body.matches('.article-page'))return;
    const slug=cleanTargetId(detail.slug||body.dataset.slug);
    if(!slug)return;
    const article=document.querySelector('.post-page, main article');
    if(!article||article.querySelector('.article-comments'))return;
    const title=detail.title||document.querySelector('#post-title,h1')?.textContent?.trim()||'Článok';
    const section=document.createElement('section');
    section.className='article-comments';
    section.setAttribute('aria-labelledby','article-comments-title');
    section.innerHTML=`
      <div class="comments-head">
        <div><span class="kicker">DISKUSIA</span><h2 id="article-comments-title">Čo si o tom myslíš?</h2></div>
        <span class="comments-count"><b data-comment-count>0</b> komentárov</span>
      </div>
      <p class="comments-intro">Napíš, čo sa ti páči, čo by si upravil alebo akú máš vlastnú skúsenosť.</p>
      <div class="comments-list" data-comment-list></div>
      ${formHtml(slug)}`;
    const contact=article.querySelector('.project-contact-box');
    if(contact)article.insertBefore(section,contact); else article.appendChild(section);
    const target={type:'post',id:slug,label:title};
    const refresh=()=>renderThread(section,target);
    wireForm(section,target,refresh);
    refresh();
  }

  function ensurePhotoModal(){
    let modal=document.querySelector('#photo-comments-modal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='photo-comments-modal';
    modal.className='photo-comments-modal';
    modal.hidden=true;
    modal.innerHTML=`
      <button class="photo-comments-backdrop" type="button" data-photo-comments-close aria-label="Zavrieť komentáre"></button>
      <section class="photo-comments-panel" role="dialog" aria-modal="true" aria-labelledby="photo-comments-title">
        <div class="comments-head">
          <div><span class="kicker">FOTOGRAFIA</span><h2 id="photo-comments-title">Komentáre k fotografii</h2></div>
          <button class="photo-comments-close" type="button" data-photo-comments-close aria-label="Zavrieť">×</button>
        </div>
        <div class="photo-comments-preview" data-photo-preview></div>
        <div class="comments-list" data-comment-list></div>
        <div data-photo-comment-form></div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-photo-comments-close]').forEach(btn=>btn.addEventListener('click',closePhotoComments));
    modal.addEventListener('keydown',event=>{if(event.key==='Escape')closePhotoComments()});
    return modal;
  }

  function closePhotoComments(){
    const modal=document.querySelector('#photo-comments-modal');
    if(!modal)return;
    modal.hidden=true;
    document.body.classList.remove('photo-comments-open');
  }

  async function openPhotoComments(figure){
    const img=figure.querySelector('img');
    if(!img)return;
    const id=cleanTargetId(figure.dataset.commentPhotoId||canonicalImageId(img));
    if(!id)return;
    const label=(figure.querySelector('figcaption strong')?.textContent
      ||figure.querySelector('figcaption')?.textContent
      ||img.alt||'Fotografia').trim().slice(0,240);
    const target={type:'photo',id,label};
    const modal=ensurePhotoModal();
    modal.querySelector('[data-photo-preview]').innerHTML=`<img src="${esc(img.currentSrc||img.src)}" alt="${esc(img.alt||'')}" loading="lazy"><p>${esc(label)}</p>`;
    const formBox=modal.querySelector('[data-photo-comment-form]');
    formBox.innerHTML=formHtml(id);
    const refresh=()=>renderThread(modal,target);
    wireForm(modal,target,refresh);
    modal.hidden=false;
    document.body.classList.add('photo-comments-open');
    await refresh();
  }

  function decoratePhoto(figure){
    if(!figure||figure.dataset.commentsReady==='1')return;
    const img=figure.querySelector('img');
    if(!img)return;
    const id=figure.dataset.commentPhotoId||canonicalImageId(img);
    if(!id)return;
    figure.dataset.commentPhotoId=id;
    figure.dataset.commentsReady='1';
    const button=document.createElement('button');
    button.type='button';
    button.className='photo-comment-button';
    button.innerHTML='<span aria-hidden="true">💬</span><b>Komentovať</b>';
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openPhotoComments(figure)});
    figure.appendChild(button);
  }

  function decoratePhotos(root=document){
    root.querySelectorAll?.('.idea-gallery-card').forEach(decoratePhoto);
  }

  const observer=new MutationObserver(records=>{
    records.forEach(record=>record.addedNodes.forEach(node=>{
      if(node.nodeType!==1)return;
      if(node.matches?.('.idea-gallery-card'))decoratePhoto(node);
      decoratePhotos(node);
    }));
  });

  function init(){
    installArticleComments();
    decoratePhotos();
    observer.observe(document.body,{childList:true,subtree:true});
  }

  window.addEventListener('zahrada:article-loaded',event=>{
    installArticleComments(event.detail||{});
    decoratePhotos();
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();