(()=>{
  const STORAGE_KEY='zahrada-price-calculator-v1';
  const API='https://bkyappgttwjxakkwycub.supabase.co/functions/v1/product-price-compare';
  const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJreWFwcGd0dHdqeGFra3d5Y3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NjQ5ODUsImV4cCI6MjEwNTE0MDk4NX0._plU19HUWyIipD0fVxBmKxCwnCTMp6bZ0fVvxus7i7w';

  const el=(id)=>document.getElementById(id);
  const materialList=el('material-list');
  const marketRoot=el('market-results');
  let marketItems=[];
  let lastResult={recommended:0,safe:0,base:0,cash:0,labor:0,material:0,other:0};

  const money=(n)=>new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number.isFinite(n)?n:0);
  const num=(v)=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)&&n>=0?n:0};
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function niceRound(value){
    if(!Number.isFinite(value)||value<=0)return 0;
    const step=value>=100?5:1;
    return Math.ceil(value/step)*step;
  }

  function materialRow(item={name:'',qty:1,price:0}){
    const row=document.createElement('div');
    row.className='material-row';
    row.innerHTML='<input class="material-name" type="text" maxlength="80" placeholder="napr. smreková lata" aria-label="Materiál"><input class="material-qty" type="number" min="0" step="0.01" inputmode="decimal" aria-label="Množstvo"><input class="material-price" type="number" min="0" step="0.01" inputmode="decimal" aria-label="Cena za jednotku v eurách"><span class="material-total">0 €</span><button class="material-remove" type="button" aria-label="Odstrániť materiál">×</button>';
    row.querySelector('.material-name').value=item.name||'';
    row.querySelector('.material-qty').value=Number.isFinite(Number(item.qty))?item.qty:1;
    row.querySelector('.material-price').value=Number.isFinite(Number(item.price))?item.price:0;
    row.querySelector('.material-remove').addEventListener('click',()=>{
      if(materialList.children.length>1)row.remove();
      else{row.querySelector('.material-name').value='';row.querySelector('.material-qty').value=1;row.querySelector('.material-price').value=0}
      calculate();
    });
    row.querySelectorAll('input').forEach(x=>x.addEventListener('input',calculate));
    materialList.appendChild(row);
    return row;
  }

  function materials(){
    return [...materialList.querySelectorAll('.material-row')].map(row=>({
      name:row.querySelector('.material-name').value.trim(),
      qty:num(row.querySelector('.material-qty').value),
      price:num(row.querySelector('.material-price').value)
    }));
  }

  function state(){
    return {
      product:el('price-product-name').value.trim(),
      materials:materials(),
      hours:num(el('work-hours').value),
      rate:num(el('hour-rate').value),
      packaging:num(el('cost-packaging').value),
      shipping:num(el('cost-shipping').value),
      overhead:num(el('cost-overhead').value),
      other:num(el('cost-other').value),
      reserve:Math.min(100,num(el('material-reserve').value)),
      markup:Math.min(500,num(el('profit-markup').value)),
      fee:Math.min(80,num(el('sale-fee').value))
    };
  }

  function save(){
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state()))}catch(e){}
  }

  function calculate(){
    const s=state();
    let materialBase=0;
    [...materialList.querySelectorAll('.material-row')].forEach((row,i)=>{
      const item=s.materials[i];
      const total=item.qty*item.price;
      materialBase+=total;
      row.querySelector('.material-total').textContent=money(total);
    });
    const material=materialBase*(1+s.reserve/100);
    const labor=s.hours*s.rate;
    const extras=s.packaging+s.shipping+s.overhead+s.other;
    const cash=material+extras;
    const base=cash+labor;
    const target=base*(1+s.markup/100);
    const withFee=s.fee>=80?target:target/(1-s.fee/100);
    const recommended=niceRound(withFee);
    const safeTarget=base*(1+(s.markup+10)/100);
    const safe=niceRound(s.fee>=80?safeTarget:safeTarget/(1-s.fee/100));

    lastResult={recommended,safe,base,cash,labor,material,other:extras};
    el('material-sum').textContent=money(materialBase);
    el('labor-sum').textContent=money(labor);
    el('result-material').textContent=money(material);
    el('result-labor').textContent=money(labor);
    el('result-other').textContent=money(extras);
    el('result-base').textContent=money(base);
    el('result-cash').textContent=money(cash);
    el('price-recommended').textContent=money(recommended);
    el('result-safe').textContent=money(safe);
    el('price-result-copy').textContent=base>0
      ? 'V tejto sume je započítaný materiál, tvoj čas, ostatné náklady a zvolená rezerva.'
      : 'Vyplň materiál a čas. Výsledok sa prepočítava automaticky.';
    el('price-warning').hidden=!(base>0&&s.hours>0&&s.rate===0);
    if(s.product&&!el('market-query').dataset.edited)el('market-query').value=s.product;
    save();
    if(marketItems.length)renderMarket();
  }

  function restore(){
    let s=null;
    try{s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch(e){}
    materialList.innerHTML='';
    if(s&&Array.isArray(s.materials)&&s.materials.length){
      s.materials.slice(0,30).forEach(materialRow);
      el('price-product-name').value=s.product||'';
      el('work-hours').value=s.hours||'';
      el('hour-rate').value=s.rate||'';
      el('cost-packaging').value=s.packaging||0;
      el('cost-shipping').value=s.shipping||0;
      el('cost-overhead').value=s.overhead||0;
      el('cost-other').value=s.other||0;
      el('material-reserve').value=Number.isFinite(Number(s.reserve))?s.reserve:10;
      el('profit-markup').value=Number.isFinite(Number(s.markup))?s.markup:15;
      el('sale-fee').value=Number.isFinite(Number(s.fee))?s.fee:0;
    }else{
      materialRow({name:'',qty:1,price:0});
      materialRow({name:'',qty:1,price:0});
    }
    calculate();
  }

  function reset(){
    if(!confirm('Vymazať túto kalkuláciu a začať odznova?'))return;
    try{localStorage.removeItem(STORAGE_KEY)}catch(e){}
    materialList.innerHTML='';
    materialRow({name:'',qty:1,price:0});
    materialRow({name:'',qty:1,price:0});
    ['price-product-name','work-hours','hour-rate'].forEach(id=>el(id).value='');
    ['cost-packaging','cost-shipping','cost-overhead','cost-other','sale-fee'].forEach(id=>el(id).value=0);
    el('material-reserve').value=10;el('profit-markup').value=15;
    el('market-query').value='';delete el('market-query').dataset.edited;
    marketItems=[];marketRoot.innerHTML='<div class="market-empty"><strong>Zatiaľ nič nehľadám.</strong><span>Najprv si spočítaj vlastnú cenu a potom vyhľadaj podobný výrobok.</span></div>';
    calculate();
  }

  async function copySummary(){
    const s=state();
    const lines=[
      s.product||'Kalkulácia výrobku',
      '',
      'Materiál:',
      ...s.materials.filter(x=>x.name||x.qty*x.price>0).map(x=>'• '+(x.name||'Materiál')+' — '+x.qty+' × '+money(x.price)+' = '+money(x.qty*x.price)),
      '',
      'Materiál s rezervou: '+money(lastResult.material),
      'Práca: '+s.hours+' h × '+money(s.rate)+' = '+money(lastResult.labor),
      'Balenie + doprava + ostatné: '+money(lastResult.other),
      'Základ výrobku: '+money(lastResult.base),
      'Navrhovaná cena: '+money(lastResult.recommended),
      'Cena s väčšou rezervou: '+money(lastResult.safe),
      '',
      'Orientačný výpočet zo Záhrada s nápadom.'
    ];
    const text=lines.join('\n');
    try{
      await navigator.clipboard.writeText(text);
      el('price-save-status').textContent='Prehľad je skopírovaný.';
    }catch(e){
      const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();
      try{document.execCommand('copy');el('price-save-status').textContent='Prehľad je skopírovaný.'}catch(_){el('price-save-status').textContent='Kopírovanie sa nepodarilo.'}
      ta.remove();
    }
  }

  function median(values){
    const a=[...values].sort((x,y)=>x-y);if(!a.length)return 0;
    const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;
  }

  function marketStats(items){
    const active=items.filter(x=>x.include!==false);
    const prices=active.map(x=>num(x.price)).filter(x=>x>0);
    return {active,prices,min:prices.length?Math.min(...prices):0,max:prices.length?Math.max(...prices):0,median:median(prices)};
  }

  function comparisonText(stats){
    if(!stats.prices.length||!lastResult.recommended)return 'Vyber výsledky, ktoré sa na tvoj výrobok naozaj podobajú.';
    const p=lastResult.recommended;
    if(p<stats.min)return 'Tvoja navrhovaná cena '+money(p)+' je pod rozpätím vybraných ponúk. To nemusí byť chyba — skontroluj materiál, rozmery a kvalitu porovnávaných výrobkov.';
    if(p>stats.max)return 'Tvoja navrhovaná cena '+money(p)+' je nad rozpätím vybraných ponúk. Pri ručnej výrobe môže rozdiel robiť materiál, rozmery, spracovanie alebo kusová výroba.';
    return 'Tvoja navrhovaná cena '+money(p)+' je v rozpätí vybraných podobných ponúk. Stále si otvor zdroje a porovnaj, čo presne je v cene.';
  }

  function renderMarket(){
    if(!marketItems.length){
      marketRoot.innerHTML='<div class="market-empty"><strong>Nenašiel som použiteľné ceny.</strong><span>Skús presnejší alebo naopak jednoduchší názov výrobku. Internetové výsledky nemusia pri každom výrobku obsahovať cenu.</span></div>';
      return;
    }
    const st=marketStats(marketItems);
    marketRoot.innerHTML=
      '<div class="market-stats"><div><small>Najnižšia vybraná</small><strong>'+money(st.min)+'</strong></div><div><small>Stredná cena</small><strong>'+money(st.median)+'</strong></div><div><small>Najvyššia vybraná</small><strong>'+money(st.max)+'</strong></div></div>'+
      '<div class="market-compare-note">'+esc(comparisonText(st))+'</div>'+
      '<div class="market-list">'+marketItems.map((x,i)=>
        '<article class="market-item"><input type="checkbox" data-market-index="'+i+'" '+(x.include===false?'':'checked')+' aria-label="Započítať túto ponuku do porovnania"><div><h3><a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.title||x.domain)+'</a></h3><p>'+esc(x.snippet||'')+'</p><div class="market-meta"><span>'+esc(x.domain||'zdroj')+'</span><span>zhoda slov '+Math.round(num(x.match))+' %</span></div></div><strong class="market-price">'+money(num(x.price))+'</strong></article>'
      ).join('')+'</div><p class="market-status">Zaškrtnuté ponuky vstupujú do minima, strednej ceny a maxima. Klikni na názov a vždy si over aktuálnu cenu na zdrojovej stránke.</p>';
    marketRoot.querySelectorAll('[data-market-index]').forEach(box=>box.addEventListener('change',()=>{
      const i=Number(box.dataset.marketIndex);if(marketItems[i])marketItems[i].include=box.checked;renderMarket();
    }));
  }

  async function searchMarket(){
    const q=el('market-query').value.trim();
    if(q.length<3){marketRoot.innerHTML='<div class="market-empty"><strong>Napíš názov výrobku.</strong><span>Čím presnejšie ho pomenuješ, tým lepšie sa dajú odfiltrovať podobné ponuky.</span></div>';return}
    const button=el('market-search');button.disabled=true;button.textContent='Hľadám ceny…';
    marketRoot.innerHTML='<div class="market-empty"><strong>Hľadám podobné ponuky…</strong><span>Prechádzam verejné výsledky vyhľadávania. Môže to chvíľu trvať.</span></div>';
    try{
      const response=await fetch(API,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':ANON,'Authorization':'Bearer '+ANON},
        body:JSON.stringify({q})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.message||data.error||('HTTP '+response.status));
      marketItems=(Array.isArray(data.results)?data.results:[]).map(x=>({...x,include:true}));
      renderMarket();
    }catch(error){
      console.error(error);
      marketRoot.innerHTML='<div class="market-empty"><strong>Porovnanie sa teraz nepodarilo načítať.</strong><span>Kalkulačka nákladov funguje ďalej. Internetové porovnanie skús neskôr alebo otvor bežné vyhľadávanie a ceny si porovnaj ručne.</span></div>';
    }finally{
      button.disabled=false;button.textContent='Nájsť podobné ceny';
    }
  }

  el('material-add').addEventListener('click',()=>{if(materialList.children.length<30){materialRow({name:'',qty:1,price:0});calculate()}});
  el('price-reset').addEventListener('click',reset);
  el('price-copy').addEventListener('click',copySummary);
  el('market-search').addEventListener('click',searchMarket);
  el('market-query').addEventListener('input',()=>{el('market-query').dataset.edited='1'});
  el('market-query').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchMarket()}});
  ['price-product-name','work-hours','hour-rate','cost-packaging','cost-shipping','cost-overhead','cost-other','material-reserve','profit-markup','sale-fee'].forEach(id=>el(id).addEventListener('input',calculate));

  restore();
})();