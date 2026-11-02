"""Check article images after the deployment transforms, independent of CSS classes."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
import json

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://zahradasnapadom.sk'


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.main = False
        self.images = []
        self.meta = {}
        self.schemas = []
        self.schema_text = None
        self.redirect = False
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'main':
            self.main = True
        if tag == 'img' and self.main:
            self.images.append(a)
        if tag == 'meta':
            self.meta[a.get('property', a.get('name', '')).lower()] = a.get('content', '')
            if a.get('http-equiv', '').lower() == 'refresh':
                self.redirect = True
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.schema_text = ''

    def handle_data(self, data):
        if self.schema_text is not None:
            self.schema_text += data

    def handle_endtag(self, tag):
        if tag == 'main':
            self.main = False
        if tag == 'script' and self.schema_text is not None:
            self.schemas.append(json.loads(self.schema_text))
            self.schema_text = None


def nodes(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from nodes(child)
    elif isinstance(value, list):
        for child in value:
            yield from nodes(child)


def image_urls(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for child in value:
            yield from image_urls(child)
    elif isinstance(value, dict):
        yield from image_urls(value.get('url', value.get('contentUrl', [])))


def verify():
    errors = []
    checked = 0
    hidden = 0
    for path in sorted((ROOT / 'blog').glob('*/index.html')):
        page = Page(path.read_text(encoding='utf-8-sig'))
        if page.redirect or 'noindex' in page.meta.get('robots', '').lower():
            hidden += 1
            continue
        checked += 1
        label = path.relative_to(ROOT).as_posix()
        base = ORIGIN + '/blog/' + path.parent.name + '/'
        if not page.images:
            errors.append(label + ': missing article image')
            continue
        hero = page.images[0]
        url = urljoin(base, hero.get('src', ''))
        parts = urlsplit(url)
        target = (ROOT / unquote(parts.path).lstrip('/')).resolve()
        if parts.netloc != 'zahradasnapadom.sk' or not target.is_relative_to(ROOT) or not target.is_file() or not target.stat().st_size:
            errors.append(label + ': missing local image ' + url)
        if not hero.get('alt', '').strip():
            errors.append(label + ': missing article image alt text')
        for key in ('og:image', 'twitter:image'):
            if key in page.meta and urljoin(base, page.meta[key]) != url:
                errors.append(label + ': ' + key + ' differs from article image')
        articles = [node for schema in page.schemas for node in nodes(schema)
                    if set(node.get('@type', []) if isinstance(node.get('@type'), list)
                           else [node.get('@type')]) & {'Article', 'BlogPosting'}]
        if not articles:
            errors.append(label + ': missing Article/BlogPosting schema')
        for article in articles:
            if url not in [urljoin(base, value) for value in image_urls(article.get('image'))]:
                errors.append(label + ': schema image differs from article image')
    if errors:
        raise SystemExit('\n'.join(errors))
    print(f'Article image checks passed: {checked} indexable articles; existing images and alt text; matching sharing and schema images; {hidden} hidden/redirect pages skipped')


if __name__ == '__main__':
    verify()
