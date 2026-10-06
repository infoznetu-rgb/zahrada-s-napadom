"""Apply curated article covers to static articles, sharing metadata and cards."""
import json,re
from html import escape
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
COVERS=json.loads((ROOT/'data/article-covers.json').read_text(encoding='utf-8'))
def attr(tag,name,value):
    replacement=name+'="'+escape(str(value),quote=True)+'"'
    if re.search(r'\b'+name+r'="[^"]*"',tag):
        return re.sub(r'\b'+name+r'="[^"]*"',lambda m:replacement,tag,count=1)
    return tag.replace('>', ' '+replacement+'>',1)
def image(tag,cover,hero=False):
    tag=attr(tag,'src',cover['url'])
    tag=attr(tag,'alt',cover['alt'])
    tag=attr(tag,'width',cover['width'])
    tag=attr(tag,'height',cover['height'])
    if hero:
        tag=attr(tag,'data-curated-cover','1')
        tag=attr(tag,'loading','eager')
        tag=attr(tag,'fetchpriority','high')
    return tag
def update(source):
    original=source
    match=re.search(r'<link[^>]*rel="canonical"[^>]*href="([^"]+)"',source)
    path=urlparse(match[1]).path if match else ''
    slug=path.rstrip('/').split('/')[-1]
    if slug=='index.html': slug=path.rstrip('/').split('/')[-2]
    cover=COVERS.get(slug) if path.startswith('/blog/') else None
    if cover:
        def figure(m):
            value=re.sub(r'<img\b[^>]*>',lambda x:image(x[0],cover,True),m[0],count=1)
            caption='<figcaption>'+escape(cover['caption'])+' · AI ilustračný obrázok.</figcaption>'
            if '<figcaption' in value:
                value=re.sub(r'<figcaption[^>]*>.*?</figcaption>',lambda x:caption,value,flags=re.S)
            else: value=value.replace('</figure>',caption+'</figure>')
            return value
        hero_pattern=r'<figure\b[^>]*class="post-hero"[^>]*>.*?</figure>'
        if not re.search(hero_pattern,source,re.S):
            hero_pattern=r'<figure\b[^>]*>.*?</figure>'
        source=re.sub(hero_pattern,figure,source,count=1,flags=re.S)
        absolute='https://zahradasnapadom.sk'+cover['url']
        source=re.sub(r'<meta[^>]*(?:property="og:image"|name="twitter:image")[^>]*>',lambda m:attr(m[0],'content',absolute),source)
        def schema(m):
            value=json.loads(m[1])
            def visit(v):
                if isinstance(v,dict):
                    kind=v.get('@type')
                    if kind in ('BlogPosting','Article'): v['image']=absolute
                    for x in v.values(): visit(x)
                elif isinstance(v,list):
                    for x in v: visit(x)
            visit(value)
            return '<script type="application/ld+json">'+json.dumps(value,ensure_ascii=False,separators=(',',':'))+'</script>'
        source=re.sub(r'<script type="application/ld\+json">(.*?)</script>',schema,source,flags=re.S)
        source=re.sub(r'"cover_url"\s*:\s*"[^"]*"',lambda m:'"cover_url":'+json.dumps(cover['url']),source)
    def card(m):
        block=m[0]
        match=re.search(r'data-post-slug="([^"]+)"',block)
        cover=COVERS.get(match[1]) if match else None
        if cover: block=re.sub(r'<img\b[^>]*>',lambda x:image(x[0],cover),block,count=1)
        return block
    source=re.sub(r'<article\b[^>]*data-post-slug="[^"]+"[^>]*>.*?</article>',card,source,flags=re.S)
    return source
def build():
    cms_path=ROOT/'cms-public.js'
    if cms_path.is_file():
        cms=cms_path.read_text(encoding='utf-8')
        urls={slug:cover['url'] for slug,cover in COVERS.items()}
        cms=re.sub(r'const cmsArticleCovers=.*?;\n',lambda m:'const cmsArticleCovers='+json.dumps(urls,separators=(',',':'))+';\n',cms,count=1)
        cms_path.write_text(cms,encoding='utf-8')
    changed=0
    for path in ROOT.rglob('*.html'):
        if any(x in ('.git','admin','work','node_modules') for x in path.relative_to(ROOT).parts):continue
        source=path.read_text(encoding='utf-8-sig')
        result=update(source)
        result=re.sub(r'zahrada\.js\?v=[^"\s>]+','zahrada.js?v=articlecovers20261006',result)
        if result!=source:path.write_text(result,encoding='utf-8');changed+=1
    print(f'Article covers: updated {changed} pages')
if __name__=='__main__':build()
