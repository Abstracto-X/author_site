const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { window: {}, URL };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/subscription/site-settings.js'), 'utf8'), context);
const resolve = context.window.SiteSettings.resolve;
const plain = value => JSON.parse(JSON.stringify(value));
const profiles = () => ({
  orchard: { backendUrl: 'https://orchard.supabase.co/', identity: { siteName: ' Orchard ', siteTagline: 'Trees', metaDescription: 'Fruit' }, links: { supportUrl: 'https://example.org/help?q=1#top' } },
  observatory: { backendUrl: 'https://stars.supabase.co', identity: { siteName: 'Observatory', siteTagline: 'Stars' }, links: { discordUrl: 'https://chat.example.net/invite' } }
});
const deployment = (siteKey = 'orchard', backendUrl = 'https://orchard.supabase.co') => ({ siteKey, backendUrl });

test('selects only explicit matching profile and normalizes a detached allowlisted snapshot', () => {
  const p = profiles();
  p.orchard.identity.role = 'admin'; p.orchard.links.script = 'https://evil.example/';
  p.orchard.serviceRoleKey = 'secret'; p.orchard.site_identity = { siteName: 'DB override' };
  const result = resolve(deployment(), p, { siteName: 'DB override' });
  assert.deepEqual(plain(result), { ok: true, siteKey: 'orchard', backendUrl: 'https://orchard.supabase.co', identity: { siteName: 'Orchard', siteTagline: 'Trees', metaDescription: 'Fruit' }, links: { mainArchiveUrl: '', patreonUrl: '', supportUrl: 'https://example.org/help?q=1#top', discordUrl: '', boostyUrl: '' }, appearance: { appBackgroundUrl: '', enableAppBackground: true, enableOrnateSystemDialog: false, ornateSystemDialogAfterChapter: 0 }, tierPresentation: {}, profileFrames: [], writerTestAccount: {enabled:false}, library:{primaryStoryId:'',featuredStoryIds:null}, stylesheets:[] });
  result.identity.siteName = 'changed'; result.links.supportUrl = 'changed';
  assert.equal(p.orchard.identity.siteName, ' Orchard ');
  assert.equal(resolve(deployment(), p).identity.siteName, 'Orchard');
  assert.equal(resolve(deployment('observatory', 'https://stars.supabase.co/'), p).identity.siteName, 'Observatory');
});

test('fails neutrally on unknown or mismatched deployments', () => {
  for (const [d, code] of [[deployment('unknown'), 'unknown_site'], [deployment('orchard', 'https://stars.supabase.co'), 'backend_mismatch'], [deployment(''), 'invalid_site_key']]) {
    const result = plain(resolve(d, profiles()));
    assert.equal(result.error, code); assert.equal(result.ok, false);
    assert.deepEqual(result.identity, { siteName: 'Reader', siteTagline: '', metaDescription: '' });
    assert.deepEqual(Object.values(result.links), ['', '', '', '', '']);
  }
});

test('validates canonical Supabase origin for both inputs', () => {
  for (const url of ['http://orchard.supabase.co', 'https://user@orchard.supabase.co', 'https://orchard.supabase.co/path', 'https://orchard.supabase.co?x=1', 'https://orchard.supabase.co#x', 'https://orchard.supabase.co:443', 'https://supabase.co', 'https://orchard.supabase.co.evil.test']) {
    assert.equal(resolve(deployment('orchard', url), profiles()).error, 'invalid_backend_url', url);
    const p = profiles(); p.orchard.backendUrl = url;
    assert.equal(resolve(deployment(), p).error, 'invalid_backend_url', url);
  }
});

