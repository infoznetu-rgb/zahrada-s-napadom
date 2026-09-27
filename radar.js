(() => {
  const API = 'https://bkyappgttwjxakkwycub.supabase.co';
  const KEY = 'sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4';
  const districts = ['Bánovce nad Bebravou','Banská Bystrica','Banská Štiavnica','Bardejov','Bratislava I','Bratislava II','Bratislava III','Bratislava IV','Bratislava V','Brezno','Bytča','Čadca','Detva','Dolný Kubín','Dunajská Streda','Galanta','Gelnica','Hlohovec','Humenné','Ilava','Kežmarok','Komárno','Košice I','Košice II','Košice III','Košice IV','Košice-okolie','Krupina','Kysucké Nové Mesto','Levice','Levoča','Liptovský Mikuláš','Lučenec','Malacky','Martin','Medzilaborce','Michalovce','Myjava','Námestovo','Nitra','Nové Mesto nad Váhom','Nové Zámky','Partizánske','Pezinok','Piešťany','Poltár','Poprad','Považská Bystrica','Prešov','Prievidza','Púchov','Revúca','Rimavská Sobota','Rožňava','Ružomberok','Sabinov','Šaľa','Senec','Senica','Skalica','Snina','Sobrance','Spišská Nová Ves','Stará Ľubovňa','Stropkov','Svidník','Topoľčany','Trebišov','Trenčín','Trnava','Turčianske Teplice','Tvrdošín','Veľký Krtíš','Vranov nad Topľou','Zlaté Moravce','Zvolen','Žarnovica','Žiar nad Hronom','Žilina'];
  const topics = { rastliny: 'RASTLINY', pocasie: 'POČASIE', skodcovia: 'ŠKODCOVIA', uroda: 'ÚRODA', prace: 'PRÁCE' };
  const guides = { rastliny: ['/temy/zahrada.html', 'Návody pre rastliny'], pocasie: ['/kalendar.html', 'Záhradný kalendár'], skodcovia: ['/blog.html', 'Návody na blogu'], uroda: ['/temy/zahrada.html', 'Pestovanie a úroda'], prace: ['/pomocky.html', 'Praktické pomôcky'] };
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let district = 'Tvrdošín';
  let period = 'current';
  let observations = [];
  try { const saved = localStorage.getItem('zahrada-radar-district'); if (districts.includes(saved)) district = saved; } catch (_) {}

  const districtSelect = $('#radar-district');
  const formDistrict = $('#form-district');
  const options = districts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
  districtSelect.innerHTML = options;
  formDistrict.innerHTML = options;
  districtSelect.value = formDistrict.value = district;

  const dateText = (s) => new Intl.DateTimeFormat('sk-SK', { day:'numeric', month:'long', year:'numeric' }).format(new Date(s));
  const empty = (message) => `<p class="radar-empty">${esc(message)}</p>`;

  function renderObservations() {
    const rows = observations.filter(o => o.district === district && (period === 'archive' ? o.status === 'archived' : o.status === 'approved'));
    $('#radar-observations').innerHTML = rows.length ? rows.map(o => {
      const guide = guides[o.topic] || guides.rastliny;
      return `<article class="radar-card"><img src="${esc(o.image_url)}" alt="${esc(o.title)}" loading="lazy"><div class="radar-card-body"><small>${esc(o.district.toUpperCase())} · ${esc(topics[o.topic] || 'ZÁHRADA')} · ${esc(dateText(o.observed_at))}</small><h3>${esc(o.title)}</h3><p>${esc(o.details)}</p><a href="${guide[0]}">${guide[1]} →</a></div></article>`;
    }).join('') : empty(period === 'archive' ? 'V tomto okrese zatiaľ nie sú staršie schválené pozorovania.' : 'V tomto okrese zatiaľ nikto nepridal schválené pozorovanie. Môžeš byť prvý! Predpoveď a návody sú dostupné aj bez hlásení.');
    const weekAgo = Date.now() - 7 * 86400000;
    const weekly = observations.filter(o => o.status === 'approved' && new Date(o.observed_at).getTime() >= weekAgo);
    const box = $('#radar-week');
    box.hidden = period !== 'current' || weekly.length === 0;
    if (!box.hidden) {
      const counts = Object.entries(topics).map(([key,name]) => ({ name, count:weekly.filter(o => o.topic === key).length })).filter(x => x.count).sort((a,b) => b.count-a.count);
      $('#radar-week-text').textContent = `Za posledných 7 dní pribudlo ${weekly.length} schválených pozorovaní z celého Slovenska. Najčastejšie témy: ${counts.slice(0,3).map(x => x.name.toLowerCase()).join(', ')}.`;
    }
  }

  async function loadObservations() {
    try {
      const response = await fetch(`${API}/rest/v1/zahrada_radar_observations?select=id,district,topic,title,details,image_url,observed_at,status&status=in.(approved,archived)&order=observed_at.desc&limit=300`, { headers: { apikey:KEY } });
      if (!response.ok) throw new Error('HTTP '+response.status);
      observations = await response.json();
      renderObservations();
    } catch (error) {
      $('#radar-observations').innerHTML = empty('Pozorovania sa momentálne nepodarilo načítať. Skús obnoviť stránku.');
    }
  }

  async function loadWeather() {
    $('#weather-place').textContent = district;
    $('#radar-weather').textContent = 'Načítavam predpoveď…';
    try {
      const name = district.startsWith('Bratislava') ? 'Bratislava' : district.startsWith('Košice') ? 'Košice' : district;
      const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=sk&countryCode=SK`);
      if (!geoResponse.ok) throw new Error('geocode');
      const places = (await geoResponse.json()).results || [];
      const place = places.find(p => p.name?.toLocaleLowerCase('sk') === name.toLocaleLowerCase('sk')) || places[0];
      if (!place) throw new Error('no location');
      const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=temperature_2m_min,temperature_2m_max,precipitation_sum&timezone=Europe%2FBratislava&forecast_days=3`);
      if (!forecastResponse.ok) throw new Error('forecast');
      const daily = (await forecastResponse.json()).daily;
      if (!daily?.time?.length) throw new Error('empty forecast');
      const days = ['Dnes','Zajtra','Pozajtra'];
      $('#radar-weather').innerHTML = daily.time.map((d,i) => {
        const low = Math.round(daily.temperature_2m_min[i]);
        const high = Math.round(daily.temperature_2m_max[i]);
        const rain = Math.round(daily.precipitation_sum[i] * 10) / 10;
        const note = low <= 2 ? 'Ráno môže byť chladno. Citlivé rastliny skontroluj.' : rain >= 5 ? 'Očakáva sa dážď. Skontroluj opory a odtok vody.' : 'Vhodný deň na bežné záhradné práce podľa miestnych podmienok.';
        return `<article class="radar-weather-card"><span class="radar-kicker">${days[i] || esc(dateText(d))} · PREDPOVEĎ</span><strong>${esc(dateText(d))}</strong><div class="temp">${low} až ${high} °C</div><p>Zrážky približne ${rain} mm. ${note}</p></article>`;
      }).join('');
    } catch (_) { $('#radar-weather').innerHTML = empty('Predpoveď sa teraz nepodarilo načítať. Skús to o chvíľu znova.'); }
  }

  $('#radar-find').addEventListener('click', () => {
    district = districtSelect.value;
    formDistrict.value = district;
    try { localStorage.setItem('zahrada-radar-district', district); } catch (_) {}
    renderObservations(); loadWeather();
    $('.radar-weather-section').scrollIntoView({ behavior:'smooth', block:'start' });
  });
  document.querySelectorAll('[data-radar-period]').forEach(btn => btn.addEventListener('click', () => {
    period = btn.dataset.radarPeriod;
    document.querySelectorAll('[data-radar-period]').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
    renderObservations();
  }));

  async function compactPhoto(file) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Použi fotografiu JPG, PNG alebo WebP.');
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .82));
    if (!blob || blob.size > 3_145_728) throw new Error('Fotografia je príliš veľká. Skús menší obrázok.');
    return new File([blob], 'pozorovanie.webp', { type:'image/webp' });
  }
  $('#radar-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = $('#radar-message');
    const button = $('#radar-send');
    message.textContent = 'Pripravujem fotografiu…'; button.disabled = true;
    try {
      const data = new FormData(form);
      data.set('photo', await compactPhoto(data.get('photo')));
      message.textContent = 'Odosielam pozorovanie…';
      const response = await fetch(`${API}/functions/v1/radar-submit`, { method:'POST', headers:{ apikey:KEY }, body:data });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Odoslanie sa nepodarilo.');
      message.textContent = 'Ďakujeme! Pozorovanie čaká na schválenie a potom sa objaví v radare.';
      form.reset(); formDistrict.value = district;
    } catch (error) { message.textContent = error.message || 'Odoslanie sa nepodarilo.'; }
    finally { button.disabled = false; }
  });

  loadObservations(); loadWeather();
})();
