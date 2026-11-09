const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/subscription/auth.js'),'utf8');
function fn(name){const start=source.indexOf('function '+name+'(');return source.slice(start,source.indexOf('\n}',start)+2);}
test('reader UI admin status ignores editable user metadata but accepts trusted profile/app metadata',()=>{
 const c={authState:{profile:null,user:{user_metadata:{role:'admin'}}}};vm.createContext(c);vm.runInContext(fn('isAdmin'),c);assert.equal(c.isAdmin(),false);c.authState.user.app_metadata={role:'admin'};assert.equal(c.isAdmin(),true);c.authState.user={};c.authState.profile={role:'admin'};assert.equal(c.isAdmin(),true);
});
test('entitlement summary uses backend rank and not a magic tier name',()=>{
 let rows=[{tier_name:'Archivist',tier_rank:5},{tier_name:'Sky Pilot',tier_rank:90}];const c={activeEntitlements:()=>rows};vm.createContext(c);vm.runInContext(fn('entitlementLevel'),c);assert.equal(c.entitlementLevel(),90);rows=[{tier_name:'Archivist',tier_rank:5}];assert.equal(c.entitlementLevel(),5);rows=[];assert.equal(c.entitlementLevel(),0);
});
