/* Shared presentation rules. Listing facts always come from the seller's record. */
(()=>{
  const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const permanent=v=>v==="infinity"||/^9999-/.test(String(v||""));
  const active=ad=>ad.status==="published"&&(permanent(ad.expires_at)||Date.parse(ad.expires_at)>Date.now());
  const imported=ad=>!!(ad.imported||ad.import_source||ad.import_source_data?.import_file);
  // Withdrawn from public listing and detail views pending correction.
  const held=new Set(["1b28f669-77ce-4182-b470-53a5ec3c8167","06a22ae3-5f5b-4a7f-8bc3-bb44b941fb05","e814b3d0-35d4-4183-9229-5feddfe5a48f","61cb7d88-91da-441a-81e7-03949f681368","cc01652b-c6cb-4eef-a945-d8025f76ccf3","13ac67aa-c2b8-4701-8c33-c6a81c974e51"]);
  const reviewNeeded=ad=>held.has(ad.id);
  const categories=[
    [/kosack|krovinorez|kultivator|vertikut|motorov.*pil|fukar|rotavator/,"Záhradná technika"],
    [/cerpadl|vodaren/,"Čerpadlá, pumpy"],
    [/sadenic|semena|osivo|cesnak|jahod|priesad|kvetiny|kvetina\b|muskat|cucoried/,"Semená, rastliny"],
    [/tuja|stromcek|drevin|figovnik|javor|smaragd/,"Stromy, dreviny"],
    [/altan|pergol|pristres|zahradn.*domcek|sklenik/,"Záhradné stavby"],
    [/lavic|hojdack|zahradn.*stol|zahradn.*kresl/,"Záhradný nábytok"],
    [/nadrz|zump|septik|vodomern.*sacht/,"Žumpy, septiky"],
    [/polystyren|vln.*izol|izolaci/,"Izolácie"],
    [/dlazb|obklad/,"Obklady, dlažby"],
    [/palivov.*drev|briket|uhlie|pelety/,"Kúrenie, palivá"],
    [/rezivo|hranol|dosk|laty/,"Drevo"],
    [/lesen/,"Lešenia"], [/dvere/,"Dvere"], [/okna|okno/,"Okná"],
    [/bazen|kupaci.*kad|viriv/,"Bazény"], [/gril|udiaren/,"Záhradné grily"],
    [/tehl|kvadr/,"Tehly, kvádre"], [/radiator/,"Radiátory"],
    [/kvetinac|zahon|opora|plot|pletiv/,"Záhradné doplnky"]
  ];
  function category(ad){
    if(ad.category&&ad.category!=="Ostatné")return ad.category;
    const text=norm(ad.title);
    return categories.find(([pattern])=>pattern.test(text))?.[1]||ad.category||"Ostatné";
  }
  function clean(value){return String(value||"").replace(/\r\n?/g,"\n").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();}
  function questions(ad){
    const text=norm(ad.title+" "+category(ad));
    if(/rastlin|sadenic|semen|strom|tuja|cesnak/.test(text))return ["Aká je presná odroda, veľkosť a množstvo?","Ide o zakorenenú rastlinu, voľnokorenný materiál alebo osivo?","Aký je termín odberu a spôsob balenia pri doprave?","Sú uvedené ceny za kus, balenie alebo celé množstvo?"];
    if(/kosack|narad|technika|cerpadl|motor|kultivator/.test(text))return ["Aký je presný model, pohon a rok výroby?","Čo je súčasťou ceny a ktoré príslušenstvo chýba?","Je možné výrobok bezpečne predviesť pri osobnom odbere?","Aké opravy, opotrebenie alebo závady predajca pozná?"];
    if(/stavb|drev|dver|okn|dlaz|tehl|izol|lesen|strech/.test(text))return ["Aké sú presné rozmery, materiál a dostupné množstvo?","Je cena za kus, meter, balenie alebo celú ponuku?","Je materiál nový alebo použitý a má nejaké poškodenia?","Kto zabezpečí nakládku, dopravu a prípadnú montáž?"];
    return ["Aké sú presné rozmery, množstvo a skutočný stav?","Čo presne zahŕňa uvedená cena?","Je ponuka stále dostupná a možno ju osobne prezrieť?","Aký je spôsob platby, prevzatia a prípadnej dopravy?"];
  }
  function missing(ad){
    const fields=[];
    if(!clean(ad.description))fields.push("podrobný popis");
    if(ad.price_mode==="not_listed"||(["fixed","negotiable"].includes(ad.price_mode)&&ad.price==null))fields.push("konkrétna cena");
    if(!ad.location)fields.push("miesto odberu");
    if(!ad.contact_phone&&!ad.contact_email)fields.push("priamy kontakt");
    if(!Array.isArray(ad.images)||!ad.images.length)fields.push("fotografia");
    return fields;
  }
  const api={norm,permanent,active,imported,reviewNeeded,category,clean,questions,missing};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else window.BazarContent=api;
})();
