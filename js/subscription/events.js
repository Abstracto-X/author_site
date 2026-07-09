/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ ACTIONS ============ */
function toggleFollow(id){ const i=store.followed.indexOf(id); if(i>=0) store.followed.splice(i,1); else store.followed.push(id); saveStore(); toast(store.followed.includes(id)?"Following":"Unfollowed", null, {icon: store.followed.includes(id)?'checkCirc':'bell'}); render(); }
async function setReaction(chId,k){
  if (!authState.user){ openSheet(sheetPersona); toast("Sign in to react", "Reactions are synced to your reader profile.", {icon:"user", ms:3500}); return; }
  try {
    await saveChapterReaction(chId, k);
    renderReaderOnly();
  } catch (err) {
    toast("Reaction not saved", err.message || "Please try again.", {icon:"alert", kind:"bad"});
  }
}
function toggleBookmark(){ const f=currentChapter; if(!f) return; const id=f.ch.id; const i=store.bookmarks.findIndex(b=>b.chapterId===id); if(i>=0){ store.bookmarks.splice(i,1); toast("Bookmark removed"); } else { store.bookmarks.unshift({chapterId:id, storyId:f.story.id, label:"A passage in "+f.ch.title, when:"just now"}); toast("Bookmarked", f.ch.title, {icon:'bookmarkFill'}); } saveStore(); updateReaderBar(); }
function toggleMarkRead(){ const f=currentChapter; if(!f) return; const id=f.ch.id; store.readMarked[id]=!store.readMarked[id]; saveStore(); if(store.readMarked[id]){ const exists=store.history.find(h=>h.chapterId===id&&h.kind==='completed'); if(!exists) store.history.unshift({chapterId:id, storyId:f.story.id, title:f.ch.title, when:"just now", kind:"completed"}); saveStore(); toast("Marked as read"); } updateReaderBar(); }
function saveQuote(){ const sel=window.getSelection(); const text=sel?sel.toString().trim():""; if(text.length<4){ toast("Select some text first","Highlight a line in the chapter, then save.",{kind:"bad",icon:"quote",ms:3000}); return; } const f=currentChapter; store.quotes.unshift({id:"q"+now(), chapterId:f.ch.id, story:f.story.id, text, when:"just now"}); saveStore(); sel.removeAllRanges(); toast("Quote saved", text.slice(0,50)+(text.length>50?"…":""), {icon:"quoteFill" in I?"quote":"quote"}); }
function rememberReturn(){ if(currentChapter) store.pendingReturn=currentChapter.ch.id; saveStore(); }
async function connectPatreonGo(){
  if (!authState.user){ if (googleEnabled()) await signInWithGoogle("connect-patreon"); else openSheet(sheetPersona); return; }
  try {
    const btnMsg = "Starting Provider connection";
    toast(btnMsg, "Redirecting through secure OAuth...", {icon:"sync", ms:3000});
    store.providerPending = true;
    saveStore();
    await requestPatreonOAuth();
  } catch (err) {
    store.providerPending = false;
    saveStore();
    toast("Patreon not ready", err.message || "The OAuth Edge Function needs configuration.", {icon:"alert", kind:"bad", ms:6500});
    render();
  }
}
async function redeemKey(code){
  if (!accessKeysEnabled()) return false;
  code=(code||"").trim().toUpperCase();
  const err=document.getElementById("key-error");
  if(!code){ if(err)err.textContent=""; return false; }
  if(!authState.user){ if(err){err.style.color="var(--bad)";err.textContent="Sign in before redeeming a key.";} openSheet(sheetPersona); return false; }
  const client = getSupabase();
  if (client) {
    try {
      if(err){err.style.color="var(--text-dim)";err.textContent="Redeeming against Supabase...";}
      const { error } = await client.rpc("redeem_access_key", { submitted_code: code });
      if (error) throw error;
      await refreshEntitlements();
      const ret=store.pendingReturn;
      closeSheet();
      toast("Access key redeemed", "Your entitlements have been refreshed.", {icon:"key", ms:5500, action: ret?{act:"return:"+ret, label:"Return to chapter"}:null});
      render();
      return true;
    } catch (rpcErr) {
      if(err){err.style.color="var(--warn)";err.textContent=rpcErr.message || "Backend key redemption is not available yet.";}
      return false;
    }
  }
  if(err){err.style.color="var(--bad)";err.textContent="Supabase is unavailable; key redemption cannot run.";}
  return false;
}
function copyText(t){ try{ navigator.clipboard&&navigator.clipboard.writeText(t); }catch(e){ const ta=document.createElement("textarea"); ta.value=t; document.body.appendChild(ta); ta.select(); try{document.execCommand("copy");}catch(_){} ta.remove(); } toast("Copied to clipboard"); }