test('rejects malformed structures and provided fields, but permits missing optional values', () => {
  assert.equal(resolve(null, {}).error, 'invalid_root');
  assert.equal(resolve(deployment(), []).error, 'invalid_root');
  assert.equal(resolve(deployment(), { orchard: [] }).error, 'invalid_profile');
  for (const value of [null, [], 'x', 5]) {
    const p = profiles(); p.orchard.identity = value; assert.equal(resolve(deployment(), p).error, 'invalid_identity');
    p.orchard.identity = {}; p.orchard.links = value; assert.equal(resolve(deployment(), p).error, 'invalid_links');
  }
  const p = profiles(); p.orchard.identity = { siteName: '  ', siteTagline: 1 };
  assert.equal(resolve(deployment(), p).error, 'invalid_identity');
  p.orchard.identity = { siteName: '  ' }; delete p.orchard.links;
  assert.equal(resolve(deployment(), p).identity.siteName, 'Reader');
  delete p.orchard.identity; assert.equal(resolve(deployment(), p).ok, true);
  assert.equal(resolve(deployment('__proto__'), {}).error, 'unknown_site');
});

test('allows only safe absolute HTTPS links', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,x', 'http://example.com', '/relative', 'https://user:pass@example.com', 5, null]) {
    const p = profiles(); p.orchard.links.supportUrl = value;
    assert.equal(resolve(deployment(), p).error, 'invalid_links', String(value));
  }
  const p = profiles(); p.orchard.links.supportUrl = '  https://example.com/a?x=1#part  ';
  assert.equal(resolve(deployment(), p).links.supportUrl, 'https://example.com/a?x=1#part');
  p.orchard.links.supportUrl = ' '; assert.equal(resolve(deployment(), p).links.supportUrl, '');
});


test('deployment roots retain subdirectories and chapter links target the configured reader', () => {
  const api = context.window.SiteSettings;
  assert.equal(api.publicRoot('./', 'https://author.example/books/writer.html'), 'https://author.example/books/');
  assert.equal(api.readerUrl('https://other.example/library', 'https://author.example/writer.html', 'chapter/one'), 'https://other.example/library/index.html#/read/chapter%2Fone');
  assert.equal(api.readerUrl('./', 'http://localhost:8080/sub/admin.html'), 'http://localhost:8080/sub/index.html');
  for (const root of ['', 'javascript:alert(1)', 'https://user:pass@example.com', 'https://example.com/?x=1', 'https://example.com/#foo', 'http://example.com']) {
    assert.throws(() => api.publicRoot(root, 'https://author.example/admin.html'), undefined, root);
  }
  assert.throws(() => api.readerUrl('./', 'https://author.example/admin.html', ' '));
});

