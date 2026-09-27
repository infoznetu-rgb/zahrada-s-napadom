(() => {
  const districts = ['Bánovce nad Bebravou','Banská Bystrica','Banská Štiavnica','Bardejov','Bratislava I','Bratislava II','Bratislava III','Bratislava IV','Bratislava V','Brezno','Bytča','Čadca','Detva','Dolný Kubín','Dunajská Streda','Galanta','Gelnica','Hlohovec','Humenné','Ilava','Kežmarok','Komárno','Košice I','Košice II','Košice III','Košice IV','Košice-okolie','Krupina','Kysucké Nové Mesto','Levice','Levoča','Liptovský Mikuláš','Lučenec','Malacky','Martin','Medzilaborce','Michalovce','Myjava','Námestovo','Nitra','Nové Mesto nad Váhom','Nové Zámky','Partizánske','Pezinok','Piešťany','Poltár','Poprad','Považská Bystrica','Prešov','Prievidza','Púchov','Revúca','Rimavská Sobota','Rožňava','Ružomberok','Sabinov','Šaľa','Senec','Senica','Skalica','Snina','Sobrance','Spišská Nová Ves','Stará Ľubovňa','Stropkov','Svidník','Topoľčany','Trebišov','Trenčín','Trnava','Turčianske Teplice','Tvrdošín','Veľký Krtíš','Vranov nad Topľou','Zlaté Moravce','Zvolen','Žarnovica','Žiar nad Hronom','Žilina'];
  const key = 'zahrada-radar-district';
  const select = document.querySelector('#app-today-district');
  const box = document.querySelector('#app-today-weather');
  const guide = document.querySelector('#app-today-guide');
  if (!select || !box) return;
  for (const district of districts) {
    const option = document.createElement('option');
    option.value = option.textContent = district;
    select.append(option);
  }
  const saved = () => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const initial = saved();
  select.value = districts.includes(initial) ? initial : 'Tvrdošín';
  let requestId = 0;
  async function load() {
    const id = ++requestId;
    const district = select.value;
    try { localStorage.setItem(key, district); } catch (_) {}
    box.textContent = 'Načítavam predpoveď…';
    guide.href = 'kalendar.html';
    guide.textContent = 'Pozrieť záhradný kalendár →';
    try {
      const name = district.startsWith('Bratislava') ? 'Bratislava' : district.startsWith('Košice') ? 'Košice' : district;
      const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=sk&countryCode=SK`);
      if (!geo.ok) throw new Error('geocoding');
      const places = (await geo.json()).results || [];
      const place = places.find(p => p.name?.toLocaleLowerCase('sk') === name.toLocaleLowerCase('sk')) || places[0];
      if (!place) throw new Error('location');
      const weather = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=temperature_2m_min,temperature_2m_max,precipitation_sum&timezone=Europe%2FBratislava&forecast_days=1`);
      if (!weather.ok) throw new Error('forecast');
      const day = (await weather.json()).daily;
      if (!day?.time?.[0] || !Number.isFinite(day.temperature_2m_min?.[0]) || !Number.isFinite(day.temperature_2m_max?.[0])) throw new Error('empty');
      if (id !== requestId) return;
      const low = Math.round(day.temperature_2m_min[0]);
      const high = Math.round(day.temperature_2m_max[0]);
      const rain = Number(day.precipitation_sum?.[0]);
      const rainText = Number.isFinite(rain) ? `${Math.round(rain * 10) / 10} mm` : 'údaj nie je dostupný';
      let advice = 'Skontroluj, čo tento mesiac potrebuje tvoja záhrada.';
      if (low <= 2) advice = 'Ráno môže byť chladno. Skontroluj citlivé rastliny a sleduj aktuálnu teplotu vo svojej záhrade.';
      else if (rain >= 5) advice = 'Predpoveď hlási dážď. Skontroluj odtok vody a opory rastlín.';
      else if (high >= 28) { advice = 'Predpoveď hlási teplý deň. Skontroluj pôdu a zalievaj podľa skutočnej potreby rastlín.'; guide.href = 'kalkulacka-zavlahy.html'; guide.textContent = 'Naplánovať závlahu →'; }
      const date = new Intl.DateTimeFormat('sk-SK', { day:'numeric', month:'long', year:'numeric', timeZone:'Europe/Bratislava' }).format(new Date(`${day.time[0]}T12:00:00+02:00`));
      box.replaceChildren();
      const dateEl = document.createElement('span'); dateEl.className = 'app-today-date'; dateEl.textContent = `Predpoveď na ${date} · ${district}`;
      const summary = document.createElement('strong'); summary.textContent = `${low} až ${high} °C · zrážky ${rainText}`;
      const tip = document.createElement('p'); tip.textContent = advice;
      box.append(dateEl, summary, tip);
    } catch (_) {
      if (id === requestId) box.textContent = 'Predpoveď teraz nie je dostupná. Otvor Radar a skús to neskôr.';
    }
  }
  select.addEventListener('change', load);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const district = saved();
    if (districts.includes(district) && district !== select.value) { select.value = district; load(); }
  });
  load();
})();
