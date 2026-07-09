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
function wallpaperSwatches(story) {
  if (!story) return "";
  const wallpapers = story.wallpapers || [];
  const activeWp = store.settings.bgImageUrl || "default";
  const defaultCoverUrl = story.cover_image_url || "";
  
  let html = `<div class="wp-swatches" style="display:flex;gap:12px;margin-top:10px;overflow-x:auto;padding-bottom:6px">`;
  
  // 1. Default Cover
  html += `
    <button class="wp-swatch ${activeWp === 'default' ? 'active' : ''}" data-set-bg-url="default" aria-label="Story Cover" style="position:relative;flex:0 0 auto;width:72px;text-align:center;">
      <div class="wp-thumb" style="width:72px;height:96px;border-radius:8px;background-image:url('${defaultCoverUrl}');background-size:cover;background-position:center;border:2px solid ${activeWp === 'default' ? 'var(--accent)' : 'var(--border)'}"></div>
      <span class="nm" style="font-size:0.72rem;display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${activeWp === 'default' ? 'var(--accent)' : 'var(--text-dim)'}">Cover</span>
    </button>
  `;
  
  // 2. Wallpapers
  wallpapers.forEach((wp, idx) => {
    html += `
      <button class="wp-swatch ${activeWp === wp.image_url ? 'active' : ''}" data-set-bg-url="${wp.image_url}" aria-label="${wp.name || 'Wallpaper ' + (idx + 1)}" style="position:relative;flex:0 0 auto;width:72px;text-align:center;">
        <div class="wp-thumb" style="width:72px;height:96px;border-radius:8px;background-image:url('${wp.image_url}');background-size:cover;background-position:center;border:2px solid ${activeWp === wp.image_url ? 'var(--accent)' : 'var(--border)'}"></div>
        <span class="nm" style="font-size:0.72rem;display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${activeWp === wp.image_url ? 'var(--accent)' : 'var(--text-dim)'}">${wp.name || 'Wallpaper ' + (idx + 1)}</span>
      </button>
    `;
  });
  
  html += `</div>`;
  return html;
}

