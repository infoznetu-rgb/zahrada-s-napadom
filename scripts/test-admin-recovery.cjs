const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('admin/admin.js','utf8').split('function setSidebarOpen')[0];
function setup(hash=''){
 const elements=new Map(),calls=[];let callback;
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',hidden:false,disabled:false,className:'',textContent:'',handlers:{},addEventListener(event,fn){this.handlers[event]=fn},reportValidity(){return !!this.value},reset(){this.value=''},querySelector(){return element('submit')},classList:{contains(name){return element(id).className.split(' ').includes(name)}}});return elements.get(id)};
 const state={session:{user:{id:'user'}},admin:false};
 const db={auth:{getSession:async()=>({data:{session:state.session}}),onAuthStateChange:fn=>{callback=fn},resetPasswordForEmail:async(email,options)=>{calls.push(['reset',email,options]);return{}},updateUser:async()=>{calls.push(['update']);return{}},signOut:async()=>{calls.push(['signout']);state.session=null;return{}},signInWithPassword:async()=>({})},from(){calls.push(['rolecheck']);return{select(){return this},eq(){return this},maybeSingle:async()=>({data:state.admin?{}:null})}}};
 const context=vm.createContext({window:{supabase:{createClient:()=>db}},document:{querySelector:element,querySelectorAll:()=>[]},URL,URLSearchParams,location:{hash,origin:'https://example.invalid',pathname:'/admin/'},history:{replaceState(){}},setTimeout(){},localStorage:{setItem(){}},console});
 vm.runInContext(source,context);
 return{element,calls,state,context,event:kind=>callback(kind)};
}
(async()=>{
 let t=setup();t.element('#login-email').value='fixture@example.invalid';await t.element('#password-reset-request').handlers.click();
 assert.equal(t.calls[0][0],'reset');assert.equal(t.calls[0][2].redirectTo,'https://example.invalid/admin/');assert.match(t.element('#auth-message').textContent,/Ak má tento e-mail/);
 t=setup('#type=recovery');await vm.runInContext('checkAdmin()',t.context);assert.equal(t.calls.length,0);assert(t.element('#login-form').hidden);assert(!t.element('#password-recovery-form').hidden);
 t.element('#recovery-password').value='fixture-password-123';t.element('#recovery-password-confirm').value='different-fixture';
 const submit=()=>t.element('#password-recovery-form').handlers.submit({preventDefault(){},currentTarget:t.element('#password-recovery-form')});
 await submit();assert(!t.calls.some(c=>c[0]==='update'));
 t.element('#recovery-password-confirm').value='fixture-password-123';t.state.session=null;await submit();assert(!t.calls.some(c=>c[0]==='update'));
 t.state.session={user:{id:'user'}};await submit();assert.equal(t.calls.filter(c=>c[0]==='update').length,1);assert(t.element('#password-recovery-form').hidden);assert(!t.element('#login-form').hidden);assert.equal(t.state.session,null);
 t=setup();await vm.runInContext('checkAdmin()',t.context);assert(t.calls.some(c=>c[0]==='rolecheck'));assert.equal(t.state.session,null);assert.match(t.element('#auth-message').textContent,/nemá oprávnenie/);
 let redirected='';const location={origin:'https://example.invalid',hash:'#type=login',replace:to=>{redirected=to}};
 const redirectSource=fs.readFileSync('auth-recovery-redirect.js','utf8');vm.runInNewContext(redirectSource,{URL,URLSearchParams,location});assert.equal(redirected,'');location.hash='#type=recovery';vm.runInNewContext(redirectSource,{URL,URLSearchParams,location});assert.equal(redirected,'https://example.invalid/admin/#type=recovery');
 console.log('Admin recovery passed: neutral email response, recovery isolation, expired session, password confirmation, role denial, safe callback routing.');
})().catch(error=>{console.error(error);process.exitCode=1});
