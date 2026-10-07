// Isolated rendering/contract checks. Fixtures exist only in this test harness,
// never as a production fallback. Run from repo root: node --test tests/reader-redesign.test.js
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const read = file => fs.readFileSync(`${process.cwd()}/${file}`, 'utf8');
function harness() {
  const context = vm.createContext({ console, URL, setTimeout, clearTimeout,
    window: { localStorage: { getItem:()=>null, setItem(){} } },
    document: { querySelector:()=>null, getElementById:()=>null, documentElement:{setAttribute(){},style:{setProperty(){}}} },
    location:{ hash:'' }, navigator:{onLine:true} });
  for (const file of ['config.js','state.js','utils.js','router.js','chrome.js','views/home-library.js','views/story-reader.js','views/gallery.js']) {
    vm.runInContext(read(`js/subscription/${file}`),context,{filename:file});
  }
  vm.runInContext(`
    let testEntitled = false;
    const authState = {user:null};
    function isAdmin(){ return false; }
    function activeEntitlements(){ return testEntitled ? [{id:'entitlement'}] : []; }
    function persona(){ return {signedIn:false}; }
    chapterResolved = ch => ({state:ch.state});
    isReadable = access => access.state==='free' || access.state==='unlocked';
    D.PRIMARY_SLUG='story';
    D.STORIES=[{id:'s1',slug:'story',title:'Real fixture story',author:'Author',genre:'Horror',status:'Ongoing',accent:'#abc',accent2:'#def',tags:[],premise:'A synopsis',chapters:Array.from({length:32},(_,i)=>({id:'ch'+i,n:i+1,title:'Chapter '+(i+1)+': Test',state:i%2?'locked':'free',required_tier_id:i%2?'tier':null,required_tier_name:'Resident Tyrant',wordCount:2200,readTime:10,feed_images:[]}))}];
    D.CHARACTERS=[{id:'c1',story_id:'s1',name:'Character',biography:'Biography',role_title:'Medic'}];
    D.GALLERY_IMAGES=[{id:'safe',story_id:'s1',character_id:'c1',image_url:'https://example.com/safe.jpg',caption:'Safe art',image_tags:['Portrait'],sort_order:1},{id:'mature',story_id:'s1',character_id:'c1',image_url:'https://example.com/mature.jpg',caption:'Mature art',image_tags:['R18'],sort_order:0}];
  `,context);
  return {run:code=>vm.runInContext(code,context), context};
}
test('all loaded classic reader scripts parse',()=>{
  const scripts = [...read('index.html').matchAll(/<script src="(js\/subscription\/[^?]+)\?/g)].map(m=>m[1]);
  assert.ok(scripts.length>=16);
  scripts.forEach(file=>new vm.Script(read(file),{filename:file}));
});
test('split homepage preserves reading/follow/access actions and pagination',()=>{
  const h=harness(); const html=h.run('VIEWS.home()');
  assert.match(html,/rh-hero/); assert.match(html,/data-follow="s1"/);
  assert.match(html,/data-read="ch0"/); assert.match(html,/data-lock="ch31"/);
  assert.match(html,/home-feed-load-more/); assert.match(html,/Open Gallery/);
});
test('all home display modes and mixed feed remain available',()=>{
  const h=harness();
  assert.match(h.run('VIEWS.home()'),/data-home-display="curated"/);
  assert.match(h.run('store.homeDisplay="compact";VIEWS.home()'),/traditional-chapter-row/);
  assert.match(h.run('store.homeDisplay="focus";VIEWS.home()'),/data-home-display="focus"/);
  assert.match(h.run('store.homeLayout="multigrid";VIEWS.home()'),/archive-feed-grid/);
});
test('homepage tier filtering preserves exact required tier IDs',()=>{
  const h=harness(); const html=h.run('store.filters.homeTier="free";VIEWS.home()');
  assert.doesNotMatch(html,/data-lock=/); assert.match(html,/data-read="ch30"/);
});
test('home mature behavior stays entitled-only without gallery opt-in',()=>{
  const h=harness(); assert.equal(h.run('homeGalleryItems(D.STORIES[0]).length'),1);
  assert.equal(h.run('testEntitled=true;homeGalleryItems(D.STORIES[0]).length'),2);
});
test('gallery mature filtering requires entitlement AND opt-in',()=>{
  const h=harness();
  assert.equal(h.run('State.showR18=true;filterGalleryImages(D.GALLERY_IMAGES).length'),1);
  assert.equal(h.run('testEntitled=true;State.showR18=false;filterGalleryImages(D.GALLERY_IMAGES).length'),1);
  assert.equal(h.run('State.showR18=true;filterGalleryImages(D.GALLERY_IMAGES).length'),2);
});
test('chapter reader source and backend contracts remain unchanged by redesign',()=>{
  const css=read('styles/reader-redesign.css');
  assert.match(css,/body:not\(\.in-reader\)/);
  assert.doesNotMatch(css,/^:root\s*\{/m);
  assert.doesNotMatch(read('js/subscription/views/home-library.js'),/picsum\.photos/);
});
test('unified gallery and character deep links render the same browser controls',()=>{
  const h=harness();
  const all=h.run('route.params.slug="story";VIEWS.gallery()');
  assert.match(all,/rg-masthead/); assert.match(all,/Search captions or tags/);
  assert.match(all,/select-gallery-character/); assert.doesNotMatch(all,/View Mature art/);
  assert.match(h.run('route.params.charId="c1";VIEWS.galleryChar()'),/Biography/);
  assert.match(h.run('route.params.charId="missing";VIEWS.galleryChar()'),/Character not found/);
});
test('gallery search includes hydrated character names and tags',()=>{
  const h=harness();
  assert.equal(h.run('State.gallerySearch="character";filterGalleryImages(D.GALLERY_IMAGES).length'),1);
  assert.equal(h.run('State.gallerySearch="portrait";filterGalleryImages(D.GALLERY_IMAGES).length'),1);
  assert.equal(h.run('State.gallerySearch="missing";filterGalleryImages(D.GALLERY_IMAGES).length'),0);
});
test('gallery incremental loading caps DOM while lightbox retains all filtered images',()=>{
  const h=harness();
  h.run(`State.currentGalleryImages=Array.from({length:40},(_,i)=>({...D.GALLERY_IMAGES[0],id:'art'+i}));`);
  assert.equal(h.run('galleryResultMarkup().visible.length'),24);
  assert.equal(h.run('State.galleryLimit=36;galleryResultMarkup().visible.length'),36);
  assert.equal(h.run('galleryLightboxImages().length'),40);
});
test('shuffle order survives rendering without mutating backend data',()=>{
  const h=harness();
  assert.equal(h.run(`State.gallerySort='shuffle';State.galleryShuffleIds=['safe','mature'];sortGalleryImages(D.GALLERY_IMAGES)[0].id`),'safe');
  assert.equal(h.run(`D.GALLERY_IMAGES[0].id`),'safe');
});
test('grid and deck openers use the same image indices as lightbox',()=>{
  const h=harness();
  h.run('State.currentGalleryImages=D.GALLERY_IMAGES;');
  const markup=h.run('galleryResultMarkup().html');
  assert.match(markup,/data-img-id="safe" data-img-index="0"/);
  assert.match(h.run('renderGalleryLightbox(0)'),/safe\.jpg/);
  assert.equal(h.run('renderGalleryLightbox(1)'), '');
  assert.match(h.run('State.galleryViewMode="deck";galleryResultMarkup().html'),/rg-deck-stack/);
});
test('artwork cards use existing votes, not demo counters or discussions',()=>{
  const h=harness(); h.run('State.imageVotes.safe={score:7,userVote:-1}');
  const html=h.run('renderGalleryCard(D.GALLERY_IMAGES[0],0)');
  assert.match(html,/data-val="-1"/); assert.match(html,/Artwork score">7</);
  assert.doesNotMatch(html,/discussion|picsum\.photos/);
});
test('gallery refuses unsafe media URLs and escapes captions',()=>{
  const h=harness();
  assert.equal(h.run('filterGalleryImages([{image_url:"javascript:alert(1)"}]).length'),0);
  assert.match(h.run('renderGalleryCard({...D.GALLERY_IMAGES[0],caption:"<script>"},0)'),/&lt;script&gt;/);
});
