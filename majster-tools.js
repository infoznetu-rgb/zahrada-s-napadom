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

document.addEventListener('DOMContentLoaded',()=>{
 const p=document.getElementById('paint-calculator'); if(p){p.addEventListener('input',calcPaint);p.addEventListener('change',calcPaint);p.addEventListener('submit',e=>{e.preventDefault();calcPaint()});calcPaint()}
 const c=document.getElementById('concrete-calculator'); if(c){c.addEventListener('input',calcConcrete);c.addEventListener('change',calcConcrete);c.addEventListener('submit',e=>{e.preventDefault();calcConcrete()});calcConcrete()}
 const a=document.getElementById('anchor-guide'); if(a){a.addEventListener('change',anchorGuide);a.addEventListener('submit',e=>{e.preventDefault();anchorGuide()});anchorGuide()}
 const cut=document.getElementById('cut-plan-calculator'); if(cut){cut.addEventListener('input',calcCutPlan);cut.addEventListener('submit',e=>{e.preventDefault();calcCutPlan()});calcCutPlan()}
 const tile=document.getElementById('tile-calculator'); if(tile){tile.addEventListener('input',calcTile);tile.addEventListener('submit',e=>{e.preventDefault();calcTile()});calcTile()}
 const angle=document.getElementById('right-angle-calculator'); if(angle){angle.addEventListener('input',calcRightAngle);angle.addEventListener('submit',e=>{e.preventDefault();calcRightAngle()});calcRightAngle()}
});
})();