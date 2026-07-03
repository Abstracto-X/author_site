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
const SITE_NAME = CONFIG.siteName || "Member Fiction Reader";
const SITE_TAGLINE = CONFIG.siteTagline || "Premium serial fiction member library";
const MAIN_ARCHIVE_URL = LINKS.mainArchiveUrl || "";
function feature(name, fallback){ return Object.prototype.hasOwnProperty.call(FEATURES, name) ? !!FEATURES[name] : !!fallback; }
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
