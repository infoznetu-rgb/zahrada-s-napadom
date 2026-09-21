(()=>{
const fmt=(v,d=2)=>new Intl.NumberFormat('sk-SK',{maximumFractionDigits:d}).format(v);
const num=id=>Math.max(0,Number(document.getElementById(id)?.value||0));
const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};

function calcPaint(){
 const f=document.getElementById('paint-calculator'); if(!f)return;
 const l=num('paint-length'),w=num('paint-width'),h=num('paint-height');
 const openings=num('paint-openings'),coats=Math.max(1,num('paint-coats')||1);
 const coverage=Math.max(.1,num('paint-coverage')||10),reserve=num('paint-reserve');
 const ceiling=document.getElementById('paint-ceiling')?.checked;
 const walls=Math.max(0,2*(l+w)*h-openings);
 const ceilingArea=ceiling?l*w:0;
 const oneCoat=walls+ceilingArea;
 const allCoats=oneCoat*coats;
 const liters=allCoats/coverage*(1+reserve/100);
 set('paint-walls',fmt(walls)+' m²');
 set('paint-ceiling-result',fmt(ceilingArea)+' m²');
 set('paint-area-total',fmt(allCoats)+' m²');
 set('paint-liters',fmt(liters,1)+' l');
 set('paint-rounded',fmt(Math.ceil(liters*2)/2,1)+' l');
}

function calcConcrete(){
 const f=document.getElementById('concrete-calculator'); if(!f)return;
 const shape=document.getElementById('concrete-shape')?.value||'rect';
 const count=Math.max(1,Math.round(num('concrete-count')||1));
 const reserve=num('concrete-reserve');
 let raw=0;
 if(shape==='round'){
   const d=num('concrete-diameter')/100,depth=num('concrete-depth-round')/100;
   raw=Math.PI*Math.pow(d/2,2)*depth*count;
 }else{
   const l=num('concrete-length'),w=num('concrete-width'),depth=num('concrete-depth')/100;
   raw=l*w*depth*count;
 }
 const total=raw*(1+reserve/100);
 const liters=total*1000;
 const yieldL=num('concrete-yield');
 const bags=yieldL>0?Math.ceil(liters/yieldL):null;
 set('concrete-raw',fmt(raw,3)+' m³');
 set('concrete-total',fmt(total,3)+' m³');
 set('concrete-liters',fmt(liters,0)+' l');
 set('concrete-bags',bags===null?'zadaj výťažnosť':bags+' ks');
 const rect=document.getElementById('concrete-rect-fields'),round=document.getElementById('concrete-round-fields');
 if(rect)rect.hidden=shape==='round'; if(round)round.hidden=shape!=='round';
}

const anchorData={
 concrete:{
  label:'Betón',
  bit:'Vrták do betónu / muriva správneho priemeru podľa kotvy.',
  mode:'Pri bežnom betóne sa používa príklep alebo vŕtacie kladivo, ak to povoľuje návod konkrétnej kotvy.',
  light:'Pre ľahšie predmety býva vhodná kvalitná rozperná alebo univerzálna hmoždinka určená do betónu.',
  medium:'Pre police a konzoly použi systém výslovne určený do betónu a dodrž priemer, hĺbku otvoru aj skrutku podľa výrobcu.',
  heavy:'Pri ťažkých konzolách, skrinkách alebo bezpečnostne dôležitom kotvení použi schválenú mechanickú alebo chemickú kotvu navrhnutú pre konkrétny betón. Nosnosť neodhaduj iba podľa priemeru.'
 },
 solid:{
  label:'Plná tehla',
  bit:'Vrták do muriva. Pri staršej alebo krehkej tehle začni šetrnejšie.',
  mode:'Príklep môže byť vhodný pri zdravom plnom murive, ale vždy sa riaď návodom kotvy a stavom tehly.',
  light:'Univerzálna alebo rozperná hmoždinka vhodná do plnej tehly.',
  medium:'Kvalitná rámová alebo rozperná hmoždinka určená do plného muriva, s vhodnou skrutkou.',
  heavy:'Pri vyššom zaťažení vyber certifikovaný kotevný systém pre plnú tehlu a over podklad, hĺbku aj okrajové vzdialenosti.'
 },
 hollow:{
  label:'Dierovaná tehla',
  bit:'Vrták do muriva správneho priemeru.',
  mode:'Vŕtaj rotačne bez príklepu, aby si zbytočne nerozbil vnútorné prepážky tehly.',
  light:'Použi univerzálnu hmoždinku, ktorá sa v dutinách uzlí alebo vytvorí tvarový zámok.',
  medium:'Vhodná je rámová alebo univerzálna hmoždinka výslovne určená do dierovaného muriva.',
  heavy:'Pri vyššom zaťažení sa často používa schválený chemický systém so sitkovým puzdrom alebo iné riešenie určené pre dutinové murivo. Rozhodujú údaje výrobcu.'
 },
 aerated:{
  label:'Pórobetón / Ytong',
  bit:'Vrták odporúčaný výrobcom kotvy; otvor musí mať správny priemer a nesmie byť zbytočne vymlátený.',
  mode:'Vŕtaj bez príklepu.',
  light:'Použi hmoždinku určenú priamo do pórobetónu; bežná hmoždinka do betónu nemusí fungovať rovnako.',
  medium:'Vyber systém s veľkou styčnou plochou alebo špirálovým/tvarovým zakotvením určeným do pórobetónu.',
  heavy:'Pri ťažkom kotvení treba schválený systém pre konkrétnu pevnostnú triedu pórobetónu. Over nosnosť v technickom liste.'
 },
 drywall:{
  label:'Sadrokartón',
  bit:'Bežný vrták podľa typu dutinovej kotvy; pri niektorých samovŕtacích kotvách sa otvor nevŕta.',
  mode:'Bez príklepu.',
  light:'Na ľahké predmety použi hmoždinku určenú do doskových materiálov.',
  medium:'Pre väčšie predmety je vhodná dutinová kovová kotva alebo sklopná kotva podľa hrúbky dosky a dutiny.',
  heavy:'Ťažké skrinky, TV držiaky a dynamicky namáhané prvky je najistejšie kotviť do nosného profilu alebo konštrukcie, prípadne použiť certifikovaný systém s doloženou nosnosťou.'
 },
 tile:{
  label:'Obklad / dlažba',
  bit:'Na keramiku vrták na obklad; na veľmi tvrdý gres vhodný keramický alebo diamantový vrták určený pre daný materiál.',
  mode:'Cez obklad vŕtaj bez príklepu. Až po prejdení obkladom zvoľ spôsob vŕtania podľa nosného podkladu za ním.',
  light:'Obklad nie je nosný podklad. Kotva musí pracovať v stene za obkladom.',
  medium:'Najprv bezpečne prevŕtaj obklad bez príklepu, potom pokračuj vrtákom a kotvou podľa materiálu steny.',
  heavy:'Pri ťažkom predmete rozhoduje nosná stena za obkladom. Použi kotvu navrhnutú pre tento podklad a dávaj pozor, aby upevňovací prvok obklad lokálne nerozdrvil.'
 }
};
function anchorGuide(){
 const form=document.getElementById('anchor-guide'); if(!form)return;
 const material=document.getElementById('anchor-material')?.value||'concrete';
 const load=document.getElementById('anchor-load')?.value||'light';
 const d=anchorData[material];
 set('anchor-material-result',d.label);
 set('anchor-fixing',d[load]);
 set('anchor-bit',d.bit);
 set('anchor-mode',d.mode);
 set('anchor-warning',load==='heavy'?'Pri ťažkom, stropnom, zábradlovom alebo inak bezpečnostne dôležitom kotvení sa riaď schválením a technickým listom konkrétnej kotvy; všeobecný radca nenahrádza statický návrh.':'Priemer vrtáka, hĺbku otvoru a skrutku vždy prispôsob konkrétnej hmoždinke a návodu výrobcu.');
}


function parseCutList(textValue){
 const pieces=[];
 const lines=String(textValue||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 for(const line of lines){
   const clean=line.replace(/,/g,'.');
   const m=clean.match(/^([0-9]+(?:\.[0-9]+)?)\s*(?:[x×*]\s*([0-9]+))?$/i);
   if(!m)throw new Error('Nerozumiem riadku „'+line+'“. Použi napr. 900 x 2.');
   const length=Number(m[1]),qty=Math.max(1,Number(m[2]||1));
   if(!(length>0) || !Number.isFinite(length) || !Number.isInteger(qty))throw new Error('Skontroluj hodnoty v riadku „'+line+'“.');
   for(let i=0;i<qty;i++)pieces.push(length);
 }
 return pieces;
}

function calcCutPlan(){
 const form=document.getElementById('cut-plan-calculator'); if(!form)return;
 const stock=num('cut-stock'),kerf=num('cut-kerf');
 const output=document.getElementById('cut-plan-output'),error=document.getElementById('cut-plan-error');
 try{
   if(!(stock>0))throw new Error('Zadaj dĺžku skladového materiálu.');
   const pieces=parseCutList(document.getElementById('cut-list')?.value);
   if(!pieces.length)throw new Error('Zadaj aspoň jeden požadovaný kus.');
   if(pieces.some(p=>p>stock))throw new Error('Aspoň jeden požadovaný kus je dlhší než skladová lata.');
   pieces.sort((a,b)=>b-a);
   const bins=[];
   for(const piece of pieces){
     let placed=false;
     for(const bin of bins){
       const extra=(bin.pieces.length?kerf:0)+piece;
       if(bin.used+extra<=stock+1e-9){
         bin.used+=extra; bin.pieces.push(piece); placed=true; break;
       }
     }
     if(!placed)bins.push({used:piece,pieces:[piece]});
   }
   const useful=pieces.reduce((a,b)=>a+b,0);
   const totalStock=bins.length*stock;
   const waste=Math.max(0,totalStock-useful);
   const utilization=totalStock?useful/totalStock*100:0;
   set('cut-stock-count',bins.length+' ks');
   set('cut-required',fmt(useful,0)+' mm');
   set('cut-waste',fmt(waste,0)+' mm');
   set('cut-utilization',fmt(utilization,1)+' %');
   if(error)error.hidden=true;
   if(output){
     output.innerHTML=bins.map((bin,i)=>{
       const cuts=bin.pieces.map(v=>fmt(v,1)+' mm').join(' + ');
       const leftover=Math.max(0,stock-bin.used);
       return '<div class="cut-bar"><div><small>Lata '+(i+1)+'</small><strong>'+cuts+'</strong></div><span>Zvyšok '+fmt(leftover,1)+' mm</span></div>';
     }).join('');
   }
 }catch(e){
   if(output)output.innerHTML='';
   if(error){error.textContent=e.message||'Skontroluj zadané hodnoty.';error.hidden=false}
   set('cut-stock-count','—');set('cut-required','—');set('cut-waste','—');set('cut-utilization','—');
 }
}

function calcTile(){
 const form=document.getElementById('tile-calculator'); if(!form)return;
 const area=num('tile-area-length')*num('tile-area-width');
 const tileArea=(num('tile-width')/100)*(num('tile-length')/100);
 const reserve=num('tile-reserve');
 const pack=Math.floor(num('tile-pack'));
 const base=tileArea>0?Math.ceil(area/tileArea):0;
 const total=Math.ceil(base*(1+reserve/100));
 const buyArea=total*tileArea;
 set('tile-area',fmt(area)+' m²');
 set('tile-pieces-base',base+' ks');
 set('tile-pieces-total',total+' ks');
 set('tile-buy-area',fmt(buyArea)+' m²');
 set('tile-packs',pack>0?Math.ceil(total/pack)+' bal.':'zadaj balenie');
}

function calcRightAngle(){
 const form=document.getElementById('right-angle-calculator'); if(!form)return;
 const a=num('angle-side-a'),b=num('angle-side-b'),scale=num('angle-scale');
 const diagonal=Math.sqrt(a*a+b*b);
 set('angle-diagonal',fmt(diagonal,3)+' m');
 set('angle-ratio',fmt(a,2)+' : '+fmt(b,2));
 set('angle-3',fmt(scale*3,3)+' m');
 set('angle-4',fmt(scale*4,3)+' m');
 set('angle-5',fmt(scale*5,3)+' m');
}


function calcGravel(){
 const form=document.getElementById('gravel-calculator'); if(!form)return;
 const l=num('gravel-length'),w=num('gravel-width'),depth=num('gravel-depth')/100;
 const reserve=num('gravel-reserve'),density=num('gravel-density');
 const area=l*w,volume=area*depth,total=volume*(1+reserve/100),liters=total*1000,kg=total*density;
 set('gravel-area',fmt(area)+' m²');
 set('gravel-volume',fmt(volume,3)+' m³');
 set('gravel-total',fmt(total,3)+' m³');
 set('gravel-liters',fmt(liters,0)+' l');
 set('gravel-kg',fmt(kg,0)+' kg');
 set('gravel-tonnes',fmt(kg/1000,2)+' t');
}

function calcMulch(){
 const form=document.getElementById('mulch-calculator'); if(!form)return;
 const l=num('mulch-length'),w=num('mulch-width'),depth=num('mulch-depth')/100;
 const reserve=num('mulch-reserve'),bag=Math.max(1,num('mulch-bag'));
 const area=l*w,volume=area*depth,total=volume*(1+reserve/100),liters=total*1000;
 set('mulch-area',fmt(area)+' m²');
 set('mulch-volume',fmt(volume,3)+' m³');
 set('mulch-total',fmt(total,3)+' m³');
 set('mulch-liters',fmt(liters,0)+' l');
 set('mulch-bags',Math.ceil(liters/bag)+' ks');
}

function calcSlope(){
 const form=document.getElementById('slope-calculator'); if(!form)return;
 const riseCm=num('slope-rise'),runM=num('slope-run');
 const riseM=riseCm/100;
 const percent=runM>0?riseM/runM*100:0;
 const degrees=Math.atan2(riseM,runM)*180/Math.PI;
 const ratio=riseM>0?runM/riseM:Infinity;
 set('slope-percent',fmt(percent,2)+' %');
 set('slope-degrees',fmt(degrees,2)+'°');
 set('slope-ratio',Number.isFinite(ratio)?'1 : '+fmt(ratio,2):'rovina');
 set('slope-per-meter',fmt(percent,2)+' cm/m');
}
function calcSlopeTarget(){
 const form=document.getElementById('slope-target-calculator'); if(!form)return;
 const run=num('slope-target-run'),percent=num('slope-target-percent');
 set('slope-target-rise',fmt(run*percent,2)+' cm');
}

function calcWoodCoating(){
 const form=document.getElementById('wood-coating-calculator'); if(!form)return;
 const length=num('coat-length'),width=num('coat-width')/100,count=Math.max(1,Math.round(num('coat-count')||1));
 const sides=Math.max(1,Number(document.getElementById('coat-sides')?.value||1));
 const edges=num('coat-edges'),coats=Math.max(1,num('coat-coats')||1),coverage=Math.max(.1,num('coat-coverage')||10),reserve=num('coat-reserve');
 const base=length*width*count*sides;
 const area=base*(1+edges/100);
 const layerArea=area*coats;
 const liters=layerArea/coverage*(1+reserve/100);
 set('coat-base-area',fmt(base)+' m²');
 set('coat-area',fmt(area)+' m²');
 set('coat-layer-area',fmt(layerArea)+' m²');
 set('coat-liters',fmt(liters,2)+' l');
 set('coat-rounded',fmt(Math.ceil(liters*4)/4,2)+' l');
}


function calcRain(){
 const form=document.getElementById('rain-calculator'); if(!form)return;
 const area=num('rain-area'),mm=num('rain-mm'),eff=Math.min(100,num('rain-efficiency')),tank=Math.max(1,num('rain-tank'));
 const gross=area*mm;
 const net=gross*(eff/100);
 set('rain-gross',fmt(gross,0)+' l');
 set('rain-net',fmt(net,0)+' l');
 set('rain-fill',fmt(net/tank*100,1)+' %');
 set('rain-tanks',fmt(net/tank,2)+'×');
}

function calcSoil(){
 const form=document.getElementById('soil-calculator'); if(!form)return;
 const l=num('soil-length'),w=num('soil-width'),depth=num('soil-depth')/100;
 const compostShare=Math.min(100,num('soil-compost')),reserve=num('soil-reserve'),bag=Math.max(1,num('soil-bag'));
 const area=l*w;
 const total=area*depth*(1+reserve/100);
 const liters=total*1000;
 const compost=liters*(compostShare/100);
 const earth=liters-compost;
 set('soil-area',fmt(area)+' m²');
 set('soil-total',fmt(total,3)+' m³');
 set('soil-liters',fmt(liters,0)+' l');
 set('soil-earth',fmt(earth,0)+' l');
 set('soil-compost-liters',fmt(compost,0)+' l');
 set('soil-bags',Math.ceil(liters/bag)+' ks');
}

const unitGroups={
 length:{
   mm:{label:'milimeter (mm)',factor:.001},cm:{label:'centimeter (cm)',factor:.01},m:{label:'meter (m)',factor:1},km:{label:'kilometer (km)',factor:1000},
   in:{label:'palec (in)',factor:.0254},ft:{label:'stopa (ft)',factor:.3048}
 },
 area:{
   mm2:{label:'mm²',factor:1e-6},cm2:{label:'cm²',factor:1e-4},m2:{label:'m²',factor:1},ha:{label:'hektár (ha)',factor:10000},
   in2:{label:'in²',factor:.00064516},ft2:{label:'ft²',factor:.09290304}
 },
 volume:{
   ml:{label:'mililiter (ml)',factor:.001},l:{label:'liter (l)',factor:1},m3:{label:'m³',factor:1000},cm3:{label:'cm³',factor:.001},
   in3:{label:'in³',factor:.016387064},ft3:{label:'ft³',factor:28.316846592},gal:{label:'US galón',factor:3.785411784}
 },
 mass:{
   g:{label:'gram (g)',factor:.001},kg:{label:'kilogram (kg)',factor:1},t:{label:'tona (t)',factor:1000},
   oz:{label:'unca (oz)',factor:.028349523125},lb:{label:'libra (lb)',factor:.45359237}
 }
};
function populateUnitOptions(reset=true){
 const cat=document.getElementById('unit-category')?.value||'length';
 const from=document.getElementById('unit-from'),to=document.getElementById('unit-to');
 if(!from||!to)return;
 const entries=Object.entries(unitGroups[cat]||unitGroups.length);
 const oldFrom=from.value,oldTo=to.value;
 from.innerHTML='';to.innerHTML='';
 entries.forEach(([key,val])=>{
   const a=document.createElement('option');a.value=key;a.textContent=val.label;from.appendChild(a);
   const b=document.createElement('option');b.value=key;b.textContent=val.label;to.appendChild(b);
 });
 if(!reset && unitGroups[cat]?.[oldFrom])from.value=oldFrom;
 if(!reset && unitGroups[cat]?.[oldTo])to.value=oldTo;
 if(reset){
   if(cat==='length'){from.value='mm';to.value='cm'}
   else if(cat==='area'){from.value='m2';to.value='ft2'}
   else if(cat==='volume'){from.value='l';to.value='m3'}
   else if(cat==='mass'){from.value='kg';to.value='lb'}
 }
 calcUnit();
}
function calcUnit(){
 const form=document.getElementById('unit-converter'); if(!form)return;
 const cat=document.getElementById('unit-category')?.value||'length';
 const from=document.getElementById('unit-from')?.value;
 const to=document.getElementById('unit-to')?.value;
 const value=Number(document.getElementById('unit-value')?.value||0);
 const group=unitGroups[cat];
 if(!group?.[from]||!group?.[to])return;
 const base=value*group[from].factor;
 const result=base/group[to].factor;
 const smart=Math.abs(result)>=1000?fmt(result,2):Math.abs(result)>=1?fmt(result,4):fmt(result,6);
 const fromLabel=group[from].label.match(/\(([^)]+)\)/)?.[1]||group[from].label;
 const toLabel=group[to].label.match(/\(([^)]+)\)/)?.[1]||group[to].label;
 set('unit-result',smart+' '+toLabel);
 set('unit-formula',fmt(value,6)+' '+fromLabel+' = '+smart+' '+toLabel);
}