function sheetSettings(){
  const st=store.settings;
  const prefs = store.notificationPrefs || {};
  const browserState = ("Notification" in window) ? Notification.permission : "unsupported";
  const story = getActiveStory();

  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>Settings</h2><p class="sheet-sub">Theme &amp; reading comfort. Saved to this device.</p>
  <div class="set-group"><label>Site theme</label>${themeSwatches()}</div>
  <div class="set-group"><label>Reader lighting</label><div class="seg">${["aether","twilight","parchment"].map(t=>`<button class="${st.readerTheme===t?'active':''}" data-set-theme="${t}">${t[0].toUpperCase()+t.slice(1)}</button>`).join("")}</div></div>
  <div class="set-group"><label>Reading preset</label><div class="seg">${[["none","Default"],["focus","Focus"],["bedtime","Bedtime"],["dyslexia","Dyslexia"],["compact","Compact"]].map(([k,l])=>`<button class="${st.preset===k?'active':''}" data-set-preset="${k}">${l}</button>`).join("")}</div></div>
  
  <div class="set-group"><label>Background mode</label>
    <div class="seg">${[["story","Artwork"],["gradient","Ambient"],["solid","Solid"]].map(([k,l])=>`<button class="${st.bgMode===k?'active':''}" data-set-bg-mode="${k}">${l}</button>`).join("")}</div>
    ${st.bgMode === "story" && story ? wallpaperSwatches(story) : ""}
  </div>

  <div class="set-group"><label>Reader width</label>
    <div class="seg">${[[38,"Compact"],[46,"Medium"],[54,"Wide"],[62,"X-Wide"]].map(([k,l])=>`<button class="${st.readerWidth===k?'active':''}" data-set-width="${k}">${l}</button>`).join("")}</div>
  </div>

  <div class="set-group"><label>Font size <span class="faint" style="float:right">${Math.round(st.fontScale*100)}%</span></label><input type="range" class="range" min="0.8" max="1.4" step="0.05" value="${st.fontScale}" data-set-range="fontScale"></div>
  <div class="set-group"><label>Line height <span class="faint" style="float:right">${st.lineHeight.toFixed(2)}</span></label><input type="range" class="range" min="1.5" max="2.1" step="0.02" value="${st.lineHeight}" data-set-range="lineHeight"></div>
  <div class="set-group"><label>Comfort</label>
    ${toggleRow("showImages","Reader images","Inline figures in chapters",st.showImages)}
    ${toggleRow("showParaComments","Paragraph comments","Show comment chips on paragraphs",st.showParaComments)}
    ${toggleRow("showProgress","Progress bar","Show reading progress",st.showProgress)}
    ${toggleRow("showReactions","Chapter reactions","Show reaction buttons at chapter end",st.showReactions)}
    ${toggleRow("spoilerSafe","Spoiler safety","Hide titles/descriptions of unread chapters",st.spoilerSafe)}
    ${toggleRow("focusMode","Focus mode","Hide UI until you tap the page",st.focusMode)}
    ${toggleRow("bgBlur","Blur artwork background","Apply blur to background cover/wallpapers",st.bgBlur)}
    ${toggleRow("readerBg","Background image in reader","Keep background image visible in reading mode",st.readerBg)}
    ${toggleRow("appBackground","App background art","Use the site background image behind the shell",st.appBackground)}
  </div>
  <form data-notification-form class="set-group"><label>Chapter notifications</label>
    ${toggleRow("chapterNotifications","New chapter alerts","Create in-app notifications for chapters you can access",st.chapterNotifications)}
    ${toggleRow("emailNotifications","Email updates","Queue email updates for new chapters in your tiers",st.emailNotifications)}
    ${toggleRow("browserNotifications","Browser popups","Show browser notifications when this site is open",st.browserNotifications)}
    <div class="card" style="margin-top:10px"><div class="faint" style="font-size:.76rem;margin-bottom:8px">Browser permission: <b>${browserState}</b>. Email uses your account email and server-side queue.</div><button class="btn sm story" type="button" data-act="request-browser-notifications">${I.bell}Enable browser permission</button><button class="btn sm ghost" type="submit">${I.check}Save notification prefs</button></div>
  </form>`;
}
function toggleRow(key,title,sub,on){ return `<div class="toggle-row"><div class="lbl">${title}<small>${sub}</small></div><button class="switch ${on?'on':''}" data-toggle="${key}" aria-label="${title}"></button></div>`; }

function sheetPersona(){
  const P=persona();
  const active = activeEntitlements();
  const signedIn = !!authState.user;
  const avatar = profileAvatar();
  const status = P.admin ? "Admin reader override active" : signedIn ? (active.length ? `${active.length} active entitlement${active.length===1?"":"s"}` : "Signed in, no active member entitlement") : "Guest reader";
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>Account</h2>
  <div class="card tinted" style="margin-bottom:14px;display:flex;gap:12px;align-items:center"><span class="profile-avatar">${avatar?`<img src="${esc(avatar)}" alt="" style="width:100%;height:100%;object-fit:cover">`:I.user}</span><div style="flex:1;min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis">${esc(accountLabel())}</div><div class="faint" style="font-size:.76rem">${esc(P.tier || status)}</div></div>${signedIn?`<button class="btn sm ghost" data-sheet="profile">Edit</button><button class="btn sm ghost" data-act="reader-signout">Sign out</button>`:""}</div>
  <div class="quicklinks" style="margin-bottom:16px"><a data-nav="/vault">${I.vault}<span>Vault</span><small>Manage access</small></a><a data-nav="/notifications">${I.bell}<span>Notifications</span><small>Chapter alerts</small></a><a data-nav="/my-shelf">${I.shelf}<span>My Shelf</span><small>Your library</small></a><a data-sheet="settings">${I.aa}<span>Preferences</span><small>Reader</small></a>${isAdmin()?`<a href="writer.html"><span>${I.book}</span><span>Writer</span><small>Draft chapters</small></a><a href="admin.html"><span>${I.shield}</span><span>Admin CMS</span><small>Production controls</small></a>`:""}</div>
  ${signedIn?`<div class="card" style="margin-bottom:14px"><div class="eyebrow" style="margin-bottom:7px">Entitlements</div>${P.admin?`<div class="between" style="gap:10px;padding:6px 0"><span style="font-weight:600;font-size:.86rem">Admin reader override</span><span class="badge free">active</span></div><p class="faint" style="font-size:.78rem;margin:4px 0 0">This is not a paid/member entitlement; it is attached to your admin profile role.</p>`:active.length?active.map(e=>`<div class="between" style="gap:10px;padding:6px 0"><span style="font-weight:600;font-size:.86rem">${esc(e.tier_name || e.name || e.tier || "Reader access")}</span><span class="badge free">active</span></div>`).join(""):`<p class="faint" style="font-size:.8rem;margin:0">No active entitlement returned yet. Connect provider or redeem an access key.</p>`}</div>`:`<div class="card" style="margin-bottom:14px"><div class="eyebrow" style="margin-bottom:8px">Continue</div><div class="col-flex"><button class="btn story block" type="button" data-act="google-signin">${I.external}Continue with Google</button><div class="faint" style="font-size:.74rem;text-align:center">or use email</div><form data-auth-form="signin"><div class="col-flex"><input class="pill-input" name="email" type="email" autocomplete="email" placeholder="reader@example.com" style="text-align:left"><input class="pill-input" name="password" type="password" autocomplete="current-password" placeholder="Password" style="text-align:left"><div class="faint" data-auth-status style="font-size:.76rem;min-height:1em"></div><button class="btn ghost block" type="submit">${I.user}Sign in with email</button><button class="btn ghost block" type="button" data-act="show-signup">Create email account</button><button class="btn ghost block" type="button" data-act="show-forgot-password">Forgot password?</button></div></form></div></div>`}
  <div class="card" style="margin-top:8px"><div style="font-weight:600;font-size:.86rem">Need help?</div><div class="faint" style="font-size:.74rem;margin-top:4px">Open the Vault to manage access, reconnect Patreon, or redeem an access key.</div></div>`;
}
function sheetProfile(){
  if (!authState.user) return sheetPersona();
  const avatar = profileAvatar();
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>Edit profile</h2><p class="sheet-sub">Customize the name and avatar readers see on comments.</p>
  <form data-profile-form class="card profile-form-grid">
    <div style="display:flex;gap:12px;align-items:center"><span class="profile-avatar">${avatar?`<img src="${esc(avatar)}" alt="" style="width:100%;height:100%;object-fit:cover">`:I.user}</span><div class="faint" style="font-size:.78rem">Images upload to your private Reader folder path and are served by public URL.</div></div>
    <input class="pill-input" name="display_name" value="${esc(authState.profile?.display_name || "")}" placeholder="Display name" autocomplete="name" style="text-align:left">
    <input class="pill-input" name="username" value="${esc(authState.profile?.username || "")}" placeholder="username" autocomplete="username" style="text-align:left">
    <input name="avatar" type="file" accept="image/png,image/jpeg,image/gif,image/webp">
    <input class="pill-input" name="avatar_url" value="${esc(authState.profile?.avatar_url || "")}" placeholder="Or paste image URL" style="text-align:left">
    <div class="faint" data-profile-status style="font-size:.76rem;min-height:1em"></div>
    <button class="btn story block" type="submit">${I.check}Save profile</button>
  </form>`;
}
function sheetWhatsNew(){
  return `<span class="close-x" data-act="dismiss-whats-new">${I.x}</span><h2>What's new</h2><p class="sheet-sub">Reader upgrades are live on your account.</p>
  <div class="whats-new-list">
    <div class="whats-new-item"><span class="icn">${I.bell}</span><div><b>Chapter notifications</b><p class="faint" style="font-size:.78rem;margin:.2rem 0 0">New chapters now create relevant in-app alerts, browser popups when enabled, and email queue entries for your access tier.</p><button class="btn sm ghost" data-sheet="settings">Open notification settings</button></div></div>
    <div class="whats-new-item"><span class="icn">${I.user}</span><div><b>Profile customization</b><p class="faint" style="font-size:.78rem;margin:.2rem 0 0">Add an avatar, display name, and username for comments and account surfaces.</p><button class="btn sm ghost" data-sheet="profile">Edit profile</button></div></div>
    <div class="whats-new-item"><span class="icn">${I.spark}</span><div><b>Site background art</b><p class="faint" style="font-size:.78rem;margin:.2rem 0 0">The app shell can now use the configured reader background image.</p><button class="btn sm ghost" data-sheet="settings">Background toggle</button></div></div>
  </div>
  <button class="btn story block" data-act="dismiss-whats-new">${I.check}Got it</button>`;
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
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>Activate with Patreon</h2><p class="sheet-sub">Patreon verifies membership; your reader account keeps access, keys, progress, and provider links together.</p>
  <div class="card" style="margin-bottom:14px"><div class="between"><div><div style="font-weight:600">One smooth flow</div><div class="faint" style="font-size:.78rem">${authState.user?"We will send you to Patreon, then sync your tier back here.":"Continue with Google first, then we will automatically send you to Patreon to activate access."}</div></div>${I.vault}</div></div>
  <div class="col-flex" style="gap:9px">${authState.user?`<button class="btn story block" data-act="connect-patreon-go">${I.vault}Continue with Patreon</button>`:`<button class="btn story block" data-act="google-then-patreon">${I.external}Continue with Google, then Patreon</button><button class="btn ghost block" data-sheet="persona">${I.user}Use email instead</button>`}<button class="btn ghost block" data-sheet="redeem">${I.key}I have a key instead</button><a class="btn ghost block" data-nav="/support/wrong-account">${I.user}Wrong account?</a></div>`;
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
  const signedIn = !!authState.user;
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><h2>Paragraph note</h2><div class="sheet-sub">${list.length} note${list.length===1?'':'s'} on this paragraph</div>
  <div style="margin-bottom:14px">${list.map(commentHTML).join("")||`<p class="faint" style="font-size:.82rem">No notes yet.</p>`}</div>
  ${signedIn?`<form data-para-form="${chId}" data-para-index="${p}"><div class="col-flex"><div class="faint" style="font-size:.74rem">Posting as <b>${esc(accountLabel())}</b></div><input name="text" placeholder="Add a note on this paragraph…" required><button class="btn sm story" type="submit">${I.msg}Post</button></div></form>`:`<div class="card"><p class="faint" style="font-size:.82rem;margin:0 0 10px">Sign in to add paragraph notes.</p><button class="btn sm story" data-sheet="persona">${I.user}Sign in</button></div>`}`;
}
function sheetImage(fig, cap){
  return `<span class="close-x" data-act="close-sheet">${I.x}</span><div style="border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)">${D.FIG[fig]||""}</div><p class="muted center" style="font-size:.82rem;margin-top:10px;font-style:italic">${cap||""}</p>`;
}
