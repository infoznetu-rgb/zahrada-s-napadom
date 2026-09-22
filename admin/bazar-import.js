(()=>{
  const $=selector=>document.querySelector(selector);
  const CATEGORIES=["Bývanie","Bytové doplnky","Domáce potreby","Domáce spotrebiče","Kuchynské spotrebiče","Stavba","Drevo","Dvere","Izolácie","Kotle, bojlery","Krby, pece","Kúrenie, palivá","Lešenia","Obklady, dlažby","Okná","Podlahy","Radiátory","Sanita","Stavebné materiály","Strecha","Tehly, kvádre","Zabezpečenie domu","Žumpy, septiky","Záhrada","Bazény","Malotraktory","Semená, rastliny","Snežná technika","Stromy, dreviny","Zavlažovanie","Záhradná chémia","Záhradná technika","Záhradné doplnky","Záhradné grily","Záhradné služby","Záhradné stavby","Záhradný nábytok","Čerpadlá, pumpy","Ostatné"];
  const REGIONS=["Bratislavský kraj","Trnavský kraj","Trenčiansky kraj","Nitriansky kraj","Žilinský kraj","Banskobystrický kraj","Prešovský kraj","Košický kraj","Celé Slovensko"];
  const REQUIRED_HEADERS=["name","kategoria","adresa","popis","meno"];
  const REGION_RULES=[
    ["Bratislavský kraj",/bratislava|pezinok|bernolakovo|malacky|senec|modra|stupava|svaty jur/],
    ["Trnavský kraj",/trnava|dunajska streda|galanta|hlohovec|piestany|senica|skalica|samorin|sered/],
    ["Trenčiansky kraj",/trencin|banovce|myjava|nove mesto nad vahom|partizanske|povazska bystrica|prievidza|puchov/],
    ["Nitriansky kraj",/nitra|komarno|levice|nove zamky|sala|topolcany|zlate moravce/],
    ["Žilinský kraj",/zilina|bytca|cadca|dolny kubin|kysucke nove mesto|liptovsky mikulas|martin|namestovo|ruzomberok|turcianske teplice|tvrdosin|lucky/],
    ["Banskobystrický kraj",/banska bystrica|banska stiavnica|brezno|detva|krupina|lucenec|poltar|revuca|rimavska sobota|velky krtis|zarnovica|ziar nad hronom|zvolen/],
    ["Prešovský kraj",/presov|bardejov|humenne|kezmarok|levoca|medzilaborce|poprad|sabinov|snina|stara lubovna|stropkov|svidnik|vranov|malcov/],
    ["Košický kraj",/kosice|gelnica|michalovce|roznava|sobrance|spisska nova ves|trebisov|roznavske bystre/]
  ];

  let rows=[];
  let fileName="";
  let importedAds=[];

  function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char]))}
  function clean(value){return String(value??"").replace(/Created with Sketch\./gi," ").replace(/\u00a0/g," ").replace(/[ \t]+/g," ").replace(/\s*\n\s*/g,"\n").trim()}
  function normalized(value){return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("sk")}
  function cellText(value){
    if(value==null)return"";
    if(typeof value!=="object")return String(value);
    if(Array.isArray(value.richText))return value.richText.map(part=>part.text||"").join("");
    if(value.text!=null)return String(value.text);
    if(value.result!=null)return String(value.result);
    if(value.hyperlink)return String(value.hyperlink);
    return String(value);
  }
  function headerKey(value){return normalized(value).replace(/\s+/g,"_")}
  function pick(record,...names){for(const name of names){const value=record[headerKey(name)];if(value!=null&&clean(value)!=="")return cellText(value)}return""}
  function setMessage(text,type=""){
    const node=$("#bazar-import-message");if(!node)return;
    node.textContent=text;node.className=`message${type?` ${type}`:""}`;
  }
  function setBusy(busy){
    $("#bazar-import-file")&&( $("#bazar-import-file").disabled=busy );
    $(".bazar-import-drop")?.classList.toggle("busy",busy);
    if($("#bazar-import-submit"))$("#bazar-import-submit").disabled=busy||!rows.some(row=>row.include&&!row.duplicate&&!row.errors.length);
  }
  function parsePrice(value,title,description){
    const source=clean(value),hay=normalized(`${title} ${description} ${source}`);
    if(/darujem|zadarmo|bezplatne/.test(hay))return{price:null,price_mode:"free",listing_type:"give"};
    if(/vymenim|vymena/.test(hay))return{price:null,price_mode:"exchange",listing_type:"exchange"};
    if(/hladam|kupim/.test(hay))return{price:null,price_mode:"not_listed",listing_type:"wanted"};
    const number=source.replace(/\s/g,"").replace(",",".").match(/\d+(?:\.\d+)?/);
    if(!number)return{price:null,price_mode:/dohodou|dohoda/.test(hay)?"negotiable":"not_listed",listing_type:"sell"};
    return{price:Number(number[0]),price_mode:/dohodou|dohoda/.test(hay)?"negotiable":"fixed",listing_type:"sell"};
  }
  function parseCategory(value){
    const text=clean(value);
    if(CATEGORIES.includes(text))return text;
    const candidates=text.split(/\s+-\s+/).map(part=>part.trim()).reverse();
    return candidates.find(part=>CATEGORIES.includes(part))||"Ostatné";
  }
  function parseCondition(title,description,category){
    const hay=normalized(`${title} ${description}`);
    if(category.endsWith("služby")||/sluzb|prace s|realizujeme/.test(hay))return"not_applicable";
    if(/nepouzivan|nepouzita|novy|nova|nove|zaruka/.test(hay))return"unused";
    if(/nefunk|pokazen|na opravu|poskoden/.test(hay))return"repair";
    return"used";
  }
  function guessRegion(location){
    const exact=REGIONS.find(region=>normalized(location).includes(normalized(region)));
    if(exact)return{region:exact,guessed:false};
    const place=normalized(location);
    const match=REGION_RULES.find(([,rule])=>rule.test(place));
    return match?{region:match[0],guessed:false}:{region:"Celé Slovensko",guessed:true};
  }
  function parseContact(record,description){
    const href=clean(pick(record,"kontakt_href"));
    const raw=clean(`${pick(record,"kontakt")} ${pick(record,"kontakt_z_popisu")} ${description}`);
    let email="",phone="";
    if(/^mailto:/i.test(href))email=href.replace(/^mailto:/i,"").split("?")[0].trim();
    if(/^tel:/i.test(href))phone=href.replace(/^tel:/i,"").trim();
    if(!email)email=(raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||[])[0]||"";
    if(!phone){
      const match=raw.match(/(?:\+?\d[\d ()/-]{7,}\d)/);
      phone=match?match[0].replace(/[^\d+]/g,""):"";
    }
    return{email:email.slice(0,254)||null,phone:phone.slice(0,40)||null};
  }
  function parseImages(value){
    return clean(value).split(/\n+/).map(item=>item.trim()).filter(item=>{
      try{return /^https?:$/.test(new URL(item).protocol)}catch{return false}
    }).filter((item,index,array)=>array.indexOf(item)===index).slice(0,6);
  }
  async function hash(value){
    const input=new TextEncoder().encode(normalized(value));
    if(globalThis.crypto?.subtle){
      const digest=await crypto.subtle.digest("SHA-256",input);
      return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
    }
    let fallback=2166136261;for(const byte of input){fallback^=byte;fallback=Math.imul(fallback,16777619)}
    return Math.abs(fallback>>>0).toString(16).padStart(8,"0").repeat(8);
  }
  function sourceData(ad){return ad&&typeof ad.import_source_data==="object"&&!Array.isArray(ad.import_source_data)?ad.import_source_data:{}}
  function fileLabel(ad){const data=sourceData(ad);return clean(data.import_file||data.spreadsheet||ad.import_source||"Importovaná dávka")}

  async function fetchImportedAds(){
    const result=[];let from=0;
    while(true){
      const {data,error}=await db.from("zahrada_bazar_ads").select("id,title,status,created_at,import_source,import_source_data").not("import_source","is",null).order("created_at",{ascending:false}).range(from,from+499);
      if(error)throw error;
      result.push(...(data||[]));
      if(!data||data.length<500)break;
      from+=500;
    }
    importedAds=result;
    renderBatches();
    const fingerprints=new Set();
    for(const ad of importedAds){
      const data=sourceData(ad);
      if(data.source_fingerprint)fingerprints.add(String(data.source_fingerprint));
      if(data.internal_source_url)fingerprints.add(await hash(data.internal_source_url));
    }
    return fingerprints;
  }
  function renderBatches(){
    const root=$("#bazar-import-batch-list");if(!root)return;
    const grouped=new Map();
    for(const ad of importedAds){
      if(!ad.import_source)continue;
      if(!grouped.has(ad.import_source))grouped.set(ad.import_source,{source:ad.import_source,label:fileLabel(ad),created_at:ad.created_at,ads:[]});
      grouped.get(ad.import_source).ads.push(ad);
    }
    const groups=[...grouped.values()];
    if(!groups.length){root.innerHTML='<div class="bazar-admin-empty">Zatiaľ tu nie je žiadna importovaná dávka.</div>';return}
    root.innerHTML=groups.map(group=>{
      const active=group.ads.filter(ad=>ad.status==="published").length;
      return `<article class="bazar-import-batch"><div><h4>${esc(group.label)}</h4><p>${group.ads.length} inzerátov · ${active} zverejnených · ${esc(baDate(group.created_at))}</p></div><button type="button" data-import-delete="${esc(group.source)}">Vymazať dávku</button></article>`;
    }).join("");
    root.querySelectorAll("[data-import-delete]").forEach(button=>button.addEventListener("click",()=>deleteBatch(button.dataset.importDelete)));
  }
  async function deleteBatch(source){
    const group=importedAds.filter(ad=>ad.import_source===source);
    const label=group[0]?fileLabel(group[0]):source;
    if(!confirm(`Natrvalo vymazať dávku „${label}“ a všetkých ${group.length} jej inzerátov?`))return;
    const {error}=await db.from("zahrada_bazar_ads").delete().eq("import_source",source);
    if(error){alert("Dávku sa nepodarilo vymazať: "+error.message);return}
    setMessage(`Dávka „${label}“ bola vymazaná.`,"ok");
    await Promise.all([refreshBatches(),typeof loadBazarAdmin==="function"?loadBazarAdmin():Promise.resolve()]);
  }
  async function refreshBatches(){
    try{await fetchImportedAds()}catch(error){$("#bazar-import-batch-list").innerHTML='<div class="bazar-admin-empty">Importované dávky sa nepodarilo načítať.</div>'}
  }
  function workbookRows(sheet){
    const headerRow=sheet.getRow(1);
    const headers=[];
    for(let column=1;column<=headerRow.cellCount;column++)headers[column]=headerKey(cellText(headerRow.getCell(column).value));
    const missing=REQUIRED_HEADERS.filter(required=>!headers.includes(required));
    if(missing.length)throw new Error(`V súbore chýbajú stĺpce: ${missing.join(", ")}.`);
    const result=[];
    for(let rowNumber=2;rowNumber<=sheet.actualRowCount;rowNumber++){
      const excelRow=sheet.getRow(rowNumber),record={};
      headers.forEach((header,column)=>{if(header)record[header]=cellText(excelRow.getCell(column).value)});
      if(Object.values(record).every(value=>!clean(value)))continue;
      result.push({record,rowNumber});
    }
    return result;
  }
  async function makeRow(record,rowNumber){
    const title=clean(pick(record,"name","názov","nazov")).slice(0,120);
    const description=clean(pick(record,"popis","description")).replace(/\s*NájdiNajlepšie Zľavy\s*/gi," ").trim().slice(0,5000);
    const category=parseCategory(pick(record,"kategoria","kategória","category"));
    const location=clean(pick(record,"Adresa","adresa","lokalita","location")).slice(0,100);
    const contactName=(clean(pick(record,"meno","kontaktne_meno","contact_name"))||"Neuvedené").slice(0,80);
    const contact=parseContact(record,description);
    const price=parsePrice(pick(record,"cena","price"),title,description);
    const region=guessRegion(location);
    const link=clean(pick(record,"link","url"));
    const order=clean(pick(record,"web_scraper_order","id"));
    const fingerprint=await hash(link||order||`${title}|${location}|${contact.email||contact.phone||contactName}`);
    const errors=[];
    if(title.length<5)errors.push("krátky názov");
    if(description.length<20)errors.push("krátky popis");
    if(location.length<2)errors.push("chýba lokalita");
    if(contactName.length<2)errors.push("chýba meno");
    if(!contact.email&&!contact.phone)errors.push("chýba kontakt");
    return{
      rowNumber,fingerprint,include:true,duplicate:false,regionGuessed:region.guessed,errors,
      ad:{
        user_id:null,title,description,category,listing_type:price.listing_type,item_condition:parseCondition(title,description,category),
        price:price.price,price_mode:price.price_mode,region:region.region,location,contact_name:contactName,
        contact_email:contact.email,contact_phone:contact.phone,images:parseImages(pick(record,"obrazky","obrázky","images")),
        seller_type:"private",business_name:null,business_ico:null,imported:false,private_person_confirmed:true,commercial_activity:false
      },
      meta:{source_order:order||null}
    };
  }
  async function parseFile(file){
    if(!file)return;
    if(file.size>5*1024*1024){setMessage("Súbor je väčší ako 5 MB.","error");return}
    if(!/\.xlsx$/i.test(file.name)){setMessage("Vyber súbor vo formáte .xlsx.","error");return}
    if(!globalThis.ExcelJS){setMessage("Čítačka Excelu sa nenačítala. Obnov stránku a skús to znova.","error");return}
    setBusy(true);setMessage("Načítavam a kontrolujem súbor…");
    try{
      const workbook=new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet=workbook.worksheets[0];
      if(!sheet)throw new Error("Súbor neobsahuje žiadny hárok.");
      const sourceRows=workbookRows(sheet);
      if(!sourceRows.length)throw new Error("Súbor neobsahuje žiadne inzeráty.");
      if(sourceRows.length>1000)throw new Error("Jeden súbor môže obsahovať najviac 1 000 inzerátov.");
      const existing=await fetchImportedAds();
      const seen=new Set();
      rows=[];
      for(const item of sourceRows){
        const row=await makeRow(item.record,item.rowNumber);
        row.duplicate=existing.has(row.fingerprint)||seen.has(row.fingerprint);
        if(row.duplicate)row.include=false;
        seen.add(row.fingerprint);rows.push(row);
      }
      fileName=file.name.replace(/[\\/]/g,"-").slice(0,180);
      renderPreview();
      const ready=rows.filter(row=>row.include&&!row.duplicate&&!row.errors.length).length;
      setMessage(ready?`Súbor je pripravený. Skontroluj náhľad a potvrď import ${ready} inzerátov.`:"V súbore nie je žiadny nový platný inzerát.",ready?"ok":"error");
    }catch(error){rows=[];fileName="";clearPreview();setMessage(error.message||"Súbor sa nepodarilo načítať.","error")}
    finally{setBusy(false)}
  }
  function options(values,selected){return values.map(value=>`<option value="${esc(value)}"${value===selected?" selected":""}>${esc(value)}</option>`).join("")}
  function renderPreview(){
    const preview=$("#bazar-import-preview"),summary=$("#bazar-import-summary"),reset=$("#bazar-import-reset");if(!preview||!summary)return;
    const ready=rows.filter(row=>row.include&&!row.duplicate&&!row.errors.length).length;
    const duplicates=rows.filter(row=>row.duplicate).length;
    const errors=rows.filter(row=>row.errors.length).length;
    const guessed=rows.filter(row=>row.regionGuessed&&!row.duplicate).length;
    summary.hidden=false;summary.innerHTML=`<article><span>Riadky v súbore</span><strong>${rows.length}</strong></article><article><span>Pripravené</span><strong>${ready}</strong></article><article><span>Duplicity</span><strong>${duplicates}</strong></article><article><span>Neurčený kraj</span><strong>${guessed}</strong></article>`;
    preview.hidden=false;preview.innerHTML=`<table class="bazar-import-table"><thead><tr><th>Vložiť</th><th>Inzerát</th><th>Kategória</th><th>Lokalita</th><th>Kraj</th><th>Cena</th><th>Kontrola</th></tr></thead><tbody>${rows.map((row,index)=>{
      const state=row.duplicate?"Duplicita – preskočí sa":row.errors.length?row.errors.join(", "):row.regionGuessed?"Kraj skontroluj":"Pripravené";
      const className=row.duplicate?"is-duplicate":row.errors.length?"has-error":"";
      const price=row.ad.price==null?(row.ad.price_mode==="free"?"Zadarmo":"Bez ceny"):`${row.ad.price} €`;
      return `<tr class="${className}"><td><input type="checkbox" data-import-include="${index}" ${row.include?"checked":""} ${row.duplicate||row.errors.length?"disabled":""} aria-label="Vložiť riadok ${row.rowNumber}"></td><td class="bazar-import-title"><strong>${esc(row.ad.title)}</strong><small>Excel riadok ${row.rowNumber} · ${esc(row.ad.contact_name)}</small></td><td><select data-import-category="${index}">${options(CATEGORIES,row.ad.category)}</select></td><td>${esc(row.ad.location)}</td><td><select data-import-region="${index}">${options(REGIONS,row.ad.region)}</select></td><td>${esc(price)}</td><td><span class="bazar-import-row-note ${!row.duplicate&&!row.errors.length&&!row.regionGuessed?"ok":""}">${esc(state)}</span></td></tr>`;
    }).join("")}</tbody></table>`;
    reset.hidden=false;
    $("#bazar-import-submit").disabled=!ready;
    preview.querySelectorAll("[data-import-include]").forEach(input=>input.addEventListener("change",()=>{rows[Number(input.dataset.importInclude)].include=input.checked;renderPreview()}));
    preview.querySelectorAll("[data-import-category]").forEach(select=>select.addEventListener("change",()=>{rows[Number(select.dataset.importCategory)].ad.category=select.value}));
    preview.querySelectorAll("[data-import-region]").forEach(select=>select.addEventListener("change",()=>{const row=rows[Number(select.dataset.importRegion)];row.ad.region=select.value;row.regionGuessed=false;renderPreview()}));
    if(errors)setMessage(`${errors} riadkov má chybu a neimportuje sa. Ostatné môžeš bezpečne vložiť.`,ready?"":"error");
  }
  function clearPreview(){
    const preview=$("#bazar-import-preview"),summary=$("#bazar-import-summary"),reset=$("#bazar-import-reset"),submit=$("#bazar-import-submit");
    if(preview){preview.hidden=true;preview.innerHTML=""}if(summary){summary.hidden=true;summary.innerHTML=""}if(reset)reset.hidden=true;if(submit)submit.disabled=true;
  }
  function resetImport(){rows=[];fileName="";if($("#bazar-import-file"))$("#bazar-import-file").value="";clearPreview();setMessage("")}
  async function insertRows(items,batchId,now,expires){
    let inserted=0,failed=0;
    const payload=items.map(row=>({...row.ad,status:"published",terms_accepted_at:now,moderated_at:now,published_at:now,expires_at:expires,import_source:batchId,import_source_data:{source_fingerprint:row.fingerprint,import_file:fileName,spreadsheet_row:row.rowNumber,source_order:row.meta.source_order}}));
    for(let start=0;start<payload.length;start+=25){
      const chunk=payload.slice(start,start+25);
      let {error}=await db.from("zahrada_bazar_ads").insert(chunk);
      if(!error){inserted+=chunk.length;continue}
      for(const ad of chunk){
        const result=await db.from("zahrada_bazar_ads").insert(ad);
        if(result.error)failed++;else inserted++;
      }
      const progress=$("#bazar-import-message");if(progress)progress.innerHTML=`Importujem… ${inserted+failed}/${payload.length}<div class="bazar-import-progress"><span style="width:${Math.round((inserted+failed)/payload.length*100)}%"></span></div>`;
    }
    return{inserted,failed};
  }
  async function runImport(){
    const selected=rows.filter(row=>row.include&&!row.duplicate&&!row.errors.length);
    if(!selected.length)return;
    if(!confirm(`Zverejniť ${selected.length} inzerátov na 60 dní? Hromadné upozornenie sa neodošle.`))return;
    setBusy(true);setMessage("Importujem inzeráty…");
    try{
      if(!await isBazarAdmin())throw new Error("Platnosť prihlásenia vypršala. Prihlás sa znova.");
      const nowDate=new Date(),expiresDate=new Date(nowDate.getTime()+60*24*60*60*1000);
      const uuid=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const batchId=`admin-xlsx:${nowDate.toISOString().slice(0,10)}:${uuid}`;
      const result=await insertRows(selected,batchId,nowDate.toISOString(),expiresDate.toISOString());
      const message=result.failed?`Import hotový: ${result.inserted} vložených, ${result.failed} sa nepodarilo vložiť.`:`Hotovo. ${result.inserted} inzerátov bolo zverejnených na 60 dní.`;
      resetImport();setMessage(message,result.failed?"error":"ok");
      await Promise.all([refreshBatches(),typeof loadBazarAdmin==="function"?loadBazarAdmin():Promise.resolve()]);
    }catch(error){setMessage("Import sa nepodaril: "+(error.message||"neznáma chyba"),"error")}
    finally{setBusy(false)}
  }
  function wireDropzone(){
    const drop=$(".bazar-import-drop"),input=$("#bazar-import-file");if(!drop||!input)return;
    input.addEventListener("change",()=>parseFile(input.files?.[0]));
    ["dragenter","dragover"].forEach(eventName=>drop.addEventListener(eventName,event=>{event.preventDefault();drop.classList.add("dragover")}));
    ["dragleave","drop"].forEach(eventName=>drop.addEventListener(eventName,event=>{event.preventDefault();drop.classList.remove("dragover")}));
    drop.addEventListener("drop",event=>{const file=event.dataTransfer?.files?.[0];if(file)parseFile(file)});
  }
  async function start(){
    if(!$("#bazar-import-file"))return;
    wireDropzone();
    $("#bazar-import-submit")?.addEventListener("click",runImport);
    $("#bazar-import-reset")?.addEventListener("click",resetImport);
    $("#bazar-import-refresh")?.addEventListener("click",refreshBatches);
    if(await isBazarAdmin())await refreshBatches();
  }
  db.auth.onAuthStateChange((event,session)=>{
    if(session&&(event==="SIGNED_IN"||event==="TOKEN_REFRESHED"||event==="INITIAL_SESSION"))setTimeout(refreshBatches,0);
    if(event==="SIGNED_OUT"){importedAds=[];renderBatches();resetImport()}
  });
  start();
})();
