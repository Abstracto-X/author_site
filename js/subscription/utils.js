/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ site themes ============ */
const THEMES = [
  { id:"aether", name:"Aether", dot:"linear-gradient(135deg,#1a1d28,#d4b06a)" },
  { id:"ember", name:"Ember", dot:"linear-gradient(135deg,#241711,#e08a4a)" },
  { id:"frost", name:"Frost", dot:"linear-gradient(135deg,#14212b,#6fb6c9)" },
  { id:"midnight", name:"Midnight Ink", dot:"linear-gradient(135deg,#161324,#9a7ed1)" },
  { id:"sage", name:"Sage", dot:"linear-gradient(135deg,#161e14,#8fb98a)" },
  { id:"parchment", name:"Parchment", dot:"linear-gradient(135deg,#efe8d8,#9a6b3f)" }
];
function applyTheme(){ document.documentElement.setAttribute("data-theme", store.theme || "aether"); }
function setTheme(id){ store.theme = id; saveStore(); applyTheme(); }
applyTheme();

/* ============ access-state resolver ============ */
function chapterResolved(ch) {
  const P = persona();
  if (ch.state === "free") return { state:"free", isEarly:false };
  if (ch.state === "unavailable") return { state:"unavailable" };
  if (P.admin) return { state:"unlocked", isEarly: ch.state==="early", admin:true };
  if (ch.state === "key") return { state: (P.hasKey || store.grantedKey) ? "unlocked" : "key", isEarly:false };
  const isArch = ch.tier === "Archivist Tier";
  const need = isArch ? 2 : 1;
  // active access covers it
  if (P.level >= need) return { state:"unlocked", isEarly: ch.state==="early" };
  // sync pending (will unlock member-tier content)
  if (P.pending) {
    if (need <= (P.pendingLevel||0)) return { state:"pending" };
    return { state: gateDisplay(ch) };
  }
  // expired (previously held this access)
  if (P.expired) {
    if (need <= (P.prevLevel||0)) return { state:"expired", isEarly: ch.state==="early" };
    return { state: gateDisplay(ch) };
  }
  // Patreon linked but no qualifying tier
  if (P.noTier) return { state: gateDisplay(ch), noTier: ch.state!=="preview" };
  // anonymous / signed-in-no-access / key-holder without this tier
  return { state: gateDisplay(ch), isEarly: ch.state==="early" };
}
// maps an intrinsic chapter gate to what a reader WITHOUT access should see
function gateDisplay(ch){
  if (ch.state === "preview") return "preview";
  if (ch.state === "early") return "early";
  if (ch.state === "locked") return "locked";
  // base "unlocked" means member-tier gated — never expose as readable without access
  return "locked";
}
function reasonFor(ch, r) {
  if (ch.is_nsfw) return "External-only chapter; opens on the author-provided site.";
  if (r.admin) return "Unlocked by your admin reader override.";
  if (r.state === "pending") return "Verifying your access with Patreon — usually a moment.";
  if (r.state === "expired") return "Your member access has expired. Renew to continue.";
  if (r.noTier) return "Your provider tier does not include this library.";
  if (r.state === "key") return "Redeem an access key to read this chapter.";
  return D.KEY_REASONS[ch.id] || "";
}
function isReadable(r){ return r.state==="free" || r.state==="unlocked"; }
function hasImages(ch){ const c = ch.content||ch.preview||[]; return c.some(b=>b.t==="img"); }

