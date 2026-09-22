(()=>{
  const FOCUS_KEY='zahrada-home-focus-v1';
  const CONTINUE_HIDE_KEY='zahrada-home-continue-hidden-v1';
  const WEEK_PLAN_KEY='zahrada-week-plan-v1';
  const CLIMATE_KEY='zahrada-climate-v1';
  const $=selector=>document.querySelector(selector);

  function safeGet(key){try{return localStorage.getItem(key)||''}catch(e){return''}}
  function safeSet(key,value){try{localStorage.setItem(key,value)}catch(e){}}

  function wireFocus(){
    const cards=[...document.querySelectorAll('[data-home-focus]')];
    const selected=safeGet(FOCUS_KEY);
    cards.forEach(card=>{
      card.classList.toggle('is-selected',card.dataset.homeFocus===selected);
      card.addEventListener('click',()=>{
        safeSet(FOCUS_KEY,card.dataset.homeFocus||'');
        window.ZahradaApp?.trackEvent?.('home_focus_selected',{label:card.dataset.homeFocus||''});
      });
    });
  }

  function renderContinue(){
    const section=$('#home-continue');
    const app=window.ZahradaApp;
    if(!section||!app)return;
    const item=app.getHistory?.()?.[0];
    if(!item){section.hidden=true;return}
    const hiddenSlug=safeGet(CONTINUE_HIDE_KEY);
    if(hiddenSlug===item.slug){section.hidden=true;return}
    const url=item.url||('/prispevok.html?slug='+encodeURIComponent(item.slug||''));
    const title=item.title||'Posledný článok';
    const name=$('#home-continue-name'),link=$('#home-continue-link'),thumb=$('#home-continue-thumb');
    if(name)name.textContent=title;
    [link,thumb].forEach(node=>{if(node)node.href=url});
    const image=$('#home-continue-image'),placeholder=$('#home-continue-placeholder');
    if(image&&item.cover_url){image.src=item.cover_url;image.hidden=false;if(placeholder)placeholder.hidden=true}
    else{if(image){image.hidden=true;image.removeAttribute('src')}if(placeholder)placeholder.hidden=false}
    section.hidden=false;
    link?.addEventListener('click',()=>app.trackEvent?.('continue_reading',{label:item.slug||title}),{once:true});
  }

  function wireContinueClose(){
    $('#home-continue-close')?.addEventListener('click',()=>{
      const item=window.ZahradaApp?.getHistory?.()?.[0];
      if(item?.slug)safeSet(CONTINUE_HIDE_KEY,item.slug);
      const section=$('#home-continue');if(section)section.hidden=true;
    });
  }

  function weekKey(date=new Date()){
    const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
    const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);
    const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return d.getUTCFullYear()+'-W'+String(Math.ceil((((d-yearStart)/86400000)+1)/7)).padStart(2,'0');
  }
  function readPlan(){
    try{const value=JSON.parse(localStorage.getItem(WEEK_PLAN_KEY)||'{}');return value.week===weekKey()&&Array.isArray(value.done)?value:{week:weekKey(),done:[]}}
    catch(e){return{week:weekKey(),done:[]}}
  }
  function savePlan(plan){try{localStorage.setItem(WEEK_PLAN_KEY,JSON.stringify(plan))}catch(e){}}
  function climateNote(value){
    if(value==='warm')return'V teplejšej oblasti môžu niektoré práce prísť o 1–2 týždne skôr. Sleduj pôdu a počasie.';
    if(value==='cool')return'V chladnejšej oblasti nič neurýchľuj. Niektoré práce môžu prísť o 1–2 týždne neskôr.';
    return'Úlohy ber ako orientačný plán a prispôsob ich miestnemu počasiu.';
  }
  function updateProgress(plan,total,prefix){
    const done=plan.done.filter(id=>id.startsWith(prefix)).length,percent=total?Math.round(done/total*100):0;
    const label=$('#week-progress-label'),value=$('#week-progress-percent'),bar=$('#week-progress-bar');
    if(label)label.textContent=done+' zo '+total+' hotové';if(value)value.textContent=percent+' %';if(bar)bar.style.width=percent+'%';
  }
  function enhanceWeekPlan(){
    const cards=[...document.querySelectorAll('#season-cards .season-card')];if(!cards.length)return;
    const month=String(new Date().getMonth()+1).padStart(2,'0'),prefix=month+'-',plan=readPlan();
    plan.done=plan.done.filter(id=>id.startsWith(prefix));
    cards.forEach((card,index)=>{
      const id=prefix+index,done=plan.done.includes(id);card.dataset.weekTask=id;card.classList.toggle('is-done',done);
      let button=card.querySelector('.season-check');
      if(!button){button=document.createElement('button');button.className='season-check';button.type='button';button.innerHTML='<span aria-hidden="true">✓</span><b></b>';card.insertBefore(button,card.querySelector('a'))}
      button.setAttribute('aria-pressed',String(done));button.querySelector('b').textContent=done?'Hotovo':'Označiť ako hotové';
      button.addEventListener('click',()=>{const position=plan.done.indexOf(id),nextDone=position<0;if(nextDone)plan.done.push(id);else plan.done.splice(position,1);savePlan(plan);card.classList.toggle('is-done',nextDone);button.setAttribute('aria-pressed',String(nextDone));button.querySelector('b').textContent=nextDone?'Hotovo':'Označiť ako hotové';updateProgress(plan,cards.length,prefix);window.ZahradaApp?.trackEvent?.('week_task_toggle',{label:id+':'+(nextDone?'done':'open')})});
    });
    savePlan(plan);updateProgress(plan,cards.length,prefix);
    const select=$('#season-climate'),note=$('#season-climate-note');let climate='middle';try{climate=localStorage.getItem(CLIMATE_KEY)||'middle'}catch(e){}
    if(select){select.value=climate;if(note)note.textContent=climateNote(climate);select.addEventListener('change',()=>{safeSet(CLIMATE_KEY,select.value);if(note)note.textContent=climateNote(select.value);window.ZahradaApp?.trackEvent?.('climate_selected',{label:select.value})})}
    const kicker=$('#season-kicker');if(kicker)kicker.textContent=kicker.textContent.replace('TERAZ V ZÁHRADE','TENTO TÝŽDEŇ');
  }

  function start(){wireFocus();wireContinueClose();renderContinue();requestAnimationFrame(enhanceWeekPlan)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('zahrada:library-change',renderContinue);
})();
