/* Runs before any surface creates a backend client. Public configuration only. */
(function () {
  'use strict';
  var source = window.SUBSCRIPTION_SITE_CONFIG || {};
  var result = window.SiteSettings ? window.SiteSettings.resolve({
    siteKey: source.siteKey, backendUrl: source.supabase && source.supabase.url
  }, source.siteProfiles) : { ok: false, error: 'missing_settings_module' };
  var root = '';
  if (result.ok) {
    try { root = window.SiteSettings.publicRoot(source.publicBaseUrl, window.location.href); }
    catch (_) { result = { ok: false, error: 'invalid_public_root' }; }
  }
  window.SITE_CONFIGURATION_STATUS = { ok: result.ok, error: result.error || '' };
  // Explicit allowlist: invalid setup cannot inherit another site's brand or connection.
  window.SUBSCRIPTION_SITE_CONFIG = result.ok ? {
    siteKey: result.siteKey,
    siteName: result.identity.siteName,
    siteTagline: result.identity.siteTagline,
    metaDescription: result.identity.metaDescription,
    publicBaseUrl: root,
    supabase: { url: result.backendUrl, anonKey: source.supabase.anonKey },
    links: result.links,
    appearance: result.appearance,
    auth: Object.assign({}, source.auth),
    providers: Object.assign({}, source.providers),
    features: Object.assign({}, source.features)
  } : {
    siteName: 'Reader', siteTagline: '', metaDescription: '',
    supabase: {}, links: {}, auth: { googleEnabled: false, emailPasswordEnabled: false },
    providers: {}, features: {}
  };
  // Metadata is ready before auth/network; authoring pages retain a neutral surface suffix.
  if (typeof document !== 'undefined') {
    var name = window.SUBSCRIPTION_SITE_CONFIG.siteName;
    var page = new URL(window.location.href).pathname.split('/').pop();
    document.title = name + (page === 'admin.html' ? ' Admin' : page === 'writer.html' ? ' | Writer Studio' : '');
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', window.SUBSCRIPTION_SITE_CONFIG.metaDescription || '');
  }
  if (!result.ok && window.console) console.error('Site setup required: ' + result.error);
}());
