const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const window={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/author-session.js'),'utf8'),{window,AbortController,Set});
test('account invalidation aborts in-flight requests, rejects late results and blocks new sends',async()=>{
 let release,signal,calls=0;const api=window.AuthorSession.create((url,options)=>{calls++;signal=options.signal;return new Promise(r=>release=r);});api.bind('alice');
 const pending=api.fetch('/rest/v1/stories');api.invalidate();assert.equal(signal.aborted,true);release({ok:true});await assert.rejects(pending,{code:'author_session_changed'});await assert.rejects(api.fetch('/rest/v1/chapters',{method:'POST'}));assert.equal(calls,1);assert.throws(()=>api.bind('bob'));
});
test('already submitted write is reported uncertain after account transition, never definite failure',async()=>{
 let release;const api=window.AuthorSession.create(()=>new Promise(r=>release=r));api.bind('alice');const pending=api.fetch('/rest/v1/chapters',{method:'PATCH'});api.invalidate();release({ok:true});await assert.rejects(pending,{code:'writer_save_uncertain'});
});
test('caller abort remains linked without changing account or rewriting ordinary errors',async()=>{
 const controller=new AbortController();const api=window.AuthorSession.create((url,init)=>new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('caller cancelled')))));const pending=api.fetch('/rest/v1/chapters',{signal:controller.signal});controller.abort();await assert.rejects(pending,/caller cancelled/);api.bind('alice');api.bind('alice');
});
