"""Audit the final public build, including hidden routes and archive consistency.

This verifies technical/content integrity; it does not predict AdSense approval.
"""
from collections import Counter
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from datetime import datetime, timezone
import importlib.util
import json
import re

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://zahradasnapadom.sk'


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / file)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


search = module('public_search', 'verify-public-search.py')
images = module('article_images', 'verify-article-images.py')


class Page(search.Page):
    def __init__(self, source):
        self.ids = set()
        self.cards = []
        self.in_main = False
        self.skip = 0
        self.words = []
        self.image_tags = []
        self.refresh_url = ''
        super().__init__(source)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            self.ids.add(a['id'])
        if tag == 'main':
            self.in_main = True
        if tag in ('script', 'style', 'nav', 'footer'):
            self.skip += 1
        if tag == 'img' and self.in_main:
            self.image_tags.append(a)
        if tag == 'article' and a.get('data-post-slug'):
            self.cards.append(a['data-post-slug'])
        if tag == 'meta' and a.get('http-equiv', '').lower() == 'refresh':
            match = re.search(r'url\s*=\s*(.*)', a.get('content', ''), re.I)
            if match:
                self.refresh_url = match[1].strip(' "\'')
        super().handle_starttag(tag, attrs)

    def handle_data(self, data):
        if self.in_main and not self.skip:
            self.words.extend(re.findall(r'\b\w+\b', data))
        super().handle_data(data)

    def handle_endtag(self, tag):
        if tag == 'main':
            self.in_main = False
        if tag in ('script', 'style', 'nav', 'footer'):
            self.skip = max(0, self.skip - 1)
        super().handle_endtag(tag)


def verify():
    from PIL import Image
    items = json.loads((ROOT / 'data/seo-blog-100-list.json').read_text(encoding='utf-8'))
    reviewed = {item['slug'] for item in items}
    pages = {}
    source = {}
    issues = []
    fragments = []
    links = 0
    decoded = set()
    redirects = {}
    rows = []
    for path in ROOT.rglob('*.html'):
        if any(part in ('.git', 'admin', 'work', 'node_modules') for part in path.relative_to(ROOT).parts):
            continue
        source[path] = path.read_text(encoding='utf-8-sig')
        pages[path] = Page(source[path])
    for path, p in pages.items():
        label = path.relative_to(ROOT).as_posix()
        route = '/' + label.removesuffix('index.html') if path.name == 'index.html' else '/' + label
        base = ORIGIN + route
        if p.refresh:
            target = search.local_resource(urljoin(base, p.refresh_url), path)
            if target is None or target not in pages:
                issues.append(label + ': redirect target is missing')
            elif pages[target].refresh or 'noindex' in pages[target].meta.get('robots', '').lower():
                issues.append(label + ': redirect target is hidden or redirects again')
            redirects[route] = urljoin(base, p.refresh_url)
            continue
        if 'noindex' in p.meta.get('robots', '').lower():
            continue
        if not p.canonical:
            # Private tools and utility screens may intentionally be excluded from search.
            continue
        if p.title_count != 1 or not p.title.strip() or p.h1 != 1:
            issues.append(label + ': missing/duplicate title or main heading')
        for attribute, value in p.resources:
            if value.startswith(('mailto:', 'tel:', 'javascript:', 'data:', '#')):
                continue
            target = search.local_resource(value, path)
            if target is not None and (not target.is_relative_to(ROOT) or not target.is_file() or not target.stat().st_size):
                issues.append(label + ': broken local resource ' + value)
        for href in p.links:
            target = search.local_resource(href, path)
            if target is None:
                continue
            links += 1
            parts = urlsplit(href)
            if parts.fragment and target in pages and unquote(parts.fragment) not in pages[target].ids:
                fragments.append(label + ' -> ' + href)
        if path.parent.parent == ROOT / 'blog':
            slug = path.parent.name
            if slug not in reviewed:
                issues.append(label + ': unreviewed article is indexable')
            text = ' '.join(p.words).lower()
            if any(token in text for token in ('lorem ipsum', 'skontrolujte rastlinu pôdu a počasie')):
                issues.append(label + ': unfinished template text')
            if len(p.words) < 180:
                issues.append(label + ': insufficient main text for a complete guide')
            if not p.image_tags:
                issues.append(label + ': missing main image')
                continue
            hero = p.image_tags[0]
            asset = search.local_resource(hero.get('src', ''), path)
            if asset is None or not asset.is_file():
                issues.append(label + ': main image is not local')
                continue
            try:
                with Image.open(asset) as bitmap:
                    width, height = bitmap.size
                    if asset not in decoded:
                        bitmap.load()
                        decoded.add(asset)
                if (hero.get('width'), hero.get('height')) != (str(width), str(height)):
                    issues.append(label + ': incorrect image dimensions')
            except Exception as error:
                issues.append(label + ': unreadable image: ' + str(error))
            if hero.get('loading') != 'eager' or hero.get('fetchpriority') != 'high':
                issues.append(label + ': main image has inappropriate loading priority')
            rows.append({'slug': slug, 'words': len(p.words), 'image': hero.get('src'), 'image_bytes': asset.stat().st_size, 'technical_checks': 'passed'})
    archive = pages[ROOT / 'blog.html'].cards
    if Counter(archive) != Counter(reviewed):
        issues.append('Blog archive differs from the reviewed article catalog or has duplicate cards')
    hidden = set(json.loads((ROOT / 'data/hidden-blog-slugs.json').read_text(encoding='utf-8')))
    if hidden & reviewed:
        issues.append('Reviewed and hidden article lists overlap')
    all_blog = list((ROOT / 'blog').glob('*/index.html'))
    if len(all_blog) != len(reviewed) + len(hidden):
        issues.append('Some blog routes are missing from the reviewed/hidden disposition')
    report = {
        'checked_at': datetime.now(timezone.utc).isoformat(),
        'scope': 'Final build: public HTML/resources, blog content integrity, archive, local images and redirect destinations. This is not an AdSense approval prediction or a claim of exhaustive factual verification.',
        'summary': {'html_files': len(pages), 'blog_routes': len(all_blog), 'reviewed_articles': len(reviewed), 'merged_or_redirected_blog_routes': len(hidden), 'internal_links': links, 'decoded_images': len(decoded), 'errors': len(issues), 'fragment_warnings': len(fragments)},
        'errors': issues, 'fragment_warnings': fragments, 'articles': rows,
    }
    external_path = ROOT / 'data/external-link-audit.json'
    if external_path.is_file():
        external = json.loads(external_path.read_text(encoding='utf-8'))
        checks = external.get('checks', [])
        report['external_source_snapshot'] = {
            'checked_on': external.get('checked_on'),
            'successful': sum(row.get('status') == 200 for row in checks),
            'inconclusive': [row for row in checks if row.get('status') != 200],
            'repaired_broken_source_urls': external.get('repaired_broken_source_urls'),
            'note': 'External source availability is not a deployment gate; inconclusive requests are explicitly retained.',
        }
    (ROOT / 'data/site-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report['summary'], ensure_ascii=False))
    if issues:
        raise SystemExit('\n'.join(issues))
    if fragments:
        print('Fragment warnings:\n' + '\n'.join(fragments[:25]))


if __name__ == '__main__':
    verify()
