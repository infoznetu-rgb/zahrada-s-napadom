"""Fail deployment if sitemap URLs or edited calculator pages send conflicting signals."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
ORIGIN='https://zahradasnapadom.sk'

class Page(HTMLParser):
    def __init__(self,source):
        super().__init__(convert_charrefs=True)
        self.meta={}; self.canonical=[]; self.links=[]; self.h1=0
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
    if errors: raise SystemExit('\n'.join(errors))
    print(f'Public search checks passed: {len(urls)} canonical sitemap URLs; {len(tools)} tool pages and their related links; no hidden pages in sitemap')

if __name__=='__main__': verify()
