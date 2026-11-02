"""Publish the reviewed archive from article HTML, keeping every image surface in sync."""
from html import escape, unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
import importlib.util
import json
import re

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://zahradasnapadom.sk'
spec = importlib.util.spec_from_file_location('article_images', ROOT / 'scripts/verify-article-images.py')
images = importlib.util.module_from_spec(spec)
spec.loader.exec_module(images)


def meta(source, key, value):
    pattern = r'<meta\b[^>]*(?:name|property)=["\']' + re.escape(key) + r'["\'][^>]*>'
    tag = '<meta ' + ('property' if key.startswith(('og:', 'article:')) else 'name') + '="' + key + '" content="' + escape(str(value), quote=True) + '">'
    if re.search(pattern, source, re.I):
        return re.sub(pattern, lambda _: tag, source, flags=re.I)
    return source.replace('</head>', tag + '</head>', 1)


def attr(tag, key, value):
    pattern = r'\b' + re.escape(key) + r'\s*=\s*(["\']).*?\1'
    text = key + '="' + escape(str(value), quote=True) + '"'
    return re.sub(pattern, lambda _: text, tag, count=1) if re.search(pattern, tag) else tag[:-1] + ' ' + text + '>'


class Hero(images.Page):
    def __init__(self, source):
        self.hero_tag = ''
        super().__init__(source)

    def handle_starttag(self, tag, attrs):
        if tag == 'img' and self.main and not self.hero_tag:
            self.hero_tag = self.get_starttag_text()
        super().handle_starttag(tag, attrs)


def build():
    from PIL import Image
    catalog = ROOT / 'data/seo-blog-100-list.json'
    items = json.loads(catalog.read_text(encoding='utf-8'))
    cards = []
    changed = 0
    for item in items:
        slug = item['slug']
        path = ROOT / 'blog' / slug / 'index.html'
        source = path.read_text(encoding='utf-8-sig')
        original = source
        page = Hero(source)
        if page.redirect or 'noindex' in page.meta.get('robots', '') or not page.images:
            raise SystemExit('Reviewed article is hidden or lacks an image: ' + slug)
        hero = page.images[0]
        url = urljoin(ORIGIN + '/blog/' + slug + '/', hero['src'])
        parts = urlsplit(url)
        asset = (ROOT / unquote(parts.path).lstrip('/')).resolve()
        if parts.netloc != 'zahradasnapadom.sk' or not asset.is_relative_to(ROOT) or not asset.is_file():
            raise SystemExit('Article image must exist locally: ' + slug)
        with Image.open(asset) as bitmap:
            width, height = bitmap.size
            bitmap.verify()
        alt = hero.get('alt', '').strip()
        if not alt:
            raise SystemExit('Article image needs meaningful alt text: ' + slug)
        heading = re.search(r'<h1\b[^>]*>(.*?)</h1>', source, re.S | re.I)
        title = unescape(re.sub('<[^>]+>', '', heading[1])).strip() if heading else ''
        if not title:
            raise SystemExit('Missing reviewed heading: ' + slug)
        image_tag = page.hero_tag
        for key, value in [('width', width), ('height', height), ('loading', 'eager'), ('fetchpriority', 'high'), ('decoding', 'async')]:
            image_tag = attr(image_tag, key, value)
        source = source.replace(page.hero_tag, image_tag, 1)
        for key, value in [('og:image', url), ('twitter:image', url), ('og:image:width', width), ('og:image:height', height), ('og:title', title), ('twitter:title', title)]:
            source = meta(source, key, value)

        def schema(match):
            value = json.loads(match[1])
            changed = False
            for node in images.nodes(value):
                kinds = node.get('@type', [])
                if set(kinds if isinstance(kinds, list) else [kinds]) & {'Article', 'BlogPosting'}:
                    node['image'] = url
                    node['headline'] = title
                    changed = True
            return '<script type="application/ld+json">' + json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '</script>' if changed else match[0]

        source = re.sub(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', schema, source, flags=re.S)
        source = re.sub(r'"cover_url"\s*:\s*"[^"]*"', lambda _: '"cover_url":' + json.dumps(parts.path), source)
        if source != original:
            path.write_text(source, encoding='utf-8')
            changed += 1
        item.update(title=title, excerpt=page.meta.get('description', item.get('excerpt', '')), cover_url=parts.path)
        href = '/blog/' + slug + '/'
        e = lambda value: escape(str(value), quote=True)
        cards.append('<article class="cms-post-card is-blog" data-post-slug="' + e(slug) + '" data-post-type="blog" data-published-at="' + e(item.get('published_at', '')) + '"><a class="cms-post-image" href="' + href + '"><img src="' + e(parts.path) + '" alt="' + e(alt) + '" width="' + str(width) + '" height="' + str(height) + '" loading="lazy" decoding="async"></a><div class="cms-post-body"><span class="tag">BLOG · ' + e(item.get('category', 'Záhrada')) + '</span><h3><a href="' + href + '">' + e(title) + '</a></h3><p>' + e(item['excerpt']) + '</p><div class="cms-card-actions"><a class="project-link" href="' + href + '">Čítať článok →</a></div></div></article>')
    catalog.write_text(json.dumps(items, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    archive = ROOT / 'blog.html'
    source = archive.read_text(encoding='utf-8-sig')
    pattern = r'(<div id="cms-blog-list"[^>]*>).*?(</div>\s*<div id="blog-empty")'
    source, count = re.subn(pattern, lambda m: m[1] + ''.join(cards) + m[2], source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit('Could not locate the static blog archive')
    archive.write_text(source, encoding='utf-8')
    print(f'Reviewed archive: {len(items)} unique articles and static cards; synchronized {changed} article image and heading records')


if __name__ == '__main__':
    build()
