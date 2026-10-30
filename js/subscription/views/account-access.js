/* Extracted from js/subscription/aether-app.js. Classic browser script; keep script order in index.html. */
"use strict";

/* ============ UPDATES FEED ============ */
VIEWS.updates = function(){
  const groups={};
  D.UPDATES.forEach(u=>{ (groups[u.when]=groups[u.when]||[]).push(u); });
  const rendered = Object.entries(groups).map(([g,items])=>`<section class="section"><div class="section-head"><h2>${esc(g)}</h2></div><div class="rh-chapter-grid rh-updates-grid">${items.map(curatedUpdateCard).join("")}</div></section>`).join("");
  return `<div class="reader-workspace updates-page">
    ${readerPageHeading("Updates","Everything new across the archive, access-aware.",`<a class="btn ghost" href="#/library" data-nav="/library">Browse library ${I.chevR}</a>`)}
    ${rendered || readerEmptyState("feed","No updates yet","New chapter and access updates will appear here when they are posted.")}
  </div>`;
};

function curatedUpdateCard(update,index){
  const found=update.chapter?byId(update.chapter):null;
  if (!found?.ch) return updateRow(update);
  return homeReferenceChapterCard({chapter:found.ch},index,{storyTitle:found.story.title,note:update.note});
}

/* ============ CALENDAR ============ */
VIEWS.calendar = function(){
  return `<div class="reader-workspace">
    ${readerPageHeading("Release Calendar","Upcoming public and member releases.",`<a class="btn ghost" href="#/updates" data-nav="/updates">Latest updates ${I.chevR}</a>`)}
    ${readerEmptyState("calendar","No calendar entries","A release calendar is not available. Find published chapters in Updates.",`<a class="btn story" href="#/updates" data-nav="/updates">${I.feed}Open Updates</a>`)}
  </div>`;
};

/* ============ COLLECTIONS ============ */
VIEWS.collection = VIEWS.collections = function(){
  return `<div class="reader-workspace">
    ${readerPageHeading("Collections","Curated story groups.",`<a class="btn ghost" href="#/library" data-nav="/library">Open Library ${I.chevR}</a>`)}
    ${readerEmptyState("layers","No collections","Collections are not available. Browse the Library for all published stories.",`<button class="btn story" data-nav="/library">${I.library}Open Library</button>`)}
  </div>`;
};

