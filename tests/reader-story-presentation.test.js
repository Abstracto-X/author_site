const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/subscription/views/story-reader.js'),'utf8');
test('ornate story decoration requires explicit current-profile story ID and cutoff',()=>{
 const c={CONFIG:{appearance:{ornateStoryIds:['story-a']}},readerBehavior:()=>({enableOrnateSystemDialog:true,ornateSystemDialogAfterChapter:70}),systemDialogChapterNumber:ch=>ch.n,blocks:[{t:'system',v:'Text'}],chapter:{story_id:'story-a',n:71}};vm.createContext(c);
 const start=source.indexOf('function renderBlocks(');const next=source.indexOf('\nfunction ',start+1);vm.runInContext(source.slice(start,next),c);
 const render=()=>vm.runInContext('renderBlocks(blocks,"chapter",chapter)',c);
 assert.match(render(),/reader-system-dialog-v2/);c.chapter.story_id='story-b';assert.doesNotMatch(render(),/reader-system-dialog-v2/);c.chapter.story_id='story-a';c.chapter.n=70;assert.doesNotMatch(render(),/reader-system-dialog-v2/);c.chapter.n=71;c.CONFIG={appearance:{}};assert.doesNotMatch(render(),/reader-system-dialog-v2/);
});
test('story colors come from current repo mapping, not legacy DB appearance columns',()=>{
 const backend=fs.readFileSync(path.join(__dirname,'../js/subscription/backend.js'),'utf8');const start=backend.indexOf('function colorPair('),end=backend.indexOf('function normalizeBackendStory(',start);const c={CONFIG:{storyPresentation:{source:{accent:'#123456',accent2:'#654321'}}}};vm.createContext(c);vm.runInContext(backend.slice(start,end),c);
 assert.equal(c.colorPair({id:'source',theme_color:'#ffffff'},0).accent,'#123456');assert.equal(c.colorPair({id:'source'},0).accent2,'#654321');c.CONFIG.storyPresentation={};assert.notEqual(c.colorPair({id:'source',theme_color:'#ffffff'},0).accent,'#ffffff');
});
