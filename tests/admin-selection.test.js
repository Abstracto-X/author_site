const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('Admin stored story selection resolves only real current-backend IDs',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../admin.html'),'utf8');const start=html.indexOf('function resolveAdminStoryId('),end=html.indexOf('\n        const ADMIN_VIEW_NAMES',start);const c={};vm.createContext(c);vm.runInContext(html.slice(start,end),c);
 assert.equal(c.resolveAdminStoryId([{id:'real'},{id:'other'}],'other'),'other');assert.equal(c.resolveAdminStoryId([{id:'real'}],'stale-from-another-backend'),'real');assert.equal(c.resolveAdminStoryId([],'old'),null);
 assert.doesNotMatch(html,/State\.selectedStoryId = State\.selectedStoryId \|\| stories\[0\]\.id/);
});