/* ============ VAULT ============ */
function readerAccessSummary(P=persona()){
  const state=P.admin?"admin":!P.signedIn?"guest":P.expired?"expired":P.pending?"pending":P.level>0?"active":"none";
  const labels={admin:"Admin access",guest:"Guest reader",expired:"Access expired",pending:"Checking access",active:"Membership active",none:"Free reader"};
  return {state,label:labels[state]};
}
function providerVerificationText(provider){
  const check=providerAccessStatus(provider);
  if(check?.state==="checking") return "Checking membership…";
  if(check?.state==="reconnect") return "Reconnect to verify your membership.";
  if(check?.state==="unavailable") return "Verification is unavailable. We will retry automatically.";
  const stamp=providerConnection(provider)?.last_synced_at;
  const date=stamp?new Date(stamp):null;
  return date && Number.isFinite(date.getTime()) ? "Last checked "+date.toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}) : "No verification time available.";
}
VIEWS.vault = function(){
  const P=persona(), access=readerAccessSummary(P);
  const readable=countReadable();
  const locked=D.STORIES.reduce((n,s)=>n+s.chapters.filter(c=>!isReadable(chapterResolved(c))&&c.state!=="unavailable").length,0);
  const story=D.STORIES.find(s=>s.slug===D.PRIMARY_SLUG)||D.STORIES[0];
  const cover=story?homeSafeMediaUrl(story.cover_image_url||story.cover):"";
  const title=P.admin?"The archive is yours to explore." : P.level>0 ? (P.tier||"Member access") : P.pending ? "Finding your membership." : "There is more to the story.";
  const description=P.admin?"Your admin profile can read all published chapters. This is separate from a paid membership."
    : P.level>0 ? "Your membership is connected. Explore the chapters available to you, or manage your connections here."
    : P.pending?"Your provider is being checked. Your chapter access will update when verification finishes."
    : P.expired?"Your previous access has ended. Reconnect your membership to check whether it has renewed."
    : P.signedIn?"Read free chapters now. Connect a membership or use an access key to unlock more."
    : "Free chapters are open to everyone. Sign in to connect your membership or redeem an access key.";
  const providers=[["Patreon","patreon",patreonEnabled()],["Boosty via Discord","boosty_discord",boostyDiscordEnabled()]].filter(x=>x[2]);
  return `<div class="reader-workspace vault-page">
    ${readerPageHeading("The Vault","Your reading access, in one place.",`<a class="btn ghost" href="#/library" data-nav="/library">Explore the library ${I.chevR}</a>`)}
    <div class="vault-layout">
      <section class="vault-membership" aria-labelledby="vault-membership-title">
        <div class="vault-membership-body"><span class="reader-status" data-state="${access.state}">${access.state==='active'||access.state==='admin'?I.checkCirc:I.book}${esc(access.label)}</span>
          <h2 id="vault-membership-title">${esc(title)}</h2><p>${esc(description)}</p>
          ${P.signedIn?`<button class="btn ghost" data-sheet="persona">${I.user}Your account</button>`:`<button class="btn primary" data-sheet="persona">${I.user}Sign in to connect</button>`}
        </div>
        ${cover?`<figure class="vault-cover"><img src="${esc(cover)}" alt="${esc(story.title)}" loading="lazy"><figcaption>${esc(story.title)}</figcaption></figure>`:''}
        <dl class="vault-counts"><div><dt>Chapters you can read</dt><dd>${readable}</dd></div><div><dt>Member chapters locked</dt><dd>${locked}</dd></div></dl>
      </section>
      <section class="reader-panel vault-connections" aria-labelledby="vault-connections-title"><h2 id="vault-connections-title">Your connections</h2><p class="reader-note">Connect the account that holds your membership. Access is checked automatically.</p>
        <div class="provider-list">${providers.map(([name,key])=>providerCard(name,key,providerIsConnected(key),activeProviderTier(key),null,"Not connected")).join("")||'<p>No membership providers are currently available.</p>'}</div>
        <a class="reader-text-link" href="#/support/check-access" data-nav="/support/check-access">Check an access problem ${I.chevR}</a>
      </section>
      ${accessKeysEnabled()?`<section class="reader-panel vault-key" aria-labelledby="vault-key-title"><span class="reader-section-icon" aria-hidden="true">${I.key}</span><div><h2 id="vault-key-title">An invitation to read</h2><p class="reader-note">Have an access key? Redeem it securely to add its access to your account.</p><button class="btn ghost" data-sheet="redeem">Redeem a key ${I.chevR}</button></div></section>`:''}
      <aside class="vault-help"><h2>A little help?</h2><p class="reader-note">Already a member, but a chapter is still locked?</p><a href="#/support/wrong-account" data-nav="/support/wrong-account">Find the right account ${I.chevR}</a><a href="#/help" data-nav="/help">Read the access guide ${I.chevR}</a></aside>
      ${store.redeemedKeys.length?`<section class="reader-panel vault-records"><h2>Key redemption history</h2><p class="reader-note">A redemption record is not a guarantee of current access. Chapter availability reflects your verified access.</p><ul>${store.redeemedKeys.map(k=>`<li><span>${esc(k.label||"Access key")}<small>${esc(maskKey(String(k.code||"")))}</small></span><time>${esc(k.when||"Redeemed")}</time></li>`).join("")}</ul></section>`:''}
    </div>
  </div>`;
};
function activeProviderTier(provider){
  const key=String(provider||"").toLowerCase();
  const rows=activeEntitlements().filter(row=>String(row?.provider||row?.source||"").toLowerCase()===key).sort((a,b)=>Number(b.tier_rank||0)-Number(a.tier_rank||0));
  return rows[0]?.tier_name||rows[0]?.name||null;
}
function providerCard(name, key, connected, tier, since, note){
  const sheet=key==='patreon'?'connect-patreon':'connect-boosty';
  const syncAction=key==='patreon'?'resync':'resync-boosty';
  const verification=providerAccessStatus(key);
  const reconnect=verification?.state==='reconnect';
  return `<article class="reader-provider"><div class="reader-provider-heading"><span class="provider-monogram" aria-hidden="true">${key==='patreon'?'P':'B'}</span><div><h3>${esc(name)}</h3><span class="provider-state">${connected?'Connected':'Not connected'}</span></div></div>
    <p>${esc(connected?(tier||"Connected, no active site tier"):(note||"Connect your membership account."))}</p>
    ${connected||verification?`<p class="provider-verification">${esc(providerVerificationText(key))}</p>`:''}
    ${reconnect?`<button class="btn sm story" data-sheet="${sheet}">Reconnect ${esc(name)}</button>`:connected?`<button class="btn sm ghost" data-act="${syncAction}" ${verification?.state==='checking'?'disabled':''}>${I.sync}${verification?.state==='checking'?'Checking…':'Check membership'}</button>`:`<button class="btn sm story" data-sheet="${sheet}">Connect ${esc(name)} ${I.chevR}</button>`}
  </article>`;
}
function maskKey(c){ if(c.length<=4) return c; return "••••-••••-••••-"+c.slice(-4); }

