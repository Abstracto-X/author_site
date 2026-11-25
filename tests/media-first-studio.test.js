const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
function load(path){const ctx=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path,'utf8'),ctx);return ctx.window;}
test('labels and audiences resolve independently',()=>{
 const m=load('js/studio/media-model.js').StudioMedia;
 assert.equal(m.appearance(m.label({},'sfw'),'guest'),'original');
 const safe=m.setAudience(m.label({},'nsfw'),'registered');
 assert.equal(m.appearance(safe,'guest'),'teaser');
 assert.equal(m.appearance(safe,'registered'),'original');
 const extreme=m.label(safe,'nsfw-extreme');
 assert.equal(m.appearance(extreme,'guest'),'blocker');
 assert.throws(()=>m.setAudience(extreme,'public'));
});
test('range selection follows attachment order and toggles preserve others',()=>{
 const m=load('js/studio/media-model.js').StudioMedia;
 assert.deepEqual(Array.from(m.select(['a','b','c','d'],[],'d','b','range').ids),['b','c','d']);
 assert.deepEqual(Array.from(m.select(['a','b','c','d'],['b','c','d'],'d','c','toggle').ids),['b','d']);
});
test('shared geometry uses reader widths and card recipes',()=>{
 const m=load('js/shared/media-layout.js').MediaLayout;
 assert.equal(m.solveOrganicMasonry([{ratio:1}],0,new Map(),600,10).rects.get(0).w,397);
 assert.equal(m.compactMosaic(6,1).visibleCount,5);
});
test('signed feed fails closed if a protected original cannot be resolved',async()=>{
 const m=load('js/shared/media-storage.js').MediaStorage;
 const client={storage:{from:()=>({createSignedUrls:async()=>({data:[{path:'test',signedUrl:'https://example.test/teaser'}]})})}};
 const [p]=await m.signFeed(client,[{items:[{studio_private:true,media_url:'no',blur_thumb_url:'test'},{media_url:'legacy'}]}]);
 assert.equal(p.items[0].media_url,null);assert.equal(p.items[0].locked,true);
 assert.equal(p.items[0].blur_thumb_url,'https://example.test/teaser');assert.equal(p.items[1].media_url,'legacy');
});

test('protected rows never ask Storage to sign a denied original or poster',async()=>{
 const m=load('js/shared/media-storage.js').MediaStorage;
 const client={storage:{from:()=>({createSignedUrls:async paths=>{assert.deepEqual(Array.from(paths),['preview']);return {data:[]};}})}};
 const [p]=await m.signFeed(client,[{items:[{studio_private:true,locked:true,media_url:'original',poster_url:'poster',blur_thumb_url:'preview'}]}]);
 assert.equal(p.items[0].locked,true);assert.equal(p.items[0].media_url,null);assert.equal(p.items[0].poster_url,null);
});
test('Studio modules only address IDs present in the entrypoint and load after shared dependencies',()=>{
 const html=fs.readFileSync('studio.html','utf8');
 const ids=new Set([...html.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]));
 const code=['shell','media'].map(name=>fs.readFileSync('js/studio/'+name+'.js','utf8')).join(' ');
 for(const m of code.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(m[1]),m[1]);
 const scripts=[...html.matchAll(/<script src="([^?"]+)/g)].map(m=>m[1]);
 for(const f of scripts)assert.ok(fs.existsSync(f),f);
 assert.ok(scripts.indexOf('js/shared/media-layout.js')<scripts.indexOf('js/studio/media.js'));
 assert.ok(scripts.indexOf('js/studio/shell.js')<scripts.indexOf('js/studio/media.js'));
});

test('Studio styles do not import the unrelated reader cascade',()=>{
 const html=fs.readFileSync('studio.html','utf8');
 const local=[...html.matchAll(/href="([^"]+\.css)(?:\?[^"]*)?"/g)].map(m=>m[1]);
 assert.deepEqual(local,['styles/studio.css']);
 const css=fs.readFileSync('styles/studio.css','utf8');
 assert.match(css,/\.mp-mosaic\.layout-lead-2/);
 assert.match(css,/:focus-visible/);
});
