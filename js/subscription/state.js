/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ persona / access model ============ */
const PERSONA_ACCESS = {
  anon:       { level:0, signedIn:false },
  "no-access":{ level:0, signedIn:true },
  patron:     { level:1, signedIn:true, provider:"Patreon", tier:"Member access", since:"2025-03-12" },
  archivist:  { level:2, signedIn:true, provider:"Patreon", tier:"Archivist Tier", since:"2024-11-02" },
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
  homeLayout: "multigrid",
  theme: "dark"
});
let store;
function loadStore(){
  const defaults = defaultStore();
  try {
    const raw = LS.getItem("aether-pages-prod-bridge-v2-realdb");
    store = raw ? Object.assign(defaults, JSON.parse(raw)) : defaults;
  } catch(e){ store = defaults; }
  store.settings = Object.assign(defaultStore().settings, store.settings || {});
  // Site chrome and the chapter canvas intentionally have independent color modes.
  // Migrate legacy unified/preset values without changing the storage key.
  const legacyReaderTheme = store.settings.readerTheme || store.theme;
  store.theme = store.theme === "light" ? "light" : "dark";
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
function saveStore(){ try { LS.setItem("aether-pages-prod-bridge-v2-realdb", JSON.stringify(store)); } catch(e){} }
loadStore();

/* ============ global UI state ============ */
const State = window.State || {
  gallerySearch: "",
  gallerySort: "curated",
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
