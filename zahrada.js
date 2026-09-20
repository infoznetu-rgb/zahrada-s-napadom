const menu=document.querySelector('.menu');
const mobile=document.querySelector('#mobile-nav');
if(menu&&mobile){
  menu.addEventListener('click',()=>{
    const open=mobile.classList.toggle('is-open');
    menu.setAttribute('aria-expanded',String(open));
  });
  mobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    mobile.classList.remove('is-open');
    menu.setAttribute('aria-expanded','false');
  }));
}

const form=document.querySelector('#idea-form');
if(form){
  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    alert('Toto je zatiaľ iba prvý návrh. Formulár ešte nič neposiela. V ostrej verzii sa každý príspevok uloží ako čakajúci na tvoje schválenie.');
  });
}

const SHARE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="19" r="2.5"></circle><path d="M8.2 10.9 15.8 6.1M8.2 13.1l7.6 4.8"></path></svg>';

function shareData(trigger){
  const rawUrl=trigger?.dataset.shareUrl||location.href;
  const url=new URL(rawUrl,location.href).href;
  const title=trigger?.dataset.shareTitle||
    document.querySelector('#post-title')?.textContent?.trim()||
    document.title.replace(/\s*[|–-]\s*Záhrada s nápadom.*$/i,'').trim()||
    'Záhrada s nápadom';
  const text=document.querySelector('#post-excerpt')?.textContent?.trim()||
    'Pozri si tento nápad na Záhrade s nápadom.';
  return {url,title,text};
}

function openShareWindow(url){
  window.open(url,'share-window','width=720,height=640,noopener,noreferrer');
}

function ensureShareModal(){
  let modal=document.querySelector('#share-modal');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='share-modal';
  modal.className='share-modal';
  modal.hidden=true;
  modal.innerHTML=`
    <button class="share-backdrop" type="button" aria-label="Zavrieť zdieľanie" data-share-close></button>
    <section class="share-panel" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <div class="share-panel-head">
        <div><span class="kicker">ZDIEĽANIE</span><h2 id="share-title">Pošli nápad ďalej</h2></div>
        <button class="share-close" type="button" aria-label="Zavrieť" data-share-close>×</button>
      </div>
      <div class="share-options">
        <button type="button" class="share-option facebook" data-network="facebook"><span>f</span><b>Facebook</b></button>
        <button type="button" class="share-option whatsapp" data-network="whatsapp"><span>WA</span><b>WhatsApp</b></button>
        <button type="button" class="share-option xnet" data-network="x"><span>𝕏</span><b>X</b></button>
        <button type="button" class="share-option linkedin" data-network="linkedin"><span>in</span><b>LinkedIn</b></button>
        <button type="button" class="share-option email" data-network="email"><span>✉</span><b>E-mail</b></button>
        <button type="button" class="share-option copy" data-network="copy"><span>↗</span><b>Kopírovať</b></button>
      </div>
      <button type="button" class="native-share-btn" data-network="native">${SHARE_ICON}<span>Zdieľať cez aplikáciu</span></button>
      <p class="share-status" aria-live="polite"></p>
    </section>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('[data-share-close]').forEach(btn=>btn.addEventListener('click',closeShareModal));
  modal.addEventListener('keydown',e=>{if(e.key==='Escape')closeShareModal()});
  modal.querySelectorAll('[data-network]').forEach(btn=>btn.addEventListener('click',()=>handleNetworkShare(btn.dataset.network)));
  return modal;
}

let currentShare={url:location.href,title:document.title,text:''};

function openShareModal(trigger){
  currentShare=shareData(trigger);
  const modal=ensureShareModal();
  const status=modal.querySelector('.share-status');
  if(status)status.textContent='';
  const native=modal.querySelector('[data-network="native"]');
  if(native)native.hidden=!navigator.share;
  modal.hidden=false;
  document.body.classList.add('share-open');
  setTimeout(()=>modal.querySelector('.share-close')?.focus(),0);
}

function closeShareModal(){
  const modal=document.querySelector('#share-modal');
  if(!modal)return;
  modal.hidden=true;
  document.body.classList.remove('share-open');
}

async function handleNetworkShare(network){
  const {url,title,text}=currentShare;
  const eu=encodeURIComponent(url);
  const et=encodeURIComponent(title);
  const msg=encodeURIComponent(title+' — '+url);
  if(network==='facebook')return openShareWindow('https://www.facebook.com/sharer/sharer.php?u='+eu);
  if(network==='whatsapp')return openShareWindow('https://wa.me/?text='+msg);
  if(network==='x')return openShareWindow('https://twitter.com/intent/tweet?text='+et+'&url='+eu);
  if(network==='linkedin')return openShareWindow('https://www.linkedin.com/sharing/share-offsite/?url='+eu);
  if(network==='email'){location.href='mailto:?subject='+et+'&body='+encodeURIComponent(text+'\n\n'+url);return}
  if(network==='native'&&navigator.share){
    try{await navigator.share({title,text,url})}catch(e){}
    return;
  }
  if(network==='copy'){
    try{
      await navigator.clipboard.writeText(url);
      const status=document.querySelector('.share-status');
      if(status)status.textContent='Odkaz je skopírovaný.';
    }catch(e){
      prompt('Skopíruj odkaz:',url);
    }
  }
}

function addHeaderShare(){
  const top=document.querySelector('.site-header .top');
  if(!top||top.querySelector('.site-share-trigger'))return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='site-share-trigger';
  btn.setAttribute('aria-label','Zdieľať stránku');
  btn.title='Zdieľať stránku';
  btn.innerHTML=SHARE_ICON+'<span>Zdieľať</span>';
  btn.addEventListener('click',()=>openShareModal(btn));
  const menuBtn=top.querySelector('.menu');
  top.insertBefore(btn,menuBtn||null);
}

function addArticleShare(){
  const head=document.querySelector('.post-dynamic-head');
  if(!head||head.querySelector('.article-share-row'))return;
  const row=document.createElement('div');
  row.className='article-share-row';
  row.innerHTML=`
    <span>Zdieľaj článok:</span>
    <button type="button" class="mini-share facebook" data-network-direct="facebook" aria-label="Zdieľať na Facebooku">f</button>
    <button type="button" class="mini-share whatsapp" data-network-direct="whatsapp" aria-label="Zdieľať cez WhatsApp">WA</button>
    <button type="button" class="mini-share xnet" data-network-direct="x" aria-label="Zdieľať na X">𝕏</button>
    <button type="button" class="mini-share linkedin" data-network-direct="linkedin" aria-label="Zdieľať na LinkedIn">in</button>
    <button type="button" class="mini-share more" data-share-more aria-label="Ďalšie možnosti zdieľania">${SHARE_ICON}</button>`;
  head.appendChild(row);
  row.querySelectorAll('[data-network-direct]').forEach(btn=>btn.addEventListener('click',()=>{
    currentShare=shareData(btn);
    handleNetworkShare(btn.dataset.networkDirect);
  }));
  row.querySelector('[data-share-more]').addEventListener('click',e=>openShareModal(e.currentTarget));
}

document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-share-card]');
  if(btn){
    e.preventDefault();
    e.stopPropagation();
    openShareModal(btn);
  }
});

addHeaderShare();
addArticleShare();
