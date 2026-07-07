/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ safe storage (sandbox-proof) ============ */
const MemStore = (() => { const m = new Map(); return { getItem:k=>m.has(k)?m[k.slice?k:k]:undefined, setItem:(k,v)=>{m.set(k,v)}, removeItem:k=>m.delete(k) }; })();
function getStore(){ try { if (window.localStorage) return window.localStorage; } catch(e){} return MemStore; }
const LS = getStore();

/* ============ site config / data refs ============ */
const CONFIG = window.SUBSCRIPTION_SITE_CONFIG || {};
const FEATURES = CONFIG.features || {};
const PROVIDERS = CONFIG.providers || {};
const AUTH_CONFIG = CONFIG.auth || {};
const LINKS = CONFIG.links || {};
const READER_BEHAVIOR = {
  enableReaderGuides: Object.prototype.hasOwnProperty.call(FEATURES, "enableReaderGuides") ? !!FEATURES.enableReaderGuides : true,
  globalExternalUrl: "",
  providerNote: "",
  appBackgroundUrl: "",
  enableAppBackground: true
};
const DEFAULT_DATA = {
  STORIES: [],
  UPDATES: [],
  COLLECTIONS: [],
  CALENDAR: [],
  NOTIFICATIONS_SEED: [],
  MILESTONES: [],
  QUOTES_SEED: [],
  KEY_REASONS: {},
  FIG: {},
  PRIMARY_SLUG: "",
  FEATURED_SLUGS: [],
  PERSONAS: [
    { id:"anon", label:"Anonymous visitor" },
    { id:"no-access", label:"Signed in, no access" },
    { id:"patron", label:"Active supporter" },
    { id:"archivist", label:"Archivist supporter" },
    { id:"key-holder", label:"Access-key holder" },
    { id:"lapsed", label:"Expired / lapsed supporter" },
    { id:"pending", label:"Provider sync pending" },
    { id:"no-tier", label:"Provider linked, no qualifying tier" }
  ],
  GLOSSARY_STATES: [
    { k:"free", label:"Free / Public", icon:"open", color:"good", d:"Open to everyone. No account or access needed." },
    { k:"unlocked", label:"Unlocked by your access", icon:"check", color:"gold", d:"Your current membership or key includes this chapter." },
    { k:"preview", label:"Preview available", icon:"eye", color:"info", d:"You can read an opening excerpt. The full chapter is unlocked separately." },
    { k:"early", label:"Early Access", icon:"hourglass", color:"early", d:"Members read now; it becomes public on a set date." },
    { k:"locked", label:"Locked behind a tier", icon:"lock", color:"muted", d:"Requires a higher membership tier to read." },
    { k:"key", label:"Access-key locked", icon:"key", color:"key", d:"Unlocked only with a specific access key." },
    { k:"pending", label:"Provider sync pending", icon:"sync", color:"warn", d:"We are verifying your access with the provider." },
    { k:"expired", label:"Expired / lapsed access", icon:"lock", color:"bad", d:"Your previous access has lapsed. Renew to continue." },
    { k:"unavailable", label:"Unavailable / error", icon:"alert", color:"bad", d:"This chapter is temporarily unavailable. Try again later." }
  ]
};
const D = window.DATA && typeof window.DATA === "object" ? Object.assign(DEFAULT_DATA, window.DATA) : DEFAULT_DATA;
window.DATA = D;
let SITE_NAME = CONFIG.siteName || "EvilArchives";
let SITE_TAGLINE = CONFIG.siteTagline || "Premium serial fiction member library";
let SITE_META_DESCRIPTION = CONFIG.metaDescription || "Premium member fiction reader. Read serial fiction, manage access, and continue across the member library.";
const MAIN_ARCHIVE_URL = LINKS.mainArchiveUrl || "";
function settingText(value, fallback){
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object") {
    const text = value.value || value.text || value.label;
    if (typeof text === "string" && text.trim()) return text.trim();
  }
  return fallback;
}
function applySiteSettings(rows){
  const byKey = {};
  (Array.isArray(rows) ? rows : []).forEach(row => { if (row && row.setting_key) byKey[row.setting_key] = row.setting_value; });
  const identity = byKey.site_identity && typeof byKey.site_identity === "object" ? byKey.site_identity : {};
  const readerBehavior = byKey.reader_behavior && typeof byKey.reader_behavior === "object" ? byKey.reader_behavior : {};
  SITE_NAME = settingText(identity.siteName || identity.site_name || byKey.site_name, SITE_NAME);
  SITE_TAGLINE = settingText(identity.siteTagline || identity.site_tagline || byKey.site_tagline, SITE_TAGLINE);
  SITE_META_DESCRIPTION = settingText(identity.metaDescription || identity.meta_description || byKey.meta_description, SITE_META_DESCRIPTION);
  if (Object.prototype.hasOwnProperty.call(readerBehavior, "enableReaderGuides")) {
    READER_BEHAVIOR.enableReaderGuides = !!readerBehavior.enableReaderGuides;
    FEATURES.enableReaderGuides = READER_BEHAVIOR.enableReaderGuides;
  }
  READER_BEHAVIOR.globalExternalUrl = settingText(readerBehavior.globalExternalUrl || readerBehavior.global_external_url, READER_BEHAVIOR.globalExternalUrl);
  READER_BEHAVIOR.providerNote = settingText(readerBehavior.providerNote || readerBehavior.provider_note, READER_BEHAVIOR.providerNote);
  READER_BEHAVIOR.appBackgroundUrl = settingText(readerBehavior.appBackgroundUrl || readerBehavior.app_background_url, READER_BEHAVIOR.appBackgroundUrl);
  if (Object.prototype.hasOwnProperty.call(readerBehavior, "enableAppBackground")) READER_BEHAVIOR.enableAppBackground = !!readerBehavior.enableAppBackground;
  if (Object.prototype.hasOwnProperty.call(readerBehavior, "enable_app_background")) READER_BEHAVIOR.enableAppBackground = !!readerBehavior.enable_app_background;
  applyAppBackground();
  document.title = settingText(identity.pageTitle || identity.page_title, SITE_NAME);
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", SITE_META_DESCRIPTION);
}
function applyAppBackground(url){
  const desired = settingText(url || READER_BEHAVIOR.appBackgroundUrl, "");
  const localStore = typeof store === "undefined" ? null : store;
  const enabled = READER_BEHAVIOR.enableAppBackground !== false && (!localStore || localStore.settings?.appBackground !== false);
  document.documentElement.style.setProperty("--app-bg-image", enabled && desired ? `url("${desired.replace(/"/g, "%22")}")` : "none");
  document.documentElement.classList.toggle("has-app-bg", !!(enabled && desired));
}
function feature(name, fallback){ return Object.prototype.hasOwnProperty.call(FEATURES, name) ? !!FEATURES[name] : !!fallback; }
function readerBehavior(){ return Object.assign({}, READER_BEHAVIOR); }
function readerExternalUrl(fallback){ return settingText(READER_BEHAVIOR.globalExternalUrl, fallback || ""); }
function providerEnabled(name){ return !!PROVIDERS[name]; }
function googleEnabled(){ return !!AUTH_CONFIG.googleEnabled && feature("enableGoogleOAuth", false); }
function emailPasswordEnabled(){ return AUTH_CONFIG.emailPasswordEnabled !== false; }
function patreonEnabled(){ return providerEnabled("patreon") && feature("enablePatreonConnect", false); }
function accessKeysEnabled(){ return feature("enableAccessKeys", true); }
function mainArchiveEnabled(){ return feature("enableMainArchiveLinks", false) && !!MAIN_ARCHIVE_URL; }
function configuredSupabase(){ const cfg=CONFIG.supabase||{}; const joined=`${cfg.url||""} ${cfg.anonKey||""}`; return !!cfg.url && !!cfg.anonKey && !/YOUR_PROJECT_REF|YOUR_SUPABASE|CHANGE_ME|YOUR_DOMAIN/i.test(joined); }
const byId = (id) => { for (const s of D.STORIES){ const c = s.chapters.find(c=>c.id===id); if (c) return { ch:c, story:s, index:s.chapters.indexOf(c) }; } return null; };
const bySlug = slug => D.STORIES.find(s=>s.slug===slug) || D.STORIES.find(s=>s.id===slug);
const now = () => Date.now();
