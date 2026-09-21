(()=>{
  const SUPABASE_URL='https://bkyappgttwjxakkwycub.supabase.co';
  const SUPABASE_KEY='sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4';
  const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const KEY='opory-2026';
  const END=new Date('2026-10-05T20:00:00+02:00');
  const $=s=>document.querySelector(s);

  function setMessage(text,type=''){
    const el=$('#contest-message');
    if(!el)return;
    el.textContent=text||'';
    el.className='contest-message '+type;
  }

  function updateCountdown(){
    const diff=Math.max(0,END.getTime()-Date.now());
    const total=Math.floor(diff/1000);
    const days=Math.floor(total/86400);
    const hours=Math.floor((total%86400)/3600);
    const minutes=Math.floor((total%3600)/60);
    const seconds=total%60;
    $('#cd-days').textContent=String(days);
    $('#cd-hours').textContent=String(hours).padStart(2,'0');
    $('#cd-minutes').textContent=String(minutes).padStart(2,'0');
    $('#cd-seconds').textContent=String(seconds).padStart(2,'0');
    if(diff<=0){
      document.body.classList.add('contest-ended');
      const pill=document.querySelector('.contest-live-pill');
      if(pill)pill.innerHTML='<i></i> SÚŤAŽ SKONČILA';
      const button=document.querySelector('#contest-form button[type="submit"]');
      if(button){button.disabled=true;button.textContent='Súťaž je ukončená'}
    }
  }

  function renderWinners(winners,ended){
    const box=$('#contest-winners-box');
    if(!box)return;
    if(Array.isArray(winners)&&winners.length){
      box.innerHTML=winners.map(w=>`<article class="contest-winner-card">
        <span>${Number(w.rank)||''}. VÝHERCA</span>
        <h3>${escapeHtml(w.name||'Výherca')}</h3>
        <p>${escapeHtml(w.answer||'')}</p>
      </article>`).join('');
      return;
    }
    box.innerHTML=ended
      ?'<div class="contest-waiting"><span>⏳</span><strong>Súťaž skončila.</strong><p>Výhercov práve pripravujeme. Výsledok sa objaví na tejto stránke po vyžrebovaní.</p></div>'
      :'<div class="contest-waiting"><span>🎁</span><strong>Súťaž ešte prebieha.</strong><p>Výhercovia budú zverejnení po skončení súťaže a kontaktovaní e-mailom.</p></div>';
  }

  function escapeHtml(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  async function loadStatus(){
    try{
      const {data,error}=await db.rpc('zahrada_contest_public',{p_contest_key:KEY});
      if(error)throw error;
      if(!data?.ok)return;
      $('#contest-entry-count').textContent=String(data.entries_count||0);
      if(data.image_url){
        const img=$('#contest-prize-image');
        const visual=document.querySelector('.contest-prize-visual');
        if(img&&visual){
          img.src=data.image_url;
          img.hidden=false;
          visual.classList.add('has-photo');
        }
      }
      renderWinners(data.winners||[],Date.now()>=END.getTime());
    }catch(error){
      console.error(error);
    }
  }

  $('#contest-form')?.addEventListener('submit',async event=>{
    event.preventDefault();
    if(Date.now()>=END.getTime()){setMessage('Súťaž je už ukončená.','error');return}
    const button=event.currentTarget.querySelector('button[type="submit"]');
    button.disabled=true;
    setMessage('Odosielam tvoju odpoveď…');
    try{
      const {data,error}=await db.rpc('zahrada_submit_contest_entry',{
        p_contest_key:KEY,
        p_display_name:$('#contest-name').value.trim(),
        p_email:$('#contest-email').value.trim(),
        p_answer:$('#contest-answer').value.trim(),
        p_accept_rules:$('#contest-rules').checked,
        p_website:$('#contest-website').value
      });
      if(error)throw error;
      if(!data?.ok){
        const messages={
          already_entered:'Táto e-mailová adresa je už v súťaži zapojená.',
          invalid_email:'Skontroluj zadaný e-mail.',
          invalid_name:'Doplň meno alebo prezývku.',
          invalid_answer:'Doplň krátku odpoveď.',
          rules_required:'Pre zapojenie je potrebné potvrdiť pravidlá.',
          ended:'Súťaž je už ukončená.',
          not_started:'Súťaž ešte nezačala.'
        };
        setMessage(messages[data?.error]||'Zapojenie sa nepodarilo. Skús to ešte raz.','error');
        return;
      }
      event.currentTarget.reset();
      setMessage('Hotovo! Tvoja odpoveď je zaradená do žrebovania. Držím palce. 🌿','ok');
      window.ZahradaApp?.trackEvent?.('contest_entry',{label:KEY});
      await loadStatus();
    }catch(error){
      console.error(error);
      setMessage('Zapojenie sa momentálne nepodarilo. Skús to prosím znova.','error');
    }finally{
      button.disabled=false;
    }
  });

  updateCountdown();
  setInterval(updateCountdown,1000);
  loadStatus();
})();