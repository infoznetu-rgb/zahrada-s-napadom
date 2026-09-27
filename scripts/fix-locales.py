"""Normalize the existing Czech and Polish static pages without replacing article copy."""
from pathlib import Path
from urllib.parse import urlparse, unquote
from lxml import html, etree
import re

ROOT = Path(__file__).resolve().parents[1]
HOST = 'https://zahradasnapadom.sk'
ASSET_FIX = {
    '/assets/blog/seo-specific/travnik-jesen.jpg': '/assets/blog/jesenna-starostlivost-o-travnik.webp',
    '/assets/blog/seo-specific/pivonie.jpg': '/assets/blog/seo-specific/pivonie-vysadba.jpg',
    '/assets/blog/02-mulc.svg': '/assets/blog/01-mulcovanie.svg',
    '/assets/blog/05-kompost.svg': '/assets/blog/04-kompost.svg',
    '/assets/blog/03-dazdova-voda.svg': '/assets/blog/02-dazdova-voda.svg',
    '/assets/css/style.css': '/multilang-2026.css',
    '/pl/dilna/': '/pl/warsztat/',
}

def exists(url):
    path = urlparse(url).path
    if not path.startswith('/'): return False
    file = ROOT / unquote(path.lstrip('/'))
    if file.is_dir() or path.endswith('/'): file = file / 'index.html'
    return file.is_file()

def fragment(markup):
    return html.fragment_fromstring(markup)

def normalized(file):
    lang = file.relative_to(ROOT).parts[0]
    src = file.read_text(encoding='utf-8')
    doc = html.document_fromstring(src)
    head, body = doc.find('head'), doc.find('body')
    path = '/' + str(file.parent.relative_to(ROOT)).replace('\\', '/') + '/'
    if path.endswith('/./'): path = '/' + lang + '/'
    canonical = HOST + path
    doc.set('lang', lang)

    for el in doc.xpath('//*[@href or @src]'):
        for attr in ('href', 'src'):
            value = el.get(attr)
            if value in ASSET_FIX: el.set(attr, ASSET_FIX[value])
    for el in doc.xpath('//meta[@property="og:image"]'):
        val = el.get('content', '')
        if val.startswith(HOST) and val[len(HOST):] in ASSET_FIX:
            el.set('content', HOST + ASSET_FIX[val[len(HOST):]])

    links = {}
    for el in head.xpath('./link[@rel="alternate"]'):
        code = el.get('hreflang')
        url = el.get('href', '')
        destination = urlparse(url).path
        correct_locale = (code == 'sk' and not destination.startswith(('/cs/', '/pl/'))) or (code in ('cs', 'pl') and destination.startswith('/' + code + '/'))
        if code in ('sk', 'cs', 'pl') and correct_locale and exists(url): links[code] = url
        head.remove(el)
    links[lang] = canonical
    for el in head.xpath('./link[@rel="canonical"]'): head.remove(el)
    etree.SubElement(head, 'link', rel='canonical', href=canonical)
    for code in ('sk', 'cs', 'pl'):
        if code in links: etree.SubElement(head, 'link', rel='alternate', hreflang=code, href=links[code])
    if 'sk' in links: etree.SubElement(head, 'link', rel='alternate', hreflang='x-default', href=links['sk'])

    title = head.find('title')
    if title is None:
        title = etree.SubElement(head, 'title')
        h1 = body.xpath('.//h1')
        title.text = (h1[0].text_content().strip() if h1 else 'Blog') + (' | Zahrada s nápadem' if lang == 'cs' else ' | Ogród z pomysłem')
    desc = head.xpath('./meta[@name="description"]')
    if not desc or not desc[0].get('content', '').strip():
        ps = body.xpath('.//article//p|.//main//p')
        content = ps[0].text_content().strip()[:155] if ps else title.text
        etree.SubElement(head, 'meta', name='description', content=content)
    if not head.xpath('./meta[@name="viewport"]'):
        etree.SubElement(head, 'meta', name='viewport', content='width=device-width, initial-scale=1')
    if not head.xpath('./link[@href="/multilang-2026.css?v=1"]'):
        etree.SubElement(head, 'link', rel='stylesheet', href='/multilang-2026.css?v=1')

    # Replace only site chrome, leaving article DOM, its images and its copy intact.
    for el in body.xpath('./header[contains(concat(" ",normalize-space(@class)," ")," ml-header ")] | ./footer[contains(concat(" ",normalize-space(@class)," ")," ml-footer ")]'):
        body.remove(el)
    for el in body.xpath('./script[@src="/locale-nav.js"]'): body.remove(el)
    for el in body.xpath('.//article/div[contains(concat(" ",normalize-space(@class)," ")," langs ")]'):
        el.getparent().remove(el)
    # Older workshop pages include a Slovak shell and a second language strip.
    if '/dilna/' in path or '/warsztat/' in path:
        for el in body.xpath('./header[contains(concat(" ",normalize-space(@class)," ")," site-header ")] | ./footer[contains(concat(" ",normalize-space(@class)," ")," footer ")] | ./div[contains(@class,"lang") or contains(@style,"text-align:right")]'):
            body.remove(el)
        for el in body.xpath('.//a[@class="back-link"]'):
            if el.get('href') == '/dielna-s-napadom/': el.set('href', '/cs/dilna/' if lang == 'cs' else '/pl/warsztat/')
    home, blog, workshop = (f'/{lang}/', f'/{lang}/blog/', f'/{lang}/dilna/' if lang == 'cs' else '/pl/warsztat/')
    labels = ('Zahrada <small>s nápadem</small>', 'Domů', 'Blog a návody', 'Dílna', 'Nástroje', 'Zavřít menu') if lang == 'cs' else ('Ogród <small>z pomysłem</small>', 'Strona główna', 'Blog i poradniki', 'Warsztat', 'Narzędzia', 'Zamknij menu')
    switch = []
    for code in ('sk', 'cs', 'pl'):
        if code == lang: switch.append(f'<strong aria-current="page">{code.upper()}</strong>')
        else: switch.append(f'<a hreflang="{code}" href="{links.get(code, "/" if code == "sk" else "/" + code + "/")}">{code.upper()}</a>')
    nav = f'<header class="ml-header"><div class="ml-wrap ml-top"><a class="ml-brand" href="{home}">{labels[0]}</a><button class="ml-menu" type="button" aria-label="Menu" aria-controls="locale-nav" aria-expanded="false">☰ Menu</button><nav id="locale-nav" class="ml-nav" aria-label="Hlavní navigace" ><a href="{home}">{labels[1]}</a><a href="{blog}">{labels[2]}</a><a href="{workshop}">{labels[3]}</a><a href="/pomocky.html" hreflang="sk">{labels[4]}</a><div class="ml-langs">{"".join(switch)}</div></nav></div></header>'
    footer = f'<footer class="ml-footer"><div class="ml-wrap"><strong>{html.fromstring("<span>"+labels[0]+"</span>").text_content()}</strong><span><a href="{home}">{labels[1]}</a> · <a href="{blog}">{labels[2]}</a> · <a href="{workshop}">{labels[3]}</a></span></div></footer>'
    body.insert(0, fragment(nav))
    body.append(fragment(footer))
    script = etree.SubElement(body, 'script', src='/locale-nav.js', defer='defer')
    output = '<!doctype html>' + html.tostring(doc, encoding='unicode', method='html')
    if output != src: file.write_text(output, encoding='utf-8')

if __name__ == '__main__':
    for locale in ('cs', 'pl'):
        for page in sorted((ROOT / locale).rglob('*.html')): normalized(page)
