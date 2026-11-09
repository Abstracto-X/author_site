const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function sourceBetween(file, start, end) {
  const source = read(file);
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `source boundaries found in ${file}`);
  return source.slice(from, to);
}

function callback(siteName) {
  const calls = [];
  const context = vm.createContext({ SITE_NAME: siteName, toast: (...args) => calls.push(args) });
  vm.runInContext(sourceBetween('js/subscription/auth.js', 'function showBoostyCallbackResult(result){', '\nfunction '), context);
  vm.runInContext('showBoostyCallbackResult({status:"not_in_server"})', context);
  return calls[0];
}

function boostySheet(siteName) {
  const context = vm.createContext({ SITE_NAME: siteName, I: { x: '', vault: '', external: '', msg: '', user: '', key: '' }, authState: { user: null }, BOOSTY_URL: '', esc });
  vm.runInContext(sourceBetween('js/subscription/sheets.js', 'function sheetConnectBoosty(){', '\nfunction sheetContext(){'), context);
  return vm.runInContext('sheetConnectBoosty()', context);
}

function wrongAccount(siteName) {
  const helpers = ['patreonEnabled','boostyDiscordEnabled'].reduce((o, key) => (o[key] = () => true, o), {});
  const context = vm.createContext({ SITE_NAME: siteName, VIEWS: {}, I: { chevL:'', user:'', vault:'', msg:'', key:'', mail:'', chevR:'' }, esc,
    readerPageHeading: () => '', patreonEnabled: helpers.patreonEnabled, boostyDiscordEnabled: helpers.boostyDiscordEnabled });
  vm.runInContext(sourceBetween('js/subscription/views/help-support.js', 'VIEWS.wrongAccount = function(){', '\nVIEWS.contact'), context);
  return vm.runInContext('VIEWS.wrongAccount()', context);
}

test('support copy uses the runtime site name, escaping HTML and preserving the plain callback', () => {
  const hostile = '<img src=x onerror=alert(1)>';
  const message = callback(hostile);
  assert.match(message[1], /<img src=x onerror=alert\(1\)>/);
  assert.doesNotMatch(message[1], /&lt;img/);
  assert.match(boostySheet(hostile), /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(wrongAccount(hostile), /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(boostySheet(hostile), /&amp;lt;/);
  assert.doesNotMatch(wrongAccount(hostile), /&amp;lt;/);
  assert.match(callback('Reader House')[1], /Discord server for Reader House/);
  assert.match(boostySheet('Reader House'), /Reader House verifies/);
  assert.match(wrongAccount('Reader House'), /both Boosty and Reader House,/);
});

test('missing or blank site names use neutral wording without a hardcoded brand', () => {
  for (const name of [undefined, '', '   ']) {
    assert.match(callback(name)[1], /Join the Discord server for this site/);
    assert.match(boostySheet(name), /this site verifies/);
    assert.match(wrongAccount(name), /both Boosty and this site,/);
  }
  assert.doesNotMatch([callback('Reader House')[1], boostySheet('Reader House'), wrongAccount('Reader House')].join(' '), /EvilArchives/);
});
