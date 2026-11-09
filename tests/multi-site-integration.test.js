const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function runtime(config,shared){
 const storage={getItem:k=>shared.get(k)??null,setItem:(k,v)=>shared.set(k,String(v)),removeItem:k=>shared.delete(k)};
 const location={href:'https://same.example/'+(config?'other':'source')+'/index.html',hash:''};
 const c={window:{localStorage:storage,location},URL,atob,console,document:{title:'',querySelector:()=>null,documentElement:{style:{setProperty(){}},classList:{toggle(){}},setAttribute(){}}},location,navigator:{onLine:true},setTimeout,clearTimeout};vm.createContext(c);
 if(config)c.window.SUBSCRIPTION_SITE_CONFIG=config;else vm.runInContext(read('js/subscription/site-config.js'),c);
 for(const file of ['site-settings.js','site-bootstrap.js','site-storage.js','config.js','state.js','auth.js','utils.js','chrome.js','membership-journey.js'])vm.runInContext(read('js/subscription/'+file),c,{filename:file});
 return {c,run:s=>vm.runInContext(s,c)};
}
test('actual shared startup/reader modules isolate two identities on one origin with the same account ID',()=>{
 const shared=new Map(),source=runtime(null,shared);
 source.run('authState.user={id:"same-user",email:"source@example.test"};authState.ready=true;switchReaderAccount("same-user");authState.entitlements=[{tier_id:"0fc1b064-415e-4425-b6f6-558e941c1a10",tier_name:"Resident Evil",tier_rank:40,status:"active"}];store.notes.private="Source private note";store.progress.chapter=0.9;saveStore();');
 assert.equal(source.run('profileHasEvilTheme()'),true);assert.equal(source.run('availableProfileFrames().length'),5);
 const beta=runtime({siteKey:'observatory',siteProfiles:{observatory:{backendUrl:'https://observatory.supabase.co',identity:{siteName:'Observatory Tales'},links:{patreonUrl:'https://www.patreon.com/observatory'}}},supabase:{url:'https://observatory.supabase.co',anonKey:'sb_publishable_test'},publicBaseUrl:'./',providers:{patreon:true},features:{enablePatreonConnect:true},auth:{}},shared);
 beta.run('authState.user={id:"same-user",email:"other@example.test"};authState.ready=true;switchReaderAccount("same-user");authState.entitlements=[{tier_id:"0fc1b064-415e-4425-b6f6-558e941c1a10",tier_name:"Space Captain",tier_rank:100,status:"active"}];D.ACCESS_TIERS=Array.from({length:6},(_,i)=>({id:"crew-"+i,name:"Crew "+i,is_active:true}));');
 assert.equal(beta.run('store.notes.private'),undefined);assert.equal(beta.run('store.progress.chapter'),undefined);assert.equal(beta.run('profileHasEvilTheme()'),false);assert.equal(beta.run('availableProfileFrames().length'),0);
 const html=beta.run('topbar()+membershipProfileBanner()+membershipTierCards()');assert.match(html,/Observatory Tales/);assert.match(html,/Space Captain/);assert.match(html,/Crew 5/);assert.doesNotMatch(html,/EvilArchives|Resident |profile-frames|hornyshitler/i);
 assert.equal(beta.c.document.title,'Observatory Tales');assert.equal(beta.run('BOOSTY_URL'),'');assert.match(beta.run('PATREON_URL'),/observatory/);assert.equal(source.run('store.notes.private'),'Source private note');
});
