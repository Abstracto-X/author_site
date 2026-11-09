const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/subscription/backend.js'),'utf8');
for(const name of ['loadNotificationPreferences','saveNotificationPreferences','loadReaderNotifications'])for(const nextId of ['bob','alice'])test(`${name} ignores late response after account/store transition to ${nextId}`,async()=>{
 let release;const promise=new Promise(r=>release=r);const chain=new Proxy({},{get(_,key){return key==='then'?promise.then.bind(promise):()=>chain;}});
 const fresh=()=>({settings:{},notificationPrefs:null,notifs:[],dismissedNotifs:[]});let saves=0;
 const c={store:fresh(),authState:{user:{id:'alice'}},getSupabase:()=>({from:()=>chain}),saveStore:()=>saves++,console,normalizeNotification:x=>x,maybeShowBrowserNotifications(){throw Error('stale browser notification');}};vm.createContext(c);
 const start=source.indexOf('async function '+name+'(');const tail=source.slice(start+1);const match=/\n(?:async )?function |\nlet readerNotificationPollTimer/.exec(tail);vm.runInContext(source.slice(start,start+1+match.index),c);
 const pending=vm.runInContext(`${name}({browser_enabled:true,email_enabled:true})`,c);c.authState.user={id:nextId};c.store=fresh();release({data:name==='loadReaderNotifications'?[{id:'old'}]:{browser_enabled:true},error:null});await pending;
 assert.equal(c.store.notificationPrefs,null);assert.deepEqual(c.store.notifs,[]);assert.equal(saves,0);
});
