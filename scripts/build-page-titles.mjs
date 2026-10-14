// The subject comes first; the brand follows. Keep all title signals consistent.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const pages=JSON.parse(readFileSync(join(root,'data/page-search-titles.json'),'utf8'));
const brand='Záhrada s nápadom';
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const attr=(tag,name)=>new RegExp(`\\b${name}=["']([^"']*)["']`,'i').exec(tag)?.[1];
for(const page of pages){
  const path=join(root,page.file);
  let html=readFileSync(path,'utf8');
  const metas=html.match(/<meta\b[^>]*>/gi)||[];
  if(metas.some(tag=>attr(tag,'name')?.toLowerCase()==='robots'&&/noindex/i.test(attr(tag,'content')||''))||/http-equiv=["']refresh/i.test(html))throw Error(`Refusing hidden page: ${page.file}`);
  if((html.match(/<title>/g)||[]).length!==1)throw Error(`Expected one title: ${page.file}`);
  const canonical=(html.match(/<link\b[^>]*>/gi)||[]).find(tag=>attr(tag,'rel')==='canonical');
  const url=canonical&&attr(canonical,'href');
  if(!url)throw Error(`Missing canonical URL: ${page.file}`);
  const title=page.title+' | '+brand;
  html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(title)}</title>`);
  for(const [key,value] of [['og:title',page.title],['twitter:title',page.title]]){
    let found=false;
    html=html.replace(/<meta\b[^>]*>/gi,tag=>{
      if(attr(tag,key==='og:title'?'property':'name')!==key)return tag;
      found=true;
      return tag.replace(/\bcontent=["'][^"']*["']/i,`content="${esc(value)}"`);
    });
    if(!found)html=html.replace('</head>',`<meta ${key==='og:title'?'property':'name'}="${key}" content="${esc(value)}">\n</head>`);
  }
  html=html.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,(block,body)=>{
    const data=JSON.parse(body);
    const visit=value=>{
      if(!value||typeof value!=='object')return;
      if(Array.isArray(value)){value.forEach(visit);return;}
      const types=Array.isArray(value['@type'])?value['@type']:[value['@type']];
      if(value.url===url&&types.some(type=>['WebPage','CollectionPage','WebApplication'].includes(type)))value.name=page.title;
      Object.values(value).forEach(visit);
    };
    visit(data);
    return block.replace(body,JSON.stringify(data));
  });
  writeFileSync(path,html);
}
console.log(`Updated titles and metadata for ${pages.length} public pages`);
