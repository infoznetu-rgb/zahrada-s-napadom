"""Fail deployment if sitemap URLs or edited calculator pages send conflicting signals."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
import re
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
ORIGIN='https://zahradasnapadom.sk'

class Page(HTMLParser):
    def __init__(self,source):
        super().__init__(convert_charrefs=True)
        self.meta={}; self.canonical=[]; self.links=[]; self.resources=[]; self.h1=0
        self.refresh=False; self.examples=0; self.schemas=[]
        self.title=''; self.title_count=0; self.in_title=False
        self.schema_text=None
        self.feed(source)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='meta':
            self.meta[a.get('name',a.get('property','')).lower()]=a.get('content','')
            if a.get('http-equiv','').lower()=='refresh': self.refresh=True
        if tag=='link' and a.get('rel')=='canonical': self.canonical.append(a.get('href',''))
        if tag=='a' and a.get('href'): self.links.append(a['href'])
        for attribute in ('href','src'):
            if a.get(attribute): self.resources.append((attribute,a[attribute]))
        if tag=='h1': self.h1+=1
        if tag=='title': self.title_count+=1; self.in_title=True
        if 'data-tool-search-example' in a: self.examples+=1
        if tag=='script' and a.get('type')=='application/ld+json': self.schema_text=''
    def handle_data(self,data):
        if self.schema_text is not None: self.schema_text+=data
        if self.in_title: self.title+=data
    def handle_endtag(self,tag):
        if tag=='title': self.in_title=False
        if tag=='script' and self.schema_text is not None:
            self.schemas.append(json.loads(self.schema_text))
            self.schema_text=None

def local_file(url):
    path=unquote(urlsplit(url).path)
    target=(ROOT/(path.lstrip('/')+('index.html' if path.endswith('/') else ''))).resolve()
    if not target.is_relative_to(ROOT): raise ValueError('URL leaves site root: '+url)
    return target

def local_resource(url, source):
    parts=urlsplit(url)
    if not parts.path: return None
    if parts.scheme or parts.netloc:
        if parts.scheme not in ('http','https') or parts.netloc not in ('zahradasnapadom.sk','www.zahradasnapadom.sk'):
            return None
        target=ROOT/unquote(parts.path.lstrip('/'))
    elif parts.path.startswith('/'):
        target=ROOT/unquote(parts.path.lstrip('/'))
    else:
        target=source.parent/unquote(parts.path)
    if parts.path.endswith('/') or target.is_dir(): target=target/'index.html'
    return target.resolve()

def verify():
    urls=[node.text for node in ET.parse(ROOT/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    errors=[]; cache={}; titles={}
    def page(path):
        if path not in cache: cache[path]=Page(path.read_text(encoding='utf-8-sig'))
        return cache[path]
    if len(urls)!=len(set(urls)): errors.append('Duplicate sitemap URLs')
    for url in urls:
        if not url.startswith(ORIGIN+'/'): errors.append('Foreign sitemap URL: '+url); continue
        path=local_file(url)
        if not path.is_file(): errors.append('Missing sitemap page: '+url); continue
        p=page(path)
        if 'noindex' in p.meta.get('robots','').lower() or p.refresh: errors.append('Hidden or redirected sitemap page: '+url)
        if p.canonical!=[url]: errors.append('Canonical differs from sitemap URL: '+url)
        if p.title_count!=1 or not p.title.strip(): errors.append('Missing or duplicate title element: '+url)
        if p.title in titles: errors.append('Same title on two public pages: '+titles[p.title]+' and '+url)
        titles[p.title]=url
        for attribute,value in p.resources:
            if value.startswith(('mailto:','tel:','javascript:','data:','#')): continue
            target=local_resource(value,path)
            if target is not None and (not target.is_relative_to(ROOT) or not target.is_file() or target.stat().st_size == 0):
                errors.append('Broken local '+attribute+': '+url+' -> '+value)
    title_pages=json.loads((ROOT/'data/page-search-titles.json').read_text(encoding='utf-8'))
    for entry in title_pages:
        p=page(ROOT/entry['file'])
        expected=entry['title']+' | Záhrada s nápadom'
        if p.title!=expected: errors.append('Configured public title was overwritten: '+entry['file'])
        if p.meta.get('og:title')!=entry['title'] or p.meta.get('twitter:title')!=entry['title']: errors.append('Conflicting sharing title: '+entry['file'])
    tools=json.loads((ROOT/'data/tool-search.json').read_text(encoding='utf-8'))
    hub=page(ROOT/'pomocky.html')
    for tool in tools:
        url=ORIGIN+'/'+tool['file']; p=page(ROOT/tool['file'])
        if url not in urls: errors.append('Tool missing from sitemap: '+url)
        if p.h1!=1 or p.examples!=1: errors.append('Missing/duplicate heading or example: '+url)
        if not p.meta.get('description'): errors.append('Missing description: '+url)
        if '/'+tool['file'] not in hub.links: errors.append('Tool missing from hub: '+url)
        for related in tool['related']:
            href='/'+related
            if href not in p.links: errors.append('Missing related link: '+url+' -> '+href)
            target=local_file(href)
            if not target.is_file() or 'noindex' in page(target).meta.get('robots','').lower(): errors.append('Related tool is unavailable: '+href)
    hidden=json.loads((ROOT/'data/hidden-blog-slugs.json').read_text(encoding='utf-8'))
    for slug in hidden:
        hidden_path=ROOT/'blog'/slug/'index.html'
        if not hidden_path.is_file(): errors.append('Hidden article path is missing: '+str(slug)); continue
        hidden_page=page(hidden_path)
        source=hidden_path.read_text(encoding='utf-8-sig')
        if 'noindex' not in hidden_page.meta.get('robots','').lower() and not hidden_page.refresh:
            errors.append('Hidden blog article remains indexable: '+str(slug))
    curated=json.loads((ROOT/'data/seo-blog-100-list.json').read_text(encoding='utf-8'))
    curated_slugs=[str(item.get('slug','')).strip() for item in curated if isinstance(item,dict)]
    if not curated_slugs or len(curated_slugs)!=len(set(curated_slugs)):
        errors.append('Curated blog list is empty or contains duplicate slugs')
    sitemap_set=set(urls)
    def schema_nodes(value):
        if isinstance(value,dict):
            yield value
            for child in value.values(): yield from schema_nodes(child)
        elif isinstance(value,list):
            for child in value: yield from schema_nodes(child)
    for slug in curated_slugs:
        url=ORIGIN+'/blog/'+slug+'/'
        path=ROOT/'blog'/slug/'index.html'
        if not path.is_file(): errors.append('Curated blog article is missing: '+slug); continue
        p=page(path)
        if url not in sitemap_set: errors.append('Curated blog article is missing from sitemap: '+url)
        if p.canonical!=[url]: errors.append('Curated blog canonical mismatch: '+url)
        if p.title_count!=1 or not p.title.strip(): errors.append('Curated blog title is missing: '+url)
        if not p.meta.get('description','').strip(): errors.append('Curated blog description is missing: '+url)
        postings=[node for schema in p.schemas for node in schema_nodes(schema)
                  if node.get('url')==url and any(t in (node.get('@type') if isinstance(node.get('@type'),list) else [node.get('@type')]) for t in ('BlogPosting','Article'))]
        if not postings: errors.append('Curated blog article lacks Article/BlogPosting structured data: '+url)
    for css_path in ROOT.rglob('*.css'):
        if any(part in ('admin','.git','node_modules','work') for part in css_path.relative_to(ROOT).parts): continue
        css=css_path.read_text(encoding='utf-8',errors='ignore')
        for match in re.finditer(r'url\(\s*(["\']?)(.*?)\1\s*\)',css,re.IGNORECASE):
            value=match.group(2).strip()
            if not value or value.startswith(('data:','#')): continue
            target=local_resource(value,css_path)
            if target is not None and (not target.is_relative_to(ROOT) or not target.is_file() or target.stat().st_size == 0):
                errors.append('Broken CSS asset: '+css_path.relative_to(ROOT).as_posix()+' -> '+value)
    if errors: raise SystemExit('\n'.join(errors))
    print(f'Public search checks passed: {len(urls)} canonical sitemap URLs; {len(tools)} tool pages and their related links; no hidden pages in sitemap')

if __name__=='__main__': verify()
