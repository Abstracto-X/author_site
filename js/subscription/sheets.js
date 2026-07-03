/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ sheets ============ */
let currentSheet = null;
function openSheet(builder, opts){
  opts = opts||{};
  closeSheet(true);
  const scrim = document.querySelector(".scrim") || (()=>{const d=document.createElement("div");d.className="scrim";document.body.appendChild(d);return d;})();
  const sheet = document.querySelector(".sheet") || (()=>{const d=document.createElement("div");d.className="sheet";document.body.appendChild(d);return d;})();
  sheet.innerHTML = `<span class="grip"></span>${builder()}`;
  document.body.classList.add("has-sheet");
  requestAnimationFrame(()=>{ scrim.classList.add("open"); sheet.classList.add("open"); });
  currentSheet = { builder, opts };
  if (opts.onMount) requestAnimationFrame(()=>opts.onMount(sheet));
}
function closeSheet(silent){
  const scrim = document.querySelector(".scrim"), sheet = document.querySelector(".sheet");
  if (scrim) scrim.classList.remove("open");
  if (sheet) sheet.classList.remove("open");
  document.body.classList.remove("has-sheet");
  currentSheet = null;
}

/* ============ SHEETS (builders) ============ */
function sheetSettings(){
  const st=store.settings;
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>Settings</h2><p class="sheet-sub">Theme &amp; reading comfort. Saved to this device.</p>
  <div class="set-group"><label>Site theme</label>${themeSwatches()}</div>
  <div class="set-group"><label>Reader lighting</label><div class="seg">${["aether","twilight","parchment"].map(t=>`<button class="${st.readerTheme===t?'active':''}" data-set-theme="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join("")}</div></div>
  <div class="set-group"><label>Reading preset</label><div class="seg">${[["none","Default"],["focus","Focus"],["bedtime","Bedtime"],["dyslexia","Dyslexia"],["compact","Compact"]].map(([k,l])=>`<button class="${st.preset===k?'active':''}" data-set-preset="${k}">${l}</button>`).join("")}</div></div>
  <div class="set-group"><label>Font size <span class="faint" style="float:right">${Math.round(st.fontScale*100)}%</span></label><input type="range" class="range" min="0.8" max="1.4" step="0.05" value="${st.fontScale}" data-set-range="fontScale"></div>
  <div class="set-group"><label>Line height <span class="faint" style="float:right">${st.lineHeight.toFixed(2)}</span></label><input type="range" class="range" min="1.5" max="2.1" step="0.02" value="${st.lineHeight}" data-set-range="lineHeight"></div>
  <div class="set-group"><label>Comfort</label>
    ${toggleRow("showImages","Reader images","Inline figures in chapters",st.showImages)}
    ${toggleRow("showParaComments","Paragraph comments","Show comment chips on paragraphs",st.showParaComments)}
    ${toggleRow("showProgress","Progress bar","Show reading progress",st.showProgress)}
    ${toggleRow("showReactions","Chapter reactions","Show reaction buttons at chapter end",st.showReactions)}
    ${toggleRow("spoilerSafe","Spoiler safety","Hide titles/descriptions of unread chapters",st.spoilerSafe)}
    ${toggleRow("focusMode","Focus mode","Hide UI until you tap the page",st.focusMode)}
  </div>`;
}
function toggleRow(key,title,sub,on){ return `<div class="toggle-row"><div class="lbl">${title}<small>${sub}</small></div><button class="switch ${on?'on':''}" data-toggle="${key}" aria-label="${title}"></button></div>`; }

function sheetPersona(){
  const P=persona();
  const active = activeEntitlements();
  const signedIn = !!authState.user;
  const status = signedIn ? (active.length ? `${active.length} active entitlement${active.length===1?"":"s"}` : "Signed in, no active member entitlement") : "Guest reader";
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>Account</h2>
  <div class="card tinted" style="margin-bottom:14px;display:flex;gap:12px;align-items:center"><span style="width:42px;height:42px;border-radius:50%;background:var(--accent-soft);display:grid;place-items:center;color:var(--accent)">${I.user}</span><div style="flex:1;min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis">${esc(accountLabel())}</div><div class="faint" style="font-size:.76rem">${esc(P.tier || status)}</div></div>${signedIn?`<button class="btn sm ghost" data-act="reader-signout">Sign out</button>`:""}</div>
  <div class="quicklinks" style="margin-bottom:16px"><a data-nav="/vault">${I.vault}<span>Vault</span><small>Manage access</small></a><a data-nav="/my-shelf">${I.shelf}<span>My Shelf</span><small>Your library</small></a><a data-sheet="settings">${I.aa}<span>Preferences</span><small>Reader</small></a>${isAdmin()?`<a href="admin.html"><span>${I.shield}</span><span>Admin CMS</span><small>Production controls</small></a><a data-nav="/studio/access">${I.overview}<span>Studio Access</span><small>Preview console</small></a>`:""}</div>
  ${signedIn?`<div class="card" style="margin-bottom:14px"><div class="eyebrow" style="margin-bottom:7px">Entitlements</div>${active.length?active.map(e=>`<div class="between" style="gap:10px;padding:6px 0"><span style="font-weight:600;font-size:.86rem">${esc(e.tier_name || e.name || e.tier || "Reader access")}</span><span class="badge free">active</span></div>`).join(""):`<p class="faint" style="font-size:.8rem;margin:0">No active entitlement returned yet. Connect provider or redeem an access key.</p>`}</div>`:`<div class="card" style="margin-bottom:14px"><div class="eyebrow" style="margin-bottom:8px">Continue</div><div class="col-flex"><button class="btn story block" type="button" data-act="google-signin">${I.external}Continue with Google</button><div class="faint" style="font-size:.74rem;text-align:center">or use email</div><form data-auth-form="signin"><div class="col-flex"><input class="pill-input" name="email" type="email" autocomplete="email" placeholder="reader@example.com" style="text-align:left"><input class="pill-input" name="password" type="password" autocomplete="current-password" placeholder="Password" style="text-align:left"><div class="faint" data-auth-status style="font-size:.76rem;min-height:1em"></div><button class="btn ghost block" type="submit">${I.user}Sign in with email</button><button class="btn ghost block" type="button" data-act="show-signup">Create email account</button><button class="btn ghost block" type="button" data-act="show-forgot-password">Forgot password?</button></div></form></div></div>`}
  <div class="card" style="margin-top:8px"><div style="font-weight:600;font-size:.86rem">Backend bridge status</div><div class="faint" style="font-size:.74rem;margin-top:4px">Supabase auth, catalog RPCs, chapter RPCs, and entitlement checks are active. Use admin.html for real tier/key/grant management.</div></div>`;
}
function sheetSignup(){
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>Save your library</h2><p class="sheet-sub">Use Google for the fastest setup, or create an email login for key redemption, Patreon linking, and future cross-device shelf sync.</p>
  <div class="card" style="margin-bottom:12px"><button class="btn story block" type="button" data-act="google-signin">${I.external}Continue with Google</button></div>
  <form data-auth-form="signup" class="card"><div class="col-flex"><input class="pill-input" name="email" type="email" autocomplete="email" placeholder="reader@example.com" style="text-align:left"><input class="pill-input" name="password" type="password" autocomplete="new-password" placeholder="Password" style="text-align:left"><div class="faint" data-auth-status style="font-size:.76rem;min-height:1em"></div><button class="btn ghost block" type="submit">${I.user}Create email login</button><button class="btn ghost block" type="button" data-sheet="persona">Back to sign in</button></div></form>`;
}
function sheetForgotPassword(){
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>Reset password</h2><p class="sheet-sub">Enter your account email and we will send a secure password reset link.</p>
  <form data-auth-form="recover" class="card"><div class="col-flex"><input class="pill-input" name="email" type="email" autocomplete="email" placeholder="reader@example.com" style="text-align:left"><div class="faint" data-auth-status style="font-size:.76rem;min-height:1em"></div><button class="btn story block" type="submit">${I.mail}Send reset link</button><button class="btn ghost block" type="button" data-sheet="persona">Back to sign in</button></div></form>`;
}
function sheetUpdatePassword(){
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>Set new password</h2><p class="sheet-sub">Your reset link is verified. Choose a new password for this reader account.</p>
  <form data-auth-form="update" class="card"><div class="col-flex"><input class="pill-input" name="password" type="password" autocomplete="new-password" placeholder="New password" style="text-align:left"><div class="faint" data-auth-status style="font-size:.76rem;min-height:1em"></div><button class="btn story block" type="submit">${I.user}Update password</button></div></form>`;
}
function sheetLock(chId){
  const f=byId(chId); if(!f) return "<p>Not found.</p>"; const {ch,story}=f; const r=chapterResolved(ch);
  return `<span class="close-x" data-act="close-sheet">${I.x}</span>
  <div style="display:flex;gap:12px;align-items:center;margin-bottom:6px"><span class="ax ${accessTag(r)[0]}" style="font-size:1.5rem"><span class="ic" style="width:28px;height:28px">${accessTag(r)[2]}</span></span><div><h2>${ch.title}</h2><div class="sheet-sub" style="margin:0">${story.title} · Chapter ${ch.n}</div></div></div>
  <div class="card" style="margin-bottom:14px"><p class="muted" style="font-size:.86rem;margin:0">${reasonFor(ch,r)}</p></div>
  <div class="col-flex" style="gap:9px">
    ${ch.state==='preview'?`<button class="btn story block" data-preview="${ch.id}" data-act="close-sheet">${I.eye}Read the preview</button>`:""}
    ${r.state==='expired'?`<button class="btn story block" data-sheet="connect-patreon">${I.sync}Renew via Patreon</button>`:`<button class="btn ${ch.state==='preview'?'ghost':'story'} block" data-sheet="connect-patreon">${I.vault}Connect provider</button>`}
    <button class="btn ghost block" data-sheet="redeem">${I.key}Redeem an access key</button>
    <a class="btn ghost block" data-nav="/benefits">${I.spark}See what access unlocks</a>
    <a class="btn ghost block" data-nav="/support/check-access">${I.shield}Why is this locked?</a>
  </div>`;
}
function sheetRedeem(){
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>Redeem an access key</h2><p class="sheet-sub">Keys unlock beta, reviewer, gift &amp; campaign content. Access binds to your account.</p>
  <form data-redeem-form><div class="col-flex"><input id="key-input-sheet" class="pill-input" name="key" style="text-align:left;letter-spacing:.1em" placeholder="XXXX-XXXX-XXXX-XXXX" autocomplete="off"><div id="key-error" class="faint" style="font-size:.76rem;min-height:1em"></div><button class="btn story block" type="submit">${I.key}Redeem key</button></div></form>`;
}
function sheetConnectPatreon(){
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>Activate with Patreon</h2><p class="sheet-sub">Patreon proves membership; your Aether login saves the library, keys, progress, and provider links.</p>
  <div class="card" style="margin-bottom:14px"><div class="between"><div><div style="font-weight:600">One smooth flow</div><div class="faint" style="font-size:.78rem">${authState.user?"We will send you to Patreon, then sync your tier back here.":"Continue with Google first, then we will automatically send you to Patreon to activate access."}</div></div>${I.vault}</div></div>
  <div class="col-flex" style="gap:9px">${authState.user?`<button class="btn story block" data-act="connect-patreon-go">${I.vault}Continue with Patreon</button>`:`<button class="btn story block" data-act="google-then-patreon">${I.external}Continue with Google, then Patreon</button><button class="btn ghost block" data-sheet="persona">${I.user}Use email instead</button>`}<button class="btn ghost block" data-sheet="redeem">${I.key}I have a key instead</button><a class="btn ghost block" data-nav="/support/wrong-account">${I.user}Wrong account?</a></div>
  <p class="faint" style="font-size:.72rem;margin-top:12px">Under the hood, Supabase remains the account that owns progress and entitlements; Patreon is linked as the payment/access provider.</p>`;
}
function sheetContext(){
  const f=currentChapter; if(!f) return "<p>Open a chapter first.</p>"; const {ch,story,index}=f;
  const prog=store.progress[ch.id];
  const next=story.chapters[index+1]; const nr=next?chapterResolved(next):null;
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>${ch.title}</h2><div class="sheet-sub">${story.title} · Chapter ${ch.n} · ${ch.arc||""}</div>
  <div class="card" style="margin-bottom:12px">${prog?`<div class="between"><span class="faint" style="font-size:.78rem">Progress</span><span style="font-size:.8rem;font-weight:600">${prog.pct}%</span></div>${progressBar(prog.pct)}`:`<p class="faint" style="font-size:.8rem;margin:0">Not started. Est. ${ch.wordCount || (ch.readTime * 220)} words.</p>`}</div>
  <div class="col-flex" style="gap:8px">
    <button class="btn ghost block" data-act="reader-bookmark">${I.bookmark}${store.bookmarks.find(b=>b.chapterId===ch.id)?'Remove bookmark':'Bookmark chapter'}</button>
    <button class="btn ghost block" data-act="reader-savequote">${I.quote}Save a quote</button>
    <button class="btn ghost block" data-act="reader-markread">${store.readMarked[ch.id]?I.check+'Marked read':'Mark as read'}</button>
    <button class="btn ghost block" data-act="offline-queue">${I.download}Save for offline</button>
    <a class="btn ghost block" data-nav="/story/${story.slug}/recap">${I.list}Read recap</a>
    <a class="btn ghost block" data-nav="/story/${story.slug}/extras">${I.spark}Bonus materials</a>
    ${next?`<div class="card" style="margin-top:4px"><div class="between"><div><div class="faint" style="font-size:.7rem;text-transform:uppercase">Next</div><div style="font-family:var(--serif);font-weight:600">${next.title}</div><div class="faint" style="font-size:.74rem">${axInline(nr)}</div></div>${isReadable(nr)?`<button class="btn sm story" data-read="${next.id}">${I.play}Go</button>`:`<button class="btn sm" data-lock="${next.id}">${accessTag(nr)[3]}</button>`}</div></div>`:""}
  </div>`;
}
function sheetParaComments(chId, p){
  const list=paraComments(chId,p);
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>Paragraph note</h2><div class="sheet-sub">${list.length} note${list.length===1?'':'s'} on this paragraph</div>
  <div style="margin-bottom:14px">${list.map(commentHTML).join("")||`<p class="faint" style="font-size:.82rem">No notes yet.</p>`}</div>
  <form data-para-form="${chId}" data-para-index="${p}"><div class="col-flex"><input name="name" placeholder="Your name" style="max-width:140px"><input name="text" placeholder="Add a note on this paragraph…" required><button class="btn sm story" type="submit">${I.msg}Post</button></div></form>`;
}
function sheetImage(fig, cap){
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><div style="border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)">${D.FIG[fig]||""}</div><p class="muted center" style="font-size:.82rem;margin-top:10px;font-style:italic">${cap||""}</p>`;
}
