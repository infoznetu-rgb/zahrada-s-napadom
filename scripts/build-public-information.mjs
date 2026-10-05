import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const copy = {
  sk: { privacy: '/ochrana-sukromia.html', label: 'Ochrana súkromia', about: 'O projekte a autorovi', notice: 'Ako spracúvame údaje z formulára:', title: 'Informácie o webe' },
  cs: { privacy: '/cs/ochrana-soukromi.html', label: 'Ochrana soukromí', about: 'O projektu a autorovi (slovensky)', notice: 'Jak zpracováváme údaje z formuláře:', title: 'Informace o webu' },
  pl: { privacy: '/pl/polityka-prywatnosci.html', label: 'Polityka prywatności', about: 'O projekcie i autorze (po słowacku)', notice: 'Jak przetwarzamy dane z formularza:', title: 'Informacje o stronie' },
};
function* pages(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'admin', 'node_modules', 'supabase', 'work'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* pages(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}
let changed = 0;
for (const path of pages(root)) {
  let source = readFileSync(path, 'utf8');
  if (/http-equiv\s*=\s*["']refresh["']/i.test(source) || !/<body\b/i.test(source)) continue;
  const lang = /<html[^>]*lang=["'](cs|pl)/i.exec(source)?.[1] || 'sk';
  const c = copy[lang];
  const original = source;
  const rel = relative(root, path).replaceAll('\\', '/');
  const adContent = !/noindex/i.test(source) && (rel === 'index.html' || /"@type"\s*:\s*"(?:BlogPosting|Article|Recipe|HowTo)"/.test(source));
  if (adContent && !source.includes('data-google-cmp-integration')) {
    source = source.replace(/<\/head\s*>/i, '<script src="/advertising-consent.js?v=20261005" defer data-google-cmp-integration></script><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8113825405690575" crossorigin="anonymous"></script></head>');
  }
  // Static links remain available to crawlers and visitors without JavaScript.
  if (!source.includes('data-public-information')) {
    const links = `<nav data-public-information aria-label="${c.title}" style="display:flex;flex-wrap:wrap;gap:12px 24px;padding:24px 0"><a href="${c.privacy}">${c.label}</a><a href="/o-projekte.html">${c.about}</a><a href="mailto:kamgardensk@gmail.com">Kontakt</a></nav>`;
    source = /<\/footer\s*>/i.test(source)
      ? source.replace(/<\/footer\s*>/i, links + '</footer>')
      : source.replace(/<\/body\s*>/i, `<footer class="container" style="max-width:1100px;margin:auto;padding:0 24px">${links}</footer></body>`);
  }
  source = source.replace(/<form\b[^>]*>[\s\S]*?<\/form\s*>/gi, form => {
    if (/data-form-privacy/.test(form) || !/<(?:input|textarea)[^>]*(?:type=["'](?:email|file)["']|name=["'](?:author|name|email|message)["']|id=["']ad-)/i.test(form)) return form;
    return form.replace(/<\/form\s*>/i, `<p data-form-privacy style="font-size:.9rem;line-height:1.5">${c.notice} <a href="${c.privacy}#formular">${c.label}</a>.</p></form>`);
  });
  if (adContent && !source.includes('data-ad-consent-settings')) {
    const label = lang === 'cs' ? 'Nastavení reklamního souhlasu' : lang === 'pl' ? 'Ustawienia zgody reklamowej' : 'Nastavenia reklamného súhlasu';
    source = source.replace(/(<nav data-public-information[\s\S]*?)(<\/nav>)/, `$1<button type="button" data-ad-consent-settings hidden style="font:inherit;color:inherit;text-decoration:underline;border:0;background:none;padding:0;cursor:pointer">${label}</button>$2`);
  }
  if (source !== original) { writeFileSync(path, source); changed++; }
}
const sitemapPath = join(root, 'sitemap.xml');
let sitemap = readFileSync(sitemapPath, 'utf8');
for (const path of ['ochrana-sukromia.html', 'o-projekte.html']) {
  const url = 'https://zahradasnapadom.sk/' + path;
  if (!sitemap.includes(`<loc>${url}</loc>`)) sitemap = sitemap.replace('</urlset>', `  <url><loc>${url}</loc><lastmod>2026-10-05</lastmod></url>\n</urlset>`);
}
writeFileSync(sitemapPath, sitemap);
console.log(`Public information: updated ${changed} pages`);
