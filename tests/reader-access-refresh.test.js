const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const authCode = fs.readFileSync(path.join(__dirname, '../js/subscription/auth.js'), 'utf8');

function harness(invoke = async () => ({ data:{ grants:1 }, error:null })) {
  const listeners = [], intervals = [], timers = [], calls = [];
  const client = { functions:{ invoke:async (name, options) => { calls.push({ name, options }); return invoke(); } } };
  const context = {
    CONFIG:{ supabase:{} }, store:{}, navigator:{ onLine:true },
    console:{ warn(){}, error(){}, dir(){} },
    window:{ setTimeout:fn => { timers.push(fn); }, setInterval:fn => { intervals.push(fn); return intervals.length; }, clearInterval(){} },
    document:{ visibilityState:'visible', addEventListener:(name, fn) => listeners.push({ name, fn }) },
    patreonEnabled:() => true, boostyDiscordEnabled:() => false, saveStore(){},
    client, calls, refreshes:0, renders:0, render(){}, api:null, timers, route:{name:'home'}
  };
  context.window.addEventListener = (name, fn) => listeners.push({ name, fn });
  vm.createContext(context);
  vm.runInContext(authCode + `
    getSupabase = () => client;
    refreshEntitlements = async () => { refreshes++; return authState.entitlements; };
    refreshProviderConnections = async () => authState.providerConnections;
    render = () => { renders++; };
    authState.user = { id:'reader-a' }; authState.ready = true;
    authState.providerConnections = [{ provider:'patreon', status:'active', last_synced_at:'2020-01-01T00:00:00Z' }];
    api = { authState, refreshConnectedProviderAccess, syncProviderEntitlements, providerAccessStatus, startReaderAccessRefresh, refreshReaderAccessInBackground, initAuth };
  `, context);
  return { context, client, calls, listeners, intervals, timers, api:context.api };
}

test('stale Patreon access is verified automatically with a bounded request', async () => {
  const h = harness();
  assert.equal(await h.api.refreshConnectedProviderAccess(), true);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].options.timeout, 10000);
  assert.equal(h.api.providerAccessStatus('patreon').state, 'verified');
  assert.equal(await h.api.refreshConnectedProviderAccess(), false);
  assert.equal(h.calls.length, 1, 'repeat renders must not hammer the provider');
});

test('fresh connections are reused; a newly crossed entitlement expiry triggers verification', async () => {
  const h = harness();
  h.api.authState.providerConnections[0].last_synced_at = new Date(Date.now() - 10000).toISOString();
  assert.equal(await h.api.refreshConnectedProviderAccess(), false);
  h.api.authState.entitlements = [{ provider:'patreon', status:'active', valid_until:new Date(Date.now() - 1000).toISOString() }];
  assert.equal(await h.api.refreshConnectedProviderAccess(), true);
});

test('manual and automatic sync share one in-flight request', async () => {
  let release;
  const h = harness(() => new Promise(resolve => { release = resolve; }));
  const automatic = h.api.refreshConnectedProviderAccess();
  const manual = h.api.syncProviderEntitlements('patreon', { refreshLibrary:false });
  assert.equal(h.calls.length, 1);
  release({ data:{ grants:1 }, error:null });
  await Promise.all([automatic, manual]);
  assert.equal(h.context.refreshes, 1);
});

test('provider outage does not revoke stored access or demand reconnection', async () => {
  const h = harness(async () => ({ error:new Error('network down') }));
  h.api.authState.entitlements = [{ status:'active', valid_until:'2999-01-01T00:00:00Z' }];
  assert.equal(await h.api.refreshConnectedProviderAccess(), false);
  assert.equal(h.api.providerAccessStatus('patreon').state, 'unavailable');
  assert.equal(h.api.authState.entitlements.length, 1);
  await h.api.refreshConnectedProviderAccess();
  assert.equal(h.calls.length, 1);
});

test('missing authorization is distinguished from a transient outage', async () => {
  const h = harness(async () => ({ error:{ context:{ clone:() => ({ json:async () => ({ status:'connect_required' }) }) } } }));
  await h.api.refreshConnectedProviderAccess();
  assert.equal(h.api.providerAccessStatus('patreon').state, 'reconnect');
});

test('late provider response cannot refresh another signed-in account', async () => {
  let release;
  const h = harness(() => new Promise(resolve => { release = resolve; }));
  const pending = h.api.refreshConnectedProviderAccess();
  h.api.authState.user = { id:'reader-b' };
  release({ data:{ grants:1 }, error:null });
  assert.equal(await pending, false);
  assert.equal(h.context.refreshes, 0);
  assert.equal(h.api.providerAccessStatus('patreon'), null);
});

test('offline/disconnected readers make no provider call; lifecycle bindings are single-install', async () => {
  const h = harness();
  h.context.navigator.onLine = false;
  await h.api.refreshConnectedProviderAccess();
  h.api.startReaderAccessRefresh();
  h.api.startReaderAccessRefresh();
  assert.equal(h.calls.length, 0);
  assert.equal(h.listeners.filter(l => l.name === 'visibilitychange').length, 1);
  assert.equal(h.listeners.filter(l => l.name === 'online').length, 1);
});

