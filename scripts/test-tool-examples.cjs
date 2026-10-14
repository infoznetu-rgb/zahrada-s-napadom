// Check published numeric examples against the calculators visitors actually use.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const cases=[
 ['calcPaint',{'paint-length':4,'paint-width':3,'paint-height':2.5,'paint-coats':2,'paint-coverage':10,'paint-reserve':10},{'paint-liters':'7,7 l'}],
 ['calcConcrete',{'concrete-length':3,'concrete-width':2,'concrete-depth':10,'concrete-count':1,'concrete-reserve':10,'concrete-yield':12,'concrete-shape':'rect'},{'concrete-total':'0,66 m³','concrete-bags':'55 ks'}],
 ['calcConcrete',{'concrete-length':3,'concrete-width':2,'concrete-depth':10.01,'concrete-count':1,'concrete-reserve':10,'concrete-yield':12,'concrete-shape':'rect'},{'concrete-bags':'56 ks'}],
 ['calcMulch',{'mulch-length':5,'mulch-width':2,'mulch-depth':5,'mulch-reserve':5,'mulch-bag':70},{'mulch-liters':'525 l','mulch-bags':'8 ks'}],
 ['calcGravel',{'gravel-length':10,'gravel-width':0.8,'gravel-depth':5,'gravel-reserve':10,'gravel-density':1600},{'gravel-total':'0,44 m³','gravel-kg':'704 kg'}],
 ['calcRain',{'rain-area':80,'rain-mm':10,'rain-efficiency':80,'rain-tank':1000},{'rain-gross':'800 l','rain-net':'640 l'}],
 ['calcSoil',{'soil-length':4,'soil-width':2,'soil-depth':10,'soil-compost':25,'soil-reserve':0,'soil-bag':50},{'soil-liters':'800 l','soil-compost-liters':'200 l','soil-earth':'600 l'}],
 ['calcIrrigation',{'irrigation-area':20,'irrigation-dose':10,'irrigation-frequency':3,'irrigation-flow':10,'irrigation-tank':1000},{'irrigation-once':'200 l','irrigation-week':'600 l','irrigation-time':'20 min'}],
 ['calcLawnSeed',{'lawn-seed-area':100,'lawn-seed-rate':30,'lawn-seed-reserve':10,'lawn-seed-pack':1},{'lawn-seed-total':'3,3 kg','lawn-seed-packs':'4 ks'}],
 ['calcFence',{'fence-length':1.9,'fence-slat-width':100,'fence-gap':20},{'fence-slats':'16 ks','fence-gap-actual':'20 mm'}],
 ['calcDeck',{'deck-length':4,'deck-width':3,'deck-board-width':140,'deck-gap':6,'deck-stock-length':4,'deck-reserve':10},{'deck-rows':'21','deck-linear-total':'92,4 m','deck-pieces':'24 ks'}],
 ['calcSlope',{'slope-rise':10,'slope-run':5},{'slope-percent':'2 %','slope-degrees':'1,15°'}],
];
const names=[...new Set(cases.map(([name])=>name))];
const source=fs.readFileSync(path.join(root,'majster-tools.js'),'utf8')
 .replace(/\}\)\(\);\s*$/,`globalThis.calculators={${names.join(',')}};})();`);
const nodes=new Map();
const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'0',textContent:'',checked:false,addEventListener(){}});return nodes.get(id)};
const context={Intl,console,document:{getElementById:node,addEventListener(){}}};
vm.createContext(context);vm.runInContext(source,context);
for(const [name,inputs,expected] of cases){
 nodes.clear();
 for(const [id,value] of Object.entries(inputs))node(id).value=String(value);
 context.calculators[name]();
 for(const [id,value] of Object.entries(expected))assert.equal(node(id).textContent.replace(/\s/g,' '),value,`${name}: ${id}`);
}
console.log(`Calculator examples passed: ${cases.length} scenarios`);
