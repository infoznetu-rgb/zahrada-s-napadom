const assert=require('node:assert/strict');
const rules=require('../bazar-content.js');
assert(rules.active({status:'published',expires_at:'infinity'}));
assert(!rules.active({status:'closed',expires_at:'infinity'}));
assert(!rules.active({status:'published',expires_at:'2020-01-01'}));
assert(!rules.active({status:'pending',expires_at:'infinity'}));
assert(rules.imported({imported:false,import_source_data:{import_file:'archive.xlsx'}}));
assert(rules.reviewNeeded({id:'61cb7d88-91da-441a-81e7-03949f681368'}));
assert(rules.reviewNeeded({id:'1b28f669-77ce-4182-b470-53a5ec3c8167',title:'Vodomerná šachta',price:1111111}));
assert(!rules.reviewNeeded({id:'ordinary',title:'Tavná pištoľ'}));
assert.equal(rules.category({category:'Ostatné',title:'Benzínová kosačka'}),'Záhradná technika');
assert.deepEqual(rules.missing({description:'Popis',price_mode:'free',location:'Nitra',contact_phone:'123',images:['photo']}),[]);
assert(rules.missing({price_mode:'not_listed'}).includes('konkrétna cena'));
assert(rules.questions({title:'Kosačka',category:'Záhradná technika'})[0].includes('model'));
console.log('Bazaar: permanent/closed/expired states, import provenance, review exclusions and buying guidance passed.');

// A temporary connection failure must not be presented as a removed listing.
const vm=require('node:vm');
const fs=require('node:fs');
const detailSource=fs.readFileSync(require.resolve('../inzerat.js'),'utf8');
const loader=detailSource.slice(detailSource.indexOf('async function loadAd(){'),detailSource.indexOf('$("#ad-retry")?.addEventListener'));
async function detailResult(result,networkFailure=false){
  const retry={hidden:true};let message='',rendered=false;
  const query={select(){return this},eq(){return this},gt(){return this},async maybeSingle(){if(networkFailure)throw Error('offline');return result}};
  const context={$:()=>retry,setStatus:text=>message=text,location:{search:'?id=test'},URLSearchParams,detailDb:{from:()=>query},BazarContent:{reviewNeeded:ad=>ad.id==='held'},renderAd:()=>rendered=true};
  vm.createContext(context);vm.runInContext(loader,context);await context.loadAd();
  return {retryVisible:!retry.hidden,message,rendered};
}
(async()=>{
  for(const result of [await detailResult({error:{message:'unavailable'}}),await detailResult(null,true)]){
    assert(result.retryVisible);assert(result.message.includes('pripojenie'));assert(!result.rendered);
  }
  for(const data of [null,{id:'held'}]){
    const result=await detailResult({data});assert(!result.retryVisible);assert(result.message.includes('nie je dostupný'));assert(!result.rendered);
  }
  assert((await detailResult({data:{id:'valid'}})).rendered);
  console.log('Bazaar detail: retry on connection failure, unavailable and held listings, valid listing passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
