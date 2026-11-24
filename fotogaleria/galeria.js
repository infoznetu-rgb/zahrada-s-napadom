const grid = document.querySelector('.grid');
const filters = document.querySelector('.filters');
filters.hidden = false;
filters.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  for (const item of filters.children) item.setAttribute('aria-pressed', String(item === button));
  for (const card of grid.children) card.hidden = button.textContent !== 'Všetko' && card.dataset.group !== button.textContent;
});
const dialog = document.querySelector('dialog');
grid.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || !dialog.showModal || event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  const image = dialog.querySelector('img');
  image.src = link.href;
  image.alt = link.getAttribute('aria-label') || link.closest('article').querySelector('h3').textContent;
  dialog.showModal();
});
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
async function loadProjects() {
  const result = await fetch('https://bkyappgttwjxakkwycub.supabase.co/rest/v1/zahrada_site_settings?key=like.workshop-project-*&select=key,value&order=key.desc', {headers:{apikey:'sb_publishable_xgl_GnkeKPFDCtyr1RtnnA_f6aaPdS4'}});
  if (!result.ok) throw new Error('Fotografie sa nepodarilo načítať.');
  const fragment = document.createDocumentFragment();
  for (const {value} of await result.json()) {
    const urls = (value.photos || []).filter(url => typeof url === 'string' && url.startsWith('https://bkyappgttwjxakkwycub.supabase.co/storage/v1/object/public/zahrada-media/'));
    if (!urls.length) continue;
    const card = grid.querySelector('article').cloneNode(true);
    card.dataset.group = value.group;
    card.querySelector('small').textContent = value.group;
    card.querySelector('h3').textContent = value.title;
    card.querySelector('p').textContent = value.caption;
    const cover = card.querySelector('.cover');
    cover.href = cover.firstElementChild.src = urls[0];
    cover.firstElementChild.alt = value.title;
    const thumbs = card.querySelector('.thumbs');
    thumbs.replaceChildren();
    for (const [i,url] of urls.slice(1).entries()) {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('aria-label', value.title + ', záber ' + (i+2));
      const img = new Image(); img.alt = ''; img.loading = 'lazy'; img.src = url;
      link.append(img); thumbs.append(link);
    }
    const active = filters.querySelector('[aria-pressed=true]').textContent;
    card.hidden = active !== 'Všetko' && active !== value.group;
    fragment.append(card);
  }
  grid.prepend(fragment);
}
loadProjects().catch(() => { const note = document.createElement('p'); note.textContent = 'Novšie pridané výrobky sa nepodarilo načítať. Skús stránku obnoviť.'; grid.after(note); });