/* ============ icons ============ */
const I = {
  home:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9.5 20v-5h5v5"/></svg>`,
  library:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="4" height="16" rx="1"/><rect x="9" y="4" width="4" height="16" rx="1"/><path d="m16 5 4 1-3 14-4-1z"/></svg>`,
  bell:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>`,
  feed:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>`,
  shelf:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v16M4 4h5a2 2 0 0 1 2 2v14M20 4v16M20 4h-5a2 2 0 0 0-2 2"/></svg>`,
  vault:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 8v1.5M12 14.5V16M8 12h1.5M14.5 12H16"/></svg>`,
  search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`,
  star:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.9 6.3 6.8.7-5 4.7 1.4 6.7L12 17.8 5.9 20.4l1.4-6.7-5-4.7 6.8-.7z"/></svg>`,
  clock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  lock:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  lockOpen:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-1.5"/></svg>`,
  eye:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  hourglass:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 21h12M7 3c0 4 5 5 5 9s-5 5-5 9M17 3c0 4-5 5-5 9s5 5 5 9"/></svg>`,
  key:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="4"/><path d="m11 11 9 9M17 17l2-2M14 14l2-2"/></svg>`,
  sync:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>`,
  alert:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 9v5M12 17.5v.5"/></svg>`,
  check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 6"/></svg>`,
  checkCirc:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5L16 9"/></svg>`,
  open:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h7M4 6v12M4 18h7M14 4l6 8-6 8"/></svg>`,
  chevR:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>`,
  chevL:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>`,
  aa:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18 8 6l4 12M5.5 14h5M14 18l3-9 3 9M15 15h4"/></svg>`,
  play:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>`,
  plus:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  x:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
  info:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg>`,
  heart:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21Z"/></svg>`,
  msg:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H8l-4 4z"/></svg>`,
  quote:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 6c-3 1-5 4-5 8v4h6v-6H6c0-2 1-4 3-5zm10 0c-3 1-5 4-5 8v4h6v-6h-4c0-2 1-4 3-5z"/></svg>`,
  bookmark:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg>`,
  bookmarkFill:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h12v18l-6-4-6 4z"/></svg>`,
  moon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10Z"/></svg>`,
  sun:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/></svg>`,
  door:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4a1 1 0 0 1 1-1h9l4 3v15"/><path d="M5 21h14M9 11h2"/></svg>`,
  book:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/></svg>`,
  layers:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>`,
  orbit:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)"/></svg>`,
  fire:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-1 4-1 6 0 1 1 2 2 2 0-2 1-2 1-2 2 2 3 4 3 6a5 5 0 0 1-10 0c0-3 2-4 2-6 0-1 1-4 3-6Z"/></svg>`,
  calendar:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>`,
  mail:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
  gift:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12M12 9S9 3 6.5 5 9 9 12 9Zm0 0s3-6 5.5-4S15 9 12 9Z"/></svg>`,
  spark:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.5 4 2 5.5 6 6-4 .5-5.5 2-6 6-.5-4-2-5.5-6-6 4-.5 5.5-2 6-6Z"/></svg>`,
  external:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>`,
  download:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>`,
  copy:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`,
  user:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
  list:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`,
  map:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 7 6-2 6 2 6-2v12l-6 2-6-2-6 2z"/><path d="M9 5v14M15 7v14"/></svg>`,
  help:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.2 9.5a3 3 0 0 1 5.2 1.5c.3 2-2.4 2.3-2.4 4"/><path d="M12 17.5v.5"/></svg>`,
  grid:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>`,
  shield:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"/></svg>`,
  cog:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>`,
  flame:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4c1 2 0 3 0 4s1 2 2 2 1-3 1-3c2 2 4 4 4 7a5 5 0 0 1-10 0c0-3 2-5 3-10Z"/></svg>`,
  tear:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z"/></svg>`,
  overview:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="11" rx="1.5"/><rect x="3" y="17" width="8" height="4" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/></svg>`,
  palette:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1 .9-1.5 2-1.5h2c2.2 0 4-1.8 4-4 0-4.4-4-8-9-8Z"/><circle cx="7.5" cy="11" r="1.1" fill="currentColor"/><circle cx="12" cy="7.5" r="1.1" fill="currentColor"/><circle cx="16.5" cy="11" r="1.1" fill="currentColor"/></svg>`,
  trending:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16l5-5 4 3 7-8"/><path d="M16 6h4v4"/></svg>`
};
function icon(n, cls){ return `<span class="${cls||''}">${I[n]||""}</span>`; }