const plannerStorageKey='zahrada_project_planner_v1';
let plannerState={title:'',items:[]};
function plannerLoad(){
 try{
   const saved=JSON.parse(localStorage.getItem(plannerStorageKey)||'null');
   if(saved&&typeof saved==='object'&&Array.isArray(saved.items))plannerState=saved;
 }catch(e){}
 if(!plannerState.items.length)plannerState.items=[{name:'',qty:'',unit:'ks',note:''}];
}
function plannerRead(){
 const title=document.getElementById('planner-title');
 plannerState.title=title?.value||'';
 plannerState.items=[...document.querySelectorAll('#planner-items tr')].map(row=>({
   name:row.querySelector('[data-field="name"]')?.value||'',
   qty:row.querySelector('[data-field="qty"]')?.value||'',
   unit:row.querySelector('[data-field="unit"]')?.value||'',
   note:row.querySelector('[data-field="note"]')?.value||''
 }));
}
function plannerSave(){
 plannerRead();
 try{localStorage.setItem(plannerStorageKey,JSON.stringify(plannerState));set('planner-status','Uložené v tomto zariadení.')}catch(e){set('planner-status','Nepodarilo sa uložiť lokálne.')}
}
function plannerInput(field,value,type='text'){
 const input=document.createElement('input');input.type=type;input.value=value||'';input.dataset.field=field;
 if(type==='number'){input.step='any';input.min='0'}
 input.addEventListener('input',plannerSave);return input;
}
function plannerRender(){
 const body=document.getElementById('planner-items');if(!body)return;
 body.innerHTML='';
 plannerState.items.forEach((item,index)=>{
   const tr=document.createElement('tr');
   const tdName=document.createElement('td');tdName.appendChild(plannerInput('name',item.name));
   const tdQty=document.createElement('td');tdQty.appendChild(plannerInput('qty',item.qty,'number'));
   const tdUnit=document.createElement('td');tdUnit.appendChild(plannerInput('unit',item.unit||'ks'));
   const tdNote=document.createElement('td');tdNote.appendChild(plannerInput('note',item.note));
   const tdRemove=document.createElement('td');const btn=document.createElement('button');btn.type='button';btn.className='planner-remove';btn.setAttribute('aria-label','Odstrániť položku');btn.textContent='×';
   btn.addEventListener('click',()=>{plannerRead();plannerState.items.splice(index,1);if(!plannerState.items.length)plannerState.items.push({name:'',qty:'',unit:'ks',note:''});plannerRender();plannerPersistOnly()});
   tdRemove.appendChild(btn);tr.append(tdName,tdQty,tdUnit,tdNote,tdRemove);body.appendChild(tr);
 });
}
function plannerPersistOnly(){try{localStorage.setItem(plannerStorageKey,JSON.stringify(plannerState));set('planner-status','Uložené v tomto zariadení.')}catch(e){}}
async function plannerCopy(){
 plannerRead();
 const lines=[plannerState.title.trim()||'Projektový zoznam'];
 const useful=plannerState.items.filter(i=>i.name.trim()||i.qty||i.note.trim());
 useful.forEach((i,idx)=>lines.push((idx+1)+'. '+(i.name.trim()||'Položka')+(i.qty?' — '+i.qty+' '+(i.unit||''):'')+(i.note.trim()?' — '+i.note.trim():'')));
 const txt=lines.join('\n');
 try{
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(txt);
   else{
     const ta=document.createElement('textarea');ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
   }
   set('planner-status','Zoznam je skopírovaný do schránky.');
 }catch(e){set('planner-status','Kopírovanie sa nepodarilo. Označ položky ručne.')}
}
function initPlanner(){
 const body=document.getElementById('planner-items');if(!body)return;
 plannerLoad();
 const title=document.getElementById('planner-title');if(title){title.value=plannerState.title||'';title.addEventListener('input',plannerSave)}
 plannerRender();
 document.getElementById('planner-add')?.addEventListener('click',()=>{plannerRead();plannerState.items.push({name:'',qty:'',unit:'ks',note:''});plannerRender();plannerPersistOnly()});
 document.getElementById('planner-copy')?.addEventListener('click',plannerCopy);
 document.getElementById('planner-clear')?.addEventListener('click',()=>{if(confirm('Naozaj vymazať celý uložený plán?')){plannerState={title:'',items:[{name:'',qty:'',unit:'ks',note:''}]};if(title)title.value='';plannerRender();plannerPersistOnly();set('planner-status','Plán bol vymazaný.')}});
}

