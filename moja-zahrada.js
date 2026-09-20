(()=>{
  const app=window.ZahradaApp;
  if(!app)return;

  const savedList=document.querySelector('#saved-list');
  const historyList=document.querySelector('#history-list');
  const savedEmpty=document.querySelector('#saved-empty');
  const historyEmpty=document.querySelector('#history-empty');
  const savedCount=document.querySelector('#app-saved-count');
  const historyCount=document.querySelector('#app-history-count');
  const clearSaved=document.querySelector('#clear-saved');
  const clearHistory=document.querySelector('#clear-history');

  function esc(value){
    return String(value??'').replace(/[&<>"']/g,c=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[c]));
  }

  function timeLabel(timestamp){
    if(!timestamp)return '';
    const diff=Date.now()-Number(timestamp);
    const day=24*60*60*1000;
    if(diff<60*1000)return 'práve teraz';
    if(diff<60*60*1000)return Math.max(1,Math.floor(diff/(60*1000)))+' min';
    if(diff<day)return Math.max(1,Math.floor(diff/(60*60*1000)))+' h';
    if(diff<2*day)return 'včera';
    return new Intl.DateTimeFormat('sk-SK',{day:'numeric',month:'short'}).format(new Date(timestamp));
  }

  function card(item,mode){
    const stamp=mode==='saved'?item.saved_at:item.read_at;
    return `<article class="app-library-card" data-library-slug="${esc(item.slug)}">
      <a class="app-library-thumb" href="${esc(item.url||('prispevok.html?slug='+encodeURIComponent(item.slug)))}">
        ${item.cover_url?`<img src="${esc(item.cover_url)}" alt="" loading="lazy">`:'<span>✦</span>'}
      </a>
      <div class="app-library-copy">
        <span>${esc(item.category||'Nápad')} · ${esc(timeLabel(stamp))}</span>
        <h3><a href="${esc(item.url||('prispevok.html?slug='+encodeURIComponent(item.slug)))}">${esc(item.title||'Príspevok')}</a></h3>
        <p>${esc(item.excerpt||'')}</p>
      </div>
      ${mode==='saved'?'<button type="button" class="app-library-remove" aria-label="Odstrániť z uložených" title="Odstrániť">×</button>':''}
    </article>`;
  }

  function render(){
    const saved=app.getSaved();
    const history=app.getHistory();

    savedCount.textContent=String(saved.length);
    historyCount.textContent=String(history.length);

    savedList.innerHTML=saved.map(x=>card(x,'saved')).join('');
    historyList.innerHTML=history.slice(0,12).map(x=>card(x,'history')).join('');

    savedEmpty.hidden=saved.length>0;
    historyEmpty.hidden=history.length>0;
    clearSaved.hidden=saved.length===0;
    clearHistory.hidden=history.length===0;

    savedList.querySelectorAll('.app-library-remove').forEach(button=>{
      button.addEventListener('click',()=>{
        const slug=button.closest('[data-library-slug]')?.dataset.librarySlug;
        if(slug){app.removeSaved(slug);app.toast('Odstránené z uložených.')}
      });
    });
  }

  clearSaved?.addEventListener('click',()=>{
    if(confirm('Vymazať všetky uložené články v tomto zariadení?'))app.clearSaved();
  });
  clearHistory?.addEventListener('click',()=>{
    if(confirm('Vymazať históriu čítania v tomto zariadení?'))app.clearHistory();
  });

  window.addEventListener('zahrada:library-change',render);
  render();
})();