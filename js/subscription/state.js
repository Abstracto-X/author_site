/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ persona / access model ============ */
const PERSONA_ACCESS = {
  anon:       { level:0, signedIn:false },
  "no-access":{ level:0, signedIn:true },
  patron:     { level:1, signedIn:true, provider:"Patreon", tier:"Aether Member", since:"2025-03-12" },
  archivist:  { level:2, signedIn:true, provider:"Patreon", tier:"Archivist Tier", since:"2024-11-02" },
  "key-holder":{ level:0, signedIn:true, hasKey:true },
  lapsed:     { level:0, signedIn:true, provider:"Patreon", tier:"Aether Member", expired:true, prevLevel:1 },
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
    readerTheme:"aether", fontScale:1, lineHeight:1.78, margin:1,
    preset:"none", showImages:true, showParaComments:true, showProgress:true,
    showReactions:true, spoilerSafe:false
  },
  filters: { q:"", chips:[] },
  theme: "aether"
});
let store;
function loadStore(){ try { const raw = LS.getItem("aether-pages-prod-bridge-v2-realdb"); store = raw ? Object.assign(defaultStore(), JSON.parse(raw)) : defaultStore(); } catch(e){ store = defaultStore(); } if(!store.settings) store.settings = defaultStore().settings; }
function saveStore(){ try { LS.setItem("aether-pages-prod-bridge-v2-realdb", JSON.stringify(store)); } catch(e){} }
loadStore();