/* ============ reader-only re-render (keep scroll) ============ */
function renderReaderOnly(){ if(route.name!=="read"||!currentChapter) return;
  const v=VIEWS.read(); const tmp=document.createElement("div"); tmp.innerHTML=v;
  const newReader=tmp.querySelector("#reader"); const cur=document.getElementById("reader");
  if(newReader&&cur){ cur.className=newReader.className; cur.style.cssText=newReader.style.cssText; }
  const newStage=tmp.querySelector("#rstage"); const stage=document.getElementById("rstage");
  if(newStage&&stage) stage.innerHTML=newStage.innerHTML;
  const prog=document.getElementById("rprog"); if(prog) prog.style.display=store.settings.showProgress?"":"none";
  updateReaderBar();
}
function updateReaderBar(){ const bar=document.getElementById("rbar"); if(!bar) return; const f=currentChapter; const bk=store.bookmarks.find(b=>b.chapterId===f.ch.id); const btns=bar.querySelectorAll("button"); if(btns[3]) btns[3].innerHTML=bk?I.bookmarkFill:I.bookmark, btns[3].classList.toggle("active",!!bk); }

/* ============ after-render hooks ============ */
let lastScroll=0;
function afterRender(){
  const isReader = route.name==="read";
  if (typeof applyBgSettings === "function") applyBgSettings();
  if (!isReader){
    // home search etc handled globally
  }
  if (isReader){ setupReader(); }
  if (window.ReaderGuides && typeof window.ReaderGuides.afterRender === "function") window.ReaderGuides.afterRender();
  maybeShowWhatsNew();
}
function setupReader(){
  const stage=document.getElementById("rstage");
  const top=document.getElementById("rtop");
  const prog=document.getElementById("rprog");
  const settings=store.settings;
  if(!settings.showProgress && prog) prog.style.display="none";
  // record read open in history
  if(currentChapter){ const id=currentChapter.ch.id; const exists=store.history.find(h=>h.chapterId===id); if(!exists){ store.history.unshift({chapterId:id, storyId:currentChapter.story.id, title:currentChapter.ch.title, when:"just now", kind: chapterResolved(currentChapter.ch).state==="preview"?"preview":"read"}); store.history=store.history.slice(0,12); saveStore(); } }
  // progress + autohide top
  function onScroll(){
    const sc=window.scrollY; const max=document.body.scrollHeight-window.innerHeight; const pct=max>0?Math.min(100,sc/max*100):0;
    if(prog) prog.style.width=pct+"%";
    if(top){ if(sc>lastScroll+8 && sc>120){ top.classList.add("hidden"); } else if(sc<lastScroll-8){ top.classList.remove("hidden"); } }
    lastScroll=sc;
    // save progress at ~ every change of 5%
    if(currentChapter && Math.abs(pct-(store.progress[currentChapter.ch.id]?.pct||0))>4){ store.progress[currentChapter.ch.id]={pct:Math.round(pct), scene: currentChapter.ch.title, storyId:currentChapter.story.id, updatedAt:now()}; saveStore(); }
  }
  window.removeEventListener("scroll", readerScrollHandler);
  readerScrollHandler=onScroll;
  window.addEventListener("scroll", onScroll, {passive:true});
  onScroll();
  // tap zones
  if(stage && !stage.dataset.wired){ stage.dataset.wired="1"; stage.addEventListener("click",(e)=>{
    if(e.target.closest("button,a,figure,.pchip,.react,input,textarea,.cmt-form")) return;
    if(settings.focusMode){ document.getElementById("reader").classList.toggle("ui-on"); return; }
    top&&top.classList.toggle("hidden");
  }); }
}
let readerScrollHandler=null;
function goReaderChapter(dir){
  if(!currentChapter) return; const f=currentChapter; const idx=f.story.chapters.indexOf(f.ch); const nxt=f.story.chapters[idx+dir]; if(!nxt){ toast(dir>0?"You're at the latest chapter":"You're at the first chapter",null,{kind:"bad",icon:"alert",ms:2200}); return; }
  const r=chapterResolved(nxt);
  if(isReadable(r)){ nav("/read/"+nxt.id); } else if(r.state==="preview"){ nav("/read/"+nxt.id); } else { rememberReturn(); openSheet(()=>sheetLock(nxt.id)); }
}

