/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ router ============ */
let route = { name:"home", params:{} };
function parseHash(){
  const raw = location.hash.replace(/^#\/?/, "");
  const p = raw.split("/").filter(Boolean);
  const r = { name:"home", params:{} };
  if (!p.length) return r;
  if (p[0]==="library") r.name="library";
  else if (p[0]==="updates") r.name="updates";
  else if (p[0]==="calendar") r.name="calendar";
  else if (p[0]==="collections"){ r.name = p[1]?"collection":"collections"; r.params.slug=p[1]; }
  else if (p[0]==="vault") r.name="vault";
  else if (p[0]==="my-shelf") r.name="shelf";
  else if (p[0]==="bookmarks") r.name="bookmarks";
  else if (p[0]==="quotes") r.name="quotes";
  else if (p[0]==="history") r.name="history";
  else if (p[0]==="notifications") r.name="notifications";
  else if (p[0]==="benefits") r.name="benefits";
  else if (p[0]==="onboarding") r.name="onboarding";
  else if (p[0]==="help") r.name="help";
  else if (p[0]==="support"){ r.name = { "check-access":"checkAccess","wrong-account":"wrongAccount","contact":"contact" }[p[1]] || "help"; }
  else if (p[0]==="story"){ r.params.slug=p[1]; r.name = { chapters:"chapters", recap:"recap", extras:"extras", updates:"storyUpdates" }[p[2]] || "story"; }
  else if (p[0]==="read"){ r.params.id=p[1]; r.name="read"; }
  else if (p[0]==="studio" && feature("enableStudioPreview", false)){
    r.name = { chapters:"studioChapters", access:"studioAccess", announcements:"studioAnnouncements", media:"studioMedia", analytics:"studioAnalytics", settings:"studioSettings" }[p[1]] || "studioOverview";
  }
  return r;
}
function nav(path){ if(path===location.hash||( "#"+path)===location.hash){ render(); } else { location.hash = path; } }


function backendSetupRequired(){ return !backendState.loaded; }
function backendSetupView(){
  const msg = backendState.error?.message || authState.error?.message || "Loading the subscription catalog from Supabase.";
  const configured = configuredSupabase();
  if ((backendState.loading || !authState.ready) && configured) return `<div class="reader-loading"><div class="reader-spinner"></div><h3>Loading member library</h3><p>Fetching stories, chapter catalog, and access state from Supabase.</p></div>`;
  return `<div class="empty" style="padding-top:90px"><div class="em">${I.alert}</div><h3>Subscription site setup required</h3><p>This production reader is configured to use the real Supabase backend only. No local sample stories will be shown.</p><div class="card" style="text-align:left;max-width:640px;margin:16px auto"><div style="font-weight:700;margin-bottom:8px">What to check</div><ol class="muted" style="line-height:1.7;margin:0;padding-left:20px"><li>Set <code>supabase.url</code> and <code>supabase.anonKey</code> in <code>js/subscription/site-config.js</code>.</li><li>Run the SQL files in <code>database/sql/</code> against the new Supabase project.</li><li>Publish at least one story and one chapter, then verify <code>get_chapter_catalog</code>.</li></ol><p class="faint" style="font-size:.78rem;margin:12px 0 0">Current status: ${esc(msg)}</p></div></div>`;
}
function render(){
  route = parseHash();
  const main = document.getElementById("main");
  const inReader = route.name === "read";
  const inStudio = /^studio/.test(route.name);
  document.body.classList.toggle("in-reader", inReader);
  document.body.classList.toggle("in-studio", inStudio);
  const view = VIEWS[route.name] || VIEWS.home;
  const html = (!inStudio && backendSetupRequired()) ? backendSetupView() : (inStudio && !isAdmin()) ? adminGate() : view();
  const apply = ()=>{
    if (inReader){
      main.innerHTML = html;
    } else if (inStudio){
      main.innerHTML = `<div class="vt studio-body">${html}</div>`;
    } else {
      main.innerHTML = `<div class="vt">${html}</div>`;
    }
    if (inStudio && isAdmin()){ ensureStudioChrome(); }
    else if (!inReader){ ensureChrome(); }
    afterRender();
    if (window.scrollTo) { try { window.scrollTo(0,0); } catch(e){} }
  };
  apply();
}
function adminGate(){
  return `<div class="empty" style="padding-top:90px"><div class="em">${I.shield}</div><h3>Admin access required</h3><p>The author studio is only visible to profiles with the <code>admin</code> role. Use the main admin CMS for production access controls.</p>${authState.user?`<a class="btn story" href="admin.html">${I.external}Open admin CMS</a>`:`<button class="btn story" data-sheet="persona">${I.user}Sign in</button>`}<button class="btn ghost" data-nav="/">Back to reader</button></div>`;
}
function prefersReducedMotion(){ return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }

let chromeBuilt = false;
function ensureChrome(){
  const app = document.getElementById("app");
  // remove studio chrome if present (leaving studio)
  const studioTopEl = document.querySelector(".studio-top");
  if (studioTopEl) studioTopEl.remove();
  document.body.classList.remove("in-studio");
  if (!document.querySelector(".topbar")){ const tb=document.createElement("header"); tb.innerHTML=""; }
  // rebuild chrome each render to update access chip / notif dot
  let topEl = document.querySelector(".topbar");
  if (!topEl){ topEl=document.createElement("header"); app.insertBefore(topEl, document.getElementById("main")); }
  topEl.outerHTML = topbar();
  let navEl = document.querySelector(".bottomnav");
  if (!navEl){ navEl=document.createElement("nav"); app.appendChild(navEl); }
  const active = {home:"home",library:"library",updates:"feed",shelf:"shelf",vault:"vault"}[route.name] || "";
  navEl.outerHTML = bottomnav(active);
  let sideEl = document.querySelector(".sidenav");
  if (!sideEl){ sideEl=document.createElement("nav"); app.appendChild(sideEl); }
  sideEl.outerHTML = sidenav(active);
  chromeBuilt = true;
}
function ensureStudioChrome(){
  const app = document.getElementById("app");
  const tb=document.querySelector(".topbar"); if(tb) tb.remove();
  const nv=document.querySelector(".bottomnav"); if(nv) nv.remove();
  const sn=document.querySelector(".sidenav"); if(sn) sn.remove();
  let st = document.querySelector(".studio-top");
  if(!st){ st=document.createElement("header"); st.className="studio-top"; app.insertBefore(st, document.getElementById("main")); }
  st.outerHTML = studioTop();
}
function studioTop(){
  const active = { studioOverview:"", studioChapters:"chapters", studioAccess:"access", studioAnnouncements:"announcements", studioMedia:"media", studioAnalytics:"analytics", studioSettings:"settings" }[route.name];
  const nav=[
    ["","Overview","overview"],["chapters","Chapters","book"],["access","Access","vault"],
    ["announcements","Posts","msg"],["media","Media","spark"],["analytics","Stats","grid"],["settings","Settings","cog"]
  ];
  return `<div class="studio-top">
    <div class="st-row">
      <a class="brand" href="#/studio" data-nav="/studio">${brandMark()}<span class="btxt"><span class="serif">Aether Studio</span><small>Author CMS</small></span></a>
      <span class="exit"><button class="btn sm ghost" data-nav="/">${I.chevL}Exit to reader</button></span>
    </div>
    <nav class="studio-nav">${nav.map(([p,l,ic])=>`<a href="#/studio${p?'/'+p:''}" data-nav="/studio${p?'/'+p:''}" class="${active===p?'active':''}">${I[ic]}<span>${l}</span></a>`).join("")}</nav>
  </div>`;
}

/* ============ views registry ============ */
const VIEWS = {};