/* ============ MY SHELF & SAVED WORKSPACE ============ */
function readerShelfSubnav(active){
  const tabs=[
    ["shelf","/my-shelf","My Shelf",activeReads().length],
    ["bookmarks","/bookmarks","Bookmarks",store.bookmarks.length],
    ["quotes","/quotes","Saved Quotes",store.quotes.length],
    ["history","/history","Reading History",store.history.length]
  ];
  return `<nav class="reader-subnav shelf-subnav" aria-label="Shelf navigation">
    <div class="reader-subnav-tabs">${tabs.map(([id,path,label,count])=>`<a href="#${path}" data-nav="${path}" class="${active===id?'active':''}" ${active===id?'aria-current="page"':''}><span>${label}</span><small>${count}</small></a>`).join("")}</div>
  </nav>`;
}

VIEWS.shelf = function(){
  const reads=activeReads();
  const followedStories=store.followed.map(id=>D.STORIES.find(story=>story.id===id)||bySlug(id)).filter(Boolean);
  const previews=store.history.filter(h=>h.kind==="preview").map(h=>{const f=byId(h.chapterId);return f?{h,f}:null;}).filter(Boolean);
  return `<div class="reader-workspace shelf-page">
    ${readerPageHeading("My Shelf","Your active reading threads, followed stories, and saved places.",`<a class="btn ghost" href="#/settings" data-nav="/settings">${I.cog}Settings</a>`)}
    ${readerShelfSubnav("shelf")}
    <div class="shelf-layout">
      <div class="shelf-main">
        <section class="reader-panel" aria-labelledby="shelf-threads-title">
          <div class="section-head"><h2 id="shelf-threads-title">Continue your threads</h2><a class="reader-text-link" href="#/library" data-nav="/library">Browse library ${I.chevR}</a></div>
          ${reads.length?`<div class="shelf-threads-grid">${reads.map(({ch,story,prog})=>`<button class="shelf-thread-card" style="${storyAccentVars(story)}" data-read="${esc(ch.id)}">
            <div class="rh-kicker">${esc(story.title)}</div>
            <h3>${esc(ch.title)}</h3>
            ${progressBar(prog.pct)}
            <div class="shelf-thread-meta"><span>${prog.pct}% read</span>${prog.scene?`<span>Resume near: ${esc(prog.scene)}</span>`:""}</div>
          </button>`).join("")}</div>`:`<p class="reader-note">No chapters in progress yet. Open any chapter in the library and your reading position will be saved here automatically.</p>`}
        </section>

        <section class="reader-panel" aria-labelledby="shelf-followed-title">
          <div class="section-head"><h2 id="shelf-followed-title">Followed stories</h2></div>
          ${followedStories.length?`<div class="grid-stories library-pinned-grid">${followedStories.map(storyCard).join("")}</div>`:`<p class="reader-note">You haven't followed any stories yet. Use Follow on a story page to keep it pinned here.</p>`}
        </section>
      </div>

      <aside class="shelf-aside">
        <section class="reader-panel" aria-labelledby="shelf-saved-title">
          <h2 id="shelf-saved-title">Saved places &amp; notes</h2>
          <div class="shelf-shortcut-list">
            <a href="#/bookmarks" data-nav="/bookmarks"><span class="reader-section-icon">${I.bookmark}</span><div><h3>Bookmarks</h3><p class="reader-note">${store.bookmarks.length} saved place${store.bookmarks.length===1?"":"s"}</p></div>${I.chevR}</a>
            <a href="#/quotes" data-nav="/quotes"><span class="reader-section-icon">${I.quote}</span><div><h3>Saved quotes</h3><p class="reader-note">${store.quotes.length} highlighted line${store.quotes.length===1?"":"s"}</p></div>${I.chevR}</a>
            <a href="#/history" data-nav="/history"><span class="reader-section-icon">${I.clock}</span><div><h3>Reading history</h3><p class="reader-note">${store.history.length} recent ${store.history.length===1?"entry":"entries"}</p></div>${I.chevR}</a>
            <a href="#/settings" data-nav="/settings"><span class="reader-section-icon">${I.cog}</span><div><h3>Settings</h3><p class="reader-note">Theme &amp; notifications</p></div>${I.chevR}</a>
          </div>
        </section>

        <section class="reader-panel" aria-labelledby="shelf-previews-title">
          <h2 id="shelf-previews-title">Preview trail</h2>
          <p class="reader-note">Chapters you have previewed that remain locked.</p>
          ${previews.length?`<div class="shelf-preview-list">${previews.map(({h,f})=>`<div class="reader-check-row between"><div><h3>${esc(h.title)}</h3><p class="reader-note">${esc(f.story.title)}</p></div><button class="btn sm ghost" data-lock="${esc(h.chapterId)}">${I.lockOpen}Unlock</button></div>`).join("")}</div>`:`<p class="reader-note">No active previews.</p>`}
        </section>
      </aside>
    </div>
  </div>`;
};

VIEWS.bookmarks = function(){
  return `<div class="reader-workspace">
    ${readerPageHeading("Bookmarks",`${store.bookmarks.length} saved place${store.bookmarks.length===1?"":"s"} across your reading.`)}
    ${readerShelfSubnav("bookmarks")}
    ${store.bookmarks.length?`<div class="reader-list-grid">${store.bookmarks.map(b=>{const f=byId(b.chapterId);return `<article class="reader-panel reader-saved-card" style="${f?storyAccentVars(f.story):''}"><span class="reader-section-icon" aria-hidden="true">${I.bookmarkFill}</span><div style="flex:1;min-width:0"><h3>"${esc(b.label)}"</h3><p class="reader-note">${f?esc(f.story.title+" · "+f.ch.title):""} · ${esc(b.when)}</p></div>${f?`<button class="btn sm story" data-read="${esc(b.chapterId)}">${I.play}Open</button>`:""}</article>`;}).join("")}</div>`:readerEmptyState("bookmark","No bookmarks yet","Save a place while reading with the bookmark button in the chapter toolbar.")}
  </div>`;
};

VIEWS.quotes = function(){
  return `<div class="reader-workspace">
    ${readerPageHeading("Saved Quotes",`${store.quotes.length} line${store.quotes.length===1?"":"s"} worth keeping.`)}
    ${readerShelfSubnav("quotes")}
    ${store.quotes.length?`<div class="reader-list-grid">${store.quotes.map(q=>{const f=byId(q.chapterId);return `<article class="reader-panel reader-quote-card" style="${f?storyAccentVars(f.story):''}"><div class="reader-quote-body"><span class="reader-section-icon" aria-hidden="true">${I.quote}</span><div><blockquote>${esc(q.text)}</blockquote><p class="reader-note">${f?esc(f.story.title+" · "):""}saved ${esc(q.when)}</p></div></div><div class="reader-quote-actions"><button class="btn sm ghost" data-copy="${esc(q.text)}">${I.copy}Copy quote</button>${f?`<button class="btn sm ghost" data-read="${esc(q.chapterId)}">${I.book}Open chapter</button>`:""}</div></article>`;}).join("")}</div>`:readerEmptyState("quote","No quotes saved","Highlight text while reading a chapter to save a line to your collection.")}
  </div>`;
};

VIEWS.history = function(){
  return `<div class="reader-workspace">
    ${readerPageHeading("Reading History","Your private reading chronicle in this browser.")}
    ${readerShelfSubnav("history")}
    ${store.history.length?`<div class="reader-panel"><div class="timeline">${[...store.history].map(h=>{const f=byId(h.chapterId);return `<div class="tl-item"><div class="when">${esc(h.when)}</div><div class="what">${h.kind==='preview'?'Previewed':h.kind==='completed'?'Completed':'Read'}: ${esc(h.title)}</div><div class="faint" style="font-size:.78rem">${f?esc(f.story.title):""}</div></div>`;}).join("")}</div></div>`:readerEmptyState("clock","No reading history yet","Chapters you open or preview in this browser will be listed here.",`<a class="btn ghost" href="#/library" data-nav="/library">Browse the library ${I.chevR}</a>`)}
  </div>`;
};

/* ============ NOTIFICATIONS ============ */
VIEWS.notifications = function(){
  const items=store.notifs;
  const unread=items.filter(n=>!n.read).length;
  const kIcon={access:I.vault,chapter:I.bell};
  const actions=`<div class="reader-toolbar-group"><button class="btn sm ghost" data-act="refresh-notifications">${I.sync}Refresh</button><button class="btn sm ghost" data-act="mark-all-read">Mark all read</button><button class="btn sm ghost" data-act="notif-prefs">${I.cog}Preferences</button></div>`;
  return `<div class="reader-workspace notifications-page">
    ${readerPageHeading("Notifications",`${unread} unread alert${unread===1?"":"s"}`,actions)}
    ${items.length?`<div class="reader-list-grid">${items.map(n=>`<article class="reader-panel notification-card" style="${n.read?'opacity:.68':''}"><span class="reader-section-icon notification-icon">${kIcon[n.k]||I.bell}</span><div class="notification-copy"><div class="notification-title">${esc(n.t)}</div><div class="faint notification-body">${esc(n.d)}</div><div class="faint notification-time">${esc(n.time)}</div></div><div class="notification-actions">${n.chapter||n.url?`<button class="btn sm story" data-act="open-notification" data-notification-id="${esc(n.id)}" data-chapter-id="${esc(n.chapter||'')}" data-notification-url="${esc(n.url||'')}">Open</button>`:""}<button class="tb-btn" data-dismiss="${esc(n.id)}" aria-label="Dismiss">${I.x}</button></div></article>`).join("")}</div>`:readerEmptyState("bell","Nothing new","New chapter alerts for your access tier will appear here.")}
  </div>`;
};

/* ============ BENEFITS ============ */
VIEWS.benefits = function(){
  const b=[
    {i:"book",t:"Member chapters",d:"Read the chapters included in your current access tier as soon as they are released."},
    {i:"spark",t:"The visual archive",d:"Explore published character artwork, with mature collections available to eligible members."},
    {i:"eye",t:"Read your way",d:"Customize chapter page colors, brightness, text size, line spacing, reading width, and Dyslexia mode."}
  ];
  return `<div class="reader-workspace benefits-page">
    ${readerPageHeading("Membership Benefits","What member access unlocks across the archive.",`<a class="btn ghost" href="#/vault" data-nav="/vault">Open the Vault ${I.chevR}</a>`)}
    <div class="reader-benefits-grid">${b.map(x=>`<section class="reader-panel benefit-card"><span class="reader-section-icon" aria-hidden="true">${I[x.i]}</span><div><h2>${esc(x.t)}</h2><p class="reader-note">${esc(x.d)}</p></div></section>`).join("")}</div>
    <section class="reader-panel benefits-cta">
      <div><h2>Ready to connect your membership?</h2><p class="reader-note">Link your Patreon or Boosty-connected Discord account, or redeem an access key in the Vault.</p></div>
      <div class="reader-toolbar-group"><button class="btn primary" data-sheet="connect-provider">${I.vault}Connect provider</button><a class="btn ghost" href="#/vault" data-nav="/vault">Go to the Vault</a></div>
    </section>
  </div>`;
};

/* ============ ONBOARDING ============ */
VIEWS.onboarding = function(){
  const steps=[[I.library,"Browse the Library","Free chapters and previews are open with no account needed."],[I.book,"Read comfortably","Adjust chapter page color, typography, and reading width to your taste."],[I.vault,"Activate access","Connect your membership or redeem an access key to unlock member chapters."],[I.shelf,"Continue in your browser","Return to your saved place, bookmarks, and quotes anytime."]];
  return `<div class="reader-workspace onboarding-page">
    ${readerPageHeading(`Welcome to ${SITE_NAME}`,"A quiet reading archive for stories and character artwork.",`<button class="btn primary" data-nav="/">Enter the archive ${I.chevR}</button>`)}
    <div class="reader-support-grid">
      <section class="reader-panel">
        <h2>Choose your first door</h2>
        <p class="reader-note">Jump straight to the catalog, verify your membership, or check the latest releases.</p>
        <div class="shelf-shortcut-list">
          <a href="#/library" data-nav="/library"><span class="reader-section-icon">${I.library}</span><div><h3>Browse Library</h3><p class="reader-note">All published stories</p></div>${I.chevR}</a>
          <a href="#/vault" data-nav="/vault"><span class="reader-section-icon">${I.vault}</span><div><h3>Check access</h3><p class="reader-note">Memberships and access keys</p></div>${I.chevR}</a>
          <a href="#/updates" data-nav="/updates"><span class="reader-section-icon">${I.feed}</span><div><h3>Latest updates</h3><p class="reader-note">Newest chapter releases</p></div>${I.chevR}</a>
          <a href="#/help" data-nav="/help"><span class="reader-section-icon">${I.info}</span><div><h3>Need help?</h3><p class="reader-note">Self-service access guide</p></div>${I.chevR}</a>
        </div>
      </section>
      <section class="reader-panel">
        <h2>How it works</h2>
        <div class="onboarding-steps">${steps.map(([ic,t,d])=>`<div class="reader-check-row" style="display:flex;gap:14px;align-items:flex-start"><span class="reader-section-icon" aria-hidden="true">${ic}</span><div><h3>${esc(t)}</h3><p class="reader-note">${esc(d)}</p></div></div>`).join("")}</div>
      </section>
    </div>
  </div>`;
};