/* ============ global listeners ============ */
function handleAttr(el, name, val){
  // returns true if handled
}
function delegate(){
  document.addEventListener("click",(e)=>{
    const t=e.target.closest("[data-nav],[data-read],[data-preview],[data-lock],[data-sheet],[data-follow],[data-react],[data-persona],[data-toggle],[data-filter],[data-act],[data-toast-action],[data-dismiss],[data-fig],[data-para],[data-copy],[data-set-theme],[data-set-preset],[data-shelf-view],[data-quote-card],[data-site-theme],[data-studio-state],[data-set-bg-mode],[data-set-bg-url],[data-set-width]");
    if(!t) return;
    if (t.dataset.siteTheme!=null){ setTheme(t.dataset.siteTheme); openSheet(currentSheet?currentSheet.builder:sheetSettings, currentSheet?currentSheet.opts:null); toast("Theme: "+(THEMES.find(x=>x.id===t.dataset.siteTheme)?.name), null, {icon:"palette"}); return; }
    if (t.dataset.studioState!=null){ const p=t.closest(".state-pills"); if(p) p.querySelectorAll(".state-pill").forEach(b=>b.classList.remove("active")); t.classList.add("active"); toast("Access state set", "Chapter will be "+t.textContent.trim()+" on publish.", {icon:"lock"}); return; }
    if (t.dataset.nav!=null){ e.preventDefault(); nav(t.dataset.nav); return; }
    if (t.dataset.read!=null){ e.preventDefault(); nav("/read/"+t.dataset.read); return; }
    if (t.dataset.preview!=null){ e.preventDefault(); nav("/read/"+t.dataset.preview); return; }
    if (t.dataset.lock!=null){ e.preventDefault(); rememberReturn(); openSheet(()=>sheetLock(t.dataset.lock)); return; }
    if (t.dataset.sheet!=null){ e.preventDefault(); const sh=t.dataset.sheet; const builders={settings:sheetSettings,persona:sheetPersona,profile:sheetProfile,"whats-new":sheetWhatsNew,signup:sheetSignup,"forgot-password":sheetForgotPassword,"update-password":sheetUpdatePassword,redeem:sheetRedeem,"connect-patreon":sheetConnectPatreon,context:sheetContext}; if(sh==="context"&&!currentChapter){ toast("Open a chapter first",null,{kind:"bad",icon:"alert"}); return; } openSheet(builders[sh]||sheetSettings); return; }
    if (t.dataset.follow!=null){ toggleFollow(t.dataset.follow); return; }
    if (t.dataset.react!=null){ if(currentChapter) setReaction(currentChapter.ch.id, t.dataset.react); return; }
    if (t.dataset.persona!=null){ store.personaId=t.dataset.persona; saveStore(); closeSheet(); toast("Viewing as "+(D.PERSONAS.find(p=>p.id===t.dataset.persona)?.label),null,{icon:"user"}); render(); return; }
    if (t.dataset.filter!=null){ const k=t.dataset.filter; const i=store.filters.chips.indexOf(k); if(i>=0) store.filters.chips.splice(i,1); else store.filters.chips.push(k); saveStore(); renderHeaderless(); return; }
    if (t.dataset.toggle!=null){ store.settings[t.dataset.toggle]=!store.settings[t.dataset.toggle]; saveStore(); if(t.dataset.toggle==="appBackground" && typeof applyAppBackground==="function") applyAppBackground(); if(typeof applyBgSettings==="function") applyBgSettings(); if(currentSheet){ openSheet(currentSheet.builder, currentSheet.opts); } if(route.name==="read") renderReaderOnly(); return; }
    if (t.dataset.shelfView!=null){ store.filters.shelfView=t.dataset.shelfView; saveStore(); render(); return; }
    if (t.dataset.chapterSort!=null){ store.filters.chapterSort=t.dataset.chapterSort; saveStore(); render(); return; }
    if (t.dataset.setTheme!=null){ store.settings.readerTheme=t.dataset.setTheme; saveStore(); openSheet(currentSheet.builder,currentSheet.opts); renderReaderOnly(); return; }
    if (t.dataset.setPreset!=null){ store.settings.preset=t.dataset.setPreset; if(t.dataset.setPreset==="dyslexia"){/*keep*/} saveStore(); openSheet(currentSheet.builder,currentSheet.opts); renderReaderOnly(); return; }
    if (t.dataset.setBgMode!=null){ store.settings.bgMode=t.dataset.setBgMode; saveStore(); if(typeof applyBgSettings==="function") applyBgSettings(); if(currentSheet){ openSheet(currentSheet.builder, currentSheet.opts); } if(route.name==="read") renderReaderOnly(); return; }
    if (t.dataset.setBgUrl!=null){ store.settings.bgImageUrl=t.dataset.setBgUrl; saveStore(); if(typeof applyBgSettings==="function") applyBgSettings(); if(currentSheet){ openSheet(currentSheet.builder, currentSheet.opts); } if(route.name==="read") renderReaderOnly(); return; }
    if (t.dataset.setWidth!=null){ store.settings.readerWidth=parseInt(t.dataset.setWidth); saveStore(); if(typeof applyBgSettings==="function") applyBgSettings(); if(currentSheet){ openSheet(currentSheet.builder, currentSheet.opts); } if(route.name==="read") renderReaderOnly(); return; }
    if (t.dataset.fig!=null){ openSheet(()=>sheetImage(t.dataset.fig, t.closest("figure")?.querySelector("figcaption")?.textContent)); return; }
    if (t.dataset.para!=null && currentChapter){ openSheet(()=>sheetParaComments(currentChapter.ch.id, parseInt(t.dataset.para))); return; }
    if (t.dataset.copy!=null){ copyText(t.dataset.copy); return; }
    if (t.dataset.quoteCard!=null){ toast("Quote card ready","Copied as a shareable card.",{icon:"spark"}); return; }
    if (t.dataset.dismiss!=null){ dismissReaderNotification(t.dataset.dismiss).finally(()=>render()); return; }
    if (t.dataset.toastAction!=null){ const a=t.dataset.toastAction; if(a.startsWith("return:")){ store.pendingReturn=null; saveStore(); nav("/read/"+a.split(":")[1]); } return; }
    if (t.dataset.act!=null){ e.preventDefault(); e.stopPropagation(); handleAct(t.dataset.act, t); return; }
  });
  document.addEventListener("input",(e)=>{
    const t=e.target;
    if(t.id==="lib-search"){ store.filters.q=t.value; renderHeaderless(); return; }
    if(t.dataset && t.dataset.setRange){ store.settings[t.dataset.setRange]=parseFloat(t.value); saveStore(); const lbl=t.closest(".set-group")?.querySelector("label .faint"); if(lbl){ lbl.textContent = t.dataset.setRange==="fontScale"? Math.round(t.value*100)+"%" : parseFloat(t.value).toFixed(2); } renderReaderOnly(); }
  });
  document.addEventListener("submit", async (e)=>{
    const f=e.target;
    if(f.dataset.cmtForm!=null){
      e.preventDefault();
      if(!authState.user){ openSheet(sheetPersona); return; }
      const text=f.querySelector("[name=text]").value.trim();
      if(!text) return;
      const chId=f.dataset.cmtForm;
      try { await postChapterComment(chId, text, null); renderReaderOnly(); toast("Note posted",null,{icon:"msg"}); }
      catch(err){ toast("Note not posted", err.message || "Please try again.", {icon:"alert", kind:"bad"}); }
      return;
    }
    if(f.dataset.paraForm!=null){
      e.preventDefault();
      if(!authState.user){ closeSheet(); openSheet(sheetPersona); return; }
      const text=f.querySelector("[name=text]").value.trim();
      if(!text) return;
      const chId=f.dataset.paraForm; const p=parseInt(f.dataset.paraIndex);
      try { await postChapterComment(chId, text, p); closeSheet(); renderReaderOnly(); toast("Paragraph note added",null,{icon:"msg"}); }
      catch(err){ toast("Note not posted", err.message || "Please try again.", {icon:"alert", kind:"bad"}); }
      return;
    }
    if(f.dataset.redeemForm!=null){ e.preventDefault(); const v=f.querySelector("[name=key]").value; const ok=await redeemKey(v); if(ok===false){ /* error shown */ } return; }

    if(f.dataset.profileForm!=null){
      e.preventDefault();
      const status=f.querySelector("[data-profile-status]");
      try {
        if(status){ status.style.color="var(--text-dim)"; status.textContent="Saving profile..."; }
        await updateReaderProfile({
          displayName: f.querySelector("[name=display_name]")?.value || "",
          username: f.querySelector("[name=username]")?.value || "",
          avatarFile: f.querySelector("[name=avatar]")?.files?.[0] || null,
          avatarUrl: f.querySelector("[name=avatar_url]")?.value || ""
        });
        if(status){ status.style.color="var(--good)"; status.textContent="Profile saved."; }
        toast("Profile saved", "Your reader profile has been updated.", {icon:"checkCirc"});
        setTimeout(()=>openSheet(sheetPersona), 650);
      } catch (err) {
        if(status){ status.style.color="var(--bad)"; status.textContent=err.message || "Profile save failed."; }
      }
      return;
    }

    if(f.dataset.notificationForm!=null){
      e.preventDefault();
      if(!authState.user){ openSheet(sheetPersona); return; }
      try {
        await saveNotificationPreferences({
          browser_enabled: !!store.settings.browserNotifications,
          email_enabled: !!store.settings.emailNotifications,
          new_chapters_enabled: store.settings.chapterNotifications !== false,
          minimum_tier_rank: 0
        });
        toast("Notification preferences saved", "New chapter alerts now follow these settings.", {icon:"bell"});
        openSheet(sheetSettings);
      } catch (err) {
        toast("Preferences not saved", err.message || "Try again.", {icon:"alert", kind:"bad"});
      }
      return;
    }

    if(f.dataset.authForm!=null){
      e.preventDefault();
      const status=f.querySelector("[data-auth-status]");
      const email=(f.querySelector("[name=email]")?.value||"").trim();
      const password=f.querySelector("[name=password]")?.value||"";
      if(f.dataset.authForm==="recover" && !email){ if(status){ status.style.color="var(--bad)"; status.textContent="Email is required."; } return; }
      if(f.dataset.authForm==="update" && !password){ if(status){ status.style.color="var(--bad)"; status.textContent="New password is required."; } return; }
      if(f.dataset.authForm!=="recover" && f.dataset.authForm!=="update" && (!email || !password)){ if(status){ status.style.color="var(--bad)"; status.textContent="Email and password are required."; } return; }
      try {
        if(status){
          status.style.color="var(--text-dim)";
          status.textContent=f.dataset.authForm==="signup"?"Creating account...":f.dataset.authForm==="recover"?"Sending reset link...":f.dataset.authForm==="update"?"Updating password...":"Signing in...";
        }
        if(f.dataset.authForm==="signup") await signUpWithPassword(email, password);
        else if(f.dataset.authForm==="recover") {
          await sendPasswordReset(email);
          if(status){ status.style.color="var(--good)"; status.textContent="Reset email sent. Check your inbox."; }
          toast("Reset email sent", "Check your inbox for the secure password link.", {icon:"mail", ms:5500});
          return;
        } else if(f.dataset.authForm==="update") {
          await updateReaderPassword(password);
          if(status){ status.style.color="var(--good)"; status.textContent="Password updated. You can continue reading."; }
          toast("Password updated", "You can continue reading.", {icon:"checkCirc", ms:4500});
          setTimeout(()=>{ closeSheet(); render(); }, 1200);
          return;
        } else await signInWithPassword(email, password);
        closeSheet();
        toast(f.dataset.authForm==="signup"?"Account created":"Signed in", "Reader account is connected.", {icon:"checkCirc", ms:4500});
        render();
      } catch (err) {
        if(status){ status.style.color="var(--bad)"; status.textContent=err.message || "Authentication failed."; }
      }
      return;
    }
    if(f.dataset.contactForm!=null){ e.preventDefault(); f.reset(); toast("Support message sent","We'll reply by email.",{icon:"mail",ms:5000}); return; }
  });
  // selection for quote saving
  document.addEventListener("mouseup",()=>{ if(route.name!=="read") return; const sel=window.getSelection(); const text=sel?sel.toString().trim():""; const prose=document.getElementById("prose"); if(text.length>3 && prose && prose.contains(sel.anchorNode)){ ensureQuoteFab(true); } else { ensureQuoteFab(false); } });
  document.addEventListener("touchend",()=>{ if(route.name!=="read") return; setTimeout(()=>{ const sel=window.getSelection(); const text=sel?sel.toString().trim():""; ensureQuoteFab(text.length>3); },250); });
}
function renderHeaderless(){ // re-render only main for library search without losing focus
  const main=document.getElementById("main"); const view=VIEWS[route.name]||VIEWS.home; const html=view(); const inp=document.activeElement; const caret=inp&&inp.id==="lib-search"? inp.selectionStart : null; main.innerHTML=`<div class="vt">${html}</div>`; afterRender(); const newInp=document.getElementById("lib-search"); if(newInp&&caret!=null){ newInp.focus(); newInp.setSelectionRange(caret,caret); } }
