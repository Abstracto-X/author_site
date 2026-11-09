/* Application storage only: never wraps or renames Supabase auth storage. */
(function () {
  'use strict';
  function create(config, storage, legacyKeys, accountId) {
    var memory = new Map();
    var site = config.siteKey;
    var backend = config.supabase && config.supabase.url;
    var valid = typeof site === 'string' && site && typeof backend === 'string' && backend;
    var prefix = valid ? 'author-site:v1:' + encodeURIComponent(site) + ':' + encodeURIComponent(backend) + ':' : '';
    if (accountId) prefix += 'account:' + encodeURIComponent(accountId) + ':';
    function key(name) { return prefix + String(name); }
    function read(name) {
      if (!valid) return memory.has(String(name)) ? memory.get(String(name)) : null;
      try {
        var value = storage.getItem(key(name));
        // Only explicitly named source keys may be copied; originals remain for rollback.
        if (value === null && storage.getItem(key(name) + ':legacy-removed') !== '1' && Array.isArray(legacyKeys) && legacyKeys.includes(String(name))) {
          value = storage.getItem(String(name));
          if (value !== null) storage.setItem(key(name), value);
        }
        return value === null && memory.has(String(name)) ? memory.get(String(name)) : value;
      } catch (_) { return memory.has(String(name)) ? memory.get(String(name)) : null; }
    }
    return {
      getItem: read,
      setItem: function (name, value) {
        memory.set(String(name), String(value));
        if (valid) try { storage.setItem(key(name), String(value)); storage.removeItem(key(name) + ':legacy-removed'); } catch (_) {}
      },
      removeItem: function (name) {
        memory.delete(String(name));
        if (valid) try {
          storage.setItem(key(name) + ':legacy-removed', '1');
          storage.removeItem(key(name));
          // Suppress re-import after an intentional remove, without deleting legacy data.
          if (Array.isArray(legacyKeys)) legacyKeys = legacyKeys.filter(function (k) { return k !== String(name); });
        } catch (_) {}
      }
    };
  }
  var config = window.SUBSCRIPTION_SITE_CONFIG || {};
  var storage;
  try { storage = window.localStorage; } catch (_) {}
  var legacy = config.siteKey === 'evilarchives' && config.supabase && config.supabase.url === 'https://cqgrulawpwkrdvxagzez.supabase.co'
    ? ['aether-pages-prod-bridge-v2-realdb'] : [];
  var authorAccount = null;
  var authorStore = create({}, null, []); // no private persistent reads before verification
  var author = {};
  ['getItem', 'setItem', 'removeItem'].forEach(function (method) {
    author[method] = function () { return authorStore[method].apply(authorStore, arguments); };
  });
  function bindAuthor(accountId) {
    if (typeof accountId !== 'string' || !accountId.trim()) throw new Error('verified_account_required');
    if (authorAccount && authorAccount !== accountId) throw new Error('account_change_requires_reload');
    if (!authorAccount) {
      authorAccount = accountId;
      authorStore = create(config, storage, [], accountId);
    }
  }
  window.SiteStorage = { create: create, local: create(config, storage, legacy), author: author, bindAuthor: bindAuthor };

}());
