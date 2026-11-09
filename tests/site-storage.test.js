const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const window={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/subscription/site-storage.js'),'utf8'),{window,Map});
function storage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
const config=(siteKey,url='https://one.supabase.co')=>({siteKey,supabase:{url}});
test('same-origin application keys are isolated by both site and backend',()=>{const db=storage(),a=window.SiteStorage.create(config('one'),db),b=window.SiteStorage.create(config('two'),db),c=window.SiteStorage.create(config('one','https://two.supabase.co'),db);a.setItem('draft','private');assert.equal(b.getItem('draft'),null);assert.equal(c.getItem('draft'),null);assert.equal(a.getItem('draft'),'private');db.setItem('sb-auth','token');a.removeItem('draft');assert.equal(db.getItem('sb-auth'),'token');});
test('legacy import is explicit, non-destructive and removal survives reload',()=>{const db=storage();db.setItem('old','saved');const a=window.SiteStorage.create(config('one'),db,['old']);assert.equal(a.getItem('old'),'saved');assert.equal(db.getItem('old'),'saved');assert.equal(window.SiteStorage.create(config('two'),db).getItem('old'),null);a.removeItem('old');assert.equal(window.SiteStorage.create(config('one'),db,['old']).getItem('old'),null);});
test('unconfigured or blocked persistence uses isolated memory',()=>{const db=storage(),a=window.SiteStorage.create({},db);a.setItem('x','a');assert.equal(a.getItem('x'),'a');assert.equal(window.SiteStorage.create({},db).getItem('x'),null);const b=window.SiteStorage.create(config('one'),{getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()}});b.setItem('x','b');assert.equal(b.getItem('x'),'b');b.removeItem('x');assert.equal(b.getItem('x'),null);});

test('authoring surfaces and AI helper use application storage without shadowing browser auth storage',()=>{
 for(const file of ['admin.html','writer.html']) {
  const html=fs.readFileSync(path.join(__dirname,'../',file),'utf8');
  assert.ok(html.includes('const AppStorage = window.SiteStorage.author;'));
  assert.doesNotMatch(html,/\blocalStorage\./);
  assert.doesNotMatch(html,/const localStorage\s*=/);
 }
 const ai=fs.readFileSync(path.join(__dirname,'../js/writer-ai-chat.js'),'utf8');
 assert.ok(ai.includes('window.SiteStorage.author.getItem'));
 assert.doesNotMatch(ai,/(?<!SiteStorage\.)\blocalStorage\./);
 const db=storage();db.setItem('ea-chapter-draft:new:story','unowned legacy draft');
 const a=window.SiteStorage.create(config('one'),db);
 assert.equal(a.getItem('ea-chapter-draft:new:story'),null);
 assert.equal(db.getItem('ea-chapter-draft:new:story'),'unowned legacy draft');
});

test('account namespaces cannot read another author buffers',()=>{
 const db=storage();const a=window.SiteStorage.create(config('one'),db,[],'author-a'),b=window.SiteStorage.create(config('one'),db,[],'author-b');
 a.setItem('draft','private');assert.equal(b.getItem('draft'),null);assert.equal(a.getItem('draft'),'private');
});
test('author facade starts ephemeral, binds once and refuses account hot swaps',()=>{
 const db=storage(),w={SUBSCRIPTION_SITE_CONFIG:config('one'),localStorage:db};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/subscription/site-storage.js'),'utf8'),{window:w,Map});
 const a=w.SiteStorage.author;a.setItem('draft','pre-auth');w.SiteStorage.bindAuthor('author-a');assert.equal(a.getItem('draft'),null);a.setItem('draft','verified');w.SiteStorage.bindAuthor('author-a');assert.equal(a.getItem('draft'),'verified');assert.throws(()=>w.SiteStorage.bindAuthor('author-b'));assert.throws(()=>w.SiteStorage.bindAuthor(''));
});