document.addEventListener('DOMContentLoaded',()=>{
 const p=document.getElementById('paint-calculator'); if(p){p.addEventListener('input',calcPaint);p.addEventListener('change',calcPaint);p.addEventListener('submit',e=>{e.preventDefault();calcPaint()});calcPaint()}
 const c=document.getElementById('concrete-calculator'); if(c){c.addEventListener('input',calcConcrete);c.addEventListener('change',calcConcrete);c.addEventListener('submit',e=>{e.preventDefault();calcConcrete()});calcConcrete()}
 const a=document.getElementById('anchor-guide'); if(a){a.addEventListener('change',anchorGuide);a.addEventListener('submit',e=>{e.preventDefault();anchorGuide()});anchorGuide()}
 const cut=document.getElementById('cut-plan-calculator'); if(cut){cut.addEventListener('input',calcCutPlan);cut.addEventListener('submit',e=>{e.preventDefault();calcCutPlan()});calcCutPlan()}
 const tile=document.getElementById('tile-calculator'); if(tile){tile.addEventListener('input',calcTile);tile.addEventListener('submit',e=>{e.preventDefault();calcTile()});calcTile()}
 const angle=document.getElementById('right-angle-calculator'); if(angle){angle.addEventListener('input',calcRightAngle);angle.addEventListener('submit',e=>{e.preventDefault();calcRightAngle()});calcRightAngle()}
 const gravel=document.getElementById('gravel-calculator'); if(gravel){gravel.addEventListener('input',calcGravel);gravel.addEventListener('submit',e=>{e.preventDefault();calcGravel()});calcGravel()}
 const mulch=document.getElementById('mulch-calculator'); if(mulch){mulch.addEventListener('input',calcMulch);mulch.addEventListener('submit',e=>{e.preventDefault();calcMulch()});calcMulch()}
 const slope=document.getElementById('slope-calculator'); if(slope){slope.addEventListener('input',calcSlope);slope.addEventListener('submit',e=>{e.preventDefault();calcSlope()});calcSlope()}
 const slopeTarget=document.getElementById('slope-target-calculator'); if(slopeTarget){slopeTarget.addEventListener('input',calcSlopeTarget);slopeTarget.addEventListener('submit',e=>{e.preventDefault();calcSlopeTarget()});calcSlopeTarget()}
 const coating=document.getElementById('wood-coating-calculator'); if(coating){coating.addEventListener('input',calcWoodCoating);coating.addEventListener('change',calcWoodCoating);coating.addEventListener('submit',e=>{e.preventDefault();calcWoodCoating()});calcWoodCoating()}
 const rain=document.getElementById('rain-calculator'); if(rain){rain.addEventListener('input',calcRain);rain.addEventListener('submit',e=>{e.preventDefault();calcRain()});calcRain()}
 const soil=document.getElementById('soil-calculator'); if(soil){soil.addEventListener('input',calcSoil);soil.addEventListener('submit',e=>{e.preventDefault();calcSoil()});calcSoil()}
 const unit=document.getElementById('unit-converter'); if(unit){document.getElementById('unit-category')?.addEventListener('change',()=>populateUnitOptions(true));unit.addEventListener('input',calcUnit);unit.addEventListener('change',calcUnit);populateUnitOptions(true)}
 initPlanner();
});
})();