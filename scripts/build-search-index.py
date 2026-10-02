"""Index public Slovak HTML and connect static articles to the local app library."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta = {}; self.canonical = ''; self.lang = 'sk'
        self.text = []; self.heading = []; self.in_h1 = False
        self.omit = 0
        self.skip = 0; self.schema = []; self.in_schema = False; self.schema_text = ''
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('head', 'nav', 'footer', 'aside', 'a'): self.omit += 1
        if tag == 'html': self.lang = a.get('lang', 'sk')
        if tag == 'meta': self.meta[a.get('name', a.get('property', ''))] = a.get('content', '')
        if tag == 'link' and a.get('rel') == 'canonical': self.canonical = a.get('href', '')
        if tag == 'h1': self.in_h1 = True
        if tag in ('script', 'style'):
            self.skip += 1
            if tag == 'script' and a.get('type') == 'application/ld+json':
                self.in_schema = True; self.schema_text = ''
    def handle_endtag(self, tag):
        if tag in ('head', 'nav', 'footer', 'aside', 'a'): self.omit = max(0, self.omit - 1)
        if tag == 'h1': self.in_h1 = False
        if tag in ('script', 'style'):
            self.skip = max(0, self.skip - 1)
            if tag == 'script' and self.in_schema:
                try: self.schema.append(json.loads(self.schema_text))
                except ValueError: pass
                self.in_schema = False
    def handle_data(self, data):
        if self.in_schema: self.schema_text += data
        if not self.skip:
            if not self.omit: self.text.append(data)
            if self.in_h1: self.heading.append(data)

def schema_types(value):
    if isinstance(value, dict):
        kind = value.get('@type', [])
        yield from ([kind] if isinstance(kind, str) else kind)
        for item in value.values(): yield from schema_types(item)
    elif isinstance(value, list):
        for item in value: yield from schema_types(item)

def build(root=ROOT):
    index = {}
    connected = 0
    for path in sorted(root.rglob('*.html')):
        if any(part in ('admin', '.git', 'work', 'node_modules') for part in path.relative_to(root).parts): continue
        source = path.read_text(encoding='utf-8-sig')
        original = source
        for asset in ('app.js', 'app.css', 'cms-public.js', 'moja-zahrada.js', 'home-clarity.css'):
            source = re.sub(r'(?<![\w-])' + re.escape(asset) + r'\?v=[^"\s>]+', asset + '?v=improve20261002b', source)
        page = Page(); page.feed(source)
        if source != original: path.write_text(source, encoding='utf-8')
        if 'noindex' in page.meta.get('robots', '').lower() or 'http-equiv="refresh"' in source.lower(): continue
        if not page.lang.lower().startswith('sk'): continue
        kinds = {kind for schema in page.schema for kind in schema_types(schema)}
        is_article = bool(kinds & {'BlogPosting', 'Article', 'Recipe', 'HowTo'}) or bool(re.search(r'class="[^"]*\bpost-page\b', source))
        url = urlparse(page.canonical)
        title = ' '.join(' '.join(page.heading).split())
        if not title or url.hostname != 'zahradasnapadom.sk' or not is_article: continue
        slug = url.path.rstrip('/').split('/')[-1].removeprefix('clanok-').removesuffix('.html')
        item = dict(slug=slug, title=title, excerpt=page.meta.get('description', ''), category='Recept' if 'Recipe' in kinds else 'Článok', cover_url=page.meta.get('og:image', ''), content_type='recipe' if 'Recipe' in kinds else 'blog', content=' '.join(' '.join(page.text).split())[:2500], url=page.canonical)
        # Canonical variants share one search result; modern clean URLs win.
        if page.canonical not in index or path.name == 'index.html': index[page.canonical] = item
        if 'article-library.js' not in source:
            source = re.sub(r'</body\s*>', '<script src="/article-library.js?v=1" defer></script></body>', source, count=1, flags=re.I)
            path.write_text(source, encoding='utf-8'); connected += 1
    output = list(index.values())
    (root / 'search-index.json').write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'Search index: {len(output)} canonical articles; connected {connected} static pages')
    return output

if __name__ == '__main__': build()
