document.addEventListener('DOMContentLoaded', function () {
  const catalog = document.querySelector('[data-locale-catalog]');
  if (!catalog) return;
  const locale = document.documentElement.lang === 'pl' ? 'pl' : 'cs';
  const copy = locale === 'pl'
    ? { placeholder: 'Szukaj tematu lub rośliny', label: 'Szukaj artykułów', previous: '← Poprzednia', next: 'Następna →', empty: 'Nie znaleziono artykułów. Spróbuj innego hasła.', count: n => `${n} artykułów`, page: (a,b) => `Strona ${a} z ${b}` }
    : { placeholder: 'Hledat téma nebo rostlinu', label: 'Hledat články', previous: '← Předchozí', next: 'Další →', empty: 'Žádné články neodpovídají hledání. Zkuste jiný výraz.', count: n => `${n} článků`, page: (a,b) => `Strana ${a} z ${b}` };
  const cards = [...catalog.querySelectorAll(':scope > a.card')];
  const pageSize = 12;
  let page = 1;
  const controls = document.createElement('div');
  controls.className = 'locale-catalog-controls';
  const label = document.createElement('label');
  label.textContent = copy.label;
  const input = document.createElement('input');
  input.type = 'search'; input.placeholder = copy.placeholder; input.autocomplete = 'off';
  label.append(input);
  const count = document.createElement('p'); count.setAttribute('aria-live', 'polite');
  controls.append(label, count);
  catalog.before(controls);
  const pager = document.createElement('nav');
  pager.className = 'locale-catalog-pager'; pager.setAttribute('aria-label', locale === 'pl' ? 'Strony artykułów' : 'Stránky článků');
  catalog.after(pager);
  const empty = document.createElement('p'); empty.className = 'locale-catalog-empty'; empty.textContent = copy.empty;
  empty.hidden = true; catalog.after(empty);
  function render() {
    const query = input.value.trim().toLocaleLowerCase(locale);
    const matches = cards.filter(card => card.textContent.toLocaleLowerCase(locale).includes(query));
    const total = Math.max(1, Math.ceil(matches.length / pageSize));
    page = Math.min(page, total);
    const visible = new Set(matches.slice((page - 1) * pageSize, page * pageSize));
    cards.forEach(card => { card.hidden = !visible.has(card); });
    count.textContent = copy.count(matches.length);
    empty.hidden = matches.length !== 0;
    pager.replaceChildren();
    if (total <= 1 || !matches.length) return;
    function button(label, target, disabled, current) {
      const el = document.createElement('button'); el.type = 'button'; el.textContent = label;
      el.disabled = disabled;
      if (current) el.setAttribute('aria-current', 'page');
      el.addEventListener('click', () => { page = target; render(); controls.scrollIntoView({block:'start'}); });
      pager.append(el);
    }
    button(copy.previous, page - 1, page === 1, false);
    const start = Math.max(1, Math.min(page - 2, total - 4));
    for (let n = start; n <= Math.min(total, start + 4); n++) button(String(n), n, n === page, n === page);
    button(copy.next, page + 1, page === total, false);
    const status = document.createElement('span'); status.textContent = copy.page(page, total); pager.append(status);
  }
  input.addEventListener('input', () => { page = 1; render(); });
  render();
});