let quoteFab=null;
function ensureQuoteFab(show){ if(show){ if(quoteFab) return; quoteFab=document.createElement("button"); quoteFab.className="btn story sm"; quoteFab.style.cssText="position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--nav-h)+70px + env(safe-area-inset-bottom));z-index:75;box-shadow:var(--shadow-lg)"; quoteFab.innerHTML=I.quote+"Save quote"; quoteFab.onclick=()=>{ saveQuote(); ensureQuoteFab(false); }; document.body.appendChild(quoteFab); requestAnimationFrame(()=>quoteFab.style.opacity="1"); } else if(quoteFab){ quoteFab.remove(); quoteFab=null; } }

function handleAct(act, el){
  switch(act){
    case "close-sheet": closeSheet(); break;
    case "clear-filters": store.filters={q:"",chips:[]}; saveStore(); render(); break;
    case "toggle": { /* handled by data-toggle */ break; }
    case "connect-patreon-go": connectPatreonGo(); break;
    case "google-signin": signInWithGoogle().catch(err=>toast("Google sign-in failed", err.message || "Unable to start Google OAuth.", {icon:"alert", kind:"bad"})); break;
    case "google-then-patreon": signInWithGoogle("connect-patreon").catch(err=>toast("Google sign-in failed", err.message || "Unable to start Google OAuth.", {icon:"alert", kind:"bad"})); break;
    case "show-signup": openSheet(sheetSignup); break;
    case "show-forgot-password": openSheet(sheetForgotPassword); break;
    case "reader-signout": signOutReader().then(()=>{ closeSheet(); toast("Signed out", null, {icon:"user"}); render(); }).catch(err=>toast("Sign out failed", err.message, {icon:"alert", kind:"bad"})); break;
    case "request-browser-notifications": requestBrowserNotifications().then(()=>saveNotificationPreferences({ browser_enabled:true, email_enabled:store.settings.emailNotifications !== false, new_chapters_enabled:store.settings.chapterNotifications !== false, minimum_tier_rank:0 }).catch(()=>null)).then(()=>{ toast("Browser notifications enabled", "We can show chapter alerts while the site is open.", {icon:"bell"}); openSheet(sheetSettings); }).catch(err=>toast("Notifications blocked", err.message || "Permission was not granted.", {icon:"alert", kind:"bad"})); break;
    case "resync": syncProviderEntitlements().then((data)=>{ const grants = Number(data?.grants || 0); toast("Sync complete", grants ? `${grants} Patreon entitlement${grants===1?"":"s"} active.` : "Patreon linked, but no mapped tier was found.", {icon:"checkCirc", ms:4000}); render(); }).catch(err=>toast("Sync failed", err.message || "Unable to refresh provider entitlements.", {icon:"alert", kind:"bad"})); break;
    case "expected-access": rememberReturn(); openSheet(sheetContext?sheetContext:()=>sheetLock(currentChapter?.ch.id)); break;
    case "reader-prev": goReaderChapter(-1); break;
    case "reader-next": goReaderChapter(1); break;
    case "reader-bookmark": toggleBookmark(); break;
    case "reader-markread": toggleMarkRead(); break;
    case "reader-savequote": saveQuote(); break;
    case "reader-comments": { const c=document.getElementById("cmtblock"); if(c){ c.scrollIntoView({behavior:"smooth"}); } break; }
    case "offline-queue": toast("Offline reading unavailable","This site currently streams chapters after access is verified.",{icon:"download",ms:4000}); break;
    case "extra-open": toast("Opening bonus material","Author note · reader format.",{icon:"spark"}); break;
    case "main-archive": if (mainArchiveEnabled()) window.open(MAIN_ARCHIVE_URL, "_blank", "noopener"); break;
    case "external-discord": toast("Community link unavailable","No community link is configured for this site.",{icon:"msg"}); break;
    case "mark-all-read": { const ids=store.notifs.filter(n=>!n.read).map(n=>n.id).filter(Boolean); store.notifs.forEach(n=>n.read=true); saveStore(); markReaderNotificationsRead(ids).catch(()=>{}); render(); break; }
    case "notif-prefs": openSheet(sheetSettings); break;
    case "dismiss-whats-new": dismissWhatsNew(); closeSheet(); break;
    case "studio-publish": toast("Published","Chapter is live for readers with access.",{icon:"checkCirc",ms:4000}); break;
    case "studio-save-draft": toast("Draft saved","Auto-saved to your drafts.",{icon:"book"}); break;
    case "studio-schedule": toast("Scheduled","Post queued for its release time.",{icon:"calendar"}); break;
    case "studio-new-chapter": case "studio-new-post": case "studio-new-campaign": case "studio-upload": toast("Open Admin CMS","Use the admin CMS for production publishing.",{icon:"plus"}); break;
    case "studio-edit": toast("Open Admin CMS","Use the admin CMS to edit production content.",{icon:"cog"}); break;
    case "studio-preview": toast("Preview","Showing how readers will see this chapter.",{icon:"eye"}); break;
    case "studio-grant": toast("Manual grant","Access granted to this reader.",{icon:"gift"}); break;
    case "studio-approve": toast("Comment approved","Now visible to readers.",{icon:"check"}); render(); break;
    case "studio-hide": toast("Comment hidden","Removed from reader view.",{icon:"x",kind:"bad"}); render(); break;
    case "studio-media-open": toast("Open Admin CMS","Manage media in the admin CMS.",{icon:"spark"}); break;
    case "studio-post": toast("Post unavailable","No reader post is linked here.",{icon:"msg"}); break;
    default: break;
  }
}
const WHATS_NEW_VERSION = "2026-07-07-reader-notifications-profile-background";
let whatsNewShownThisRender = false;
function whatsNewKey(){ return `ea-whats-new:${WHATS_NEW_VERSION}:${authState.user?.id || "anon"}`; }
function maybeShowWhatsNew(){
  if (whatsNewShownThisRender || !authState.user || currentSheet) return;
  if (LS.getItem(whatsNewKey()) === "seen") return;
  whatsNewShownThisRender = true;
  setTimeout(()=>{ if(authState.user && !currentSheet) openSheet(sheetWhatsNew); }, 500);
}
function dismissWhatsNew(){ LS.setItem(whatsNewKey(), "seen"); }