/* ============ cover art generator ============ */
function coverArt(s){
  const imageUrl = s.cover_image_url || s.cover_url || s.cover || "";
  const a=s.accent, a2=s.accent2, dark="#0b0a10";
  const motifs = {
    shards:`<g opacity=".9">${poly(400,200,120,6,a2,.5)}${poly(300,260,80,5,a,.45)}${poly(500,160,90,6,a,.4)}${poly(360,330,70,5,a2,.35)}<g stroke="${a2}" stroke-opacity=".25" fill="none" stroke-width="1">${[...Array(7)].map((_,i)=>`<path d="M${120+i*70} 460 L${200+i*40} 0"/>`).join("")}</g></g>`,
    arcs:`<g fill="none" stroke="${a2}" stroke-opacity=".5" stroke-width="2"><circle cx="400" cy="460" r="140"/><circle cx="400" cy="460" r="200" stroke-opacity=".3"/><circle cx="400" cy="460" r="270" stroke-opacity=".18"/></g><circle cx="400" cy="120" r="60" fill="${a}" opacity=".6"/><g stroke="${a2}" stroke-width="2" stroke-opacity=".6"><path d="M400 320 V460"/></g>`,
    orbit:`<g fill="none" stroke="${a2}" stroke-opacity=".4" stroke-width="2"><ellipse cx="400" cy="240" rx="260" ry="90" transform="rotate(-18 400 240)"/></g><circle cx="400" cy="240" r="86" fill="${a}" opacity=".75"/><circle cx="610" cy="180" r="14" fill="${a2}"/><circle cx="180" cy="300" r="8" fill="${a2}" opacity=".7"/><g fill="${a2}" opacity=".8">${[...Array(40)].map(()=>{const x=Math.random()*800,y=Math.random()*480,r=Math.random()*1.4;return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}"/>`;}).join("")}</g>`,
    map:`<g stroke="${a2}" stroke-opacity=".5" fill="none" stroke-width="1.6">${[...Array(6)].map((_,i)=>`<path d="M${60+i*10} ${120+i*40} C ${260} ${90+i*30}, ${420} ${200+i*20}, ${620+i*10} ${140+i*40}"/>`).join("")}<path d="M120 380 C 300 320, 460 400, 700 340" stroke-opacity=".4"/></g><g fill="${a2}"><circle cx="280" cy="180" r="4"/><circle cx="520" cy="300" r="4"/><circle cx="640" cy="160" r="4"/></g>`,
    key:`<g stroke="${a2}" stroke-width="3" fill="none" stroke-opacity=".55"><circle cx="400" cy="180" r="70"/><circle cx="400" cy="180" r="30" fill="${a}" fill-opacity=".5" stroke="none"/><path d="M400 250 V400 M400 340h40 M400 370h30"/></g><g stroke="${a2}" stroke-opacity=".2" stroke-width="1">${[...Array(8)].map((_,i)=>`<path d="M${400} ${180} L${400+Math.cos(i)*120|0} ${180+Math.sin(i)*120|0}"/>`).join("")}</g>`
  };
  function poly(cx,cy,r,n,fill,op){ const pts=[...Array(n)].map((_,i)=>{const ang=(i/n)*Math.PI*2 - Math.PI/2; return `${cx+Math.cos(ang)*r},${cy+Math.sin(ang)*r}`;}).join(" "); return `<polygon points="${pts}" fill="${fill}" opacity="${op||.4}"/>`; }
  const generated = `<svg class="cover-art" viewBox="0 0 800 480" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><linearGradient id="cg-${s.id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${a}" stop-opacity=".25"/></linearGradient>
    <radialGradient id="cgR-${s.id}" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="${a}" stop-opacity=".3"/><stop offset="1" stop-color="${dark}" stop-opacity="0"/></radialGradient></defs>
    <rect width="800" height="480" fill="${dark}"/><rect width="800" height="480" fill="url(#cg-${s.id})"/><rect width="800" height="480" fill="url(#cgR-${s.id})"/>
    ${motifs[s.motif]||motifs.arcs}
    <rect width="800" height="480" fill="url(#vg-${s.id})"/>
    <defs><linearGradient id="vg-${s.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark}" stop-opacity="0"/><stop offset=".7" stop-color="${dark}" stop-opacity=".2"/><stop offset="1" stop-color="${dark}" stop-opacity=".6"/></linearGradient></defs>
  </svg>`;
  if (!imageUrl) return generated;
  return `<img class="cover-art cover-img" src="${esc(imageUrl)}" alt="${esc(s.title || "Story cover")}" loading="lazy" onerror="this.nextElementSibling.style.display='block';this.remove();">${generated.replace('class="cover-art"', 'class="cover-art" style="display:none"')}`;
}

/* ============ UI primitives ============ */
const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function badge(kind, text){ return `<span class="badge ${kind||""}">${text}</span>`; }
function chip(label, act, active, svg){ return `<button class="chip ${active?"active":""}" ${act?`data-${act}`:""}>${svg?`<span class="ic">${I[svg]||""}</span>`:""}<span>${label}</span></button>`; }
function storyAccentVars(s){ return `--s:${s.accent};--s2:${s.accent2};--s-soft:${hexA(s.accent,0.14)};`; }
function hexA(hex,a){ const h=hex.replace("#","");const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return `rgba(${r},${g},${b},${a})`; }

function accessTag(r){
  if (r.admin) return ["unlocked","Admin Access",I.shield || I.checkCirc,"Read now"];
  const map = {
    free:["free","Free",I.open,"Read now"],
    unlocked:["unlocked","Unlocked",I.checkCirc,"Read now"],
    preview:["preview","Preview",I.eye,"Preview"],
    early:["early","Early Access",I.hourglass,"Early access"],
    locked:["locked","Locked",I.lock,"Unlock"],
    key:["key","Key",I.key,"Redeem key"],
    pending:["pending","Syncing",I.sync,"Verifying"],
    expired:["expired","Expired",I.lock,"Renew"],
    unavailable:["error","Unavailable",I.alert,"Unavailable"]
  };
  const m = map[r.state] || map.locked;
  return m;
}
function axInline(r){ const m=accessTag(r); return `<span class="ax ${m[0]}"><span class="ic">${m[2]}</span>${m[1]}</span>`; }

function progressBar(pct){ return `<div class="bar"><i style="width:${Math.min(100,Math.max(0,pct))}%"></i></div>`; }
function ring(pct){ return `<div class="ring" style="--p:${pct}"><span>${pct}%</span></div>`; }

function commentCount(chId){ const c=store.comments[chId]||[]; return c.length; }
function paraComments(chId, p){ return (store.comments[chId]||[]).filter(c=>c.para===p); }

function ctaFor(ch, r, story, opts){
  opts = opts||{};
  const cid = ch.id;
  if (r.state === "free" || r.state === "unlocked") return `<button class="btn ${opts.small?'sm':''} ${opts.block?'block':''} story" data-read="${cid}">${I.play}Read</button>`;
  if (r.state === "preview") return `<button class="btn ${opts.small?'sm':''} ${opts.block?'block':''}" data-preview="${cid}">${I.eye}Preview</button>`;
  if (r.state === "early") return `<button class="btn ${opts.small?'sm':''} ${opts.block?'block':''}" data-lock="${cid}">${I.hourglass}Early access</button>`;
  if (r.state === "pending") return `<button class="btn ${opts.small?'sm':''} ${opts.block?'block':''}" data-lock="${cid}">${I.sync}Verifying</button>`;
  if (r.state === "expired") return `<button class="btn ${opts.small?'sm':''} ${opts.block?'block':''}" data-lock="${cid}">${I.lockOpen}Renew</button>`;
  if (r.state === "key") return `<button class="btn ${opts.small?'sm':''} ${opts.block?'block':''}" data-lock="${cid}">${I.key}Redeem key</button>`;
  if (r.state === "unavailable") return `<button class="btn sm" disabled>Unavailable</button>`;
  return `<button class="btn ${opts.small?'sm':''} ${opts.block?'block':''}" data-lock="${cid}">${I.lockOpen}Unlock</button>`;
}

/* ============ small helpers ============ */
function fmtDate(iso){ if(!iso) return ""; const m=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; const d=new Date(iso); return m[d.getMonth()]+" "+d.getDate(); }
function daysUntil(iso){ if(!iso) return null; const d=new Date(iso); const t=new Date("2026-06-24"); return Math.max(0, Math.round((d-t)/86400000)); }
function setStoryAccent(s){ document.documentElement.style.setProperty("--s", s.accent); document.documentElement.style.setProperty("--s2", s.accent2); document.documentElement.style.setProperty("--s-soft", hexA(s.accent,0.14)); }
function getActiveStory() {
  if (typeof route === "undefined" || !route) return D.STORIES && D.STORIES[0];
  if (route.name === "read" && typeof currentChapter !== "undefined" && currentChapter) {
    return currentChapter.story;
  }
  if (route.params && route.params.slug) {
    return bySlug(route.params.slug);
  }
  return D.STORIES && D.STORIES[0];
}
function applyBgSettings() {
  if (!document.body) return;
  const settings = store.settings;
  const bgMode = settings.bgMode || "story";
  const bgBlur = settings.bgBlur !== false;
  document.body.setAttribute("data-bg-mode", bgMode);
  document.body.setAttribute("data-bg-blur", bgBlur ? "true" : "false");
  
  const readerWidth = settings.readerWidth || 46;
  document.documentElement.style.setProperty("--reader-w", readerWidth + "rem");
  
  const readerBg = !!settings.readerBg;
  document.body.classList.toggle("show-reader-bg", readerBg);
  
  const story = getActiveStory();
  const bg = document.getElementById("global-bg");
  if (bg) {
    if (bgMode === "story" && story) {
      const selectedWp = settings.bgImageUrl || "default";
      let bgUrl = "";
      if (selectedWp === "default") {
        bgUrl = story.background_image_url || story.cover_image_url || "";
      } else {
        bgUrl = selectedWp;
      }
      
      if (bgUrl) {
        if (bg.style.backgroundImage !== `url("${bgUrl}")`) {
          bg.style.backgroundImage = `url('${bgUrl}')`;
        }
        bg.style.opacity = "1";
        document.body.classList.add("has-story-bg");
      } else {
        bg.style.backgroundImage = "";
        bg.style.opacity = "0";
        document.body.classList.remove("has-story-bg");
      }
    } else {
      bg.style.backgroundImage = "";
      bg.style.opacity = "0";
      document.body.classList.remove("has-story-bg");
    }
  }
}
function meta(items){ return items.filter(Boolean).map(x=>`<span class="mi">${x}</span>`).join(""); }
function countReadable(){ let n=0; D.STORIES.forEach(s=>s.chapters.forEach(c=>{ if(isReadable(chapterResolved(c))) n++; })); return n; }
function activeReads(){ return Object.entries(store.progress).map(([id,p])=>{ const f=byId(id); return f?{...f, prog:p}:null; }).filter(Boolean).sort((a,b)=>b.prog.updatedAt-a.prog.updatedAt); }
function totalComments(){ return Object.values(store.comments).reduce((s,a)=>s+a.length,0); }

/* ============ shared card builders ============ */
function storyCard(s){
  const r = s.chapters.map(chapterResolved);
  const memberOnly = r.every(x=>x.state!=="free") && s.chapters.some(c=>c.state!=="free");
  const freeBadge = s.chapters.some(c=>c.state==="free");
  const prog = s.chapters.map(c=>store.progress[c.id]).filter(Boolean);
  const lastUpd = Math.max(0,...s.chapters.map((c,i)=>i));
  return `<a class="story-card" href="#/story/${s.slug}" data-nav="/story/${s.slug}" style="${storyAccentVars(s)}">
    <div class="cover">${coverArt(s)}${memberOnly?`<span class="ribbon">Member</span>`:""}${prog.length?`<div class="progress-pip">${progressBar(prog[0].pct)}</div>`:""}</div>
    <div class="meta"><h3>${s.title}</h3><div class="by">${s.author} · ${s.genre}</div></div>
  </a>`;
}
function storyCardWide(s){
  const firstProgress = s.chapters.find(c=>store.progress[c.id]);
  const prog = firstProgress ? store.progress[firstProgress.id] : null;
  return `<a class="card tinted" href="#/story/${s.slug}" data-nav="/story/${s.slug}" style="${storyAccentVars(s)};display:flex;gap:13px;align-items:center;">
    <div style="width:54px;height:72px;border-radius:8px;overflow:hidden;flex:0 0 auto;border:1px solid var(--border)">${coverArt(s)}</div>
    <div style="min-width:0;flex:1"><div style="font-family:var(--serif);font-weight:600">${s.title}</div><div class="faint" style="font-size:.74rem">${s.genre} &middot; ${s.status}${s.chapters.length?"":" &middot; chapters coming soon"}</div>${prog?progressBar(prog.pct):""}</div>
  </a>`;
}
