const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=f=>fs.readFileSync(require('node:path').join(__dirname,'../',f),'utf8');
function boot(config, settings=true, document){const window={SUBSCRIPTION_SITE_CONFIG:config,location:{href:'https://author.example/sub/writer.html'},console:{}};const c={window,URL,document,console:{error(){},warn(){}}};vm.createContext(c);if(settings)vm.runInContext(read('js/subscription/site-settings.js'),c);vm.runInContext(read('js/subscription/site-bootstrap.js'),c);return window;}
const config=()=>({siteKey:'beta',siteProfiles:{beta:{backendUrl:'https://beta.supabase.co',identity:{siteName:'Beta'},links:{supportUrl:'https://beta.example/help'}}},supabase:{url:'https://beta.supabase.co',anonKey:'sb_publishable_test'},publicBaseUrl:'./',siteName:'Wrong brand',links:{supportUrl:'https://wrong.example'}});
test('bootstrap selects repository profile before all three surface clients',()=>{const w=boot(config());assert.equal(w.SITE_CONFIGURATION_STATUS.ok,true);assert.equal(w.SUBSCRIPTION_SITE_CONFIG.siteName,'Beta');assert.equal(w.SUBSCRIPTION_SITE_CONFIG.publicBaseUrl,'https://author.example/sub/');assert.equal(w.SUBSCRIPTION_SITE_CONFIG.links.supportUrl,'https://beta.example/help');for(const file of ['index.html','admin.html','writer.html']){const s=read(file);assert.ok(s.indexOf('site-config.js')<s.indexOf('site-settings.js'));assert.ok(s.indexOf('site-settings.js')<s.indexOf('site-bootstrap.js'));const client=s.indexOf('createClient(');if(client>=0)assert.ok(s.indexOf('site-bootstrap.js')<client);}});
test('mismatch or missing module removes all connection and other-site appearance',()=>{const wrong=config();wrong.supabase.url='https://alpha.supabase.co';for(const w of [boot(wrong),boot(config(),false),boot({})]){assert.equal(w.SITE_CONFIGURATION_STATUS.ok,false);assert.equal(w.SUBSCRIPTION_SITE_CONFIG.siteName,'Reader');assert.equal(w.SUBSCRIPTION_SITE_CONFIG.supabase.url,undefined);assert.equal(w.SUBSCRIPTION_SITE_CONFIG.links.supportUrl,undefined);}});
test('checked-in real configuration passes bootstrap without network',()=>{const c={window:{}};vm.runInNewContext(read('js/subscription/site-config.js'),c);const w=boot(c.window.SUBSCRIPTION_SITE_CONFIG);assert.equal(w.SITE_CONFIGURATION_STATUS.ok,true);assert.equal(w.SUBSCRIPTION_SITE_CONFIG.siteName,'EvilArchives');});

test('startup metadata uses repository identity even before network and fails neutrally',()=>{
 const doc={title:'Wrong Brand',querySelector(){return {setAttribute(k,v){doc.meta=v;}}}};
 boot(config(),true,doc);assert.equal(doc.title,'Beta | Writer Studio');assert.equal(doc.meta,'');
 boot({},true,doc);assert.equal(doc.title,'Reader | Writer Studio');
 for(const file of ['index.html','admin.html','writer.html'])assert.doesNotMatch(read(file),/EvilArchives/);
});
test('optional local CSS failure removes only that stylesheet and keeps base configuration',()=>{
 const cfg=config();cfg.siteProfiles.beta.stylesheets=['styles/sites/beta.css'];const added=[];let removed=false;
 const doc={readyState:'complete',title:'',querySelector(){return null;},head:{appendChild:node=>added.push(node)},createElement:()=>({setAttribute(){},remove(){removed=true;}})};
 const w=boot(cfg,true,doc);assert.equal(added.length,1);assert.equal(added[0].href,'styles/sites/beta.css');added[0].onerror();assert.equal(removed,true);assert.equal(w.SITE_CONFIGURATION_STATUS.ok,true);assert.equal(w.SUBSCRIPTION_SITE_CONFIG.siteName,'Beta');
});
test('missing or privileged frontend key fails neutrally before any surface client can start',()=>{
 for(const key of [undefined,'','sb_secret_private']){const cfg=config();cfg.supabase.anonKey=key;const w=boot(cfg);assert.equal(w.SITE_CONFIGURATION_STATUS.ok,false);assert.equal(w.SUBSCRIPTION_SITE_CONFIG.supabase.url,undefined);assert.equal(w.SUBSCRIPTION_SITE_CONFIG.siteName,'Reader');}
});
