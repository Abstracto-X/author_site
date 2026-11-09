const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
for(const name of ['index.html','admin.html','writer.html'])test(`${name} has dependency-independent neutral setup recovery`,()=>{
 const html=fs.readFileSync(path.join(root,name),'utf8');const code=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes("heading.textContent = 'Site setup required'"));assert.ok(code);
 for(const valid of [true,false]){let listener,replaced=0;const c={window:{SITE_CONFIGURATION_STATUS:{ok:valid},SiteStorage:{},AuthorSession:{},location:{reload(){}}},document:{addEventListener:(event,fn)=>listener=fn,createElement:()=>({setAttribute(){},style:{},append(){}}),body:{replaceChildren(){replaced++;}}}};vm.runInNewContext(code,c);listener();assert.equal(replaced,valid?0:1);}
});
test('provider help copy composes only enabled supported providers',()=>{
 const s=fs.readFileSync(path.join(root,'js/subscription/config.js'),'utf8');const code=s.slice(s.indexOf('function providerSyncCopy('),s.indexOf('function configuredSupabase('));const c={patreonEnabled:()=>false,boostyDiscordEnabled:()=>false};vm.createContext(c);vm.runInContext(code,c);assert.doesNotMatch(c.providerSyncCopy(),/Patreon|Boosty/);c.patreonEnabled=()=>true;assert.match(c.providerSyncCopy(),/Patreon/);assert.doesNotMatch(c.providerSyncCopy(),/Boosty/);
});