test('appearance is site-scoped, validated, detached and neutral for an unmapped site', () => {
 const p=profiles(); p.orchard.appearance={enableOrnateSystemDialog:true,ornateSystemDialogAfterChapter:70,appBackgroundUrl:'https://art.example/a.png'};
 const r=resolve(deployment(),p); assert.equal(r.appearance.enableOrnateSystemDialog,true);
 p.orchard.appearance.enableOrnateSystemDialog=false;assert.equal(r.appearance.enableOrnateSystemDialog,true);
 assert.equal(resolve(deployment('observatory','https://stars.supabase.co'),p).appearance.enableOrnateSystemDialog,false);
 for(const a of [null,[],{enableOrnateSystemDialog:'true'},{ornateSystemDialogAfterChapter:-1},{ornateSystemDialogAfterChapter:0.5},{appBackgroundUrl:'javascript:alert(1)'}]) {p.orchard.appearance=a; assert.equal(resolve(deployment(),p).error,'invalid_appearance');}
});
test('tier colors follow stable scoped IDs, not names, rank or apparent membership',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../js/subscription/views/story-reader.js'),'utf8');
 const c={CONFIG:{tierPresentation:{'stable-id':{accent:'#123456',rgb:'18, 52, 86',lockClass:'tier-tyrant'}}}};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function getLockTierClass('),source.indexOf('function chapterTierStyle(')),c);
 const visual=ch=>{c.ch=ch;return vm.runInContext('chapterTierVisual(ch)',c);};
 assert.equal(visual({required_tier_id:'stable-id',required_tier_name:'Renamed Space Pilot'}).accent,'#123456');
 assert.equal(visual({required_tier_id:'unknown',required_tier_name:'Resident Tyrant'}).accent,'#94a3b8');
 c.CONFIG.tierPresentation={};assert.equal(visual({required_tier_id:'stable-id',required_tier_name:'Another Author'}).accent,'#94a3b8');
 assert.equal(visual({}).label,'Free Access');
});
test('tier presentation resolver rejects CSS injection and strips unauthorized fields',()=>{
 const p=profiles();p.orchard.tierPresentation={'tier-id':{accent:'#123456',name:'Fake tier',can_read:true}};
 const result=resolve(deployment(),p);assert.equal(result.tierPresentation['tier-id'].rgb,'18, 52, 86');assert.equal(result.tierPresentation['tier-id'].can_read,undefined);
 p.orchard.tierPresentation['tier-id'].accent='red;display:none';assert.equal(resolve(deployment(),p).error,'invalid_tier_presentation');
});
test('profile frame rules are detached, site-scoped and reference only reviewed local art',()=>{
 const p=profiles();p.orchard.profileFrames=[{id:'crest',label:'Local crest',src:'assets/crest.png'}];p.orchard.tierPresentation={'tier-id':{accent:'#123456',frameIds:['crest'],defaultFrameId:'crest'}};
 const r=resolve(deployment(),p);assert.equal(r.profileFrames[0].id,'crest');p.orchard.profileFrames[0].label='mutated';assert.equal(r.profileFrames[0].label,'Local crest');r.tierPresentation['tier-id'].frameIds.push('other');assert.equal(p.orchard.tierPresentation['tier-id'].frameIds.length,1);
 assert.equal(resolve(deployment('observatory','https://stars.supabase.co'),p).profileFrames.length,0);
 p.orchard.profileFrames[0].src='https://unreviewed.example/frame.png';assert.equal(resolve(deployment(),p).error,'invalid_profile_frames');
 p.orchard.profileFrames[0].src='assets/crest.png';p.orchard.tierPresentation['tier-id'].frameIds=['unknown'];assert.equal(resolve(deployment(),p).error,'invalid_profile_frames');
});
test('library selections resolve only current real stories, tolerate deleted IDs and support no featured stories',()=>{
 const api=context.window.SiteSettings;const stories=[{id:'new',slug:'new-story'},{id:'old',slug:'old-story'}];
 assert.equal(api.selectLibrary(stories,{primaryStoryId:'old'}).primarySlug,'old-story');
 assert.equal(api.selectLibrary(stories,{primaryStoryId:'deleted'}).primarySlug,'new-story');
 assert.deepEqual(plain(api.selectLibrary(stories,{featuredStoryIds:['old','missing','old']})).featuredSlugs,['old-story']);
 assert.deepEqual(plain(api.selectLibrary(stories,{featuredStoryIds:[]})).featuredSlugs,[]);
 assert.equal(api.selectLibrary([],{primaryStoryId:'old'}).primarySlug,'');
});
test('auth return targets configured reader subdirectory without tokens/query and refuses cross-origin PKCE callbacks',()=>{
 const api=context.window.SiteSettings;
 assert.equal(api.authReturnUrl('/library/','https://author.example/preview/index.html?token=private#/vault'),'https://author.example/library/index.html');
 assert.throws(()=>api.authReturnUrl('https://other.example/','https://author.example/index.html'),/auth_return_origin_mismatch/);
 assert.equal(api.authReturnUrl('./','http://localhost:8000/sub/index.html'),'http://localhost:8000/sub/index.html');
});
test('site stylesheets are reviewed local files only and copied without mutation',()=>{
 const p=profiles();p.orchard.stylesheets=['styles/sites/orchard.css'];const r=resolve(deployment(),p);r.stylesheets.push('styles/sites/other.css');assert.equal(p.orchard.stylesheets.length,1);
 for(const path of ['https://remote.example/style.css','styles/sites/../other.css','styles/sites/x.css?x=1','javascript:alert(1)']){p.orchard.stylesheets=[path];assert.equal(resolve(deployment(),p).error,'invalid_stylesheets');}
});
