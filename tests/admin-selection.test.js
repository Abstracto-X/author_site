const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('Admin stored story selection resolves only real current-backend IDs',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../admin.html'),'utf8');const start=html.indexOf('function resolveAdminStoryId('),end=html.indexOf('\n        const ADMIN_VIEW_NAMES',start);const c={};vm.createContext(c);vm.runInContext(html.slice(start,end),c);
 assert.equal(c.resolveAdminStoryId([{id:'real'},{id:'other'}],'other'),'other');assert.equal(c.resolveAdminStoryId([{id:'real'}],'stale-from-another-backend'),'real');assert.equal(c.resolveAdminStoryId([],'old'),null);
 assert.doesNotMatch(html,/State\.selectedStoryId = State\.selectedStoryId \|\| stories\[0\]\.id/);
});
test('Admin auth callback defers profile queries outside the Supabase lock and drops superseded users',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../admin.html'),'utf8');const start=html.indexOf('supabaseClient.auth.onAuthStateChange('),end=html.indexOf('\n                });',start)+21;let callback,loads=0;const tasks=[];
 const c={State:{user:null,profile:null},supabaseClient:{auth:{onAuthStateChange:fn=>callback=fn}},window:{setTimeout:fn=>tasks.push(fn)},Auth:{loadProfile(){loads++;},showLoginView(){}}};vm.createContext(c);vm.runInContext(html.slice(start,end),c);
 assert.equal(callback('SIGNED_IN',{user:{id:'alice'}}),undefined);assert.equal(loads,0);c.State.user={id:'bob'};tasks.shift()();assert.equal(loads,0);callback('SIGNED_IN',{user:{id:'bob'}});tasks.shift()();assert.equal(loads,1);
});
