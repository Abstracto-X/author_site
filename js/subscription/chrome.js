/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ shared partials ============ */
function brandMark(){ return `<svg class="mark" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e7cd97"/><stop offset="1" stop-color="#d4b06a"/></linearGradient></defs><path d="M16 2 4 9v8c0 6 5 10 12 13 7-3 12-7 12-13V9z" fill="url(#bm)" opacity=".18" stroke="#d4b06a" stroke-width="1.2"/><path d="M16 8 9 12v5c0 4 3 7 7 9 4-2 7-5 7-9v-5z" fill="none" stroke="#e7cd97" stroke-width="1.4"/><path d="M16 11v10M12 16h8" stroke="#d4b06a" stroke-width="1.2" stroke-linecap="round"/></svg>`; }

const TOPBAR_TIER_BANNERS = [
  { name:"Resident Licker", className:"licker", topbarBanner:"assets/profile-frames/topbar-banner-licker.png" },
  { name:"Resident Tyrant", className:"tyrant", topbarBanner:"assets/profile-frames/topbar-banner-tyrant.png" },
  { name:"Resident Nemesis", className:"nemesis", topbarBanner:"assets/profile-frames/topbar-banner-nemesis.png" },
  { name:"Resident Evil", className:"evil", topbarBanner:"assets/profile-frames/topbar-banner-evil.png" }
];
function topbarTierBanner(P, checkingAccount){
  if (checkingAccount || !P.signedIn || P.expired || P.pending || P.noTier) return null;
  const best = typeof activeEntitlements === "function"
    ? [...activeEntitlements()].sort((a,b)=>Number(b.tier_rank||0)-Number(a.tier_rank||0))[0]
    : null;
  const rawName = String(best?.tier_name || best?.name || best?.tier || (!P.admin && P.tier ? P.tier : "")).trim();
  if (!rawName) return null;
  const matched = typeof membershipTier === "function"
    ? membershipTier(rawName)
    : TOPBAR_TIER_BANNERS.find(tier => rawName.toLowerCase().includes(tier.name.toLowerCase()));
  if (!matched) return null;
  const src = matched.topbarBanner || TOPBAR_TIER_BANNERS.find(tier => tier.className === matched.className)?.topbarBanner;
  return src ? { name: matched.name, className: matched.className, src } : null;
}
function topbar(){
  const P = persona();
  const checkingAccount = !authState.ready || !!authState.authPending;
  const tierBanner = topbarTierBanner(P, checkingAccount);
  const state = checkingAccount?"pending":P.expired?"expired":P.pending?"pending":(P.noTier||P.level===0&&P.signedIn)?"none":(tierBanner||P.level>0)?"active":"anon";
  const label = checkingAccount?"Checking account":!P.signedIn?"Not signed in":P.expired?"Access expired":P.pending?"Sync pending":P.noTier?"No access":P.admin?"Admin mode":P.tier?("Active · "+P.tier):"Signed in";
  const accessControl = tierBanner
    ? `<button class="access-chip access-chip-banner tier-${tierBanner.className}" data-state="active" data-tier="${tierBanner.className}" data-nav="/vault" aria-label="Active · ${esc(tierBanner.name)}" title="Active · ${esc(tierBanner.name)}"><img src="${esc(tierBanner.src)}" alt="Active · ${esc(tierBanner.name)}"></button>`
    : `<button class="access-chip" data-state="${state}" data-nav="/vault"><span class="pulse"></span>${label}</button>`;
  const unread = store.notifs.filter(n=>!n.read).length;
  return `<header class="topbar">
    <a class="brand" href="#/" data-nav="/">${brandMark()}<span class="btxt"><span class="serif">${esc(SITE_NAME)}</span></span></a>
    <span class="spacer"></span>
    ${accessControl}
    ${isAdmin()?`<a class="tb-btn admin-shortcut" href="writer.html" aria-label="Writer">${I.book}</a><a class="tb-btn admin-shortcut" href="admin.html" aria-label="Admin CMS">${I.shield}</a>`:""}
    <button class="tb-btn site-theme-toggle" data-act="toggle-site-theme" aria-label="Switch site theme (current: ${store.theme==='evil'?'Resident Evil':store.theme==='light'?'light':'dark'})" title="Switch site theme">${store.theme==='evil'?I.evil:store.theme==='light'?I.moon:I.sun}</button>
    <button class="tb-btn" data-nav="/settings" aria-label="Site settings" title="Site settings">${I.cog}</button>
    <button class="tb-btn" data-nav="/notifications" aria-label="Notifications">${I.bell}${unread?`<span class="dot"></span>`:""}</button>
    <button class="tb-btn" data-sheet="persona" aria-label="Account and access">${I.user}</button>
  </header>`;
}
// Shared navigation keeps the same destinations at both breakpoints.
function readerNavItems(){
  return [["home","/","Home"],["library","/library","Library"],["gallery","/gallery","Gallery"],["feed","/updates","Updates"],
    ["shelf","/my-shelf","My Shelf"],["vault","/vault","The Vault"],["help","/help","Help"],["cog","/settings","Settings"]];
}
function readerNavLink(ic,path,label,active){
  return `<a href="#${path}" data-nav="${path}" class="${active===ic?'active':''}" aria-label="${label}" title="${label}" ${active===ic?'aria-current="page"':''}>${I[ic]}<span>${label}</span></a>`;
}
function bottomnav(active){
  const items=readerNavItems().filter(([ic])=>["home","library","gallery","vault"].includes(ic));
  return `<nav class="bottomnav" aria-label="Mobile navigation">${items.map(([ic,path,label])=>readerNavLink(ic,path,label,active)).join("")}<button type="button" data-sheet="navigation" aria-label="More pages" aria-haspopup="dialog" class="${['shelf','feed','help','cog'].includes(active)?'active':''}">${I.list}<span>More</span></button></nav>`;
}
function sidenav(active){
  return `<nav class="sidenav" id="reader-navigation" aria-label="Primary">
    <a class="rail-brand" href="#/" data-nav="/" aria-label="${esc(SITE_NAME)} home"><b>${esc(SITE_NAME.slice(0,1))}</b><span>${esc(SITE_NAME)}</span></a>
    <div class="reader-nav-links">${readerNavItems().map(([ic,path,label],i)=>`${i===4||i===6?'<div class="reader-nav-divider"></div>':''}${readerNavLink(ic,path,label,active)}`).join("")}</div>
    <button type="button" class="reader-nav-toggle" data-act="reader-nav-toggle" aria-controls="reader-navigation" aria-expanded="${!store.readerNavCollapsed}" aria-label="${store.readerNavCollapsed?'Expand':'Collapse'} navigation">${store.readerNavCollapsed?I.chevR:I.chevL}<span>Collapse sidebar</span></button>
  </nav>`;
}
function readerPageHeading(title,description,actions=""){
  return `<header class="reader-page-heading"><div><h1 class="page-title">${esc(title)}</h1>${description?`<p class="page-sub">${esc(description)}</p>`:''}</div>${actions?`<div class="reader-page-actions">${actions}</div>`:''}</header>`;
}
function readerEmptyState(icon,title,description,action=""){
  return `<div class="empty reader-empty"><span class="em" aria-hidden="true">${I[icon]||I.book}</span><h2>${esc(title)}</h2><p>${esc(description)}</p>${action}</div>`;
}
function announcement(){ return ""; }

/* ============ toasts ============ */
function toast(title, sub, opts){
  opts = opts||{};
  const wrap = document.querySelector(".toasts") || (()=>{const d=document.createElement("div");d.className="toasts";document.body.appendChild(d);return d;})();
  const t = document.createElement("div"); t.className="toast";
  const ic = opts.kind||"good";
  t.innerHTML = `<span class="ic ${ic==='good'?'good':ic==='bad'?'bad':''}">${opts.icon?I[opts.icon]:I.check}</span><div class="txt"><b>${esc(title)}</b>${sub?`<small>${esc(sub)}</small>`:""}</div>${opts.action?`<button class="act" data-toast-action="${opts.action.act}">${esc(opts.action.label)}</button>`:""}`;
  wrap.appendChild(t);
  requestAnimationFrame(()=>t.classList.add("show"));
  setTimeout(()=>{ t.classList.remove("show"); setTimeout(()=>t.remove(),300); }, opts.ms||4200);
}
