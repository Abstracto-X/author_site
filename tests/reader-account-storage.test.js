const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/subscription/state.js'),'utf8');
test('reader account changes restore only their own progress and private local state',()=>{
 const data=new Map();const c={LS:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};vm.createContext(c);vm.runInContext(source.slice(0,source.indexOf('/* ============ global UI state')),c);
 const run=s=>vm.runInContext(s,c);
 run('store.progress.guest=1;store.notes.guest="guest note";saveStore();switchReaderAccount("alice");');
 assert.equal(run('store.progress.guest'),undefined);run('store.progress.chapter=0.75;store.notes.chapter="private";store.grantedKey=true;saveStore();switchReaderAccount("bob")');
 assert.equal(run('store.progress.chapter'),undefined);assert.equal(run('store.notes.chapter'),undefined);assert.equal(run('store.grantedKey'),false);
 run('store.progress.chapter=0.2;switchReaderAccount("alice")');assert.equal(run('store.progress.chapter'),0.75);assert.equal(run('store.notes.chapter'),'private');
 run('switchReaderAccount(null)');assert.equal(run('store.progress.guest'),1);assert.equal(run('store.notes.chapter'),undefined);
 run('switchReaderAccount("bob")');assert.equal(run('store.progress.chapter'),0.2);
});
