(function () {
  'use strict';

  var identityFields = ['siteName', 'siteTagline', 'metaDescription'];
  var linkFields = ['mainArchiveUrl', 'patreonUrl', 'supportUrl', 'discordUrl', 'boostyUrl'];

  function neutral(error) {
    return { ok: false, error: error, identity: { siteName: 'Reader', siteTagline: '', metaDescription: '' },
      links: { mainArchiveUrl: '', patreonUrl: '', supportUrl: '', discordUrl: '', boostyUrl: '' } };
  }
  function object(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  function projectUrl(value) {
    if (typeof value !== 'string') return '';
    var input = value.trim();
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(input)) return '';
    try { return new URL(input).origin; } catch (_) { return ''; }
  }
  function link(value) {
    if (typeof value !== 'string') return null;
    var input = value.trim();
    if (!input) return '';
    try {
      var url = new URL(input);
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
      return url.href;
    } catch (_) { return null; }
  }
  function resolve(deployment, profiles) {
    try {
      if (!object(deployment) || !object(profiles)) return neutral('invalid_root');
      if (typeof deployment.siteKey !== 'string' || !deployment.siteKey.trim()) return neutral('invalid_site_key');
      var siteKey = deployment.siteKey.trim();
      if (!Object.prototype.hasOwnProperty.call(profiles, siteKey)) return neutral('unknown_site');
      var profile = profiles[siteKey];
      if (!object(profile)) return neutral('invalid_profile');
      var backendUrl = projectUrl(deployment.backendUrl);
      var expectedUrl = projectUrl(profile.backendUrl);
      if (!backendUrl || !expectedUrl) return neutral('invalid_backend_url');
      if (backendUrl !== expectedUrl) return neutral('backend_mismatch');
      if (profile.identity !== undefined && !object(profile.identity)) return neutral('invalid_identity');
      if (profile.links !== undefined && !object(profile.links)) return neutral('invalid_links');
      var identity = {}, links = {}, sourceIdentity = profile.identity || {}, sourceLinks = profile.links || {};
      for (var i = 0; i < identityFields.length; i++) {
        var field = identityFields[i], value = sourceIdentity[field];
        if (value !== undefined && typeof value !== 'string') return neutral('invalid_identity');
        identity[field] = value === undefined ? '' : value.trim();
      }
      if (!identity.siteName) identity.siteName = 'Reader';
      for (var j = 0; j < linkFields.length; j++) {
        var key = linkFields[j], raw = sourceLinks[key];
        var normalized = raw === undefined ? '' : link(raw);
        if (normalized === null) return neutral('invalid_links');
        links[key] = normalized;
      }
      return { ok: true, siteKey: siteKey, backendUrl: backendUrl, identity: identity, links: links };
    } catch (_) {
      return neutral('invalid_input');
    }
  }
  // Resolve a deployment directory, not a route or an untrusted redirect.
  function publicRoot(base, pageUrl) {
    if (typeof base !== 'string' || !base.trim()) throw new Error('missing_public_root');
    var page = new URL(pageUrl);
    var root = new URL(base.trim(), page);
    if (!/^https?:$/.test(root.protocol) || root.username || root.password || root.search || root.hash) {
      throw new Error('invalid_public_root');
    }
    if (root.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(root.hostname)) {
      throw new Error('insecure_public_root');
    }
    if (!root.pathname.endsWith('/')) root.pathname += '/';
    return root.href;
  }
  function readerUrl(base, pageUrl, chapterId) {
    var url = new URL('index.html', publicRoot(base, pageUrl));
    if (chapterId !== undefined && chapterId !== null) {
      if (typeof chapterId !== 'string' || !chapterId.trim()) throw new Error('invalid_chapter_id');
      url.hash = '/read/' + encodeURIComponent(chapterId.trim());
    }
    return url.href;
  }
  window.SiteSettings = { resolve: resolve, publicRoot: publicRoot, readerUrl: readerUrl };
}());
