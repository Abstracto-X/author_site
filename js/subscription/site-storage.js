/* Application storage only: never wraps or renames Supabase auth storage. */
(function () {
  'use strict';
  function create(config, storage, legacyKeys) {
    var memory = new Map();
    var site = config.siteKey;
    var backend = config.supabase && config.supabase.url;
    var valid = typeof site === 'string' && site && typeof backend === 'string' && backend;
    var prefix = valid ? 'author-site:v1:' + encodeURIComponent(site) + ':' + encodeURIComponent(backend) + ':' : '';
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
  window.SiteStorage = { create: create, local: create(config, storage, legacy) };
}());
