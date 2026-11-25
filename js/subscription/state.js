/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ persona / access model ============ */
const PERSONA_ACCESS = {
  anon:       { level:0, signedIn:false },
  "no-access":{ level:0, signedIn:true },
  patron:     { level:1, signedIn:true, provider:"Patreon", tier:"Member access" },
  archivist:  { level:2, signedIn:true, provider:"Patreon", tier:"Higher membership tier" },
  "key-holder":{ level:0, signedIn:true, hasKey:true },
  lapsed:     { level:0, signedIn:true, provider:"Patreon", tier:"Member access", expired:true, prevLevel:1 },
  pending:    { level:0, signedIn:true, provider:"Patreon", pending:true, pendingLevel:1 },
  "no-tier":  { level:0, signedIn:true, provider:"Patreon", noTier:true }
};

/* ============ store ============ */
const defaultStore = () => ({
  personaId: "anon",
  email: "",
  progress: {},
  history: [],
  bookmarks: [],
  quotes: [],
  notes: {},
  followed: [],
  readMarked: {},
  comments: {},
  notifs: [],
  reactions: {},
  grantedKey: false,
  redeemedKeys: [],
  settings: {
    readerTheme:"dark", readerCustomBg:"#1c2330", readerBrightness:100,
    dyslexiaMode:false, readerFont:"serif", fontScale:1, lineHeight:1.78, margin:1,
    preset:"none", showImages:true, showParaComments:true, showProgress:true,
    showReactions:true, spoilerSafe:false, focusMode:false,
    browserNotifications:false, emailNotifications:true, chapterNotifications:true,
    appBackground:true,
    bgMode:"story", bgBlur:true, bgImageUrl:"default", readerWidth:46, readerBg:false
  },
  notificationPrefs: null,
  dismissedNotifs: [],
  filters: { q:"", chips:[] },
  homeLayout: "traditional",
  readerNavCollapsed: false,
  theme: "dark"
});
let store;
let readerStoreAccount = null;
function readerStoreKey(){
  return readerStoreAccount ? 'reader-account:' + encodeURIComponent(readerStoreAccount) + ':state-v1' : 'aether-pages-prod-bridge-v2-realdb';
}
function switchReaderAccount(userId){
  const next = typeof userId === 'string' && userId ? userId : null;
  if (next === readerStoreAccount) return;
  // Carry only a recent guest-requested provider continuation, never private guest data.
  const action = !readerStoreAccount && next && ['connect-patreon','connect-boosty-discord'].includes(store.pendingAuthAction)
    && Date.now() - Number(store.pendingAuthActionAt || 0) >= 0 && Date.now() - Number(store.pendingAuthActionAt || 0) < 600000
    ? store.pendingAuthAction : '';
  if (!readerStoreAccount) { store.pendingAuthAction = ''; store.pendingAuthActionAt = 0; }
  saveStore();
  const visualKeys = ['readerTheme','readerCustomBg','readerBrightness','dyslexiaMode','fontScale','lineHeight','margin','appBackground','readerWidth'];
  const sourceIdentity = typeof CONFIG !== 'undefined' && CONFIG.siteKey === 'evilarchives' && CONFIG.supabase?.url === 'https://cqgrulawpwkrdvxagzez.supabase.co';
  const guestAppearance = sourceIdentity && !readerStoreAccount && next ? Object.fromEntries(visualKeys.map(key => [key, store.settings[key]])) : null;
  readerStoreAccount = next;
  if (typeof D !== "undefined") D.MEDIA_POSTS = [];
  if (typeof window !== "undefined" && typeof window.resetMediaStreamData === "function") window.resetMediaStreamData(true);
  const hasAccountRecord = !!LS.getItem(readerStoreKey());
  loadStore();
  if (guestAppearance && !hasAccountRecord) {
    Object.assign(store.settings, guestAppearance);
    saveStore();
  }
  if (action) { store.pendingAuthAction = action; store.pendingAuthActionAt = Date.now(); saveStore(); }
  if (typeof State !== 'undefined') State.imageVotes = {};
  if (typeof communityState !== 'undefined') {
    communityState.commentsLoaded = {};
    communityState.reactionsLoaded = {};
  }
}
function loadStore(){
  const defaults = defaultStore();
  try {
    const raw = LS.getItem(readerStoreKey());
    store = raw ? Object.assign(defaults, JSON.parse(raw)) : defaults;
  } catch(e){ store = defaults; }
  store.settings = Object.assign(defaultStore().settings, store.settings || {});
  // Site chrome and the chapter canvas intentionally have independent color modes.
  // Migrate legacy unified/preset values without changing the storage key.
  const legacyReaderTheme = store.settings.readerTheme || store.theme;
  store.theme = ["light","evil"].includes(store.theme) ? store.theme : "dark";
  store.settings.readerTheme = ["dark","light","parchment","custom"].includes(legacyReaderTheme)
    ? legacyReaderTheme
    : legacyReaderTheme === "sepia" ? "parchment" : "dark";
  store.settings.dyslexiaMode = !!(store.settings.dyslexiaMode || store.settings.preset === "dyslexia" || store.settings.readerFont === "sans");
  store.settings.readerCustomBg = /^#[0-9a-f]{6}$/i.test(store.settings.readerCustomBg || "") ? store.settings.readerCustomBg : "#1c2330";
  store.settings.readerBrightness = Math.min(125, Math.max(50, Number(store.settings.readerBrightness) || 100));
  store.settings.readerFont = "serif";
  store.settings.preset = "none";
  // Removed visibility/focus controls must not leave content hidden after migration.
  store.settings.showImages = true;
  store.settings.showParaComments = true;
  store.settings.showProgress = true;
  store.settings.showReactions = true;
  store.settings.focusMode = false;
  store.settings.spoilerSafe = false;
  store.settings.readerBg = false;
  if (!Array.isArray(store.dismissedNotifs)) store.dismissedNotifs = [];
}
function saveStore(){ try { LS.setItem(readerStoreKey(), JSON.stringify(store)); } catch(e){} }
loadStore();

/* ============ global UI state ============ */
const State = window.State || {
  gallerySearch: "",
  gallerySort: "shuffle",
  galleryViewMode: "grid",
  filterTag: "All",
  showR18: false,
  currentStory: null,
  currentChars: [],
  currentGalleryImages: [],
  latestGalleryImages: [],
  imageVotes: {},
  lightboxIndex: -1,
  homeGalleryLimit: 18
};
window.State = State;
