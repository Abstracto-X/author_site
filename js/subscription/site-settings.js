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
      var appearance = { appBackgroundUrl: '', enableAppBackground: true, enableOrnateSystemDialog: false, ornateSystemDialogAfterChapter: 0 };
      if (profile.appearance !== undefined && !object(profile.appearance)) return neutral('invalid_appearance');
      var a = profile.appearance || {};
      for (var flag of ['enableAppBackground', 'enableOrnateSystemDialog']) {
        if (a[flag] !== undefined && typeof a[flag] !== 'boolean') return neutral('invalid_appearance');
        if (a[flag] !== undefined) appearance[flag] = a[flag];
      }
      if (a.appBackgroundUrl !== undefined) {
        var background = link(a.appBackgroundUrl);
        if (background === null) return neutral('invalid_appearance');
        appearance.appBackgroundUrl = background;
      }
      if (a.ornateSystemDialogAfterChapter !== undefined) {
        if (!Number.isInteger(a.ornateSystemDialogAfterChapter) || a.ornateSystemDialogAfterChapter < 0) return neutral('invalid_appearance');
        appearance.ornateSystemDialogAfterChapter = a.ornateSystemDialogAfterChapter;
      }
      var profileFrames = [];
      if (profile.profileFrames !== undefined && !Array.isArray(profile.profileFrames)) return neutral('invalid_profile_frames');
      var frameIds = new Set();
      for (var frame of profile.profileFrames || []) {
        if (!object(frame) || !/^[a-z0-9-]+$/i.test(frame.id || '') || frameIds.has(frame.id) || typeof frame.label !== 'string' || !/^assets\/[a-z0-9_/-]+\.(png|webp|jpg|svg)$/i.test(frame.src || '') || frame.src.includes('..') || (frame.slice !== undefined && ![0,1,2].includes(frame.slice))) return neutral('invalid_profile_frames');
        frameIds.add(frame.id);
        profileFrames.push({ id:frame.id, label:frame.label, src:frame.src, slice:frame.slice });
      }
      var tierPresentation = {};
      if (profile.tierPresentation !== undefined && !object(profile.tierPresentation)) return neutral('invalid_tier_presentation');
      for (var id of Object.keys(profile.tierPresentation || {})) {
        var visual = profile.tierPresentation[id];
        if (!/^[a-z0-9-]+$/i.test(id) || !object(visual) || !/^#[0-9a-f]{6}$/i.test(visual.accent || '')) return neutral('invalid_tier_presentation');
        for (var assetField of ['banner', 'topbarBanner']) {
          if (visual[assetField] !== undefined && (typeof visual[assetField] !== 'string' || !/^assets\/[a-z0-9_/-]+\.(png|webp|jpg|svg)$/i.test(visual[assetField]) || visual[assetField].includes('..'))) return neutral('invalid_tier_presentation');
        }
        var hex = visual.accent.slice(1);
        tierPresentation[id] = { accent: visual.accent, rgb: [0,2,4].map(function (n) { return parseInt(hex.slice(n,n+2),16); }).join(', '), lockClass: ['tier-licker','tier-tyrant','tier-standard'].includes(visual.lockClass) ? visual.lockClass : 'tier-standard' };
      }
      for (var tierId of Object.keys(tierPresentation)) {
        var original = profile.tierPresentation[tierId];
        if (original.frameIds !== undefined) {
          if (!Array.isArray(original.frameIds) || original.frameIds.some(function (id) { return !frameIds.has(id); })) return neutral('invalid_profile_frames');
          tierPresentation[tierId].frameIds = original.frameIds.slice();
          if (original.defaultFrameId !== undefined && !original.frameIds.includes(original.defaultFrameId)) return neutral('invalid_profile_frames');
          tierPresentation[tierId].defaultFrameId = original.defaultFrameId || original.frameIds[0];
        }

        if (original.siteTheme === 'evil') tierPresentation[tierId].siteTheme = 'evil';
        if (original.banner) tierPresentation[tierId].banner = original.banner;
        if (original.topbarBanner) tierPresentation[tierId].topbarBanner = original.topbarBanner;
        if (['licker','tyrant','nemesis','evil'].includes(original.className)) tierPresentation[tierId].className = original.className;
      }
      return { ok: true, siteKey: siteKey, backendUrl: backendUrl, identity: identity, links: links, appearance: appearance, tierPresentation: tierPresentation, profileFrames: profileFrames };
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
