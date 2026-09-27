"""Audit every existing Czech and Polish page against the repository tree."""
from pathlib import Path
from urllib.parse import urlparse, unquote
from collections import Counter
from lxml import html, etree

root = Path(__file__).resolve().parents[1]
host = 'https://zahradasnapadom.sk'
pages = sorted((*root.joinpath('cs').rglob('*.html'), *root.joinpath('pl').rglob('*.html')))
counts = Counter()
problems = []

def local_target(value):
    if value.startswith(host + '/'): value = value[len(host):]
    elif not value.startswith('/'): return None
    path = urlparse(value).path
    target = root / unquote(path.lstrip('/'))
    if path.endswith('/') or target.is_dir(): target /= 'index.html'
    return target

for file in pages:
    lang = file.relative_to(root).parts[0]
    counts[lang] += 1
    document = html.fromstring(file.read_text(encoding='utf-8'))
    route = host + '/' + file.parent.relative_to(root).as_posix() + '/'
    checks = {
        'title': document.xpath('//title[normalize-space()]'),
        'description': document.xpath('//meta[@name="description" and normalize-space(@content)]'),
        'canonical': document.xpath('//link[@rel="canonical" and @href=$route]', route=route),
        'navigation': document.xpath('//header[contains(concat(" ",normalize-space(@class)," ")," ml-header ")]//nav'),
        'mobile menu': document.xpath('//button[@class="ml-menu" and @aria-controls="locale-nav"]'),
        'footer': document.xpath('//footer[contains(concat(" ",normalize-space(@class)," ")," ml-footer ")]'),
        'self hreflang': document.xpath('//link[@rel="alternate" and @hreflang=$lang and @href=$route]', lang=lang, route=route),
    }
    for key, found in checks.items():
        if len(found) != 1: problems.append(f'{file.relative_to(root)}: {key} ({len(found)})')
    for element in document.xpath('//*[@href or @src]'):
        for attribute in ('href', 'src'):
            value = element.get(attribute, '')
            target = local_target(value)
            if target is not None and not target.is_file():
                problems.append(f'{file.relative_to(root)}: missing {attribute} {value}')
    for element in document.xpath('//link[@rel="alternate"]'):
        value = element.get('href', '')
        if not value.startswith(host + '/') or not local_target(value).is_file():
            problems.append(f'{file.relative_to(root)}: invalid hreflang {value}')

tree = etree.parse(str(root / 'sitemap.xml'))
locations = tree.xpath('//*[local-name()="loc"]/text()')
if len(locations) != len(set(locations)): problems.append('sitemap: duplicate URL')
for file in pages:
    route = host + '/' + file.parent.relative_to(root).as_posix() + '/'
    if route not in locations: problems.append(f'sitemap: missing {route}')

print(f'Pages: {counts["cs"]} CS, {counts["pl"]} PL; articles: {counts["cs"]-4} CS, {counts["pl"]-4} PL')
print(f'Sitemap: {len(locations)} unique URLs' if len(locations) == len(set(locations)) else 'Sitemap has duplicate URLs')
print(f'Problems: {len(problems)}')
for problem in problems: print(problem)
raise SystemExit(bool(problems))
