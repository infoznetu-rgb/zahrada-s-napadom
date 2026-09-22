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
  const appSearchForm=document.querySelector('#app-search-form');
  const appSearchInput=document.querySelector('#app-search-input');
  const PROFILE_KEY='zahrada-profile-v1';
  const TASKS_KEY='zahrada-tasks-v1';
  const FAVORITES_KEY='zahrada-favorite-tools-v1';

  function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}


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

  function wireSystemState(){
    const connection=document.querySelector('#app-connection-state');
    const update=document.querySelector('#app-update-state');
    const paint=()=>{if(!connection)return;connection.classList.toggle('is-offline',!navigator.onLine);connection.innerHTML='<i></i>'+(navigator.onLine?'Online':'Offline režim')};
    paint();window.addEventListener('online',paint);window.addEventListener('offline',paint);
    navigator.serviceWorker?.getRegistration?.().then(reg=>{
      if(!reg)return;
      if(reg.waiting&&update){update.textContent='Dostupná aktualizácia';update.classList.add('has-update')}
      reg.addEventListener('updatefound',()=>{if(update){update.textContent='Sťahujem novú verziu…';update.classList.add('has-update')}});
    }).catch(()=>{});
  }

  function wireProfile(){
    const region=document.querySelector('#garden-region');
    const checks=[...document.querySelectorAll('.app-interest-pills input')];
    const note=document.querySelector('#profile-recommendation');
    const profile=readJson(PROFILE_KEY,{region:'middle',interests:['garden']});
    if(region)region.value=profile.region||'middle';
    checks.forEach(input=>input.checked=(profile.interests||[]).includes(input.value));
    const save=()=>{
      const next={region:region?.value||'middle',interests:checks.filter(x=>x.checked).map(x=>x.value)};
      writeJson(PROFILE_KEY,next);
      const labels={garden:'záhradné práce a pestovanie',workshop:'dielenské projekty',home:'pomôcky pre dom',market:'novinky z bazára'};
      if(note)note.textContent=next.interests.length?'Aplikácia zvýrazní: '+next.interests.map(x=>labels[x]).filter(Boolean).join(', ')+'.':'Vyber si aspoň jednu oblasť, ktorá ťa zaujíma.';
    };
    region?.addEventListener('change',save);checks.forEach(input=>input.addEventListener('change',save));save();
  }

  function wireTasks(){
    const form=document.querySelector('#garden-task-form'),input=document.querySelector('#garden-task-input');
    const list=document.querySelector('#garden-task-list'),empty=document.querySelector('#garden-task-empty'),progress=document.querySelector('#plan-progress');
    let tasks=readJson(TASKS_KEY,[]);
    const paint=()=>{
      if(!list)return;
      list.innerHTML=tasks.map((task,index)=>`<li class="${task.done?'is-done':''}" data-task-index="${index}"><input type="checkbox" ${task.done?'checked':''} aria-label="Označiť úlohu ako hotovú"><span>${esc(task.text)}</span><button type="button" aria-label="Odstrániť úlohu">×</button></li>`).join('');
      if(empty)empty.hidden=tasks.length>0;
      if(progress){const done=tasks.filter(x=>x.done).length;progress.textContent=tasks.length?done+' / '+tasks.length+' hotové':'0 úloh'}
      writeJson(TASKS_KEY,tasks);
    };
    form?.addEventListener('submit',event=>{event.preventDefault();const text=input?.value.trim();if(!text)return;tasks.unshift({text,done:false,created:Date.now()});if(input)input.value='';paint()});
    list?.addEventListener('change',event=>{const li=event.target.closest('[data-task-index]');if(!li)return;tasks[Number(li.dataset.taskIndex)].done=event.target.checked;paint()});
    list?.addEventListener('click',event=>{if(!event.target.closest('button'))return;const li=event.target.closest('[data-task-index]');if(!li)return;tasks.splice(Number(li.dataset.taskIndex),1);paint()});
    paint();
  }

  function wireFavoriteTools(){
    const root=document.querySelector('#favorite-tools-list'),empty=document.querySelector('#favorite-tools-empty');
    let favorites=readJson(FAVORITES_KEY,[]);
    const items=[...document.querySelectorAll('.app-topic-item')];
    items.forEach(link=>{
      const href=link.getAttribute('href')||'';
      if(!/kalkulacka|planovac|prevodnik|hmozdinky|rezaci|pravy-uhol/.test(href))return;
      const row=document.createElement('div');row.className='app-topic-tool-row';link.before(row);row.appendChild(link);
      const button=document.createElement('button');button.type='button';button.className='tool-favorite-button';button.setAttribute('aria-label','Pridať medzi obľúbené');button.textContent='★';row.appendChild(button);
      button.addEventListener('click',()=>{const pos=favorites.findIndex(x=>x.href===href);if(pos>=0)favorites.splice(pos,1);else favorites.unshift({href,title:link.querySelector('strong')?.textContent||'Pomôcka'});writeJson(FAVORITES_KEY,favorites);paint()});
    });
    function paint(){
      document.querySelectorAll('.app-topic-tool-row').forEach(row=>{const href=row.querySelector('a')?.getAttribute('href');row.querySelector('button')?.classList.toggle('is-favorite',favorites.some(x=>x.href===href))});
      if(root)root.innerHTML=favorites.slice(0,6).map(x=>`<a class="favorite-tool" href="${esc(x.href)}"><strong>${esc(x.title)}</strong><span>★</span></a>`).join('');
      if(empty)empty.hidden=favorites.length>0;
    }
    paint();
  }

  function wireMobileTopics(){
    document.querySelectorAll('.app-topic-card').forEach((card,index)=>{
      const head=card.querySelector('.app-topic-card-head');if(!head)return;
      head.setAttribute('role','button');head.setAttribute('tabindex','0');head.setAttribute('aria-expanded',String(index===0));
      card.classList.toggle('is-open',index===0);
      const toggle=()=>{const open=!card.classList.contains('is-open');card.classList.toggle('is-open',open);head.setAttribute('aria-expanded',String(open))};
      head.addEventListener('click',toggle);head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}});
    });
  }

  appSearchForm?.addEventListener('submit',event=>{
    event.preventDefault();
    const query=appSearchInput?.value.trim()||'';
    app.openSearch?.(query);
  });

  clearSaved?.addEventListener('click',()=>{
    if(confirm('Vymazať všetky uložené články v tomto zariadení?'))app.clearSaved();
  });
  clearHistory?.addEventListener('click',()=>{
    if(confirm('Vymazať históriu čítania v tomto zariadení?'))app.clearHistory();
  });

  window.addEventListener('zahrada:library-change',render);
  wireSystemState();
  wireProfile();
  wireTasks();
  wireFavoriteTools();
  wireMobileTopics();
  render();
})();
