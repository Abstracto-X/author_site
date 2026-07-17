/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ shared partials ============ */
function brandMark(){ return `<svg class="mark" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e7cd97"/><stop offset="1" stop-color="#d4b06a"/></linearGradient></defs><path d="M16 2 4 9v8c0 6 5 10 12 13 7-3 12-7 12-13V9z" fill="url(#bm)" opacity=".18" stroke="#d4b06a" stroke-width="1.2"/><path d="M16 8 9 12v5c0 4 3 7 7 9 4-2 7-5 7-9v-5z" fill="none" stroke="#e7cd97" stroke-width="1.4"/><path d="M16 11v10M12 16h8" stroke="#d4b06a" stroke-width="1.2" stroke-linecap="round"/></svg>`; }

function topbar(){
  const P = persona();
  const state = P.expired?"expired":P.pending?"pending":(P.noTier||P.level===0&&P.signedIn)?"none":P.level>0?"active":"anon";
  const label = !P.signedIn?"Not signed in":P.expired?"Access expired":P.pending?"Sync pending":P.noTier?"No access":P.tier?("Active · "+P.tier):"Signed in";
  const unread = store.notifs.filter(n=>!n.read).length;
  return `<header class="topbar">
    <a class="brand" href="#/" data-nav="/">${brandMark()}<span class="btxt"><span class="serif">${esc(SITE_NAME)}</span><small>${esc(SITE_TAGLINE)}</small></span></a>
    <span class="spacer"></span>
    <button class="access-chip" data-state="${state}" data-nav="/vault"><span class="pulse"></span>${label}</button>
    ${isAdmin()?`<a class="tb-btn admin-shortcut" href="writer.html" aria-label="Writer">${I.book}</a><a class="tb-btn admin-shortcut" href="admin.html" aria-label="Admin CMS">${I.shield}</a>`:""}
    <button class="tb-btn" data-nav="/notifications" aria-label="Notifications">${I.bell}${unread?`<span class="dot"></span>`:""}</button>
    <button class="tb-btn" data-sheet="persona" aria-label="Account and access">${I.user}</button>
  </header>`;
}
function bottomnav(active){
  const items=[["home","/","Home"],["library","/library","Library"],["feed","/updates","Updates"],["shelf","/my-shelf","Shelf"],["vault","/vault","Vault"]];
  return `<nav class="bottomnav">${items.map(([ic,path,lbl])=>`<a href="#${path}" data-nav="${path}" class="${active===ic?'active':''}">${I[ic]}<span>${lbl}</span></a>`).join("")}</nav>`;
}
function sidenav(active){
  const items=[["home","/","Home"],["library","/library","Library"],["feed","/updates","Updates"],["shelf","/my-shelf","Shelf"],["vault","/vault","Vault"]];
  return `<nav class="sidenav" aria-label="Primary">${items.map(([ic,path,lbl])=>`<a href="#${path}" data-nav="${path}" class="${active===ic?'active':''}" aria-label="${lbl}">${I[ic]}<span>${lbl}</span></a>`).join("")}<span class="spacer"></span><a href="#/support/check-access" data-nav="/support/check-access" aria-label="Access help">${I.shield}<span>Help</span></a></nav>`;
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
