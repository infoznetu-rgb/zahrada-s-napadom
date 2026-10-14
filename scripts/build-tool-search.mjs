// Keep useful tool content and crawlable links in HTML, without requiring JavaScript.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const origin='https://zahradasnapadom.sk/';
const tools=JSON.parse(readFileSync(join(root,'data/tool-search.json'),'utf8'));
const byFile=new Map(tools.map(tool=>[tool.file,tool]));
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
for(const tool of tools){
  const path=join(root,tool.file);
  let html=readFileSync(path,'utf8');
  if(/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html))throw Error(`Refusing to edit hidden tool: ${tool.file}`);
  html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${esc(tool.title)} | Záhrada s nápadom</title>`)
    .replace(/(<meta property="og:title" content=")[^"]*/,`$1${esc(tool.title)}`)
    .replace(/<h1>[^<]*<\/h1>/,`<h1>${esc(tool.heading)}</h1>`)
    .replace(/majster-tools\.js\?v=[^"\s>]+/g,'majster-tools.js?v=search20261014');
  html=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,(script,body)=>{
    const schema=JSON.parse(body);
    for(const item of schema['@graph']||[]){
      if(item['@type']==='WebApplication')item.name=tool.title;
      if(item['@type']==='BreadcrumbList')item.itemListElement=[
        {'@type':'ListItem',position:1,name:'Domov',item:origin},
        {'@type':'ListItem',position:2,name:'Kalkulačky a pomôcky',item:origin+'pomocky.html'},
        {'@type':'ListItem',position:3,name:tool.title,item:origin+tool.file}
      ];
    }
    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  });
  html=html.replace(/<a class="utility-back"[^>]*>[\s\S]*?<\/a>/,
    '<nav class="utility-back" aria-label="Drobková navigácia"><a href="/">Domov</a> / <a href="/pomocky.html">Kalkulačky a pomôcky</a></nav>');
  const formId=/<form id="([^"]+)"/.exec(html)?.[1];
  if(formId&&!html.includes('data-tool-jump')){
    html=html.replace(/(<section class="container utility-hero">[\s\S]*?)(<\/section>)/,
      `$1<a class="btn primary" data-tool-jump href="#${formId}">Prejsť na ${tool.file==='hmozdinky-vrtaky.html'?'výber kotvenia':'výpočet'} ↓</a>$2`);
  }
  const related=tool.related.map(file=>{
    const target=byFile.get(file);
    if(!target&&file!=='kalkulacka-ceny-vyrobku.html')throw Error(`Unknown related tool: ${file}`);
    return `<a href="/${file}">${esc(target?.title||'Kalkulačka ceny vlastného výrobku')} →</a>`;
  }).join('');
  const section=`<section class="container tool-section" data-tool-search-example><div class="tool-copy"><span class="kicker">PRÍKLAD POUŽITIA</span><h2>${esc(tool.file==='hmozdinky-vrtaky.html'?'Ako použiť radcu pri výbere kotvenia':'Praktický príklad krok za krokom')}</h2><p>${esc(tool.example)}</p><h3>Súvisiace kalkulačky a pomôcky</h3><div class="utility-links">${related}</div></div></section>`;
  const exampleSection=/<section\b[^>]*data-tool-search-example[^>]*>[\s\S]*?<\/section>/;
  html=exampleSection.test(html)?html.replace(exampleSection,section):html.replace(/<\/main>/,section+'\n</main>');
  writeFileSync(path,html);
}
console.log(`Updated ${tools.length} existing tools: titles, headings, breadcrumbs, examples and related links`);

const hubPath=join(root,'pomocky.html');
let hub=readFileSync(hubPath,'utf8');
const hubTitle='Kalkulačky materiálu pre záhradu, dom a dielňu';
hub=hub.replace(/<title>[\s\S]*?<\/title>/,`<title>${hubTitle} | Záhrada s nápadom</title>`)
  .replace(/(<meta property="og:title" content=")[^"]*/,`$1${hubTitle}`)
  .replace(/<h1>[^<]*<\/h1>/,`<h1>${hubTitle}</h1>`)
  .replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/,(script,body)=>{
    const schema=JSON.parse(body);
    schema['@graph']=schema['@graph'].filter(item=>item['@type']!=='ItemList');
    const collection=schema['@graph'].find(item=>item['@type']==='CollectionPage');
    collection.name=hubTitle;
    collection.mainEntity={'@id':origin+'pomocky.html#kalkulacky'};
    schema['@graph'].push({'@type':'ItemList','@id':origin+'pomocky.html#kalkulacky',name:hubTitle,
      itemListElement:[...tools,{file:'kalkulacka-ceny-vyrobku.html',title:'Kalkulačka ceny výrobku'}].map((tool,i)=>({'@type':'ListItem',position:i+1,name:tool.title,url:origin+tool.file}))});
    return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  });
// Remove a literal escaped newline that was visible between the final two cards.
hub=hub.replace('</a>\\n<a','</a>\n<a');
writeFileSync(hubPath,hub);