test('Supabase auth callback is synchronous and defers network work outside its lock', async () => {
  const h = harness();
  let callback;
  h.client.auth = { getSession:async () => ({ data:{ session:null } }), onAuthStateChange:fn => { callback = fn; } };
  vm.runInContext(`
    readPatreonCallbackResult = readBoostyCallbackResult = () => null;
    consumeOAuthCallback = async () => null;
    refreshReaderAccountState = async () => { refreshes++; };
  `, h.context);
  await h.api.initAuth();
  const before = h.context.refreshes;
  const result = callback('SIGNED_IN', { user:{ id:'reader-c' }, access_token:'new' });
  assert.equal(result, undefined);
  assert.equal(h.context.refreshes, before);
  assert.equal(h.timers.length, 1);
  await h.timers[0]();
  assert.equal(h.context.refreshes, before + 1);
});

test('entitlement expiry during an open tab refreshes catalogs even without a successful provider sync', async () => {
  const h = harness();
  let clock = Date.parse('2026-10-14T00:00:00Z');
  h.context.Date = class extends Date { static now(){ return clock; } };
  h.context.patreonEnabled = () => false;
  h.api.authState.entitlements = [{ status:'active', valid_until:'2026-10-14T00:01:00Z' }];
  let catalogCalls = 0;
  h.context.refreshBackendChapterAccess = async () => { catalogCalls++; return true; };
  h.api.startReaderAccessRefresh();
  clock += 120000;
  await h.api.refreshReaderAccessInBackground();
  assert.equal(catalogCalls, 1);
  assert.equal(h.context.renders, 1);
});

test('failed entitlement read retains known state; late read is ignored after account switch', async () => {
  const h = harness();
  const original = authCode.slice(authCode.indexOf('async function refreshEntitlements('), authCode.indexOf('async function refreshProviderConnections('));
  h.context.runBackendRequest = async () => { throw new Error('offline'); };
  vm.runInContext(original + '\napi.refreshEntitlements = refreshEntitlements;', h.context);
  h.api.authState.entitlements = [{ id:'known', status:'active' }];
  await h.api.refreshEntitlements();
  assert.equal(h.api.authState.entitlements[0].id, 'known');
  let release;
  h.context.runBackendRequest = () => new Promise(resolve => { release = resolve; });
  const pending = h.api.refreshEntitlements();
  h.api.authState.user = { id:'reader-b' };
  h.api.authState.entitlements = [];
  release([{ id:'old-account-entitlement' }]);
  await pending;
  assert.equal(h.api.authState.entitlements.length, 0);
});

test('catalog access refresh preserves readable chapter text and clears newly denied text', async () => {
  const backend = fs.readFileSync(path.join(__dirname, '../js/subscription/backend.js'), 'utf8');
  const code = backend.slice(backend.indexOf('async function refreshBackendChapterAccess('), backend.indexOf('async function loadReaderChapterFromBackend('));
  const chapter = { id:'chapter', state:'unlocked', can_read_backend:true, content:['loaded text'] };
  const story = { id:'story', chapters:[chapter] };
  let granted = true;
  const context = { authState:{ user:{id:'reader'} }, backendState:{loading:false}, D:{STORIES:[story]},
    getSupabase:() => ({}), runBackendRequest:async () => [{ id:'chapter', can_read:granted }],
    normalizeBackendChapter:row => ({ state:row.can_read?'unlocked':'locked', can_read_backend:row.can_read }), buildBackendUpdates:() => [] };
  vm.createContext(context);
  vm.runInContext(code, context);
  await context.refreshBackendChapterAccess();
  assert.equal(chapter.content[0], 'loaded text');
  granted = false;
  await context.refreshBackendChapterAccess();
  assert.equal(chapter.content, null);
  assert.equal(chapter.can_read_backend, false);
});

test('locked chapter selection checks membership and opens automatically; dismissal prevents late navigation', async () => {
  const events = fs.readFileSync(path.join(__dirname, '../js/subscription/events.js'), 'utf8');
  const code = events.slice(events.indexOf('let chapterAccessAttempt ='), events.indexOf('async function repairReaderAssets('));
  const chapter = { backend:true, can_read_backend:false };
  let release, navigations = 0;
  const context = { authState:{user:{id:'reader'}}, window:{location:{hash:'#/'}}, I:{x:''}, currentSheet:null,
    byId:() => ({ch:chapter}), providerIsConnected:() => true,
    refreshConnectedProviderAccess:() => new Promise(resolve => { release = resolve; }),
    refreshBackendChapterAccess:async () => { chapter.can_read_backend = true; },
    chapterResolved:ch => ({state:ch.can_read_backend?'unlocked':'locked'}), isReadable:r => r.state === 'unlocked',
    closeSheet:() => {context.currentSheet = null;}, openSheet:builder => {context.currentSheet = {builder};},
    nav:() => {navigations++;}, rememberReturn(){}, sheetLock:() => '', console:{warn(){}} };
  vm.createContext(context);
  vm.runInContext(code, context);
  const pending = context.openChapterAccess('chapter');
  release(true);
  await pending;
  assert.equal(navigations, 1);
  const cancelled = context.openChapterAccess('chapter');
  context.closeSheet();
  release(true);
  await cancelled;
  assert.equal(navigations, 1);
});
